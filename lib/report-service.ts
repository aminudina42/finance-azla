/**
 * ═════════════════════════════════════════════════════════════════════════
 * Modul Layanan Laporan Keuangan (Financial Report & Analytics Engine)
 * Catat Keluarga (Dompet Azla)
 * ═════════════════════════════════════════════════════════════════════════
 */

import type {
  Transaction,
  Pos,
  Cycle,
  CyclePosHistory,
  Debt,
  Child,
  StatusKeluarga,
} from "@/lib/types";

// ═══ Model Data & Antarmuka Laporan ═══

export interface ReportPeriod {
  type: "cycle" | "month" | "custom";
  cycleId?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  label: string;
  durationDays: number;
  isCurrentCycle: boolean;
  daysElapsed: number;
  isAbnormalDuration: boolean; // Jika < 15 hari atau > 40 hari
}

export type SavingRateStatus = "excellent" | "good" | "fragile" | "deficit";
export type DsrStatus = "safe" | "warning" | "danger";
export type PosVarianceStatus = "safe" | "warning" | "overbudget";

export interface CashFlowSummary {
  budgetIncome: number;      // Pemasukan pokok dari target budget seluruh pos yang disetting
  extraIncome: number;       // Pemasukan tambahan dari transaksi masuk (type === 'income')
  totalIncome: number;       // budgetIncome + extraIncome
  totalExpense: number;
  netCashFlow: number;
  isSurplus: boolean;
  savingRate: number; // 0 - 100 atau negatif
  savingRateStatus: SavingRateStatus;
  dsrPercentage: number;
  dsrStatus: DsrStatus;
  totalMonthlyDebt: number;
  dailyBurnRate: number;
  cycleOverCycleExpenseDiff: number | null; // % kenaikan/penurunan dibanding siklus lalu
  hasNoIncome: boolean;
  hasNoTransactions: boolean;
}

export interface PosVarianceItem {
  posId: string;
  posName: string;
  posIcon: string;
  targetBudget: number;
  actualSpent: number;
  posIncome: number;
  remainingBudget: number;
  percentageSpent: number;
  status: PosVarianceStatus;
  isDeletedPos: boolean;
  sakuBorrowTotal: number;
  txCount: number;
}

export interface MemberExpenseShare {
  role: StatusKeluarga | "lainnya";
  name: string;
  totalSpent: number;
  percentage: number;
  transactionCount: number;
  topPosName: string;
  topPosAmount: number;
}

export interface HistoricalCycleTrend {
  cycleId: string;
  label: string;
  startDate: string;
  endDate: string;
  budgetIncome: number;
  extraIncome: number;
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
  savingRate: number;
  isSurplus: boolean;
}

export interface FamilyNetWorth {
  liquidAssets: number;     // Saldo pos aktif + saldo tabungan + saldo saku anak
  posBalanceTotal: number;  // Saldo pos berjalan
  sakuBalanceTotal: number; // Saldo celengan / saku anak
  totalLiabilities: number; // Sisa pokok hutang
  netWorth: number;         // Aset - Hutang
  dsrPercentage: number;
  dsrStatus: DsrStatus;
}

export interface CompleteFinancialReport {
  period: ReportPeriod;
  cashFlow: CashFlowSummary;
  posList: PosVarianceItem[];
  top3Expenses: PosVarianceItem[];
  memberShares: MemberExpenseShare[];
  netWorth: FamilyNetWorth;
  filteredTransactions: Transaction[];
}

// ═══ Utilitas Matematika & Formatting Defensif ═══

/**
 * Pembagian defensif: mencegah NaN, Infinity, dan pembagian dengan 0.
 */
export function safeDivision(numerator: number, denominator: number, fallback = 0): number {
  if (
    typeof denominator !== "number" ||
    isNaN(denominator) ||
    !isFinite(denominator) ||
    denominator === 0
  ) {
    return fallback;
  }
  const res = numerator / denominator;
  return isNaN(res) || !isFinite(res) ? fallback : res;
}

/**
 * Format mata uang Rupiah standar Indonesia.
 */
