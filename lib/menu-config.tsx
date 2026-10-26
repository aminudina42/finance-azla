"use client";

import React, { useState } from "react";

export interface MenuItem {
  id: string;
  name: string;
  desc: string;
  path: string;
  iconBg: string;
  quickClass: string;
  iconSrc: string;
  iconModal: React.ReactNode;
  iconQuick: React.ReactNode;
}

export function MenuIcon({
  src,
  alt,
  size = 36,
  fallbackSvg,
}: {
  src: string;
  alt: string;
  size?: number;
  fallbackSvg?: React.ReactNode;
}) {
  const [hasError, setHasError] = useState(false);

  if (hasError && fallbackSvg) {
    return <>{fallbackSvg}</>;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className="menu-icon-img"
      loading="eager"
      draggable={false}
      onError={() => setHasError(true)}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        objectFit: "contain",
        display: "block",
        userSelect: "none",
        pointerEvents: "none",
      }}
    />
  );
}

export const AVAILABLE_MENUS: MenuItem[] = [
  {
    id: "saku",
    name: "Saku",
    desc: "Kantong & tabungan",
    path: "/saku",
    iconBg: "#e8f3ff",
    quickClass: "blue",
    iconSrc: "/logo/icon-menu-saku.png",
    iconModal: (
      <MenuIcon
        src="/logo/icon-menu-saku.png"
        alt="Menu Saku"
        size={44}
        fallbackSvg={
          <svg viewBox="0 0 32 32" fill="none" style={{ width: "28px", height: "28px" }}>
            <rect x="5" y="8" width="22" height="18" rx="5" fill="#3b82f6" opacity="0.2" />
            <path
              d="M5 12C5 9.79086 6.79086 8 9 8H23C25.2091 8 27 9.79086 27 12V22C27 24.2091 25.2091 26 23 26H9C6.79086 26 5 24.2091 5 22V12Z"
              stroke="#2563eb"
              strokeWidth="2.2"
            />
            <path
              d="M19 14H27V20H19C17.3431 20 16 18.6569 16 17C16 15.3431 17.3431 14 19 14Z"
              fill="#60a5fa"
              stroke="#2563eb"
              strokeWidth="2"
            />
            <circle cx="21.5" cy="17" r="1.5" fill="#ffffff" />
          </svg>
        }
      />
    ),
    iconQuick: (
      <MenuIcon
        src="/logo/icon-menu-saku.png"
        alt="Menu Saku"
        size={42}
        fallbackSvg={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3v3M8 5l2 2M16 5l-2 2" />
            <path d="M5 10c0-3 3-5 7-5s7 2 7 5v6c0 3-3 5-7 5s-7-2-7-5Z" />
            <path d="M2 12h3m14 0h3M9 13h.01M15 13h.01M10 17h4" />
          </svg>
        }
      />
    ),
  },
  {
    id: "struk",
    name: "Kasir",
    desc: "Kasir & struk",
    path: "/struk",
    iconBg: "#e5f7ff",
    quickClass: "skyblue",
    iconSrc: "/logo/icon-menu-kasir.png",
    iconModal: (
      <MenuIcon
        src="/logo/icon-menu-kasir.png"
        alt="Menu Kasir"
        size={44}
        fallbackSvg={
          <svg viewBox="0 0 32 32" fill="none" style={{ width: "28px", height: "28px" }}>
            <path
              d="M7 6C7 4.89543 7.89543 4 9 4H23C24.1046 4 25 4.89543 25 6V28L22 26L19 28L16 26L13 28L10 26L7 28V6Z"
              fill="#0284c7"
              opacity="0.15"
            />
            <path
              d="M7 6C7 4.89543 7.89543 4 9 4H23C24.1046 4 25 4.89543 25 6V28L22 26L19 28L16 26L13 28L10 26L7 28V6Z"
              stroke="#0284c7"
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
            <line x1="11" y1="10" x2="21" y2="10" stroke="#0284c7" strokeWidth="2" strokeLinecap="round" />
            <line x1="11" y1="15" x2="21" y2="15" stroke="#0284c7" strokeWidth="2" strokeLinecap="round" />
            <line x1="11" y1="20" x2="17" y2="20" stroke="#0284c7" strokeWidth="2" strokeLinecap="round" />
          </svg>
        }
      />
    ),
    iconQuick: (
      <MenuIcon
        src="/logo/icon-menu-kasir.png"
        alt="Menu Kasir"
        size={42}
        fallbackSvg={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="M6 8h12M6 12h5M6 16h3m6-4h3m-3 4h3" />
          </svg>
        }
      />
    ),
  },
  {
    id: "hutang",
    name: "Hutang",
    desc: "Utang & piutang",
    path: "/debts",
    iconBg: "#fff3e5",
    quickClass: "orange-bg",
    iconSrc: "/logo/icon-menu-hutang.png",
    iconModal: (
      <MenuIcon
        src="/logo/icon-menu-hutang.png"
        alt="Menu Hutang"
        size={44}
        fallbackSvg={
          <svg viewBox="0 0 32 32" fill="none" style={{ width: "28px", height: "28px" }}>
            <rect x="4" y="9" width="24" height="16" rx="4" fill="#f97316" opacity="0.18" />
            <rect x="4" y="9" width="24" height="16" rx="4" stroke="#ea580c" strokeWidth="2.2" />
            <path d="M4 14H28" stroke="#ea580c" strokeWidth="2.2" />
            <rect x="8" y="19" width="6" height="3" rx="1" fill="#f97316" />
            <circle cx="22" cy="20.5" r="2" fill="#fb923c" />
          </svg>
        }
      />
    ),
    iconQuick: (
      <MenuIcon
        src="/logo/icon-menu-hutang.png"
        alt="Menu Hutang"
        size={42}
        fallbackSvg={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="M3 10h18M7 15h4m4 0h2" />
          </svg>
        }
      />
    ),
  },
  {
    id: "dompet",
    name: "Dompet",
    desc: "Kelola pos & amplop",
    path: "/dompet",
    iconBg: "#e6faf5",
    quickClass: "teal-bg",
    iconSrc: "/logo/icon-menu-dompet.png",
    iconModal: (
      <MenuIcon
        src="/logo/icon-menu-dompet.png"
        alt="Menu Dompet"
        size={44}
        fallbackSvg={
          <svg viewBox="0 0 32 32" fill="none" style={{ width: "28px", height: "28px" }}>
            <path d="M6 10.5L20 5.5L22 9L7 14.5" stroke="#0f766e" strokeWidth="2.2" strokeLinecap="round" />
            <rect x="5" y="10" width="22" height="16" rx="4" fill="#14b8a6" opacity="0.2" stroke="#0d9488" strokeWidth="2.2" />
            <path d="M20 15H27V21H20C18.3431 21 17 19.6569 17 18C17 16.3431 18.3431 15 20 15Z" fill="#2dd4bf" stroke="#0d9488" strokeWidth="2" />
            <circle cx="22" cy="18" r="1.5" fill="#ffffff" />
          </svg>
        }
      />
    ),
    iconQuick: (
      <MenuIcon
        src="/logo/icon-menu-dompet.png"
        alt="Menu Dompet"
        size={42}
        fallbackSvg={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m4 7.5 12-4.5 2 3-13 4" />
            <path d="M4 8h16v12H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z" />
            <path d="M15 12h5v4h-5a2 2 0 0 1 0-4Z" />
            <circle cx="16.5" cy="14" r=".5" fill="currentColor" />
          </svg>
        }
      />
    ),
  },
  {
    id: "kendaraan",
    name: "Kendaraan",
    desc: "Pajak & servis",
    path: "/kendaraan",
    iconBg: "#eaf5fc",
    quickClass: "indigo-bg",
    iconSrc: "/logo/icon-menu-kendaraan.png",
    iconModal: (
      <MenuIcon
        src="/logo/icon-menu-kendaraan.png"
        alt="Menu Kendaraan"
        size={44}
        fallbackSvg={
          <svg viewBox="0 0 32 32" fill="none" style={{ width: "28px", height: "28px" }}>
            <rect x="4" y="9" width="24" height="15" rx="4" fill="#287ff0" opacity="0.18" />
            <path
              d="M5 16L7.5 10.5C7.8 9.8 8.6 9.3 9.4 9.3H22.6C23.4 9.3 24.2 9.8 24.5 10.5L27 16"
              stroke="#287ff0"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <rect x="4" y="15" width="24" height="9" rx="3" stroke="#287ff0" strokeWidth="2.2" />
            <circle cx="8.5" cy="20" r="2" fill="#287ff0" />
            <circle cx="23.5" cy="20" r="2" fill="#287ff0" />
          </svg>
        }
      />
    ),
    iconQuick: (
      <MenuIcon
        src="/logo/icon-menu-kendaraan.png"
        alt="Menu Kendaraan"
        size={42}
        fallbackSvg={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0m10 0a2 2 0 1 0 4 0 2 2 0 0 0-4 0" />
            <path d="M5 17H3v-4l2-5h10l2 5h2v4h-2m-4 0H9" />
            <line x1="2" y1="12" x2="22" y2="12" />
          </svg>
        }
      />
    ),
  },
  {
    id: "kesehatan",
    name: "Kesehatan",
    desc: "Tumbuh kembang & medik",
    path: "/kesehatan",
    iconBg: "#ffe4e6",
    quickClass: "rose-bg",
    iconSrc: "/logo/icon-menu-kesehatan.png",
    iconModal: (
      <MenuIcon
        src="/logo/icon-menu-kesehatan.png"
        alt="Menu Kesehatan"
        size={44}
        fallbackSvg={
          <svg viewBox="0 0 32 32" fill="none" style={{ width: "28px", height: "28px" }}>
            <path
              d="M16 28C16 28 4 20.5 4 11.5C4 7.5 7 4.5 11 4.5C13.5 4.5 15.2 6 16 7C16.8 6 18.5 4.5 21 4.5C25 4.5 28 7.5 28 11.5C28 20.5 16 28 16 28Z"
              fill="#f43f5e"
              opacity="0.18"
            />
            <path
              d="M16 28C16 28 4 20.5 4 11.5C4 7.5 7 4.5 11 4.5C13.5 4.5 15.2 6 16 7C16.8 6 18.5 4.5 21 4.5C25 4.5 28 7.5 28 11.5C28 20.5 16 28 16 28Z"
              stroke="#e11d48"
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
            <path d="M16 11V19M12 15H20" stroke="#e11d48" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        }
      />
    ),
    iconQuick: (
      <MenuIcon
        src="/logo/icon-menu-kesehatan.png"
        alt="Menu Kesehatan"
        size={42}
        fallbackSvg={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
            <path d="M12 9v6m-3-3h6" />
          </svg>
        }
      />
    ),
  },
  {
    id: "wisata",
    name: "Wisata",
    desc: "Itinerary & liburan",
    path: "/wisata",
    iconBg: "#e0f2fe",
    quickClass: "sky-bg",
    iconSrc: "/logo/icon-menu-wisata.png",
    iconModal: (
      <MenuIcon
        src="/logo/icon-menu-wisata.png"
        alt="Menu Wisata"
        size={44}
        fallbackSvg={
          <svg viewBox="0 0 32 32" fill="none" style={{ width: "28px", height: "28px" }}>
            <circle cx="16" cy="16" r="12" stroke="#0284c7" strokeWidth="2" />
            <path d="m11 21 3-8 8-3-3 8-8 3z" fill="#0284c7" />
          </svg>
        }
      />
    ),
    iconQuick: (
      <MenuIcon
        src="/logo/icon-menu-wisata.png"
        alt="Menu Wisata"
        size={42}
        fallbackSvg={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
          </svg>
        }
      />
    ),
  },
  {
    id: "traktir",
    name: "Traktir Dev",
    desc: "Support pengembang",
    path: "/traktir",
    iconBg: "#fff8e1",
    quickClass: "amber-bg",
    iconSrc: "/logo/icon-menu-traktir.png",
    iconModal: (
      <MenuIcon
        src="/logo/icon-menu-traktir.png"
        alt="Traktir Developer"
        size={44}
        fallbackSvg={
          <svg viewBox="0 0 32 32" fill="none" style={{ width: "28px", height: "28px" }}>
            <path d="M9 8h12v11a5 5 0 0 1-10 0V8H9Z" fill="#f59e0b" opacity="0.2" stroke="#d97706" strokeWidth="2.2" strokeLinejoin="round"/>
            <path d="M21 11h2.5a2.5 2.5 0 0 1 0 5H21" stroke="#d97706" strokeWidth="2.2" strokeLinecap="round"/>
            <path d="M12 25h8" stroke="#d97706" strokeWidth="2.2" strokeLinecap="round"/>
            <path d="M13 5c0-1.5 3-1.5 3 0s3 1.5 3 0" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
          </svg>
        }
      />
    ),
    iconQuick: (
      <MenuIcon
        src="/logo/icon-menu-traktir.png"
        alt="Traktir Developer"
        size={42}
        fallbackSvg={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M7 6h10v8a4 4 0 0 1-8 0V6H7Z" />
            <path d="M17 9h2a2 2 0 1 1 0 4h-2" />
            <path d="M9 19h6" />
            <path d="M10 4c0-1 2-1 2 0s2 1 2 0" />
          </svg>
        }
      />
    ),
  },
];

export const DEFAULT_QUICK_MENU = ["saku", "struk", "hutang", "dompet"];

export function getMenuItem(id: string): MenuItem | undefined {
  return AVAILABLE_MENUS.find((m) => m.id === id);
}

export function getQuickMenuItems(ids: string[]): MenuItem[] {
  const result: MenuItem[] = [];
  const validIds = ids && ids.length > 0 ? ids : DEFAULT_QUICK_MENU;

  for (const id of validIds) {
    const item = getMenuItem(id);
    if (item && !result.some((r) => r.id === item.id)) {
      result.push(item);
    }
    if (result.length >= 4) break;
  }

  // Fallback if none matched
  if (result.length === 0) {
    return DEFAULT_QUICK_MENU.map((id) => getMenuItem(id)!).filter(Boolean);
  }

  return result;
}

// Returns the effective icon src, using override if set, fallback to default
export function getEffectiveIconSrc(menuId: string, overrides: Record<string, string>): string | null {
  const override = overrides[menuId];
  if (override && override.trim() !== "") return override;
  const item = getMenuItem(menuId);
  return item?.iconSrc ?? null;
}
