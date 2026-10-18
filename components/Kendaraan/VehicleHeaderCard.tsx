"use client";

import React from "react";
import type { Vehicle } from "@/lib/types";

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
          {vehicle.vehicle_type === "Mobil" ? (
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#287ff0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
              <circle cx="7" cy="17" r="2" />
              <path d="M9 17h6" />
              <circle cx="17" cy="17" r="2" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#287ff0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="5.5" cy="17.5" r="3.5" />
              <circle cx="18.5" cy="17.5" r="3.5" />
              <path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 3h2" />
            </svg>
          )}
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