export function formatRp(n: number): string {
  if (isNaN(n) || !isFinite(n)) return "Rp 0";
  const prefix = n < 0 ? "-" : "";
  return prefix + "Rp " + Math.abs(Math.round(n)).toLocaleString("id-ID");
}

/**
 * Format ringkas nominal untuk label grafik / badge (contoh: 1.2M, 450rb, 15.5jt).
 */
export function formatCompactRp(n: number): string {
  if (isNaN(n) || !isFinite(n)) return "Rp 0";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000_000) {
    return sign + "Rp " + (abs / 1_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 }) + " M";
  }
  if (abs >= 1_000_000) {
    return sign + "Rp " + (abs / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 }) + " jt";
  }
  if (abs >= 1_000) {
    return sign + "Rp " + (abs / 1_000).toLocaleString("id-ID", { maximumFractionDigits: 0 }) + " rb";
  }
  return formatRp(n);
}

/**
 * Normalisasi format tanggal YYYY-MM-DD menjadi label Indonesia (contoh: 25 Mar 2026).
 */
export function formatDateIndo(dateStr: string): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr + (dateStr.includes("T") ? "" : "T00:00:00"));
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

// ═══ Logika Inti Agregasi Laporan ═══

export interface GenerateReportParams {
  periodType: "cycle" | "month" | "custom";
  selectedCycleId?: string;
  selectedMonth?: string; // YYYY-MM
  customStartDate?: string;
  customEndDate?: string;
  cycles: Cycle[];
  transactions: Transaction[];
  posList: Pos[];
  cyclePosHistory: CyclePosHistory[];
  debts: Debt[];
  children: Child[];
}

/**
 * Menghitung periode aktif berdasarkan pilihan pengguna.
 */
