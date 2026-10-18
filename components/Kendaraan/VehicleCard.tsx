"use client";

import React from "react";
import Link from "next/link";
import type { Vehicle } from "@/lib/types";
import {
  calculateTaxStatus,
  calculateServiceStatus,
  formatDateIndo,
} from "@/lib/vehicle-utils";
import VehicleStatusBadge from "./VehicleStatusBadge";

interface VehicleCardProps {
  vehicle: Vehicle;
  onEdit?: (vehicle: Vehicle) => void;
  onArchive?: (vehicle: Vehicle) => void;
}

export default function VehicleCard({ vehicle }: VehicleCardProps) {
  const taxStatus = calculateTaxStatus(vehicle.next_tax_due_date);
  const serviceStatus = calculateServiceStatus(
    vehicle.last_service_date,
    vehicle.service_reminder_interval_months || 1
  );

  return (
    <Link
      href={`/kendaraan/${vehicle.id}`}
      style={{
        display: "block",
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <div
        style={{
          background: "var(--surface)",
          borderRadius: "16px",
          border: "1px solid var(--border)",
          padding: "16px",
          marginBottom: "12px",
          boxShadow: "0 4px 14px rgba(16, 45, 85, 0.04)",
          transition: "transform 0.15s ease, box-shadow 0.15s ease",
          cursor: "pointer",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-1px)";
          e.currentTarget.style.boxShadow = "0 8px 20px rgba(16, 45, 85, 0.08)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 4px 14px rgba(16, 45, 85, 0.04)";
        }}
      >
        {/* Top: Icon + Name + Plate */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
          {/* Vehicle Icon / Thumbnail */}
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: vehicle.vehicle_type === "Mobil" ? "#eaf5fc" : "#f1f8fd",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            {vehicle.vehicle_type === "Mobil" ? (
              <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#287ff0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
                <circle cx="7" cy="17" r="2" />
                <path d="M9 17h6" />
                <circle cx="17" cy="17" r="2" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#287ff0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="5.5" cy="17.5" r="3.5" />
                <circle cx="18.5" cy="17.5" r="3.5" />
                <path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 3h2" />
              </svg>
            )}
          </div>

          {/* Title & Plate */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: "15px",
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
                fontSize: "12.5px",
                color: "var(--text-secondary)",
                marginTop: "2px",
                fontWeight: 500,
              }}
            >
              <span style={{ fontWeight: 650, color: "var(--text)" }}>{vehicle.plate_number}</span> · {vehicle.vehicle_type}
            </div>
          </div>

          <div style={{ color: "var(--muted)", padding: "4px" }}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </div>
        </div>

        {/* Status Badges */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "14px" }}>
          <VehicleStatusBadge type="tax" status={taxStatus} />
          <VehicleStatusBadge type="service" status={serviceStatus} />
        </div>

        {/* Divider */}
        <div style={{ height: "1px", background: "var(--border)", opacity: 0.6, marginBottom: "12px" }} />

        {/* Bottom Info: Due Date & Last Service */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "8px",
            fontSize: "12px",
          }}
        >
          <div>
            <div style={{ color: "var(--muted)", marginBottom: "2px", fontSize: "11px" }}>Jatuh tempo pajak</div>
            <div style={{ fontWeight: 650, color: "var(--navy)" }}>{formatDateIndo(vehicle.next_tax_due_date)}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "var(--muted)", marginBottom: "2px", fontSize: "11px" }}>Servis terakhir</div>
            <div style={{ fontWeight: 650, color: "var(--navy)" }}>
              {vehicle.last_service_date ? formatDateIndo(vehicle.last_service_date) : "Belum dicatat"}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
