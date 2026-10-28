/**
 * Server-Side Notion Integration Service for CatatKeluarga
 * Handles bidirectional status mapping and robust ticket creation for Bug & Suggestion reports.
 */

import dns from "node:dns";

try {
  dns.setDefaultResultOrder?.("ipv4first");
} catch {
  // Ignore in environments where dns is not configurable
}

export interface FeedbackTicketInput {
  type: "bug" | "saran" | "pertanyaan";
  priority?: "High" | "Medium" | "Low";
  title: string;
  description: string;
  stepsToReproduce?: string;
  userName?: string;
  userEmail?: string;
  currentUrl?: string;
  appVersion?: string;
  deviceInfo?: {
    os?: string;
    browser?: string;
    screenSize?: string;
    userAgent?: string;
  };
  attachmentUrl?: string;
}

export interface NotionSyncResult {
  success: boolean;
  pageId?: string;
  pageUrl?: string;
  error?: string;
}

const NOTION_API_VERSION = "2022-06-28";
const NOTION_BASE_URL = "https://api.notion.com/v1";

export function getNotionConfig() {
  const env = process.env;

  // Mendukung variasi penamaan dan huruf kapital (case-insensitive)
  const rawApiKey =
    env.NOTION_API_KEY ||
    env.Notion_API_KEY ||
    env.notion_api_key ||
    env.NOTION_TOKEN ||
    env.Notion_Token ||
    env.NOTION_KEY ||
    env.NEXT_PUBLIC_NOTION_API_KEY ||
    "";

  const apiKey = (rawApiKey || "").replace(/["']/g, "").trim();

  // Extract 32-character hexadecimal Notion Database ID (supporting raw hex, hyphenated UUIDs, and full Notion URLs)
  const rawDbId = (
    env.NOTION_DATABASE_ID ||
    env.Notion_DATABASE_ID ||
    env.notion_database_id ||
    env.NOTION_DB_ID ||
    env.NEXT_PUBLIC_NOTION_DATABASE_ID ||
    ""
  ).trim();

  let databaseId = "";
  const hexMatch = rawDbId.match(/[a-f0-9]{32}/i);
  if (hexMatch) {
    databaseId = hexMatch[0].toLowerCase();
  } else {
    const uuidMatch = rawDbId.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
    if (uuidMatch) {
      databaseId = uuidMatch[0].replace(/-/g, "").toLowerCase();
    } else {
      databaseId = rawDbId.replace(/[^a-zA-Z0-9]/g, "");
    }
  }

  return {
    apiKey,
    databaseId,
    isConfigured: Boolean(apiKey && databaseId),
  };
}

/**
 * Splits text into chunks of <= 1800 characters to prevent Notion's 2,000-char block limit crash.
 */
function chunkText(text: string, maxLen = 1800): string[] {
  if (!text) return [];
  if (text.length <= maxLen) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      chunks.push(remaining);
      break;
    }
    // Try to split on last newline or space within limit
    let splitIndex = remaining.lastIndexOf("\n", maxLen);
    if (splitIndex === -1 || splitIndex < maxLen * 0.5) {
      splitIndex = remaining.lastIndexOf(" ", maxLen);
    }
    if (splitIndex === -1 || splitIndex < maxLen * 0.5) {
      splitIndex = maxLen;
    }

    chunks.push(remaining.substring(0, splitIndex).trim());
    remaining = remaining.substring(splitIndex).trim();
  }

  return chunks;
}

/**
 * Creates Rich Text block items safely within Notion block size limits.
 */
function createParagraphBlocks(text: string) {
  const chunks = chunkText(text);
  return chunks.map((chunk) => ({
    object: "block",
    type: "paragraph",
    paragraph: {
      rich_text: [
        {
          type: "text",
          text: { content: chunk },
        },
      ],
    },
  }));
}

/**
 * Tests the Notion API connection and verifies database access.
 */
