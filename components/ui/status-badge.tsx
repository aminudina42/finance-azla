"use client";

import React from "react";
import type { LucideIcon } from "lucide-react";

export type StatusVariant = "danger" | "warning" | "success" | "info" | "neutral";

export interface StatusBadgeProps {
  label: string;
  variant?: StatusVariant;
  pulse?: boolean;
  icon?: LucideIcon;
  size?: "sm" | "md";
  className?: string;
}

const VARIANT_CONFIGS: Record<
  StatusVariant,
  { bg: string; border: string; text: string; dot: string }
> = {
  danger: {
    bg: "bg-rose-500/10 dark:bg-rose-500/15",
    border: "border-rose-500/25 dark:border-rose-500/35",
    text: "text-rose-600 dark:text-rose-400",
    dot: "bg-rose-500",
  },
  warning: {
    bg: "bg-amber-500/10 dark:bg-amber-500/15",
    border: "border-amber-500/25 dark:border-amber-500/35",
    text: "text-amber-600 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  success: {
    bg: "bg-emerald-500/10 dark:bg-emerald-500/15",
    border: "border-emerald-500/25 dark:border-emerald-500/35",
    text: "text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  info: {
    bg: "bg-sky-500/10 dark:bg-sky-500/15",
    border: "border-sky-500/25 dark:border-sky-500/35",
    text: "text-sky-600 dark:text-sky-400",
    dot: "bg-sky-500",
  },
  neutral: {
    bg: "bg-secondary/70",
    border: "border-border/60",
    text: "text-muted-foreground",
    dot: "bg-muted-foreground/60",
  },
};

export default function StatusBadge({
  label,
  variant = "neutral",
  pulse = false,
  icon: Icon,
  size = "md",
  className = "",
}: StatusBadgeProps) {
  const cfg = VARIANT_CONFIGS[variant] || VARIANT_CONFIGS.neutral;
  const isSm = size === "sm";

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border ${cfg.bg} ${cfg.border} ${cfg.text} ${
        isSm ? "px-2 py-0.5 text-[9px]" : "px-2.5 py-0.5 text-[10px]"
      } font-mono font-medium tracking-wider uppercase select-none ${className}`}
    >
      {Icon ? (
        <Icon size={isSm ? 10 : 12} strokeWidth={2} aria-hidden="true" />
      ) : (
        <span className="relative flex h-1.5 w-1.5">
          {pulse && (
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${cfg.dot}`}
            />
          )}
          <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${cfg.dot}`} />
        </span>
      )}
      <span>{label}</span>
    </div>
  );
}
