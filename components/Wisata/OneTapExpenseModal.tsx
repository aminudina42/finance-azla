"use client";

import React, { useState, useEffect } from "react";
import Modal from "@/components/Modal";
import SakuBorrowModal from "@/components/Modals/SakuBorrowModal";
import { recordTripExpense } from "@/lib/wisata-service";
import type { Trip, TripItem, Vehicle, Pos, Child, StatusKeluarga } from "@/lib/types";
import { formatRp } from "@/lib/wisata-utils";
import { AlertCircle, Car, Fuel, Wallet, Sparkles } from "lucide-react";

interface OneTapExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: TripItem | null;
  trip: Trip | null;
  pos: Pos | null;
  sakuList: Child[];
  vehicle: Vehicle | null;
  userRole: StatusKeluarga;
  userId: string;
  userName: string;
  onSuccess: () => void;
}

export default function OneTapExpenseModal({
  isOpen,
  onClose,
  item,
  trip,
  pos,
  sakuList,
  vehicle,
  userRole,
  userId,
  userName,
  onSuccess,
}: OneTapExpenseModalProps) {
  const [actualCostStr, setActualCostStr] = useState("");
  const [odometerKmStr, setOdometerKmStr] = useState("");
  const [fuelLitersStr, setFuelLitersStr] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Shortfall / Saku Borrow Modal State
  const [showSakuBorrow, setShowSakuBorrow] = useState(false);

  useEffect(() => {
    if (isOpen && item) {
      setActualCostStr(
        item.estimated_cost > 0 ? item.estimated_cost.toLocaleString("id-ID") : ""
      );
      setOdometerKmStr("");
      setFuelLitersStr("");
      setErrorMsg(null);
      setShowSakuBorrow(false);
    }
  }, [isOpen, item]);

  if (!isOpen || !item || !trip) return null;

  const actualAmount = Number(actualCostStr.replace(/\D/g, "")) || 0;
  const isTransport = item.category === "transport" && !!trip.vehicle_id;
  const posBalance = pos?.current_balance ?? 0;
  const isShortfall = actualAmount > posBalance && actualAmount > 0;

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (actualAmount < 0) {
      setErrorMsg("Nominal pengeluaran tidak boleh negatif");
      return;
    }

    // Validasi Odometer jika diisi
    if (isTransport && odometerKmStr.trim()) {
      const odo = Number(odometerKmStr);
      const lastOdo = vehicle?.last_odometer || 0;
      if (odo <= lastOdo) {
        setErrorMsg(`Kilometer saat ini (${odo} km) harus lebih besar dari kilometer terakhir (${lastOdo} km)`);
        return;
      }
    }

    // Cek apakah saldo pos kurang
    if (isShortfall) {
      setShowSakuBorrow(true);
      return;
    }

    // Jika saldo cukup, langsung eksekusi
    executeRecordExpense();
  };

  const executeRecordExpense = async (sakuId?: string, sakuWithdrawAmount?: number) => {
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const odo = odometerKmStr.trim() ? Number(odometerKmStr) : null;
      const liters = fuelLitersStr.trim() ? Number(fuelLitersStr) : null;

      const res = await recordTripExpense({
        trip_item_id: item.id,
        actual_cost: actualAmount,
        user_id: userId,
        user_name: userName,
        user_role: userRole,
        odometer_km: odo,
        fuel_liters: liters,
        saku_id: sakuId || null,
        saku_withdraw_amount: sakuWithdrawAmount || 0,
      });

      if (!res.success) {
        throw new Error(res.error || "Gagal mencatat pengeluaran wisata");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Terjadi kesalahan saat memproses pengeluaran");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={isSubmitting ? () => {} : onClose}>
        <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Header */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--brand-primary, #287ff0)", fontSize: "12px", fontWeight: 600 }}>
              <span>💸</span>
              <span>One-Tap Expense Wisata</span>
            </div>
            <h3 style={{ margin: "4px 0 2px", fontSize: "18px", fontWeight: 700, color: "var(--text, #1e293b)", wordBreak: "break-word" }}>
              {item.title}
            </h3>
            <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted, #64748b)", wordBreak: "break-word" }}>
              Hari ke-{item.day_number} • Estimasi: <strong>{formatRp(item.estimated_cost)}</strong>
            </p>
          </div>

          {errorMsg && (
            <div
              style={{
                padding: "10px 12px",
                borderRadius: "10px",
                backgroundColor: "rgba(240, 68, 103, 0.12)",
                color: "var(--color-danger, #f04467)",
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form Input Nominal Aktual */}
          <form onSubmit={handlePreSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-muted, #64748b)", marginBottom: "6px" }}>
                Nominal Aktual yang Dikeluarkan (Rp)
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder="Rp 0"
                value={actualCostStr}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, "");
                  setActualCostStr(raw ? Number(raw).toLocaleString("id-ID") : "");
                }}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: "12px",
                  border: "1px solid var(--border, #cbd5e1)",
                  backgroundColor: "var(--input-bg, #ffffff)",
                  fontSize: "18px",
                  fontWeight: 700,
                  fontFamily: "var(--font-fraunces, serif)",
                  color: "var(--brand-primary, #287ff0)",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />

              {/* Status Saldo Pos */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "6px",
                  flexWrap: "wrap",
                  marginTop: "6px",
                  fontSize: "11px",
                  color: isShortfall ? "var(--color-warning, #ea580c)" : "var(--text-muted, #64748b)",
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  <Wallet size={12} style={{ flexShrink: 0 }} />
                  <span>Sisa Saldo Pos: <strong>{formatRp(posBalance)}</strong></span>
                </span>
                {isShortfall && (
                  <span style={{ fontWeight: 600 }}>
                    (Kurang {formatRp(actualAmount - posBalance)})
                  </span>
                )}
              </div>
            </div>

            {/* Input Tambahan jika Kategori Transport & Memiliki Kendaraan */}
            {isTransport && (
              <div
                style={{
                  padding: "12px",
                  borderRadius: "12px",
                  backgroundColor: "rgba(37, 99, 235, 0.06)",
                  border: "1px solid rgba(37, 99, 235, 0.15)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 700, color: "#1e40af" }}>
                  <Car size={14} />
                  <span>Log BBM {vehicle?.brand} {vehicle?.model} (Opsional)</span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                      Odometer Baru (km)
                    </label>
                    <input
                      type="number"
                      placeholder={`> ${vehicle?.last_odometer || 0}`}
                      value={odometerKmStr}
                      onChange={(e) => setOdometerKmStr(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: "8px",
                        border: "1px solid var(--border, #cbd5e1)",
                        fontSize: "13px",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                      Jumlah Liter
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Contoh: 30"
                      value={fuelLitersStr}
                      onChange={(e) => setFuelLitersStr(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: "8px",
                        border: "1px solid var(--border, #cbd5e1)",
                        fontSize: "13px",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>

                <div style={{ fontSize: "10px", color: "#64748b", lineHeight: "1.3" }}>
                  Jika odometer diisi, sistem otomatis mencatat riwayat ke log BBM dan memperbarui odometer kendaraan.
                </div>
              </div>
            )}

            {/* Aksi Button */}
            <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                style={{
                  padding: "12px 16px",
                  borderRadius: "12px",
                  border: "1px solid var(--border, #cbd5e1)",
                  backgroundColor: "transparent",
                  color: "var(--text-muted, #64748b)",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                Batal
              </button>

              <button
                type="submit"
                disabled={isSubmitting || actualAmount < 0}
                style={{
                  flex: 1,
                  padding: "12px 14px",
                  borderRadius: "12px",
                  border: "none",
                  backgroundColor: isSubmitting ? "var(--text-muted, #94a3b8)" : "var(--brand-primary, #287ff0)",
                  color: "#ffffff",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: isSubmitting ? "not-allowed" : "pointer",
                  boxShadow: "0 4px 12px rgba(40, 127, 240, 0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  whiteSpace: "nowrap",
                  minWidth: 0,
                }}
              >
                <Sparkles size={16} style={{ flexShrink: 0 }} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                  {isSubmitting ? "Memproses..." : isShortfall ? "Lanjut Pinjam Saku" : "Simpan Pengeluaran"}
                </span>
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Saku Borrow Modal jika Saldo Pos Kurang */}
      <SakuBorrowModal
        isOpen={showSakuBorrow}
        onClose={() => setShowSakuBorrow(false)}
        totalExpense={actualAmount}
        posBalance={posBalance}
        sakuList={sakuList}
        onConfirm={async (sakuId, sakuWithdrawAmount) => {
          setShowSakuBorrow(false);
          await executeRecordExpense(sakuId, sakuWithdrawAmount);
        }}
      />
    </>
  );
}
