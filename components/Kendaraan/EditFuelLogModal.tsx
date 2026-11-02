"use client";

import React, { useState } from "react";
import Modal from "@/components/Modal";
import type { Vehicle, VehicleFuelLog, Pos } from "@/lib/types";
import type { UpdateFuelInput } from "@/lib/vehicle-service";
import { PERTALITE_PRICE_PER_LITER, formatRp } from "@/lib/vehicle-utils";

interface EditFuelLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  fuelLog: VehicleFuelLog | null;
  vehicle: Vehicle | null;
  posList: Pos[];
  onSave: (input: UpdateFuelInput) => Promise<void>;
}

type FuelCategory = "Pertalite" | "Pertamax" | "Pertamax Turbo" | "BP 92" | "Lainnya";

export default function EditFuelLogModal({
  isOpen,
  onClose,
  fuelLog,
  vehicle,
  posList,
  onSave,
}: EditFuelLogModalProps) {
  const initialCategory = (() => {
    const rawType = fuelLog?.fuel_type || "Pertalite";
    if (["Pertalite", "Pertamax", "Pertamax Turbo", "BP 92"].includes(rawType)) {
      return { category: rawType as FuelCategory, customName: "" };
    }
    return { category: "Lainnya" as FuelCategory, customName: rawType };
  })();

  const [logDate, setLogDate] = useState(() => fuelLog?.log_date || new Date().toISOString().split("T")[0]);
  const [odometerKm, setOdometerKm] = useState(() => fuelLog?.odometer_km ? fuelLog.odometer_km.toLocaleString("id-ID") : "");
  const [fuelCategory, setFuelCategory] = useState<FuelCategory>(initialCategory.category);
  const [customFuelName, setCustomFuelName] = useState(initialCategory.customName);
  const [costPerLiterStr, setCostPerLiterStr] = useState(() => {
    const costPerL = fuelLog?.cost_per_liter || 0;
    return costPerL > 0 ? costPerL.toLocaleString("id-ID") : "10.000";
  });
  const [nominalStr, setNominalStr] = useState(() => fuelLog?.total_cost ? fuelLog.total_cost.toLocaleString("id-ID") : "");
  const [litersStr, setLitersStr] = useState(() => fuelLog?.fuel_liters ? fuelLog.fuel_liters.toString() : "");
  const [selectedPosId, setSelectedPosId] = useState(() => fuelLog?.finance_pos_id || (vehicle?.finance_pos_id || ""));
  const [notes, setNotes] = useState(() => fuelLog?.notes || "");

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Handler pergantian kategori bahan bakar
  const handleCategorySelect = (category: FuelCategory) => {
    setFuelCategory(category);
    let newPrice = 0;
    if (category === "Pertalite") newPrice = PERTALITE_PRICE_PER_LITER;
    else if (category === "Pertamax") newPrice = 12950;
    else if (category === "Pertamax Turbo") newPrice = 14400;
    else if (category === "BP 92") newPrice = 13500;

    if (newPrice > 0) {
      setCostPerLiterStr(newPrice.toLocaleString("id-ID"));
      const rawNominal = parseInt(nominalStr.replace(/\D/g, ""), 10) || 0;
      if (rawNominal > 0) {
        setLitersStr((rawNominal / newPrice).toFixed(2));
      }
    }
  };

  // Handler: Ubah Nominal Rupiah -> Hitung Liter
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
      setLitersStr((numVal / rawCostPerLiter).toFixed(2));
    }
  };

  // Handler: Ubah Volume Liter -> Hitung Rupiah
  const handleLitersChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(",", ".").replace(/[^0-9.]/g, "");
    const parts = val.split(".");
    if (parts.length > 2) {
      val = parts[0] + "." + parts.slice(1).join("");
    }
    setLitersStr(val);

    const numLiters = parseFloat(val);
    const rawCostPerLiter = parseInt(costPerLiterStr.replace(/\D/g, ""), 10) || 0;
    if (!isNaN(numLiters) && numLiters > 0 && rawCostPerLiter > 0) {
      setNominalStr(Math.round(numLiters * rawCostPerLiter).toLocaleString("id-ID"));
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fuelLog || !vehicle || submitting) return;

    setErrorMsg("");

    const rawOdo = parseInt(odometerKm.replace(/\D/g, ""), 10);
    if (isNaN(rawOdo) || rawOdo < 0) {
      setErrorMsg("Odometer kendaraan tidak valid.");
      return;
    }

    const rawNominal = parseInt(nominalStr.replace(/\D/g, ""), 10);
    if (!rawNominal || rawNominal <= 0) {
      setErrorMsg("Nominal pengeluaran bensin wajib diisi.");
      return;
    }

    const rawLiters = parseFloat(litersStr);
    if (!rawLiters || rawLiters <= 0) {
      setErrorMsg("Volume liter bensin harus lebih dari 0.");
      return;
    }

    if (!selectedPosId) {
      setErrorMsg("Pilih Pos Pengeluaran sumber dana.");
      return;
    }

    const finalFuelType = fuelCategory === "Lainnya" ? (customFuelName.trim() || "BBM") : fuelCategory;
    const rawCostPerLiter = parseInt(costPerLiterStr.replace(/\D/g, ""), 10) || null;

    setSubmitting(true);
    try {
      await onSave({
        fuel_log_id: fuelLog.id,
        vehicle_id: vehicle.id,
        log_date: logDate,
        odometer_km: rawOdo,
        fuel_type: finalFuelType,
        cost_per_liter: rawCostPerLiter,
        fuel_liters: rawLiters,
        total_cost: rawNominal,
        finance_pos_id: selectedPosId,
        notes: notes.trim() || null,
      });
      onClose();
    } catch (err: unknown) {
      console.error("Error editing fuel log:", err);
      const msg = err instanceof Error ? err.message : "Gagal memperbarui catatan BBM.";
      setErrorMsg(msg);
      setSubmitting(false);
    }
  };

  const selectedPos = posList.find((p) => p.id === selectedPosId);

  return (
    <Modal isOpen={isOpen} onClose={onClose} isLocked={submitting}>
      <div style={{ padding: "4px 4px 16px" }}>
        {/* Header Modal */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
          <div>
            <div style={{ fontSize: "11px", fontWeight: 750, color: "#d97706", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Koreksi Catatan
            </div>
            <h2 style={{ fontSize: "18px", fontWeight: 800, color: "var(--navy)", margin: "2px 0 0" }}>
              Edit Riwayat BBM
            </h2>
            <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>
              {vehicle?.brand} {vehicle?.model} ({vehicle?.plate_number})
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={{
              background: "var(--s1)",
              border: "1px solid var(--border)",
              borderRadius: "50%",
              width: "32px",
              height: "32px",
              display: "grid",
              placeItems: "center",
              fontSize: "14px",
              color: "var(--muted)",
              cursor: submitting ? "not-allowed" : "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div
            style={{
              padding: "10px 14px",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "12px",
              color: "#dc2626",
              fontSize: "12px",
              fontWeight: 650,
              marginBottom: "16px",
            }}
          >
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* Row 1: Tanggal & Odometer */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "4px" }}>
                Tanggal Pengisian
              </label>
              <input
                type="date"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "10px",
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  color: "var(--navy)",
                  fontSize: "13px",
                  fontWeight: 650,
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "4px" }}>
                Odometer Saat Ini (KM)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={odometerKm}
                onChange={(e) => setOdometerKm(e.target.value.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, "."))}
                placeholder="misal: 12.500"
                required
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "10px",
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  color: "var(--navy)",
                  fontSize: "13px",
                  fontWeight: 700,
                }}
              />
            </div>
          </div>

          {/* Row 2: Pilihan Jenis Bahan Bakar */}
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "6px" }}>
              Jenis Bahan Bakar
            </label>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {(["Pertalite", "Pertamax", "Pertamax Turbo", "BP 92", "Lainnya"] as FuelCategory[]).map((cat) => {
                const isSelected = fuelCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleCategorySelect(cat)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "8px",
                      fontSize: "11.5px",
                      fontWeight: 700,
                      border: isSelected ? "1.5px solid #d97706" : "1px solid var(--border)",
                      background: isSelected ? "#fffbeb" : "var(--surface)",
                      color: isSelected ? "#b45309" : "var(--text-secondary)",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
            {fuelCategory === "Lainnya" && (
              <input
                type="text"
                value={customFuelName}
                onChange={(e) => setCustomFuelName(e.target.value)}
                placeholder="Ketik nama bahan bakar..."
                style={{
                  width: "100%",
                  marginTop: "8px",
                  padding: "8px 12px",
                  borderRadius: "10px",
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  color: "var(--navy)",
                  fontSize: "12.5px",
                }}
              />
            )}
          </div>

          {/* Row 3: Bi-directional Biaya & Volume */}
          <div
            style={{
              background: "var(--s1)",
              borderRadius: "14px",
              padding: "12px 14px",
              border: "1px solid var(--border)",
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "10px", marginBottom: "8px" }}>
              <div>
                <label style={{ display: "block", fontSize: "10.5px", fontWeight: 700, color: "var(--muted)", marginBottom: "3px" }}>
                  Total Biaya (Rp)
                </label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "10px", top: "9px", fontSize: "12px", fontWeight: 700, color: "var(--muted)" }}>
                    Rp
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={nominalStr}
                    onChange={handleNominalChange}
                    placeholder="0"
                    required
                    style={{
                      width: "100%",
                      padding: "8px 10px 8px 32px",
                      borderRadius: "8px",
                      border: "1px solid var(--border)",
                      background: "var(--surface)",
                      color: "var(--navy)",
                      fontSize: "14px",
                      fontWeight: 800,
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "10.5px", fontWeight: 700, color: "var(--muted)", marginBottom: "3px" }}>
                  Volume (Liter)
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={litersStr}
                    onChange={handleLitersChange}
                    placeholder="0.00"
                    required
                    style={{
                      width: "100%",
                      padding: "8px 28px 8px 10px",
                      borderRadius: "8px",
                      border: "1px solid var(--border)",
                      background: "var(--surface)",
                      color: "var(--navy)",
                      fontSize: "14px",
                      fontWeight: 800,
                    }}
                  />
                  <span style={{ position: "absolute", right: "10px", top: "9px", fontSize: "12px", fontWeight: 700, color: "var(--muted)" }}>
                    L
                  </span>
                </div>
              </div>
            </div>

            <div style={{ fontSize: "10.5px", color: "var(--muted)", display: "flex", justifyContent: "space-between" }}>
              <span>Harga Satuan: Rp {costPerLiterStr} / L</span>
              <span>Kalkulasi Otomatis Dua Arah ⚡</span>
            </div>
          </div>

          {/* Row 4: Pos Pengeluaran Sumber Dana */}
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "4px" }}>
              Pos Pengeluaran (Sumber Dana)
            </label>
            <select
              value={selectedPosId}
              onChange={(e) => setSelectedPosId(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: "10px",
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--navy)",
                fontSize: "13px",
                fontWeight: 650,
              }}
            >
              <option value="" disabled>-- Pilih Pos Pengeluaran --</option>
              {posList.map((pos) => (
                <option key={pos.id} value={pos.id}>
                  {pos.icon} {pos.name} (Saldo: {formatRp(pos.current_balance || 0)})
                </option>
              ))}
            </select>
            {selectedPos && (
              <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "3px" }}>
                Saldo saat ini: <strong style={{ color: "var(--navy)" }}>{formatRp(selectedPos.current_balance || 0)}</strong>
              </div>
            )}
          </div>

          {/* Row 5: Catatan */}
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "4px" }}>
              Catatan (Opsional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Isi bensin full tank rest area KM 57"
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "10px",
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--navy)",
                fontSize: "12.5px",
              }}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                flex: 1,
                padding: "11px",
                borderRadius: "12px",
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--text-secondary)",
                fontSize: "13px",
                fontWeight: 700,
                cursor: submitting ? "not-allowed" : "pointer",
              }}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                flex: 2,
                padding: "11px",
                borderRadius: "12px",
                border: "none",
                background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                color: "#ffffff",
                fontSize: "13.5px",
                fontWeight: 800,
                cursor: submitting ? "not-allowed" : "pointer",
                boxShadow: "0 4px 12px rgba(217, 119, 6, 0.25)",
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? "Menyimpan Perubahan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
