"use client";

import React from "react";
import type { CashFlowSummary, ReportPeriod } from "@/lib/report-service";
import { formatRp } from "@/lib/report-service";
import {
  TrendingUp,
  TrendingDown,
  ArrowDownLeft,
  ArrowUpRight,
  Flame,
  CreditCard,
  PiggyBank,
  AlertTriangle,
  Info,
} from "lucide-react";

interface CashFlowOverviewCardProps {
  cashFlow: CashFlowSummary;
  period: ReportPeriod;
}

export default function CashFlowOverviewCard({ cashFlow, period }: CashFlowOverviewCardProps) {
  const {
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
    hasNoIncome,
    hasNoTransactions,
  } = cashFlow;

  // Saving rate badges
  const savingRateBadgeConfig = {
    excellent: { label: "Sangat Sehat", bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200", dot: "bg-teal-500" },
    good: { label: "Cukup Baik", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", dot: "bg-blue-500" },
    fragile: { label: "Rentan", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", dot: "bg-amber-500" },
    deficit: { label: "Defisit", bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", dot: "bg-rose-500" },
  }[savingRateStatus];

  // DSR badges
  const dsrBadgeConfig = {
    safe: { label: "Aman (<30%)", bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200" },
    warning: { label: "Waspada (30-40%)", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
    danger: { label: "Beban Tinggi (>40%)", bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  }[dsrStatus];

  return (
    <section className="flex flex-col gap-3.5" aria-label="Ringkasan Arus Kas">
      {/* 1. Hero Card: Net Cash Flow Banner */}
      <div
        className="rounded-2xl p-5 relative overflow-hidden flex flex-col gap-3 transition-all"
        style={{
          background: isSurplus
            ? "linear-gradient(135deg, rgba(22, 168, 154, 0.09) 0%, rgba(22, 168, 154, 0.02) 100%), var(--surface)"
            : "linear-gradient(135deg, rgba(240, 68, 103, 0.09) 0%, rgba(240, 68, 103, 0.02) 100%), var(--surface)",
          border: `1px solid ${isSurplus ? "rgba(22, 168, 154, 0.25)" : "rgba(240, 68, 103, 0.25)"}`,
          boxShadow: "var(--shadow, 0 8px 20px rgba(16,45,85,0.06))",
        }}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
            Arus Kas Bersih (Net Cash Flow)
          </span>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${
              isSurplus ? "bg-teal-50 text-teal-700 border-teal-200" : "bg-rose-50 text-rose-700 border-rose-200"
            }`}
          >
            {isSurplus ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            <span>{isSurplus ? "Surplus Finansial" : "Defisit Finansial"}</span>
          </span>
        </div>

        <div className="flex items-baseline gap-2">
          <span
            className="text-3xl font-extrabold tracking-tight"
            style={{
              fontFamily: "var(--font-fraunces), serif",
              color: isSurplus ? "var(--success, #16a89a)" : "var(--danger, #f04467)",
            }}
          >
            {isSurplus ? "+" : ""}
            {formatRp(netCashFlow)}
          </span>
        </div>

        {/* Cycle-over-Cycle Indicator (Jika ada pembanding) */}
        {cycleOverCycleExpenseDiff !== null && (
          <div className="text-xs font-medium flex items-center gap-1.5 pt-2 border-t border-slate-100" style={{ color: "var(--text)" }}>
            {cycleOverCycleExpenseDiff <= 0 ? (
              <>
                <span className="font-bold text-teal-600">
                  Hemat {Math.abs(cycleOverCycleExpenseDiff).toFixed(1)}%
                </span>
                <span>dibandingkan siklus sebelumnya. Kerja bagus! ✨</span>
              </>
            ) : (
              <>
                <span className="font-bold text-rose-600">
                  Naik {cycleOverCycleExpenseDiff.toFixed(1)}%
                </span>
                <span>dibandingkan pengeluaran siklus lalu.</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* 2. Grid Dua Kolom: Pemasukan vs Pengeluaran */}
      <div className="grid grid-cols-2 gap-3">
        {/* Pemasukan */}
        <div
          className="rounded-2xl p-4 flex flex-col gap-1.5"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow, 0 4px 12px rgba(16,45,85,0.04))",
          }}
        >
          <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--muted)" }}>
            <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <ArrowDownLeft size={12} strokeWidth={2.5} />
            </div>
            <span>Pemasukan</span>
          </div>
          <span
            className="text-lg font-bold"
            style={{ fontFamily: "var(--font-fraunces), serif", color: "var(--navy)" }}
          >
            {formatRp(totalIncome)}
          </span>
          <div className="flex flex-col gap-0.5 text-[10px]" style={{ color: "var(--text-secondary)" }}>
            <span className="truncate">Alokasi Pos: {formatRp(cashFlow.budgetIncome)}</span>
            {cashFlow.extraIncome > 0 && (
              <span className="text-emerald-600 font-semibold truncate">+ Tambahan: {formatRp(cashFlow.extraIncome)}</span>
            )}
          </div>
        </div>

        {/* Pengeluaran */}
        <div
          className="rounded-2xl p-4 flex flex-col gap-1.5"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow, 0 4px 12px rgba(16,45,85,0.04))",
          }}
        >
          <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--muted)" }}>
            <div className="w-5 h-5 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <ArrowUpRight size={12} strokeWidth={2.5} />
            </div>
            <span>Pengeluaran</span>
          </div>
          <span
            className="text-lg font-bold"
            style={{ fontFamily: "var(--font-fraunces), serif", color: "var(--danger, #f04467)" }}
          >
            {formatRp(totalExpense)}
          </span>
          <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
            Belanja pos &amp; operasional
          </span>
        </div>
      </div>

      {/* 3. Kartu Indikator Finansial: Saving Rate, DSR, Burn Rate */}
      <div
        className="rounded-2xl p-4 flex flex-col gap-3.5"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow, 0 4px 12px rgba(16,45,85,0.04))",
        }}
      >
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
          Rasio Kesehatan Keuangan
        </span>

        {/* Row A: Saving Rate */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
              <PiggyBank size={15} />
            </div>
            <div>
              <div className="text-xs font-bold" style={{ color: "var(--navy)" }}>
                Saving Rate
              </div>
              <div className="text-[10px]" style={{ color: "var(--muted)" }}>
                Rasio tabungan terhadap gaji
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className="text-sm font-extrabold"
              style={{
                fontFamily: "var(--font-fraunces), serif",
                color: savingRate >= 0 ? "var(--navy)" : "var(--danger, #f04467)",
              }}
            >
              {savingRate.toFixed(1)}%
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${savingRateBadgeConfig.bg} ${savingRateBadgeConfig.text} ${savingRateBadgeConfig.border}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${savingRateBadgeConfig.dot}`} />
              <span>{savingRateBadgeConfig.label}</span>
            </span>
          </div>
        </div>

        <div className="border-t border-slate-100" />

        {/* Row B: Debt Service Ratio (DSR) */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <CreditCard size={15} />
            </div>
            <div>
              <div className="text-xs font-bold" style={{ color: "var(--navy)" }}>
                Beban Cicilan (DSR)
              </div>
              <div className="text-[10px]" style={{ color: "var(--muted)" }}>
                Cicilan: {formatRp(totalMonthlyDebt)}/bln
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className="text-sm font-extrabold"
              style={{ fontFamily: "var(--font-fraunces), serif", color: "var(--navy)" }}
            >
              {dsrPercentage.toFixed(1)}%
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${dsrBadgeConfig.bg} ${dsrBadgeConfig.text} ${dsrBadgeConfig.border}`}
            >
              {dsrBadgeConfig.label}
            </span>
          </div>
        </div>

        <div className="border-t border-slate-100" />

        {/* Row C: Daily Burn Rate */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Flame size={15} />
            </div>
            <div>
              <div className="text-xs font-bold" style={{ color: "var(--navy)" }}>
                Burn Rate Harian
              </div>
              <div className="text-[10px]" style={{ color: "var(--muted)" }}>
                Rata-rata belanja harian
              </div>
            </div>
          </div>

          <div className="text-right">
            <span
              className="text-sm font-extrabold"
              style={{ fontFamily: "var(--font-fraunces), serif", color: "var(--navy)" }}
            >
              {formatRp(dailyBurnRate)}
            </span>
            <div className="text-[10px]" style={{ color: "var(--muted)" }}>
              per hari ({period.daysElapsed} hari berjalan)
            </div>
          </div>
        </div>
      </div>

      {/* 4. Negative Case Alert Banners (NS-01 & NS-02) */}
      {hasNoTransactions && (
        <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 flex items-start gap-2.5 text-xs">
          <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
          <div className="text-blue-900 leading-relaxed">
            <strong className="font-bold">Belum Ada Transaksi:</strong> Periode ini belum memiliki catatan pemasukan maupun belanja. Catat transaksi pertama Anda melalui tombol tambah (+) di bawah!
          </div>
        </div>
      )}

      {!hasNoTransactions && hasNoIncome && totalExpense > 0 && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs">
          <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="text-amber-900 leading-relaxed">
            <strong className="font-bold">Pengeluaran Tanpa Catatan Pemasukan:</strong> Belum ada alokasi target pos atau pemasukan yang diinput pada periode ini. Seluruh pengeluaran saat ini berstatus defisit atau bersumber dari saldo simpanan lampau.
          </div>
        </div>
      )}
    </section>
  );
}

