import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { createNotionTicket, testNotionConnection, updateNotionCardStatus } from "@/lib/notion-service";

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

/**
 * Helper to authenticate user and verify superadmin status
 */
async function verifySuperadmin(request: Request) {
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

  // 1. Whitelist superadmin via environment variable
  const envSuperadmins = process.env.SUPERADMIN_EMAILS || "amndnaziz98@gmail.com";
  const allowedEmails = envSuperadmins.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (
    data.user.email &&
    (allowedEmails.includes(data.user.email.toLowerCase()) ||
      data.user.email.toLowerCase() === "amndnaziz98@gmail.com")
  ) {
    return data.user;
  }

  // 2. Check via RPC is_superadmin() dengan session pengguna
  try {
    const { data: isSuperRpc } = await authClient.rpc("is_superadmin");
    if (isSuperRpc === true) {
      return data.user;
    }
  } catch {
    // fallback
  }

  // 3. Check via tabel superadmins dengan header token (memenuhi RLS auth.uid() = user_id)
  try {
    const { data: adminRecord } = await authClient
      .from("superadmins")
      .select("user_id")
      .eq("user_id", data.user.id)
      .maybeSingle();

    if (adminRecord) {
      return data.user;
    }
  } catch {
    // fallback
  }

  return null;
}

/**
 * GET /api/feedback/sync - Test Notion Connection status
 */
export async function GET(request: Request) {
  try {
    const admin = await verifySuperadmin(request);
    if (!admin) {
      return NextResponse.json(
        { error: "Akses ditolak: Hanya Superadmin yang dapat melakukan pengujian ini." },
        { status: 403 }
      );
    }

    const testRes = await testNotionConnection();
    return NextResponse.json(testRes);
  } catch (err: any) {
    return NextResponse.json({ connected: false, error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/feedback/sync - Retry synchronizing a failed feedback ticket to Notion
 */
export async function POST(request: Request) {
  try {
    const admin = await verifySuperadmin(request);
    if (!admin) {
      return NextResponse.json(
        { error: "Akses ditolak: Hanya Superadmin yang dapat melakukan sinkronisasi ulang." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { feedbackId } = body;

    if (!feedbackId) {
      return NextResponse.json({ error: "Parameter feedbackId wajib disertakan." }, { status: 400 });
    }

    // Fetch the feedback record
    const { data: fb, error: fetchErr } = await supabase
      .from("user_feedbacks")
      .select("*")
      .eq("id", feedbackId)
      .single();

    if (fetchErr || !fb) {
      return NextResponse.json(
        { error: `Data feedback tidak ditemukan: ${fetchErr?.message}` },
        { status: 404 }
      );
    }

    // Call Notion Service
    const notionRes = await createNotionTicket({
      type: fb.type,
      priority: fb.priority,
      title: fb.title,
      description: fb.description,
      stepsToReproduce: fb.steps_to_reproduce,
      userName: fb.user_name,
      userEmail: fb.user_email,
      currentUrl: fb.current_url,
      appVersion: fb.app_version,
      deviceInfo: fb.device_info,
      attachmentUrl: fb.attachment_url,
    });

    // Update status in DB
    const { error: updateErr } = await supabase
      .from("user_feedbacks")
      .update({
        notion_page_id: notionRes.pageId || null,
        notion_page_url: notionRes.pageUrl || null,
        notion_sync_status: notionRes.success ? "synced" : "failed",
        notion_sync_error: notionRes.error || null,
        notion_synced_at: notionRes.success ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", feedbackId);

    if (updateErr) {
      return NextResponse.json(
        { error: `Gagal memperbarui status di database: ${updateErr.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: notionRes.success,
      notionPageUrl: notionRes.pageUrl,
      error: notionRes.error,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * PATCH /api/feedback/sync - Update card status directly in Notion
 */
export async function PATCH(request: Request) {
  try {
    const admin = await verifySuperadmin(request);
    if (!admin) {
      return NextResponse.json(
        { error: "Akses ditolak: Hanya Superadmin yang dapat mengubah status Notion." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { pageId, status } = body;

    if (!pageId || !status) {
      return NextResponse.json(
        { error: "Parameter pageId dan status wajib disertakan." },
        { status: 400 }
      );
    }

    const updateRes = await updateNotionCardStatus(pageId, status);
    if (!updateRes.success) {
      return NextResponse.json(
        { error: updateRes.error || "Gagal memperbarui status tiket di Notion." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, pageId, status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

