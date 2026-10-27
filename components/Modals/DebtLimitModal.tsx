"use client";

import { useState } from "react";
import Modal from "@/components/Modal";
import { formatRp, getDebtLimitTierRanges, evaluateDebtRatio } from "@/lib/debt-utils";

interface DebtLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPercentage: number;
  currentIncomeMode: "auto" | "custom";
  currentCustomIncome: number;
  autoMonthlyIncome: number;
  totalMonthlyDebt: number;
  onSave: (settings: {
    maxPercentage: number;
    incomeMode: "auto" | "custom";
    customIncome: number;
  }) => void;
}

function DebtLimitModalContent({
  isOpen,
  onClose,
  currentPercentage = 25,
  currentIncomeMode = "auto",
  currentCustomIncome = 0,
  autoMonthlyIncome = 0,
  totalMonthlyDebt = 0,
  onSave,
}: DebtLimitModalProps) {
  const [pct, setPct] = useState<number>(currentPercentage || 25);
  const [incomeMode, setIncomeMode] = useState<"auto" | "custom">(currentIncomeMode || "auto");
  const [customIncomeStr, setCustomIncomeStr] = useState<string>(
    currentCustomIncome ? currentCustomIncome.toLocaleString("id-ID") : ""
  );

  const customIncomeNum = Number(customIncomeStr.replace(/\D/g, "")) || 0;
  const effectiveIncome = incomeMode === "auto" ? autoMonthlyIncome : customIncomeNum;
  const tierRanges = getDebtLimitTierRanges(pct);
  const evaluation = evaluateDebtRatio(totalMonthlyDebt, effectiveIncome, pct);

  const handleCustomIncomeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) {
      setCustomIncomeStr("");
      return;
    }
    setCustomIncomeStr(Number(raw).toLocaleString("id-ID"));
  };

  const handleSave = () => {
    const validatedPct = Math.max(5, Math.min(60, Math.round(Number(pct) || 25)));
    onSave({
      maxPercentage: validatedPct,
      incomeMode,
      customIncome: customIncomeNum,
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="mt" style={{ marginBottom: "6px" }}>
        ⚙️ Atur Batas Persentase Hutang
      </div>
      <p style={{ fontSize: "12.5px", color: "var(--text-secondary)", marginBottom: "16px", lineHeight: "1.45" }}>
        Atur persentase maksimal cicilan bulanan yang boleh diambil keluarga. Sistem akan mendeteksi kesehatan keuangan dan memberikan peringatan dini otomatis.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* 1. Pengaturan Persentase Batas Aman */}
        <div
          style={{
            background: "var(--bg)",
            borderRadius: "16px",
            padding: "16px",
            border: "1.5px solid var(--border)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px" }}>
            <span style={{ fontSize: "13px", fontWeight: 750, color: "var(--navy)" }}>
              Batas Aman Cicilan Bulanan:
            </span>
            <span
              style={{
                fontSize: "24px",
                fontWeight: 900,
                color: "var(--primary)",
                fontFamily: "var(--font-fraunces), serif",
              }}
            >
              {pct}%
            </span>
          </div>

          {/* Quick presets */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
            {[20, 25, 30, 35].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setPct(preset)}
                style={{
                  flex: "1 1 0",
                  padding: "6px 0",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: pct === preset ? 800 : 600,
                  background: pct === preset ? "var(--primary)" : "#ffffff",
                  color: pct === preset ? "#ffffff" : "var(--text-secondary)",
                  border: `1.5px solid ${pct === preset ? "var(--primary)" : "var(--border)"}`,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {preset}% {preset === 25 ? "★" : ""}
              </button>
            ))}
          </div>

          {/* Range slider */}
          <input
            type="range"
            min={5}
            max={50}
            step={1}
            value={pct}
            onChange={(e) => setPct(Number(e.target.value))}
            style={{ width: "100%", accentColor: "var(--primary)", cursor: "pointer" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10.5px", color: "var(--muted)", marginTop: "4px" }}>
            <span>5% (Sangat Ketat)</span>
            <span>25% (Rekomendasi)</span>
            <span>50% (Toleransi Tinggi)</span>
          </div>
        </div>

        {/* 2. Visualisasi 3 Zona Peringatan Dinamis */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ fontSize: "12px", fontWeight: 750, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Klasifikasi Kesehatan Finansial:
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: "8px",
            }}
          >
            {/* Zona Aman */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "9px 12px",
                borderRadius: "10px",
                background: "rgba(22, 168, 154, 0.08)",
                border: "1px solid rgba(22, 168, 154, 0.25)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "16px" }}>🟢</span>
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 750, color: "var(--teal)" }}>
                    Masih Aman
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                    Beban cicilan di bawah persentase batas
                  </div>
                </div>
              </div>
              <span style={{ fontSize: "12.5px", fontWeight: 800, color: "var(--teal)", fontVariantNumeric: "tabular-nums" }}>
                {tierRanges.safeRange}
              </span>
            </div>

            {/* Zona Caution */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "9px 12px",
                borderRadius: "10px",
                background: "rgba(244, 163, 59, 0.08)",
                border: "1px solid rgba(244, 163, 59, 0.25)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "16px" }}>🟡</span>
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 750, color: "#d97706" }}>
                    Caution: Mulai Tidak Sehat
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                    1–10% di atas batas yang diatur
                  </div>
                </div>
              </div>
              <span style={{ fontSize: "12.5px", fontWeight: 800, color: "#d97706", fontVariantNumeric: "tabular-nums" }}>
                {tierRanges.cautionRange}
              </span>
            </div>

            {/* Zona Bahaya */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "9px 12px",
                borderRadius: "10px",
                background: "rgba(240, 68, 103, 0.08)",
                border: "1px solid rgba(240, 68, 103, 0.25)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "16px" }}>🔴</span>
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 750, color: "var(--danger)" }}>
                    Peringatan: Sangat Tidak Sehat
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                    Lebih dari 10% di atas batas aman
                  </div>
                </div>
              </div>
              <span style={{ fontSize: "12.5px", fontWeight: 800, color: "var(--danger)", fontVariantNumeric: "tabular-nums" }}>
                {tierRanges.dangerRange}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Basis Penghasilan / Denominator */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "14px",
            padding: "14px",
            border: "1.5px solid var(--border)",
          }}
        >
          <div style={{ fontSize: "12.5px", fontWeight: 750, color: "var(--navy)", marginBottom: "8px" }}>
            Dasar Penghasilan / Anggaran Bulanan:
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <label
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "8px",
                cursor: "pointer",
                fontSize: "12px",
                color: "var(--navy)",
              }}
            >
              <input
                type="radio"
                name="incomeMode"
                checked={incomeMode === "auto"}
                onChange={() => setIncomeMode("auto")}
                style={{ marginTop: "2px", accentColor: "var(--primary)" }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>
                  Otomatis dari Total Alokasi Pos ({formatRp(autoMonthlyIncome)}/bln)
                </div>
                <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                  Menggunakan jumlah seluruh target anggaran pos bulanan yang aktif.
                </div>
              </div>
            </label>

            <label
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "8px",
                cursor: "pointer",
                fontSize: "12px",
                color: "var(--navy)",
              }}
            >
              <input
                type="radio"
                name="incomeMode"
                checked={incomeMode === "custom"}
                onChange={() => setIncomeMode("custom")}
                style={{ marginTop: "2px", accentColor: "var(--primary)" }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>Estimasi Penghasilan Bulanan Manual</div>
                <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                  Isi nominal jika belum sempat mengatur pos anggaran di aplikasi.
                </div>
              </div>
            </label>

            {incomeMode === "custom" && (
              <div className="amt-wrap" style={{ marginTop: "4px" }}>
                <span className="amt-pre" style={{ fontSize: "13px" }}>Rp</span>
                <input
                  type="tel"
                  className="fi"
                  value={customIncomeStr}
                  onChange={handleCustomIncomeChange}
                  placeholder="Contoh: 10.000.000"
                  style={{ paddingLeft: "38px", fontSize: "16px", fontWeight: 800 }}
                />
              </div>
            )}
          </div>
        </div>

        {/* 4. Kondisi Saat Ini */}
        <div
          style={{
            padding: "12px 14px",
            borderRadius: "12px",
            background: evaluation.badgeBg,
            border: `1px solid ${evaluation.tier === "safe" ? "rgba(22, 168, 154, 0.3)" : evaluation.tier === "caution" ? "rgba(244, 163, 59, 0.3)" : "rgba(240, 68, 103, 0.3)"}`,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
            <span style={{ fontSize: "11.5px", fontWeight: 750, color: "var(--text-secondary)" }}>
              Posisi Cicilan Saat Ini:
            </span>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 800,
                color: evaluation.badgeColor,
                padding: "2px 8px",
                borderRadius: "6px",
                background: "#ffffff",
              }}
            >
              {evaluation.badgeText} ({evaluation.ratio}%)
            </span>
          </div>
          <div style={{ fontSize: "12px", color: "var(--navy)", lineHeight: "1.4" }}>
            {evaluation.message}
          </div>
        </div>
      </div>

      <div className="m-actions" style={{ marginTop: "18px" }}>
        <button type="button" className="m-cancel" onClick={onClose}>
          Batal
        </button>
        <button type="button" className="m-save" onClick={handleSave}>
          Simpan Pengaturan
        </button>
      </div>
    </Modal>
  );
}

export default function DebtLimitModal(props: DebtLimitModalProps) {
  if (!props.isOpen) return null;
  return <DebtLimitModalContent {...props} />;
}

