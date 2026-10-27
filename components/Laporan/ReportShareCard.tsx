"use client";

import React, { forwardRef } from "react";
import type { CompleteFinancialReport } from "@/lib/report-service";
import { formatRp } from "@/lib/report-service";

interface ReportShareCardProps {
  report: CompleteFinancialReport;
  familyName?: string;
}

export const ReportShareCard = forwardRef<HTMLDivElement, ReportShareCardProps>(
  function ReportShareCard({ report, familyName = "Keluarga Pratama" }, ref) {
    const { period, cashFlow, top3Expenses, memberShares } = report;

    return (
      <div
        ref={ref}
        style={{
          width: "420px",
          padding: "28px",
          borderRadius: "24px",
          background: "linear-gradient(145deg, #102d55 0%, #17375f 55%, #1b497f 100%)",
          color: "#ffffff",
          fontFamily: "var(--font-dm-sans), sans-serif",
          boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Subtle decorative circles */}
        <div
          style={{
            position: "absolute",
            top: "-50px",
            right: "-50px",
            width: "160px",
            height: "160px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(40,127,240,0.3) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        {/* 1. Header: Branding & Period */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
          <div>
            <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "#8ac8ff" }}>
              Catat Keluarga • Laporan
            </div>
            <div style={{ fontSize: "20px", fontWeight: 800, color: "#ffffff", marginTop: "2px" }}>
              {familyName}
            </div>
          </div>

          <div
            style={{
              padding: "4px 10px",
              borderRadius: "20px",
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.2)",
              fontSize: "11px",
              fontWeight: 600,
              color: "#eaf5fc",
            }}
          >
            {period.label}
          </div>
        </div>

        {/* 2. Hero: Arus Kas Bersih & Status */}
        <div
          style={{
            background: "rgba(255,255,255,0.08)",
            borderRadius: "18px",
            padding: "16px",
            marginBottom: "18px",
            border: "1px solid rgba(255,255,255,0.15)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "#b9dcff", letterSpacing: "1px" }}>
              Arus Kas Bersih (Net Cash Flow)
            </span>
            <span
              style={{
                fontSize: "10px",
                fontWeight: 800,
                padding: "2px 8px",
                borderRadius: "12px",
                background: cashFlow.isSurplus ? "rgba(22,168,154,0.3)" : "rgba(240,68,103,0.3)",
                color: cashFlow.isSurplus ? "#4ef0db" : "#ff90a6",
                border: `1px solid ${cashFlow.isSurplus ? "#16a89a" : "#f04467"}`,
              }}
            >
              {cashFlow.isSurplus ? "SURPLUS ✨" : "DEFISIT ⚠️"}
            </span>
          </div>

          <div
            style={{
              fontSize: "28px",
              fontWeight: 800,
              fontFamily: "var(--font-fraunces), serif",
              color: cashFlow.isSurplus ? "#4ef0db" : "#ff859d",
            }}
          >
            {cashFlow.isSurplus ? "+" : ""}
            {formatRp(cashFlow.netCashFlow)}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "12px", paddingTop: "10px", borderTop: "1px solid rgba(255,255,255,0.12)", fontSize: "11px" }}>
            <div>
              <span style={{ color: "#a1c4e9" }}>Pemasukan: </span>
              <strong>{formatRp(cashFlow.totalIncome)}</strong>
              {cashFlow.extraIncome > 0 && (
                <div style={{ fontSize: "9px", color: "#8ac8ff", marginTop: "2px" }}>
                  Pokok: {formatRp(cashFlow.budgetIncome)} + Tambahan: {formatRp(cashFlow.extraIncome)}
                </div>
              )}
            </div>
            <div>
              <span style={{ color: "#a1c4e9" }}>Pengeluaran: </span>
              <strong style={{ color: "#ff859d" }}>{formatRp(cashFlow.totalExpense)}</strong>
            </div>
          </div>
        </div>

        {/* 3. Key Metrics: Saving Rate & DSR */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "18px" }}>
          <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: "14px", padding: "12px", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div style={{ fontSize: "10px", color: "#a1c4e9", fontWeight: 700, textTransform: "uppercase" }}>Saving Rate</div>
            <div style={{ fontSize: "18px", fontWeight: 800, fontFamily: "var(--font-fraunces), serif", color: "#ffffff", marginTop: "2px" }}>
              {cashFlow.savingRate.toFixed(1)}%
            </div>
            <div style={{ fontSize: "10px", color: "#4ef0db", marginTop: "2px" }}>
              {cashFlow.savingRate >= 20 ? "Target Ideal Tercapai" : "Perlu ditingkatkan"}
            </div>
          </div>

          <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: "14px", padding: "12px", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div style={{ fontSize: "10px", color: "#a1c4e9", fontWeight: 700, textTransform: "uppercase" }}>Burn Rate Harian</div>
            <div style={{ fontSize: "18px", fontWeight: 800, fontFamily: "var(--font-fraunces), serif", color: "#ffffff", marginTop: "2px" }}>
              {formatRp(cashFlow.dailyBurnRate)}
            </div>
            <div style={{ fontSize: "10px", color: "#b9dcff", marginTop: "2px" }}>
              Rata-rata per hari
            </div>
          </div>
        </div>

        {/* 4. Top 3 Pengeluaran */}
        {top3Expenses.length > 0 && (
          <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: "14px", padding: "12px", marginBottom: "16px", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", color: "#b9dcff", marginBottom: "8px" }}>
              Top 3 Pos Pengeluaran Terbesar
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {top3Expenses.map((p, idx) => (
                <div key={p.posId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>{idx + 1}.</span>
                    <span>{p.posIcon}</span>
                    <span style={{ fontWeight: 600 }}>{p.posName}</span>
                  </div>
                  <div style={{ fontWeight: 700, color: "#ffffff" }}>
                    {formatRp(p.actualSpent)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. Kontribusi Belanja Pasutri */}
        {memberShares.length > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "10px", color: "#b9dcff", borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: "12px" }}>
            <div>
              👥 Belanja:{" "}
              {memberShares.map((m) => `${m.name} (${m.percentage.toFixed(0)}%)`).join(" • ")}
            </div>
            <div style={{ fontStyle: "italic", opacity: 0.8 }}>
              CatatKeluarga
            </div>
          </div>
        )}
      </div>
    );
  }
);

