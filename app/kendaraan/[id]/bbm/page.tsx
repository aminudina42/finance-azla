"use client";

import React, { useState, useEffect, use, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Vehicle, VehicleFuelLog, StatusKeluarga } from "@/lib/types";
import {
  getVehicleById,
  getLastFuelLog,
  recordVehicleFuelTx,
} from "@/lib/vehicle-service";
import {
  PERTALITE_PRICE_PER_LITER,
  formatRp,
} from "@/lib/vehicle-utils";
import { useApp } from "@/lib/store";
import PageHeader from "@/components/PageHeader";

interface PageProps {
  params: Promise<{ id: string }>;
}

type FuelCategory = "Pertalite" | "Pertamax" | "Pertamax Turbo" | "BP 92" | "Lainnya";

export default function CatatBbmPage({ params }: PageProps) {
  const router = useRouter();
  const { id } = use(params);
  const { posList, currentMember, setIsMutating } = useApp();

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [lastFuelLog, setLastFuelLog] = useState<VehicleFuelLog | null>(null);
  const [loadingInit, setLoadingInit] = useState(true);

  // Form states
  const [logDate, setLogDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [odometerKm, setOdometerKm] = useState("");
  const [fuelCategory, setFuelCategory] = useState<FuelCategory>("Pertalite");
  const [customFuelName, setCustomFuelName] = useState("");
  const [costPerLiterStr, setCostPerLiterStr] = useState("10.000");
  const [nominalStr, setNominalStr] = useState("");
  const [litersStr, setLitersStr] = useState("");
  const [selectedPosId, setSelectedPosId] = useState("");
  const [notes, setNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Profil pencatat otomatis
  const userRole: StatusKeluarga =
    currentMember?.status_keluarga || (currentMember?.role === "admin" ? "suami" : "istri");
  const userName =
    currentMember?.display_name || (userRole === "suami" ? "Suami" : userRole === "istri" ? "Istri" : "Anak");
  const userId = currentMember?.id || "00000000-0000-0000-0000-000000000000";

  // Load vehicle and last fuel log
  useEffect(() => {
    async function loadVehicleAndHistory() {
      setLoadingInit(true);
      const [v, lastLog] = await Promise.all([
        getVehicleById(id),
        getLastFuelLog(id),
      ]);

      if (!v) {
        router.replace("/kendaraan");
        return;
      }

      setVehicle(v);
      setLastFuelLog(lastLog);

      // Defaultkan ke Pos yang terhubung ke kendaraan, atau pos pertama yang tersedia
      if (v.finance_pos_id) {
        setSelectedPosId(v.finance_pos_id);
      } else if (posList.length > 0) {
        const transportPos = posList.find((p) =>
          p.name.toLowerCase().includes("transport") || p.name.toLowerCase().includes("bensin")
        );
        setSelectedPosId(transportPos ? transportPos.id : posList[0].id);
      }

      setLoadingInit(false);
    }

    loadVehicleAndHistory();
  }, [id, router, posList]);

  // Efek perubahan Jenis Bahan Bakar
  useEffect(() => {
    if (fuelCategory === "Pertalite") {
      setCostPerLiterStr(PERTALITE_PRICE_PER_LITER.toLocaleString("id-ID"));
      // Recalculate if nominal already filled
      const rawNominal = parseInt(nominalStr.replace(/\D/g, ""), 10) || 0;
      if (rawNominal > 0) {
        const computedLiters = (rawNominal / PERTALITE_PRICE_PER_LITER).toFixed(2);
        setLitersStr(computedLiters);
      }
    } else if (fuelCategory === "Pertamax") {
      setCostPerLiterStr("12.950");
    } else if (fuelCategory === "Pertamax Turbo") {
      setCostPerLiterStr("14.400");
    } else if (fuelCategory === "BP 92") {
      setCostPerLiterStr("13.500");
    } else {
      setCostPerLiterStr("");
    }
  }, [fuelCategory]);

  // Handler: Ubah Nominal Rupiah -> Otomatis hitung Liter
  const handleNominalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, "");
    if (!rawVal) {
      setNominalStr("");
      setLitersStr("");
      return;
    }
    const numVal = parseInt(rawVal, 10);
    setNominalStr(numVal.toLocaleString("id-ID"));

    const rawCostPerLiter = parseInt(costPerLiterStr.replace(/\D/g, ""), 10) || 0;
    if (rawCostPerLiter > 0) {
      const computedLiters = (numVal / rawCostPerLiter).toFixed(2);
      setLitersStr(computedLiters);
    }
  };

  // Handler: Ubah Volume Liter -> Otomatis hitung Rupiah
  const handleLitersChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9.]/g, "");
    setLitersStr(val);

    const numLiters = parseFloat(val);
    const rawCostPerLiter = parseInt(costPerLiterStr.replace(/\D/g, ""), 10) || 0;
    if (!isNaN(numLiters) && numLiters > 0 && rawCostPerLiter > 0) {
      const computedNominal = Math.round(numLiters * rawCostPerLiter);
      setNominalStr(computedNominal.toLocaleString("id-ID"));
    }
  };

  // Handler: Ubah Harga per Liter
  const handleCostPerLiterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, "");
    if (!rawVal) {
      setCostPerLiterStr("");
      return;
    }
    const numVal = parseInt(rawVal, 10);
    setCostPerLiterStr(numVal.toLocaleString("id-ID"));

    const rawNominal = parseInt(nominalStr.replace(/\D/g, ""), 10) || 0;
    if (rawNominal > 0 && numVal > 0) {
      const computedLiters = (rawNominal / numVal).toFixed(2);
      setLitersStr(computedLiters);
    }
  };

  // Live calculation metrics
  const parsedOdo = parseInt(odometerKm.replace(/\D/g, ""), 10) || 0;
  const parsedNominal = parseInt(nominalStr.replace(/\D/g, ""), 10) || 0;
  const parsedLiters = parseFloat(litersStr) || 0;

  const deltaKm = useMemo(() => {
    if (!lastFuelLog || parsedOdo <= 0) return null;
    return parsedOdo - lastFuelLog.odometer_km;
  }, [lastFuelLog, parsedOdo]);

  const estimatedEfficiency = useMemo(() => {
    if (deltaKm === null || deltaKm <= 0 || parsedLiters <= 0) return null;
    return Math.round((deltaKm / parsedLiters) * 10) / 10;
  }, [deltaKm, parsedLiters]);

  const isOdoInvalid = lastFuelLog && parsedOdo > 0 && parsedOdo <= lastFuelLog.odometer_km;

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!parsedOdo || parsedOdo <= 0) {
      setErrorMsg("Kilometer odometer saat pengisian wajib diisi");
      return;
    }

    if (lastFuelLog && parsedOdo <= lastFuelLog.odometer_km) {
      setErrorMsg(
        `Kilometer saat ini (${parsedOdo.toLocaleString("id-ID")} km) harus lebih besar dari kilometer pengisian bensin sebelumnya (${lastFuelLog.odometer_km.toLocaleString("id-ID")} km)`
      );
      return;
    }

    if (!parsedNominal || parsedNominal <= 0) {
      setErrorMsg("Nominal pembelian bensin wajib diisi");
      return;
    }

    if (!parsedLiters || parsedLiters <= 0) {
      setErrorMsg("Volume liter bahan bakar wajib diisi");
      return;
    }

    if (!selectedPosId) {
      setErrorMsg("Pilih Pos Keuangan untuk memotong biaya bensin");
      return;
    }

    const finalFuelType = fuelCategory === "Lainnya" ? (customFuelName.trim() || "BBM Khusus") : fuelCategory;
    const finalCostPerLiter = parseInt(costPerLiterStr.replace(/\D/g, ""), 10) || Math.round(parsedNominal / parsedLiters);

    setIsSubmitting(true);
    setIsMutating(true);

    try {
      const { data, error } = await recordVehicleFuelTx({
        vehicle_id: id,
        log_date: logDate,
        odometer_km: parsedOdo,
        fuel_type: finalFuelType,
        cost_per_liter: finalCostPerLiter,
        fuel_liters: parsedLiters,
        total_cost: parsedNominal,
        finance_pos_id: selectedPosId,
        user_id: userId,
        user_name: userName,
        user_role: userRole,
        notes: notes.trim() || undefined,
      });

      if (error) {
        setErrorMsg(error.message || "Gagal mencatat pengisian bensin.");
        return;
      }

      // Berhasil, kembali ke detail kendaraan
      router.push(`/kendaraan/${id}`);
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan saat menyimpan data.");
    } finally {
      setIsSubmitting(false);
      setIsMutating(false);
    }
  };

  if (loadingInit || !vehicle) {
    return (
      <main className="page active" style={{ paddingBottom: "110px" }}>
        <div style={{ textAlign: "center", padding: "100px 20px", color: "var(--muted)" }}>
          Memuat formulir pengisian BBM...
        </div>
      </main>
    );
  }

  return (
    <main className="page active" style={{ paddingBottom: "120px" }}>
      {/* Top Header */}
      <PageHeader
        title="Isi Bahan Bakar"
        subtitle={`${vehicle.brand} ${vehicle.model} · ${vehicle.plate_number}`}
        backHref={`/kendaraan/${id}`}
      />

      <div style={{ padding: "0 20px" }}>
        <form onSubmit={handleSubmit}>
          {/* Double-Bezel Outer Structural Shell */}
          <div
            style={{
              borderRadius: "24px",
              padding: "3px",
              background: "linear-gradient(180deg, rgba(245, 158, 11, 0.12) 0%, rgba(16, 45, 85, 0.04) 100%)",
              boxShadow: "0 6px 24px rgba(16, 45, 85, 0.05)",
              marginBottom: "20px",
            }}
          >
            {/* Inner Core Container */}
            <div
              style={{
                background: "var(--surface)",
                borderRadius: "21px",
                border: "1px solid var(--border)",
                padding: "20px 22px",
                boxShadow: "inset 0 1px 1px rgba(255, 255, 255, 0.9)",
              }}
            >
              {/* Previous Fuel Odometer Helper Card */}
              <div
                style={{
                  background: lastFuelLog ? "#fef3c7" : "#f1f8fd",
                  border: lastFuelLog ? "1px solid #fde68a" : "1px solid var(--border)",
                  borderRadius: "14px",
                  padding: "12px 14px",
                  marginBottom: "20px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    background: lastFuelLog ? "#d97706" : "var(--primary)",
                    color: "#ffffff",
                    display: "grid",
                    placeItems: "center",
                    fontSize: "18px",
                    flexShrink: 0,
                  }}
                >
                  ⛽
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: lastFuelLog ? "#92400e" : "var(--navy)", textTransform: "uppercase", letterSpacing: "0.15em" }}>
                    {lastFuelLog ? "Pengisian Bensin Terakhir" : "Pengisian Pertama (Baseline)"}
                  </div>
                  <div style={{ fontSize: "13px", fontWeight: 750, color: "var(--navy)", marginTop: "2px" }}>
                    {lastFuelLog ? (
                      <>
                        <span>{lastFuelLog.odometer_km.toLocaleString("id-ID")} km</span>
                        <span style={{ color: "var(--muted)", fontWeight: 500, margin: "0 6px" }}>·</span>
                        <span style={{ color: "#b45309", fontWeight: 600 }}>{lastFuelLog.fuel_type}</span>
                      </>
                    ) : (
                      "Belum ada riwayat bensin. Jarak tempuh (km/l) akan mulai dihitung pada pengisian berikutnya."
                    )}
                  </div>
                </div>
              </div>

              {/* Error Message Alert */}
              {errorMsg && (
                <div
                  style={{
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    color: "#dc2626",
                    padding: "12px 14px",
                    borderRadius: "12px",
                    fontSize: "13px",
                    fontWeight: 600,
                    marginBottom: "18px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span>⚠️</span>
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Tanggal Pengisian & Odometer KM */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "20px" }}>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "12px",
                      fontWeight: 750,
                      color: "var(--navy)",
                      marginBottom: "6px",
                    }}
                  >
                    Tanggal Pengisian
                  </label>
                  <input
                    type="date"
                    value={logDate}
                    onChange={(e) => setLogDate(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "11px 14px",
                      borderRadius: "12px",
                      border: "1.5px solid var(--border)",
                      fontSize: "14px",
                      fontWeight: 650,
                      color: "var(--navy)",
                      background: "var(--s1)",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "12px",
                      fontWeight: 750,
                      color: "var(--navy)",
                      marginBottom: "6px",
                    }}
                  >
                    Kilometer Odometer Saat Ini <span style={{ color: "var(--danger)" }}>*</span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder={lastFuelLog ? `Contoh: ${(lastFuelLog.odometer_km + 200).toLocaleString("id-ID")}` : "Contoh: 15.000"}
                      value={odometerKm}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, "");
                        setOdometerKm(raw ? Number(raw).toLocaleString("id-ID") : "");
                      }}
                      style={{
                        width: "100%",
                        padding: "12px 50px 12px 14px",
                        borderRadius: "12px",
                        border: isOdoInvalid ? "2px solid #ef4444" : "1.5px solid var(--border)",
                        fontSize: "15px",
                        fontWeight: 750,
                        color: "var(--navy)",
                        background: isOdoInvalid ? "#fff5f5" : "var(--s1)",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                    <span
                      style={{
                        position: "absolute",
                        right: "14px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        fontSize: "12.5px",
                        fontWeight: 700,
                        color: "var(--muted)",
                      }}
                    >
                      KM
                    </span>
                  </div>
                  {isOdoInvalid && (
                    <div style={{ color: "#ef4444", fontSize: "11.5px", fontWeight: 650, marginTop: "4px" }}>
                      ⚠️ KM saat ini harus lebih besar dari pengisian sebelumnya ({lastFuelLog?.odometer_km.toLocaleString("id-ID")} km)
                    </div>
                  )}
                </div>
              </div>

              {/* Jenis Bahan Bakar Selector (Haptic Pill Buttons) */}
              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: 750,
                    color: "var(--navy)",
                    marginBottom: "8px",
                  }}
                >
                  Jenis Bahan Bakar
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                  {(["Pertalite", "Pertamax", "Pertamax Turbo", "BP 92", "Lainnya"] as FuelCategory[]).map((cat) => {
                    const isSelected = fuelCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setFuelCategory(cat)}
                        style={{
                          padding: "10px 8px",
                          borderRadius: "12px",
                          border: isSelected ? "2px solid #f59e0b" : "1px solid var(--border)",
                          background: isSelected ? "#fffbeb" : "var(--s1)",
                          color: isSelected ? "#b45309" : "var(--navy)",
                          fontWeight: 750,
                          fontSize: "12px",
                          cursor: "pointer",
                          transition: "all 0.2s cubic-bezier(0.32, 0.72, 0, 1)",
                          boxShadow: isSelected ? "0 2px 8px rgba(245, 158, 11, 0.2)" : "none",
                          textAlign: "center",
                        }}
                      >
                        {cat === "Pertalite" ? "🟢 Pertalite" : cat === "Pertamax" ? "🔵 Pertamax" : cat === "Pertamax Turbo" ? "🔴 Turbo" : cat === "BP 92" ? "🟡 BP 92" : "✏️ Lainnya"}
                      </button>
                    );
                  })}
                </div>

                {/* Free Text Input jika 'Lainnya' dipilih */}
                {fuelCategory === "Lainnya" && (
                  <div style={{ marginTop: "10px" }}>
                    <input
                      type="text"
                      placeholder="Nama bensin (misal: Shell Super, Dexlite, Solar)"
                      value={customFuelName}
                      onChange={(e) => setCustomFuelName(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "11px 14px",
                        borderRadius: "12px",
                        border: "1.5px solid var(--border)",
                        fontSize: "13.5px",
                        fontWeight: 650,
                        color: "var(--navy)",
                        background: "var(--s1)",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Harga per Liter */}
              <div style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 750, color: "var(--navy)" }}>
                    Harga per Liter
                  </label>
                  {fuelCategory === "Pertalite" && (
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 750,
                        color: "#059669",
                        background: "#ecfdf5",
                        padding: "2px 8px",
                        borderRadius: "6px",
                        border: "1px solid #a7f3d0",
                      }}
                    >
                      Harga Resmi Subsidi
                    </span>
                  )}
                </div>
                <div style={{ position: "relative" }}>
                  <span
                    style={{
                      position: "absolute",
                      left: "14px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      fontSize: "13.5px",
                      fontWeight: 750,
                      color: "var(--navy)",
                    }}
                  >
                    Rp
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    disabled={fuelCategory === "Pertalite"}
                    value={costPerLiterStr}
                    onChange={handleCostPerLiterChange}
                    style={{
                      width: "100%",
                      padding: "11px 45px 11px 40px",
                      borderRadius: "12px",
                      border: "1.5px solid var(--border)",
                      fontSize: "14px",
                      fontWeight: 750,
                      color: fuelCategory === "Pertalite" ? "#64748b" : "var(--navy)",
                      background: fuelCategory === "Pertalite" ? "#f1f5f9" : "var(--s1)",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      right: "14px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "var(--muted)",
                    }}
                  >
                    / Liter
                  </span>
                </div>
              </div>

              {/* Smart Calculator Grid: Nominal (Rp) <-> Liter */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "12px",
                      fontWeight: 750,
                      color: "var(--navy)",
                      marginBottom: "6px",
                    }}
                  >
                    Total Bayar <span style={{ color: "var(--danger)" }}>*</span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <span
                      style={{
                        position: "absolute",
                        left: "12px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        fontSize: "13px",
                        fontWeight: 750,
                        color: "var(--navy)",
                      }}
                    >
                      Rp
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="50.000"
                      value={nominalStr}
                      onChange={handleNominalChange}
                      style={{
                        width: "100%",
                        padding: "12px 10px 12px 36px",
                        borderRadius: "12px",
                        border: "1.5px solid var(--border)",
                        fontSize: "15px",
                        fontWeight: 800,
                        color: "var(--navy)",
                        background: "var(--s1)",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "12px",
                      fontWeight: 750,
                      color: "var(--navy)",
                      marginBottom: "6px",
                    }}
                  >
                    Volume Liter <span style={{ color: "var(--danger)" }}>*</span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="5.00"
                      value={litersStr}
                      onChange={handleLitersChange}
                      style={{
                        width: "100%",
                        padding: "12px 34px 12px 14px",
                        borderRadius: "12px",
                        border: "1.5px solid var(--border)",
                        fontSize: "15px",
                        fontWeight: 800,
                        color: "var(--navy)",
                        background: "var(--s1)",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                    <span
                      style={{
                        position: "absolute",
                        right: "12px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        fontSize: "12px",
                        fontWeight: 700,
                        color: "var(--muted)",
                      }}
                    >
                      L
                    </span>
                  </div>
                </div>
              </div>

              {/* Live Preview Card: Delta KM & Estimasi Konsumsi */}
              {deltaKm !== null && deltaKm > 0 && (
                <div
                  style={{
                    background: "linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)",
                    border: "1.5px solid #a7f3d0",
                    borderRadius: "14px",
                    padding: "14px 16px",
                    marginBottom: "20px",
                  }}
                >
                  <div style={{ fontSize: "11px", fontWeight: 750, color: "#047857", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "8px" }}>
                    ✨ Estimasi Performa Sesi Ini
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <div>
                      <div style={{ fontSize: "11px", color: "#065f46" }}>Jarak Ditempuh:</div>
                      <div style={{ fontSize: "16px", fontWeight: 800, color: "#065f46" }}>
                        +{deltaKm.toLocaleString("id-ID")} km
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "11px", color: "#065f46" }}>Konsumsi BBM:</div>
                      <div style={{ fontSize: "16px", fontWeight: 800, color: "#047857" }}>
                        {estimatedEfficiency ? `${estimatedEfficiency} km/l` : "—"}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Pos Keuangan Selector */}
              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: 750,
                    color: "var(--navy)",
                    marginBottom: "6px",
                  }}
                >
                  Potong dari Pos Keuangan <span style={{ color: "var(--danger)" }}>*</span>
                </label>
                <select
                  value={selectedPosId}
                  onChange={(e) => setSelectedPosId(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "11px 14px",
                    borderRadius: "12px",
                    border: "1.5px solid var(--border)",
                    fontSize: "13.5px",
                    fontWeight: 650,
                    color: "var(--navy)",
                    background: "var(--s1)",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                >
                  <option value="">-- Pilih Pos Keuangan --</option>
                  {posList.map((pos) => (
                    <option key={pos.id} value={pos.id}>
                      {pos.icon} {pos.name} (Saldo: {formatRp(pos.current_balance)})
                    </option>
                  ))}
                </select>
                <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "4px" }}>
                  1 Pos dapat membiayai banyak kendaraan. Saldo pos akan otomatis terpotong.
                </div>
              </div>

              {/* Catatan Tambahan (Opsional) */}
              <div style={{ marginBottom: "24px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: 750,
                    color: "var(--navy)",
                    marginBottom: "6px",
                  }}
                >
                  Catatan / Lokasi SPBU (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Misal: SPBU Pertamina Dago, Shell Pajajaran, isi full tank"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "11px 14px",
                    borderRadius: "12px",
                    border: "1.5px solid var(--border)",
                    fontSize: "13.5px",
                    color: "var(--navy)",
                    background: "var(--s1)",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Nested CTA & Island Button Architecture */}
              <button
                type="submit"
                disabled={isSubmitting || Boolean(isOdoInvalid)}
                style={{
                  width: "100%",
                  height: "50px",
                  borderRadius: "9999px",
                  background: isSubmitting || isOdoInvalid 
                    ? "#94a3b8" 
                    : "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                  color: "#ffffff",
                  fontSize: "14.5px",
                  fontWeight: 800,
                  border: "none",
                  cursor: isSubmitting || isOdoInvalid ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0 8px 0 24px",
                  boxShadow: "0 6px 18px rgba(245, 158, 11, 0.35)",
                  transition: "all 0.3s cubic-bezier(0.32, 0.72, 0, 1)",
                }}
              >
                <span>{isSubmitting ? "Menyimpan Transaksi..." : "Simpan & Potong Saldo Pos"}</span>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    background: "rgba(255, 255, 255, 0.22)",
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                  }}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4">
                    <path d="M5 12h14m-6-6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </button>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}