export async function testNotionConnection(): Promise<{
  connected: boolean;
  databaseTitle?: string;
  error?: string;
}> {
  const { apiKey, databaseId, isConfigured } = getNotionConfig();

  if (!isConfigured) {
    return {
      connected: false,
      error: !apiKey
        ? "NOTION_API_KEY belum dikonfigurasi di environment."
        : "NOTION_DATABASE_ID belum dikonfigurasi di environment.",
    };
  }

  try {
    const res = await fetch(`${NOTION_BASE_URL}/databases/${databaseId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Notion-Version": NOTION_API_VERSION,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      let msg = errJson.message || res.statusText;
      if (res.status === 404) {
        msg = `Database Notion ID (${databaseId}) tidak ditemukan. Pastikan integrasi Notion Anda sudah di-invite / di-connect ke Database ini di Notion (Menu '...' > 'Connect to').`;
      } else if (res.status === 401) {
        msg = "Token NOTION_API_KEY tidak valid atau unauthorized.";
      }
      return {
        connected: false,
        error: `HTTP ${res.status}: ${msg}`,
      };
    }

    const data = await res.json();
    const title = data.title?.[0]?.plain_text || "Catat Keluarga Board";

    return {
      connected: true,
      databaseTitle: title,
    };
  } catch (err: any) {
    return {
      connected: false,
      error: err.message || "Gagal menghubungi Notion API.",
    };
  }
}

/**
 * Creates a new ticket card in the Notion Kanban Board.
 * Features built-in fallback and negative-case recovery.
 */
export async function createNotionTicket(
  input: FeedbackTicketInput
): Promise<NotionSyncResult> {
  const { apiKey, databaseId, isConfigured } = getNotionConfig();

  if (!isConfigured) {
    return {
      success: false,
      error: "Notion integration is not configured (missing NOTION_API_KEY).",
    };
  }

  // 1. Determine Status & Priority
  const statusName = input.type === "bug" ? "Bug" : "Rekomendasi Feat";
  const priorityName = input.priority || "Medium";
  const todayStr = new Date().toISOString().split("T")[0];

  // 2. Build Notion Page Properties
  const properties: Record<string, any> = {
    "Project name": {
      title: [
        {
          type: "text",
          text: {
            content: `[${input.type === "bug" ? "BUG" : "SARAN"}] ${input.title}`.slice(0, 150),
          },
        },
      ],
    },
    Status: {
      status: {
        name: statusName,
      },
    },
    Priority: {
      select: {
        name: priorityName,
      },
    },
    "Start date": {
      date: {
        start: todayStr,
      },
    },
  };

  // Add screenshot to 'Attach file' if present
  if (input.attachmentUrl && input.attachmentUrl.startsWith("http")) {
    properties["Attach file"] = {
      files: [
        {
          name: "screenshot.webp",
          type: "external",
          external: {
            url: input.attachmentUrl,
          },
        },
      ],
    };
  }

  // 3. Build Notion Page Body (Children Blocks)
  const children: any[] = [];

  // Callout banner
  children.push({
    object: "block",
    type: "callout",
    callout: {
      icon: { type: "emoji", emoji: input.type === "bug" ? "🐛" : "💡" },
      rich_text: [
        {
          type: "text",
          text: {
            content: `Tiket otomatis dari CatatKeluarga (${input.type === "bug" ? "Laporan Bug" : "Saran Fitur Baru"}).`,
          },
        },
      ],
    },
  });

  // Section: Deskripsi
  children.push({
    object: "block",
    type: "heading_2",
    heading_2: {
      rich_text: [{ type: "text", text: { content: "📝 Deskripsi Lengkap" } }],
    },
  });
  children.push(...createParagraphBlocks(input.description));

  // Section: Langkah Reproduksi (Bug only)
  if (input.stepsToReproduce && input.stepsToReproduce.trim() !== "") {
    children.push({
      object: "block",
      type: "heading_2",
      heading_2: {
        rich_text: [{ type: "text", text: { content: "🔄 Langkah Kejadian (Steps to Reproduce)" } }],
      },
    });
    children.push(...createParagraphBlocks(input.stepsToReproduce));
  }

  // Section: Informasi Pelapor & Perangkat
  children.push({
    object: "block",
    type: "heading_2",
    heading_2: {
      rich_text: [{ type: "text", text: { content: "👤 Data Pelapor & Diagnostik" } }],
    },
  });

  const reporterInfo = `${input.userName || "Pengguna"} (${input.userEmail || "Tanpa Email"})`;
  const infoBullets = [
    `Pelapor: ${reporterInfo}`,
    `Halaman / Rute: ${input.currentUrl || "Tidak diketahui"}`,
    `Waktu Pengiriman: ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB`,
    `Sistem / Browser: ${input.deviceInfo?.os || "-"} / ${input.deviceInfo?.browser || "-"}`,
    `Resolusi Layar: ${input.deviceInfo?.screenSize || "-"}`,
    `Versi Aplikasi: ${input.appVersion || "v1.0.0"}`,
  ];

  for (const bullet of infoBullets) {
    children.push({
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [{ type: "text", text: { content: bullet } }],
      },
    });
  }

  // Embed Image block if attachment exists
  if (input.attachmentUrl && input.attachmentUrl.startsWith("http")) {
    children.push({
      object: "block",
      type: "heading_2",
      heading_2: {
        rich_text: [{ type: "text", text: { content: "🖼️ Tangkapan Layar (Screenshot)" } }],
      },
    });
    children.push({
      object: "block",
      type: "image",
      image: {
        type: "external",
        external: {
          url: input.attachmentUrl,
        },
      },
    });
  }

  // 4. Send request with automatic 429 retry
  let attempt = 0;
  const maxAttempts = 2;

  while (attempt < maxAttempts) {
    attempt++;
    try {
      const response = await fetch(`${NOTION_BASE_URL}/pages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Notion-Version": NOTION_API_VERSION,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          parent: { database_id: databaseId },
          properties,
          children,
        }),
      });

      // Handle Rate Limiting (429)
      if (response.status === 429 && attempt < maxAttempts) {
        await new Promise((res) => setTimeout(res, 1200));
        continue;
      }

      const resJson = await response.json().catch(() => ({}));

      if (!response.ok) {
        // Fallback: If 'Attach file' caused error, try once without it
        if (properties["Attach file"] && resJson.code === "validation_error") {
          delete properties["Attach file"];
          const fallbackRes = await fetch(`${NOTION_BASE_URL}/pages`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Notion-Version": NOTION_API_VERSION,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              parent: { database_id: databaseId },
              properties,
              children: children.filter((b) => b.type !== "image"), // omit image block if causing error
            }),
          });

          if (fallbackRes.ok) {
            const fallbackJson = await fallbackRes.json();
            return {
              success: true,
              pageId: fallbackJson.id,
              pageUrl: fallbackJson.url,
            };
          }
        }

        return {
          success: false,
          error: `Notion API ${response.status}: ${resJson.message || response.statusText}`,
        };
      }

      return {
        success: true,
        pageId: resJson.id,
        pageUrl: resJson.url,
      };
    } catch (fetchErr: any) {
      if (attempt >= maxAttempts) {
        return {
          success: false,
          error: fetchErr.message || "Network error connecting to Notion API.",
        };
      }
      await new Promise((res) => setTimeout(res, 1000));
    }
  }

  return {
    success: false,
    error: "Failed to create ticket after multiple attempts.",
  };
}

