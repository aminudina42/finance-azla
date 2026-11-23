"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { useApp } from "@/lib/store";
import { formatRp, getDebtLimitTierRanges, evaluateDebtRatio } from "@/lib/debt-utils";
import StatusBadge from "@/components/ui/status-badge";
import { Sliders, Check, ShieldCheck, AlertTriangle } from "lucide-react";

export default function PengaturanHutangPage() {
  const router = useRouter();
  const {
    debtMaxSafePercentage,
    debtIncomeMode,
    debtCustomIncome,
    updateDebtLimitSettings,
    debts,
    posList,
  } = useApp();

  const [pct, setPct] = useState<number>(debtMaxSafePercentage || 25);
  const [incomeMode, setIncomeMode] = useState<"auto" | "custom">(debtIncomeMode || "auto");
  const [customIncomeStr, setCustomIncomeStr] = useState<string>(
    debtCustomIncome ? debtCustomIncome.toLocaleString("id-ID") : ""
  );
  const [isSaving, setIsSaving] = useState(false);

  // Perhitungan Keuangan
  const activeDebts = useMemo(() => debts.filter((d) => d.remaining_amount > 0), [debts]);
  const totalMonthlyDebt = useMemo(() => activeDebts.reduce((s, d) => s + d.monthly_payment, 0), [activeDebts]);

  const autoMonthlyIncome = useMemo(() => {
    return posList.filter((p) => !p.is_goal).reduce((sum, p) => sum + (p.monthly_target || 0), 0);
  }, [posList]);

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const validatedPct = Math.max(5, Math.min(60, Math.round(Number(pct) || 25)));

    try {
      await updateDebtLimitSettings({
        maxPercentage: validatedPct,
        incomeMode,
        customIncome: customIncomeNum,
      });
      router.push("/debts");
    } catch (err) {
      console.error(err);
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-dvh pb-32" style={{ background: "var(--bg, #f8fafc)", color: "var(--text, #17375f)" }}>
      <PageHeader
        title="Batas Rasio Hutang"
        subtitle="Debt Service Ratio (DSR)"
        backHref="/debts"
      />

      <main className="max-w-xl mx-auto px-4 pt-5">
        <form onSubmit={handleSave} className="space-y-5">
          {/* 1. Pengaturan Persentase Batas Aman */}
          <div className="p-4 rounded-2xl border bg-white shadow-sm space-y-4" style={{ borderColor: "var(--border, #e2e8f0)" }}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Batas Aman Cicilan Bulanan</h2>
                <p className="text-xs text-slate-500">Maksimal persentase income untuk cicilan</p>
              </div>
              <span className="text-2xl font-black text-blue-600 font-serif">
                {pct}%
              </span>
            </div>

            {/* Presets */}
            <div className="grid grid-cols-4 gap-2">
              {[20, 25, 30, 35].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setPct(preset)}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all text-center ${
                    pct === preset
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {preset}% {preset === 25 ? "★" : ""}
                </button>
              ))}
            </div>

            <input
              type="range"
              min={5}
              max={50}
              step={1}
              value={pct}
              onChange={(e) => setPct(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>5% (Sangat Ketat)</span>
              <span>25% (Rekomendasi)</span>
              <span>50% (Toleransi Tinggi)</span>
            </div>
          </div>

          {/* 2. Visualisasi 3 Zona Peringatan */}
          <div className="p-4 rounded-2xl border bg-white shadow-sm space-y-3" style={{ borderColor: "var(--border, #e2e8f0)" }}>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Klasifikasi Kesehatan Finansial
            </h3>

            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-xl bg-teal-50 border border-teal-200/80">
                <div className="flex items-center gap-2.5">
                  <span className="text-base">🟢</span>
                  <div>
                    <div className="text-xs font-bold text-teal-900">Zona Aman</div>
                    <div className="text-[11px] text-teal-700">Cicilan di bawah batas toleransi</div>
                  </div>
                </div>
                <span className="text-xs font-black text-teal-800">{tierRanges.safeRange}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-200/80">
                <div className="flex items-center gap-2.5">
                  <span className="text-base">🟡</span>
                  <div>
                    <div className="text-xs font-bold text-amber-900">Caution (Waspada)</div>
                    <div className="text-[11px] text-amber-700">1–10% di atas batas yang diatur</div>
                  </div>
                </div>
                <span className="text-xs font-black text-amber-800">{tierRanges.cautionRange}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-rose-50 border border-rose-200/80">
                <div className="flex items-center gap-2.5">
                  <span className="text-base">🔴</span>
                  <div>
                    <div className="text-xs font-bold text-rose-900">Zona Bahaya (Danger)</div>
                    <div className="text-[11px] text-rose-700">Beban hutang menekan kebutuhan pokok</div>
                  </div>
                </div>
                <span className="text-xs font-black text-rose-800">{tierRanges.dangerRange}</span>
              </div>
            </div>
          </div>

          {/* 3. Basis Perhitungan Penghasilan Bulanan */}
          <div className="p-4 rounded-2xl border bg-white shadow-sm space-y-4" style={{ borderColor: "var(--border, #e2e8f0)" }}>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Basis Penghasilan Bulanan</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pilih apakah penghasilan dihitung otomatis dari budget pos atau nominal custom.
              </p>
            </div>

            <div className="space-y-3">
              <label
                className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                  incomeMode === "auto"
                    ? "bg-blue-50/60 border-blue-500"
                    : "bg-white border-slate-200 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="incomeMode"
                  checked={incomeMode === "auto"}
                  onChange={() => setIncomeMode("auto")}
                  className="mt-1 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    Otomatis dari Anggaran Pos Bulanan
                  </div>
                  <div className="text-xs font-semibold text-blue-700 mt-0.5">
                    Rp {autoMonthlyIncome.toLocaleString("id-ID")} / bulan
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Total target seluruh pos keuangan operasional & belanja keluarga
                  </div>
                </div>
              </label>

              <label
                className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                  incomeMode === "custom"
                    ? "bg-blue-50/60 border-blue-500"
                    : "bg-white border-slate-200 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="incomeMode"
                  checked={incomeMode === "custom"}
                  onChange={() => setIncomeMode("custom")}
                  className="mt-1 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="text-xs font-bold text-slate-900">
                    Gunakan Penghasilan Bersih Custom
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Masukkan total gaji bersih (take home pay) gabungan suami & istri
                  </div>

                  {incomeMode === "custom" && (
                    <div className="mt-2.5">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                          Rp
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="Contoh: 15.000.000"
                          value={customIncomeStr}
                          onChange={handleCustomIncomeChange}
                          className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </label>
            </div>

            {/* Simulasi Status Saat Ini */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Total Cicilan Aktif Saat Ini:</span>
                <strong className="font-extrabold text-slate-800">
                  Rp {totalMonthlyDebt.toLocaleString("id-ID")}
                </strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Rasio Beban Cicilan Saat Ini:</span>
                <StatusBadge
                  label={`${evaluation.ratio}% (${evaluation.badgeText})`}
                  variant={evaluation.tier === "safe" ? "success" : evaluation.tier === "caution" ? "warning" : "danger"}
                />
              </div>
            </div>
          </div>

          {/* Sticky Bottom Action Bar */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-slate-200 z-30">
            <div className="max-w-xl mx-auto flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="w-1/3 py-3 rounded-xl border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="w-2/3 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md shadow-blue-200 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isSaving ? (
                  <span>Menyimpan...</span>
                ) : (
                  <>
                    <Check size={18} />
                    <span>Simpan Pengaturan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
