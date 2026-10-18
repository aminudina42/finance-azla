import React from "react";

export interface MenuItem {
  id: string;
  name: string;
  desc: string;
  path: string;
  iconBg: string;
  quickClass: string;
  iconModal: React.ReactNode;
  iconQuick: React.ReactNode;
}

export const AVAILABLE_MENUS: MenuItem[] = [
  {
    id: "saku",
    name: "Saku",
    desc: "Kantong & tabungan",
    path: "/saku",
    iconBg: "#e8f3ff",
    quickClass: "blue",
    iconModal: (
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
    ),
    iconQuick: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3v3M8 5l2 2M16 5l-2 2" />
        <path d="M5 10c0-3 3-5 7-5s7 2 7 5v6c0 3-3 5-7 5s-7-2-7-5Z" />
        <path d="M2 12h3m14 0h3M9 13h.01M15 13h.01M10 17h4" />
      </svg>
    ),
  },
  {
    id: "struk",
    name: "Kasir",
    desc: "Kasir & struk",
    path: "/struk",
    iconBg: "#e5f7ff",
    quickClass: "skyblue",
    iconModal: (
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
    ),
    iconQuick: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="M6 8h12M6 12h5M6 16h3m6-4h3m-3 4h3" />
      </svg>
    ),
  },
  {
    id: "hutang",
    name: "Hutang",
    desc: "Utang & piutang",
    path: "/debts",
    iconBg: "#fff3e5",
    quickClass: "orange-bg",
    iconModal: (
      <svg viewBox="0 0 32 32" fill="none" style={{ width: "28px", height: "28px" }}>
        <rect x="4" y="9" width="24" height="16" rx="4" fill="#f97316" opacity="0.18" />
        <rect x="4" y="9" width="24" height="16" rx="4" stroke="#ea580c" strokeWidth="2.2" />
        <path d="M4 14H28" stroke="#ea580c" strokeWidth="2.2" />
        <rect x="8" y="19" width="6" height="3" rx="1" fill="#f97316" />
        <circle cx="22" cy="20.5" r="2" fill="#fb923c" />
      </svg>
    ),
    iconQuick: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 10h18M7 15h4m4 0h2" />
      </svg>
    ),
  },
  {
    id: "dompet",
    name: "Dompet",
    desc: "Kelola pos & amplop",
    path: "/dompet",
    iconBg: "#e6faf5",
    quickClass: "teal-bg",
    iconModal: (
      <svg viewBox="0 0 32 32" fill="none" style={{ width: "28px", height: "28px" }}>
        <path d="M6 10.5L20 5.5L22 9L7 14.5" stroke="#0f766e" strokeWidth="2.2" strokeLinecap="round" />
        <rect x="5" y="10" width="22" height="16" rx="4" fill="#14b8a6" opacity="0.2" stroke="#0d9488" strokeWidth="2.2" />
        <path d="M20 15H27V21H20C18.3431 21 17 19.6569 17 18C17 16.3431 18.3431 15 20 15Z" fill="#2dd4bf" stroke="#0d9488" strokeWidth="2" />
        <circle cx="22" cy="18" r="1.5" fill="#ffffff" />
      </svg>
    ),
    iconQuick: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m4 7.5 12-4.5 2 3-13 4" />
        <path d="M4 8h16v12H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z" />
        <path d="M15 12h5v4h-5a2 2 0 0 1 0-4Z" />
        <circle cx="16.5" cy="14" r=".5" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "kendaraan",
    name: "Kendaraan",
    desc: "Pajak & servis",
    path: "/kendaraan",
    iconBg: "#eaf5fc",
    quickClass: "indigo-bg",
    iconModal: (
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
    ),
    iconQuick: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0m10 0a2 2 0 1 0 4 0 2 2 0 0 0-4 0" />
        <path d="M5 17H3v-4l2-5h10l2 5h2v4h-2m-4 0H9" />
        <line x1="2" y1="12" x2="22" y2="12" />
      </svg>
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

