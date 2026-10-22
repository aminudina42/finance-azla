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
  const [localGajianDate, setLocalGajianDate] = useState(gajianDate || 25);
  const [availableBudget, setAvailableBudget] = useState("");
  const [selectedPosId, setSelectedPosId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (gajianDate) {
      setLocalGajianDate(gajianDate);
    }
  }, [gajianDate]);

  // Non-goal pos list for Option B single envelope allocation
  const nonGoalPosList = useMemo(() => {
    return posList.filter((p) => !p.is_goal);
  }, [posList]);

  // Auto-select sensible default pos (preference for "Belanja", "Bebas", or first non-goal pos)
  useEffect(() => {
    if (nonGoalPosList.length > 0 && !selectedPosId) {
      const preferred =
        nonGoalPosList.find((p) => /belanja|bebas/i.test(p.name)) ||
        nonGoalPosList[0];
      if (preferred) {
        setSelectedPosId(preferred.id);
      }
    }
  }, [nonGoalPosList, selectedPosId]);

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

  // Calculate temporary cycle end date for display
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

  const totalMonthlyBudget = nonGoalPosList.reduce((sum, p) => sum + p.monthly_target, 0);

  const selectedPos = useMemo(() => {
    return nonGoalPosList.find((p) => p.id === selectedPosId) || nonGoalPosList[0];
  }, [nonGoalPosList, selectedPosId]);

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
      await createFirstCycle("now", budget, localGajianDate, selectedPosId);
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
              Kapan Tanggal Gajian Anda?
            </h2>
            <p style={{ fontSize: "13px", color: "var(--muted)", lineHeight: 1.5, margin: 0 }}>
              Masukkan tanggal saat gaji bulanan keluarga Anda biasa masuk. Ini dipakai sebagai patokan pergantian siklus keuangan.
            </p>
          </div>

          <div className="fg" style={{ marginBottom: "16px" }}>
            <div className="fl" style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-secondary)", textAlign: "center" }}>
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
                fontSize: "34px",
                fontWeight: 900,
                textAlign: "center",
                padding: "12px",
                borderRadius: "14px",
              }}
            />
          </div>

          <p style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "20px", lineHeight: 1.4, textAlign: "center" }}>
            * Maksimal tanggal 28 agar aman dan selalu tepat di semua bulan (termasuk Februari).
          </p>

          <button
            type="button"
            className="m-save"
            onClick={handleStep1Next}
            disabled={isSubmitting}
            style={{ width: "100%", padding: "14px", fontSize: "14px", fontWeight: 750, borderRadius: "12px" }}
          >
            {isSubmitting ? "Menyiapkan..." : "Lanjutkan →"}
          </button>
        </div>
      )}

      {/* Step 2: Choose Mode (Level 1: Ramah pemula) */}
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
              Gaji Anda berikutnya masuk pada tanggal <strong>{localGajianDate}</strong>. Bagaimana Anda ingin memulai pencatatan?
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "12px" }}>
            {/* Option A: Start Now (Kelola Sisa Uang) */}
            <button
              type="button"
              onClick={handleStartNow}
              style={{
                padding: "16px",
                borderRadius: "14px",
                border: "2px solid #38bdf8",
                background: "linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.15s ease",
                boxShadow: "0 3px 12px rgba(56, 189, 248, 0.12)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                <span
                  style={{
                    fontSize: "15px",
                    fontWeight: 750,
                    color: "var(--navy)",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <span>Mulai Catat Sekarang</span>
                </span>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 750,
                    color: "#0369a1",
                    background: "#e0f2fe",
                    padding: "3px 8px",
                    borderRadius: "20px",
                  }}
                >
                  Disarankan
                </span>
              </div>
              <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
                Punya sisa uang di rekening atau dompet? Masukkan jumlahnya dan langsung catat pengeluaran harian sampai gajian tiba ({partialEndDate.getDate()} {partialEndDate.toLocaleDateString("id-ID", { month: "short" })}).
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
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: 750,
                    color: "var(--navy)",
                  }}
                >
                  {isSubmitting ? "Menyiapkan..." : "Tunggu Sampai Gajian Tiba"}
                </span>
              </div>
              <p style={{ fontSize: "12px", color: "var(--muted)", margin: 0, lineHeight: 1.5 }}>
                Mulai mencatat dari nol saat gaji bulan depan masuk. Saat gajian tiba di tanggal {localGajianDate}, Anda tinggal tekan tombol &ldquo;Gajian Tiba!&rdquo;.
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

      {/* Step 3: Input Available Budget (Level 2 Opsi B: Masukkan semua ke 1 pos) */}
      {step === 3 && (
        <div>
          <div style={{ textAlign: "center", marginBottom: "18px" }}>
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
              Kelola Sisa Uang
            </h2>
            <p style={{ fontSize: "13px", color: "var(--muted)", lineHeight: 1.5, margin: 0 }}>
              Berapa sisa uang Anda saat ini untuk kebutuhan sampai tanggal gajian ({localGajianDate})?
            </p>
          </div>

          {/* Simple banner info */}
          <div
            style={{
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: "12px",
              padding: "10px 14px",
              marginBottom: "16px",
              fontSize: "12px",
              color: "#166534",
              lineHeight: 1.5,
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span style={{ fontSize: "16px" }}>📆</span>
            <span>
              <strong>Periode Sementara:</strong> {new Date().getDate()} {new Date().toLocaleDateString("id-ID", { month: "short" })} – {partialEndDate.getDate()} {partialEndDate.toLocaleDateString("id-ID", { month: "short" })} ({daysInfo.daysUntil} hari)
            </span>
          </div>

          {/* 1. Sisa uang input */}
          <div className="fg" style={{ marginBottom: "14px" }}>
            <div className="fl" style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-secondary)" }}>
              Sisa Uang Anda Saat Ini
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
                autoFocus
                style={{
                  paddingLeft: "48px",
                  fontFamily: "'Fraunces', serif",
                  fontSize: "24px",
                  fontWeight: 900,
                  borderRadius: "12px",
                }}
              />
            </div>
          </div>

          {/* 2. Level 2 Opsi B: Pos Target Selector */}
          <div className="fg" style={{ marginBottom: "16px" }}>
            <div className="fl" style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-secondary)" }}>
              Pilih Pos untuk Memakai Sisa Uang Ini
            </div>
            <select
              className="fi"
              value={selectedPosId}
              onChange={(e) => setSelectedPosId(e.target.value)}
              style={{
                fontSize: "14px",
                fontWeight: 650,
                color: "var(--navy)",
                borderRadius: "12px",
                padding: "10px 12px",
              }}
            >
              {nonGoalPosList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.icon} {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Explanation note */}
          <div
            style={{
              background: "var(--s1, #f8fbff)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              padding: "10px 12px",
              marginBottom: "18px",
              fontSize: "12px",
              color: "var(--text-secondary)",
              lineHeight: 1.5,
            }}
          >
            💡 Seluruh sisa uang{" "}
            <strong>
              {availableBudget && parseInt(availableBudget.replace(/\D/g, ""), 10) > 0
                ? formatRp(parseInt(availableBudget.replace(/\D/g, ""), 10))
                : "Rp 0"}
            </strong>{" "}
            akan dimasukkan ke pos <strong>{selectedPos?.icon} {selectedPos?.name}</strong> untuk belanja kebutuhan harian sampai gajian. Pos lainnya akan mulai aktif saat gaji baru masuk!
          </div>

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
                padding: "14px",
                fontSize: "14px",
                fontWeight: 750,
                borderRadius: "12px",
              }}
            >
              {isSubmitting ? "Membuat Siklus..." : "Mulai Catat Sekarang →"}
            </button>

            <button
              type="button"
              onClick={() => handleCreatePartialCycle(undefined)}
              disabled={isSubmitting}
              style={{
                width: "100%",
                padding: "9px",
                border: "none",
                background: "transparent",
                color: "var(--muted)",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Lewati, mulai dengan saldo Rp 0 →
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
