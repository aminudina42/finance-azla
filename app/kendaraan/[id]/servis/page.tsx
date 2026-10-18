"use client";

import React, { useState, useEffect, useCallback, useMemo, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Vehicle, VehicleService } from "@/lib/types";
import { getVehicleById, getVehicleServices } from "@/lib/vehicle-service";
import { formatDateIndo, formatRp } from "@/lib/vehicle-utils";
import VehicleHeaderCard from "@/components/Kendaraan/VehicleHeaderCard";
import PageHeader from "@/components/PageHeader";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function RiwayatServisListPage({ params }: PageProps) {
  const router = useRouter();
  const { id } = use(params);

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [services, setServices] = useState<VehicleService[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<"Semua" | "Servis Ringan" | "Servis Besar">("Semua");

  const loadData = useCallback(async () => {
    setLoading(true);
    const [v, srvs] = await Promise.all([
      getVehicleById(id),
      getVehicleServices(id),
    ]);

    if (!v) {
      router.replace("/kendaraan");
      return;
    }

    setVehicle(v);
    setServices(srvs);
    setLoading(false);
  }, [id, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredServices = useMemo(() => {
    if (filterType === "Semua") return services;
    return services.filter((s) => s.service_type === filterType);
  }, [services, filterType]);

  if (loading || !vehicle) {
    return (
      <main className="page active" style={{ paddingBottom: "90px" }}>
        <div style={{ textAlign: "center", padding: "80px 20px", color: "var(--muted)" }}>
          Memuat riwayat servis...
        </div>
      </main>
    );
  }

  return (
    <main className="page active" style={{ paddingBottom: "110px" }}>
      {/* Header Standardized */}
      <PageHeader
        title="Riwayat Servis"
        subtitle="Log perawatan dan pemeliharaan mesin"
        onBack={() => router.push(`/kendaraan/${id}`)}
        action={
          <Link
            href={`/kendaraan/${id}/servis/tambah`}
            style={{
              padding: "7px 13px",
              borderRadius: "10px",
              background: "var(--primary)",
              color: "#ffffff",
              fontSize: "12px",
              fontWeight: 700,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              boxShadow: "0 2px 8px rgba(40, 127, 240, 0.25)",
            }}
          >
            ＋ Servis
          </Link>
        }
      />

      <div style={{ padding: "0 20px" }}>
        {/* Compact Header Card */}
        <VehicleHeaderCard vehicle={vehicle} />

        {/* Filter Tabs */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            marginBottom: "14px",
          }}
        >
          {(["Semua", "Servis Ringan", "Servis Besar"] as const).map((tab) => {
            const active = filterType === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setFilterType(tab)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "999px",
                  border: active ? "1px solid var(--primary)" : "1px solid var(--border)",
                  background: active ? "var(--primary)" : "var(--surface)",
                  color: active ? "#ffffff" : "var(--text-secondary)",
                  fontSize: "12.5px",
                  fontWeight: active ? 700 : 600,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* Services List / Empty State */}
        {filteredServices.length === 0 ? (
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
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                background: "#eaf5fc",
                display: "grid",
                placeItems: "center",
                margin: "0 auto 14px",
                color: "#287ff0",
              }}
            >
              <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
              </svg>
            </div>
            <div style={{ fontSize: "16px", fontWeight: 750, color: "var(--navy)", marginBottom: "6px" }}>
              Belum ada riwayat servis
            </div>
            <div
              style={{
                fontSize: "13px",
                color: "var(--text-secondary)",
                maxWidth: "270px",
                margin: "0 auto 20px",
                lineHeight: 1.4,
              }}
            >
              Catat riwayat servis kendaraan Anda agar kondisi kendaraan tetap terjaga dan biaya perawatan tercatat dengan baik.
            </div>
            <Link
              href={`/kendaraan/${id}/servis/tambah`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "10px 20px",
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
              Tambah Riwayat Servis
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {filteredServices.map((s) => (
              <Link
                key={s.id}
                href={`/kendaraan/${id}/servis/${s.id}`}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div
                  style={{
                    background: "var(--surface)",
                    borderRadius: "14px",
                    border: "1px solid var(--border)",
                    padding: "14px 16px",
                    boxShadow: "0 2px 8px rgba(16, 45, 85, 0.03)",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "12px",
                      background: "#eaf5fc",
                      color: "#287ff0",
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                    </svg>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "11.5px", color: "var(--muted)", fontWeight: 600 }}>
                      {formatDateIndo(s.service_date)}
                    </div>
                    <div style={{ fontSize: "14.5px", fontWeight: 750, color: "var(--navy)" }}>
                      {s.service_type}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
                      {s.odometer_km.toLocaleString("id-ID")} km {s.workshop_name ? `· Bengkel ${s.workshop_name}` : ""}
                    </div>
                  </div>

                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: "14px", fontWeight: 800, color: "var(--navy)", marginBottom: "4px", fontVariantNumeric: "tabular-nums" }}>
                      {formatRp(s.total_cost)}
                    </div>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: "999px",
                        background: "#e6f8f5",
                        color: "#16a89a",
                        fontSize: "11px",
                        fontWeight: 700,
                      }}
                    >
                      Selesai
                    </span>
                  </div>

                  <div style={{ color: "var(--muted)" }}>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
