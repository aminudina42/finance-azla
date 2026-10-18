"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Vehicle, VehicleTaxPayment } from "@/lib/types";
import { getVehicleById, getVehicleTaxPayments } from "@/lib/vehicle-service";
import { formatDateIndo, formatRp } from "@/lib/vehicle-utils";
import VehicleHeaderCard from "@/components/Kendaraan/VehicleHeaderCard";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function RiwayatPajakPage({ params }: PageProps) {
  const router = useRouter();
  const { id } = use(params);

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [payments, setPayments] = useState<VehicleTaxPayment[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [v, taxList] = await Promise.all([
      getVehicleById(id),
      getVehicleTaxPayments(id),
    ]);

    if (!v) {
      router.replace("/kendaraan");
      return;
    }

    setVehicle(v);
    setPayments(taxList);
    setLoading(false);
  }, [id, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading || !vehicle) {
    return (
      <main className="page active" style={{ paddingBottom: "90px" }}>
        <div style={{ textAlign: "center", padding: "80px 20px", color: "var(--muted)" }}>
          Memuat riwayat pajak...
        </div>
      </main>
    );
  }

  return (
    <main className="page active" style={{ paddingBottom: "90px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px 12px",
          background: "var(--bg)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            type="button"
            onClick={() => router.push(`/kendaraan/${id}`)}
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--navy)",
              cursor: "pointer",
            }}
            aria-label="Kembali"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1
            style={{
              fontSize: "18px",
              fontWeight: 800,
              color: "var(--navy)",
              margin: 0,
              letterSpacing: "-0.3px",
            }}
          >
            Riwayat Pajak
          </h1>
        </div>

        <Link
          href={`/kendaraan/${id}/pajak`}
          style={{
            padding: "6px 12px",
            borderRadius: "10px",
            background: "var(--primary)",
            color: "#ffffff",
            fontSize: "12px",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          + Bayar
        </Link>
      </div>

      <div style={{ padding: "0 20px" }}>
        {/* Compact Header Card */}
        <VehicleHeaderCard vehicle={vehicle} />

        {payments.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "50px 20px",
              background: "var(--surface)",
              borderRadius: "16px",
              border: "1px dashed var(--border)",
              marginTop: "12px",
            }}
          >
            <div style={{ fontSize: "36px", marginBottom: "10px" }}>📑</div>
            <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--navy)", marginBottom: "4px" }}>
              Belum ada riwayat pajak
            </div>
            <div style={{ fontSize: "12.5px", color: "var(--text-secondary)", marginBottom: "16px" }}>
              Catat bukti pembayaran pajak tahunan kendaraan Anda.
            </div>
            <Link
              href={`/kendaraan/${id}/pajak`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "9px 16px",
                borderRadius: "10px",
                background: "var(--primary)",
                color: "#ffffff",
                fontSize: "13px",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Bayar Pajak Sekarang
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {payments.map((p) => (
              <div
                key={p.id}
                style={{
                  background: "var(--surface)",
                  borderRadius: "14px",
                  border: "1px solid var(--border)",
                  padding: "16px",
                  boxShadow: "0 2px 8px rgba(16, 45, 85, 0.03)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "15px", fontWeight: 800, color: "var(--navy)" }}>
                      {p.tax_period}
                    </span>
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
                      Lunas
                    </span>
                  </div>
                  <span style={{ fontSize: "14px", fontWeight: 800, color: "var(--navy)" }}>
                    {formatRp(p.amount)}
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "3px", fontSize: "12px", color: "var(--text-secondary)" }}>
                  <div>
                    Jatuh tempo: <strong style={{ color: "var(--navy)" }}>{formatDateIndo(p.next_due_date)}</strong>
                  </div>
                  <div>
                    Dibayar pada: {formatDateIndo(p.payment_date)}
                  </div>
                  {p.notes && (
                    <div style={{ marginTop: "4px", fontStyle: "italic", color: "var(--muted)" }}>
                      &ldquo;{p.notes}&rdquo;
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
