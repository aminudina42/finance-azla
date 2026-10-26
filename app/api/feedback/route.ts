import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { createNotionTicket, testNotionConnection } from "@/lib/notion-service";

export const dynamic = "force-dynamic";

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
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return null;
  }
  return data.user;
}

/**
 * POST /api/feedback
 * Submit a new bug report or feature suggestion.
 */
export async function POST(request: Request) {
  try {
    // 1. Authenticate user
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { error: "Akses ditolak: Anda harus login untuk mengirim laporan." },
        { status: 401 }
      );
    }

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
      const { data: dbData, error: dbError } = await supabase
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
        await supabase
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
 * Fetch user's own feedbacks (or all feedbacks if superadmin)
 */
export async function GET(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Akses ditolak: Anda harus login." }, { status: 401 });
    }

    // Check if user is superadmin
    const { data: superadminData } = await supabase
      .from("superadmins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    const isSuperadmin = Boolean(superadminData);

    let query = supabase
      .from("user_feedbacks")
      .select("*")
      .order("created_at", { ascending: false });

    if (!isSuperadmin) {
      // Normal users only see their own tickets
      query = query.eq("user_id", user.id);
    }

    const { data, error } = await query.limit(50);

    if (error) {
      return NextResponse.json(
        { error: `Gagal memuat feedback: ${error.message}`, items: [] },
        { status: error.code === "PGRST205" ? 200 : 500 }
      );
    }

    return NextResponse.json({
      items: data || [],
      isSuperadmin,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, items: [] }, { status: 500 });
  }
}
