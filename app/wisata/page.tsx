"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import Skeleton from "@/components/Skeleton";
import Modal from "@/components/Modal";
import TripCard from "@/components/Wisata/TripCard";
import { useApp } from "@/lib/store";
import { getTrips } from "@/lib/wisata-service";
import { getVehicles } from "@/lib/vehicle-service";
import { supabase } from "@/lib/supabase";
import type { Trip, Vehicle } from "@/lib/types";
import { formatRp } from "@/lib/wisata-utils";
import { Plus, Compass, Palmtree, Sparkles, CheckCircle2, WifiOff, RotateCcw } from "lucide-react";

export default function WisataPage() {
  const { currentKeluarga } = useApp();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [costsMap, setCostsMap] = useState<Record<string, { actual: number; estimated: number }>>({});
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(false);
  const [activeTab, setActiveTab] = useState<"aktif" | "semua" | "selesai">("aktif");

  const loadData = useCallback(async () => {
    setLoading(true);
    setConnectionError(false);
    try {
      const [tripsData, vehiclesData] = await Promise.all([
        getTrips(currentKeluarga?.id),
        getVehicles(),
      ]);

      setTrips(tripsData);
      setVehicles(vehiclesData);

      // Ambil ringkasan biaya dari trip_items untuk semua trip yang didapat
      if (tripsData.length > 0) {
        const tripIds = tripsData.map((t) => t.id);
        const { data: itemsData } = await supabase
          .from("trip_items")
          .select("trip_id, estimated_cost, actual_cost, is_completed")
          .in("trip_id", tripIds);

        const map: Record<string, { actual: number; estimated: number }> = {};
        (itemsData || []).forEach((item) => {
          if (!map[item.trip_id]) {
            map[item.trip_id] = { actual: 0, estimated: 0 };
          }
          map[item.trip_id].estimated += Number(item.estimated_cost) || 0;
          if (item.is_completed && item.actual_cost) {
            map[item.trip_id].actual += Number(item.actual_cost) || 0;
          }
        });
        setCostsMap(map);
      }
    } catch (err) {
      console.error("Gagal memuat data wisata:", err);
      setConnectionError(true);
    } finally {
      setLoading(false);
    }
  }, [currentKeluarga?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Statistik Ringkas
  const stats = useMemo(() => {
    const activeTrips = trips.filter((t) => t.status === "planning" || t.status === "ongoing");
    const completedTrips = trips.filter((t) => t.status === "completed");
    const totalActualExpense = Object.values(costsMap).reduce((acc, curr) => acc + curr.actual, 0);

    return {
      activeCount: activeTrips.length,
      completedCount: completedTrips.length,
      totalActualExpense,
    };
  }, [trips, costsMap]);

  // Filter daftar trip
  const filteredTrips = useMemo(() => {
    if (activeTab === "aktif") {
      return trips.filter((t) => t.status === "planning" || t.status === "ongoing");
    }
    if (activeTab === "selesai") {
      return trips.filter((t) => t.status === "completed");
    }
    return trips;
  }, [trips, activeTab]);

  return (
    <main
      className="page active"
      style={{
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        overflowX: "hidden",
        backgroundColor: "var(--background, #f8fafc)",
        paddingBottom: "128px",
        boxSizing: "border-box",
      }}
    >
      <PageHeader
        title={
          <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
            <Compass size={22} style={{ color: "var(--brand-primary, #287ff0)" }} />
            <span>Itinerary & Wisata</span>
          </span>
        }
        subtitle="Rencana liburan & anggaran keluarga"
        backHref="/"
        action={
          <Link
            href="/wisata/baru"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "6px 12px",
              borderRadius: "10px",
              backgroundColor: "var(--brand-primary, #287ff0)",
              color: "#ffffff",
              fontSize: "13px",
              fontWeight: 600,
              textDecoration: "none",
              boxShadow: "0 2px 8px rgba(40, 127, 240, 0.25)",
            }}
          >
            <Plus size={16} />
            <span>Trip Baru</span>
          </Link>
        }
      />

      <div
        style={{
          padding: "16px 20px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          boxSizing: "border-box",
        }}
      >
        {/* Ringkasan Header Banner */}
        <div
          style={{
            background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)",
            borderRadius: "20px",
            padding: "20px",
            color: "#ffffff",
            boxShadow: "0 6px 20px rgba(30, 64, 175, 0.2)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ position: "relative", zIndex: 2 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", opacity: 0.9, fontSize: "12px", fontWeight: 500 }}>
              <Palmtree size={15} />
              <span>Dompet Wisata Keluarga</span>
            </div>
            <div style={{ fontSize: "24px", fontFamily: "var(--font-fraunces, serif)", fontWeight: 800, marginTop: "4px" }}>
              {formatRp(stats.totalActualExpense)}
            </div>
            <div style={{ fontSize: "12px", opacity: 0.85, marginTop: "2px" }}>
              Total realisasi pengeluaran liburan
            </div>

            <div
              style={{
                display: "flex",
                gap: "8px 12px",
                flexWrap: "wrap",
                alignItems: "center",
                marginTop: "16px",
                paddingTop: "12px",
                borderTop: "1px solid rgba(255, 255, 255, 0.18)",
                fontSize: "12px",
              }}
            >
              <div>
                <span style={{ opacity: 0.8 }}>Trip Aktif: </span>
                <strong style={{ fontWeight: 700 }}>{stats.activeCount} Rencana</strong>
              </div>
              <div style={{ opacity: 0.5 }}>•</div>
              <div>
                <span style={{ opacity: 0.8 }}>Selesai: </span>
                <strong style={{ fontWeight: 700 }}>{stats.completedCount} Kenangan</strong>
              </div>
            </div>
          </div>

          <Sparkles
            size={90}
            style={{
              position: "absolute",
              right: "-15px",
              bottom: "-15px",
              opacity: 0.15,
              pointerEvents: "none",
            }}
          />
        </div>

        {/* Tab Filter */}
        <div
          style={{
            display: "flex",
            backgroundColor: "rgba(100, 116, 139, 0.08)",
            padding: "4px",
            borderRadius: "12px",
            gap: "4px",
          }}
        >
          {[
            { id: "aktif", label: `Aktif (${stats.activeCount})` },
            { id: "selesai", label: `Selesai (${stats.completedCount})` },
            { id: "semua", label: `Semua (${trips.length})` },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  flex: 1,
                  padding: "8px 0",
                  borderRadius: "9px",
                  fontSize: "12px",
                  fontWeight: isActive ? 700 : 500,
                  border: "none",
                  cursor: "pointer",
                  backgroundColor: isActive ? "var(--surface, #ffffff)" : "transparent",
                  color: isActive ? "var(--brand-primary, #287ff0)" : "var(--text-muted, #64748b)",
                  boxShadow: isActive ? "0 2px 6px rgba(0,0,0,0.06)" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* List Perjalanan */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <Skeleton height={140} borderRadius={18} />
            <Skeleton height={140} borderRadius={18} />
          </div>
        ) : connectionError ? (
          <div
            style={{
              backgroundColor: "var(--surface, #ffffff)",
              borderRadius: "20px",
              border: "1px dashed rgba(240, 68, 103, 0.3)",
              padding: "40px 20px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                backgroundColor: "rgba(240, 68, 103, 0.1)",
                color: "#f04467",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <WifiOff size={28} />
            </div>
            <div>
              <h4 style={{ margin: "0 0 4px", fontSize: "15px", fontWeight: 700, color: "var(--text, #1e293b)" }}>
                Koneksi Internet Terganggu
              </h4>
              <p style={{ margin: 0, fontSize: "13px", color: "var(--text-muted, #64748b)", lineHeight: "1.4" }}>
                Gagal memuat rencana wisata keluarga karena gangguan jaringan.
              </p>
            </div>
            <button
              onClick={() => loadData()}
              style={{
                marginTop: "8px",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "10px 18px",
                borderRadius: "12px",
                backgroundColor: "var(--brand-primary, #287ff0)",
                color: "#ffffff",
                fontSize: "13px",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(40, 127, 240, 0.25)",
              }}
            >
              <RotateCcw size={16} />
              <span>Segarkan Halaman</span>
            </button>
          </div>
        ) : filteredTrips.length === 0 ? (
          <div
            style={{
              backgroundColor: "var(--surface, #ffffff)",
              borderRadius: "20px",
              border: "1px dashed var(--border, rgba(0,0,0,0.12))",
              padding: "40px 20px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                backgroundColor: "rgba(40, 127, 240, 0.1)",
                color: "var(--brand-primary, #287ff0)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Palmtree size={28} />
            </div>
            <div>
              <h4 style={{ margin: "0 0 4px", fontSize: "15px", fontWeight: 700, color: "var(--text, #1e293b)" }}>
                {activeTab === "aktif" ? "Belum Ada Liburan Terjadwal" : "Belum Ada Riwayat Wisata"}
              </h4>
              <p style={{ margin: 0, fontSize: "13px", color: "var(--text-muted, #64748b)", lineHeight: "1.4" }}>
                Susun jadwal perjalanan seru bersama keluarga, catat estimasi bensin mobil, dan kontrol anggaran agar tidak bocor.
              </p>
            </div>
            <Link
              href="/wisata/baru"
              style={{
                marginTop: "8px",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "10px 18px",
                borderRadius: "12px",
                backgroundColor: "var(--brand-primary, #287ff0)",
                color: "#ffffff",
                fontSize: "13px",
                fontWeight: 600,
                textDecoration: "none",
                boxShadow: "0 4px 12px rgba(40, 127, 240, 0.25)",
              }}
            >
              <Plus size={16} />
              <span>Rencanakan Liburan Sekarang</span>
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {filteredTrips.map((trip) => {
              const vehicle = vehicles.find((v) => v.id === trip.vehicle_id);
              const cost = costsMap[trip.id] || { actual: 0, estimated: 0 };
              return (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  vehicle={vehicle}
                  actualCost={cost.actual}
                  estimatedCost={cost.estimated}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Pop up pemberitahuan koneksi buruk & tombol muat ulang */}
      <Modal isOpen={connectionError} onClose={() => setConnectionError(false)}>
        <div style={{ padding: "20px 16px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              backgroundColor: "rgba(240, 68, 103, 0.12)",
              color: "#f04467",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <WifiOff size={30} />
          </div>

          <div>
            <h3 style={{ margin: "0 0 6px", fontSize: "17px", fontWeight: 700, color: "var(--text, #1e293b)" }}>
              Koneksi Internet Terganggu
            </h3>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--text-muted, #64748b)", lineHeight: "1.5" }}>
              Gagal memuat data itinerary & wisata karena gangguan jaringan. Pastikan perangkat Anda terhubung ke internet lalu muat ulang halaman.
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", width: "100%", marginTop: "6px" }}>
            <button
              onClick={() => setConnectionError(false)}
              style={{
                flex: 1,
                padding: "11px",
                borderRadius: "10px",
                border: "1px solid var(--border, #cbd5e1)",
                backgroundColor: "transparent",
                color: "var(--text-muted, #64748b)",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Tutup
            </button>
            <button
              onClick={() => {
                setConnectionError(false);
                window.location.reload();
              }}
              style={{
                flex: 2,
                padding: "11px",
                borderRadius: "10px",
                border: "none",
                backgroundColor: "var(--brand-primary, #287ff0)",
                color: "#ffffff",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                boxShadow: "0 4px 12px rgba(40, 127, 240, 0.25)",
              }}
            >
              <RotateCcw size={15} />
              <span>Muat Ulang Halaman</span>
            </button>
          </div>
        </div>
      </Modal>
    </main>
  );
}
