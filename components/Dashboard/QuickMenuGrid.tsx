"use client";

import React from "react";
import Link from "next/link";

interface QuickMenuGridProps {
  onOpenAllFeatures?: () => void;
}

export default function QuickMenuGrid({ onOpenAllFeatures }: QuickMenuGridProps) {
  return (
    <section className="quick-section" aria-label="Menu Cepat">
      <div className="section-head">
        <h2>Menu Cepat</h2>
        <button
          type="button"
          onClick={onOpenAllFeatures}
          className="more"
          aria-label="Akses semua fitur aplikasi"
        >
          <span>Akses fitur lainnya</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </div>

      <div className="quick-grid">
        {/* Tile 1: Saku */}
        <Link href="/saku" className="quick-card" aria-label="Menu Saku: Kantong dan tabungan">
          <span className="quick-icon blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3v3M8 5l2 2M16 5l-2 2" />
              <path d="M5 10c0-3 3-5 7-5s7 2 7 5v6c0 3-3 5-7 5s-7-2-7-5Z" />
              <path d="M2 12h3m14 0h3M9 13h.01M15 13h.01M10 17h4" />
            </svg>
          </span>
          <span className="quick-name">Saku</span>
          <span className="quick-desc">Kantong &amp; tabungan</span>
        </Link>

        {/* Tile 2: Kasir */}
        <Link href="/struk" className="quick-card" aria-label="Menu Kasir: Transaksi kasir & cetak struk">
          <span className="quick-icon skyblue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M6 8h12M6 12h5M6 16h3m6-4h3m-3 4h3" />
            </svg>
          </span>
          <span className="quick-name">Kasir</span>
          <span className="quick-desc">Kasir &amp; struk</span>
        </Link>

        {/* Tile 3: Hutang */}
        <Link href="/debts" className="quick-card" aria-label="Menu Hutang: Utang & piutang">
          <span className="quick-icon orange-bg">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="M3 10h18M7 15h4m4 0h2" />
            </svg>
          </span>
          <span className="quick-name">Hutang</span>
          <span className="quick-desc">Utang &amp; piutang</span>
        </Link>

        {/* Tile 4: Dompet */}
        <Link href="/dompet" className="quick-card" aria-label="Menu Dompet: Kelola pos & amplop">
          <span className="quick-icon teal-bg">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m4 7.5 12-4.5 2 3-13 4" />
              <path d="M4 8h16v12H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z" />
              <path d="M15 12h5v4h-5a2 2 0 0 1 0-4Z" />
              <circle cx="16.5" cy="14" r=".5" fill="currentColor" />
            </svg>
          </span>
          <span className="quick-name">Dompet</span>
          <span className="quick-desc">Kelola pos &amp; amplop</span>
        </Link>
      </div>
    </section>
  );
}
