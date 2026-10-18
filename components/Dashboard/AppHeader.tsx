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
}

export default function AppHeader({
  cycleLabel,
  onOpenCyclePicker,
  dbConnected = true,
  logoSettings,
  onNotificationClick,
}: AppHeaderProps) {
  const isCustomImage = logoSettings?.type === "image" && logoSettings?.image;
  const isCustomEmoji = logoSettings?.type === "emoji" && logoSettings?.emoji && logoSettings.emoji !== "💳";

  return (
    <header className="header">
      {/* Brand Mark / Logo */}
      <div className="brand-mark" aria-label="Catat Keluarga">
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
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/logo-icon.png"
            alt="Catat Keluarga"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              borderRadius: "inherit",
            }}
          />
        )}
      </div>

      {/* Brand Copy & Cycle Dropdown */}
      <div className="brand-copy">
        <div className="brand-name">
          Catat <span>Keluarga</span>
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

      {/* Header Actions: Notification */}
      <div className="header-actions">
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
