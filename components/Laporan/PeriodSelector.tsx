"use client";

import React from "react";
import type { Cycle } from "@/lib/types";
import type { ReportPeriod } from "@/lib/report-service";
import { ChevronLeft, ChevronRight, Calendar, AlertCircle } from "lucide-react";

interface PeriodSelectorProps {
  periodType: "cycle" | "month" | "custom";
  onPeriodTypeChange: (type: "cycle" | "month" | "custom") => void;
  selectedCycleId: string;
  onSelectCycleId: (id: string) => void;
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
  customStartDate: string;
  onCustomStartDateChange: (date: string) => void;
  customEndDate: string;
  onCustomEndDateChange: (date: string) => void;
  cycles: Cycle[];
  currentPeriod: ReportPeriod;
}

export default function PeriodSelector({
  periodType,
  onPeriodTypeChange,
  selectedCycleId,
  onSelectCycleId,
  selectedMonth,
  onSelectMonth,
  customStartDate,
  onCustomStartDateChange,
  customEndDate,
  onCustomEndDateChange,
  cycles,
  currentPeriod,
}: PeriodSelectorProps) {
  const currentCycleIdx = cycles.findIndex((c) => c.id === selectedCycleId);
  const canGoNext = currentCycleIdx > 0; // cycles[0] is newest
  const canGoPrev = currentCycleIdx !== -1 && currentCycleIdx < cycles.length - 1;

  const handlePrevCycle = () => {
    if (canGoPrev) {
      onSelectCycleId(cycles[currentCycleIdx + 1].id);
    }
  };

  const handleNextCycle = () => {
    if (canGoNext) {
      onSelectCycleId(cycles[currentCycleIdx - 1].id);
    }
  };

  return (
    <div
      className="p-3.5 rounded-2xl flex flex-col gap-3"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow, 0 4px 12px rgba(16,45,85,0.04))",
      }}
    >
      {/* 1. Mode Pill Selector */}
      <div
        className="flex items-center p-1 rounded-xl gap-1 text-xs font-bold"
        style={{ background: "var(--s1, #f1f8fd)" }}
      >
        <button
          type="button"
          onClick={() => onPeriodTypeChange("cycle")}
          className="flex-1 py-1.5 px-2 rounded-lg text-center transition-all cursor-pointer flex items-center justify-center gap-1.5"
          style={{
            background: periodType === "cycle" ? "var(--surface)" : "transparent",
            color: periodType === "cycle" ? "var(--primary, #287ff0)" : "var(--muted)",
            boxShadow: periodType === "cycle" ? "0 1px 3px rgba(16,45,85,0.08)" : "none",
          }}
        >
          <span>Siklus Gajian</span>
        </button>

        <button
          type="button"
          onClick={() => onPeriodTypeChange("month")}
          className="flex-1 py-1.5 px-2 rounded-lg text-center transition-all cursor-pointer flex items-center justify-center gap-1.5"
          style={{
            background: periodType === "month" ? "var(--surface)" : "transparent",
            color: periodType === "month" ? "var(--primary, #287ff0)" : "var(--muted)",
            boxShadow: periodType === "month" ? "0 1px 3px rgba(16,45,85,0.08)" : "none",
          }}
        >
          <span>Bulan Kalender</span>
        </button>

        <button
          type="button"
          onClick={() => onPeriodTypeChange("custom")}
          className="flex-1 py-1.5 px-2 rounded-lg text-center transition-all cursor-pointer flex items-center justify-center gap-1.5"
          style={{
            background: periodType === "custom" ? "var(--surface)" : "transparent",
            color: periodType === "custom" ? "var(--primary, #287ff0)" : "var(--muted)",
            boxShadow: periodType === "custom" ? "0 1px 3px rgba(16,45,85,0.08)" : "none",
          }}
        >
          <span>Rentang Kustom</span>
        </button>
      </div>

      {/* 2. Sub-Controls Berdasarkan Mode */}
      {periodType === "cycle" && (
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handlePrevCycle}
            disabled={!canGoPrev}
            className="w-9 h-9 rounded-xl flex items-center justify-center border transition-all cursor-pointer shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              borderColor: "var(--border)",
              color: "var(--navy)",
              background: "var(--surface-soft, #f8fbff)",
            }}
            title="Siklus Sebelumnya"
            aria-label="Siklus Sebelumnya"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="flex-1 relative">
            <select
              value={selectedCycleId}
              onChange={(e) => onSelectCycleId(e.target.value)}
              className="w-full text-center py-2 px-3 rounded-xl text-xs font-bold appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400"
              style={{
                background: "var(--surface-soft, #f8fbff)",
                border: "1px solid var(--border)",
                color: "var(--navy)",
              }}
            >
              {cycles.map((c) => {
                const todayIso = new Date().toISOString().split("T")[0];
                const isCurrent = (c.start_date <= todayIso && c.end_date >= todayIso) || c.is_active;
                return (
                  <option key={c.id} value={c.id}>
                    {isCurrent ? "✨ Siklus Aktif: " : "Siklus: "}
                    {c.label || `${c.start_date} – ${c.end_date}`}
                  </option>
                );
              })}
            </select>
          </div>

          <button
            type="button"
            onClick={handleNextCycle}
            disabled={!canGoNext}
            className="w-9 h-9 rounded-xl flex items-center justify-center border transition-all cursor-pointer shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              borderColor: "var(--border)",
              color: "var(--navy)",
              background: "var(--surface-soft, #f8fbff)",
            }}
            title="Siklus Berikutnya"
            aria-label="Siklus Berikutnya"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {periodType === "month" && (
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => onSelectMonth(e.target.value)}
              className="w-full text-center py-2 px-3 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
              style={{
                background: "var(--surface-soft, #f8fbff)",
                border: "1px solid var(--border)",
                color: "var(--navy)",
              }}
            />
          </div>
        </div>
      )}

      {periodType === "custom" && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold" style={{ color: "var(--muted)" }}>
              Mulai:
            </label>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => onCustomStartDateChange(e.target.value)}
              className="w-full py-1.5 px-2 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
              style={{
                background: "var(--surface-soft, #f8fbff)",
                border: "1px solid var(--border)",
                color: "var(--navy)",
              }}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold" style={{ color: "var(--muted)" }}>
              Sampai:
            </label>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => onCustomEndDateChange(e.target.value)}
              className="w-full py-1.5 px-2 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
              style={{
                background: "var(--surface-soft, #f8fbff)",
                border: "1px solid var(--border)",
                color: "var(--navy)",
              }}
            />
          </div>
        </div>
      )}

      {/* 3. Info Badge: Durasi Hari & Anomali Peringatan */}
      <div className="flex items-center justify-between gap-2 text-[11px] pt-1 border-t" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
          <Calendar size={13} style={{ color: "var(--primary)" }} />
          <span>
            Rentang: <strong>{currentPeriod.durationDays} hari</strong>
            {currentPeriod.isCurrentCycle && ` (Hari ke-${currentPeriod.daysElapsed})`}
          </span>
        </div>

        {currentPeriod.isAbnormalDuration && (
          <span className="flex items-center gap-1 font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
            <AlertCircle size={12} />
            <span>Siklus Transisi</span>
          </span>
        )}
      </div>
    </div>
  );
}

