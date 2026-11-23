"use client";

import React, { useState, useEffect } from "react";
import Modal from "@/components/Modal";
import type { TripExpense, Vehicle, TripCategory, CreateTripExpenseInput } from "@/lib/types";
import { createTripExpense, updateTripExpense } from "@/lib/wisata-service";
import { CATEGORY_META, formatRp } from "@/lib/wisata-utils";
import { AlertCircle, Fuel, Check, Info } from "lucide-react";

interface DailyExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  totalDays: number;
  defaultDay: number;
  vehicle: Vehicle | null;
  userId?: string;
  userName?: string;
  expenseToEdit?: TripExpense | null;
  onSuccess: () => void;
}

const CATEGORIES: { key: TripCategory; label: string; icon: string; color: string; bgColor: string }[] = [
  { key: "food", label: "Makan & Jajan", icon: "🍜", color: "#ea580c", bgColor: "#fff7ed" },
  { key: "transport", label: "Transport & BBM", icon: "🚗", color: "#2563eb", bgColor: "#eff6ff" },
  { key: "ticket", label: "Tiket Wisata", icon: "🎟️", color: "#7c3aed", bgColor: "#f5f3ff" },
  { key: "lodging", label: "Penginapan", icon: "🏨", color: "#0d9488", bgColor: "#f0fdfa" },
  { key: "shopping", label: "Oleh-oleh", icon: "🛍️", color: "#db2777", bgColor: "#fdf2f8" },
  { key: "other", label: "Lain-lain", icon: "📦", color: "#4b5563", bgColor: "#f3f4f6" },
];

