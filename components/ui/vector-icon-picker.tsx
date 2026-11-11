"use client";

import React, { useState } from "react";
import {
  CATEGORY_ICON_PRESETS,
  POPULAR_CATEGORY_EMOJIS,
  resolveCategoryIcon,
  isEmoji,
  type CategoryIconPreset,
  type IconColorTheme,
} from "@/lib/category-icons";
import CategoryIcon from "./category-icon";

export interface VectorIconPickerProps {
  value: string;
  onChange: (slugOrEmoji: string) => void;
  className?: string;
  label?: string;
  selectedTheme?: IconColorTheme;
}

export default function VectorIconPicker({
  value,
  onChange,
  className = "",
  label = "Pilih Ikon / Emoji",
}: VectorIconPickerProps) {
  const currentResolved = resolveCategoryIcon(value);
  // Default tab is always Emoji as requested
  const [activeTab, setActiveTab] = useState<"emoji" | "vector">("emoji");

  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* Header with preview */}
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-bold text-[var(--text-secondary,#58779d)] uppercase tracking-wider">
          {label}
        </label>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white border border-[var(--border,#d8eaf8)] shadow-[0_1px_3px_rgba(16,45,85,0.04)] text-xs text-[var(--text,#17375f)]">
          <span className="text-[var(--muted,#8196af)] text-[11px] font-medium">Terpilih:</span>
          <CategoryIcon icon={value} size="xs" />
          <span className="font-semibold text-xs text-[var(--navy,#102d55)]">
            {currentResolved.label || "Kategori"}
          </span>
        </div>
      </div>

      {/* Tab Switcher: Emoji vs Vektor */}
      <div className="flex items-center gap-1 p-1 bg-[var(--s2,#e8f3fb)] rounded-xl border border-[var(--border,#d8eaf8)] text-xs">
        <button
          type="button"
          onClick={() => setActiveTab("emoji")}
          className={`flex-1 py-1.5 px-3 rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === "emoji"
              ? "bg-white text-[var(--primary,#287ff0)] shadow-[0_2px_6px_rgba(40,127,240,0.12)] border border-[var(--border,#d8eaf8)]"
              : "text-[var(--text-secondary,#58779d)] hover:text-[var(--text,#17375f)]"
          }`}
        >
          <span>✨</span>
          <span>Emoticon / Emoji</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("vector")}
          className={`flex-1 py-1.5 px-3 rounded-lg font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === "vector"
              ? "bg-white text-[var(--primary,#287ff0)] shadow-[0_2px_6px_rgba(40,127,240,0.12)] border border-[var(--border,#d8eaf8)]"
              : "text-[var(--text-secondary,#58779d)] hover:text-[var(--text,#17375f)]"
          }`}
        >
          <span>🎨</span>
          <span>Ikon Vektor</span>
        </button>
      </div>

      {/* Emoji Grid (Theme-matched soft pastel blue container with clean white cards) */}
      {activeTab === "emoji" && (
        <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 p-3 bg-[var(--s2,#e8f3fb)] rounded-2xl border border-[var(--border,#d8eaf8)] max-h-56 overflow-y-auto scrollbar-thin">
          {POPULAR_CATEGORY_EMOJIS.map((em) => {
            const isSelected = value === em;
            return (
              <button
                key={em}
                type="button"
                onClick={() => onChange(em)}
                className={`group relative flex items-center justify-center p-2 rounded-xl text-xl transition-all duration-150 cursor-pointer ${
                  isSelected
                    ? "bg-[var(--primary-soft,#e2f0ff)] border-2 border-[var(--primary,#287ff0)] shadow-[0_4px_12px_rgba(40,127,240,0.25)] scale-110 ring-2 ring-[var(--primary,#287ff0)]/25"
                    : "bg-white hover:bg-[var(--surface-soft,#f1f8fd)] border border-[var(--border,#d8eaf8)] hover:border-[var(--primary,#287ff0)]/50 active:scale-95 shadow-[0_1px_3px_rgba(16,45,85,0.04)]"
                }`}
                title={em}
                aria-label={`Pilih emoji ${em}`}
                aria-pressed={isSelected}
              >
                <span className="leading-none transition-transform group-hover:scale-115">
                  {em}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Vector Icon Grid (Theme-matched soft pastel blue container with clean white cards) */}
      {activeTab === "vector" && (
        <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 p-3 bg-[var(--s2,#e8f3fb)] rounded-2xl border border-[var(--border,#d8eaf8)] max-h-56 overflow-y-auto scrollbar-thin">
          {CATEGORY_ICON_PRESETS.map((preset: CategoryIconPreset) => {
            const isSelected =
              currentResolved.slug === preset.slug || value === preset.slug;
            const IconComp = preset.icon;

            return (
              <button
                key={preset.slug}
                type="button"
                onClick={() => onChange(preset.slug)}
                className={`group relative flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-150 cursor-pointer ${
                  isSelected
                    ? "bg-[var(--primary,#287ff0)] text-white shadow-[0_4px_12px_rgba(40,127,240,0.3)] scale-105 ring-2 ring-[var(--primary,#287ff0)]/30"
                    : "bg-white hover:bg-[var(--surface-soft,#f1f8fd)] text-[var(--text,#17375f)] border border-[var(--border,#d8eaf8)] hover:border-[var(--primary,#287ff0)]/50 active:scale-95 shadow-[0_1px_3px_rgba(16,45,85,0.04)]"
                }`}
                title={preset.label}
                aria-label={preset.label}
                aria-pressed={isSelected}
              >
                <IconComp
                  size={18}
                  strokeWidth={isSelected ? 2.2 : 1.75}
                  className="transition-transform group-hover:scale-110"
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
