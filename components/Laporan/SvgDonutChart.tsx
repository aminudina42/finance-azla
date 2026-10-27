"use client";

import React, { useState, useMemo } from "react";
import type { PosVarianceItem } from "@/lib/report-service";
import { formatRp } from "@/lib/report-service";

interface SvgDonutChartProps {
  posList: PosVarianceItem[];
  totalExpense: number;
}

const PALETTE = [
  "#287ff0", // Blue
  "#16a89a", // Teal
  "#f4a33b", // Amber
  "#8b72ff", // Violet
  "#f04467", // Coral Red
  "#0284c7", // Sky Blue
  "#10b981", // Emerald
  "#ec4899", // Pink
  "#64748b", // Slate
];

export default function SvgDonutChart({ posList, totalExpense }: SvgDonutChartProps) {
  const [activePosId, setActivePosId] = useState<string | null>(null);

  // Filter only pos with actual spent > 0
  const activeSlices = useMemo(() => {
    return posList.filter((p) => p.actualSpent > 0);
  }, [posList]);

  // SVG Geometry
  const size = 200;
  const strokeWidth = 26;
  const radius = 70;
  const circumference = 2 * Math.PI * radius; // ~439.82

  // Calculate slice angles
  const slicesWithOffsets = useMemo(() => {
    if (totalExpense <= 0 || activeSlices.length === 0) return [];

    let accumulatedPercentage = 0;

    return activeSlices.map((item, idx) => {
      const percentage = (item.actualSpent / totalExpense) * 100;
      const strokeLength = (percentage / 100) * circumference;
      const strokeDashoffset = -((accumulatedPercentage / 100) * circumference);

      accumulatedPercentage += percentage;

      const color = PALETTE[idx % PALETTE.length];

      return {
        ...item,
        percentage,
        strokeLength,
        strokeDashoffset,
        color,
      };
    });
  }, [activeSlices, totalExpense, circumference]);

  const activeSliceItem = activePosId
    ? slicesWithOffsets.find((s) => s.posId === activePosId)
    : null;

  return (
    <div
      className="p-4 rounded-2xl flex flex-col gap-3.5"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow, 0 4px 12px rgba(16,45,85,0.04))",
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
          Proporsi Pengeluaran Pos
        </span>
        <span className="text-[11px] font-semibold" style={{ color: "var(--muted)" }}>
          {activeSlices.length} Pos Aktif Belanja
        </span>
      </div>

      {/* SVG Donut Visual */}
      <div className="flex justify-center items-center py-2 relative">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="transform -rotate-90 select-none"
        >
          {/* Background circle track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="var(--track, #e5edf5)"
            strokeWidth={strokeWidth}
          />

          {/* Slices */}
          {slicesWithOffsets.map((slice) => {
            const isHighlighted = activePosId === slice.posId;
            return (
              <circle
                key={slice.posId}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke={slice.color}
                strokeWidth={isHighlighted ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={`${slice.strokeLength} ${circumference}`}
                strokeDashoffset={slice.strokeDashoffset}
                className="transition-all duration-300 cursor-pointer"
                style={{
                  opacity: activePosId && !isHighlighted ? 0.4 : 1,
                }}
                onMouseEnter={() => setActivePosId(slice.posId)}
                onMouseLeave={() => setActivePosId(null)}
                onClick={() => setActivePosId(activePosId === slice.posId ? null : slice.posId)}
              />
            );
          })}
        </svg>

        {/* Center Text Display */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4"
          style={{ width: size, height: size, margin: "0 auto" }}
        >
          {activeSliceItem ? (
            <>
              <span className="text-xl leading-none">{activeSliceItem.posIcon}</span>
              <span
                className="text-xs font-bold mt-1 line-clamp-1 max-w-[110px]"
                style={{ color: "var(--navy)" }}
              >
                {activeSliceItem.posName}
              </span>
              <span
                className="text-sm font-extrabold"
                style={{ fontFamily: "var(--font-fraunces), serif", color: activeSliceItem.color }}
              >
                {activeSliceItem.percentage.toFixed(1)}%
              </span>
              <span className="text-[10px] font-semibold" style={{ color: "var(--muted)" }}>
                {formatRp(activeSliceItem.actualSpent)}
              </span>
            </>
          ) : (
            <>
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                Total Belanja
              </span>
              <span
                className="text-base font-extrabold mt-0.5 line-clamp-1 max-w-[120px]"
                style={{ fontFamily: "var(--font-fraunces), serif", color: "var(--navy)" }}
              >
                {formatRp(totalExpense)}
              </span>
              <span className="text-[10px] font-medium" style={{ color: "var(--text-secondary)" }}>
                {totalExpense > 0 ? "Ketuk donat/pos" : "0% terpakai"}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Interactive Legend List */}
      <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-100 max-h-48 overflow-y-auto">
        {slicesWithOffsets.length === 0 ? (
          <div className="text-center py-2 text-xs" style={{ color: "var(--muted)" }}>
            Belum ada pengeluaran pada pos anggaran periode ini.
          </div>
        ) : (
          slicesWithOffsets.map((slice) => {
            const isSelected = activePosId === slice.posId;
            return (
              <button
                key={slice.posId}
                type="button"
                onClick={() => setActivePosId(isSelected ? null : slice.posId)}
                className="flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer text-left"
                style={{
                  background: isSelected ? "var(--s1, #f1f8fd)" : "transparent",
                  border: isSelected ? `1px solid ${slice.color}` : "1px solid transparent",
                }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ background: slice.color }}
                  />
                  <span className="text-sm">{slice.posIcon}</span>
                  <span
                    className="text-xs font-semibold line-clamp-1"
                    style={{ color: "var(--navy)" }}
                  >
                    {slice.posName}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-bold" style={{ color: "var(--text)" }}>
                    {formatRp(slice.actualSpent)}
                  </span>
                  <span
                    className="text-[11px] font-bold px-1.5 py-0.2 rounded-md"
                    style={{
                      background: `${slice.color}15`,
                      color: slice.color,
                    }}
                  >
                    {slice.percentage.toFixed(0)}%
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

