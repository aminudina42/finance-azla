"use client";

import React from "react";
import {
  CATEGORY_ICON_PRESETS,
  resolveCategoryIcon,
  type CategoryIconPreset,
  type IconColorTheme,
} from "@/lib/category-icons";
import CategoryIcon from "./category-icon";

export interface VectorIconPickerProps {
  value: string;
  onChange: (slug: string) => void;
  className?: string;
  label?: string;
  selectedTheme?: IconColorTheme;
}

export default function VectorIconPicker({
  value,
  onChange,
  className = "",
  label = "Pilih Ikon Kategori",
}: VectorIconPickerProps) {
  const currentResolved = resolveCategoryIcon(value);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header with preview */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {label}
        </label>
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-secondary/50 border border-border/50 text-xs">
          <span className="text-muted-foreground text-[11px]">Terpilih:</span>
          <CategoryIcon icon={value} size="xs" />
          <span className="font-medium text-foreground">{currentResolved.label}</span>
        </div>
      </div>

      {/* Grid of Lucide vector icons */}
      <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 p-3 bg-secondary/20 dark:bg-zinc-900/40 rounded-xl border border-border/60 max-h-56 overflow-y-auto scrollbar-thin">
        {CATEGORY_ICON_PRESETS.map((preset: CategoryIconPreset) => {
          const isSelected =
            currentResolved.slug === preset.slug || value === preset.slug;
          const IconComp = preset.icon;

          return (
            <button
              key={preset.slug}
              type="button"
              onClick={() => onChange(preset.slug)}
              className={`group relative flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-150 ${
                isSelected
                  ? "bg-primary text-primary-foreground shadow-md scale-105 ring-2 ring-primary/40 ring-offset-1 ring-offset-background"
                  : "bg-background/80 hover:bg-secondary text-muted-foreground hover:text-foreground border border-border/40 hover:border-border"
              }`}
              title={preset.label}
              aria-label={preset.label}
              aria-pressed={isSelected}
            >
              <IconComp
                size={18}
                strokeWidth={isSelected ? 2 : 1.75}
                className="transition-transform group-hover:scale-110"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
