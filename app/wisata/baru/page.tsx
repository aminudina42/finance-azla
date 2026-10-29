"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { useApp } from "@/lib/store";
import { createTrip, createTripItem } from "@/lib/wisata-service";
import { getVehicles, getVehicleFuelLogs } from "@/lib/vehicle-service";
import { calculateFuelEstimate, calculateTripDays, formatRp } from "@/lib/wisata-utils";
import { supabase } from "@/lib/supabase";
import type { Vehicle, VehicleFuelLog } from "@/lib/types";
import { Car, Fuel, Info, MapPin, Sparkles, AlertCircle, ChevronDown, ChevronUp, Route, Check } from "lucide-react";

export default function BaruWisataPage() {
  const router = useRouter();
  const { currentKeluarga, currentMember, posList } = useApp();

  // Form Fields
  const [title, setTitle] = useState("");
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2); // Default 3 hari
    return d.toISOString().split("T")[0];
  });
  const [financePosId, setFinancePosId] = useState("");
  const [budgetLimitStr, setBudgetLimitStr] = useState("");
  const [notes, setNotes] = useState("");

  // Kendaraan & Road Trip State
  const [isRoadTrip, setIsRoadTrip] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [fuelLogs, setFuelLogs] = useState<VehicleFuelLog[]>([]);
  const [isRoundTrip, setIsRoundTrip] = useState(true);
  const [distanceKmStr, setDistanceKmStr] = useState("");
  const [tollCostStr, setTollCostStr] = useState("");
  const [customEfficiencyStr, setCustomEfficiencyStr] = useState("");
  const [customFuelPriceStr, setCustomFuelPriceStr] = useState("");
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [autoAddTransportItem, setAutoAddTransportItem] = useState(true);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load Vehicles
  useEffect(() => {
    getVehicles().then((data) => {
      setVehicles(data);
      if (data.length > 0) {
        setSelectedVehicleId(data[0].id);
      }
    });
  }, []);

  // Preselect pos jika ada pos bertipe goal/liburan (opsional)
  useEffect(() => {
    if (posList.length > 0 && !financePosId) {
      const holidayPos = posList.find(
        (p) =>
          p.is_goal ||
          p.name.toLowerCase().includes("liburan") ||
          p.name.toLowerCase().includes("wisata") ||
          p.name.toLowerCase().includes("rekreasi")
      );
      if (holidayPos) {
        setFinancePosId(holidayPos.id);
      }
    }
  }, [posList, financePosId]);

  // Load Fuel Logs saat kendaraan dipilih
  useEffect(() => {
    if (selectedVehicleId) {
      getVehicleFuelLogs(selectedVehicleId).then((logs) => {
        setFuelLogs(logs);
      });
    } else {
      setFuelLogs([]);
    }
  }, [selectedVehicleId]);

  // Hitung durasi hari
  const tripDays = useMemo(() => {
    return calculateTripDays(startDate, endDate);
  }, [startDate, endDate]);

  // Data kendaraan terpilih & rata-rata efisiensi BBM
  const selectedVehicle = useMemo(() => {
    return vehicles.find((v) => v.id === selectedVehicleId);
  }, [vehicles, selectedVehicleId]);

  const fuelStats = useMemo(() => {
    if (!selectedVehicle) return null;

    const validEfficiencyLogs = fuelLogs.filter(
      (l) => typeof l.efficiency_km_l === "number" && l.efficiency_km_l > 0
    );

    let avgEfficiency: number | null = null;
    if (validEfficiencyLogs.length > 0) {
      const sum = validEfficiencyLogs.reduce((acc, curr) => acc + (curr.efficiency_km_l || 0), 0);
      avgEfficiency = Math.round((sum / validEfficiencyLogs.length) * 10) / 10;
    }

    const lastLog = fuelLogs[0];
    const lastPrice = lastLog?.cost_per_liter || (lastLog?.total_cost && lastLog?.fuel_liters ? Math.round(lastLog.total_cost / lastLog.fuel_liters) : null);

    return {
      avgEfficiency,
      lastPrice,
      fuelType: lastLog?.fuel_type || "BBM",
    };
  }, [selectedVehicle, fuelLogs]);

  // Live Road Trip Calculator
  const fuelEstimate = useMemo(() => {
    if (!isRoadTrip || !selectedVehicle) return null;
    const dist = Number(distanceKmStr) || 0;
    const toll = Number(tollCostStr.replace(/\D/g, "")) || 0;

    const eff = customEfficiencyStr.trim()
      ? Number(customEfficiencyStr)
      : fuelStats?.avgEfficiency;
    const price = customFuelPriceStr.trim()
      ? Number(customFuelPriceStr.replace(/\D/g, ""))
      : fuelStats?.lastPrice;

    const est = calculateFuelEstimate(
      dist,
      eff,
      price,
      selectedVehicle.vehicle_type,
      isRoundTrip,
      20
    );

    return {
      ...est,
      tollCost: toll,
      totalTransportCost: est.cost + toll,
    };
  }, [
    isRoadTrip,
    selectedVehicle,
    distanceKmStr,
    tollCostStr,
    fuelStats,
    isRoundTrip,
    customEfficiencyStr,
    customFuelPriceStr,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!title.trim()) {
      setErrorMsg("Harap masukkan judul liburan");
      return;
    }
    if (!destination.trim()) {
      setErrorMsg("Harap tentukan kota/destinasi tujuan");
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      setErrorMsg("Tanggal kepulangan tidak boleh lebih awal dari tanggal berangkat");
      return;
    }

    setLoading(true);
    try {
      // Resolusi ID Keluarga secara bertingkat & robust
      let effectiveKeluargaId = currentKeluarga?.id || currentMember?.keluarga_id;

      if (!effectiveKeluargaId) {
        const posKeluarga = posList.find((p) => p.keluarga_id)?.keluarga_id;
        if (posKeluarga) effectiveKeluargaId = posKeluarga;
      }

      if (!effectiveKeluargaId) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user?.id) {
          const { data: mData } = await supabase
            .from("members")
            .select("keluarga_id")
            .eq("id", session.user.id)
            .maybeSingle();
          if (mData?.keluarga_id) effectiveKeluargaId = mData.keluarga_id;
        }
      }

      if (!effectiveKeluargaId) {
        try {
          const { data: rpcId } = await supabase.rpc("get_my_keluarga_id");
          if (rpcId) effectiveKeluargaId = rpcId;
        } catch {
          // ignore
        }
      }

      if (!effectiveKeluargaId) {
        setErrorMsg("Data keluarga tidak ditemukan. Harap pastikan profil keluarga Anda sudah aktif.");
        setLoading(false);
        return;
      }

      const totalBudgetLimit = Number(budgetLimitStr.replace(/\D/g, "")) || 0;

      const { data: newTrip, error } = await createTrip(
        {
          title: title.trim(),
          destination: destination.trim(),
          start_date: startDate,
          end_date: endDate,
          finance_pos_id: financePosId || null,
          vehicle_id: isRoadTrip ? selectedVehicleId || null : null,
          total_budget_limit: totalBudgetLimit,
          notes: notes.trim() || null,
          status: "planning",
        },
        effectiveKeluargaId
      );

      if (error || !newTrip) {
        throw new Error(error?.message || "Gagal membuat trip baru");
      }

      // Jika user memilih otomatis membuat item transportasi di Hari 1
      if (isRoadTrip && autoAddTransportItem && fuelEstimate && fuelEstimate.totalTransportCost > 0) {
        let descParts = [];
        if (fuelEstimate.cost > 0) descParts.push(`BBM: ${fuelEstimate.liters}L (${formatRp(fuelEstimate.cost)})`);
        if (fuelEstimate.tollCost > 0) descParts.push(`Tol: ${formatRp(fuelEstimate.tollCost)}`);

        const routeDetail = fuelEstimate.isRoundTrip
          ? `PP (${fuelEstimate.oneWayDistanceKm} km × 2 = ${fuelEstimate.baseDistanceKm} km)`
          : `Sekali Jalan (${fuelEstimate.baseDistanceKm} km)`;

        await createTripItem(
          {
            trip_id: newTrip.id,
            day_number: 1,
            start_time: "07:00",
            category: "transport",
            title: `BBM & Tol (${selectedVehicle?.brand || "Kendaraan"})`,
            location: destination.trim(),
            estimated_cost: fuelEstimate.totalTransportCost,
            notes: `${descParts.join(" • ")} • ${routeDetail} + buffer 20% (macet/keliling)`,
          },
          effectiveKeluargaId
        );
      }

      router.push(`/wisata/${newTrip.id}`);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Terjadi kesalahan saat menyimpan rencana wisata");
      setLoading(false);
    }
  };

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
        title="Buat Rencana Wisata"
        subtitle="Rancang petualangan baru bersama keluarga"
        backHref="/wisata"
      />

      <form
        onSubmit={handleSubmit}
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
        {errorMsg && (
          <div
            style={{
              padding: "12px 14px",
              borderRadius: "12px",
              backgroundColor: "rgba(240, 68, 103, 0.12)",
              color: "var(--color-danger, #f04467)",
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Informasi Utama */}
        <div
          style={{
            backgroundColor: "var(--surface, #ffffff)",
            borderRadius: "18px",
            border: "1px solid var(--border, rgba(0,0,0,0.08))",
            padding: "18px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          <h3 style={{ fontSize: "14px", fontWeight: 700, margin: 0, color: "var(--text, #1e293b)" }}>
            Detail Perjalanan
          </h3>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-muted, #64748b)", marginBottom: "6px" }}>
              Judul Liburan <span style={{ color: "red" }}>*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Liburan Seru Akhir Tahun ke Jogja"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "10px",
                border: "1px solid var(--border, #cbd5e1)",
                backgroundColor: "var(--input-bg, #ffffff)",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-muted, #64748b)", marginBottom: "6px" }}>
              Kota / Destinasi Utama <span style={{ color: "red" }}>*</span>
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                required
                placeholder="Contoh: Yogyakarta & Magelang"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 14px 10px 36px",
                  borderRadius: "10px",
                  border: "1px solid var(--border, #cbd5e1)",
                  backgroundColor: "var(--input-bg, #ffffff)",
                  fontSize: "14px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <MapPin
                size={16}
                style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--brand-primary, #287ff0)",
                }}
              />
            </div>
          </div>

          {/* Rentang Tanggal */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-muted, #64748b)", marginBottom: "6px" }}>
                Tanggal Berangkat
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: "1px solid var(--border, #cbd5e1)",
                  backgroundColor: "var(--input-bg, #ffffff)",
                  fontSize: "13px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-muted, #64748b)", marginBottom: "6px" }}>
                Tanggal Pulang
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: "1px solid var(--border, #cbd5e1)",
                  backgroundColor: "var(--input-bg, #ffffff)",
                  fontSize: "13px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          <div
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              backgroundColor: "rgba(40, 127, 240, 0.08)",
              fontSize: "12px",
              color: "var(--brand-primary, #287ff0)",
              fontWeight: 600,
            }}
          >
            Durasi Perjalanan: <strong>{tripDays} Hari</strong>
          </div>
        </div>

        {/* Sumber Dana & Pagu Anggaran */}
        <div
          style={{
            backgroundColor: "var(--surface, #ffffff)",
            borderRadius: "18px",
            border: "1px solid var(--border, rgba(0,0,0,0.08))",
            padding: "18px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          <h3 style={{ fontSize: "14px", fontWeight: 700, margin: 0, color: "var(--text, #1e293b)" }}>
            Anggaran & Sumber Dana
          </h3>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-muted, #64748b)", marginBottom: "6px" }}>
              Pos Pengeluaran Terhubung <span style={{ fontWeight: 400, color: "var(--text-muted, #64748b)" }}>(Opsional)</span>
            </label>
            <select
              value={financePosId}
              onChange={(e) => setFinancePosId(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "10px",
                border: "1px solid var(--border, #cbd5e1)",
                backgroundColor: "var(--input-bg, #ffffff)",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box",
              }}
            >
              <option value="">-- Tanpa Pos Terkait (Pilih Pos Saat Belanja) --</option>
              {posList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.icon} {p.name} {p.is_goal ? "(Tabungan Goal)" : ""} — Saldo: {formatRp(p.current_balance)}
                </option>
              ))}
            </select>
            <span style={{ fontSize: "11px", color: "var(--text-muted, #64748b)", display: "block", marginTop: "4px" }}>
              Opsional. Jika dipilih, pos ini akan menjadi pilihan bawaan saat mencatat pengeluaran agenda di lapangan.
            </span>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-muted, #64748b)", marginBottom: "6px" }}>
              Target Pagu Anggaran Liburan (Rp)
            </label>
            <input
              type="text"
              placeholder="Contoh: 5.000.000 (Kosongkan jika fleksibel)"
              value={budgetLimitStr}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, "");
                setBudgetLimitStr(raw ? Number(raw).toLocaleString("id-ID") : "");
              }}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "10px",
                border: "1px solid var(--border, #cbd5e1)",
                backgroundColor: "var(--input-bg, #ffffff)",
                fontSize: "14px",
                fontWeight: 600,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        {/* Kalkulator Road Trip BBM */}
        <div
          style={{
            backgroundColor: "var(--surface, #ffffff)",
            borderRadius: "18px",
            border: "1px solid var(--border, rgba(0,0,0,0.08))",
            padding: "18px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  backgroundColor: "rgba(37, 99, 235, 0.1)",
                  color: "#2563eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Car size={18} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "var(--text, #1e293b)" }}>
                  Gunakan Kendaraan Keluarga (Road Trip)
                </h4>
                <p style={{ margin: 0, fontSize: "11px", color: "var(--text-muted, #64748b)" }}>
                  Hitung otomatis estimasi bensin & tarif tol
                </p>
              </div>
            </div>

            <input
              type="checkbox"
              checked={isRoadTrip}
              onChange={(e) => setIsRoadTrip(e.target.checked)}
              style={{ width: "18px", height: "18px", cursor: "pointer" }}
            />
          </div>

          {isRoadTrip && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", paddingTop: "8px", borderTop: "1px dashed var(--border, #e2e8f0)" }}>
              {vehicles.length === 0 ? (
                <div style={{ fontSize: "12px", color: "var(--text-muted, #64748b)" }}>
                  Belum ada kendaraan keluarga terdaftar. Anda dapat menambahkan kendaraan di menu Kendaraan.
                </div>
              ) : (
                <>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-muted, #64748b)", marginBottom: "6px" }}>
                      Pilih Kendaraan
                    </label>
                    <select
                      value={selectedVehicleId}
                      onChange={(e) => setSelectedVehicleId(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: "10px",
                        border: "1px solid var(--border, #cbd5e1)",
                        backgroundColor: "var(--input-bg, #ffffff)",
                        fontSize: "14px",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    >
                      {vehicles.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.vehicle_type === "Motor" ? "🛵" : "🚗"} {v.brand} {v.model} ({v.plate_number})
                        </option>
                      ))}
                    </select>

                    {fuelStats && (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: "6px",
                          marginTop: "6px",
                          fontSize: "11px",
                          color: "var(--text-muted, #64748b)",
                        }}
                      >
                        <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap", minWidth: 0 }}>
                          <Fuel size={12} style={{ color: "#2563eb", flexShrink: 0 }} />
                          <span>
                            Konsumsi: <strong>{customEfficiencyStr ? `${customEfficiencyStr} km/l` : fuelStats.avgEfficiency ? `${fuelStats.avgEfficiency} km/l` : "10 km/l"}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            BBM: <strong>{customFuelPriceStr ? `${formatRp(Number(customFuelPriceStr.replace(/\D/g, "")))}/L` : fuelStats.lastPrice ? `${formatRp(fuelStats.lastPrice)}/L` : "Rp 10.000/L"}</strong>
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowAdvancedSettings((prev) => !prev)}
                          style={{
                            border: "none",
                            background: "rgba(37, 99, 235, 0.08)",
                            color: "#2563eb",
                            fontSize: "11px",
                            fontWeight: 600,
                            cursor: "pointer",
                            padding: "3px 8px",
                            borderRadius: "6px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "3px",
                            flexShrink: 0,
                          }}
                        >
                          <span>{showAdvancedSettings ? "Tutup" : "Sesuaikan"}</span>
                          {showAdvancedSettings ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Panel Kustomisasi Konsumsi & Harga BBM */}
                  {showAdvancedSettings && (
                    <div
                      style={{
                        padding: "12px",
                        borderRadius: "12px",
                        backgroundColor: "var(--background, #f8fafc)",
                        border: "1px solid var(--border, #cbd5e1)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                        fontSize: "12px",
                      }}
                    >
                      <div style={{ fontWeight: 600, color: "var(--text, #1e293b)", fontSize: "12px" }}>
                        ⚙️ Kustomisasi Efisiensi & Harga BBM
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                        <div>
                          <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--text-muted, #64748b)", marginBottom: "4px" }}>
                            Konsumsi BBM (km/L)
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            placeholder={fuelStats?.avgEfficiency ? String(fuelStats.avgEfficiency) : "10"}
                            value={customEfficiencyStr}
                            onChange={(e) => setCustomEfficiencyStr(e.target.value)}
                            style={{
                              width: "100%",
                              padding: "8px 10px",
                              borderRadius: "8px",
                              border: "1px solid var(--border, #cbd5e1)",
                              backgroundColor: "var(--surface, #ffffff)",
                              fontSize: "13px",
                              boxSizing: "border-box",
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--text-muted, #64748b)", marginBottom: "4px" }}>
                            Harga BBM per Liter (Rp)
                          </label>
                          <input
                            type="text"
                            placeholder={fuelStats?.lastPrice ? Number(fuelStats.lastPrice).toLocaleString("id-ID") : "10.000"}
                            value={customFuelPriceStr}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/\D/g, "");
                              setCustomFuelPriceStr(raw ? Number(raw).toLocaleString("id-ID") : "");
                            }}
                            style={{
                              width: "100%",
                              padding: "8px 10px",
                              borderRadius: "8px",
                              border: "1px solid var(--border, #cbd5e1)",
                              backgroundColor: "var(--surface, #ffffff)",
                              fontSize: "13px",
                              boxSizing: "border-box",
                            }}
                          />
                        </div>
                      </div>

                      {/* Preset Bensin Cepat */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
                        <span style={{ fontSize: "10px", color: "var(--text-muted, #64748b)" }}>Preset:</span>
                        {[
                          { label: "Pertalite (10k)", price: "10.000" },
                          { label: "Pertamax (12.95k)", price: "12.950" },
                          { label: "Dexlite/Solar (14k)", price: "14.000" },
                        ].map((p) => (
                          <button
                            key={p.label}
                            type="button"
                            onClick={() => setCustomFuelPriceStr(p.price)}
                            style={{
                              padding: "3px 8px",
                              borderRadius: "6px",
                              border: "1px solid var(--border, #cbd5e1)",
                              backgroundColor: customFuelPriceStr === p.price ? "#2563eb" : "var(--surface, #ffffff)",
                              color: customFuelPriceStr === p.price ? "#ffffff" : "var(--text, #1e293b)",
                              fontSize: "10px",
                              cursor: "pointer",
                            }}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pilihan Rute: Pulang-Pergi vs Sekali Jalan */}
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-muted, #64748b)", marginBottom: "6px" }}>
                      Tipe Rute Perjalanan
                    </label>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "6px",
                        padding: "3px",
                        borderRadius: "10px",
                        backgroundColor: "var(--background, #f1f5f9)",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setIsRoundTrip(true)}
                        style={{
                          padding: "8px 10px",
                          borderRadius: "8px",
                          border: "none",
                          backgroundColor: isRoundTrip ? "#2563eb" : "transparent",
                          color: isRoundTrip ? "#ffffff" : "var(--text-muted, #64748b)",
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <Route size={14} />
                        <span>Pulang-Pergi (PP)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsRoundTrip(false)}
                        style={{
                          padding: "8px 10px",
                          borderRadius: "8px",
                          border: "none",
                          backgroundColor: !isRoundTrip ? "#2563eb" : "transparent",
                          color: !isRoundTrip ? "#ffffff" : "var(--text-muted, #64748b)",
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <span>Sekali Jalan</span>
                      </button>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-muted, #64748b)", marginBottom: "6px" }}>
                        {isRoundTrip ? "Jarak Satu Arah (km)" : "Jarak Tempuh (km)"}
                      </label>
                      <input
                        type="number"
                        placeholder={isRoundTrip ? "Contoh: 180" : "Contoh: 360"}
                        min="0"
                        value={distanceKmStr}
                        onChange={(e) => setDistanceKmStr(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          borderRadius: "10px",
                          border: "1px solid var(--border, #cbd5e1)",
                          backgroundColor: "var(--input-bg, #ffffff)",
                          fontSize: "14px",
                          outline: "none",
                          boxSizing: "border-box",
                        }}
                      />
                      <span style={{ display: "block", marginTop: "4px", fontSize: "10px", color: "var(--text-muted, #64748b)" }}>
                        {isRoundTrip
                          ? `💡 Dihitung PP (2x): ${(Number(distanceKmStr) || 0) * 2} km`
                          : `Perjalanan searah: ${Number(distanceKmStr) || 0} km`}
                      </span>
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-muted, #64748b)", marginBottom: "6px" }}>
                        Estimasi Tarif Tol (Rp)
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: 150.000"
                        value={tollCostStr}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/\D/g, "");
                          setTollCostStr(raw ? Number(raw).toLocaleString("id-ID") : "");
                        }}
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          borderRadius: "10px",
                          border: "1px solid var(--border, #cbd5e1)",
                          backgroundColor: "var(--input-bg, #ffffff)",
                          fontSize: "14px",
                          outline: "none",
                          boxSizing: "border-box",
                        }}
                      />
                      <span style={{ display: "block", marginTop: "4px", fontSize: "10px", color: "var(--text-muted, #64748b)" }}>
                        Total tarif e-toll keseluruhan
                      </span>
                    </div>
                  </div>

                  {/* Ringkasan Kalkulasi Road Trip yang Transparan & Bebas Ambiguitas */}
                  {fuelEstimate && fuelEstimate.totalTransportCost > 0 && (
                    <div
                      style={{
                        padding: "14px",
                        borderRadius: "14px",
                        backgroundColor: "rgba(37, 99, 235, 0.05)",
                        border: "1px solid rgba(37, 99, 235, 0.2)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                        fontSize: "12px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 700, color: "#1e40af", fontSize: "13px" }}>
                        <Car size={16} />
                        <span>Rincian Transparan Biaya Road Trip</span>
                      </div>

                      {/* Itemized Calculation */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "11px", color: "#334155" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                          <span>Jarak Tempuh Bersih:</span>
                          <span style={{ fontWeight: 600 }}>
                            {fuelEstimate.baseDistanceKm} km{" "}
                            <span style={{ color: "var(--text-muted, #64748b)", fontWeight: 400 }}>
                              ({fuelEstimate.isRoundTrip ? `${fuelEstimate.oneWayDistanceKm} km × 2 arah` : "Sekali jalan"})
                            </span>
                          </span>
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                          <span title="Antisipasi macet liburan, AC ekstra, & muter-muter di kota tujuan">
                            Buffer Kemacetan & Keliling (+{fuelEstimate.bufferPercent}%):
                          </span>
                          <span style={{ fontWeight: 600, color: "#2563eb" }}>
                            +{fuelEstimate.bufferDistanceKm} km
                          </span>
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "6px", flexWrap: "wrap", color: "#64748b" }}>
                          <span>Total Jarak Dihitung:</span>
                          <span>{fuelEstimate.totalCalculatedDistanceKm} km</span>
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "6px", flexWrap: "wrap", paddingTop: "4px", borderTop: "1px dashed rgba(37, 99, 235, 0.15)" }}>
                          <span>Kebutuhan Bensin:</span>
                          <span style={{ fontWeight: 600 }}>
                            ~{fuelEstimate.liters} Liter{" "}
                            <span style={{ color: "var(--text-muted, #64748b)", fontWeight: 400 }}>
                              ({fuelEstimate.totalCalculatedDistanceKm} km ÷ {fuelEstimate.efficiencyUsed} km/l)
                            </span>
                          </span>
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                          <span>Biaya Bensin ({fuelEstimate.liters} L × {formatRp(fuelEstimate.priceUsed)}):</span>
                          <span style={{ fontWeight: 600, color: "#1e40af" }}>
                            {formatRp(fuelEstimate.cost)}
                          </span>
                        </div>

                        {fuelEstimate.tollCost > 0 && (
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                            <span>Estimasi Tarif Tol:</span>
                            <span style={{ fontWeight: 600, color: "#1e40af" }}>
                              {formatRp(fuelEstimate.tollCost)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Total Biaya */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "8px",
                          flexWrap: "wrap",
                          paddingTop: "8px",
                          marginTop: "2px",
                          borderTop: "1.5px solid rgba(37, 99, 235, 0.25)",
                          fontWeight: 700,
                          fontSize: "14px",
                          color: "#1e3a8a",
                        }}
                      >
                        <span>Total Anggaran Transport:</span>
                        <span>{formatRp(fuelEstimate.totalTransportCost)}</span>
                      </div>

                      {/* Checkbox auto add */}
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          marginTop: "4px",
                          cursor: "pointer",
                          fontSize: "11px",
                          color: "#1e293b",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={autoAddTransportItem}
                          onChange={(e) => setAutoAddTransportItem(e.target.checked)}
                          style={{ cursor: "pointer" }}
                        />
                        <span>Otomatis masukkan pos transport ini ke jadwal Hari ke-1</span>
                      </label>

                      {/* Notice: Tidak memotong saldo langsung */}
                      <div
                        style={{
                          fontSize: "10px",
                          color: "#64748b",
                          backgroundColor: "#ffffff",
                          padding: "6px 8px",
                          borderRadius: "6px",
                          border: "1px solid rgba(0,0,0,0.05)",
                          lineHeight: "1.4",
                        }}
                      >
                        ℹ️ <strong>Catatan:</strong> Biaya ini adalah estimasi di jadwal liburan. Saldo Pos Keuangan <strong>tidak akan terpotong</strong> sampai Anda mengonfirmasi tombol <em>Catat Aktual</em> saat liburan berlangsung.
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Catatan Tambahan */}
        <div
          style={{
            backgroundColor: "var(--surface, #ffffff)",
            borderRadius: "18px",
            border: "1px solid var(--border, rgba(0,0,0,0.08))",
            padding: "18px",
          }}
        >
          <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-muted, #64748b)", marginBottom: "6px" }}>
            Catatan Perjalanan (Opsional)
          </label>
          <textarea
            placeholder="Daftar penginapan, nomor kontak darurat, dsb."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: "10px",
              border: "1px solid var(--border, #cbd5e1)",
              backgroundColor: "var(--input-bg, #ffffff)",
              fontSize: "13px",
              outline: "none",
              boxSizing: "border-box",
              resize: "none",
            }}
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "14px",
            borderRadius: "14px",
            backgroundColor: loading ? "var(--text-muted, #94a3b8)" : "var(--brand-primary, #287ff0)",
            color: "#ffffff",
            fontSize: "15px",
            fontWeight: 700,
            border: "none",
            cursor: loading ? "not-allowed" : "pointer",
            boxShadow: "0 4px 14px rgba(40, 127, 240, 0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          <Sparkles size={18} />
          <span>{loading ? "Menyimpan Rencana..." : "Mulai Rencanakan Perjalanan"}</span>
        </button>
      </form>
    </main>
  );
}