/**
 * Fetches all Kanban cards directly from the Notion Database.
 * Returns cards sorted by created_time descending.
 */
export async function getNotionKanbanCards(): Promise<{
  success: boolean;
  cards: any[];
  databaseTitle?: string;
  error?: string;
}> {
  const { apiKey, databaseId, isConfigured } = getNotionConfig();

  if (!isConfigured) {
    return {
      success: false,
      cards: [],
      error: "Notion API belum dikonfigurasi (NOTION_API_KEY / NOTION_DATABASE_ID kosong).",
    };
  }

  try {
    const response = await fetch(`${NOTION_BASE_URL}/databases/${databaseId}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Notion-Version": NOTION_API_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sorts: [
          {
            timestamp: "created_time",
            direction: "descending",
          },
        ],
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      let msg = errJson.message || response.statusText;
      if (response.status === 404) {
        msg = `Database Notion ID (${databaseId}) tidak ditemukan atau integrasi Notion belum di-connect ke Database.`;
      } else if (response.status === 401) {
        msg = "Token NOTION_API_KEY tidak valid atau unauthorized.";
      }
      return {
        success: false,
        cards: [],
        error: `Notion Query HTTP ${response.status}: ${msg}`,
      };
    }

    const data = await response.json();
    const results = data.results || [];

    const cards = results.map((page: any) => {
      const props = page.properties || {};
      const title =
        props["Project name"]?.title?.[0]?.plain_text?.trim() || "(Tanpa Judul)";
      const statusName = props["Status"]?.status?.name || "To Do";
      const statusColor = props["Status"]?.status?.color || "default";
      const priorityName = props["Priority"]?.select?.name || "Medium";
      const startDate = props["Start date"]?.date?.start || null;
      const endDate = props["End date"]?.date?.start || null;
      const files = (props["Attach file"]?.files || [])
        .map((f: any) => f.external?.url || f.file?.url)
        .filter(Boolean);

      // Determine feedback type
      const lowerTitle = title.toLowerCase();
      const lowerStatus = statusName.toLowerCase();
      let type: "bug" | "saran" | "pertanyaan" = "saran";

      if (lowerStatus.includes("bug") || lowerTitle.includes("bug")) {
        type = "bug";
      } else if (
        lowerStatus.includes("feat") ||
        lowerStatus.includes("saran") ||
        lowerTitle.includes("feat") ||
        lowerTitle.includes("saran") ||
        lowerTitle.includes("enhance")
      ) {
        type = "saran";
      } else {
        type = "pertanyaan";
      }

      // Map to internal status: "baru" | "ditinjau" | "proses" | "selesai" | "ditolak"
      let internalStatus: "baru" | "ditinjau" | "proses" | "selesai" | "ditolak" = "baru";
      if (lowerStatus === "done") {
        internalStatus = "selesai";
      } else if (lowerStatus === "in progress") {
        internalStatus = "proses";
      } else if (lowerStatus === "to do") {
        internalStatus = "ditinjau";
      } else {
        internalStatus = "baru";
      }

      // Clean display priority
      let cleanPriority: "High" | "Medium" | "Low" = "Medium";
      if (priorityName === "High" || priorityName === "Medium" || priorityName === "Low") {
        cleanPriority = priorityName;
      }

      return {
        id: page.id,
        user_name: "Tim Developer (Notion)",
        user_email: "notion-board",
        type,
        priority: cleanPriority,
        title,
        description: `Tiket dari Papan Kanban Notion • Status: ${statusName}${startDate ? " • Mulai: " + startDate : ""}`,
        status: internalStatus,
        notion_status_name: statusName,
        notion_status_color: statusColor,
        notion_page_id: page.id,
        notion_page_url: page.url,
        notion_sync_status: "synced",
        attachment_url: files[0] || null,
        created_at: page.created_time,
        updated_at: page.last_edited_time,
        start_date: startDate,
        end_date: endDate,
      };
    });

    return {
      success: true,
      cards,
      databaseTitle: "Catat Keluarga Board",
    };
  } catch (err: any) {
    return {
      success: false,
      cards: [],
      error: err.message || "Gagal menghubungi Notion API untuk memuat kanban.",
    };
  }
}

/**
 * Updates a card's status in the Notion Kanban Board.
 */
export async function updateNotionCardStatus(
  pageId: string,
  newStatus: string
): Promise<{ success: boolean; error?: string }> {
  const { apiKey, isConfigured } = getNotionConfig();

  if (!isConfigured) {
    return { success: false, error: "Notion API belum dikonfigurasi." };
  }

  try {
    const cleanId = pageId.replace(/-/g, "");
    const res = await fetch(`${NOTION_BASE_URL}/pages/${cleanId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Notion-Version": NOTION_API_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: {
          Status: {
            status: {
              name: newStatus,
            },
          },
        },
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err.message || res.statusText };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Gagal memperbarui status di Notion." };
  }
}

