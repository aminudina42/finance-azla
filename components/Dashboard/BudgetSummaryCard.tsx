"use client";

import React from "react";
import { Eye, EyeOff } from "lucide-react";

interface BudgetSummaryCardProps {
  sisaBudget: number;
  totalBudget: number;
  dayInCycleStr: string;
  onOpenGajianModal: () => void;
  isHideNominal?: boolean;
  onToggleHideNominal?: () => void;
}

function formatRp(n: number): string {
  const prefix = n < 0 ? "-" : "";
  return prefix + "Rp " + Math.abs(n).toLocaleString("id-ID");
}

export default function BudgetSummaryCard({
  sisaBudget,
  totalBudget,
  dayInCycleStr,
  onOpenGajianModal,
  isHideNominal = true,
  onToggleHideNominal,
}: BudgetSummaryCardProps) {
  const isDeficit = sisaBudget < 0;

  return (
    <section className="summary" aria-label="Ringkasan budget siklus aktif">
      {/* Top area: Eyebrow, eye toggle button with tooltip, and full-width amount */}
      <div className="summary-top">
        <div className="summary-top-row">
          <div className="eyebrow">Sisa Budget Siklus Ini</div>
          {onToggleHideNominal && (
            <button
              type="button"
              onClick={onToggleHideNominal}
              className="eye-toggle-btn"
              aria-label={isHideNominal ? "Tampilkan saldo" : "Sembunyikan saldo"}
              aria-pressed={isHideNominal}
            >
              {isHideNominal ? (
                <EyeOff size={15} strokeWidth={2.2} aria-hidden="true" />
              ) : (
                <Eye size={15} strokeWidth={2.2} aria-hidden="true" />
              )}
            </button>
          )}
        </div>
        <div className={`amount ${isDeficit ? "amount-red" : "amount-navy"}`}>
          {isHideNominal ? "Rp ••••••" : formatRp(sisaBudget)}
        </div>
      </div>

      {/* Bottom area: Metadata on left, Atur Tgl Gajian on right */}
      <div className="summary-bottom">
        <div className="summary-meta">
          <div className="meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <ellipse cx="12" cy="5" rx="8" ry="3" />
              <path d="M4 5v5c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 10v5c0 1.7 3.6 3 8 3s8-1.3 8-3v-5M4 15v4c0 1.7 3.6 3 8 3s8-1.3 8-3v-4" />
            </svg>
            <span>Total {isHideNominal ? "Rp ••••••" : formatRp(totalBudget)}</span>
          </div>

          <span className="meta-sep" aria-hidden="true" />

          <div className="meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M16 3v4M8 3v4M3 10h18M8 14h3M8 17h6" />
            </svg>
            <span>{dayInCycleStr}</span>
          </div>
        </div>

        <button
          type="button"
          className="payday-button"
          onClick={onOpenGajianModal}
          aria-label="Atur tanggal gajian"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M16 3v4M8 3v4M3 10h18M8 14h3M8 17h6" />
          </svg>
          <span>Atur Tgl Gajian</span>
          <span aria-hidden="true" style={{ marginLeft: "2px" }}>›</span>
        </button>
      </div>

      {/* Watermark ilustrasi wallet SVG — placed delicately in the background */}
      <svg className="wallet-art" viewBox="0 0 220 190" fill="none" aria-hidden="true">
        <path d="m45 75 85-30 48 19-87 32Z" fill="#4a9cf2" />
        <path d="M26 88 145 50l43 18-117 41Z" fill="#8ac8ff" />
        <path d="M35 91h134a12 12 0 0 1 12 12v58H35a12 12 0 0 1-12-12v-46a12 12 0 0 1 12-12Z" fill="#3290ed" />
        <path d="M139 113h42v27h-42a13.5 13.5 0 0 1 0-27Z" fill="#a4d8ff" />
        <circle cx="148" cy="126" r="4" fill="#fff" />
        <path d="M167 45c5-19 20-25 31-15-2 15-12 22-31 15Z" fill="#58b1f4" />
        <path d="M173 52c-1-13 4-23 17-31" stroke="#3290ed" strokeWidth="3" strokeLinecap="round" />
        <path d="M188 61c9-14 22-15 29-5-6 12-15 16-29 5Z" fill="#8bcaff" />
      </svg>
    </section>
  );
}
