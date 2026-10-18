"use client";

import React from "react";
import type { TaxStatus, ServiceStatus } from "@/lib/vehicle-utils";

interface VehicleStatusBadgeProps {
  type: "tax" | "service";
  status: TaxStatus | ServiceStatus;
}

export default function VehicleStatusBadge({ type, status }: VehicleStatusBadgeProps) {
  let bg = "#f1f5f9";
  let color = "#475569";
  let dotColor = "#94a3b8";
  let label = status;

  if (type === "tax") {
    if (status === "Belum Bayar") {
      bg = "#fee2e2";
      color = "#ef4444";
      dotColor = "#ef4444";
      label = "Pajak belum dibayar";
    } else if (status === "Terlambat") {
      bg = "#fecaca";
      color = "#dc2626";
      dotColor = "#dc2626";
      label = "Pajak terlambat";
    } else if (status === "Lunas") {
      bg = "#e6f8f5";
      color = "#16a89a";
      dotColor = "#16a89a";
      label = "Pajak lunas";
    }
  } else if (type === "service") {
    if (status === "Perlu Servis") {
      bg = "#fff7ed";
      color = "#ea580c";
      dotColor = "#ea580c";
      label = "Perlu servis";
    } else if (status === "Aman") {
      bg = "#e6f8f5";
      color = "#16a89a";
      dotColor = "#16a89a";
      label = "Aman";
    } else if (status === "Belum Ada Riwayat") {
      bg = "#f1f5f9";
      color = "#64748b";
      dotColor = "#94a3b8";
      label = "Belum ada riwayat";
    }
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        padding: "3px 8px",
        borderRadius: "999px",
        fontSize: "11px",
        fontWeight: 650,
        backgroundColor: bg,
        color: color,
        lineHeight: 1.2,
      }}
    >
      <span
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          backgroundColor: dotColor,
        }}
      />
      {label}
    </span>
  );
}
