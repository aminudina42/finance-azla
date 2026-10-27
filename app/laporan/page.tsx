"use client";

import React, { useState, useMemo } from "react";
import { useApp } from "@/lib/store";
import PageHeader from "@/components/PageHeader";
import Skeleton from "@/components/Skeleton";
import PeriodSelector from "@/components/Laporan/PeriodSelector";
import CashFlowOverviewCard from "@/components/Laporan/CashFlowOverviewCard";
import SvgDonutChart from "@/components/Laporan/SvgDonutChart";
import PosVarianceTable from "@/components/Laporan/PosVarianceTable";
import MemberContributionCard from "@/components/Laporan/MemberContributionCard";
import MultiCycleTrendChart from "@/components/Laporan/MultiCycleTrendChart";
import NetWorthCard from "@/components/Laporan/NetWorthCard";
import ExportShareModal from "@/components/Laporan/ExportShareModal";
import {
  generateCompleteFinancialReport,
  generateHistoricalTrends,
} from "@/lib/report-service";
import {
  FileText,
  PieChart,
  Users,
  BarChart3,
  Landmark,
  Share2,
} from "lucide-react";

type ReportTab = "ringkasan" | "pos" | "anggota" | "tren" | "neraca";

export default function LaporanPage() {
  const {
    cycles,
    transactions,
    posList,
    cyclePosHistory,
    debts,
    children,
    currentKeluarga,
    isLoading,
  } = useApp();

  // Period Selector States
  const [periodType, setPeriodType] = useState<"cycle" | "month" | "custom">("cycle");
  const [selectedCycleId, setSelectedCycleId] = useState<string>(() => cycles[0]?.id || "");
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });

  // Active Tab
  const [activeTab, setActiveTab] = useState<ReportTab>("ringkasan");

  // Modal & Toast
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  // Sync selectedCycleId with active cycle if unset (utamakan siklus yang mencakup hari ini)
  const effectiveCycleId = useMemo(() => {
    if (selectedCycleId) return selectedCycleId;
    const todayIso = new Date().toISOString().split("T")[0];
    const matchingCycle =
      cycles.find((c) => c.start_date <= todayIso && c.end_date >= todayIso) ||
      cycles.find((c) => c.is_active) ||
      cycles[0];
    return matchingCycle?.id || "";
  }, [selectedCycleId, cycles]);

  // 1. Hitung Laporan Periode Terpilih
  const report = useMemo(() => {
    return generateCompleteFinancialReport({
      periodType,
      selectedCycleId: effectiveCycleId,
      selectedMonth,
      customStartDate,
      customEndDate,
      cycles,
      transactions,
      posList,
      cyclePosHistory,
      debts,
      children,
    });
  }, [
    periodType,
    effectiveCycleId,
    selectedMonth,
    customStartDate,
    customEndDate,
    cycles,
    transactions,
    posList,
    cyclePosHistory,
    debts,
    children,
  ]);

  // 2. Hitung Tren Historis Multi-Siklus
  const trends = useMemo(() => {
    return generateHistoricalTrends({
      cycles,
      transactions,
      posList,
      cyclePosHistory,
      maxCycles: 6,
    });
  }, [cycles, transactions, posList, cyclePosHistory]);

  const familyName = currentKeluarga?.nama_keluarga || "Keluarga";

  if (isLoading) {
    return (
      <main id="pg-laporan" className="page active" style={{ paddingBottom: "115px", position: "relative" }}>
        <PageHeader
          title={
            <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
              <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
                <FileText size={18} />
              </div>
              <span>Laporan Keuangan</span>
            </span>
          }
          subtitle="Memuat data keuangan keluarga..."
          backHref="/"
        />
        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <Skeleton width="100%" height="80px" borderRadius="18px" />
          <Skeleton width="100%" height="160px" borderRadius="20px" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <Skeleton width="100%" height="80px" borderRadius="16px" />
            <Skeleton width="100%" height="80px" borderRadius="16px" />
          </div>
          <Skeleton width="100%" height="120px" borderRadius="18px" />
        </div>
      </main>
    );
  }

  return (
    <main id="pg-laporan" className="page active" style={{ paddingBottom: "120px", position: "relative" }}>
      {/* 1. Header Sticky */}
      <PageHeader
        title={
          <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
            <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
              <FileText size={18} />
            </div>
            <span>Laporan Keuangan</span>
          </span>
        }
        subtitle="Evaluasi arus kas &amp; amplop anggaran"
        backHref="/"
        action={
          <button
            type="button"
            onClick={() => setIsExportOpen(true)}
            className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold transition-all cursor-pointer border border-teal-200"
            title="Ekspor &amp; Bagikan Laporan"
            aria-label="Ekspor dan bagikan laporan"
          >
            <Share2 size={14} />
            <span>Bagikan</span>
          </button>
        }
      />

      <div style={{ padding: "16px 20px" }} className="flex flex-col gap-4">
        {/* 2. Pemilih Periode Fleksibel */}
        <PeriodSelector
          periodType={periodType}
          onPeriodTypeChange={setPeriodType}
          selectedCycleId={effectiveCycleId}
          onSelectCycleId={setSelectedCycleId}
          selectedMonth={selectedMonth}
          onSelectMonth={setSelectedMonth}
          customStartDate={customStartDate}
          onCustomStartDateChange={setCustomStartDate}
          customEndDate={customEndDate}
          onCustomEndDateChange={setCustomEndDate}
          cycles={cycles}
          currentPeriod={report.period}
        />

        {/* 3. Tab Navigasi Modul Laporan */}
        <div
          className="flex items-center gap-1 p-1 rounded-2xl overflow-x-auto select-none"
          style={{ background: "var(--s1, #f1f8fd)" }}
          role="tablist"
          aria-label="Navigasi Laporan Keuangan"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "ringkasan"}
            onClick={() => setActiveTab("ringkasan")}
            className="flex-1 min-w-[70px] flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0"
            style={{
              background: activeTab === "ringkasan" ? "var(--surface)" : "transparent",
              color: activeTab === "ringkasan" ? "var(--primary, #287ff0)" : "var(--muted)",
              boxShadow: activeTab === "ringkasan" ? "0 1px 4px rgba(16, 45, 85, 0.08)" : "none",
            }}
          >
            <FileText size={14} />
            <span>Ringkasan</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "pos"}
            onClick={() => setActiveTab("pos")}
            className="flex-1 min-w-[70px] flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0"
            style={{
              background: activeTab === "pos" ? "var(--surface)" : "transparent",
              color: activeTab === "pos" ? "var(--primary, #287ff0)" : "var(--muted)",
              boxShadow: activeTab === "pos" ? "0 1px 4px rgba(16, 45, 85, 0.08)" : "none",
            }}
          >
            <PieChart size={14} />
            <span>Pos Anggaran</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "anggota"}
            onClick={() => setActiveTab("anggota")}
            className="flex-1 min-w-[70px] flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0"
            style={{
              background: activeTab === "anggota" ? "var(--surface)" : "transparent",
              color: activeTab === "anggota" ? "var(--primary, #287ff0)" : "var(--muted)",
              boxShadow: activeTab === "anggota" ? "0 1px 4px rgba(16, 45, 85, 0.08)" : "none",
            }}
          >
            <Users size={14} />
            <span>Pasutri</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "tren"}
            onClick={() => setActiveTab("tren")}
            className="flex-1 min-w-[70px] flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0"
            style={{
              background: activeTab === "tren" ? "var(--surface)" : "transparent",
              color: activeTab === "tren" ? "var(--primary, #287ff0)" : "var(--muted)",
              boxShadow: activeTab === "tren" ? "0 1px 4px rgba(16, 45, 85, 0.08)" : "none",
            }}
          >
            <BarChart3 size={14} />
            <span>Tren</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "neraca"}
            onClick={() => setActiveTab("neraca")}
            className="flex-1 min-w-[70px] flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0"
            style={{
              background: activeTab === "neraca" ? "var(--surface)" : "transparent",
              color: activeTab === "neraca" ? "var(--primary, #287ff0)" : "var(--muted)",
              boxShadow: activeTab === "neraca" ? "0 1px 4px rgba(16, 45, 85, 0.08)" : "none",
            }}
          >
            <Landmark size={14} />
            <span>Neraca</span>
          </button>
        </div>

        {/* 4. Tab Content Router */}
        {activeTab === "ringkasan" && (
          <div className="flex flex-col gap-4">
            <CashFlowOverviewCard cashFlow={report.cashFlow} period={report.period} />
            <SvgDonutChart posList={report.posList} totalExpense={report.cashFlow.totalExpense} />
            <PosVarianceTable posList={report.posList} top3Expenses={report.top3Expenses} />
          </div>
        )}

        {activeTab === "pos" && (
          <div className="flex flex-col gap-4">
            <SvgDonutChart posList={report.posList} totalExpense={report.cashFlow.totalExpense} />
            <PosVarianceTable posList={report.posList} top3Expenses={report.top3Expenses} />
          </div>
        )}

        {activeTab === "anggota" && (
          <MemberContributionCard
            memberShares={report.memberShares}
            totalExpense={report.cashFlow.totalExpense}
          />
        )}

        {activeTab === "tren" && (
          <MultiCycleTrendChart trends={trends} />
        )}

        {activeTab === "neraca" && (
          <NetWorthCard
            netWorth={report.netWorth}
            totalMonthlyDebt={report.cashFlow.totalMonthlyDebt}
          />
        )}
      </div>

      {/* 5. Modal Ekspor & Berbagi */}
      <ExportShareModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        report={report}
        familyName={familyName}
        onShowToast={showToast}
      />

      {/* 6. Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            bottom: "85px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#102d55",
            color: "#ffffff",
            padding: "10px 18px",
            borderRadius: "24px",
            fontSize: "12px",
            fontWeight: 700,
            boxShadow: "0 10px 24px rgba(0,0,0,0.25)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: "8px",
            maxWidth: "90%",
            textAlign: "center",
          }}
        >
          <span>{toastMessage}</span>
        </div>
      )}
    </main>
  );
}

