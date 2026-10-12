"use client";

import React from "react";
import Link from "next/link";

export default function QuickMenuGrid() {
  return (
    <section className="quick-section" aria-label="Menu Cepat">
      <div className="section-head">
        <h2>Menu Cepat</h2>
        <Link href="/manager" className="more" aria-label="Akses pengaturan dan fitur lainnya">
          <span>Akses fitur lainnya</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </Link>
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

        {/* Tile 2: Struk */}
        <Link href="/struk" className="quick-card" aria-label="Menu Struk: Catat struk">
          <span className="quick-icon skyblue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 3h12v18l-3-2-3 2-3-2-3 2Z" />
              <path d="M9 8h6M9 12h6M9 16h4" />
            </svg>
          </span>
          <span className="quick-name">Struk</span>
          <span className="quick-desc">Catat struk</span>
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
        <Link href="/manager" className="quick-card" aria-label="Menu Dompet: Atur pos & siklus">
          <span className="quick-icon teal-bg">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m4 7.5 12-4.5 2 3-13 4" />
              <path d="M4 8h16v12H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z" />
              <path d="M15 12h5v4h-5a2 2 0 0 1 0-4Z" />
              <circle cx="16.5" cy="14" r=".5" fill="currentColor" />
            </svg>
          </span>
          <span className="quick-name">Dompet</span>
          <span className="quick-desc">Atur pos &amp; siklus</span>
        </Link>
      </div>
    </section>
  );
}
