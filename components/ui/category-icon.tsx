"use client";

import React from "react";
import {
  resolveCategoryIcon,
  type IconColorTheme,
} from "@/lib/category-icons";

export interface CategoryIconProps {
  /** Slug of the preset icon or legacy unicode emoji */
  icon?: string | null;
  /** Fallback category name used to guess the appropriate icon */
  name?: string | null;
  /** Explicit color theme override (amber, blue, emerald, rose, purple, etc.) */
  theme?: IconColorTheme;
  /** Component size */
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  /** Visual container shape */
  shape?: "squircle" | "circle" | "flat";
  /** Optional extra classes */
  className?: string;
  /** Whether the icon is purely decorative */
  ariaHidden?: boolean;
}

const SIZE_CONFIG = {
  xs: {
    container: "w-6 h-6 rounded-md",
    iconSize: 12,
    strokeWidth: 2,
  },
  sm: {
    container: "w-8 h-8 rounded-lg",
    iconSize: 15,
    strokeWidth: 1.85,
  },
  md: {
    container: "w-10 h-10 rounded-xl",
    iconSize: 18,
    strokeWidth: 1.75,
  },
  lg: {
    container: "w-12 h-12 rounded-2xl",
    iconSize: 22,
    strokeWidth: 1.65,
  },
  xl: {
    container: "w-14 h-14 rounded-2xl",
    iconSize: 26,
    strokeWidth: 1.5,
  },
};

export default function CategoryIcon({
  icon,
  name,
  theme,
  size = "md",
  shape = "squircle",
  className = "",
  ariaHidden = true,
}: CategoryIconProps) {
  const resolved = resolveCategoryIcon(icon, name, theme);
  const IconComp = resolved.icon;
  const config = SIZE_CONFIG[size] || SIZE_CONFIG.md;

  const shapeClasses =
    shape === "circle"
      ? "rounded-full"
      : shape === "flat"
      ? "rounded-none border-0 bg-transparent"
      : config.container;

  return (
    <div
      className={`relative inline-flex items-center justify-center flex-shrink-0 transition-transform duration-200 select-none ${
        shape !== "flat" ? `border ${resolved.classes.bg} ${resolved.classes.border} ${resolved.classes.text}` : resolved.classes.text
      } ${shapeClasses} ${className}`}
      aria-hidden={ariaHidden}
      title={name || resolved.label}
    >
      <IconComp
        size={config.iconSize}
        strokeWidth={config.strokeWidth}
        className="transition-transform group-hover:scale-105"
      />
    </div>
  );
}
