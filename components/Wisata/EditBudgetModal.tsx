"use client";

import React, { useState, useEffect } from "react";
import Modal from "@/components/Modal";
import { formatRp } from "@/lib/wisata-utils";
import { updateTripBudget } from "@/lib/wisata-service";
import { Wallet, Sparkles, ArrowRight, Check, AlertCircle } from "lucide-react";

interface EditBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  currentBudget: number;
  totalDays: number;
  onSuccess: (newBudget: number) => void;
}

export default function EditBudgetModal({
  isOpen,
  onClose,
  tripId,
  currentBudget,
  totalDays,
  onSuccess,
}: EditBudgetModalProps) {
  const [budgetStr, setBudgetStr] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setBudgetStr(currentBudget > 0 ? currentBudget.toLocaleString("id-ID") : "");
      setErrorMsg(null);
    }
  }, [isOpen, currentBudget]);

  if (!isOpen) return null;

  const newBudget = Number(budgetStr.replace(/\D/g, "")) || 0;
  const diff = newBudget - currentBudget;
  const safeDays = Math.max(1, totalDays);
  const dailyAverage = Math.round(newBudget / safeDays);

  const handleQuickAdd = (delta: number) => {
    const updated = Math.max(0, newBudget + delta);
    setBudgetStr(updated.toLocaleString("id-ID"));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (newBudget < 0) {
      setErrorMsg("Anggaran tidak boleh negatif");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await updateTripBudget(tripId, newBudget);
      if (error) throw new Error(error.message);

      onSuccess(newBudget);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Gagal memperbarui plafon anggaran");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>
          <h3 style={{ margin: "0 0 4px", fontSize: "16px", fontWeight: 700, color: "var(--text, #1e293b)" }}>
            ✏️ Edit Plafon Anggaran Wisata
          </h3>
          <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted, #64748b)", lineHeight: "1.5" }}>
            Sesuaikan total batas anggaran perjalanan liburan ini. Perubahan akan langsung memutakhirkan
            target jatah harian dan indikator sisa dana.
          </p>
        </div>

        {errorMsg && (
          <div
            style={{
              padding: "10px 14px",
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

        {/* Input Nominal Anggaran */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: "12px",
              fontWeight: 600,
              color: "var(--text, #1e293b)",
              marginBottom: "6px",
            }}
          >
            Total Anggaran Plafon Trip (Rp) <span style={{ color: "#f04467" }}>*</span>
          </label>
          <div style={{ position: "relative" }}>
            <span
              style={{
                position: "absolute",
                left: "14px",
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
              value={budgetStr}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, "");
                setBudgetStr(raw ? Number(raw).toLocaleString("id-ID") : "");
              }}
              placeholder="0"
              autoFocus
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "12px 14px 12px 42px",
                borderRadius: "12px",
                border: "1.5px solid var(--border, #cbd5e1)",
                backgroundColor: "var(--surface, #ffffff)",
                fontSize: "18px",
                fontWeight: 700,
                color: "var(--text, #1e293b)",
                outline: "none",
                fontVariantNumeric: "tabular-nums",
              }}
            />
          </div>
        </div>

        {/* Quick Add Chips */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {[
            { label: "+500 Ribu", value: 500000 },
            { label: "+1 Juta", value: 1000000 },
            { label: "+2 Juta", value: 2000000 },
            { label: "Reset Awal", value: 0, reset: true },
          ].map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => (chip.reset ? setBudgetStr(currentBudget.toLocaleString("id-ID")) : handleQuickAdd(chip.value))}
              style={{
                padding: "5px 10px",
                borderRadius: "8px",
                border: "1px solid var(--border, #cbd5e1)",
                backgroundColor: "rgba(100, 116, 139, 0.06)",
                color: "var(--text, #1e293b)",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Live Calculation Card */}
        <div
          style={{
            backgroundColor: "rgba(40, 127, 240, 0.04)",
            borderRadius: "14px",
            border: "1px solid rgba(40, 127, 240, 0.15)",
            padding: "12px 14px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            fontSize: "12px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "var(--text-muted, #64748b)" }}>Anggaran Sebelumnya:</span>
            <span style={{ fontWeight: 600, color: "var(--text, #1e293b)" }}>{formatRp(currentBudget)}</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "var(--text-muted, #64748b)" }}>Selisih Revisi:</span>
            <span
              style={{
                fontWeight: 700,
                color: diff > 0 ? "#10b981" : diff < 0 ? "#f04467" : "var(--text-muted, #64748b)",
              }}
            >
              {diff > 0 ? `+${formatRp(diff)}` : diff < 0 ? `-${formatRp(Math.abs(diff))}` : "Sama (Rp 0)"}
            </span>
          </div>

          <div
            style={{
              borderTop: "1px dashed rgba(40, 127, 240, 0.2)",
              paddingTop: "8px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ color: "var(--brand-primary, #287ff0)", fontWeight: 600 }}>
              Jatah Rata-rata per Hari ({safeDays} Hari):
            </span>
            <span style={{ fontWeight: 700, fontSize: "13px", color: "var(--brand-primary, #287ff0)" }}>
              {formatRp(dailyAverage)} / hari
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              flex: 1,
              padding: "11px",
              borderRadius: "12px",
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
              padding: "11px",
              borderRadius: "12px",
              border: "none",
              backgroundColor: "var(--brand-primary, #287ff0)",
              color: "#ffffff",
              fontSize: "13px",
              fontWeight: 700,
              cursor: isSubmitting ? "not-allowed" : "pointer",
              boxShadow: "0 3px 12px rgba(40, 127, 240, 0.3)",
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
                <span>Simpan Anggaran</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
