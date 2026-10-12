"use client";

import React from "react";

interface AppHeaderProps {
  cycleLabel: string;
  onOpenCyclePicker: () => void;
  dbConnected?: boolean;
  logoSettings?: {
    type: "emoji" | "image";
    emoji: string;
    bg: string;
    image: string;
  };
  onNotificationClick?: () => void;
  theme?: "dark" | "light";
  onToggleTheme?: () => void;
}

export default function AppHeader({
  cycleLabel,
  onOpenCyclePicker,
  dbConnected = true,
  logoSettings,
  onNotificationClick,
  theme,
  onToggleTheme,
}: AppHeaderProps) {
  const isCustomImage = logoSettings?.type === "image" && logoSettings?.image;
  const isCustomEmoji = logoSettings?.type === "emoji" && logoSettings?.emoji && logoSettings.emoji !== "💳";

  return (
    <header className="header">
      {/* Brand Mark / Logo */}
      <div className="brand-mark" aria-label="Dompet Azla">
        {isCustomImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoSettings.image}
            alt="Logo"
            crossOrigin="anonymous"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              padding: "6px",
              borderRadius: "inherit",
            }}
          />
        ) : isCustomEmoji ? (
          <span style={{ fontSize: "30px" }}>{logoSettings.emoji}</span>
        ) : (
          <svg viewBox="0 0 48 48" fill="none">
            <path
              d="M10 13.5 31 6l2 5-20 7"
              stroke="#287ff0"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M9 16h28a4 4 0 0 1 4 4v18H9a4 4 0 0 1-4-4V20a4 4 0 0 1 4-4Z"
              fill="#287ff0"
            />
            <path d="M29 23h12v10H29a5 5 0 0 1 0-10Z" fill="#75b8ff" />
            <circle cx="31" cy="28" r="1.8" fill="#fff" />
          </svg>
        )}
      </div>

      {/* Brand Copy & Cycle Dropdown */}
      <div className="brand-copy">
        <div className="brand-name">
          Dompet <span>Azla</span>
        </div>
        <button
          type="button"
          className="cycle"
          onClick={onOpenCyclePicker}
          aria-label="Pilih siklus anggaran"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M16 3v4M8 3v4M3 10h18M8 14h3M8 17h6" />
          </svg>
          <span>Siklus {cycleLabel}</span>
          <i className="chev-down" aria-hidden="true"></i>
        </button>
      </div>

      {/* Header Actions: Theme toggle & Notification */}
      <div className="header-actions">
        {onToggleTheme && (
          <button
            type="button"
            className="theme-btn"
            aria-label={theme === "dark" ? "Ganti ke mode terang" : "Ganti ke mode gelap"}
            title={theme === "dark" ? "Mode Terang" : "Mode Gelap"}
            onClick={onToggleTheme}
          >
            {theme === "dark" ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
        )}

        <button
          type="button"
          className="notification"
          aria-label="Notifikasi"
          onClick={onNotificationClick}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
          </svg>
          <span className="dot" aria-hidden="true"></span>
        </button>
      </div>
    </header>
  );
}
