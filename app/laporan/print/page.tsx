"use client";

import React, { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApp } from "@/lib/store";
import {
  generateCompleteFinancialReport,
  formatRp,
} from "@/lib/report-service";
import { Printer, ArrowLeft } from "lucide-react";

export default function LaporanPrintPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    cycles,
    transactions,
    posList,
    cyclePosHistory,
    debts,
    children,
    currentKeluarga,
  } = useApp();

  const periodType = (searchParams.get("type") as "cycle" | "month" | "custom") || "cycle";
  const selectedCycleId = searchParams.get("cycleId") || cycles[0]?.id || "";
  const customStartDate = searchParams.get("start") || "";
  const customEndDate = searchParams.get("end") || "";

  const report = useMemo(() => {
    return generateCompleteFinancialReport({
      periodType,
      selectedCycleId,
      customStartDate,
      customEndDate,
      cycles,
      transactions,
      posList,
      cyclePosHistory,
      debts,
      children,
    });
  }, [
    periodType,
    selectedCycleId,
    customStartDate,
    customEndDate,
    cycles,
    transactions,
    posList,
    cyclePosHistory,
    debts,
    children,
  ]);

  const familyName = currentKeluarga?.nama_keluarga || "Keluarga Pratama";

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="bg-white min-h-screen text-slate-900 text-sm p-6 sm:p-10 font-sans print:p-0">
      {/* Action Header (Hidden in Print) */}
      <div className="flex items-center justify-between pb-6 mb-6 border-b border-slate-200 print:hidden max-w-4xl mx-auto">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Kembali ke Aplikasi</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-sm"
          >
            <Printer size={16} />
            <span>Cetak / Simpan PDF</span>
          </button>
        </div>
      </div>

      {/* Printable Sheet Container (A4 Formatted) */}
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        {/* 1. Header Surat Laporan */}
        <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
          <div>
            <div className="text-xs font-bold text-teal-700 uppercase tracking-widest">
              Laporan Keuangan Keluarga Formal
            </div>
            <h1 className="text-2xl font-black text-slate-900 mt-1">
              {familyName.toUpperCase()}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Aplikasi Catat Keluarga • Sistem Penganggaran Pos Kakeibo
            </p>
          </div>

          <div className="text-right">
            <div className="text-xs font-bold text-slate-800">
              Periode Evaluasi
            </div>
            <div className="text-sm font-extrabold text-teal-800 mt-0.5">
              {report.period.label}
            </div>
            <div className="text-[11px] text-slate-500">
              Rentang: {report.period.startDate} s/d {report.period.endDate} ({report.period.durationDays} Hari)
            </div>
          </div>
        </div>

        {/* 2. Ringkasan Eksekutif Arus Kas (Executive Summary Box) */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            I. Ringkasan Arus Kas &amp; Kesehatan Finansial
          </h2>
          <div className="grid grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] text-slate-500 font-bold uppercase">Total Pemasukan</div>
              <div className="text-base font-extrabold text-slate-900 mt-1">
                {formatRp(report.cashFlow.totalIncome)}
              </div>
              <div className="text-[9px] text-slate-500 mt-1">
                Pokok: {formatRp(report.cashFlow.budgetIncome)}
                {report.cashFlow.extraIncome > 0 && ` + Tambahan: ${formatRp(report.cashFlow.extraIncome)}`}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] text-slate-500 font-bold uppercase">Total Pengeluaran</div>
              <div className="text-base font-extrabold text-rose-600 mt-1">
                {formatRp(report.cashFlow.totalExpense)}
              </div>
              <div className="text-[9px] text-slate-500 mt-1">
                Burn Rate: {formatRp(report.cashFlow.dailyBurnRate)}/hari
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] text-slate-500 font-bold uppercase">Arus Kas Bersih</div>
              <div
                className={`text-base font-extrabold mt-1 ${
                  report.cashFlow.isSurplus ? "text-teal-600" : "text-rose-600"
                }`}
              >
                {report.cashFlow.isSurplus ? "+" : ""}
                {formatRp(report.cashFlow.netCashFlow)}
              </div>
              <div className="text-[9px] text-slate-500 mt-1 font-semibold">
                {report.cashFlow.isSurplus ? "Status: Surplus Finansial" : "Status: Defisit"}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] text-slate-500 font-bold uppercase">Saving Rate &amp; Cicilan</div>
              <div className="text-base font-extrabold text-teal-700 mt-1">
                {report.cashFlow.savingRate.toFixed(1)}%
              </div>
              <div className="text-[9px] text-slate-500 mt-1">
                Beban DSR: {report.cashFlow.dsrPercentage.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        {/* 3. Tabel Rekapitulasi Pos Anggaran */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            II. Realisasi Pos Anggaran (Budget vs Aktual)
          </h2>
          <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Nama Pos Anggaran</th>
                <th className="py-2.5 px-3 text-right">Target Budget</th>
                <th className="py-2.5 px-3 text-right">Realisasi Belanja</th>
                <th className="py-2.5 px-3 text-right">Sisa / Defisit</th>
                <th className="py-2.5 px-3 text-right">Pemakaian</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {report.posList.map((p) => {
                const isOver = p.status === "overbudget";
                return (
                  <tr key={p.posId} className={isOver ? "bg-rose-50/40" : ""}>
                    <td className="py-2 px-3 font-semibold text-slate-900 flex items-center gap-1.5">
                      <span>{p.posIcon}</span>
                      <span>{p.posName}</span>
                      {p.isDeletedPos && <span className="text-[9px] text-slate-400 font-normal">(Dihapus)</span>}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-600">{formatRp(p.targetBudget)}</td>
                    <td className="py-2 px-3 text-right font-bold text-slate-900">{formatRp(p.actualSpent)}</td>
                    <td
                      className={`py-2 px-3 text-right font-bold ${
                        isOver ? "text-rose-600" : "text-teal-700"
                      }`}
                    >
                      {formatRp(p.remainingBudget)}
                    </td>
                    <td className="py-2 px-3 text-right font-semibold">{p.percentageSpent.toFixed(0)}%</td>
                    <td className="py-2 px-3 text-center">
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                          isOver
                            ? "bg-rose-100 text-rose-800"
                            : p.status === "warning"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-teal-100 text-teal-800"
                        }`}
                      >
                        {isOver ? "BONCOS" : p.status === "warning" ? "WASPADA" : "AMAN"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 4. Kolaborasi & Kontribusi Pasutri */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            III. Pembagian Pengeluaran Anggota Keluarga
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {report.memberShares.map((m) => (
              <div key={`${m.role}_${m.name}`} className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>{m.name}</span>
                  <span className="text-[10px] uppercase font-semibold text-slate-500">({m.role})</span>
                </div>
                <div className="text-sm font-extrabold text-slate-900 mt-1">
                  {formatRp(m.totalSpent)}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Porsi: {m.percentage.toFixed(1)}% • {m.transactionCount} Transaksi
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 5. Bagian Catatan & Tanda Tangan Pasutri */}
        <div className="pt-6 border-t-2 border-slate-300 mt-4 flex items-start justify-between text-xs">
          <div className="w-1/2 pr-4">
            <div className="font-bold text-slate-700 uppercase text-[10px]">Catatan Evaluasi Bersama:</div>
            <div className="h-20 border border-dashed border-slate-300 rounded-lg p-2 mt-1 text-[11px] text-slate-400">
              Tuliskan target perbaikan atau pos yang ingin dihemat pada siklus berikutnya...
            </div>
          </div>

          <div className="w-1/2 flex justify-around text-center pt-2">
            <div>
              <div className="h-14" />
              <div className="border-t border-slate-400 font-bold px-6 pt-1">Suami</div>
              <div className="text-[10px] text-slate-500">Catat Keluarga</div>
            </div>
            <div>
              <div className="h-14" />
              <div className="border-t border-slate-400 font-bold px-6 pt-1">Istri</div>
              <div className="text-[10px] text-slate-500">Catat Keluarga</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

