import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { createNotionTicket, testNotionConnection, getNotionKanbanCards } from "@/lib/notion-service";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

function getAuthenticatedClient(token: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      persistSession: false,
    },
  });
}

// In-memory rate limiting map: userId -> timestamps array
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_REQUESTS_PER_WINDOW = 4;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(userId) || [];
  const activeTimestamps = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (activeTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    rateLimitMap.set(userId, activeTimestamps);
    return false; // Rate limit exceeded
  }

  activeTimestamps.push(now);
  rateLimitMap.set(userId, activeTimestamps);
  return true;
}

/**
 * Helper to authenticate user from Bearer token
 */
async function getAuthUser(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.replace("Bearer ", "").trim();
  const authClient = getAuthenticatedClient(token);
  const { data, error } = await authClient.auth.getUser();
  if (error || !data.user) {
    return null;
  }
  return { user: data.user, authClient, token };
}

/**
 * POST /api/feedback
 * Submit a new bug report or feature suggestion.
 */
export async function POST(request: Request) {
  try {
    // 1. Authenticate user
    const authData = await getAuthUser(request);
    if (!authData) {
      return NextResponse.json(
        { error: "Akses ditolak: Anda harus login untuk mengirim laporan." },
        { status: 401 }
      );
    }
    const { user, authClient } = authData;

    // 2. Parse & Validate Payload
    const body = await request.json().catch(() => ({}));
    const {
      type = "bug",
      priority = "Medium",
      title = "",
      description = "",
      stepsToReproduce = "",
      currentUrl = "",
      appVersion = "v1.0.0",
      deviceInfo = {},
      attachmentUrl = "",
      honeypot = "",
      keluargaId = null,
      userName = "",
    } = body;

    // Anti-bot honeypot check
    if (honeypot && String(honeypot).trim() !== "") {
      return NextResponse.json(
        { success: true, message: "Laporan berhasil diterima." },
        { status: 200 }
      );
    }

    // Form content validation
    const cleanTitle = String(title).trim();
    const cleanDesc = String(description).trim();

    if (cleanTitle.length < 5) {
      return NextResponse.json(
        { error: "Judul laporan terlalu pendek (minimal 5 karakter)." },
        { status: 400 }
      );
    }
    if (cleanTitle.length > 200) {
      return NextResponse.json(
        { error: "Judul laporan terlalu panjang (maksimal 200 karakter)." },
        { status: 400 }
      );
    }
    if (cleanDesc.length < 10) {
      return NextResponse.json(
        { error: "Deskripsi terlalu singkat (minimal 10 karakter)." },
        { status: 400 }
      );
    }
    if (cleanDesc.length > 5000) {
      return NextResponse.json(
        { error: "Deskripsi terlalu panjang (maksimal 5.000 karakter)." },
        { status: 400 }
      );
    }

    // 3. Rate Limit Check
    if (!checkRateLimit(user.id)) {
      return NextResponse.json(
        {
          error:
            "Terlalu banyak laporan dikirim dalam waktu singkat. Harap tunggu beberapa menit sebelum mengirim laporan baru.",
        },
        { status: 429 }
      );
    }

    const effectiveUserName =
      userName ||
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split("@")[0] ||
      "Pengguna";

    // 4. Dual Persistence Phase 1: Store in Supabase DB
    let localFeedbackId: string | null = null;
    let dbWarning: string | null = null;

    try {
      const dbClient = authClient || supabase;
      const { data: dbData, error: dbError } = await dbClient
        .from("user_feedbacks")
        .insert({
          user_id: user.id,
          keluarga_id: keluargaId || null,
          user_name: effectiveUserName,
          user_email: user.email || "",
          type: ["bug", "saran", "pertanyaan"].includes(type) ? type : "bug",
          priority: ["High", "Medium", "Low"].includes(priority) ? priority : "Medium",
          title: cleanTitle,
          description: cleanDesc,
          steps_to_reproduce: stepsToReproduce ? String(stepsToReproduce).trim() : null,
          current_url: currentUrl ? String(currentUrl).trim() : null,
          app_version: appVersion,
          device_info: typeof deviceInfo === "object" ? deviceInfo : {},
          attachment_url: attachmentUrl ? String(attachmentUrl).trim() : null,
          status: "baru",
          notion_sync_status: "pending",
        })
        .select("id")
        .single();

      if (dbError) {
        dbWarning = `Penyimpanan database internal tertunda: ${dbError.message}`;
      } else if (dbData?.id) {
        localFeedbackId = dbData.id;
      }
    } catch (err: any) {
      dbWarning = `DB error: ${err.message}`;
    }

    // 5. Dual Persistence Phase 2: Forward to Notion Kanban Board
    const notionRes = await createNotionTicket({
      type: ["bug", "saran", "pertanyaan"].includes(type) ? type : "bug",
      priority: ["High", "Medium", "Low"].includes(priority) ? priority : "Medium",
      title: cleanTitle,
      description: cleanDesc,
      stepsToReproduce: stepsToReproduce ? String(stepsToReproduce).trim() : undefined,
      userName: effectiveUserName,
      userEmail: user.email || "",
      currentUrl,
      appVersion,
      deviceInfo,
      attachmentUrl,
    });

    // 6. Update local DB with Notion Sync Result
    if (localFeedbackId) {
      try {
        const dbClient = authClient || supabase;
        await dbClient
          .from("user_feedbacks")
          .update({
            notion_page_id: notionRes.pageId || null,
            notion_page_url: notionRes.pageUrl || null,
            notion_sync_status: notionRes.success ? "synced" : "failed",
            notion_sync_error: notionRes.error || null,
            notion_synced_at: notionRes.success ? new Date().toISOString() : null,
          })
          .eq("id", localFeedbackId);
      } catch (updateErr) {
        // Non-blocking
      }
    }

    return NextResponse.json(
      {
        success: true,
        message:
          type === "bug"
            ? "Laporan bug berhasil dikirim dan dicatat ke tim developer. Terima kasih!"
            : "Saran Anda berhasil dikirim ke papan rekomendasi fitur tim. Terima kasih!",
        feedbackId: localFeedbackId,
        notionSynced: notionRes.success,
        notionPageUrl: notionRes.pageUrl,
        warning: dbWarning,
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Terjadi kesalahan pada server saat memproses laporan." },
      { status: 500 }
    );
  }
}

/**
 * GET /api/feedback
 * Fetch user's own feedbacks (or live Notion Kanban cards + local reports if superadmin)
 */
export async function GET(request: Request) {
  try {
    const authData = await getAuthUser(request);
    if (!authData) {
      return NextResponse.json({ error: "Akses ditolak: Anda harus login." }, { status: 401 });
    }
    const { user, authClient } = authData;

    // Check if user is superadmin
    let isSuperadmin = user.email?.toLowerCase() === "amndnaziz98@gmail.com";

    if (!isSuperadmin) {
      try {
        const { data: superadminData } = await authClient
          .from("superadmins")
          .select("user_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (superadminData) isSuperadmin = true;
      } catch {
        // fallback
      }
    }

    if (!isSuperadmin) {
      // Normal users only see their own tickets from Supabase
      const { data, error } = await authClient
        .from("user_feedbacks")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error && error.code !== "PGRST205") {
        return NextResponse.json(
          { error: `Gagal memuat feedback: ${error.message}`, items: [] },
          { status: 500 }
        );
      }

      return NextResponse.json({
        items: data || [],
        isSuperadmin: false,
      });
    }

    // --- SUPERADMIN FLOW ---
    // 1. Fetch live cards directly from Notion Kanban Board
    const notionResult = await getNotionKanbanCards();

    // 2. Query local feedback records from Supabase
    let localFeedbacks: any[] = [];
    try {
      const dbClient = authClient || supabase;
      const { data: dbData } = await dbClient
        .from("user_feedbacks")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (dbData) localFeedbacks = dbData;
    } catch {
      // Non-blocking fallback
    }

    // 3. Merge Notion cards with local Supabase feedback details
    if (notionResult.success && notionResult.cards.length > 0) {
      const localByPageId = new Map<string, any>();
      for (const fb of localFeedbacks) {
        if (fb.notion_page_id) {
          const cleanPageId = fb.notion_page_id.replace(/-/g, "");
          localByPageId.set(cleanPageId, fb);
          localByPageId.set(fb.notion_page_id, fb);
        }
      }

      const matchedLocalIds = new Set<string>();
      const enrichedCards = notionResult.cards.map((card) => {
        const cleanCardId = card.id.replace(/-/g, "");
        const localMatch = localByPageId.get(cleanCardId) || localByPageId.get(card.id);
        if (localMatch) {
          matchedLocalIds.add(localMatch.id);
          return {
            ...card,
            user_name: localMatch.user_name || card.user_name,
            user_email: localMatch.user_email || card.user_email,
            description: localMatch.description || card.description,
            steps_to_reproduce: localMatch.steps_to_reproduce || null,
            device_info: localMatch.device_info || null,
            attachment_url: localMatch.attachment_url || card.attachment_url,
            current_url: localMatch.current_url || null,
            app_version: localMatch.app_version || null,
            internal_db_id: localMatch.id,
          };
        }
        return card;
      });

      // Also include any local feedbacks that failed to sync to Notion
      const unsyncedLocals = localFeedbacks
        .filter((fb) => !matchedLocalIds.has(fb.id) && fb.notion_sync_status !== "synced")
        .map((fb) => ({
          ...fb,
          notion_status_name: fb.notion_sync_status === "failed" ? "Gagal Sync" : "Menunggu Sync",
          notion_status_color: fb.notion_sync_status === "failed" ? "red" : "yellow",
        }));

      const allItems = [...unsyncedLocals, ...enrichedCards];

      return NextResponse.json({
        items: allItems,
        isSuperadmin: true,
        notionConnected: true,
        databaseTitle: notionResult.databaseTitle || "Catat Keluarga Board",
      });
    }

    // 4. Fallback if Notion failed or returned 0 cards
    return NextResponse.json({
      items: localFeedbacks,
      isSuperadmin: true,
      notionConnected: false,
      notionError: notionResult.error,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, items: [] }, { status: 500 });
  }
}
