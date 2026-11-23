"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { triggerHaptic } from "@/lib/haptics";

const ALLOWED_PATHS = ["/", "/input", "/manager"];

export default function BottomNav() {
  const pathname = usePathname();

  // Bottom navbar hanya tampil di:
  // 1. Home ("/")
  // 2. Catat Pengeluaran ("/input")
  // 3. Setting ("/manager")
  // Sisanya di tiap modul tidak menampilkan bottom navbar
  const normalizedPathname = pathname ? (pathname.replace(/\/$/, "") || "/") : "";
  if (!ALLOWED_PATHS.includes(normalizedPathname)) return null;

  const handleHomeClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    triggerHaptic("light");
    if (pathname === "/") {
      e.preventDefault();
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  };

  const handleNavClick = () => {
    triggerHaptic("light");
  };

  return (
    <nav className="bnav">
      {/* Home — Beranda/Dompet */}
      <Link
        href="/"
        replace
        className={`bni ${pathname === "/" ? "active" : ""}`}
        onClick={handleHomeClick}
      >
        <svg className="bni-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/>
          <polyline points="9 21 9 12 15 12 15 21"/>
        </svg>
        <span className="bni-label">Home</span>
      </Link>

      {/* Center FAB: Input transaksi */}
      <div className="bnav-fab-wrap">
        <Link
          href="/input"
          replace
          className="bnav-fab-btn"
          aria-label="Tambah transaksi"
          onClick={handleNavClick}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </Link>
        <span
          className="bnav-fab-label"
          style={normalizedPathname === "/input" ? { color: "var(--primary)", fontWeight: 700 } : undefined}
        >
          Tambah
        </span>
      </div>

      {/* Settings / Manager */}
      <Link
        href="/manager"
        replace
        className={`bni ${pathname === "/manager" ? "active" : ""}`}
        onClick={handleNavClick}
      >
        <svg className="bni-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
        <span className="bni-label">Setting</span>
      </Link>
    </nav>
  );
}
