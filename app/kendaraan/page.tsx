"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Vehicle } from "@/lib/types";
import { getVehicles } from "@/lib/vehicle-service";
import { calculateTaxStatus, calculateServiceStatus } from "@/lib/vehicle-utils";
import VehicleCard from "@/components/Kendaraan/VehicleCard";
import VehicleTypeIcon from "@/components/Kendaraan/VehicleTypeIcon";
import PageHeader from "@/components/PageHeader";
import Skeleton from "@/components/Skeleton";

export default function KendaraanPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"semua" | "motor" | "mobil" | "pajak" | "servis">("semua");

  const loadData = useCallback(async () => {
    setLoading(true);
    const data = await getVehicles();
    setVehicles(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Counts for summary cards
  const stats = useMemo(() => {
    let taxDueCount = 0;
    let serviceDueCount = 0;

    vehicles.forEach((v) => {
      const taxStatus = calculateTaxStatus(v.next_tax_due_date);
      if (taxStatus === "Belum Bayar" || taxStatus === "Terlambat") {
        taxDueCount++;
      }

      const serviceStatus = calculateServiceStatus(
        v.last_service_date,
        v.service_reminder_interval_months || 1
      );
      if (serviceStatus === "Perlu Servis") {
        serviceDueCount++;
      }
    });

    return { taxDueCount, serviceDueCount };
  }, [vehicles]);

  // Filtered vehicles
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      // Search
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        v.plate_number.toLowerCase().includes(q) ||
        v.brand.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q);

      if (!matchSearch) return false;

      // Filter pills
      if (activeFilter === "motor") return v.vehicle_type === "Motor";
      if (activeFilter === "mobil") return v.vehicle_type === "Mobil";
      if (activeFilter === "pajak") {
        const s = calculateTaxStatus(v.next_tax_due_date);
        return s === "Belum Bayar" || s === "Terlambat";
      }
      if (activeFilter === "servis") {
        const s = calculateServiceStatus(
          v.last_service_date,
          v.service_reminder_interval_months || 1
        );
        return s === "Perlu Servis";
      }

      return true;
    });
  }, [vehicles, searchQuery, activeFilter]);

  return (
    <main className="page active" style={{ paddingBottom: "110px" }}>
      {/* Top Header Standardized */}
      <PageHeader
        title={
          <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo/icon-menu-kendaraan.png"
              alt="Menu Kendaraan"
              style={{ width: "30px", height: "30px", objectFit: "contain" }}
            />
            <span>Kendaraan</span>
          </span>
        }
        subtitle={`Kendaraan keluarga · ${vehicles.length} kendaraan`}
        backHref="/"
        action={
          <Link
            href="/kendaraan/tambah"
            style={{
              padding: "7px 12px",
              borderRadius: "10px",
              background: "var(--primary)",
              color: "#ffffff",
              fontSize: "12px",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: "5px",
              boxShadow: "0 3px 10px rgba(40, 127, 240, 0.25)",
              textDecoration: "none",
            }}
            aria-label="Tambah Kendaraan"
          >
            <span>＋</span> Tambah
          </Link>
        }
      />

      <div style={{ padding: "0 20px" }}>
        {/* Stat Summary Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "10px",
            marginTop: "6px",
            marginBottom: "16px",
          }}
        >
          {/* Card 1: Pajak perlu dibayar */}
          <div
            onClick={() => setActiveFilter(activeFilter === "pajak" ? "semua" : "pajak")}
            style={{
              background: stats.taxDueCount > 0 ? "rgba(239, 68, 68, 0.06)" : "var(--surface)",
              border: `1px solid ${stats.taxDueCount > 0 ? "rgba(239, 68, 68, 0.2)" : "var(--border)"}`,
              borderRadius: "14px",
              padding: "12px 14px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: stats.taxDueCount > 0 ? "rgba(239, 68, 68, 0.12)" : "var(--s2)",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
                color: stats.taxDueCount > 0 ? "#ef4444" : "var(--muted)",
              }}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)" }}>Pajak perlu dibayar</div>
              <div style={{ fontSize: "17px", fontWeight: 800, color: stats.taxDueCount > 0 ? "#ef4444" : "var(--navy)", minHeight: "22px" }}>
                {loading ? (
                  <Skeleton width="28px" height="20px" borderRadius="4px" style={{ marginTop: "2px" }} />
                ) : (
                  stats.taxDueCount
                )}
              </div>
            </div>
          </div>

          {/* Card 2: Perlu servis */}
          <div
            onClick={() => setActiveFilter(activeFilter === "servis" ? "semua" : "servis")}
            style={{
              background: stats.serviceDueCount > 0 ? "rgba(234, 88, 12, 0.06)" : "var(--surface)",
              border: `1px solid ${stats.serviceDueCount > 0 ? "rgba(234, 88, 12, 0.2)" : "var(--border)"}`,
              borderRadius: "14px",
              padding: "12px 14px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: stats.serviceDueCount > 0 ? "rgba(234, 88, 12, 0.12)" : "var(--s2)",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
                color: stats.serviceDueCount > 0 ? "#ea580c" : "var(--muted)",
              }}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)" }}>Perlu servis</div>
              <div style={{ fontSize: "17px", fontWeight: 800, color: stats.serviceDueCount > 0 ? "#ea580c" : "var(--navy)", minHeight: "22px" }}>
                {loading ? (
                  <Skeleton width="28px" height="20px" borderRadius="4px" style={{ marginTop: "2px" }} />
                ) : (
                  stats.serviceDueCount
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div
          style={{
            position: "relative",
            marginBottom: "12px",
          }}
        >
          <input
            type="text"
            placeholder="Cari kendaraan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              height: "44px",
              padding: "0 16px 0 40px",
              borderRadius: "12px",
              border: "1px solid var(--border)",
              background: "var(--surface)",
              fontSize: "13.5px",
              color: "var(--text)",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: "14px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--muted)",
              pointerEvents: "none",
              display: "grid",
              placeItems: "center",
            }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              style={{
                position: "absolute",
                right: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                color: "var(--muted)",
                cursor: "pointer",
                padding: "4px",
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            overflowX: "auto",
            paddingBottom: "8px",
            marginBottom: "12px",
            scrollbarWidth: "none",
          }}
        >
          {[
            { id: "semua", label: "Semua" },
            { id: "motor", label: "Motor", type: "Motor" },
            { id: "mobil", label: "Mobil", type: "Mobil" },
            { id: "pajak", label: "Pajak" },
            { id: "servis", label: "Servis" },
          ].map((pill) => {
            const active = activeFilter === pill.id;
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => setActiveFilter(pill.id as any)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "999px",
                  border: active ? "1px solid var(--primary)" : "1px solid var(--border)",
                  background: active ? "var(--primary)" : "var(--surface)",
                  color: active ? "#ffffff" : "var(--text-secondary)",
                  fontSize: "12.5px",
                  fontWeight: active ? 700 : 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.15s ease",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {pill.type && <VehicleTypeIcon type={pill.type} size={16} />}
                <span>{pill.label}</span>
              </button>
            );
          })}
        </div>

        {/* Vehicle List */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {[1, 2].map((i) => (
              <div
                key={i}
                style={{
                  background: "var(--surface)",
                  borderRadius: "18px",
                  border: "1px solid var(--border)",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <Skeleton width="42px" height="42px" borderRadius="12px" />
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <Skeleton width="130px" height="16px" borderRadius="4px" />
                      <Skeleton width="90px" height="12px" borderRadius="4px" />
                    </div>
                  </div>
                  <Skeleton width="80px" height="24px" borderRadius="6px" />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", paddingTop: "8px", borderTop: "1px solid var(--border)" }}>
                  <Skeleton height="36px" borderRadius="8px" />
                  <Skeleton height="36px" borderRadius="8px" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "50px 20px",
              background: "var(--surface)",
              borderRadius: "18px",
              border: "1px dashed var(--border)",
              marginTop: "8px",
            }}
          >
            <div
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                background: "#eaf5fc",
                display: "grid",
                placeItems: "center",
                margin: "0 auto 14px",
                color: "#287ff0",
              }}
            >
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="5.5" cy="17.5" r="3.5" />
                <circle cx="18.5" cy="17.5" r="3.5" />
                <path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 3h2" />
              </svg>
            </div>
            <div style={{ fontSize: "15.5px", fontWeight: 750, color: "var(--navy)", marginBottom: "6px" }}>
              Belum ada kendaraan yang dicatat
            </div>
            <div style={{ fontSize: "13px", color: "var(--text-secondary)", maxWidth: "260px", margin: "0 auto 18px", lineHeight: 1.4 }}>
              Catat kendaraan keluarga untuk memantau jadwal pajak dan riwayat servis.
            </div>
            <Link
              href="/kendaraan/tambah"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "10px 18px",
                borderRadius: "12px",
                background: "var(--primary)",
                color: "#ffffff",
                fontSize: "13.5px",
                fontWeight: 700,
                textDecoration: "none",
                boxShadow: "0 4px 14px rgba(40, 127, 240, 0.25)",
              }}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Tambah Kendaraan
            </Link>
          </div>
        ) : (
          filteredVehicles.map((v) => <VehicleCard key={v.id} vehicle={v} />)
        )}
      </div>
    </main>
  );
}
