/**
 * Helper utilities for Vehicle Management (Dompet Azla)
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

  if (today.getTime() > dueDate.getTime()) {
    return "Terlambat";
  }

  return "Belum Bayar";
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
