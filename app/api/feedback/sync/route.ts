import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { createNotionTicket, testNotionConnection } from "@/lib/notion-service";

export const dynamic = "force-dynamic";

/**
 * Helper to authenticate user and verify superadmin status
 */
async function verifySuperadmin(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.replace("Bearer ", "").trim();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return null;
  }

  const { data: adminRecord } = await supabase
    .from("superadmins")
    .select("user_id")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (!adminRecord) {
    return null;
  }

  return data.user;
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
