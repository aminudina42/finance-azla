"use client";

import React from "react";
import type { TripStatus } from "@/lib/types";

export default function TripStatusBadge({ status }: { status: TripStatus }) {
  const meta: Record<TripStatus, { label: string; bg: string; text: string; border: string }> = {
    planning: {
      label: "Perencanaan",
      bg: "rgba(40, 127, 240, 0.12)",
      text: "#2563eb",
      border: "rgba(37, 99, 235, 0.25)",
    },
    ongoing: {
      label: "Sedang Liburan",
      bg: "rgba(22, 168, 154, 0.15)",
      text: "#0d9488",
      border: "rgba(13, 148, 136, 0.3)",
    },
    completed: {
      label: "Selesai",
      bg: "rgba(100, 116, 139, 0.12)",
      text: "#475569",
      border: "rgba(100, 116, 139, 0.25)",
    },
  };

  const current = meta[status] || meta.planning;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "3px 8px",
        borderRadius: "999px",
        fontSize: "11px",
        fontWeight: 600,
        backgroundColor: current.bg,
        color: current.text,
        border: `1px solid ${current.border}`,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          backgroundColor: current.text,
          display: "inline-block",
        }}
      />
      {current.label}
    </span>
  );
}
