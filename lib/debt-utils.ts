import type { Debt, DebtPayment, Transaction, Cycle, DebtRatioEvaluation } from "./types";

export function formatRp(n: number): string {
  return "Rp " + (n || 0).toLocaleString("id-ID");
}

export function formatDateIndo(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function getRemainingMonths(debt: {
  remaining_amount: number;
  tenor_months?: number;
  paid_months?: number;
  monthly_payment: number;
}): number {
  if (debt.remaining_amount <= 0) return 0;
  if ((debt.tenor_months || 0) > 0) {
    const sisa = (debt.tenor_months || 0) - (debt.paid_months || 0);
    return Math.max(1, sisa);
  }
  if (debt.monthly_payment > 0) {
    return Math.max(1, Math.ceil(debt.remaining_amount / debt.monthly_payment));
  }
  return Infinity;
}

export interface PaidCheckResult {
  isPaid: boolean;
  latestPaymentDate?: string;
  latestAmount?: number;
  source?: "payment" | "transaction";
}

/**
 * Memeriksa apakah hutang/cicilan ini sudah dibayar untuk periode bulan/siklus berjalan.
 * Menggunakan verifikasi multi-layer:
 * 1. Pengecekan tabel debt_payments (bulan kalender berjalan, siklus aktif, atau pembayaran 28 hari terakhir)
 * 2. Fallback pengecekan tabel transactions (jika data debt_payments belum termigrasi/ter-cache)
 */
export function isDebtPaidThisMonth(
  debt: Debt,
  debtPayments?: DebtPayment[],
  transactions?: Transaction[],
  activeCycle?: Cycle | null
): PaidCheckResult {
  if (debt.remaining_amount <= 0) {
    return { isPaid: true, latestAmount: debt.total_amount };
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const twentyEightDaysAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

  // 1. Cek dari debt_payments
  if (debtPayments && debtPayments.length > 0) {
    const matchingPayments = debtPayments
      .filter((p) => p.debt_id === debt.id)
      .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());

    if (matchingPayments.length > 0) {
      const latestPay = matchingPayments[0];
      const pDate = new Date(latestPay.payment_date);

      // A. Apakah dibayar di bulan kalender ini?
      const inCalendarMonth =
        pDate.getFullYear() === currentYear && pDate.getMonth() === currentMonth;

      // B. Apakah dibayar di dalam rentang siklus aktif?
      let inCycle = false;
      if (activeCycle) {
        const cStart = new Date(activeCycle.start_date + "T00:00:00");
        const cEnd = new Date(activeCycle.end_date + "T23:59:59");
        inCycle = pDate >= cStart && pDate <= cEnd;
      }

      // C. Apakah dibayar dalam 28 hari terakhir untuk periode jatuh tempo ini?
      const inRecentWindow = pDate >= twentyEightDaysAgo;

      if (inCalendarMonth || inCycle || inRecentWindow) {
        return {
          isPaid: true,
          latestPaymentDate: latestPay.payment_date,
          latestAmount: latestPay.amount,
          source: "payment",
        };
      }
    }
  }

  // 2. Fallback cek dari transactions (jika debt_payments kosong/gagal fetch)
  if (transactions && transactions.length > 0) {
    const debtNameLower = (debt.name || "").trim().toLowerCase();
    const matchingTx = transactions
      .filter((t) => {
        if (t.type !== "expense") return false;
        const desc = (t.description || "").toLowerCase();
        const isDebtTx = desc.includes("cicilan") || desc.includes("hutang") || desc.includes("angsuran");
        return isDebtTx && desc.includes(debtNameLower);
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    if (matchingTx.length > 0) {
      const latestTx = matchingTx[0];
      const tDate = new Date(latestTx.created_at);

      const inCalendarMonth =
        tDate.getFullYear() === currentYear && tDate.getMonth() === currentMonth;

      let inCycle = false;
      if (activeCycle) {
        const cStart = new Date(activeCycle.start_date + "T00:00:00");
        const cEnd = new Date(activeCycle.end_date + "T23:59:59");
        inCycle = tDate >= cStart && tDate <= cEnd;
      }

      const inRecentWindow = tDate >= twentyEightDaysAgo;

      if (inCalendarMonth || inCycle || inRecentWindow) {
        return {
          isPaid: true,
          latestPaymentDate: latestTx.created_at,
          latestAmount: latestTx.amount,
          source: "transaction",
        };
      }
    }
  }

  return { isPaid: false };
}

export interface MonthlyStatus {
  status: "settled" | "paid" | "due_soon" | "overdue" | "pending" | "not_started";
  label: string;
  badgeBg: string;
  badgeColor: string;
  detail?: string;
  daysDiff?: number;
}

/**
 * Parsing tanggal string (YYYY-MM-DD atau ISO) ke komponen angka aman dari pergeseran timezone.
 */
export function parseDateParts(dateStr?: string | null): { year: number; month: number; day: number } | null {
  if (!dateStr) return null;
  const clean = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
  const parts = clean.split("-");
  if (parts.length < 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // 0-indexed
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  return { year, month, day };
}

/**
 * Menghitung tanggal jatuh tempo angsuran pertama berdasarkan tanggal mulai pinjaman,
 * tanggal tagihan bulanan (1-31), dan pilihan periode awal (bulan berikutnya / bulan ini).
 */
export function calculateFirstBillDate(
  startDateStr: string,
  dueDate: number,
  startOption: "next_month" | "this_month" = "next_month"
): string {
  const parts = parseDateParts(startDateStr) || {
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
    day: new Date().getDate(),
  };

  let targetYear = parts.year;
  let targetMonth = parts.month;

  if (startOption === "next_month") {
    targetMonth += 1;
    if (targetMonth > 11) {
      targetMonth = 0;
      targetYear += 1;
    }
  }

  const maxDayInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const targetDay = Math.min(Math.max(1, dueDate || 1), maxDayInTargetMonth);

  return `${targetYear}-${String(targetMonth + 1).padStart(2, "0")}-${String(targetDay).padStart(2, "0")}`;
}

/**
 * Memeriksa apakah hutang/kredit baru ini belum memasuki periode angsuran pertama
 * (misal pinjaman baru diajukan di bulan ini dan angsuran baru mulai berjalan di bulan berikutnya).
 */
export function isDebtNotStartedYet(
  debt: Debt,
  currentDate: Date = new Date()
): { notStarted: boolean; firstBillDateStr?: string; detail?: string } {
  if (debt.remaining_amount <= 0) {
    return { notStarted: false };
  }

  // Jika sudah ada cicilan yang terbayar (misal input hutang lama yang sudah berjalan),
  // berarti pinjaman ini sudah aktif berjalan dan bukan pinjaman baru.
  if ((debt.paid_months || 0) > 0) {
    return { notStarted: false };
  }

  const now = currentDate;
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed
  const todayDate = now.getDate();
  const dueDate = debt.due_date || 1;

  // 1. Cek jika first_bill_date tersimpan secara eksplisit
  if (debt.first_bill_date) {
    const fb = parseDateParts(debt.first_bill_date);
    if (fb) {
      // Jika bulan kalender berjalan masih sebelum bulan angsuran pertama
      if (currentYear < fb.year || (currentYear === fb.year && currentMonth < fb.month)) {
        return {
          notStarted: true,
          firstBillDateStr: debt.first_bill_date,
          detail: `Cicilan ke-1 mulai ${formatDateIndo(debt.first_bill_date)}`,
        };
      }

      // Jika di bulan yang sama dengan angsuran pertama, tapi hari ini masih sebelum tanggal jatuh tempo pertama
      // (statusnya tetap normal pending, bukan not_started untuk seluruh bulan)
      if (currentYear === fb.year && currentMonth === fb.month && todayDate < fb.day) {
        return { notStarted: false };
      }
    }
  }

  // 2. Deteksi otomatis cerdas (fallback jika first_bill_date belum diisi):
  // Cek tanggal mulai / tanggal pendaftaran pinjaman
  const refParts = parseDateParts(debt.start_date) || parseDateParts(debt.created_at);
  if (refParts) {
    // Jika pinjaman diajukan/didaftarkan di bulan kalender berjalan
    if (refParts.year === currentYear && refParts.month === currentMonth) {
      // A. Jika tanggal jatuh tempo bulan ini sudah lewat atau sama dengan tanggal pengajuan/pendaftaran
      // (Contoh: sekarang tgl 19, ajuin tgl 18, daftar tgl 19, tagihan tgl 18 -> tagihan tgl 18 bulan ini sudah lewat)
      const duePassedAtCreation = dueDate <= refParts.day || dueDate <= todayDate;

      // B. Atau skema kredit berbunga dengan tenor (KPR, leasing) yang baru berjalan di bulan ini
      const isNewKredit = (debt.tenor_months || 0) > 0;

      if (duePassedAtCreation || isNewKredit) {
        const nextMonthDate = new Date(currentYear, currentMonth + 1, 1);
        const nextYear = nextMonthDate.getFullYear();
        const nextMonth = nextMonthDate.getMonth();
        const maxDay = new Date(nextYear, nextMonth + 1, 0).getDate();
        const targetDay = Math.min(dueDate, maxDay);
        const calculatedFirstBill = `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-${String(targetDay).padStart(2, "0")}`;

        return {
          notStarted: true,
          firstBillDateStr: calculatedFirstBill,
          detail: `Cicilan ke-1 mulai ${formatDateIndo(calculatedFirstBill)}`,
        };
      }
    }
  }

  return { notStarted: false };
}

export function getDebtMonthlyStatus(
  debt: Debt,
  debtPayments?: DebtPayment[],
  transactions?: Transaction[],
  activeCycle?: Cycle | null
): MonthlyStatus {
  if (debt.remaining_amount <= 0) {
    return {
      status: "settled",
      label: "Lunas Total",
      badgeBg: "rgba(22, 168, 154, 0.12)",
      badgeColor: "var(--teal)",
      detail: "Semua kewajiban telah selesai",
    };
  }

  const paidInfo = isDebtPaidThisMonth(debt, debtPayments, transactions, activeCycle);

  if (paidInfo.isPaid) {
    const dateStr = paidInfo.latestPaymentDate
      ? formatDateIndo(paidInfo.latestPaymentDate)
      : "Bulan Ini";
    const amtStr = paidInfo.latestAmount ? ` (${formatRp(paidInfo.latestAmount)})` : "";
    return {
      status: "paid",
      label: "Bulan Ini: Sudah Dibayar",
      badgeBg: "rgba(22, 168, 154, 0.12)",
      badgeColor: "var(--teal)",
      detail: `Dibayar ${dateStr}${amtStr}`,
    };
  }

  const now = new Date();

  // Cek apakah pinjaman ini belum mulai angsuran untuk bulan ini (baru mulai bulan depan)
  const notStartedInfo = isDebtNotStartedYet(debt, now);
  if (notStartedInfo.notStarted) {
    return {
      status: "not_started",
      label: "Mulai Bulan Depan",
      badgeBg: "rgba(59, 130, 246, 0.12)",
      badgeColor: "#2563eb",
      detail: notStartedInfo.detail || `Jatuh tempo pertama tgl ${debt.due_date || 1}`,
    };
  }

  const todayDate = now.getDate();
  const dueDate = debt.due_date || 1;

  if (todayDate > dueDate) {
    const daysOverdue = todayDate - dueDate;
    return {
      status: "overdue",
      label: `Lewat Jatuh Tempo (${daysOverdue} Hari)`,
      badgeBg: "rgba(240, 68, 103, 0.12)",
      badgeColor: "var(--danger)",
      detail: `Jatuh tempo tgl ${dueDate}`,
      daysDiff: daysOverdue,
    };
  }

  const daysLeft = dueDate - todayDate;
  if (daysLeft <= 7) {
    return {
      status: "due_soon",
      label: daysLeft === 0 ? "Jatuh Tempo Hari Ini" : `Jatuh Tempo dlm ${daysLeft} Hari`,
      badgeBg: "rgba(234, 154, 28, 0.12)",
      badgeColor: "#d97706",
      detail: `Jatuh tempo tgl ${dueDate}`,
      daysDiff: daysLeft,
    };
  }

  return {
    status: "pending",
    label: `Menunggu Pembayaran (Tgl ${dueDate})`,
    badgeBg: "#f1f5f9",
    badgeColor: "var(--text-secondary)",
    detail: `Jatuh tempo tgl ${dueDate}`,
    daysDiff: daysLeft,
  };
}

/**
 * Menghasilkan ringkasan rentang persentase 3 zona (Aman, Caution, Bahaya)
 * berdasarkan persentase batas aman yang diatur.
 */
export function getDebtLimitTierRanges(maxSafePct: number) {
  const safeEnd = Math.max(1, Math.round(maxSafePct));
  const cautionStart = safeEnd + 1;
  const dangerStart = safeEnd + 10;

  return {
    safeRange: `1–${safeEnd}%`,
    cautionRange: `${cautionStart}–${dangerStart}%`,
    dangerRange: `>${dangerStart}%`,
  };
}

/**
 * Mengevaluasi kesehatan rasio cicilan hutang keluarga (DSR) terhadap batas aman yang ditentukan.
 * 
 * Aturan Peringatan:
 * 1. Di bawah / sama dengan batas yang diatur: "Masih aman" (🟢)
 * 2. 1-10% di atas batas yang diatur: "Keuangan keluarga mulai tidak sehat" (🟡 Caution)
 * 3. Lebih dari 10% di atas batas yang diatur: "Kondisi keuangan keluarga sangat tidak sehat" (🔴 Danger)
 */
export function evaluateDebtRatio(
  totalMonthlyDebt: number,
  monthlyIncome: number,
  maxSafePercentage: number = 25
): DebtRatioEvaluation {
  const safeEnd = Math.max(1, Number(maxSafePercentage) || 25);
  const dangerThreshold = safeEnd + 10;

  if (monthlyIncome <= 0) {
    return {
      ratio: 0,
      maxSafePct: safeEnd,
      tier: "safe",
      title: "Data Pemasukan Belum Tersedia",
      badgeText: "Belum Dihitung",
      badgeBg: "rgba(100, 116, 139, 0.12)",
      badgeColor: "#64748b",
      message: "Atur anggaran pos bulanan atau masukkan estimasi penghasilan agar rasio cicilan dapat dihitung otomatis.",
      totalMonthlyDebt,
      baseIncome: 0,
      excessPct: 0,
    };
  }

  const exactRatio = (totalMonthlyDebt / monthlyIncome) * 100;
  const ratio = Math.round(exactRatio * 10) / 10;

  if (ratio <= safeEnd) {
    return {
      ratio,
      maxSafePct: safeEnd,
      tier: "safe",
      title: "Masih aman",
      badgeText: "Masih aman",
      badgeBg: "rgba(22, 168, 154, 0.12)",
      badgeColor: "var(--teal)",
      message: `Total cicilan ${formatRp(totalMonthlyDebt)} adalah ${ratio}% dari penghasilan (di bawah batas aman ${safeEnd}%). Keuangan keluarga sehat.`,
      totalMonthlyDebt,
      baseIncome: monthlyIncome,
      excessPct: 0,
    };
  } else if (ratio <= dangerThreshold) {
    const excessPct = Math.round((ratio - safeEnd) * 10) / 10;
    return {
      ratio,
      maxSafePct: safeEnd,
      tier: "caution",
      title: "Keuangan keluarga mulai tidak sehat",
      badgeText: "Caution: Mulai Tidak Sehat",
      badgeBg: "rgba(244, 163, 59, 0.15)",
      badgeColor: "#d97706",
      message: `Total cicilan ${formatRp(totalMonthlyDebt)} mencapai ${ratio}% dari penghasilan (${excessPct}% di atas batas aman ${safeEnd}%). Mulai batasi cicilan baru.`,
      totalMonthlyDebt,
      baseIncome: monthlyIncome,
      excessPct,
    };
  } else {
    const excessPct = Math.round((ratio - safeEnd) * 10) / 10;
    return {
      ratio,
      maxSafePct: safeEnd,
      tier: "danger",
      title: "Kondisi keuangan keluarga sangat tidak sehat",
      badgeText: "Peringatan: Sangat Tidak Sehat",
      badgeBg: "rgba(240, 68, 103, 0.15)",
      badgeColor: "var(--danger)",
      message: `Total cicilan ${formatRp(totalMonthlyDebt)} melonjak hingga ${ratio}% dari penghasilan (>10% melebihi batas aman ${safeEnd}%). Berisiko tinggi mengganggu kebutuhan primer keluarga!`,
      totalMonthlyDebt,
      baseIncome: monthlyIncome,
      excessPct,
    };
  }
}

