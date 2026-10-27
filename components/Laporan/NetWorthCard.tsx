"use client";

import React from "react";
import type { FamilyNetWorth } from "@/lib/report-service";
import { formatRp } from "@/lib/report-service";
import { Landmark, Wallet, PiggyBank, CreditCard, ShieldCheck, ShieldAlert } from "lucide-react";

interface NetWorthCardProps {
  netWorth: FamilyNetWorth;
  totalMonthlyDebt: number;
}

export default function NetWorthCard({ netWorth, totalMonthlyDebt }: NetWorthCardProps) {
  const {
    liquidAssets,
    posBalanceTotal,
    sakuBalanceTotal,
    totalLiabilities,
    netWorth: totalNetWorth,
    dsrPercentage,
    dsrStatus,
  } = netWorth;

  const isNetPositive = totalNetWorth >= 0;

  return (
    <section className="flex flex-col gap-3.5" aria-label="Neraca Kekayaan Bersih Keluarga">
      {/* 1. Hero Net Worth Banner */}
      <div
        className="p-5 rounded-2xl flex flex-col gap-3 relative overflow-hidden"
        style={{
          background: isNetPositive
            ? "linear-gradient(135deg, rgba(40, 127, 240, 0.08) 0%, rgba(22, 168, 154, 0.05) 100%), var(--surface)"
            : "linear-gradient(135deg, rgba(240, 68, 103, 0.08) 0%, rgba(244, 163, 59, 0.05) 100%), var(--surface)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow, 0 8px 20px rgba(16,45,85,0.06))",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Landmark size={16} />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                Kekayaan Bersih (Net Worth)
              </span>
              <p className="text-[10px]" style={{ color: "var(--muted)" }}>
                Aset Likuid dikurangi Sisa Pokok Hutang
              </p>
            </div>
          </div>

          <span
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${
              isNetPositive
                ? "bg-teal-50 text-teal-700 border-teal-200"
                : "bg-rose-50 text-rose-700 border-rose-200"
            }`}
          >
            {isNetPositive ? "Aset Positif" : "Defisit Modal"}
          </span>
        </div>

        <div className="flex items-baseline gap-2">
          <span
            className="text-3xl font-extrabold tracking-tight"
            style={{
              fontFamily: "var(--font-fraunces), serif",
              color: isNetPositive ? "var(--navy)" : "var(--danger, #f04467)",
            }}
          >
            {formatRp(totalNetWorth)}
          </span>
        </div>
      </div>

      {/* 2. Dua Kolom: Aset Likuid vs Kewajiban Hutang */}
      <div className="grid grid-cols-2 gap-3">
        {/* Kolom Aset */}
        <div
          className="rounded-2xl p-4 flex flex-col gap-2.5"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow, 0 4px 12px rgba(16,45,85,0.04))",
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">
              Aset Likuid
            </span>
            <Wallet size={15} className="text-teal-600" />
          </div>

          <span
            className="text-lg font-bold"
            style={{ fontFamily: "var(--font-fraunces), serif", color: "var(--navy)" }}
          >
            {formatRp(liquidAssets)}
          </span>

          <div className="flex flex-col gap-1 pt-2 border-t border-slate-100 text-[11px]">
            <div className="flex items-center justify-between" style={{ color: "var(--text)" }}>
              <span>Saldo Seluruh Pos:</span>
              <strong className="font-semibold">{formatRp(posBalanceTotal)}</strong>
            </div>
            <div className="flex items-center justify-between" style={{ color: "var(--text)" }}>
              <span>Celengan/Saku Anak:</span>
              <strong className="font-semibold">{formatRp(sakuBalanceTotal)}</strong>
            </div>
          </div>
        </div>

        {/* Kolom Kewajiban */}
        <div
          className="rounded-2xl p-4 flex flex-col gap-2.5"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow, 0 4px 12px rgba(16,45,85,0.04))",
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">
              Kewajiban Hutang
            </span>
            <CreditCard size={15} className="text-rose-600" />
          </div>

          <span
            className="text-lg font-bold"
            style={{ fontFamily: "var(--font-fraunces), serif", color: "var(--danger, #f04467)" }}
          >
            {formatRp(totalLiabilities)}
          </span>

          <div className="flex flex-col gap-1 pt-2 border-t border-slate-100 text-[11px]">
            <div className="flex items-center justify-between" style={{ color: "var(--text)" }}>
              <span>Cicilan Bulanan:</span>
              <strong className="font-semibold">{formatRp(totalMonthlyDebt)}</strong>
            </div>
            <div className="flex items-center justify-between" style={{ color: "var(--text)" }}>
              <span>Rasio DSR:</span>
              <strong
                className={`font-semibold ${
                  dsrStatus === "safe" ? "text-teal-600" : dsrStatus === "warning" ? "text-amber-600" : "text-rose-600"
                }`}
              >
                {dsrPercentage.toFixed(1)}%
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Edukasi & Pengingat Kesehatan Hutang */}
      <div
        className="p-3.5 rounded-2xl flex items-start gap-2.5 text-xs"
        style={{
          background: dsrStatus === "safe" ? "rgba(22, 168, 154, 0.08)" : "rgba(244, 163, 59, 0.08)",
          border: `1px solid ${dsrStatus === "safe" ? "rgba(22, 168, 154, 0.2)" : "rgba(244, 163, 59, 0.2)"}`,
        }}
      >
        {dsrStatus === "safe" ? (
          <ShieldCheck size={18} className="text-teal-600 shrink-0 mt-0.5" />
        ) : (
          <ShieldAlert size={18} className="text-amber-600 shrink-0 mt-0.5" />
        )}
        <div style={{ color: "var(--navy)" }} className="leading-relaxed">
          <strong className="font-bold">Standar Beban Cicilan Sehat:</strong> Menurut standar perencana keuangan keluarga, total cicilan hutang bulanan idealnya berada di bawah <strong className="text-teal-700">30%</strong> dari total penghasilan rutin agar arus kas rumah tangga tetap lentur terhadap kebutuhan darurat.
        </div>
      </div>
    </section>
  );
}

