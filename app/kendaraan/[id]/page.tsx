"use client";

import React, { useState, useEffect, useCallback, use, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { Vehicle, VehicleTaxPayment, VehicleService, VehicleFuelLog } from "@/lib/types";
import {
  getVehicleById,
  getVehicleTaxPayments,
  getVehicleServices,
  getVehicleFuelLogs,
  deleteVehicleFuelTx,
  archiveVehicle,
} from "@/lib/vehicle-service";
import {
  calculateTaxStatus,
  calculateServiceStatus,
  formatDateIndo,
  formatRp,
  calculateMonthlyFuelStats,
  formatFuelEfficiency,
} from "@/lib/vehicle-utils";
import VehicleStatusBadge from "@/components/Kendaraan/VehicleStatusBadge";
import VehicleTypeIcon from "@/components/Kendaraan/VehicleTypeIcon";
import PageHeader from "@/components/PageHeader";
import ConfirmModal from "@/components/Modals/ConfirmModal";
import { useApp } from "@/lib/store";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function DetailKendaraanPage({ params }: PageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { id } = use(params);
  const { posList, cycles, setIsMutating } = useApp();

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [taxPayments, setTaxPayments] = useState<VehicleTaxPayment[]>([]);
  const [services, setServices] = useState<VehicleService[]>([]);
  const [fuelLogs, setFuelLogs] = useState<VehicleFuelLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<"bbm" | "servis" | "pajak">("bbm");

  // Modal confirmation states
  const [deleteFuelLogTarget, setDeleteFuelLogTarget] = useState<VehicleFuelLog | null>(null);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

  // Auto-switch tab jika diakses via parameter URL (misal: ?tab=bbm)
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "bbm" || tabParam === "servis" || tabParam === "pajak") {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [v, taxes, srvs, fuels] = await Promise.all([
      getVehicleById(id),
      getVehicleTaxPayments(id),
      getVehicleServices(id),
      getVehicleFuelLogs(id),
    ]);

    if (!v) {
      router.replace("/kendaraan");
      return;
    }

    setVehicle(v);
    setTaxPayments(taxes);
    setServices(srvs);
    setFuelLogs(fuels);
    setLoading(false);
  }, [id, router]);

  useEffect(() => {
    loadData();

    // Re-fetch saat tab aktif kembali
    const onFocus = () => loadData();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [loadData]);

  const handleArchive = () => {
    setShowArchiveConfirm(true);
  };

  const confirmArchive = async () => {
    setShowArchiveConfirm(false);
    const { success } = await archiveVehicle(id);
    if (success) {
      router.replace("/kendaraan");
    }
  };

  const confirmDeleteFuelLog = async () => {
    if (!deleteFuelLogTarget) return;
    const targetId = deleteFuelLogTarget.id;
    setDeleteFuelLogTarget(null);
    setIsMutating(true);
    try {
      const { success } = await deleteVehicleFuelTx(targetId);
      if (success) {
        await loadData();
      }
    } finally {
      setIsMutating(false);
    }
  };

  // Pos Keuangan Terkait
  const linkedPos = useMemo(() => {
    return posList.find((p) => p.id === vehicle?.finance_pos_id);
  }, [posList, vehicle]);

  // Statistik BBM Bulan Ini
  const activeCycle = cycles[0];
  const monthlyFuelStats = useMemo(() => {
    return calculateMonthlyFuelStats(fuelLogs, activeCycle?.start_date);
  }, [fuelLogs, activeCycle]);

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
  const totalFuelExpenseAllTime = fuelLogs.reduce((sum, f) => sum + Number(f.total_cost || 0), 0);

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
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  <span>Edit Identitas</span>
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
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="21 8 21 21 3 21 3 8" />
                    <rect x="1" y="3" width="22" height="5" />
                    <line x1="10" y1="12" x2="14" y2="12" />
                  </svg>
                  <span>Arsipkan Kendaraan</span>
                </button>
              </div>
            )}
          </div>
        }
      />

      <div style={{ padding: "0 20px" }}>
        {/* Double-Bezel Hero Header Card */}
        <div
          style={{
            borderRadius: "24px",
            padding: "3px",
            background: "linear-gradient(180deg, rgba(38, 111, 183, 0.1) 0%, rgba(16, 45, 85, 0.04) 100%)",
            boxShadow: "0 6px 20px rgba(16, 45, 85, 0.04)",
            marginBottom: "16px",
          }}
        >
          <div
            style={{
              background: "var(--surface)",
              borderRadius: "21px",
              border: "1px solid var(--border)",
              padding: "20px",
              textAlign: "center",
            }}
          >
            {/* Vehicle Icon Badge */}
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "18px",
                background: vehicle.vehicle_type === "Mobil" 
                  ? "linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)" 
                  : "linear-gradient(135deg, #eaf5fc 0%, #dbeafe 100%)",
                display: "grid",
                placeItems: "center",
                margin: "0 auto 12px",
                boxShadow: "0 4px 14px rgba(40, 127, 240, 0.15)",
                border: "1.5px solid rgba(40, 127, 240, 0.2)",
              }}
            >
              <VehicleTypeIcon type={vehicle.vehicle_type} size={48} />
            </div>

            <h1
              style={{
                fontSize: "20px",
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
              <span style={{ fontWeight: 750, color: "var(--navy)" }}>{vehicle.plate_number}</span>
              <span>·</span>
              <span>{vehicle.vehicle_type}</span>
              {linkedPos && (
                <>
                  <span>·</span>
                  <Link
                    href={`/pos/${linkedPos.id}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "2px 8px",
                      borderRadius: "6px",
                      background: "var(--s2)",
                      color: "var(--primary)",
                      textDecoration: "none",
                      fontSize: "11px",
                      fontWeight: 700,
                    }}
                  >
                    <span>{linkedPos.icon}</span>
                    <span>{linkedPos.name}</span>
                  </Link>
                </>
              )}
            </div>

            {/* Badges Array */}
            <div style={{ display: "flex", justifyContent: "center", gap: "8px", flexWrap: "wrap" }}>
              <VehicleStatusBadge type="tax" status={taxStatus} />
              <VehicleStatusBadge type="service" status={serviceStatus} />
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "4px 10px",
                  borderRadius: "9999px",
                  fontSize: "11.5px",
                  fontWeight: 750,
                  background: monthlyFuelStats.averageKmL !== null ? "#ecfdf5" : "#f8fafc",
                  color: monthlyFuelStats.averageKmL !== null ? "#059669" : "var(--text-secondary)",
                  border: monthlyFuelStats.averageKmL !== null ? "1px solid #a7f3d0" : "1px solid var(--border)",
                }}
              >
                <span>⛽</span>
                <span>
                  {monthlyFuelStats.averageKmL !== null
                    ? `${formatFuelEfficiency(monthlyFuelStats.averageKmL)} · Bulan Ini`
                    : monthlyFuelStats.hasBaselineOnly
                    ? "Baru 1x Isi Bensin"
                    : "Belum Ada Catatan BBM"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Primary Action Buttons: Isi Bensin (Hero) + Servis + Pajak */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
          {/* Island Button: Isi Bensin (Aksen Oranye Terang) */}
          <Link
            href={`/kendaraan/${id}/bbm`}
            style={{
              width: "100%",
              height: "50px",
              borderRadius: "9999px",
              background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
              color: "#ffffff",
              fontSize: "14.5px",
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 8px 0 20px",
              textDecoration: "none",
              boxShadow: "0 4px 16px rgba(245, 158, 11, 0.35)",
              boxSizing: "border-box",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span>Catat Pengisian Bensin (BBM)</span>
            </div>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.22)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="M5 12h14m-6-6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </Link>

          {/* Grid Two Secondary Buttons */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <Link
              href={`/kendaraan/${id}/servis/tambah`}
              style={{
                height: "44px",
                borderRadius: "14px",
                background: "var(--surface)",
                border: "1.5px solid var(--primary)",
                color: "var(--primary)",
                fontSize: "13px",
                fontWeight: 750,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                textDecoration: "none",
              }}
            >
              Tambah Servis
            </Link>

            <Link
              href={`/kendaraan/${id}/pajak`}
              style={{
                height: "44px",
                borderRadius: "14px",
                background: "var(--surface)",
                border: "1.5px solid #f04467",
                color: "#f04467",
                fontSize: "13px",
                fontWeight: 750,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                textDecoration: "none",
              }}
            >
              Bayar Pajak
            </Link>
          </div>
        </div>

        {/* Asymmetrical Bento Grid: Metrik Konsumsi BBM Bulan Ini */}
        <div
          style={{
            background: "var(--surface)",
            borderRadius: "20px",
            border: "1px solid var(--border)",
            padding: "18px 20px",
            marginBottom: "20px",
            boxShadow: "0 4px 16px rgba(16, 45, 85, 0.04)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <div>
              <div style={{ fontSize: "10px", fontWeight: 750, color: "#d97706", textTransform: "uppercase", letterSpacing: "0.15em" }}>
                Efisiensi Bahan Bakar
              </div>
              <h2 style={{ fontSize: "16px", fontWeight: 800, color: "var(--navy)", margin: "2px 0 0" }}>
                Performa Bulan Ini
              </h2>
            </div>
            {monthlyFuelStats.averageKmL !== null && (
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#059669", background: "#ecfdf5", padding: "2px 8px", borderRadius: "6px", border: "1px solid #a7f3d0" }}>
                Tercatat
              </span>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {/* Bento Card 1: Efisiensi (Hero) */}
            <div
              style={{
                background: "linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%)",
                border: "1px solid #fde68a",
                borderRadius: "14px",
                padding: "14px",
              }}
            >
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#92400e", marginBottom: "4px" }}>
                Konsumsi Rata-rata
              </div>
              <div style={{ fontSize: "20px", fontWeight: 850, color: "#b45309", letterSpacing: "-0.3px" }}>
                {monthlyFuelStats.averageKmL !== null
                  ? `${monthlyFuelStats.averageKmL} km/l`
                  : monthlyFuelStats.hasBaselineOnly
                  ? "Baru 1x isi"
                  : "—"}
              </div>
              <div style={{ fontSize: "10px", color: "#b45309", marginTop: "2px", opacity: 0.85 }}>
                {monthlyFuelStats.totalFills}x isi bensin bulan ini
              </div>
            </div>

            {/* Bento Card 2: Jarak Tempuh Tercatat */}
            <div
              style={{
                background: "var(--s1)",
                border: "1px solid var(--border)",
                borderRadius: "14px",
                padding: "14px",
              }}
            >
              <div style={{ fontSize: "11px", fontWeight: 650, color: "var(--text-secondary)", marginBottom: "4px" }}>
                Jarak Tempuh
              </div>
              <div style={{ fontSize: "20px", fontWeight: 850, color: "var(--navy)", letterSpacing: "-0.3px" }}>
                {monthlyFuelStats.totalDistanceKm > 0
                  ? `+${monthlyFuelStats.totalDistanceKm.toLocaleString("id-ID")} km`
                  : "0 km"}
              </div>
              <div style={{ fontSize: "10px", color: "var(--muted)", marginTop: "2px" }}>
                Hanya dari selisih BBM
              </div>
            </div>

            {/* Bento Card 3: Total Pengeluaran BBM */}
            <div
              style={{
                background: "var(--s1)",
                border: "1px solid var(--border)",
                borderRadius: "14px",
                padding: "14px",
              }}
            >
              <div style={{ fontSize: "11px", fontWeight: 650, color: "var(--text-secondary)", marginBottom: "4px" }}>
                Biaya Bahan Bakar
              </div>
              <div style={{ fontSize: "16px", fontWeight: 800, color: "var(--navy)" }}>
                {formatRp(monthlyFuelStats.totalCost)}
              </div>
              <div style={{ fontSize: "10px", color: "var(--muted)", marginTop: "2px" }}>
                Volume: {monthlyFuelStats.totalLiters} Liter
              </div>
            </div>

            {/* Bento Card 4: Biaya per KM */}
            <div
              style={{
                background: "var(--s1)",
                border: "1px solid var(--border)",
                borderRadius: "14px",
                padding: "14px",
              }}
            >
              <div style={{ fontSize: "11px", fontWeight: 650, color: "var(--text-secondary)", marginBottom: "4px" }}>
                Biaya per KM
              </div>
              <div style={{ fontSize: "16px", fontWeight: 800, color: "var(--navy)" }}>
                {monthlyFuelStats.costPerKm !== null ? `Rp ${monthlyFuelStats.costPerKm.toLocaleString("id-ID")} / km` : "—"}
              </div>
              <div style={{ fontSize: "10px", color: "var(--muted)", marginTop: "2px" }}>
                Efisiensi biaya riil
              </div>
            </div>
          </div>
        </div>

        {/* Informasi Kendaraan */}
        <div
          style={{
            background: "var(--surface)",
            borderRadius: "18px",
            border: "1px solid var(--border)",
            padding: "16px 18px",
            marginBottom: "20px",
            boxShadow: "0 4px 14px rgba(16, 45, 85, 0.04)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h2 style={{ fontSize: "14px", fontWeight: 800, color: "var(--navy)", margin: 0 }}>
              Informasi Kendaraan
            </h2>
            <Link
              href={`/kendaraan/${id}/edit`}
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: "var(--primary)",
                textDecoration: "none",
              }}
            >
              Edit
            </Link>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)" }}>Merek & Tipe</span>
              <span style={{ fontWeight: 700, color: "var(--navy)" }}>{vehicle.brand} {vehicle.model}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)" }}>Pos Anggaran</span>
              <span style={{ fontWeight: 700, color: linkedPos ? "var(--primary)" : "var(--muted)" }}>
                {linkedPos ? `${linkedPos.icon} ${linkedPos.name}` : "Belum dihubungkan"}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)" }}>Tanggal Pajak Berikutnya</span>
              <span style={{ fontWeight: 750, color: taxStatus === "Terlambat" ? "#ef4444" : "var(--navy)" }}>
                {formatDateIndo(vehicle.next_tax_due_date)}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)" }}>Servis Terakhir</span>
              <span style={{ fontWeight: 650, color: "var(--navy)" }}>
                {vehicle.last_service_date ? formatDateIndo(vehicle.last_service_date) : "Belum dicatat"}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)" }}>Odometer Terakhir</span>
              <span style={{ fontWeight: 750, color: "var(--navy)" }}>
                {vehicle.last_odometer > 0 ? `${vehicle.last_odometer.toLocaleString("id-ID")} km` : "0 km"}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Nav: Riwayat BBM | Riwayat Servis | Riwayat Pajak */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "6px",
            background: "var(--s1)",
            padding: "4px",
            borderRadius: "14px",
            marginBottom: "16px",
            border: "1px solid var(--border)",
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab("bbm")}
            style={{
              padding: "9px 6px",
              borderRadius: "10px",
              border: "none",
              background: activeTab === "bbm" ? "var(--surface)" : "transparent",
              color: activeTab === "bbm" ? "#b45309" : "var(--text-secondary)",
              fontWeight: 750,
              fontSize: "12px",
              cursor: "pointer",
              boxShadow: activeTab === "bbm" ? "0 2px 8px rgba(245, 158, 11, 0.15)" : "none",
            }}
          >
            BBM ({fuelLogs.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("servis")}
            style={{
              padding: "9px 6px",
              borderRadius: "10px",
              border: "none",
              background: activeTab === "servis" ? "var(--surface)" : "transparent",
              color: activeTab === "servis" ? "var(--primary)" : "var(--text-secondary)",
              fontWeight: 750,
              fontSize: "12px",
              cursor: "pointer",
              boxShadow: activeTab === "servis" ? "0 2px 8px rgba(40, 127, 240, 0.15)" : "none",
            }}
          >
            Servis ({services.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("pajak")}
            style={{
              padding: "9px 6px",
              borderRadius: "10px",
              border: "none",
              background: activeTab === "pajak" ? "var(--surface)" : "transparent",
              color: activeTab === "pajak" ? "#f04467" : "var(--text-secondary)",
              fontWeight: 750,
              fontSize: "12px",
              cursor: "pointer",
              boxShadow: activeTab === "pajak" ? "0 2px 8px rgba(240, 68, 103, 0.15)" : "none",
            }}
          >
            Pajak ({taxPayments.length})
          </button>
        </div>

        {/* Tab Content: Riwayat BBM */}
        {activeTab === "bbm" && (
          <div>
            {fuelLogs.length === 0 ? (
              <div
                style={{
                  background: "var(--surface)",
                  borderRadius: "16px",
                  border: "1px dashed var(--border)",
                  padding: "30px 20px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "32px", marginBottom: "8px" }}>⛽</div>
                <div style={{ fontSize: "14px", fontWeight: 750, color: "var(--navy)", marginBottom: "4px" }}>
                  Belum Ada Catatan Pengisian BBM
                </div>
                <div style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "16px" }}>
                  Mulai catat bensin untuk memantau konsumsi km/liter kendaraan ini.
                </div>
                <Link
                  href={`/kendaraan/${id}/bbm`}
                  style={{
                    display: "inline-block",
                    padding: "8px 18px",
                    borderRadius: "10px",
                    background: "#f59e0b",
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: 750,
                    textDecoration: "none",
                  }}
                >
                  Catat Pengisian Pertama
                </Link>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {fuelLogs.map((log) => {
                  const hasEfficiency = typeof log.efficiency_km_l === "number" && log.efficiency_km_l > 0;
                  const isHighlighted = Boolean(
                    searchParams.get("txId") && log.finance_transaction_id === searchParams.get("txId")
                  );
                  return (
                    <div
                      key={log.id}
                      style={{
                        background: isHighlighted ? "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)" : "var(--surface)",
                        borderRadius: "16px",
                        border: isHighlighted ? "1.5px solid #f59e0b" : "1px solid var(--border)",
                        padding: "14px 16px",
                        boxShadow: isHighlighted ? "0 4px 14px rgba(245, 158, 11, 0.18)" : "0 2px 8px rgba(16, 45, 85, 0.03)",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ fontSize: "13.5px", fontWeight: 800, color: "var(--navy)" }}>
                              {log.fuel_type}
                            </span>
                            <span style={{ fontSize: "11px", color: "var(--muted)" }}>·</span>
                            <span style={{ fontSize: "11.5px", color: "var(--muted)" }}>
                              {formatDateIndo(log.log_date)}
                            </span>
                            {isHighlighted && (
                              <span
                                style={{
                                  fontSize: "10.5px",
                                  fontWeight: 750,
                                  color: "#b45309",
                                  background: "#fde68a",
                                  padding: "1px 6px",
                                  borderRadius: "6px",
                                }}
                              >
                                Terpilih
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
                            Odometer: <strong style={{ color: "var(--navy)" }}>{log.odometer_km.toLocaleString("id-ID")} km</strong>
                            {typeof log.distance_km === "number" && (
                              <span style={{ color: "#059669", fontWeight: 700, marginLeft: "6px" }}>
                                (+{log.distance_km.toLocaleString("id-ID")} km)
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Efisiensi Badge */}
                        <div
                          style={{
                            padding: "4px 8px",
                            borderRadius: "8px",
                            fontSize: "11.5px",
                            fontWeight: 800,
                            background: hasEfficiency ? "#ecfdf5" : "var(--s2)",
                            color: hasEfficiency ? "#059669" : "var(--muted)",
                            border: hasEfficiency ? "1px solid #a7f3d0" : "1px solid var(--border)",
                          }}
                        >
                          {hasEfficiency ? `${log.efficiency_km_l} km/l` : "—"}
                        </div>
                      </div>

                      <div style={{ height: "1px", background: "var(--border)", opacity: 0.6, margin: "8px 0" }} />

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px" }}>
                        <div>
                          <span style={{ color: "var(--muted)" }}>Biaya: </span>
                          <strong style={{ color: "var(--navy)" }}>{formatRp(log.total_cost)}</strong>
                          <span style={{ color: "var(--muted)", margin: "0 4px" }}>·</span>
                          <span style={{ color: "var(--text-secondary)" }}>{log.fuel_liters} L</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDeleteFuelLogTarget(log)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "var(--muted)",
                            fontSize: "11px",
                            fontWeight: 600,
                            cursor: "pointer",
                            padding: "2px 6px",
                          }}
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab Content: Riwayat Servis */}
        {activeTab === "servis" && (
          <div>
            {services.length === 0 ? (
              <div
                style={{
                  background: "var(--surface)",
                  borderRadius: "16px",
                  border: "1px dashed var(--border)",
                  padding: "30px 20px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "14px", fontWeight: 750, color: "var(--navy)", marginBottom: "4px" }}>
                  Belum Ada Riwayat Servis
                </div>
                <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                  Catat servis rutin atau servis besar kendaraan Anda.
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {services.map((srv) => (
                  <div
                    key={srv.id}
                    style={{
                      background: "var(--surface)",
                      borderRadius: "16px",
                      border: "1px solid var(--border)",
                      padding: "14px 16px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                      <span style={{ fontSize: "13.5px", fontWeight: 750, color: "var(--navy)" }}>
                        {srv.service_type}
                      </span>
                      <span style={{ fontSize: "13.5px", fontWeight: 800, color: "var(--navy)" }}>
                        {formatRp(srv.total_cost)}
                      </span>
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                      {formatDateIndo(srv.service_date)} · {srv.odometer_km.toLocaleString("id-ID")} km
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab Content: Riwayat Pajak */}
        {activeTab === "pajak" && (
          <div>
            {taxPayments.length === 0 ? (
              <div
                style={{
                  background: "var(--surface)",
                  borderRadius: "16px",
                  border: "1px dashed var(--border)",
                  padding: "30px 20px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "14px", fontWeight: 750, color: "var(--navy)", marginBottom: "4px" }}>
                  Belum Ada Riwayat Pembayaran Pajak
                </div>
                <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                  Catat pembayaran pajak tahunan kendaraan Anda.
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {taxPayments.map((tax) => (
                  <div
                    key={tax.id}
                    style={{
                      background: "var(--surface)",
                      borderRadius: "16px",
                      border: "1px solid var(--border)",
                      padding: "14px 16px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                      <span style={{ fontSize: "13.5px", fontWeight: 750, color: "var(--navy)" }}>
                        Pajak Periode {tax.tax_period}
                      </span>
                      <span style={{ fontSize: "13.5px", fontWeight: 800, color: "var(--navy)" }}>
                        {formatRp(tax.amount)}
                      </span>
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                      Dibayar: {formatDateIndo(tax.payment_date)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Konfirmasi Hapus Catatan BBM */}
      <ConfirmModal
        isOpen={!!deleteFuelLogTarget}
        title="Hapus Catatan Bensin?"
        message={
          deleteFuelLogTarget
            ? `Hapus catatan bensin ${deleteFuelLogTarget.fuel_type} (${formatRp(deleteFuelLogTarget.total_cost)}) tanggal ${formatDateIndo(deleteFuelLogTarget.log_date)}? Saldo pos keuangan akan dikembalikan otomatis.`
            : ""
        }
        confirmText="Hapus"
        cancelText="Batal"
        onConfirm={confirmDeleteFuelLog}
        onCancel={() => setDeleteFuelLogTarget(null)}
        isDanger={true}
      />

      {/* Modal Konfirmasi Arsip Kendaraan */}
      <ConfirmModal
        isOpen={showArchiveConfirm}
        title="Arsipkan Kendaraan?"
        message="Kendaraan tidak akan muncul di daftar aktif armada, namun seluruh riwayat pengeluaran dan catatan bensin tetap tersimpan dengan aman."
        confirmText="Arsipkan"
        cancelText="Batal"
        onConfirm={confirmArchive}
        onCancel={() => setShowArchiveConfirm(false)}
        isDanger={true}
      />
    </main>
  );
}

