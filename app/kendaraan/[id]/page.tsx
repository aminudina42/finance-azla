"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Vehicle, VehicleTaxPayment, VehicleService } from "@/lib/types";
import {
  getVehicleById,
  getVehicleTaxPayments,
  getVehicleServices,
  archiveVehicle,
} from "@/lib/vehicle-service";
import {
  calculateTaxStatus,
  calculateServiceStatus,
  formatDateIndo,
  formatRp,
} from "@/lib/vehicle-utils";
import VehicleStatusBadge from "@/components/Kendaraan/VehicleStatusBadge";
import PageHeader from "@/components/PageHeader";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function DetailKendaraanPage({ params }: PageProps) {
  const router = useRouter();
  const { id } = use(params);

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [taxPayments, setTaxPayments] = useState<VehicleTaxPayment[]>([]);
  const [services, setServices] = useState<VehicleService[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [v, taxes, srvs] = await Promise.all([
      getVehicleById(id),
      getVehicleTaxPayments(id),
      getVehicleServices(id),
    ]);

    if (!v) {
      router.replace("/kendaraan");
      return;
    }

    setVehicle(v);
    setTaxPayments(taxes);
    setServices(srvs);
    setLoading(false);
  }, [id, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleArchive = async () => {
    if (!confirm("Arsipkan kendaraan ini? Kendaraan tidak akan muncul di daftar aktif, namun riwayat transaksi tetap tersimpan.")) return;
    const { success } = await archiveVehicle(id);
    if (success) {
      router.replace("/kendaraan");
    }
  };

  if (loading || !vehicle) {
    return (
      <main className="page active" style={{ paddingBottom: "90px" }}>
        <div style={{ textAlign: "center", padding: "100px 20px", color: "var(--muted)" }}>
          Memuat detail kendaraan...
        </div>
      </main>
    );
  }

  const taxStatus = calculateTaxStatus(vehicle.next_tax_due_date);
  const serviceStatus = calculateServiceStatus(
    vehicle.last_service_date,
    vehicle.service_reminder_interval_months || 1
  );

  const totalTaxExpense = taxPayments.reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const totalServiceExpense = services.reduce((sum, s) => sum + Number(s.total_cost || 0), 0);

  return (
    <main className="page active" style={{ paddingBottom: "110px" }}>
      {/* Top Header Standardized */}
      <PageHeader
        title={vehicle ? `${vehicle.brand} ${vehicle.model}` : "Detail Kendaraan"}
        subtitle={vehicle ? `${vehicle.plate_number} · ${vehicle.vehicle_type}` : "Memuat data…"}
        backHref="/kendaraan"
        action={
          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setShowMenu(!showMenu)}
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "12px",
                display: "grid",
                placeItems: "center",
                background: "var(--surface)",
                border: "1.5px solid var(--border)",
                color: "var(--navy)",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(38, 111, 183, 0.05)",
              }}
              aria-label="Menu Opsi"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="12" cy="5" r="1.5" />
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="12" cy="19" r="1.5" />
              </svg>
            </button>

            {showMenu && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "46px",
                  width: "170px",
                  background: "var(--surface)",
                  borderRadius: "14px",
                  boxShadow: "0 10px 28px rgba(16, 45, 85, 0.14)",
                  border: "1px solid var(--border)",
                  padding: "6px",
                  zIndex: 30,
                }}
              >
                <Link
                  href={`/kendaraan/${id}/edit`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    color: "var(--navy)",
                    textDecoration: "none",
                    fontSize: "13px",
                    fontWeight: 650,
                  }}
                >
                  ✏️ Edit Identitas
                </Link>
                <button
                  type="button"
                  onClick={handleArchive}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    background: "transparent",
                    border: "none",
                    color: "var(--danger)",
                    fontSize: "13px",
                    fontWeight: 650,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  📦 Arsipkan Kendaraan
                </button>
              </div>
            )}
          </div>
        }
      />

      <div style={{ padding: "0 20px" }}>
        {/* Hero Card */}
        <div
          style={{
            background: "var(--surface)",
            borderRadius: "18px",
            border: "1px solid var(--border)",
            padding: "20px",
            marginBottom: "16px",
            boxShadow: "0 4px 14px rgba(16, 45, 85, 0.04)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "68px",
              height: "68px",
              borderRadius: "18px",
              background: vehicle.vehicle_type === "Mobil" ? "#eaf5fc" : "#f1f8fd",
              display: "grid",
              placeItems: "center",
              margin: "0 auto 12px",
            }}
          >
            {vehicle.vehicle_type === "Mobil" ? (
              <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#287ff0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
                <circle cx="7" cy="17" r="2" />
                <path d="M9 17h6" />
                <circle cx="17" cy="17" r="2" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#287ff0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="5.5" cy="17.5" r="3.5" />
                <circle cx="18.5" cy="17.5" r="3.5" />
                <path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 3h2" />
              </svg>
            )}
          </div>

          <h1
            style={{
              fontSize: "19px",
              fontWeight: 800,
              color: "var(--navy)",
              margin: "0 0 4px",
              letterSpacing: "-0.3px",
            }}
          >
            {vehicle.brand} {vehicle.model}
          </h1>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              fontSize: "13px",
              color: "var(--text-secondary)",
              marginBottom: "12px",
            }}
          >
            <span style={{ fontWeight: 700, color: "var(--text)" }}>{vehicle.plate_number}</span>
            <span>·</span>
            <span>{vehicle.vehicle_type}</span>
            <Link
              href={`/kendaraan/${id}/edit`}
              style={{
                fontSize: "11.5px",
                padding: "2px 8px",
                borderRadius: "6px",
                background: "var(--s2)",
                color: "var(--primary)",
                textDecoration: "none",
                fontWeight: 650,
                marginLeft: "4px",
              }}
            >
              Edit
            </Link>
          </div>

          {/* Badges */}
          <div style={{ display: "flex", justifyContent: "center", gap: "8px", flexWrap: "wrap" }}>
            <VehicleStatusBadge type="tax" status={taxStatus} />
            <VehicleStatusBadge type="service" status={serviceStatus} />
          </div>
        </div>

        {/* Informasi Kendaraan */}
        <div
          style={{
            background: "var(--surface)",
            borderRadius: "16px",
            border: "1px solid var(--border)",
            padding: "16px 18px",
            marginBottom: "16px",
            boxShadow: "0 4px 14px rgba(16, 45, 85, 0.04)",
          }}
        >
          <h2
            style={{
              fontSize: "13.5px",
              fontWeight: 750,
              color: "var(--navy)",
              margin: "0 0 12px",
            }}
          >
            Informasi Kendaraan
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)" }}>Merek</span>
              <span style={{ fontWeight: 650, color: "var(--navy)" }}>{vehicle.brand}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)" }}>Tipe</span>
              <span style={{ fontWeight: 650, color: "var(--navy)" }}>{vehicle.model}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)" }}>Jenis</span>
              <span style={{ fontWeight: 650, color: "var(--navy)" }}>{vehicle.vehicle_type}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)" }}>Tanggal pajak berikutnya</span>
              <span style={{ fontWeight: 700, color: taxStatus === "Terlambat" ? "#ef4444" : "var(--navy)" }}>
                {formatDateIndo(vehicle.next_tax_due_date)}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)" }}>Servis terakhir</span>
              <span style={{ fontWeight: 650, color: "var(--navy)" }}>
                {vehicle.last_service_date ? formatDateIndo(vehicle.last_service_date) : "Belum dicatat"}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)" }}>Kilometer terakhir</span>
              <span style={{ fontWeight: 650, color: "var(--navy)" }}>
                {vehicle.last_odometer > 0 ? `${vehicle.last_odometer.toLocaleString("id-ID")} km` : "0 km"}
              </span>
            </div>
          </div>
        </div>

        {/* Ringkasan Biaya */}
        <div
          style={{
            background: "var(--surface)",
            borderRadius: "16px",
            border: "1px solid var(--border)",
            padding: "16px 18px",
            marginBottom: "18px",
            boxShadow: "0 4px 14px rgba(16, 45, 85, 0.04)",
          }}
        >
          <h2
            style={{
              fontSize: "13.5px",
              fontWeight: 750,
              color: "var(--navy)",
              margin: "0 0 12px",
            }}
          >
            Ringkasan
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div
              style={{
                background: "var(--s1)",
                padding: "12px",
                borderRadius: "12px",
                border: "1px solid var(--border)",
              }}
            >
              <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>
                Pajak
              </div>
              <div style={{ fontSize: "15px", fontWeight: 800, color: "var(--navy)", marginBottom: "2px" }}>
                {formatRp(totalTaxExpense)}
              </div>
              <div style={{ fontSize: "10.5px", color: "var(--muted)" }}>
                {taxPayments.length} transaksi pembayaran
              </div>
            </div>

            <div
              style={{
                background: "var(--s1)",
                padding: "12px",
                borderRadius: "12px",
                border: "1px solid var(--border)",
              }}
            >
              <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>
                Servis
              </div>
              <div style={{ fontSize: "15px", fontWeight: 800, color: "var(--navy)", marginBottom: "2px" }}>
                {formatRp(totalServiceExpense)}
              </div>
              <div style={{ fontSize: "10.5px", color: "var(--muted)" }}>
                {services.length} riwayat servis
              </div>
            </div>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
          <Link
            href={`/kendaraan/${id}/pajak`}
            style={{
              width: "100%",
              height: "46px",
              borderRadius: "12px",
              background: "#f04467",
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: 750,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              textDecoration: "none",
              boxShadow: "0 4px 14px rgba(240, 68, 103, 0.3)",
              boxSizing: "border-box",
            }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Bayar Pajak
          </Link>

          <Link
            href={`/kendaraan/${id}/servis/tambah`}
            style={{
              width: "100%",
              height: "46px",
              borderRadius: "12px",
              background: "var(--primary)",
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: 750,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              textDecoration: "none",
              boxShadow: "0 4px 14px rgba(40, 127, 240, 0.3)",
              boxSizing: "border-box",
            }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
            Tambah Riwayat Servis
          </Link>
        </div>

        {/* Secondary Links: Riwayat Pajak & Riwayat Servis */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <Link
            href={`/kendaraan/${id}/pajak/riwayat`}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              height: "42px",
              borderRadius: "12px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--navy)",
              fontSize: "13px",
              fontWeight: 650,
              textDecoration: "none",
            }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            Riwayat Pajak
          </Link>

          <Link
            href={`/kendaraan/${id}/servis`}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              height: "42px",
              borderRadius: "12px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--navy)",
              fontSize: "13px",
              fontWeight: 650,
              textDecoration: "none",
            }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
            Riwayat Servis
          </Link>
        </div>
      </div>
    </main>
  );
}
