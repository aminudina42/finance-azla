import type { TripCategory } from "./types";

export interface FuelEstimateResult {
  oneWayDistanceKm: number;
  isRoundTrip: boolean;
  baseDistanceKm: number;
  bufferPercent: number;
  bufferDistanceKm: number;
  totalCalculatedDistanceKm: number;
  rawLiters: number;
  liters: number;
  cost: number;
  efficiencyUsed: number;
  priceUsed: number;
  isFallbackEfficiency: boolean;
}

/**
 * Menghitung estimasi liter dan biaya BBM Road Trip dengan rincian transparan,
 * opsi Pulang-Pergi (PP), buffer kemacetan/keliling wisata, dan proteksi divide-by-zero.
 */
export function calculateFuelEstimate(
  distanceKm: number,
  efficiencyKmL?: number | null,
  fuelPricePerLiter?: number | null,
  vehicleType: "Mobil" | "Motor" = "Mobil",
  isRoundTrip: boolean = true,
  bufferPercent: number = 20
): FuelEstimateResult {
  const safeOneWay = Math.max(0, distanceKm);
  const baseDistanceKm = isRoundTrip ? safeOneWay * 2 : safeOneWay;
  const fallbackEfficiency = vehicleType === "Motor" ? 35.0 : 10.0;
  const isFallbackEfficiency = !efficiencyKmL || efficiencyKmL <= 0;
  const effectiveEfficiency = isFallbackEfficiency ? fallbackEfficiency : efficiencyKmL!;
  const effectivePrice = !fuelPricePerLiter || fuelPricePerLiter <= 0 ? 10000 : fuelPricePerLiter;

  // Buffer kemacetan liburan, AC, & rute muter-muter keliling tempat wisata
  const safeBufferPercent = Math.max(0, bufferPercent);
  const bufferDistanceKm = Math.round(((baseDistanceKm * safeBufferPercent) / 100) * 10) / 10;
  const totalCalculatedDistanceKm = Math.round((baseDistanceKm + bufferDistanceKm) * 10) / 10;

  // Rumus: ceil(totalCalculatedDistanceKm / effectiveEfficiency)
  const rawLiters = effectiveEfficiency > 0 ? totalCalculatedDistanceKm / effectiveEfficiency : 0;
  const liters = Math.ceil(rawLiters);
  const cost = liters * effectivePrice;

  return {
    oneWayDistanceKm: safeOneWay,
    isRoundTrip,
    baseDistanceKm,
    bufferPercent: safeBufferPercent,
    bufferDistanceKm,
    totalCalculatedDistanceKm,
    rawLiters: Math.round(rawLiters * 10) / 10,
    liters,
    cost,
    efficiencyUsed: effectiveEfficiency,
    priceUsed: effectivePrice,
    isFallbackEfficiency,
  };
}

/**
 * Menghitung durasi hari perjalanan: end_date - start_date + 1 (minimal 1 hari).
 */
export function calculateTripDays(startDateStr: string, endDateStr: string): number {
  if (!startDateStr || !endDateStr) return 1;
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, isNaN(diffDays) ? 1 : diffDays);
}

/**
 * Memformat rentang tanggal ramah keluarga Indonesia.
 * Contoh: "24 - 28 Des 2026" atau "30 Des 2026 - 2 Jan 2027"
 */
export function formatTripDates(startDateStr: string, endDateStr: string): string {
  if (!startDateStr) return "-";
  const start = new Date(startDateStr);
  const end = endDateStr ? new Date(endDateStr) : start;

  const months = [
    "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
    "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
  ];

  const startDay = start.getDate();
  const startMonth = months[start.getMonth()];
  const startYear = start.getFullYear();

  const endDay = end.getDate();
  const endMonth = months[end.getMonth()];
  const endYear = end.getFullYear();

  if (startYear === endYear) {
    if (startMonth === endMonth) {
      if (startDay === endDay) {
        return `${startDay} ${startMonth} ${startYear}`;
      }
      return `${startDay} - ${endDay} ${startMonth} ${startYear}`;
    }
    return `${startDay} ${startMonth} - ${endDay} ${endMonth} ${startYear}`;
  }

  return `${startDay} ${startMonth} ${startYear} - ${endDay} ${endMonth} ${endYear}`;
}

export type BudgetStatusLevel = "safe" | "warning" | "danger";

export interface BudgetStatusInfo {
  level: BudgetStatusLevel;
  percentage: number;
  label: string;
  badgeBg: string;
  textColor: string;
  progressColor: string;
}

/**
 * Menghitung persentase dan warna status anggaran:
 * - < 70%: Aman / Biru Primer
 * - 70% - 90%: Waspada / Oranye
 * - > 90% atau Overbudget: Kritis / Merah
 */