export default function DailyExpenseModal({
  isOpen,
  onClose,
  tripId,
  totalDays,
  defaultDay,
  vehicle,
  userId,
  userName,
  expenseToEdit,
  onSuccess,
}: DailyExpenseModalProps) {
  const [dayNumber, setDayNumber] = useState<number>(defaultDay || 1);
  const [category, setCategory] = useState<TripCategory>("food");
  const [title, setTitle] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [notes, setNotes] = useState("");

  // Fuel / Kendaraan state
  const [isFuelLog, setIsFuelLog] = useState(false);
  const [odometerKmStr, setOdometerKmStr] = useState("");
  const [fuelLitersStr, setFuelLitersStr] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      if (expenseToEdit) {
        setDayNumber(expenseToEdit.day_number);
        setCategory(expenseToEdit.category);
        setTitle(expenseToEdit.title);
        setAmountStr(expenseToEdit.amount.toLocaleString("id-ID"));
        setNotes(expenseToEdit.notes || "");
        setIsFuelLog(!!expenseToEdit.fuel_liters && expenseToEdit.fuel_liters > 0);
        setOdometerKmStr(expenseToEdit.odometer_km ? String(expenseToEdit.odometer_km) : "");
        setFuelLitersStr(expenseToEdit.fuel_liters ? String(expenseToEdit.fuel_liters) : "");
      } else {
        setDayNumber(defaultDay || 1);
        setCategory("food");
        setTitle("");
        setAmountStr("");
        setNotes("");
        setIsFuelLog(false);
        setOdometerKmStr("");
        setFuelLitersStr("");
      }
    }
  }, [isOpen, expenseToEdit, defaultDay]);

  if (!isOpen) return null;

  const amount = Number(amountStr.replace(/\D/g, "")) || 0;
  const isTransport = category === "transport" && !!vehicle;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!title.trim()) {
      setErrorMsg("Nama/judul pengeluaran wajib diisi");
      return;
    }

    if (amount <= 0) {
      setErrorMsg("Nominal pengeluaran harus lebih besar dari Rp 0");
      return;
    }

    if (isTransport && isFuelLog) {
      if (!fuelLitersStr || Number(fuelLitersStr) <= 0) {
        setErrorMsg("Jumlah liter bensin wajib diisi");
        return;
      }
      if (odometerKmStr) {
        const odo = Number(odometerKmStr);
        const lastOdo = vehicle?.last_odometer || 0;
        if (odo <= lastOdo && !expenseToEdit) {
          setErrorMsg(`Kilometer saat ini (${odo} km) harus lebih besar dari kilometer terakhir (${lastOdo} km)`);
          return;
        }
      }
    }

    setIsSubmitting(true);
    try {
      if (expenseToEdit) {
        const { error } = await updateTripExpense(expenseToEdit.id, {
          day_number: dayNumber,
          category,
          title: title.trim(),
          amount,
          notes: notes.trim() || null,
        });
        if (error) throw new Error(error.message);
      } else {
        const payload: CreateTripExpenseInput = {
          trip_id: tripId,
          day_number: dayNumber,
          category,
          title: title.trim(),
          amount,
          notes: notes.trim() || null,
          vehicle_id: isTransport && isFuelLog ? vehicle?.id : null,
          odometer_km: isTransport && isFuelLog && odometerKmStr ? Number(odometerKmStr) : null,
          fuel_liters: isTransport && isFuelLog && fuelLitersStr ? Number(fuelLitersStr) : null,
        };

        const res = await createTripExpense(payload, userId, userName);
        if (!res.success) throw new Error(res.error || "Gagal mencatat pengeluaran");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Gagal menyimpan pengeluaran");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div>
          <h3 style={{ margin: "0 0 4px", fontSize: "16px", fontWeight: 700, color: "var(--text, #1e293b)" }}>
            {expenseToEdit ? "✏️ Edit Pengeluaran Wisata" : "💸 Catat Pengeluaran Wisata"}
          </h3>
        </div>

        {/* Banner Info Standalone */}
        <div
          style={{
            padding: "8px 12px",
            borderRadius: "10px",
            backgroundColor: "rgba(16, 185, 129, 0.08)",
            border: "1px solid rgba(16, 185, 129, 0.2)",
            color: "#059669",
            fontSize: "11.5px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Info size={15} style={{ flexShrink: 0 }} />
          <span>Pengeluaran dicatat mandiri tanpa memotong POS bulanan keluarga.</span>
        </div>

        {errorMsg && (
          <div
            style={{
              padding: "10px 12px",
              borderRadius: "10px",
              backgroundColor: "rgba(240, 68, 103, 0.1)",
              border: "1px solid rgba(240, 68, 103, 0.25)",
              color: "#f04467",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Pilihan Hari */}
        <div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text, #1e293b)", marginBottom: "6px" }}>
            Pengeluaran Hari ke-
          </label>
          <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "2px" }}>
            {Array.from({ length: Math.max(1, totalDays) }, (_, i) => i + 1).map((d) => {
              const isSelected = dayNumber === d;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDayNumber(d)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "10px",
                    border: `1.5px solid ${isSelected ? "var(--brand-primary, #287ff0)" : "var(--border, #cbd5e1)"}`,
                    backgroundColor: isSelected ? "var(--brand-primary, #287ff0)" : "var(--surface, #ffffff)",
                    color: isSelected ? "#ffffff" : "var(--text, #1e293b)",
                    fontSize: "12px",
                    fontWeight: isSelected ? 700 : 500,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    transition: "all 0.15s ease",
                  }}
                >
                  Hari {d}
                </button>
              );
            })}
          </div>
        </div>

        {/* Grid Kategori Bento */}
        <div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text, #1e293b)", marginBottom: "6px" }}>
            Kategori Pengeluaran
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
            {CATEGORIES.map((cat) => {
              const isSelected = category === cat.key;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setCategory(cat.key)}
                  style={{
                    padding: "8px 6px",
                    borderRadius: "10px",
                    border: isSelected ? `2px solid ${cat.color}` : "1px solid var(--border, rgba(0,0,0,0.08))",
                    backgroundColor: isSelected ? cat.bgColor : "var(--surface, #ffffff)",
                    color: isSelected ? cat.color : "var(--text, #1e293b)",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "4px",
                    transition: "all 0.15s ease",
                  }}
                >
                  <span style={{ fontSize: "16px" }}>{cat.icon}</span>
                  <span style={{ fontSize: "11px", fontWeight: isSelected ? 700 : 500, textAlign: "center" }}>
                    {cat.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Judul Pengeluaran */}
        <div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text, #1e293b)", marginBottom: "4px" }}>
            Nama / Judul Pengeluaran <span style={{ color: "#f04467" }}>*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              category === "food" ? "misal: Makan Siang Nasi Liwet" :
              category === "transport" ? "misal: Bensin Tol Cipali / Parkir" :
              category === "ticket" ? "misal: Tiket Masuk Taman Safari" :
              category === "lodging" ? "misal: Tambahan Extra Bed" :
              category === "shopping" ? "misal: Kaos & Bakpia" : "misal: Air Mineral & Camilan"
            }
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "10px 12px",
              borderRadius: "10px",
              border: "1px solid var(--border, #cbd5e1)",
              backgroundColor: "var(--surface, #ffffff)",
              fontSize: "13px",
              color: "var(--text, #1e293b)",
              outline: "none",
            }}
          />
        </div>

        {/* Nominal Pengeluaran (Rp) */}
        <div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text, #1e293b)", marginBottom: "4px" }}>
            Nominal Pengeluaran (Rp) <span style={{ color: "#f04467" }}>*</span>
          </label>
          <div style={{ position: "relative" }}>
            <span
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                fontWeight: 700,
                fontSize: "14px",
                color: "var(--brand-primary, #287ff0)",
              }}
            >
              Rp
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={amountStr}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, "");
                setAmountStr(raw ? Number(raw).toLocaleString("id-ID") : "");
              }}
              placeholder="0"
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "10px 12px 10px 38px",
                borderRadius: "10px",
                border: "1.5px solid var(--border, #cbd5e1)",
                backgroundColor: "var(--surface, #ffffff)",
                fontSize: "16px",
                fontWeight: 700,
                color: "var(--text, #1e293b)",
                outline: "none",
                fontVariantNumeric: "tabular-nums",
              }}
            />
          </div>
        </div>

        {/* Khusus Transport: Opsi Isi BBM Kendaraan */}
        {isTransport && !expenseToEdit && (
          <div
            style={{
              padding: "12px",
              borderRadius: "12px",
              border: "1px solid rgba(37, 99, 235, 0.2)",
              backgroundColor: "rgba(37, 99, 235, 0.04)",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={isFuelLog}
                onChange={(e) => setIsFuelLog(e.target.checked)}
                style={{ width: "16px", height: "16px", accentColor: "#2563eb", cursor: "pointer" }}
              />
              <span style={{ fontSize: "12.5px", fontWeight: 600, color: "#1e293b" }}>
                ⛽ Ini Pengisian BBM Kendaraan ({vehicle.brand} {vehicle.plate_number})
              </span>
            </label>

            {isFuelLog && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "2px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                    Liter Bensin <span style={{ color: "#f04467" }}>*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={fuelLitersStr}
                    onChange={(e) => setFuelLitersStr(e.target.value)}
                    placeholder="misal: 25.5"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "8px 10px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      backgroundColor: "#ffffff",
                      fontSize: "13px",
                      outline: "none",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                    Odometer Saat Ini (km)
                  </label>
                  <input
                    type="number"
                    value={odometerKmStr}
                    onChange={(e) => setOdometerKmStr(e.target.value)}
                    placeholder={`Terakhir: ${vehicle.last_odometer || 0}`}
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "8px 10px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      backgroundColor: "#ffffff",
                      fontSize: "13px",
                      outline: "none",
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Catatan Tambahan (Opsional) */}
        <div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text, #1e293b)", marginBottom: "4px" }}>
            Catatan Tambahan (Opsional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="misal: Bayar tunai / tip supir / patungan"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "8px 12px",
              borderRadius: "10px",
              border: "1px solid var(--border, #cbd5e1)",
              backgroundColor: "var(--surface, #ffffff)",
              fontSize: "12.5px",
              color: "var(--text, #1e293b)",
              outline: "none",
            }}
          />
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "10px", marginTop: "6px" }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: "10px",
              border: "1px solid var(--border, #cbd5e1)",
              backgroundColor: "transparent",
              color: "var(--text-muted, #64748b)",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              flex: 2,
              padding: "10px",
              borderRadius: "10px",
              border: "none",
              backgroundColor: "var(--brand-primary, #287ff0)",
              color: "#ffffff",
              fontSize: "13px",
              fontWeight: 700,
              cursor: isSubmitting ? "not-allowed" : "pointer",
              boxShadow: "0 3px 10px rgba(40, 127, 240, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
            }}
          >
            {isSubmitting ? (
              <span>Menyimpan...</span>
            ) : (
              <>
                <Check size={16} />
                <span>Simpan Pengeluaran</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
