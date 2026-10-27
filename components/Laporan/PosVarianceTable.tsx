"use client";

import React, { useState, useMemo } from "react";
import type { PosVarianceItem } from "@/lib/report-service";
import { formatRp } from "@/lib/report-service";
import { Award, AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";

interface PosVarianceTableProps {
  posList: PosVarianceItem[];
  top3Expenses: PosVarianceItem[];
}

export default function PosVarianceTable({ posList, top3Expenses }: PosVarianceTableProps) {
  const [filter, setFilter] = useState<"all" | "overbudget" | "warning" | "safe">("all");

  const counts = useMemo(() => {
    return {
      all: posList.length,
      overbudget: posList.filter((p) => p.status === "overbudget").length,
      warning: posList.filter((p) => p.status === "warning").length,
      safe: posList.filter((p) => p.status === "safe").length,
    };
  }, [posList]);

  const filteredList = useMemo(() => {
    if (filter === "all") return posList;
    return posList.filter((p) => p.status === filter);
  }, [posList, filter]);

  return (
    <section className="flex flex-col gap-4" aria-label="Analisis Realisasi Pos Anggaran">
      {/* 1. Top 3 Pengeluaran Terbesar (Pareto 80/20) */}
      {top3Expenses.length > 0 && (
        <div
          className="p-4 rounded-2xl flex flex-col gap-3"
          style={{
            background: "linear-gradient(135deg, rgba(40, 127, 240, 0.05) 0%, rgba(40, 127, 240, 0.01) 100%), var(--surface)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow, 0 4px 12px rgba(16,45,85,0.04))",
          }}
        >
          <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: "var(--navy)" }}>
            <Award size={16} className="text-amber-500" />
            <span>Top 3 Pos Pengeluaran Terbesar (Pareto)</span>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {top3Expenses.map((pos, idx) => (
              <div
                key={pos.posId}
                className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-white/70"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-extrabold text-[11px] flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <span className="text-base shrink-0">{pos.posIcon}</span>
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate" style={{ color: "var(--navy)" }}>
                      {pos.posName}
                    </div>
                    <div className="text-[10px]" style={{ color: "var(--muted)" }}>
                      Target: {formatRp(pos.targetBudget)}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div
                    className="text-xs font-extrabold"
                    style={{ fontFamily: "var(--font-fraunces), serif", color: "var(--danger, #f04467)" }}
                  >
                    {formatRp(pos.actualSpent)}
                  </div>
                  <div className="text-[10px] font-bold text-slate-500">
                    {pos.percentageSpent.toFixed(0)}% budget
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Filter Tabs / Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`py-1.5 px-3 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
            filter === "all" ? "bg-slate-900 text-white" : "border border-slate-200 text-slate-600 bg-white"
          }`}
        >
          <span>Semua Pos</span>
          <span className="text-[10px] opacity-80">({counts.all})</span>
        </button>

        <button
          type="button"
          onClick={() => setFilter("overbudget")}
          className={`py-1.5 px-3 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
            filter === "overbudget" ? "bg-rose-600 text-white" : "border border-rose-200 text-rose-700 bg-rose-50"
          }`}
        >
          <ShieldAlert size={13} />
          <span>Boncos</span>
          <span className="text-[10px] font-extrabold">({counts.overbudget})</span>
        </button>

        <button
          type="button"
          onClick={() => setFilter("warning")}
          className={`py-1.5 px-3 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
            filter === "warning" ? "bg-amber-600 text-white" : "border border-amber-200 text-amber-700 bg-amber-50"
          }`}
        >
          <AlertTriangle size={13} />
          <span>Waspada</span>
          <span className="text-[10px] font-extrabold">({counts.warning})</span>
        </button>

        <button
          type="button"
          onClick={() => setFilter("safe")}
          className={`py-1.5 px-3 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
            filter === "safe" ? "bg-teal-600 text-white" : "border border-teal-200 text-teal-700 bg-teal-50"
          }`}
        >
          <CheckCircle2 size={13} />
          <span>Aman</span>
          <span className="text-[10px] font-extrabold">({counts.safe})</span>
        </button>
      </div>

      {/* 3. Daftar Realisasi Pos */}
      <div className="flex flex-col gap-2.5">
        {filteredList.length === 0 ? (
          <div
            className="p-8 text-center rounded-2xl border text-xs font-medium"
            style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--muted)" }}
          >
            Tidak ada pos dalam kategori ini.
          </div>
        ) : (
          filteredList.map((pos) => {
            const isOver = pos.status === "overbudget";
            const isWarn = pos.status === "warning";

            // Bar color
            let barColor = "var(--success, #16a89a)";
            if (isOver) barColor = "var(--danger, #f04467)";
            else if (isWarn) barColor = "var(--warning, #f4a33b)";

            const displayPercentage = Math.min(100, Math.max(0, pos.percentageSpent));

            return (
              <div
                key={pos.posId}
                className="p-4 rounded-2xl flex flex-col gap-2.5 transition-all"
                style={{
                  background: "var(--surface)",
                  border: isOver ? "1px solid rgba(240,68,103,0.3)" : "1px solid var(--border)",
                  boxShadow: "var(--shadow, 0 4px 12px rgba(16,45,85,0.04))",
                }}
              >
                {/* Header: Icon, Nama, Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-2xl shrink-0">{pos.posIcon}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold truncate" style={{ color: "var(--navy)" }}>
                          {pos.posName}
                        </span>
                        {pos.isDeletedPos && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                            Pos Dihapus
                          </span>
                        )}
                      </div>
                      <div className="text-[10px]" style={{ color: "var(--muted)" }}>
                        Target: {formatRp(pos.targetBudget)} • {pos.txCount} Transaksi
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div
                      className="text-xs font-bold"
                      style={{
                        fontFamily: "var(--font-fraunces), serif",
                        color: isOver ? "var(--danger, #f04467)" : "var(--navy)",
                      }}
                    >
                      {formatRp(pos.actualSpent)}
                    </div>
                    <span
                      className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-extrabold ${
                        isOver
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : isWarn
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-teal-50 text-teal-700 border border-teal-200"
                      }`}
                    >
                      {pos.percentageSpent.toFixed(0)}%
                    </span>
                  </div>
                </div>

                {/* Progress Bar Visual */}
                <div
                  className="w-full h-2 rounded-full overflow-hidden"
                  style={{ background: "var(--track, #e5edf5)" }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${displayPercentage}%`,
                      background: barColor,
                    }}
                  />
                </div>

                {/* Footer: Sisa Budget & Annotasi Saku */}
                <div className="flex items-center justify-between text-[11px] pt-1">
                  <span style={{ color: "var(--muted)" }}>
                    {isOver ? (
                      <span className="font-bold text-rose-600">
                        Overbudget {formatRp(Math.abs(pos.remainingBudget))}!
                      </span>
                    ) : (
                      <span>
                        Sisa Budget: <strong style={{ color: "var(--text)" }}>{formatRp(pos.remainingBudget)}</strong>
                      </span>
                    )}
                  </span>

                  {pos.sakuBorrowTotal > 0 && (
                    <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                      Bantuan Saku {formatRp(pos.sakuBorrowTotal)}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