export function getBudgetStatus(actualCost: number, budgetLimit: number): BudgetStatusInfo {
  if (budgetLimit <= 0) {
    return {
      level: "safe",
      percentage: 0,
      label: "Tanpa Pagu",
      badgeBg: "rgba(40, 127, 240, 0.12)",
      textColor: "var(--brand-primary, #287ff0)",
      progressColor: "#287ff0",
    };
  }

  const percentage = Math.round((actualCost / budgetLimit) * 100);

  if (percentage > 90) {
    return {
      level: "danger",
      percentage,
      label: percentage > 100 ? "Overbudget" : "Kritis (>90%)",
      badgeBg: "rgba(240, 68, 103, 0.12)",
      textColor: "var(--color-danger, #f04467)",
      progressColor: "#f04467",
    };
  }

  if (percentage >= 70) {
    return {
      level: "warning",
      percentage,
      label: "Mendekati Pagu",
      badgeBg: "rgba(244, 163, 59, 0.15)",
      textColor: "var(--color-warning, #f4a33b)",
      progressColor: "#f4a33b",
    };
  }

  return {
    level: "safe",
    percentage,
    label: "Aman",
    badgeBg: "rgba(40, 127, 240, 0.12)",
    textColor: "var(--brand-primary, #287ff0)",
    progressColor: "#287ff0",
  };
}

export interface CategoryMeta {
  label: string;
  icon: string;
  color: string;
  bgColor: string;
}

export const CATEGORY_META: Record<TripCategory, CategoryMeta> = {
  transport: { label: "Transportasi", icon: "🚗", color: "#2563eb", bgColor: "#eff6ff" },
  ticket: { label: "Tiket Wisata", icon: "🎟️", color: "#7c3aed", bgColor: "#f5f3ff" },
  food: { label: "Kuliner & Makan", icon: "🍽️", color: "#ea580c", bgColor: "#fff7ed" },
  lodging: { label: "Penginapan", icon: "🏨", color: "#0d9488", bgColor: "#f0fdfa" },
  shopping: { label: "Oleh-oleh / Belanja", icon: "🛍️", color: "#db2777", bgColor: "#fdf2f8" },
  other: { label: "Lainnya", icon: "✨", color: "#4b5563", bgColor: "#f3f4f6" },
};

/**
 * Menghasilkan link Google Maps.
 * Jika pengguna memasukkan URL link Google Maps, fungsi langsung mengembalikan link tersebut.
 * Jika berupa teks alamat/tempat, fungsi membentuk URL pencarian otomatis.
 */
export function getGoogleMapsUrl(title: string, location?: string | null): string {
  if (location) {
    const trimmed = location.trim();
    if (
      trimmed.startsWith("http://") ||
      trimmed.startsWith("https://") ||
      trimmed.includes("maps.app.goo.gl") ||
      trimmed.includes("goo.gl/maps") ||
      trimmed.includes("google.com/maps")
    ) {
      return trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    }
  }
  const query = [title, location].filter(Boolean).join(" ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/**
 * Format nominal Rupiah (contoh: "Rp 150.000")
 */
export function formatRp(amount: number): string {
  return "Rp " + (Number(amount) || 0).toLocaleString("id-ID");
}

/**
 * Memeriksa apakah nilai lokasi merupakan tautan/URL (Google Maps atau link eksternal)
 */
export function isLocationLink(location?: string | null): boolean {
  if (!location) return false;
  const trimmed = location.trim().toLowerCase();
  return (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("maps.app.goo.gl") ||
    trimmed.startsWith("goo.gl") ||
    trimmed.includes("google.com/maps") ||
    trimmed.includes("maps.google.com")
  );
}

/**
 * Memeriksa apakah agenda trip sedang berlangsung saat ini.
 * Membandingkan waktu saat ini dengan rentang start_time - end_time pada agenda,
 * serta memeriksa kesesuaian tanggal jika tripStartDate diberikan.
 */
export function isTripItemOngoing(
  item: { day_number: number; start_time?: string | null; end_time?: string | null },
  tripStartDate?: string
): boolean {
  if (!item.start_time) return false;

  const now = new Date();

  // Jika tanggal mulai trip diberikan, validasi apakah hari ini adalah tanggal hari agenda tersebut
  if (tripStartDate) {
    const itemDate = new Date(tripStartDate);
    itemDate.setDate(itemDate.getDate() + (item.day_number - 1));
    const nowDayStr = now.toLocaleDateString("en-CA"); // Format YYYY-MM-DD
    const itemDayStr = itemDate.toLocaleDateString("en-CA");
    if (nowDayStr !== itemDayStr) return false;
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startH, startM] = item.start_time.split(":").map(Number);
  const startMinutes = (startH || 0) * 60 + (startM || 0);

  let endMinutes: number;
  if (item.end_time) {
    const [endH, endM] = item.end_time.split(":").map(Number);
    endMinutes = (endH || 0) * 60 + (endM || 0);
  } else {
    // Default rentang 1 jam jika end_time tidak diisi
    endMinutes = startMinutes + 60;
  }

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