export function resolveReportPeriod(params: {
  periodType: "cycle" | "month" | "custom";
  selectedCycleId?: string;
  selectedMonth?: string;
  customStartDate?: string;
  customEndDate?: string;
  cycles: Cycle[];
}): ReportPeriod {
  const { periodType, selectedCycleId, selectedMonth, customStartDate, customEndDate, cycles } = params;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (periodType === "month" && selectedMonth) {
    const [yearStr, monthStr] = selectedMonth.split("-");
    const y = parseInt(yearStr, 10);
    const m = parseInt(monthStr, 10) - 1;
    const firstDay = new Date(y, m, 1);
    const lastDay = new Date(y, m + 1, 0);

    const startIso = firstDay.toISOString().split("T")[0];
    const endIso = lastDay.toISOString().split("T")[0];
    const monthName = firstDay.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    const diffTime = Math.abs(lastDay.getTime() - firstDay.getTime());
    const durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const daysElapsed = today >= firstDay
      ? Math.min(durationDays, Math.ceil((today.getTime() - firstDay.getTime()) / (1000 * 60 * 60 * 24)) + 1)
      : 0;

    return {
      type: "month",
      startDate: startIso,
      endDate: endIso,
      label: monthName,
      durationDays,
      isCurrentCycle: today >= firstDay && today <= lastDay,
      daysElapsed: Math.max(1, daysElapsed),
      isAbnormalDuration: false,
    };
  }

  if (periodType === "custom" && customStartDate && customEndDate) {
    const start = new Date(customStartDate + "T00:00:00");
    const end = new Date(customEndDate + "T23:59:59");
    const diffDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    const daysElapsed = today >= start
      ? Math.min(diffDays, Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1)
      : 0;

    return {
      type: "custom",
      startDate: customStartDate,
      endDate: customEndDate,
      label: `${formatDateIndo(customStartDate)} – ${formatDateIndo(customEndDate)}`,
      durationDays: diffDays,
      isCurrentCycle: today >= start && today <= end,
      daysElapsed: Math.max(1, daysElapsed),
      isAbnormalDuration: diffDays < 15 || diffDays > 45,
    };
  }

  // Default: Siklus Gajian (Utamakan siklus yang dipilih, atau yang mencakup hari ini, atau yang bertanda is_active)
  const todayIso = today.toISOString().split("T")[0];
  const activeCycle =
    (selectedCycleId ? cycles.find((c) => c.id === selectedCycleId) : null) ||
    cycles.find((c) => c.start_date <= todayIso && c.end_date >= todayIso) ||
    cycles.find((c) => c.is_active) ||
    cycles[0];

  if (!activeCycle) {
    const curYear = today.getFullYear();
    const curMonth = String(today.getMonth() + 1).padStart(2, "0");
    const startIso = `${curYear}-${curMonth}-01`;
    const endIso = `${curYear}-${curMonth}-28`;
    return {
      type: "cycle",
      startDate: startIso,
      endDate: endIso,
      label: "Siklus Default",
      durationDays: 28,
      isCurrentCycle: true,
      daysElapsed: 1,
      isAbnormalDuration: false,
    };
  }

  const cycleStart = new Date(activeCycle.start_date + "T00:00:00");
  const cycleEnd = new Date(activeCycle.end_date + "T23:59:59");
  const diffDays = Math.max(1, Math.round((cycleEnd.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);

  const isCurrent = activeCycle.id === cycles[0]?.id;
  const daysElapsed = today >= cycleStart
    ? Math.min(diffDays, Math.ceil((today.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24)) + 1)
    : 1;

  return {
    type: "cycle",
    cycleId: activeCycle.id,
    startDate: activeCycle.start_date,
    endDate: activeCycle.end_date,
    label: activeCycle.label || `${formatDateIndo(activeCycle.start_date)} – ${formatDateIndo(activeCycle.end_date)}`,
    durationDays: diffDays,
    isCurrentCycle: isCurrent,
    daysElapsed: isCurrent ? Math.max(1, daysElapsed) : diffDays,
    isAbnormalDuration: diffDays < 15 || diffDays > 40,
  };
}

/**
 * Menghasilkan Laporan Keuangan Lengkap untuk satu periode terpilih.
 */
export function generateCompleteFinancialReport(params: GenerateReportParams): CompleteFinancialReport {
  const {
    periodType,
    selectedCycleId,
    selectedMonth,
    customStartDate,
    customEndDate,
    cycles,
    transactions,
    posList,
    cyclePosHistory,
    debts,
    children,
  } = params;

  // 1. Tentukan Periode
  const period = resolveReportPeriod({
    periodType,
    selectedCycleId,
    selectedMonth,
    customStartDate,
    customEndDate,
    cycles,
  });

  const rangeStart = new Date(period.startDate + "T00:00:00");
  const rangeEnd = new Date(period.endDate + "T23:59:59");
  const isLatestCycle = period.cycleId ? period.cycleId === cycles[0]?.id : period.isCurrentCycle;

  // 2. Filter Transaksi dalam rentang periode (memperhatikan boundary waktu lokal)
  const filteredTransactions = transactions.filter((tx) => {
    const txDate = new Date(tx.created_at);
    if (txDate < rangeStart) return false;
    // Jika siklus aktif terbaru, sertakan semua transaksi >= start_date (agar real-time)
    if (!isLatestCycle && txDate > rangeEnd) return false;
    return true;
  });

  // 3. Analisis Realisasi Pos (Variance Analysis & Synthetic Pos Handling)
  const historyForCycle = period.cycleId
    ? cyclePosHistory.filter((h) => h.cycle_id === period.cycleId)
    : [];

  // Kumpulkan semua ID pos yang pernah ada transaksi di periode ini + pos aktif saat ini
  const allPosIds = new Set<string>();
  posList.forEach((p) => allPosIds.add(p.id));
  historyForCycle.forEach((h) => allPosIds.add(h.pos_id));
  filteredTransactions.forEach((t) => {
    if (t.pos_id) allPosIds.add(t.pos_id);
  });

  const posVarianceList: PosVarianceItem[] = [];

  allPosIds.forEach((posId) => {
    const activePos = posList.find((p) => p.id === posId);
    const hist = historyForCycle.find((h) => h.pos_id === posId);

    const posTxs = filteredTransactions.filter((t) => t.pos_id === posId);
    const actualSpent = posTxs
      .filter((t) => t.type !== "income")
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    const posIncome = posTxs
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    const sakuBorrowTotal = posTxs.reduce((sum, t) => sum + (t.saku_withdraw_amount || 0), 0);

    // Jika pos tidak aktif, tidak ada di snapshot, dan tidak ada transaksi di periode ini, abaikan
    if (!activePos && !hist && posTxs.length === 0) return;

    // Tentukan target anggaran: snapshot -> active pos -> 0
    const targetBudget = hist ? hist.monthly_target : (activePos?.monthly_target ?? 0);
    const isDeletedPos = !activePos;

    const remainingBudget = targetBudget - actualSpent + posIncome;
    const percentageSpent = targetBudget > 0
      ? (actualSpent / targetBudget) * 100
      : (actualSpent > 0 ? 100 : 0);

    let status: PosVarianceStatus = "safe";
    if (percentageSpent > 100) {
      status = "overbudget";
    } else if (percentageSpent >= 80) {
      status = "warning";
    }

    const posName = activePos?.name || posTxs[0]?.pos_name || (hist ? "Pos Lampau" : "Pos Dihapus");
    const posIcon = activePos?.icon || posTxs[0]?.pos_icon || "📦";

    posVarianceList.push({
      posId,
      posName,
      posIcon,
      targetBudget,
      actualSpent,
      posIncome,
      remainingBudget,
      percentageSpent,
      status,
      isDeletedPos,
      sakuBorrowTotal,
      txCount: posTxs.length,
    });
  });

  // Urutkan pos berdasarkan pengeluaran terbesar (descending)
  posVarianceList.sort((a, b) => b.actualSpent - a.actualSpent);

  // Top 3 Pengeluaran (Pareto)
  const top3Expenses = posVarianceList.filter((p) => p.actualSpent > 0).slice(0, 3);

  // 4. Hitung Arus Kas Utama
  // Pemasukan Pokok: Dihitung dari total alokasi budget pos (termasuk Tabungan bulanan / seluruh pos)
  const budgetIncome = posVarianceList.reduce((sum, p) => sum + (p.targetBudget || 0), 0);

  // Pemasukan Tambahan: Transaksi masuk insidental (type === "income")
  const extraIncome = filteredTransactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  // Total Pemasukan Riil = Alokasi Budget Pos + Transaksi Masuk Tambahan
  const totalIncome = budgetIncome + extraIncome;

  const totalExpense = filteredTransactions
    .filter((t) => t.type !== "income")
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const netCashFlow = totalIncome - totalExpense;
  const isSurplus = netCashFlow >= 0;

  // Saving Rate: jika totalIncome 0, set 0% untuk mencegah division by zero
  const savingRate = totalIncome > 0 ? (netCashFlow / totalIncome) * 100 : 0;
  let savingRateStatus: SavingRateStatus = "deficit";
  if (totalIncome <= 0 && totalExpense === 0) {
    savingRateStatus = "good";
  } else if (savingRate >= 20) {
    savingRateStatus = "excellent";
  } else if (savingRate >= 10) {
    savingRateStatus = "good";
  } else if (savingRate >= 0) {
    savingRateStatus = "fragile";
  } else {
    savingRateStatus = "deficit";
  }

  // DSR (Debt Service Ratio) - Hanya menghitung cicilan yang aktif (remaining_amount > 0), cicilan lunas tidak dihitung
  const activeDebts = debts.filter((d) => (d.remaining_amount ?? 0) > 0);
  const totalMonthlyDebt = activeDebts.reduce((sum, d) => sum + (d.monthly_payment || 0), 0);
  const dsrPercentage = totalIncome > 0 ? (totalMonthlyDebt / totalIncome) * 100 : 0;
  let dsrStatus: DsrStatus = "safe";
  if (dsrPercentage > 40) {
    dsrStatus = "danger";
  } else if (dsrPercentage > 30) {
    dsrStatus = "warning";
  }

  // Daily Burn Rate
  const dailyBurnRate = safeDivision(totalExpense, Math.max(1, period.daysElapsed), 0);

  // Perbandingan dengan Siklus Sebelumnya (Cycle-over-Cycle)
  let cycleOverCycleExpenseDiff: number | null = null;
  if (period.type === "cycle" && period.cycleId) {
    const currentIdx = cycles.findIndex((c) => c.id === period.cycleId);
    if (currentIdx !== -1 && currentIdx + 1 < cycles.length) {
      const prevCycle = cycles[currentIdx + 1];
      const prevStart = new Date(prevCycle.start_date + "T00:00:00");
      const prevEnd = new Date(prevCycle.end_date + "T23:59:59");
      const prevExpense = transactions
        .filter((t) => {
          const d = new Date(t.created_at);
          return t.type !== "income" && d >= prevStart && d <= prevEnd;
        })
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      if (prevExpense > 0) {
        cycleOverCycleExpenseDiff = ((totalExpense - prevExpense) / prevExpense) * 100;
      }
    }
  }

  const cashFlow: CashFlowSummary = {
    budgetIncome,
    extraIncome,
    totalIncome,
    totalExpense,
    netCashFlow,
    isSurplus,
    savingRate,
    savingRateStatus,
    dsrPercentage,
    dsrStatus,
    totalMonthlyDebt,
    dailyBurnRate,
    cycleOverCycleExpenseDiff,
    hasNoIncome: totalIncome === 0,
    hasNoTransactions: filteredTransactions.length === 0,
  };

  // 5. Analisis Kontribusi Anggota (Member Expense Share)
  const memberMap: Record<string, { role: StatusKeluarga | "lainnya"; name: string; spent: number; count: number; posBreakdown: Record<string, number> }> = {};

  filteredTransactions
    .filter((t) => t.type !== "income")
    .forEach((tx) => {
      const role = (tx.user_role || "lainnya") as StatusKeluarga | "lainnya";
      const name = tx.user_name || (role === "suami" ? "Suami" : role === "istri" ? "Istri" : role === "anak" ? "Anak" : "Anggota");
      const key = `${role}_${name}`;

      if (!memberMap[key]) {
        memberMap[key] = { role, name, spent: 0, count: 0, posBreakdown: {} };
      }

      memberMap[key].spent += tx.amount || 0;
      memberMap[key].count += 1;

      const pName = tx.pos_name || "Lainnya";
      memberMap[key].posBreakdown[pName] = (memberMap[key].posBreakdown[pName] || 0) + (tx.amount || 0);
    });

  const memberShares: MemberExpenseShare[] = Object.values(memberMap).map((m) => {
    let topPosName = "-";
    let topPosAmount = 0;
    Object.entries(m.posBreakdown).forEach(([posName, amount]) => {
      if (amount > topPosAmount) {
        topPosAmount = amount;
        topPosName = posName;
      }
    });

    return {
      role: m.role,
      name: m.name,
      totalSpent: m.spent,
      percentage: safeDivision(m.spent, totalExpense) * 100,
      transactionCount: m.count,
      topPosName,
      topPosAmount,
    };
  });

  memberShares.sort((a, b) => b.totalSpent - a.totalSpent);

  // 6. Neraca Bersih (Family Net Worth)
  const posBalanceTotal = posList.reduce((sum, p) => sum + (p.current_balance || 0), 0);
  const sakuBalanceTotal = children.reduce((sum, c) => sum + (c.balance || 0), 0);
  const liquidAssets = posBalanceTotal + sakuBalanceTotal;
  const totalLiabilities = activeDebts.reduce((sum, d) => sum + Math.max(0, d.remaining_amount || 0), 0);
  const netWorth = liquidAssets - totalLiabilities;

  const netWorthSummary: FamilyNetWorth = {
    liquidAssets,
    posBalanceTotal,
    sakuBalanceTotal,
    totalLiabilities,
    netWorth,
    dsrPercentage,
    dsrStatus,
  };

  return {
    period,
    cashFlow,
    posList: posVarianceList,
    top3Expenses,
    memberShares,
    netWorth: netWorthSummary,
    filteredTransactions,
  };
}

/**
 * Menghasilkan data tren komparatif multi-siklus (3 - 6 siklus ke belakang).
 */
export function generateHistoricalTrends(params: {
  cycles: Cycle[];
  transactions: Transaction[];
  posList?: Pos[];
  cyclePosHistory?: CyclePosHistory[];
  maxCycles?: number;
}): HistoricalCycleTrend[] {
  const { cycles, transactions, posList = [], cyclePosHistory = [], maxCycles = 6 } = params;
  if (!cycles || cycles.length === 0) return [];

  // Ambil siklus maksimal N buah (dimulai dari siklus terlama ke terbaru untuk grafik kiri ke kanan)
  const targetCycles = cycles.slice(0, maxCycles).reverse();

  return targetCycles.map((cycle) => {
    const start = new Date(cycle.start_date + "T00:00:00");
    const end = new Date(cycle.end_date + "T23:59:59");

    const cycleTxs = transactions.filter((t) => {
      const d = new Date(t.created_at);
      return d >= start && d <= end;
    });

    const hist = cyclePosHistory.filter((h) => h.cycle_id === cycle.id);
    let budgetIncome = 0;
    if (hist.length > 0) {
      budgetIncome = hist.reduce((sum, h) => sum + (h.monthly_target || 0), 0);
    } else if (posList.length > 0) {
      budgetIncome = posList.reduce((sum, p) => sum + (p.monthly_target || 0), 0);
    }

    const extraIncome = cycleTxs
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const totalIncome = budgetIncome + extraIncome;

    const totalExpense = cycleTxs
      .filter((t) => t.type !== "income")
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    const netSavings = totalIncome - totalExpense;
    const savingRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

    return {
      cycleId: cycle.id,
      label: cycle.label?.replace(/\s\d{4}$/, "").replace(" – ", "–") || `${formatDateIndo(cycle.start_date)}`,
      startDate: cycle.start_date,
      endDate: cycle.end_date,
      budgetIncome,
      extraIncome,
      totalIncome,
      totalExpense,
      netSavings,
      savingRate,
      isSurplus: netSavings >= 0,
    };
  });
}

// ═══ Generator Teks Ringkasan WhatsApp ═══

/**
 * Menyusun template teks evaluasi keuangan estetik untuk dibagikan via WhatsApp.
 */
export function formatWhatsAppReportText(report: CompleteFinancialReport, familyName = "Keluarga"): string {
  const { period, cashFlow, top3Expenses, posList, memberShares } = report;

  const statusEmoji = cashFlow.isSurplus ? "🟢" : "🔴";
  const statusLabel = cashFlow.isSurplus ? "SURPLUS (Hemat)" : "DEFISIT (Boncos)";

  const overbudgetPos = posList.filter((p) => p.status === "overbudget");

  let text = `📊 *EVALUASI KEUANGAN ${familyName.toUpperCase()}*\n`;
  text += `🗓️ *Periode:* ${period.label}\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

  text += `💰 *Total Pemasukan:* ${formatRp(cashFlow.totalIncome)}\n`;
  if (cashFlow.extraIncome > 0) {
    text += `   _(Pokok: ${formatRp(cashFlow.budgetIncome)} + Tambahan: ${formatRp(cashFlow.extraIncome)})_\n`;
  }
  text += `💸 *Total Pengeluaran:* ${formatRp(cashFlow.totalExpense)}\n`;
  text += `✨ *Arus Kas Bersih:* ${cashFlow.isSurplus ? "+" : ""}${formatRp(cashFlow.netCashFlow)} (${statusLabel})\n`;
  text += `📈 *Saving Rate:* ${cashFlow.savingRate.toFixed(1)}% ${statusEmoji}\n`;
  text += `🔥 *Burn Rate Harian:* ${formatRp(cashFlow.dailyBurnRate)}/hari\n\n`;

  if (top3Expenses.length > 0) {
    text += `🏆 *Top ${top3Expenses.length} Pengeluaran Terbesar:*\n`;
    top3Expenses.forEach((p, idx) => {
      text += `${idx + 1}. ${p.posIcon} ${p.posName}: ${formatRp(p.actualSpent)} (${p.percentageSpent.toFixed(0)}%)\n`;
    });
    text += `\n`;
  }

  if (overbudgetPos.length > 0) {
    text += `⚠️ *Pos Perlu Evaluasi (Overbudget):*\n`;
    overbudgetPos.slice(0, 3).forEach((p) => {
      text += `• ${p.posIcon} ${p.posName}: Lebih ${formatRp(Math.abs(p.remainingBudget))} (${p.percentageSpent.toFixed(0)}%)\n`;
    });
    text += `\n`;
  }

  if (memberShares.length > 0) {
    text += `👥 *Proporsi Belanja Pasutri:*\n`;
    memberShares.forEach((m) => {
      text += `• ${m.name}: ${formatRp(m.totalSpent)} (${m.percentage.toFixed(0)}%)\n`;
    });
    text += `\n`;
  }

  text += `_Dibuat otomatis oleh Catat Keluarga_ ❤️`;

  return text;
}

// ═══ Generator File CSV / Excel ═══

/**
 * Menyusun data laporan dalam format CSV (UTF-8 BOM) yang rapi untuk diimpor ke Excel/Google Sheets.
 */
export function generateCsvContent(report: CompleteFinancialReport, familyName = "Keluarga"): string {
  const { period, cashFlow, posList, filteredTransactions } = report;

  const rows: string[] = [];

  // Section 1: Ringkasan Eksekutif
  rows.push(`"LAPORAN KEUANGAN KELUARGA - ${familyName}"`);
  rows.push(`"Periode","${period.label}"`);
  rows.push(`"Rentang Tanggal","${period.startDate} s/d ${period.endDate}"`);
  rows.push(`"Durasi","${period.durationDays} Hari"`);
  rows.push("");
  rows.push(`"METRIK KEUANGAN","NOMINAL","KETERANGAN"`);
  rows.push(`"Pemasukan Pokok (Alokasi Pos)",${cashFlow.budgetIncome},"${formatRp(cashFlow.budgetIncome)}"`);
  rows.push(`"Pemasukan Tambahan",${cashFlow.extraIncome},"${formatRp(cashFlow.extraIncome)}"`);
  rows.push(`"Total Pemasukan",${cashFlow.totalIncome},"${formatRp(cashFlow.totalIncome)}"`);
  rows.push(`"Total Pengeluaran",${cashFlow.totalExpense},"${formatRp(cashFlow.totalExpense)}"`);
  rows.push(`"Arus Kas Bersih",${cashFlow.netCashFlow},"${cashFlow.isSurplus ? "Surplus" : "Defisit"}"`);
  rows.push(`"Saving Rate (%)",${cashFlow.savingRate.toFixed(2)},"${cashFlow.savingRateStatus}"`);
  rows.push(`"Daily Burn Rate",${Math.round(cashFlow.dailyBurnRate)},"${formatRp(cashFlow.dailyBurnRate)} / hari"`);
  rows.push(`"Debt Service Ratio (DSR)",${cashFlow.dsrPercentage.toFixed(2)},"${cashFlow.dsrStatus}"`);
  rows.push("");

  // Section 2: Rekapitulasi Pos Anggaran
  rows.push(`"REKAPITULASI POS ANGGARAN"`);
  rows.push(`"Nama Pos","Target Anggaran","Realisasi Belanja","Pemasukan Pos","Sisa / Defisit","Pemakaian (%)","Status"`);
  posList.forEach((p) => {
    rows.push(
      `"${p.posIcon} ${p.posName}",${p.targetBudget},${p.actualSpent},${p.posIncome},${p.remainingBudget},${p.percentageSpent.toFixed(1)},"${p.status}"`
    );
  });
  rows.push("");

  // Section 3: Rincian Transaksi
  rows.push(`"RINCIAN TRANSAKSI PERIODE INI"`);
  rows.push(`"Tanggal","Tipe","Pos Anggaran","Nominal","Pencatat","Peran","Keterangan"`);
  filteredTransactions.forEach((t) => {
    const dStr = t.created_at ? t.created_at.replace("T", " ").substring(0, 19) : "-";
    const typeLabel = t.type === "income" ? "Pemasukan" : "Pengeluaran";
    const cleanDesc = (t.description || "").replace(/"/g, '""');
    rows.push(
      `"${dStr}","${typeLabel}","${t.pos_name || "-"}",${t.amount},"${t.user_name || "-"}","${t.user_role || "-"}","${cleanDesc}"`
    );
  });

  // UTF-8 BOM agar aksen dan karakter Indonesia tidak korup di Microsoft Excel
  return "\uFEFF" + rows.join("\r\n");
}

