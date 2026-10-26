"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { useApp } from "@/lib/store";
import { createTrip, createTripItem } from "@/lib/wisata-service";
import { getVehicles, getVehicleFuelLogs } from "@/lib/vehicle-service";
import { calculateFuelEstimate, calculateTripDays, formatRp } from "@/lib/wisata-utils";
import type { Vehicle, VehicleFuelLog } from "@/lib/types";
import { Car, Fuel, Info, MapPin, Sparkles, AlertCircle } from "lucide-react";

export default function BaruWisataPage() {
  const router = useRouter();
  const { currentKeluarga, posList } = useApp();

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
  const [distanceKmStr, setDistanceKmStr] = useState("");
  const [tollCostStr, setTollCostStr] = useState("");
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

  // Preselect pos jika ada pos bertipe goal/liburan
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
      } else {
        setFinancePosId(posList[0].id);
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

    const est = calculateFuelEstimate(
      dist,
      fuelStats?.avgEfficiency,
      fuelStats?.lastPrice,
      selectedVehicle.vehicle_type
    );

    return {
      ...est,
      tollCost: toll,
      totalTransportCost: est.cost + toll,
    };
  }, [isRoadTrip, selectedVehicle, distanceKmStr, tollCostStr, fuelStats]);

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
    if (!currentKeluarga?.id) {
      setErrorMsg("Data keluarga tidak ditemukan");
      return;
    }

    setLoading(true);
    try {
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
        currentKeluarga.id
      );

      if (error || !newTrip) {
        throw new Error(error?.message || "Gagal membuat trip baru");
      }

      // Jika user memilih otomatis membuat item transportasi di Hari 1
      if (isRoadTrip && autoAddTransportItem && fuelEstimate && fuelEstimate.totalTransportCost > 0) {
        let descParts = [];
        if (fuelEstimate.cost > 0) descParts.push(`BBM: ${fuelEstimate.liters}L (${formatRp(fuelEstimate.cost)})`);
        if (fuelEstimate.tollCost > 0) descParts.push(`Tol: ${formatRp(fuelEstimate.tollCost)}`);

        await createTripItem(
          {
            trip_id: newTrip.id,
            day_number: 1,
            start_time: "07:00",
            category: "transport",
            title: `BBM & Tol (${selectedVehicle?.brand || "Kendaraan"})`,
            location: destination.trim(),
            estimated_cost: fuelEstimate.totalTransportCost,
            notes: descParts.join(" • ") + ` • Jarak PP ~${distanceKmStr} km`,
          },
          currentKeluarga.id
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
    <div
      style={{
        maxWidth: "480px",
        margin: "0 auto",
        minHeight: "100vh",
        backgroundColor: "var(--background, #f8fafc)",
        paddingBottom: "128px",
      }}
    >
      <PageHeader
        title="Buat Rencana Wisata"
        subtitle="Rancang petualangan baru bersama keluarga"
        backHref="/wisata"
      />

      <form onSubmit={handleSubmit} style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "16px" }}>
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
              Pos Pengeluaran Terhubung
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
              {posList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.icon} {p.name} {p.is_goal ? "(Tabungan Goal)" : ""} — Saldo: {formatRp(p.current_balance)}
                </option>
              ))}
            </select>
            <span style={{ fontSize: "11px", color: "var(--text-muted, #64748b)", display: "block", marginTop: "4px" }}>
              Pengeluaran riil di tempat wisata akan memotong saldo pos ini.
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
                      <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "6px", fontSize: "11px", color: "var(--text-muted, #64748b)" }}>
                        <Fuel size={12} style={{ color: "#2563eb" }} />
                        <span>
                          Efisiensi riil: <strong>{fuelStats.avgEfficiency ? `${fuelStats.avgEfficiency} km/l` : "Menggunakan default 10 km/l"}</strong>
                        </span>
                        {fuelStats.lastPrice && (
                          <span>• Harga: <strong>{formatRp(fuelStats.lastPrice)}/L</strong></span>
                        )}
                      </div>
                    )}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-muted, #64748b)", marginBottom: "6px" }}>
                        Jarak Tempuh PP (km)
                      </label>
                      <input
                        type="number"
                        placeholder="Contoh: 360"
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
                    </div>
                  </div>

                  {/* Ringkasan Kalkulasi Road Trip */}
                  {fuelEstimate && fuelEstimate.totalTransportCost > 0 && (
                    <div
                      style={{
                        padding: "12px",
                        borderRadius: "12px",
                        backgroundColor: "rgba(37, 99, 235, 0.08)",
                        border: "1px solid rgba(37, 99, 235, 0.2)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                        fontSize: "12px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600, color: "#1e40af" }}>
                        <span>Estimasi Kebutuhan BBM (buffer 20%):</span>
                        <span>~{fuelEstimate.liters} Liter ({formatRp(fuelEstimate.cost)})</span>
                      </div>
                      {fuelEstimate.tollCost > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b" }}>
                          <span>Tarif Tol:</span>
                          <span>{formatRp(fuelEstimate.tollCost)}</span>
                        </div>
                      )}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          paddingTop: "6px",
                          borderTop: "1px solid rgba(37, 99, 235, 0.2)",
                          fontWeight: 700,
                          fontSize: "13px",
                          color: "#1e3a8a",
                        }}
                      >
                        <span>Total Anggaran Transport:</span>
                        <span>{formatRp(fuelEstimate.totalTransportCost)}</span>
                      </div>

                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          marginTop: "6px",
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
    </div>
  );
}
