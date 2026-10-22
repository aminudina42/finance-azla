"use client";

import React from "react";
import type { Vehicle } from "@/lib/types";
import VehicleTypeIcon from "./VehicleTypeIcon";

interface VehicleHeaderCardProps {
  vehicle: Vehicle;
  action?: React.ReactNode;
}

export default function VehicleHeaderCard({ vehicle, action }: VehicleHeaderCardProps) {
  return (
    <div
      style={{
        background: "var(--surface)",
        borderRadius: "14px",
        border: "1px solid var(--border)",
        padding: "12px 14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        boxShadow: "0 2px 8px rgba(16, 45, 85, 0.03)",
        marginBottom: "16px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
        {/* Icon */}
        <div
          style={{
            width: "42px",
            height: "42px",
            borderRadius: "10px",
            background: vehicle.vehicle_type === "Mobil" ? "#eaf5fc" : "#f1f8fd",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          <VehicleTypeIcon type={vehicle.vehicle_type} size={30} />
        </div>

        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: "14.5px",
              fontWeight: 750,
              color: "var(--navy)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {vehicle.brand} {vehicle.model}
          </div>
          <div
            style={{
              fontSize: "12px",
              color: "var(--text-secondary)",
              fontWeight: 500,
              marginTop: "1px",
            }}
          >
            <span style={{ fontWeight: 650, color: "var(--text)" }}>{vehicle.plate_number}</span> · {vehicle.vehicle_type}
          </div>
        </div>
      </div>

      {action && <div>{action}</div>}
    </div>
  );
}
