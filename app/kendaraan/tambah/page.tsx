"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createVehicle } from "@/lib/vehicle-service";
import { normalizePlateNumber } from "@/lib/vehicle-utils";
import { useApp } from "@/lib/store";
import DateInput from "@/components/Kendaraan/DateInput";

export default function TambahKendaraanPage() {
  const router = useRouter();
  const { setIsMutating } = useApp();

  const [plateNumber, setPlateNumber] = useState("");
  const [vehicleType, setVehicleType] = useState<"Motor" | "Mobil">("Motor");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [nextTaxDueDate, setNextTaxDueDate] = useState("");
  const [lastOdometer, setLastOdometer] = useState("");
  const [notes, setNotes] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const cleanPlate = normalizePlateNumber(plateNumber);
    if (!cleanPlate) {
      setErrorMsg("Plat nomor wajib diisi");
      return;
    }
    if (!brand.trim()) {
      setErrorMsg("Merek kendaraan wajib diisi");
      return;
    }
    if (!model.trim()) {
      setErrorMsg("Tipe kendaraan wajib diisi");
      return;
    }
    if (!nextTaxDueDate) {
      setErrorMsg("Tanggal jatuh tempo pajak wajib dipilih");
      return;
    }

    setLoading(true);
    setIsMutating(true);

    try {
      const parsedOdo = lastOdometer ? parseInt(lastOdometer.replace(/\D/g, ""), 10) || 0 : 0;
      const { data, error } = await createVehicle({
        plate_number: cleanPlate,
        vehicle_type: vehicleType,
        brand: brand.trim(),
        model: model.trim(),
        next_tax_due_date: nextTaxDueDate,
        last_odometer: parsedOdo,
        notes: notes.trim() || undefined,
        service_reminder_interval_months: 1,
        service_reminder_enabled: true,
        tax_reminder_enabled: true,
      });

      if (error) {
        if (error.code === "23505" || error.message?.includes("idx_active_plate_number")) {
          setErrorMsg("Plat nomor tersebut sudah terdaftar pada kendaraan aktif.");
        } else {
          setErrorMsg(error.message || "Gagal menyimpan kendaraan.");
        }
        return;
      }

      if (data?.id) {
        router.push(`/kendaraan/${data.id}`);
      } else {
        router.push("/kendaraan");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan sistem.");
    } finally {
      setLoading(false);
      setIsMutating(false);
    }
  };

  return (
    <main className="page active" style={{ paddingBottom: "90px" }}>
      {/* Top Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "16px 20px 12px",
          background: "var(--bg)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <button
          type="button"
          onClick={() => router.back()}
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
          Tambah Kendaraan
        </h1>
      </div>

      <div style={{ padding: "0 20px" }}>
        <form onSubmit={handleSubmit}>
          <div
            style={{
              background: "var(--surface)",
              borderRadius: "16px",
              border: "1px solid var(--border)",
              padding: "18px",
              marginBottom: "20px",
              boxShadow: "0 4px 14px rgba(16, 45, 85, 0.04)",
            }}
          >
            <h2
              style={{
                fontSize: "14.5px",
                fontWeight: 750,
                color: "var(--navy)",
                margin: "0 0 16px",
              }}
            >
              Identitas Kendaraan
            </h2>

            {errorMsg && (
              <div
                style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  color: "#dc2626",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  fontSize: "12.5px",
                  marginBottom: "14px",
                  fontWeight: 500,
                }}
              >
                {errorMsg}
              </div>
            )}

            {/* Plat Nomor */}
            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--navy)", marginBottom: "6px" }}>
                Plat Nomor <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                type="text"
                placeholder="Contoh: B 1234 ABC"
                value={plateNumber}
                onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
                style={{
                  width: "100%",
                  height: "44px",
                  padding: "0 14px",
                  borderRadius: "10px",
                  border: "1px solid var(--border)",
                  background: "var(--bg)",
                  fontSize: "14px",
                  fontWeight: 650,
                  color: "var(--text)",
                  letterSpacing: "0.5px",
                  boxSizing: "border-box",
                  outline: "none",
                }}
              />
            </div>

            {/* Jenis Kendaraan */}
            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--navy)", marginBottom: "6px" }}>
                Jenis Kendaraan <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                {(["Motor", "Mobil"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setVehicleType(type)}
                    style={{
                      height: "42px",
                      borderRadius: "10px",
                      border: vehicleType === type ? "2px solid var(--primary)" : "1px solid var(--border)",
                      background: vehicleType === type ? "var(--primary-soft)" : "var(--bg)",
                      color: vehicleType === type ? "var(--primary)" : "var(--text-secondary)",
                      fontSize: "13.5px",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                    }}
                  >
                    {type === "Motor" ? "🛵 Motor" : "🚗 Mobil"}
                  </button>
                ))}
              </div>
            </div>

            {/* Merek */}
            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--navy)", marginBottom: "6px" }}>
                Merek <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                type="text"
                list="brand-suggestions"
                placeholder="Pilih atau ketik merek (contoh: Honda, Toyota)"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                style={{
                  width: "100%",
                  height: "44px",
                  padding: "0 14px",
                  borderRadius: "10px",
                  border: "1px solid var(--border)",
                  background: "var(--bg)",
                  fontSize: "13.5px",
                  color: "var(--text)",
                  boxSizing: "border-box",
                  outline: "none",
                }}
              />
              <datalist id="brand-suggestions">
                <option value="Honda" />
                <option value="Yamaha" />
                <option value="Toyota" />
                <option value="Suzuki" />
                <option value="Daihatsu" />
                <option value="Mitsubishi" />
                <option value="Kawasaki" />
                <option value="Hyundai" />
                <option value="Wuling" />
                <option value="Vespa" />
              </datalist>
            </div>

            {/* Tipe Kendaraan */}
            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--navy)", marginBottom: "6px" }}>
                Tipe Kendaraan <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                type="text"
                placeholder="Contoh: Vario 150 LED / Avanza Veloz"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                style={{
                  width: "100%",
                  height: "44px",
                  padding: "0 14px",
                  borderRadius: "10px",
                  border: "1px solid var(--border)",
                  background: "var(--bg)",
                  fontSize: "13.5px",
                  color: "var(--text)",
                  boxSizing: "border-box",
                  outline: "none",
                }}
              />
            </div>

            {/* Tanggal Pajak Berikutnya */}
            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--navy)", marginBottom: "6px" }}>
                Tanggal Pajak Berikutnya <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <DateInput
                value={nextTaxDueDate}
                onChange={setNextTaxDueDate}
                placeholder="DD/MM/YYYY (contoh: 22/10/2026)"
              />
            </div>

            {/* Kilometer Terakhir (opsional) */}
            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--navy)", marginBottom: "6px" }}>
                Kilometer Terakhir <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 500 }}>(opsional)</span>
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type="number"
                  placeholder="Contoh: 12500"
                  value={lastOdometer}
                  onChange={(e) => setLastOdometer(e.target.value)}
                  style={{
                    width: "100%",
                    height: "44px",
                    padding: "0 46px 0 14px",
                    borderRadius: "10px",
                    border: "1px solid var(--border)",
                    background: "var(--bg)",
                    fontSize: "14px",
                    fontWeight: 650,
                    color: "var(--text)",
                    boxSizing: "border-box",
                    outline: "none",
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
                  km
                </span>
              </div>
            </div>

            {/* Catatan (opsional) */}
            <div style={{ marginBottom: "4px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--navy)", marginBottom: "6px" }}>
                Catatan <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 500 }}>(opsional)</span>
              </label>
              <textarea
                rows={3}
                placeholder="Tambahkan catatan jika ada..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  border: "1px solid var(--border)",
                  background: "var(--bg)",
                  fontSize: "13px",
                  color: "var(--text)",
                  boxSizing: "border-box",
                  outline: "none",
                  resize: "vertical",
                  fontFamily: "inherit",
                }}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                height: "46px",
                borderRadius: "12px",
                background: "var(--primary)",
                color: "#ffffff",
                fontSize: "14px",
                fontWeight: 750,
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: "0 4px 14px rgba(40, 127, 240, 0.3)",
              }}
            >
              {loading ? "Menyimpan..." : "Simpan Kendaraan"}
            </button>

            <button
              type="button"
              onClick={() => router.back()}
              style={{
                width: "100%",
                height: "44px",
                borderRadius: "12px",
                background: "transparent",
                color: "var(--text-secondary)",
                fontSize: "13.5px",
                fontWeight: 650,
                border: "1px solid var(--border)",
                cursor: "pointer",
              }}
            >
              Batal
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
