"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Vehicle, VehicleService, VehicleServiceItem } from "@/lib/types";
import { getVehicleById, getVehicleServiceById } from "@/lib/vehicle-service";
import { formatDateIndo, formatRp } from "@/lib/vehicle-utils";
import VehicleHeaderCard from "@/components/Kendaraan/VehicleHeaderCard";
import PageHeader from "@/components/PageHeader";
import { useApp } from "@/lib/store";

interface PageProps {
  params: Promise<{ id: string; serviceId: string }>;
}

export default function DetailServisPage({ params }: PageProps) {
  const router = useRouter();
  const { id, serviceId } = use(params);
  const { posList } = useApp();

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [service, setService] = useState<VehicleService | null>(null);
  const [items, setItems] = useState<VehicleServiceItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [v, sData] = await Promise.all([
      getVehicleById(id),
      getVehicleServiceById(serviceId),
    ]);

    if (!v || !sData.service) {
      router.replace(`/kendaraan/${id}/servis`);
      return;
    }

    setVehicle(v);
    setService(sData.service);
    setItems(sData.items);
    setLoading(false);
  }, [id, serviceId, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading || !vehicle || !service) {
    return (
      <main className="page active" style={{ paddingBottom: "90px" }}>
        <div style={{ textAlign: "center", padding: "80px 20px", color: "var(--muted)" }}>
          Memuat detail servis...
        </div>
      </main>
    );
  }

  const pos = posList.find((p) => p.id === service.finance_pos_id);
  const partItems = items.filter((i) => i.item_category === "Part");

  return (
    <main className="page active" style={{ paddingBottom: "110px" }}>
      {/* Header Standardized */}
      <PageHeader
        title="Detail Servis"
        subtitle={`${vehicle.brand} ${vehicle.model} • ${vehicle.plate_number}`}
        onBack={() => router.push(`/kendaraan/${id}/servis`)}
      />

      <div style={{ padding: "0 20px" }}>
        {/* Compact Vehicle Card */}
        <VehicleHeaderCard vehicle={vehicle} />

        {/* Date & Service Type Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "14px",
          }}
        >
          <span style={{ fontSize: "14px", fontWeight: 750, color: "var(--navy)" }}>
            {formatDateIndo(service.service_date)}
          </span>
          <span
            style={{
              padding: "4px 10px",
              borderRadius: "999px",
              background: "#e6f8f5",
              color: "#16a89a",
              fontSize: "11.5px",
              fontWeight: 700,
            }}
          >
            {service.service_type}
          </span>
        </div>

        {/* Overview Card */}
        <div
          style={{
            background: "var(--surface)",
            borderRadius: "16px",
            border: "1px solid var(--border)",
            padding: "16px 18px",
            marginBottom: "14px",
            boxShadow: "0 4px 14px rgba(16, 45, 85, 0.04)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)" }}>Tempat / Bengkel</span>
              <span style={{ fontWeight: 650, color: "var(--navy)" }}>{service.workshop_name || "—"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)" }}>Kilometer</span>
              <span style={{ fontWeight: 650, color: "var(--navy)" }}>
                {service.odometer_km.toLocaleString("id-ID")} km
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)" }}>Pos Keuangan</span>
              <span style={{ fontWeight: 650, color: "var(--navy)" }}>{pos?.name || "Pos Keuangan"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "4px", borderTop: "1px solid var(--border)" }}>
              <span style={{ fontWeight: 700, color: "var(--navy)" }}>Total Biaya</span>
              <span style={{ fontWeight: 800, color: "var(--navy)", fontSize: "15px", fontVariantNumeric: "tabular-nums" }}>
                {formatRp(service.total_cost)}
              </span>
            </div>
          </div>
        </div>

        {/* Pekerjaan yang Dilakukan */}
        <div
          style={{
            background: "var(--surface)",
            borderRadius: "16px",
            border: "1px solid var(--border)",
            padding: "16px 18px",
            marginBottom: "14px",
          }}
        >
          <h2 style={{ fontSize: "13.5px", fontWeight: 750, color: "var(--navy)", margin: "0 0 8px" }}>
            Pekerjaan yang Dilakukan
          </h2>
          <div style={{ fontSize: "13px", color: "var(--text)", lineHeight: 1.5, whiteSpace: "pre-line" }}>
            {service.service_description}
          </div>
        </div>

        {/* Part yang Diganti (Jika ada) */}
        {partItems.length > 0 && (
          <div
            style={{
              background: "var(--surface)",
              borderRadius: "16px",
              border: "1px solid var(--border)",
              padding: "16px 18px",
              marginBottom: "14px",
            }}
          >
            <h2 style={{ fontSize: "13.5px", fontWeight: 750, color: "var(--navy)", margin: "0 0 10px" }}>
              Part yang Diganti
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {partItems.map((part) => (
                <div key={part.id} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
                  <span style={{ color: "#287ff0" }}>•</span>
                  <span style={{ fontWeight: 600, color: "var(--navy)" }}>{part.item_name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rincian Biaya Table (jika mode itemized) */}
        {service.cost_mode === "itemized" && items.length > 0 && (
          <div
            style={{
              background: "var(--surface)",
              borderRadius: "16px",
              border: "1px solid var(--border)",
              padding: "16px 18px",
              marginBottom: "20px",
            }}
          >
            <h2 style={{ fontSize: "13.5px", fontWeight: 750, color: "var(--navy)", margin: "0 0 12px" }}>
              Rincian Biaya
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "12.5px",
                    paddingBottom: "6px",
                    borderBottom: "1px dashed var(--border)",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 650, color: "var(--navy)" }}>{item.item_name}</div>
                    <span style={{ fontSize: "11px", color: "var(--muted)" }}>{item.item_category}</span>
                  </div>
                  <span style={{ fontWeight: 700, color: "var(--navy)", fontVariantNumeric: "tabular-nums" }}>
                    {formatRp(item.unit_price)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <Link
          href={`/kendaraan/${id}/servis`}
          style={{
            width: "100%",
            height: "44px",
            borderRadius: "12px",
            background: "transparent",
            color: "var(--text-secondary)",
            fontSize: "13.5px",
            fontWeight: 650,
            border: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textDecoration: "none",
          }}
        >
          Kembali ke Riwayat Servis
        </Link>
      </div>
    </main>
  );
}
