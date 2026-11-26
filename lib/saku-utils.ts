/**
 * Utilitas perhitungan & format emas untuk fitur Saku Multi-Aset.
 *
 * Aturan:
 * - Selalu dalam satuan gram ("gr"), tidak pernah dikonversi ke kilogram.
 * - Presisi maksimal 4 angka di belakang koma (0,0001 gr).
 * - Saldo emas tidak boleh negatif (>= 0).
 * - Menggunakan aritmetika integer terskala (× 10.000) agar bebas floating-point drift.
 */

const GOLD_SCALE = 10_000;

/** Membulatkan angka gram ke presisi 4 digit desimal secara aman. */
export function roundGoldGram(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value * GOLD_SCALE) / GOLD_SCALE;
}

/**
 * Memformat jumlah emas selalu dalam satuan gram (`gr`) dengan format lokal Indonesia.
 * Contoh:
 * - 0 -> "0 gr"
 * - 0.5 -> "0,5 gr"
 * - 2.25 -> "2,25 gr"
 * - 1000 -> "1.000 gr"
 * - 1250.5 -> "1.250,5 gr"
 */
export function formatGoldGram(grams: number): string {
  const safe = Number.isFinite(grams) ? Math.max(0, roundGoldGram(grams)) : 0;
  const formatted = safe.toLocaleString("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
  return `${formatted} gr`;
}

/**
 * Membersihkan string input pengguna untuk field berat emas (mendukung koma & titik,
 * maksimal 1 pemisah desimal dan 4 digit desimal).
 */
export function sanitizeGoldInputString(raw: string): string {
  if (!raw) return "";
  // Normalisasi titik ke koma agar seragam untuk input Indonesia, buang karakter selain digit & koma
  const normalized = raw.replace(/\./g, ",").replace(/[^0-9,]/g, "");
  if (!normalized) return "";

  const firstCommaIdx = normalized.indexOf(",");
  if (firstCommaIdx === -1) {
    // Hapus leading zeros berlebih (kecuali satu "0")
    return normalized.replace(/^0+(?=\d)/, "");
  }

  const intPartRaw = normalized.slice(0, firstCommaIdx).replace(/^0+(?=\d)/, "");
  const intPart = intPartRaw === "" ? "0" : intPartRaw;
  const decPart = normalized
    .slice(firstCommaIdx + 1)
    .replace(/,/g, "")
    .slice(0, 4);

  return `${intPart},${decPart}`;
}

/**
 * Mengurai string input pengguna menjadi angka gram valid (>= 0, presisi 4 desimal).
 * Mendukung format "0,5", "0.5", "1.250,25", maupun "1250.25".
 */
export function parseGoldInput(raw: string): number {
  if (!raw || typeof raw !== "string") return 0;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.startsWith("-")) return 0;

  let normalized: string;
  if (trimmed.includes(",") && trimmed.includes(".")) {
    // Format Indonesia: "1.250,5" -> titik ribuan dihapus, koma jadi titik desimal
    normalized = trimmed.replace(/\./g, "").replace(",", ".");
  } else if (trimmed.includes(",")) {
    normalized = trimmed.replace(",", ".");
  } else {
    normalized = trimmed;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return roundGoldGram(parsed);
}

export type GoldBalanceResult =
  | { ok: true; nextBalance: number; amount: number }
  | { ok: false; error: string };

/**
 * Menghitung saldo emas berikutnya menggunakan aritmetika integer terskala.
 * Menolak nominal <= 0 dan menolak pengeluaran yang membuat saldo emas negatif.
 */
export function calculateNextGoldBalance(
  currentBalance: number,
  type: "in" | "out",
  rawAmount: number
): GoldBalanceResult {
  const safeCurrent = Number.isFinite(currentBalance) ? Math.max(0, roundGoldGram(currentBalance)) : 0;
  const amount = roundGoldGram(rawAmount);

  if (amount <= 0) {
    return { ok: false, error: "Jumlah emas harus lebih dari 0 gr." };
  }

  const currentScaled = Math.round(safeCurrent * GOLD_SCALE);
  const amountScaled = Math.round(amount * GOLD_SCALE);

  if (type === "out") {
    if (amountScaled > currentScaled) {
      return {
        ok: false,
        error: `Saldo emas tidak mencukupi (tersedia ${formatGoldGram(safeCurrent)}). Saldo emas tidak dapat defisit.`,
      };
    }
    return {
      ok: true,
      amount,
      nextBalance: (currentScaled - amountScaled) / GOLD_SCALE,
    };
  }

  return {
    ok: true,
    amount,
    nextBalance: (currentScaled + amountScaled) / GOLD_SCALE,
  };
}
