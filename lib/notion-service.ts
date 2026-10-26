/**
 * Server-Side Notion Integration Service for CatatKeluarga
 * Handles bidirectional status mapping and robust ticket creation for Bug & Suggestion reports.
 */

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
  const apiKey = process.env.NOTION_API_KEY?.trim() || "";
  const databaseId = (process.env.NOTION_DATABASE_ID?.trim() || "405a2b6446198003ba1fc2e585da8b88")
    .replace(/-/g, ""); // strip hyphens for clean ID

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
      error: "Token NOTION_API_KEY atau NOTION_DATABASE_ID belum dikonfigurasi di environment.",
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
      return {
        connected: false,
        error: `HTTP ${res.status}: ${errJson.message || res.statusText}`,
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
