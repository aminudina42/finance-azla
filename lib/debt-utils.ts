import type { Debt, DebtPayment, Transaction, Cycle } from "./types";

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
  status: "settled" | "paid" | "due_soon" | "overdue" | "pending";
  label: string;
  badgeBg: string;
  badgeColor: string;
  detail?: string;
  daysDiff?: number;
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
