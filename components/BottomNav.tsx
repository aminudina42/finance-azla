"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { name: "Dompet", icon: "💳", href: "/" },
    { name: "Input", icon: "✏️", href: "/input" },
    { name: "Saku", icon: "🧒", href: "/saku" },
    { name: "Atur", icon: "⚙️", href: "/manager" },
    { name: "Riwayat", icon: "📜", href: "/history" },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] flex z-[300] bg-[rgba(13,13,18,0.92)] backdrop-blur-[20px] border-t border-[var(--border)] pb-[env(safe-area-inset-bottom)]">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.name}
            href={item.href}
            className={`flex-1 flex flex-col items-center pt-[10px] pb-[12px] gap-[3px] cursor-pointer group`}
          >
            <span
              className={`text-[21px] leading-none transition-transform duration-200 ${
                isActive ? "-translate-y-[1px]" : "group-hover:-translate-y-[1px]"
              }`}
            >
              {item.icon}
            </span>
            <span
              className={`text-[9.5px] font-semibold tracking-[0.4px] uppercase ${
                isActive ? "text-[var(--purple)]" : "text-[var(--muted)]"
              }`}
            >
              {item.name}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
