
import type { VehicleFuelLog } from "@/lib/types";

export const PERTALITE_PRICE_PER_LITER = 10000;
export const FUEL_TYPES = ["Pertalite", "Pertamax", "Pertamax Turbo", "BP 92", "Lainnya"] as const;

export interface MonthlyFuelStats {
  totalFills: number;
  totalCost: number;
  totalLiters: number;
  totalDistanceKm: number;
  averageKmL: number | null;
  costPerKm: number | null;
  hasBaselineOnly: boolean;
}

/**
 * Format fuel consumption efficiency: e.g. "35 km/l" or "35.2 km/l"
 */
export function formatFuelEfficiency(kmL?: number | null): string {
  if (kmL === null || kmL === undefined || isNaN(kmL) || kmL <= 0) {
    return "— km/l";
  }
  const formatted = kmL % 1 === 0 ? kmL.toFixed(0) : kmL.toFixed(1);
  return `${formatted} km/l`;
}

/**
 * Calculates monthly/cycle fuel statistics for a vehicle
 */
export function calculateMonthlyFuelStats(
  logs: VehicleFuelLog[],
  cycleStartDateStr?: string | null
): MonthlyFuelStats {
  if (!logs || logs.length === 0) {
    return {
      totalFills: 0,
      totalCost: 0,
      totalLiters: 0,
      totalDistanceKm: 0,
      averageKmL: null,
      costPerKm: null,
      hasBaselineOnly: false,
    };
  }

  // Filter logs within active cycle if provided, else default to all in the current calendar month
  let filteredLogs = logs;
  if (cycleStartDateStr) {
    const cycleStart = new Date(cycleStartDateStr + "T00:00:00");
    filteredLogs = logs.filter((log) => {
      const d = new Date(log.log_date + "T00:00:00");
      return d >= cycleStart;
    });
  } else {
    const now = new Date();
    filteredLogs = logs.filter((log) => {
      const d = new Date(log.log_date + "T00:00:00");
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
  }

  const totalCost = filteredLogs.reduce((sum, l) => sum + Number(l.total_cost || 0), 0);
  const totalLiters = filteredLogs.reduce((sum, l) => sum + Number(l.fuel_liters || 0), 0);

  // Valid distance logs (logs that have distance_km calculated from previous fuel log)
  const validDistanceLogs = filteredLogs.filter(
    (l) => typeof l.distance_km === "number" && l.distance_km > 0
  );

  const totalDistanceKm = validDistanceLogs.reduce((sum, l) => sum + Number(l.distance_km || 0), 0);
  const validLiters = validDistanceLogs.reduce((sum, l) => sum + Number(l.fuel_liters || 0), 0);
  const validDistanceCost = validDistanceLogs.reduce((sum, l) => sum + Number(l.total_cost || 0), 0);

  const averageKmL = validLiters > 0 && totalDistanceKm > 0 
    ? Math.round((totalDistanceKm / validLiters) * 10) / 10 
    : null;

  const costPerKm = totalDistanceKm > 0 && validDistanceCost > 0 
    ? Math.round(validDistanceCost / totalDistanceKm) 
    : null;

  const hasBaselineOnly = filteredLogs.length === 1 && validDistanceLogs.length === 0;

  return {
    totalFills: filteredLogs.length,
    totalCost,
    totalLiters: Math.round(totalLiters * 10) / 10,
    totalDistanceKm,
    averageKmL,
    costPerKm,
    hasBaselineOnly,
  };
}

/**
 * Helper utilities for Vehicle Management (Catat Keluarga)
 */

export type TaxStatus = "Belum Bayar" | "Terlambat" | "Lunas" | "Data Belum Lengkap";
export type ServiceStatus = "Aman" | "Perlu Servis" | "Belum Ada Riwayat";

/**
 * Format number to Indonesian Rupiah representation: "Rp 1.200.000"
 */
export function formatRp(n: number): string {
  if (isNaN(n) || n === null || n === undefined) return "Rp 0";
  const prefix = n < 0 ? "-Rp " : "Rp ";
  return prefix + Math.abs(Math.round(n)).toLocaleString("id-ID");
}

/**
 * Format YYYY-MM-DD or ISO string to Indonesian date: "22 Okt 2026"
 */
export function formatDateIndo(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    // Parse date parts directly to avoid timezone shift on plain YYYY-MM-DD
    const parts = dateStr.split("T")[0].split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      return d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? "—"
      : d.toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
  } catch {
    return dateStr;
  }
}

/**
 * Convert ISO "YYYY-MM-DD" to "DD/MM/YYYY"
 */
export function formatISOToDDMMYYYY(iso?: string | null): string {
  if (!iso) return "";
  const parts = iso.split("T")[0].split("-");
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
  }
  return "";
}

