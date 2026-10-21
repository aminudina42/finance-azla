"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import type { Vehicle } from "@/lib/types";
import {
  calculateTaxStatus,
  calculateServiceStatus,
  formatDateIndo,
  calculateMonthlyFuelStats,
  formatFuelEfficiency,
} from "@/lib/vehicle-utils";
import { getVehicleFuelLogs } from "@/lib/vehicle-service";
import VehicleStatusBadge from "./VehicleStatusBadge";
import { useApp } from "@/lib/store";

interface VehicleCardProps {
  vehicle: Vehicle;
  onEdit?: (vehicle: Vehicle) => void;
  onArchive?: (vehicle: Vehicle) => void;
}

export default function VehicleCard({ vehicle }: VehicleCardProps) {
  const { posList, cycles } = useApp();
  const [fuelStats, setFuelStats] = useState<{
    efficiencyText: string;
    hasData: boolean;
  }>({
    efficiencyText: "—",
    hasData: false,
  });

  const taxStatus = calculateTaxStatus(vehicle.next_tax_due_date);
  const serviceStatus = calculateServiceStatus(
    vehicle.last_service_date,
    vehicle.service_reminder_interval_months || 1
  );

  // Cari Pos Keuangan yang terhubung ke kendaraan ini
  const linkedPos = posList.find((p) => p.id === vehicle.finance_pos_id);

  // Ambil data konsumsi BBM bulan ini
  useEffect(() => {
    let isMounted = true;
    async function fetchFuelData() {
      try {
        const logs = await getVehicleFuelLogs(vehicle.id);
        if (!isMounted) return;
        const activeCycle = cycles[0];
        const stats = calculateMonthlyFuelStats(logs, activeCycle?.start_date);
        
        if (stats.averageKmL !== null) {
          setFuelStats({
            efficiencyText: formatFuelEfficiency(stats.averageKmL),
            hasData: true,
          });
        } else if (stats.hasBaselineOnly) {
          setFuelStats({
            efficiencyText: "Baru 1x isi",
            hasData: false,
          });
        } else {
          setFuelStats({
            efficiencyText: "— km/l",
            hasData: false,
          });
        }
      } catch {
        // Fallback gracefully
      }
    }
    fetchFuelData();
    return () => {
      isMounted = false;
    };
  }, [vehicle.id, cycles]);

  return (
    <Link
      href={`/kendaraan/${vehicle.id}`}
      style={{
        display: "block",
        textDecoration: "none",
        color: "inherit",
        marginBottom: "14px",
      }}
    >
      {/* Double-Bezel Architectural Enclosure (Outer Machined Bezel) */}
      <div
        style={{
          borderRadius: "22px",
          padding: "2.5px",
          background: "linear-gradient(180deg, rgba(38, 111, 183, 0.08) 0%, rgba(16, 45, 85, 0.04) 100%)",
          boxShadow: "0 4px 16px rgba(16, 45, 85, 0.04)",
          transition: "transform 0.25s cubic-bezier(0.32, 0.72, 0, 1), box-shadow 0.25s cubic-bezier(0.32, 0.72, 0, 1)",
          cursor: "pointer",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = "0 12px 28px rgba(16, 45, 85, 0.09)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 4px 16px rgba(16, 45, 85, 0.04)";
        }}
      >
        {/* Inner Core Card Container */}
        <div
          style={{
            background: "var(--surface)",
            borderRadius: "19.5px",
            border: "1px solid var(--border)",
            padding: "16px 18px",
            boxShadow: "inset 0 1px 1px rgba(255, 255, 255, 0.8)",
          }}
        >
          {/* Top Row: Vehicle Icon + Title & Plate + Linked Pos Badge */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
            {/* Haptic Thumbnail Icon Wrapper */}
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "14px",
                background: vehicle.vehicle_type === "Mobil" 
                  ? "linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)" 
                  : "linear-gradient(135deg, #eaf5fc 0%, #dbeafe 100%)",
                border: "1px solid rgba(40, 127, 240, 0.15)",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
                boxShadow: "0 2px 8px rgba(40, 127, 240, 0.12)",
              }}
            >
              {vehicle.vehicle_type === "Mobil" ? (
                <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#0284c7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
                  <circle cx="7" cy="17" r="2" />
                  <path d="M9 17h6" />
                  <circle cx="17" cy="17" r="2" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="5.5" cy="17.5" r="3.5" />
                  <circle cx="18.5" cy="17.5" r="3.5" />
                  <path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 3h2" />
                </svg>
              )}
            </div>

            {/* Title & Plate Identification */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: "15px",
                  fontWeight: 800,
                  color: "var(--navy)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  letterSpacing: "-0.2px",
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
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  flexWrap: "wrap",
                }}
              >
                <span style={{ fontWeight: 700, color: "var(--navy)", letterSpacing: "0.2px" }}>
                  {vehicle.plate_number}
                </span>
                <span style={{ color: "var(--muted)" }}>·</span>
                <span>{vehicle.vehicle_type}</span>
              </div>
            </div>

            {/* Right Chevron */}
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                background: "var(--s1)",
                display: "grid",
                placeItems: "center",
                color: "var(--text-secondary)",
                flexShrink: 0,
              }}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          {/* Badges Array: Tax + Service + BBM Efficiency Pill */}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "12px" }}>
            <VehicleStatusBadge type="tax" status={taxStatus} />
            <VehicleStatusBadge type="service" status={serviceStatus} />

            {/* BBM Fuel Efficiency Jewel Pill */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "3px 9px",
                borderRadius: "9999px",
                fontSize: "11px",
                fontWeight: 750,
                letterSpacing: "-0.1px",
                background: fuelStats.hasData 
                  ? "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)" 
                  : "#f8fafc",
                color: fuelStats.hasData ? "#059669" : "var(--text-secondary)",
                border: fuelStats.hasData 
                  ? "1px solid rgba(16, 185, 129, 0.25)" 
                  : "1px solid var(--border)",
                boxShadow: fuelStats.hasData ? "0 1px 4px rgba(16, 185, 129, 0.12)" : "none",
              }}
            >
              <span>⛽</span>
              <span>{fuelStats.efficiencyText}</span>
            </div>
          </div>

          {/* Linked Pos Eyebrow Chip (jika terhubung ke Pos) */}
          {linkedPos && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "2px 8px",
                borderRadius: "8px",
                background: "var(--s2)",
                border: "1px solid var(--border)",
                fontSize: "11px",
                fontWeight: 650,
                color: "var(--primary)",
                marginBottom: "12px",
              }}
            >
              <span>{linkedPos.icon || "🏷️"}</span>
              <span>Pos: {linkedPos.name}</span>
            </div>
          )}

          {/* Subtle Hairline Divider */}
          <div style={{ height: "1px", background: "var(--border)", opacity: 0.6, marginBottom: "12px" }} />

          {/* Bottom Metagrid: Tax Due Date & Last Odometer / Service */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "8px",
              fontSize: "12px",
            }}
          >
            <div>
              <div style={{ color: "var(--muted)", marginBottom: "2px", fontSize: "11px", fontWeight: 500 }}>
                Jatuh tempo pajak
              </div>
              <div style={{ fontWeight: 700, color: "var(--navy)", fontSize: "12.5px" }}>
                {formatDateIndo(vehicle.next_tax_due_date)}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: "var(--muted)", marginBottom: "2px", fontSize: "11px", fontWeight: 500 }}>
                Odometer saat ini
              </div>
              <div style={{ fontWeight: 700, color: "var(--navy)", fontSize: "12.5px" }}>
                {vehicle.last_odometer > 0 
                  ? `${vehicle.last_odometer.toLocaleString("id-ID")} km` 
                  : "0 km"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

