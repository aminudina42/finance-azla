"use client";

import React from "react";
import { formatRp, getBudgetStatus } from "@/lib/wisata-utils";

interface BudgetProgressBarProps {
  actualCost: number;
  estimatedCost: number;
  budgetLimit: number;
  compact?: boolean;
}

export default function BudgetProgressBar({
  actualCost,
  estimatedCost,
  budgetLimit,
  compact = false,
}: BudgetProgressBarProps) {
  const status = getBudgetStatus(actualCost, budgetLimit);

  // Hitung persentase bar relatif terhadap budgetLimit (atau max antara budgetLimit dan actual/estimated jika overbudget)
  const baseScale = Math.max(budgetLimit, actualCost, estimatedCost, 1);
  const actualPercent = Math.min(100, Math.round((actualCost / baseScale) * 100));
  const estimatedPercent = Math.min(100, Math.round((estimatedCost / baseScale) * 100));

  if (compact) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", flexWrap: "wrap", fontSize: "12px" }}>
          <span style={{ color: "var(--text-muted, #64748b)" }}>Terpakai:</span>
          <span style={{ fontWeight: 700, fontFamily: "var(--font-fraunces, serif)", color: status.textColor, textAlign: "right" }}>
            {formatRp(actualCost)} {budgetLimit > 0 && `/ ${formatRp(budgetLimit)}`}
          </span>
        </div>
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "6px",
            backgroundColor: "rgba(100, 116, 139, 0.15)",
            borderRadius: "999px",
            overflow: "hidden",
          }}
        >
          {/* Layer Estimasi (Bayangan Tipis) */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              height: "100%",
              width: `${estimatedPercent}%`,
              backgroundColor: "rgba(40, 127, 240, 0.3)",
              borderRadius: "999px",
            }}
          />
          {/* Layer Realisasi Aktual */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              height: "100%",
              width: `${actualPercent}%`,
              backgroundColor: status.progressColor,
              borderRadius: "999px",
              transition: "width 0.4s ease",
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: "var(--surface, #ffffff)",
        borderRadius: "16px",
        border: "1px solid var(--border, rgba(0,0,0,0.08))",
        padding: "16px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap" }}>
        <div style={{ minWidth: 0, flex: "1 1 160px" }}>
          <span style={{ fontSize: "12px", color: "var(--text-muted, #64748b)", fontWeight: 500 }}>
            Realisasi Pengeluaran Wisata
          </span>
          <div
            style={{
              fontSize: "22px",
              fontFamily: "var(--font-fraunces, serif)",
              fontWeight: 800,
              color: status.textColor,
              marginTop: "2px",
              wordBreak: "break-word",
            }}
          >
            {formatRp(actualCost)}
          </div>
        </div>

        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 700,
              padding: "4px 10px",
              borderRadius: "999px",
              backgroundColor: status.badgeBg,
              color: status.textColor,
              display: "inline-block",
              whiteSpace: "nowrap",
            }}
          >
            {status.label} {budgetLimit > 0 && `(${status.percentage}%)`}
          </span>
          <div style={{ fontSize: "11px", color: "var(--text-muted, #64748b)", marginTop: "4px" }}>
            Pagu: <strong>{budgetLimit > 0 ? formatRp(budgetLimit) : "Tanpa Batas"}</strong>
          </div>
        </div>
      </div>

      {/* Progress Bar Dual Layer */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "10px",
          backgroundColor: "rgba(100, 116, 139, 0.12)",
          borderRadius: "999px",
          overflow: "hidden",
        }}
      >
        {/* Layer 1: Estimasi */}
        <div
          title={`Estimasi Rencana: ${formatRp(estimatedCost)}`}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            height: "100%",
            width: `${estimatedPercent}%`,
            backgroundColor: "rgba(40, 127, 240, 0.35)",
            borderRadius: "999px",
          }}
        />
        {/* Layer 2: Aktual */}
        <div
          title={`Realisasi Riil: ${formatRp(actualCost)}`}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            height: "100%",
            width: `${actualPercent}%`,
            backgroundColor: status.progressColor,
            borderRadius: "999px",
            transition: "width 0.4s ease",
          }}
        />
      </div>

      {/* Legend & Details (Mobile-First Responsive Wrap) */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "8px 12px",
          fontSize: "11px",
          color: "var(--text-muted, #64748b)",
          paddingTop: "8px",
          borderTop: "1px dashed var(--border, rgba(0,0,0,0.06))",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: status.progressColor, flexShrink: 0 }} />
          <span>Riil: <strong>{formatRp(actualCost)}</strong></span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "rgba(40, 127, 240, 0.5)", flexShrink: 0 }} />
          <span>Proyeksi: <strong>{formatRp(estimatedCost)}</strong></span>
        </div>
        {budgetLimit > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px", width: "100%", justifyContent: "flex-end", paddingTop: "2px" }}>
            <span>Sisa Pagu: <strong style={{ color: status.textColor }}>{formatRp(Math.max(0, budgetLimit - actualCost))}</strong></span>
          </div>
        )}
      </div>
    </div>
  );
}
