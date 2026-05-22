"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNav() {
  const pathname = usePathname();

  if (pathname === "/login") return null;

  return (
    <nav className="bnav">
      <Link href="/" className={`bni ${pathname === "/" ? "active" : ""}`}>
        <span className="bni-icon">💰</span>
        <span className="bni-label">Dompet</span>
      </Link>
      <Link href="/saku" className={`bni ${pathname === "/saku" ? "active" : ""}`}>
        <span className="bni-icon">🧒</span>
        <span className="bni-label">Saku</span>
      </Link>
      <Link href="/struk" className={`bni ${pathname.startsWith("/struk") ? "active" : ""}`}>
        <span className="bni-icon">🧾</span>
        <span className="bni-label">Struk</span>
      </Link>

      {/* Center FAB / Placeholder */}
      <div className="bni-spacer"></div>
      <Link href="/input" className="bnav-fab">
        <div className="bnav-fab-inner">
          <span className="bnav-fab-icon">＋</span>
        </div>
      </Link>

      <Link href="/debts" className={`bni ${pathname === "/debts" ? "active" : ""}`}>
        <span className="bni-icon">💳</span>
        <span className="bni-label">Hutang</span>
      </Link>
      <Link href="/manager" className={`bni ${pathname === "/manager" ? "active" : ""}`}>
        <span className="bni-icon">⚙️</span>
        <span className="bni-label">Atur</span>
      </Link>
    </nav>
  );
}
