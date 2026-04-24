"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNav() {
  const pathname = usePathname();

  if (pathname === "/login") return null;

  return (
    <nav className="bnav">
      <Link href="/" className={`bni ${pathname === "/" ? "active" : ""}`}>
        <span className="bni-icon">💳</span>
        <span className="bni-label">Dompet</span>
      </Link>
      <Link href="/saku" className={`bni ${pathname === "/saku" ? "active" : ""}`}>
        <span className="bni-icon">🧒</span>
        <span className="bni-label">Saku</span>
      </Link>

      {/* Center FAB / Placeholder */}
      <div className="bni-spacer"></div>
      <Link href="/input" className="bnav-fab">
        <div className="bnav-fab-inner">
          <span className="bnav-fab-icon">＋</span>
        </div>
      </Link>

      <Link href="/manager" className={`bni ${pathname === "/manager" ? "active" : ""}`}>
        <span className="bni-icon">⚙️</span>
        <span className="bni-label">Atur</span>
      </Link>
      <Link href="/history" className={`bni ${pathname === "/history" ? "active" : ""}`}>
        <span className="bni-icon">📜</span>
        <span className="bni-label">Riwayat</span>
      </Link>
    </nav>
  );
}
