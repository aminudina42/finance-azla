"use client";

import { useState, useMemo, useEffect } from "react";
import { useApp } from "@/lib/store";
import Modal from "@/components/Modal";

function formatRp(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}

interface FirstCycleSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FirstCycleSetupModal({
  isOpen,
  onClose,
}: FirstCycleSetupModalProps) {
  const { gajianDate, setGajianDate, createFirstCycle, posList } = useApp();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [localGajianDate, setLocalGajianDate] = useState(gajianDate);
  const [availableBudget, setAvailableBudget] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (gajianDate) {
      setLocalGajianDate(gajianDate);
    }
  }, [gajianDate]);

  // Calculate days until next payday
  const daysInfo = useMemo(() => {
    const today = new Date();
    const todayDate = today.getDate();
    const gd = localGajianDate;

    if (todayDate === gd) {
      return { daysUntil: 0, isToday: true };
    }

    let daysUntil: number;
    if (gd > todayDate) {
      daysUntil = gd - todayDate;
    } else {
      // Next month
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      daysUntil = daysInMonth - todayDate + gd;
    }

    return { daysUntil, isToday: false };
  }, [localGajianDate]);

  // Calculate partial cycle end date for display
  const partialEndDate = useMemo(() => {
    const today = new Date();
    const gd = localGajianDate;
    let endDate: Date;
    if (today.getDate() < gd) {
      endDate = new Date(today.getFullYear(), today.getMonth(), gd - 1);
    } else {
      endDate = new Date(today.getFullYear(), today.getMonth() + 1, gd - 1);
    }
    return endDate;
  }, [localGajianDate]);

  const totalMonthlyBudget = posList
    .filter((p) => !p.is_goal)
    .reduce((sum, p) => sum + p.monthly_target, 0);

  const handleStep1Next = async () => {
    const clamped = Math.max(1, Math.min(28, localGajianDate));
    setLocalGajianDate(clamped);
    await setGajianDate(clamped);

    if (daysInfo.isToday) {
      // Today is payday — create normal cycle immediately
      setIsSubmitting(true);
      try {
        await createFirstCycle("now", totalMonthlyBudget, clamped);
        onClose();
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setStep(2);
    }
  };

  const handleStartNow = () => {
    setStep(3);
  };

  const handleWait = async () => {
    setIsSubmitting(true);
    try {
      await createFirstCycle("wait", undefined, localGajianDate);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreatePartialCycle = async (budget?: number) => {
    setIsSubmitting(true);
    try {
      await createFirstCycle("now", budget, localGajianDate);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={() => {}}>
      {/* Step 1: Set Gajian Date */}
      {step === 1 && (
        <div>
          <div style={{ textAlign: "center", marginBottom: "20px" }}>
            <div
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "16px",
                background: "linear-gradient(135deg, #eaf5fc 0%, #d0e8ff 100%)",
                display: "grid",
                placeItems: "center",
                fontSize: "28px",
                margin: "0 auto 12px auto",
                border: "1px solid #c7e0f8",
              }}
            >
              📅
            </div>
            <h2
              style={{
                fontFamily: "var(--font-fraunces), serif",
                fontSize: "20px",
                fontWeight: 800,
                color: "var(--navy)",
                margin: "0 0 6px 0",
              }}
            >
              Setup Awal
            </h2>
            <p style={{ fontSize: "13px", color: "var(--muted)", lineHeight: 1.5, margin: 0 }}>
              Sebelum mulai, kami perlu tahu kapan Anda menerima gaji setiap bulan.
            </p>
          </div>

          <div className="fg" style={{ marginBottom: "16px" }}>
            <div className="fl" style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-secondary)" }}>
              Tanggal Gajian Bulanan (1 – 28)
            </div>
            <input
              type="number"
              className="fi"
              value={localGajianDate}
              min={1}
              max={28}
              onChange={(e) => setLocalGajianDate(Number(e.target.value))}
              style={{
                fontFamily: "'Fraunces', serif",
                fontSize: "32px",
                fontWeight: 900,
                textAlign: "center",
                padding: "12px",
              }}
            />
          </div>

          <p style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "16px", lineHeight: 1.4 }}>
            * Maks tgl 28 untuk menghindari masalah di bulan Februari.
          </p>

          <button
            type="button"
            className="m-save"
            onClick={handleStep1Next}
            disabled={isSubmitting}
            style={{ width: "100%", padding: "13px", fontSize: "14px", fontWeight: 750, borderRadius: "12px" }}
          >
            {isSubmitting ? "Memproses..." : "Lanjutkan →"}
          </button>
        </div>
      )}

      {/* Step 2: Choose Mode */}
      {step === 2 && (
        <div>
          <div style={{ textAlign: "center", marginBottom: "20px" }}>
            <div
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "16px",
                background: "linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)",
                display: "grid",
                placeItems: "center",
                fontSize: "28px",
                margin: "0 auto 12px auto",
                border: "1px solid #ffe0b2",
              }}
            >
              ⏳
            </div>
            <h2
              style={{
                fontFamily: "var(--font-fraunces), serif",
                fontSize: "19px",
                fontWeight: 800,
                color: "var(--navy)",
                margin: "0 0 6px 0",
              }}
            >
              Gajian Masih {daysInfo.daysUntil} Hari Lagi
            </h2>
            <p style={{ fontSize: "13px", color: "var(--muted)", lineHeight: 1.5, margin: 0 }}>
              Anda mulai menggunakan aplikasi sebelum tanggal gajian. Bagaimana Anda ingin memulai?
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "8px" }}>
            {/* Option A: Start Now */}
            <button
              type="button"
              onClick={handleStartNow}
              style={{
                padding: "16px",
                borderRadius: "14px",
                border: "1.5px solid #c7e0f8",
                background: "linear-gradient(135deg, #ffffff 0%, #f4f9ff 100%)",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.15s ease",
                boxShadow: "0 2px 8px rgba(40, 127, 240, 0.06)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: 750,
                    color: "var(--navy)",
                  }}
                >
                  Mulai Catat Sekarang
                </span>
              </div>
              <p style={{ fontSize: "12px", color: "var(--muted)", margin: 0, lineHeight: 1.5 }}>
                Buat siklus parsial ({new Date().getDate()} {new Date().toLocaleDateString("id-ID", { month: "short" })} – {partialEndDate.getDate()} {partialEndDate.toLocaleDateString("id-ID", { month: "short" })}). Masukkan budget yang tersedia dan langsung catat pengeluaran.
              </p>
            </button>

            {/* Option B: Wait */}
            <button
              type="button"
              onClick={handleWait}
              disabled={isSubmitting}
              style={{
                padding: "16px",
                borderRadius: "14px",
                border: "1.5px solid var(--border)",
                background: "var(--s1, #f8fbff)",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.15s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: 750,
                    color: "var(--navy)",
                  }}
                >
                  {isSubmitting ? "Menyimpan..." : "Tunggu Sampai Gajian"}
                </span>
              </div>
              <p style={{ fontSize: "12px", color: "var(--muted)", margin: 0, lineHeight: 1.5 }}>
                Atur pos anggaran dulu sekarang. Saat gaji masuk tanggal {localGajianDate}, tekan &ldquo;Gajian Tiba!&rdquo; untuk memulai siklus pertama.
              </p>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setStep(1)}
            style={{
              width: "100%",
              padding: "10px",
              border: "none",
              background: "transparent",
              color: "var(--muted)",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              marginTop: "4px",
            }}
          >
            ← Kembali ubah tanggal gajian
          </button>
        </div>
      )}

      {/* Step 3: Input Available Budget (for "Start Now") */}
      {step === 3 && (
        <div>
          <div style={{ textAlign: "center", marginBottom: "20px" }}>
            <div
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "16px",
                background: "linear-gradient(135deg, #e0f7f1 0%, #b2f0e0 100%)",
                display: "grid",
                placeItems: "center",
                fontSize: "28px",
                margin: "0 auto 12px auto",
                border: "1px solid #b2f0e0",
              }}
            >
              💰
            </div>
            <h2
              style={{
                fontFamily: "var(--font-fraunces), serif",
                fontSize: "19px",
                fontWeight: 800,
                color: "var(--navy)",
                margin: "0 0 6px 0",
              }}
            >
              Budget Tersedia
            </h2>
            <p style={{ fontSize: "13px", color: "var(--muted)", lineHeight: 1.5, margin: 0 }}>
              Berapa uang yang Anda punya saat ini untuk dikelola sampai gajian tanggal {localGajianDate}?
            </p>
          </div>

          {/* Info box about partial cycle */}
          <div
            style={{
              background: "var(--s1, #f8fbff)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              padding: "12px 14px",
              marginBottom: "16px",
              fontSize: "12px",
              color: "var(--text-secondary)",
              lineHeight: 1.5,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
              <span>📆</span>
              <strong>Siklus Parsial:</strong>{" "}
              {new Date().getDate()} {new Date().toLocaleDateString("id-ID", { month: "short" })} – {partialEndDate.getDate()} {partialEndDate.toLocaleDateString("id-ID", { month: "short" })} ({daysInfo.daysUntil} hari)
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span>💡</span>
              <span>Budget akan didistribusikan proporsional ke setiap pos berdasarkan target bulanan masing-masing.</span>
            </div>
          </div>

          <div className="fg" style={{ marginBottom: "16px" }}>
            <div className="fl" style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-secondary)" }}>
              Total Uang Tersedia Saat Ini
            </div>
            <div className="amt-wrap">
              <span className="amt-pre" style={{ fontSize: "16px" }}>Rp</span>
              <input
                type="tel"
                className="fi"
                value={availableBudget}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, "");
                  setAvailableBudget(raw ? Number(raw).toLocaleString("id-ID") : "");
                }}
                placeholder="0"
                style={{
                  paddingLeft: "48px",
                  fontFamily: "'Fraunces', serif",
                  fontSize: "24px",
                  fontWeight: 900,
                }}
              />
            </div>
          </div>

          {/* Preview distribution */}
          {availableBudget && parseInt(availableBudget.replace(/\D/g, ""), 10) > 0 && (
            <div
              style={{
                marginBottom: "16px",
                maxHeight: "140px",
                overflowY: "auto",
                borderRadius: "10px",
                border: "1px solid var(--border)",
              }}
            >
              {posList.filter(p => !p.is_goal).map((p) => {
                const budgetNum = parseInt(availableBudget.replace(/\D/g, ""), 10) || 0;
                const proportion = totalMonthlyBudget > 0 ? p.monthly_target / totalMonthlyBudget : 0;
                const allocated = Math.round(budgetNum * proportion);
                return (
                  <div
                    key={p.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 12px",
                      borderBottom: "1px solid var(--border)",
                      fontSize: "12px",
                    }}
                  >
                    <span style={{ color: "var(--text-secondary)" }}>
                      {p.icon} {p.name}
                    </span>
                    <span style={{ fontWeight: 700, color: "var(--navy)", fontFamily: "var(--font-fraunces), serif" }}>
                      {formatRp(allocated)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <button
              type="button"
              className="m-save"
              onClick={() => {
                const budgetNum = parseInt(availableBudget.replace(/\D/g, ""), 10) || 0;
                handleCreatePartialCycle(budgetNum > 0 ? budgetNum : undefined);
              }}
              disabled={isSubmitting}
              style={{
                width: "100%",
                padding: "13px",
                fontSize: "14px",
                fontWeight: 750,
                borderRadius: "12px",
              }}
            >
              {isSubmitting ? "Membuat Siklus..." : "Mulai Siklus Parsial"}
            </button>

            <button
              type="button"
              onClick={() => handleCreatePartialCycle(undefined)}
              disabled={isSubmitting}
              style={{
                width: "100%",
                padding: "10px",
                border: "none",
                background: "transparent",
                color: "var(--muted)",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Lewati, mulai dari Rp 0 →
            </button>

            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={isSubmitting}
              style={{
                width: "100%",
                padding: "8px",
                border: "none",
                background: "transparent",
                color: "var(--muted)",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              ← Kembali
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

