#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import dns from "node:dns";

// Ensure IPv4 is prioritized to prevent Node.js fetch timeout on dual-stack hosts
try {
  dns.setDefaultResultOrder?.("ipv4first");
} catch {
  // Ignore in environments where dns is not configurable
}

// 1. Automatically load .env.local or .env if NOTION_API_KEY is missing
function loadEnvFile(filename) {
  const filePath = path.resolve(process.cwd(), filename);
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.substring(0, eqIdx).trim();
    let val = trimmed.substring(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const apiKey = (process.env.NOTION_API_KEY || "").replace(/["']/g, "").trim();
const rawDbId = (process.env.NOTION_DATABASE_ID || "").replace(/["']/g, "").trim();

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

if (!apiKey || !databaseId) {
  console.error("❌ Error: NOTION_API_KEY atau NOTION_DATABASE_ID belum dikonfigurasi di .env.local");
  process.exit(1);
}

const NOTION_API_VERSION = "2022-06-28";
const NOTION_BASE_URL = "https://api.notion.com/v1";

const headers = {
  Authorization: `Bearer ${apiKey}`,
  "Notion-Version": NOTION_API_VERSION,
  "Content-Type": "application/json",
};

/**
 * List recent cards from Notion Kanban
 */
async function listTickets(limit = 10, showAll = false) {
  try {
    const res = await fetch(`${NOTION_BASE_URL}/databases/${databaseId}/query`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        page_size: limit,
        sorts: [{ timestamp: "created_time", direction: "descending" }],
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error(`❌ Gagal mengambil tiket (${res.status}):`, err.message || res.statusText);
      process.exit(1);
    }

    const data = await res.json();
    const results = data.results || [];

    if (results.length === 0) {
      console.log("ℹ️ Tidak ada tiket ditemukan di database Notion.");
      return;
    }

    console.log(`\n📋 DAFTAR TIKET NOTION (Terbaru ${results.length}):`);
    console.log("--------------------------------------------------------------------------------");
    console.log(`ID (Short) | STATUS           | PRIORITAS | JUDUL`);
    console.log("--------------------------------------------------------------------------------");

    for (const page of results) {
      const props = page.properties || {};
      const cleanId = page.id.replace(/-/g, "");
      const shortId = cleanId.slice(-8); // 8-char unique suffix
      const title = props["Project name"]?.title?.[0]?.plain_text?.trim() || "(Tanpa Judul)";
      const status = props["Status"]?.status?.name || "To Do";
      const priority = props["Priority"]?.select?.name || "-";

      if (!showAll && status.toLowerCase() === "done") {
        continue;
      }

      console.log(
        `${shortId.padEnd(12)} | ${status.padEnd(16)} | ${priority.padEnd(9)} | ${title}`
      );
    }
    console.log("--------------------------------------------------------------------------------");
    console.log("💡 Tip: Jalankan 'npm run ticket get <id_atau_kata_kunci>' untuk membaca detail tiket.\n");
  } catch (err) {
    console.error("❌ Network error:", err.message);
    process.exit(1);
  }
}

/**
 * Extract block text cleanly
 */
function extractBlockText(block) {
  const type = block.type;
  if (!type || !block[type]) return "";

  if (block[type].rich_text && Array.isArray(block[type].rich_text)) {
    return block[type].rich_text.map((t) => t.plain_text || "").join("");
  }
  return "";
}

/**
 * Get ticket details and content blocks
 */
async function getTicket(query) {
  if (!query) {
    console.error("❌ Harap berikan ID tiket atau kata kunci pencarian. Contoh: npm run ticket get 407a2b64");
    process.exit(1);
  }

  const cleanQuery = query.toLowerCase().replace(/-/g, "").trim();

  try {
    // 1. Cari kartu di database
    const queryRes = await fetch(`${NOTION_BASE_URL}/databases/${databaseId}/query`, {
      method: "POST",
      headers,
      body: JSON.stringify({ page_size: 50 }),
    });

    if (!queryRes.ok) {
      const err = await queryRes.json().catch(() => ({}));
      console.error(`❌ Gagal mencari tiket (${queryRes.status}):`, err.message || queryRes.statusText);
      process.exit(1);
    }

    const data = await queryRes.json();
    const results = data.results || [];

    // Match by ID (prefix, suffix, or exact) or title keyword
    let matchedPage = results.find((p) => {
      const cleanId = p.id.replace(/-/g, "").toLowerCase();
      return cleanId === cleanQuery || cleanId.startsWith(cleanQuery) || cleanId.endsWith(cleanQuery);
    });

    if (!matchedPage) {
      matchedPage = results.find((p) => {
        const title = (p.properties["Project name"]?.title?.[0]?.plain_text || "").toLowerCase();
        return title.includes(query.toLowerCase());
      });
    }

    if (!matchedPage) {
      console.error(`❌ Tidak ditemukan tiket dengan ID atau kata kunci "${query}".`);
      process.exit(1);
    }

    const pageId = matchedPage.id;
    const props = matchedPage.properties || {};
    const title = props["Project name"]?.title?.[0]?.plain_text?.trim() || "(Tanpa Judul)";
    const status = props["Status"]?.status?.name || "To Do";
    const priority = props["Priority"]?.select?.name || "Medium";
    const createdTime = new Date(matchedPage.created_time).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
    const files = (props["Attach file"]?.files || [])
      .map((f) => f.external?.url || f.file?.url)
      .filter(Boolean);

    // 2. Ambil blok isi halaman (deskripsi, langkah, diagnostik, screenshot)
    const blocksRes = await fetch(`${NOTION_BASE_URL}/blocks/${pageId}/children?page_size=100`, {
      method: "GET",
      headers,
    });

    let description = "";
    let stepsToReproduce = "";
    let diagnostics = [];
    const screenshotUrls = [...files];

    if (blocksRes.ok) {
      const blocksData = await blocksRes.json();
      const blocks = blocksData.results || [];

      let currentSection = "deskripsi";

      for (const b of blocks) {
        const text = extractBlockText(b);

        if (b.type.startsWith("heading")) {
          const lower = text.toLowerCase();
          if (lower.includes("deskripsi")) currentSection = "deskripsi";
          else if (lower.includes("langkah") || lower.includes("reproduce")) currentSection = "steps";
          else if (lower.includes("pelapor") || lower.includes("diagnostik")) currentSection = "diagnostik";
          else if (lower.includes("layar") || lower.includes("screenshot")) currentSection = "screenshot";
          continue;
        }

        if (b.type === "paragraph") {
          if (!text.trim()) continue;
          if (currentSection === "deskripsi") {
            description += (description ? "\n" : "") + text;
          } else if (currentSection === "steps") {
            stepsToReproduce += (stepsToReproduce ? "\n" : "") + text;
          }
        } else if (b.type === "bulleted_list_item") {
          if (currentSection === "diagnostik") {
            diagnostics.push(text);
          } else if (currentSection === "steps") {
            stepsToReproduce += (stepsToReproduce ? "\n" : "") + `- ${text}`;
          } else {
            description += (description ? "\n" : "") + `- ${text}`;
          }
        } else if (b.type === "numbered_list_item") {
          if (currentSection === "steps") {
            stepsToReproduce += (stepsToReproduce ? "\n" : "") + `1. ${text}`;
          } else {
            description += (description ? "\n" : "") + `1. ${text}`;
          }
        } else if (b.type === "image") {
          const imgUrl = b.image?.external?.url || b.image?.file?.url;
          if (imgUrl && !screenshotUrls.includes(imgUrl)) {
            screenshotUrls.push(imgUrl);
          }
        }
      }
    }

    // Output strictly sanitized, readable markdown
    console.log("\n================================================================================");
    console.log(`📋 TIKET: ${title}`);
    console.log("================================================================================");
    console.log(`• ID Notion   : ${pageId}`);
    console.log(`• Status      : ${status}`);
    console.log(`• Prioritas   : ${priority}`);
    console.log(`• Waktu Lapor : ${createdTime} WIB`);
    console.log(`• Link Notion : ${matchedPage.url}`);

    if (diagnostics.length > 0) {
      console.log("\n🔍 Data Pelapor & Diagnostik:");
      for (const diag of diagnostics) {
        console.log(`  - ${diag}`);
      }
    }

    console.log("\n📝 Deskripsi Masalah / Saran:");
    console.log(description ? description.trim() : "(Tidak ada deskripsi detail)");

    if (stepsToReproduce) {
      console.log("\n🔄 Langkah Kejadian (Steps to Reproduce):");
      console.log(stepsToReproduce.trim());
    }

    if (screenshotUrls.length > 0) {
      console.log("\n🖼️ Tangkapan Layar (Screenshot):");
      for (const url of screenshotUrls) {
        console.log(`  - ${url}`);
      }
    }

    console.log("================================================================================\n");
  } catch (err) {
    console.error("❌ Error fetching ticket:", err.message);
    process.exit(1);
  }
}

/**
 * Update card status
 */
async function updateStatus(pageIdOrQuery, newStatus) {
  if (!pageIdOrQuery || !newStatus) {
    console.error("❌ Format: npm run ticket status <id_or_keyword> <new_status>");
    console.error("   Contoh: npm run ticket status 407a2b64 'In progress'");
    console.error("   Contoh: npm run ticket status 407a2b64 'Done'");
    process.exit(1);
  }

  const cleanQuery = pageIdOrQuery.toLowerCase().replace(/-/g, "").trim();

  try {
    // Cari pageId jika yang diberikan berupa shortId atau query
    let targetPageId = pageIdOrQuery;

    if (cleanQuery.length !== 32) {
      const queryRes = await fetch(`${NOTION_BASE_URL}/databases/${databaseId}/query`, {
        method: "POST",
        headers,
        body: JSON.stringify({ page_size: 50 }),
      });
      const data = await queryRes.json();
      const results = data.results || [];
      const matched = results.find((p) => {
        const cleanId = p.id.replace(/-/g, "").toLowerCase();
        const title = (p.properties["Project name"]?.title?.[0]?.plain_text || "").toLowerCase();
        return (
          cleanId === cleanQuery ||
          cleanId.startsWith(cleanQuery) ||
          cleanId.endsWith(cleanQuery) ||
          title.includes(cleanQuery)
        );
      });

      if (!matched) {
        console.error(`❌ Tidak ditemukan tiket dengan ID atau kata kunci "${pageIdOrQuery}".`);
        process.exit(1);
      }
      targetPageId = matched.id;
    }

    // Normalize status names to match Notion options: 'To Do', 'Bug', 'Rekomendasi Feat', 'In progress', 'Done'
    const lower = newStatus.toLowerCase();
    let exactStatus = newStatus;
    if (lower === "done" || lower === "selesai") exactStatus = "Done";
    else if (lower.includes("progress") || lower === "proses" || lower === "doing") exactStatus = "In progress";
    else if (lower === "todo" || lower === "to do") exactStatus = "To Do";
    else if (lower === "bug") exactStatus = "Bug";

    const cleanId = targetPageId.replace(/-/g, "");
    const res = await fetch(`${NOTION_BASE_URL}/pages/${cleanId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        properties: {
          Status: {
            status: {
              name: exactStatus,
            },
          },
        },
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error(`❌ Gagal memperbarui status (${res.status}):`, err.message || res.statusText);
      process.exit(1);
    }

    console.log(`✅ Berhasil memperbarui status tiket [${targetPageId}] menjadi "${exactStatus}".`);
  } catch (err) {
    console.error("❌ Error updating status:", err.message);
    process.exit(1);
  }
}

// -----------------------------------------------------------------------------
// CLI Argument Router
// -----------------------------------------------------------------------------
const rawArgs = process.argv.slice(2).filter((a) => a !== "--");
const showAllFlag = rawArgs.includes("--all") || rawArgs.includes("-a");
const args = rawArgs.filter((a) => a !== "--all" && a !== "-a");
const command = (args[0] || "list").toLowerCase();

switch (command) {
  case "list":
    const limit = parseInt(args[1], 10) || 15;
    listTickets(limit, showAllFlag);
    break;

  case "get":
    getTicket(args.slice(1).join(" "));
    break;

  case "start":
    updateStatus(args.slice(1).join(" "), "In progress");
    break;

  case "done":
    updateStatus(args.slice(1).join(" "), "Done");
    break;

  case "status":
    updateStatus(args[1], args.slice(2).join(" "));
    break;

  default:
    console.log("Perintah tersedia:");
    console.log("  npm run ticket list           # Menampilkan tiket aktif yang belum selesai");
    console.log("  npm run ticket list -- --all  # Menampilkan semua tiket termasuk yang sudah Done");
    console.log("  npm run ticket get <id|judul> # Menampilkan detail isi tiket & screenshot");
    console.log("  npm run ticket start <id>     # Mengubah status tiket jadi 'In progress'");
    console.log("  npm run ticket done <id>      # Mengubah status tiket jadi 'Done'");
    console.log("  npm run ticket status <id> <status> # Mengubah status custom");
    break;
}
