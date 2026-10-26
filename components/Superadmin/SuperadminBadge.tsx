"use client";

import React from "react";

interface SuperadminBadgeProps {
  style?: React.CSSProperties;
}

export default function SuperadminBadge({ style }: SuperadminBadgeProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "12px 16px",
        borderRadius: "14px",
        background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)",
        border: "1px solid rgba(139, 92, 246, 0.3)",
        boxShadow: "0 4px 14px rgba(139, 92, 246, 0.18)",
        marginBottom: "16px",
        ...style,
      }}
    >
      {/* Shield Icon */}
      <div
        style={{
          width: "38px",
          height: "38px",
          borderRadius: "10px",
          background: "rgba(139, 92, 246, 0.25)",
          border: "1px solid rgba(139, 92, 246, 0.4)",
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
        }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="#a78bfa"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ width: "18px", height: "18px" }}
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      </div>

      <div>
        <div
          style={{
            fontSize: "13.5px",
            fontWeight: 800,
            color: "#e9d5ff",
            letterSpacing: "-0.2px",
          }}
        >
          🛡️ Mode Superadmin
        </div>
        <div style={{ fontSize: "11px", color: "#a78bfa", marginTop: "2px" }}>
          Kelola konten global aplikasi
        </div>
      </div>

      <div
        style={{
          marginLeft: "auto",
          fontSize: "9.5px",
          fontWeight: 800,
          padding: "3px 8px",
          borderRadius: "6px",
          background: "rgba(139, 92, 246, 0.25)",
          color: "#c4b5fd",
          border: "1px solid rgba(139, 92, 246, 0.3)",
          letterSpacing: "0.5px",
        }}
      >
        GLOBAL
      </div>
    </div>
  );
}

