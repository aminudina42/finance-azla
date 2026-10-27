"use client";

import React, { useState, useMemo } from "react";
import type { HistoricalCycleTrend } from "@/lib/report-service";
import { formatRp, formatCompactRp } from "@/lib/report-service";
import { BarChart3, TrendingUp } from "lucide-react";

interface MultiCycleTrendChartProps {
  trends: HistoricalCycleTrend[];
}

export default function MultiCycleTrendChart({ trends }: MultiCycleTrendChartProps) {
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);

  // Cari nilai maksimum untuk normalisasi tinggi grafik
  const maxVal = useMemo(() => {
    let max = 1_000_000;
    trends.forEach((t) => {
      if (t.totalIncome > max) max = t.totalIncome;
      if (t.totalExpense > max) max = t.totalExpense;
    });
    return max * 1.15; // Beri ruang atas 15%
  }, [trends]);

  const activeTrend = selectedCycleId
    ? trends.find((t) => t.cycleId === selectedCycleId)
    : trends[trends.length - 1] || null;

  // SVG Dimension Constants
  const svgWidth = 360;
  const svgHeight = 160;
  const chartBottom = 135;
  const chartTop = 20;
  const usableHeight = chartBottom - chartTop;

  const barGroupWidth = trends.length > 0 ? (svgWidth - 40) / trends.length : 60;
  const barWidth = Math.min(18, barGroupWidth * 0.35);

  return (
    <section className="flex flex-col gap-3.5" aria-label="Tren Keuangan Multi-Siklus">
      <div
        className="p-4 rounded-2xl flex flex-col gap-3"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow, 0 4px 12px rgba(16,45,85,0.04))",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <BarChart3 size={16} />
            </div>
            <div>
              <h3 className="text-xs font-bold" style={{ color: "var(--navy)" }}>
                Tren Keuangan Multi-Siklus
              </h3>
              <p className="text-[10px]" style={{ color: "var(--muted)" }}>
                Perbandingan {trends.length} siklus gajian terakhir
              </p>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-2.5 text-[10px] font-bold">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-[#287ff0]" />
              <span style={{ color: "var(--text)" }}>Masuk</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-[#f04467]" />
              <span style={{ color: "var(--text)" }}>Keluar</span>
            </span>
          </div>
        </div>

        {/* SVG Bar Chart */}
        <div className="w-full overflow-x-auto py-1">
          <svg
            width="100%"
            height={svgHeight}
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="select-none overflow-visible"
          >
            {/* Horizontal baseline */}
            <line
              x1="10"
              y1={chartBottom}
              x2={svgWidth - 10}
              y2={chartBottom}
              stroke="var(--border, #d8eaf8)"
              strokeWidth="1.5"
            />

            {/* Mid guideline */}
            <line
              x1="10"
              y1={(chartBottom + chartTop) / 2}
              x2={svgWidth - 10}
              y2={(chartBottom + chartTop) / 2}
              stroke="var(--border, #d8eaf8)"
              strokeWidth="1"
              strokeDasharray="4 4"
              opacity="0.6"
            />

            {/* Render Bars per Cycle */}
            {trends.map((item, idx) => {
              const groupCenterX = 25 + idx * barGroupWidth + barGroupWidth / 2;
              const isSelected = selectedCycleId === item.cycleId;

              const incomeHeight = maxVal > 0 ? (item.totalIncome / maxVal) * usableHeight : 0;
              const expenseHeight = maxVal > 0 ? (item.totalExpense / maxVal) * usableHeight : 0;

              const incomeY = chartBottom - incomeHeight;
              const expenseY = chartBottom - expenseHeight;

              return (
                <g
                  key={item.cycleId}
                  className="cursor-pointer"
                  onClick={() => setSelectedCycleId(isSelected ? null : item.cycleId)}
                >
                  {/* Selection Background Highlight */}
                  {isSelected && (
                    <rect
                      x={groupCenterX - barGroupWidth / 2 + 2}
                      y={chartTop - 5}
                      width={barGroupWidth - 4}
                      height={chartBottom - chartTop + 24}
                      rx="8"
                      fill="var(--s1, #f1f8fd)"
                      opacity="0.7"
                    />
                  )}

                  {/* Income Bar (Blue) */}
                  <rect
                    x={groupCenterX - barWidth - 2}
                    y={incomeY}
                    width={barWidth}
                    height={Math.max(2, incomeHeight)}
                    rx="4"
                    fill="#287ff0"
                    opacity={isSelected || !selectedCycleId ? 1 : 0.4}
                    className="transition-all duration-300"
                  />

                  {/* Expense Bar (Coral Red) */}
                  <rect
                    x={groupCenterX + 2}
                    y={expenseY}
                    width={barWidth}
                    height={Math.max(2, expenseHeight)}
                    rx="4"
                    fill="#f04467"
                    opacity={isSelected || !selectedCycleId ? 1 : 0.4}
                    className="transition-all duration-300"
                  />

                  {/* Cycle Short Label */}
                  <text
                    x={groupCenterX}
                    y={chartBottom + 16}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight={isSelected ? "bold" : "500"}
                    fill={isSelected ? "var(--primary, #287ff0)" : "var(--muted, #8196af)"}
                  >
                    {item.label.split("–")[0]?.trim() || item.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Selected Cycle Inspector Banner */}
        {activeTrend && (
          <div
            className="p-3 rounded-xl flex items-center justify-between text-xs"
            style={{
              background: "var(--surface-soft, #f8fbff)",
              border: "1px solid var(--border)",
            }}
          >
            <div>
              <div className="font-bold" style={{ color: "var(--navy)" }}>
                {activeTrend.label}
              </div>
              <div className="text-[10px]" style={{ color: "var(--muted)" }}>
                Pemasukan: {formatCompactRp(activeTrend.totalIncome)} • Belanja: {formatCompactRp(activeTrend.totalExpense)}
              </div>
            </div>

            <div className="text-right">
              <span
                className={`inline-flex items-center gap-1 font-bold ${
                  activeTrend.isSurplus ? "text-teal-600" : "text-rose-600"
                }`}
              >
                <TrendingUp size={12} />
                <span>{activeTrend.isSurplus ? "+" : ""}{formatRp(activeTrend.netSavings)}</span>
              </span>
              <div className="text-[10px] font-semibold text-slate-500">
                Saving Rate: {activeTrend.savingRate.toFixed(1)}%
              </div>
            </div>
          </div>
        )}

        {trends.length < 2 && (
          <div className="text-[11px] text-center text-slate-500 pt-1">
            💡 Grafik tren historis akan terisi otomatis seiring riwayat siklus gajian berikutnya.
          </div>
        )}
      </div>

      {/* 2. Rincian Tabel Riwayat Antar Siklus */}
      <div
        className="p-4 rounded-2xl flex flex-col gap-2.5"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow, 0 4px 12px rgba(16,45,85,0.04))",
        }}
      >
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
          Ringkasan Angka Antar Siklus
        </span>

        <div className="flex flex-col gap-2">
          {trends.slice().reverse().map((t) => (
            <div
              key={t.cycleId}
              className="p-2.5 rounded-xl border border-slate-100 flex items-center justify-between text-xs"
              style={{ background: "var(--surface-soft, #f8fbff)" }}
            >
              <div>
                <div className="font-bold" style={{ color: "var(--navy)" }}>
                  {t.label}
                </div>
                <div className="text-[10px] flex items-center gap-2 mt-0.5" style={{ color: "var(--muted)" }}>
                  <span>In: <strong className="text-blue-600">{formatCompactRp(t.totalIncome)}</strong></span>
                  <span>•</span>
                  <span>Out: <strong className="text-rose-600">{formatCompactRp(t.totalExpense)}</strong></span>
                </div>
              </div>

              <div className="text-right">
                <div
                  className="font-bold text-xs"
                  style={{
                    fontFamily: "var(--font-fraunces), serif",
                    color: t.isSurplus ? "var(--success, #16a89a)" : "var(--danger, #f04467)",
                  }}
                >
                  {t.isSurplus ? "+" : ""}{formatRp(t.netSavings)}
                </div>
                <div className="text-[10px] font-semibold text-slate-500">
                  {t.savingRate.toFixed(0)}% tabungan
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

