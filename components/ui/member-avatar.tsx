"use client";

import React from "react";

export interface MemberAvatarProps {
  name?: string | null;
  role?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  showRoleBadge?: boolean;
  className?: string;
  avatarUrl?: string | null;
}

const AVATAR_SIZES = {
  xs: {
    avatar: "w-6 h-6 text-[10px]",
    badge: "text-[9px] px-1.5 py-0.2",
  },
  sm: {
    avatar: "w-8 h-8 text-xs",
    badge: "text-[9px] px-1.5 py-0.5",
  },
  md: {
    avatar: "w-10 h-10 text-sm",
    badge: "text-[10px] px-2 py-0.5",
  },
  lg: {
    avatar: "w-12 h-12 text-base",
    badge: "text-[11px] px-2.5 py-0.5",
  },
};

/** Deterministic palette generation for family members */
const PALETTES = [
  { bg: "bg-blue-500/10 dark:bg-blue-500/20", border: "border-blue-500/25", text: "text-blue-600 dark:text-blue-400" },
  { bg: "bg-emerald-500/10 dark:bg-emerald-500/20", border: "border-emerald-500/25", text: "text-emerald-600 dark:text-emerald-400" },
  { bg: "bg-amber-500/10 dark:bg-amber-500/20", border: "border-amber-500/25", text: "text-amber-600 dark:text-amber-400" },
  { bg: "bg-purple-500/10 dark:bg-purple-500/20", border: "border-purple-500/25", text: "text-purple-600 dark:text-purple-400" },
  { bg: "bg-rose-500/10 dark:bg-rose-500/20", border: "border-rose-500/25", text: "text-rose-600 dark:text-rose-400" },
  { bg: "bg-teal-500/10 dark:bg-teal-500/20", border: "border-teal-500/25", text: "text-teal-600 dark:text-teal-400" },
];

function getInitials(name?: string | null): string {
  if (!name || !name.trim()) return "??";
  const clean = name.trim().replace(/[^\p{L}\s]/gu, "");
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return name.slice(0, 2).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getPaletteIndex(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % PALETTES.length;
}

export function formatRoleLabel(role?: string | null): string {
  if (!role) return "Anggota";
  const r = role.toLowerCase().trim();
  if (r === "suami" || r === "ayah") return "Kepala Keluarga";
  if (r === "istri" || r === "bunda" || r === "ibu") return "Pasangan";
  if (r === "anak") return "Anak";
  if (r === "orang_tua" || r === "kakek" || r === "nenek") return "Orang Tua";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export default function MemberAvatar({
  name,
  role,
  size = "md",
  showRoleBadge = false,
  className = "",
  avatarUrl,
}: MemberAvatarProps) {
  const initials = getInitials(name);
  const paletteIndex = getPaletteIndex(name || "member");
  const palette = PALETTES[paletteIndex];
  const sizeCfg = AVATAR_SIZES[size] || AVATAR_SIZES.md;
  const roleLabel = formatRoleLabel(role);

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div
        className={`relative inline-flex items-center justify-center font-semibold font-mono tracking-wider rounded-full border shadow-sm select-none flex-shrink-0 ${palette.bg} ${palette.border} ${palette.text} ${sizeCfg.avatar}`}
        title={name || "Anggota Keluarga"}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={name || "Avatar"}
            className="w-full h-full object-cover rounded-full"
          />
        ) : (
          <span>{initials}</span>
        )}
      </div>

      {showRoleBadge && (
        <span
          className={`inline-flex items-center rounded-full font-mono font-medium uppercase tracking-wider bg-secondary/80 text-muted-foreground border border-border/50 ${sizeCfg.badge}`}
        >
          {roleLabel}
        </span>
      )}
    </div>
  );
}
