"use client";

import React from "react";

interface ContentTabsProps {
  activeTab: "pos" | "history";
  onTabChange: (tab: "pos" | "history") => void;
}

export default function ContentTabs({ activeTab, onTabChange }: ContentTabsProps) {
  return (
    <div className="tabs" role="tablist" aria-label="Konten Utama">
      <button
        type="button"
        id="tab-pos"
        role="tab"
        aria-selected={activeTab === "pos"}
        aria-controls="pos-content"
        className={`tab ${activeTab === "pos" ? "active" : ""}`}
        onClick={() => onTabChange("pos")}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m4 7.5 12-4.5 2 3-13 4" />
          <path d="M4 8h16v12H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z" />
          <path d="M15 12h5v4h-5a2 2 0 0 1 0-4Z" />
        </svg>
        <span>Pos Keuangan</span>
      </button>

      <button
        type="button"
        id="tab-history"
        role="tab"
        aria-selected={activeTab === "history"}
        aria-controls="history-content"
        className={`tab ${activeTab === "history" ? "active" : ""}`}
        onClick={() => onTabChange("history")}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
        <span>History</span>
      </button>
    </div>
  );
}
