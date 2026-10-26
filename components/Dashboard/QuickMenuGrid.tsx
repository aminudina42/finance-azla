"use client";

import React from "react";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { getQuickMenuItems, MenuIcon } from "@/lib/menu-config";

interface QuickMenuGridProps {
  onOpenAllFeatures?: () => void;
}

export default function QuickMenuGrid({ onOpenAllFeatures }: QuickMenuGridProps) {
  const { quickMenuItems, menuIconOverrides } = useApp();
  const activeMenus = getQuickMenuItems(quickMenuItems);

  return (
    <section className="quick-section" aria-label="Menu Cepat">
      <div className="section-head">
        <h2>Menu Cepat</h2>
        <button
          type="button"
          onClick={onOpenAllFeatures}
          className="more"
          aria-label="Akses semua fitur aplikasi"
        >
          <span>Akses Fitur Lain</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </div>

      <div
        className="quick-grid"
        style={
          activeMenus.length < 4
            ? { gridTemplateColumns: `repeat(${activeMenus.length}, minmax(0, 1fr))` }
            : undefined
        }
      >
        {activeMenus.map((item) => {
          const customIconUrl = menuIconOverrides?.[item.id];
          return (
            <Link
              key={item.id}
              href={item.path}
              className="quick-card"
              aria-label={`Menu ${item.name}: ${item.desc}`}
            >
              <span className={`quick-icon ${item.quickClass}`}>
                {customIconUrl ? (
                  <MenuIcon
                    src={customIconUrl}
                    alt={item.name}
                    size={42}
                    fallbackSvg={item.iconQuick}
                  />
                ) : (
                  item.iconQuick
                )}
              </span>
              <span className="quick-name">{item.name}</span>
              <span className="quick-desc">{item.desc}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