/**
 * Convert "DD/MM/YYYY" or "DDMMYYYY" to ISO "YYYY-MM-DD"
 */
export function parseDDMMYYYYToISO(dmy?: string | null): string | null {
  if (!dmy) return null;
  const clean = dmy.replace(/\D/g, "");
  if (clean.length !== 8) return null;

  const d = parseInt(clean.slice(0, 2), 10);
  const m = parseInt(clean.slice(2, 4), 10);
  const y = parseInt(clean.slice(4, 8), 10);

  if (m < 1 || m > 12) return null;
  if (d < 1 || d > 31) return null;
  if (y < 1900 || y > 2100) return null;

  const daysInMonth = new Date(y, m, 0).getDate();
  if (d > daysInMonth) return null;

  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * Format date for display as "DD/MM/YYYY": e.g. "22/10/2026"
 */
export function formatDateDDMMYYYY(dateStr?: string | null): string {
  if (!dateStr) return "—";
  return formatISOToDDMMYYYY(dateStr) || "—";
}

/**
 * Normalizes vehicle license plate: trims spaces, uppercase, removes multi-space
 */
export function normalizePlateNumber(plate: string): string {
  return plate
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
}

/**
 * Calculates Tax Status based on next_tax_due_date and today's date
 */
export function calculateTaxStatus(nextDueDateStr?: string | null): TaxStatus {
  if (!nextDueDateStr) return "Data Belum Lengkap";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const parts = nextDueDateStr.split("T")[0].split("-");
  if (parts.length !== 3) return "Data Belum Lengkap";

  const dueDate = new Date(
    parseInt(parts[0], 10),
    parseInt(parts[1], 10) - 1,
    parseInt(parts[2], 10)
  );
  dueDate.setHours(0, 0, 0, 0);

  if (isNaN(dueDate.getTime())) return "Data Belum Lengkap";

  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return "Terlambat";
  }

  if (diffDays <= 30) {
    return "Belum Bayar";
  }

  return "Lunas";
}

/**
 * Calculates Service Status based on last_service_date, interval (1 or 2 months), and today's date
 */
export function calculateServiceStatus(
  lastServiceDateStr?: string | null,
  intervalMonths: number = 1
): ServiceStatus {
  if (!lastServiceDateStr) return "Belum Ada Riwayat";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const parts = lastServiceDateStr.split("T")[0].split("-");
  if (parts.length !== 3) return "Belum Ada Riwayat";

  const serviceDate = new Date(
    parseInt(parts[0], 10),
    parseInt(parts[1], 10) - 1,
    parseInt(parts[2], 10)
  );
  serviceDate.setHours(0, 0, 0, 0);

  if (isNaN(serviceDate.getTime())) return "Belum Ada Riwayat";

  // Calculate threshold date: serviceDate + intervalMonths
  const thresholdDate = new Date(serviceDate);
  thresholdDate.setMonth(thresholdDate.getMonth() + intervalMonths);

  if (today.getTime() >= thresholdDate.getTime()) {
    return "Perlu Servis";
  }

  return "Aman";
}

/**
 * Calculates days remaining until tax due date. Negative means overdue.
 */
export function getDaysUntilTaxDue(nextDueDateStr?: string | null): number | null {
  if (!nextDueDateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const parts = nextDueDateStr.split("T")[0].split("-");
  if (parts.length !== 3) return null;

  const dueDate = new Date(
    parseInt(parts[0], 10),
    parseInt(parts[1], 10) - 1,
    parseInt(parts[2], 10)
  );
  dueDate.setHours(0, 0, 0, 0);

  const diffTime = dueDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
