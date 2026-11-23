"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { useApp } from "@/lib/store";
import { evaluateDebtRatio } from "@/lib/debt-utils";
import VectorIconPicker from "@/components/ui/vector-icon-picker";
import StatusBadge from "@/components/ui/status-badge";
import {
  CreditCard,
  Check,
  AlertTriangle,
  Building,
  FileText,
  Calendar,
  Percent,
} from "lucide-react";

export default function TambahHutangPage() {
  const router = useRouter();
  const {
    addDebt,
    debts,
    posList,
    debtMaxSafePercentage,
    debtIncomeMode,
    debtCustomIncome,
  } = useApp();

  const [name, setName] = useState("");
  const [icon, setIcon] = useState("wallet");
  const [totalStr, setTotalStr] = useState("");
  const [monthlyStr, setMonthlyStr] = useState("");
  const [dueDateStr, setDueDateStr] = useState("1");

  const [isKredit, setIsKredit] = useState(false);
  const [principalStr, setPrincipalStr] = useState("");
  const [tenor, setTenor] = useState(0);
  const [paidMonths, setPaidMonths] = useState(0);
  const [creditor, setCreditor] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [notes, setNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Perhitungan Keuangan Otomatis
  const activeDebts = useMemo(() => debts.filter((d) => d.remaining_amount > 0), [debts]);
  const currentTotalMonthlyDebt = useMemo(() => activeDebts.reduce((s, d) => s + d.monthly_payment, 0), [activeDebts]);

  const autoMonthlyIncome = useMemo(() => {
    return posList.filter((p) => !p.is_goal).reduce((sum, p) => sum + (p.monthly_target || 0), 0);
  }, [posList]);

  const effectiveMonthlyIncome = useMemo(() => {
    if (debtIncomeMode === "custom" && debtCustomIncome > 0) return debtCustomIncome;
    return autoMonthlyIncome;
  }, [debtIncomeMode, debtCustomIncome, autoMonthlyIncome]);

  const handleAmtChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, "");
    if (!rawValue) {
      setter("");
      return;
    }
    setter(Number(rawValue).toLocaleString("id-ID"));
  };

  const enteredMonthly = Number(monthlyStr.replace(/\D/g, "")) || 0;
  const simulatedTotalDebt = (currentTotalMonthlyDebt || 0) + enteredMonthly;
  const evaluation = evaluateDebtRatio(simulatedTotalDebt, effectiveMonthlyIncome, debtMaxSafePercentage || 25);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let total = Number(totalStr.replace(/\D/g, ""));
    const monthly = Number(monthlyStr.replace(/\D/g, ""));
    const dueNum = Math.min(31, Math.max(1, Number(dueDateStr) || 1));
    let principal = 0;
    let tenorM = tenor;
    let paidM = paidMonths;
    let remaining = total;

    if (isKredit) {
      principal = Number(principalStr.replace(/\D/g, ""));
      tenorM = tenor;
      paidM = paidMonths;
      total = tenorM * monthly;
      remaining = total - (paidM * monthly);
    } else {
      if (paidM > 0 && monthly > 0) {
        remaining = total - (paidM * monthly);
      }
    }

    if (!name.trim()) {
      setErrorMsg("Nama hutang atau cicilan wajib diisi");
      return;
    }
    if (!total || total <= 0) {
      setErrorMsg("Total hutang harus lebih dari 0");
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      addDebt(
        name.trim(),
        icon,
        total,
        Math.max(0, remaining),
        monthly,
        dueNum,
        principal,
        tenorM,
        paidM,
        creditor.trim(),
        accountNumber.trim(),
        notes.trim()
      );

      router.push("/debts");
    } catch (err: any) {
      setErrorMsg(err?.message || "Gagal menyimpan hutang baru");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh pb-32" style={{ background: "var(--bg, #f8fafc)", color: "var(--text, #17375f)" }}>
      <PageHeader
        title="Tambah Hutang Baru"
        subtitle="Catat Pinjaman, KPR, atau Cicilan"
        backHref="/debts"
      />

      <main className="max-w-xl mx-auto px-4 pt-5">
        {errorMsg && (
          <div className="mb-5 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2.5 shadow-sm">
            <AlertTriangle size={18} className="shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Opsi Skema Kredit */}
          <div className="p-4 rounded-2xl border bg-white shadow-sm" style={{ borderColor: "var(--border, #e2e8f0)" }}>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                id="iskredit"
                checked={isKredit}
                onChange={(e) => setIsKredit(e.target.checked)}
                className="w-5 h-5 rounded text-teal-600 focus:ring-teal-500"
              />
              <div>
                <span className="text-sm font-bold text-teal-900 block">
                  Skema Kredit Berbunga (KPR, Leasing Kendaraan, dll)
                </span>
                <span className="text-xs text-slate-500">
                  Otomatis hitung total pengembalian dari tenor × cicilan bulanan
                </span>
              </div>
            </label>
          </div>

          {/* Identitas Pinjaman */}
          <div className="p-4 rounded-2xl border bg-white shadow-sm space-y-4" style={{ borderColor: "var(--border, #e2e8f0)" }}>
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <CreditCard size={18} className="text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">Identitas Cicilan</h2>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nama Hutang / Cicilan *
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: KPR Rumah / Cicilan Motor"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Pilih Icon Representasi
              </label>
              <VectorIconPicker value={icon} onChange={setIcon} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Pihak Pemberi Pinjaman / Bank
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Bank BCA / Mandiri / Teman"
                  value={creditor}
                  onChange={(e) => setCreditor(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nomor Kontrak / Rekening VA
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 1234-5678-9012"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Rincian Finansial & Tenor */}
          <div className="p-4 rounded-2xl border bg-white shadow-sm space-y-4" style={{ borderColor: "var(--border, #e2e8f0)" }}>
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Calendar size={18} className="text-teal-600" />
              <h2 className="text-sm font-bold text-slate-900">Nominal & Skema Pembayaran</h2>
            </div>

            {isKredit ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Plafon Pokok Pinjaman (Rp)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Contoh: 150.000.000"
                      value={principalStr}
                      onChange={handleAmtChange(setPrincipalStr)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Cicilan per Bulan (Rp) *
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      placeholder="Contoh: 2.500.000"
                      value={monthlyStr}
                      onChange={handleAmtChange(setMonthlyStr)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-bold text-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Total Tenor (Bulan) *
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      placeholder="60"
                      value={tenor || ""}
                      onChange={(e) => setTenor(Number(e.target.value) || 0)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Sudah Terbayar (Bulan)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={tenor || 1000}
                      placeholder="0"
                      value={paidMonths || ""}
                      onChange={(e) => setPaidMonths(Number(e.target.value) || 0)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                {tenor > 0 && monthlyStr && (
                  <div className="p-3.5 rounded-xl bg-teal-50/80 border border-teal-200 text-teal-900 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span>Total Kewajiban ({tenor} bulan × Cicilan):</span>
                      <strong className="font-extrabold">
                        Rp {(tenor * Number(monthlyStr.replace(/\D/g, ""))).toLocaleString("id-ID")}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Sisa Hutang ({tenor - paidMonths} bulan tersisa):</span>
                      <strong className="font-extrabold text-teal-800">
                        Rp {Math.max(0, (tenor - paidMonths) * Number(monthlyStr.replace(/\D/g, ""))).toLocaleString("id-ID")}
                      </strong>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Total Hutang Awal (Rp) *
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      placeholder="Contoh: 10.000.000"
                      value={totalStr}
                      onChange={handleAmtChange(setTotalStr)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Perkiraan Bayar per Bulan (Rp)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Contoh: 1.000.000"
                      value={monthlyStr}
                      onChange={handleAmtChange(setMonthlyStr)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Tanggal Jatuh Tempo Bulanan (1 - 31) *
              </label>
              <input
                type="number"
                min={1}
                max={31}
                required
                value={dueDateStr}
                onChange={(e) => setDueDateStr(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Sistem akan memberi pengingat saat mendekati tanggal {dueDateStr || 1} setiap bulannya.
              </p>
            </div>

            {/* Evaluasi Rasio Hutang Aman */}
            {enteredMonthly > 0 && effectiveMonthlyIncome > 0 && (
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700">
                    Simulasi Rasio Beban Cicilan (DSR):
                  </span>
                  <StatusBadge
                    label={`${evaluation.ratio}% (${evaluation.badgeText})`}
                    variant={evaluation.tier === "safe" ? "success" : evaluation.tier === "caution" ? "warning" : "danger"}
                  />
                </div>
                <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  {evaluation.message}
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Catatan Tambahan (Opsional)
              </label>
              <textarea
                rows={2}
                placeholder="Contoh: Bunga flat 0.6%, ada denda keterlambatan jika lewat tgl 10"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
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
                disabled={isSubmitting}
                className="w-2/3 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md shadow-blue-200 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isSubmitting ? (
                  <span>Menyimpan...</span>
                ) : (
                  <>
                    <Check size={18} />
                    <span>Simpan Hutang Baru</span>
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
