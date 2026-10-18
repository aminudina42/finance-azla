"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import type { Vehicle } from "@/lib/types";
import { getVehicleById, recordVehicleTaxPayment } from "@/lib/vehicle-service";
import VehicleHeaderCard from "@/components/Kendaraan/VehicleHeaderCard";
import DateInput from "@/components/Kendaraan/DateInput";
import PageHeader from "@/components/PageHeader";
import { useApp } from "@/lib/store";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function BayarPajakPage({ params }: PageProps) {
  const router = useRouter();
  const { id } = use(params);
  const { posList, setIsMutating, currentMember, sessionUser } = useApp();

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Form State
  const [taxPeriod, setTaxPeriod] = useState("");
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [nextDueDate, setNextDueDate] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [selectedPosId, setSelectedPosId] = useState("");
  const [notes, setNotes] = useState("");

  const loadVehicle = useCallback(async () => {
    setLoading(true);
    const v = await getVehicleById(id);
    if (!v) {
      router.replace("/kendaraan");
      return;
    }
    setVehicle(v);

    // Default period: year of next_tax_due_date
    if (v.next_tax_due_date) {
      const year = v.next_tax_due_date.split("-")[0];
      setTaxPeriod(year);

      // Default next due date: +1 year from current due date
      const parts = v.next_tax_due_date.split("T")[0].split("-");
      if (parts.length === 3) {
        const nextYear = parseInt(parts[0], 10) + 1;
        setNextDueDate(`${nextYear}-${parts[1]}-${parts[2]}`);
      }
    }

    if (posList.length > 0) {
      // Pick transport pos if found, otherwise first pos
      const transportPos = posList.find((p) =>
        p.name.toLowerCase().includes("kendaraan") ||
        p.name.toLowerCase().includes("transport") ||
        p.name.toLowerCase().includes("tagihan")
      );
      setSelectedPosId(transportPos ? transportPos.id : posList[0].id);
    }

    setLoading(false);
  }, [id, router, posList]);

  useEffect(() => {
    loadVehicle();
  }, [loadVehicle]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) {
      setAmountStr("");
      return;
    }
    setAmountStr(parseInt(raw, 10).toLocaleString("id-ID"));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const numericAmount = parseInt(amountStr.replace(/\D/g, ""), 10);
    if (!taxPeriod.trim()) {
      setErrorMsg("Periode pajak wajib diisi");
      return;
    }
    if (!paymentDate) {
      setErrorMsg("Tanggal pembayaran wajib dipilih");
      return;
    }
    if (!nextDueDate) {
      setErrorMsg("Tanggal pajak berikutnya wajib dipilih");
      return;
    }
    if (!numericAmount || numericAmount <= 0) {
      setErrorMsg("Nominal pembayaran harus lebih dari 0");
      return;
    }
    if (!selectedPosId) {
      setErrorMsg("Pilih Pos Keuangan untuk mencatat pengeluaran");
      return;
    }

    setSaving(true);
    setIsMutating(true);

    try {
      const res = await recordVehicleTaxPayment({
        vehicle_id: id,
        tax_period: taxPeriod.trim(),
        payment_date: paymentDate,
        next_due_date: nextDueDate,
        amount: numericAmount,
        finance_pos_id: selectedPosId,
        user_id: sessionUser?.id || "00000000-0000-0000-0000-000000000000",
        user_name: currentMember?.display_name || "Suami",
        user_role: currentMember?.status_keluarga || (currentMember?.role === "admin" ? "suami" : "istri"),
        notes: notes.trim() || undefined,
      });

      if (!res.success) {
        throw new Error((res.error as any)?.message || "Gagal mencatat pembayaran pajak.");
      }

      router.push(`/kendaraan/${id}/pajak/riwayat`);
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan saat menyimpan.");
    } finally {
      setSaving(false);
      setIsMutating(false);
    }
  };

  if (loading || !vehicle) {
    return (
      <main className="page active" style={{ paddingBottom: "90px" }}>
        <div style={{ textAlign: "center", padding: "80px 20px", color: "var(--muted)" }}>
          Memuat formulir pajak...
        </div>
      </main>
    );
  }

  return (
    <main className="page active" style={{ paddingBottom: "110px" }}>
      {/* Header Standardized */}
      <PageHeader
        title="Bayar Pajak"
        subtitle="Catat pembayaran dan perpanjangan STNK/pajak"
        onBack={() => router.back()}
      />

      <div style={{ padding: "0 20px" }}>
        {/* Compact Vehicle Card */}
        <VehicleHeaderCard vehicle={vehicle} />

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

            {/* Periode Pajak */}
            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--navy)", marginBottom: "6px" }}>
                Periode Pajak <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                type="text"
                placeholder="Contoh: 2026 atau 2026/2027"
                value={taxPeriod}
                onChange={(e) => setTaxPeriod(e.target.value)}
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

            {/* Tanggal Pembayaran */}
            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--navy)", marginBottom: "6px" }}>
                Tanggal Pembayaran <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <DateInput
                value={paymentDate}
                onChange={setPaymentDate}
                placeholder="DD/MM/YYYY (contoh: 22/10/2026)"
              />
            </div>

            {/* Tanggal Pajak Berikutnya */}
            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--navy)", marginBottom: "6px" }}>
                Tanggal Pajak Berikutnya <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <DateInput
                value={nextDueDate}
                onChange={setNextDueDate}
                placeholder="DD/MM/YYYY (contoh: 22/10/2027)"
              />
            </div>

            {/* Nominal Pembayaran */}
            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--navy)", marginBottom: "6px" }}>
                Nominal Pembayaran <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <div style={{ position: "relative" }}>
                <span
                  style={{
                    position: "absolute",
                    left: "14px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "var(--navy)",
                  }}
                >
                  Rp
                </span>
                <input
                  type="text"
                  placeholder="0"
                  value={amountStr}
                  onChange={handleAmountChange}
                  style={{
                    width: "100%",
                    height: "44px",
                    padding: "0 14px 0 42px",
                    borderRadius: "10px",
                    border: "1px solid var(--border)",
                    background: "var(--bg)",
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "var(--text)",
                    boxSizing: "border-box",
                    outline: "none",
                  }}
                />
              </div>
            </div>

            {/* Pos Keuangan */}
            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--navy)", marginBottom: "6px" }}>
                Pos Keuangan <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <select
                value={selectedPosId}
                onChange={(e) => setSelectedPosId(e.target.value)}
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
              >
                <option value="" disabled>Pilih pos keuangan...</option>
                {posList.map((pos) => (
                  <option key={pos.id} value={pos.id}>
                    {pos.icon} {pos.name} (Saldo: Rp {pos.current_balance.toLocaleString("id-ID")})
                  </option>
                ))}
              </select>
            </div>

            {/* Catatan (opsional) */}
            <div style={{ marginBottom: "4px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--navy)", marginBottom: "6px" }}>
                Catatan <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 500 }}>(opsional)</span>
              </label>
              <textarea
                rows={2}
                placeholder="Contoh: Pembayaran di Samsat Keliling / Signal"
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

          <button
            type="submit"
            disabled={saving}
            style={{
              width: "100%",
              height: "46px",
              borderRadius: "12px",
              background: "var(--primary)",
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: 750,
              border: "none",
              cursor: saving ? "not-allowed" : "pointer",
              boxShadow: "0 4px 14px rgba(40, 127, 240, 0.3)",
            }}
          >
            {saving ? "Menyimpan Pembayaran..." : "Simpan Pembayaran"}
          </button>
        </form>
      </div>
    </main>
  );
}
