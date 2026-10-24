"use client";

import React from "react";
import type { HealthFamilyMember, HealthGrowthLog } from "@/lib/types";
import { calculateDetailedAge, getBMICalculation } from "@/lib/health-utils";
import { Plus, Trash2, Scale, Ruler, Activity, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface GrowthTabProps {
  member: HealthFamilyMember;
  logs: HealthGrowthLog[];
  onOpenAddModal: () => void;
  onDeleteLog: (id: string) => void;
}

export default function GrowthTab({
  member,
  logs,
  onOpenAddModal,
  onDeleteLog,
}: GrowthTabProps) {
  const latestLog = logs[0] || null;
  const previousLog = logs[1] || null;

  // Weight delta
  let weightDelta: { val: number; text: string; dir: "up" | "down" | "flat" } | null = null;
  if (latestLog && previousLog) {
    const diff = latestLog.weight_kg - previousLog.weight_kg;
    if (Math.abs(diff) < 0.05) {
      weightDelta = { val: 0, text: "Sama dengan bulan lalu", dir: "flat" };
    } else if (diff > 0) {
      weightDelta = {
        val: diff,
        text: `+${(diff * 1000).toFixed(0)} gr dari ukur sebelumnya`,
        dir: "up",
      };
    } else {
      weightDelta = {
        val: diff,
        text: `-${(Math.abs(diff) * 1000).toFixed(0)} gr dari ukur sebelumnya`,
        dir: "down",
      };
    }
  }

  // Height delta
  let heightDelta: string | null = null;
  if (latestLog && previousLog) {
    const diffH = latestLog.height_cm - previousLog.height_cm;
    if (diffH > 0) {
      heightDelta = `+${diffH.toFixed(1)} cm`;
    }
  }

  // BMI (for older children / adults)
  const bmiInfo = latestLog
    ? getBMICalculation(latestLog.weight_kg, latestLog.height_cm)
    : null;

  return (
    <div className="space-y-4">
      {/* Action Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-base text-slate-900">
            Tumbuh Kembang & Antropometri
          </h3>
          <p className="text-xs text-slate-500">
            Pantau berat, tinggi, dan lingkar kepala secara berkala
          </p>
        </div>
        <button
          onClick={onOpenAddModal}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold transition-colors cursor-pointer"
        >
          <Plus size={15} />
          <span>+ Catat Timbang</span>
        </button>
      </div>

      {/* Summary Cards */}
      {latestLog ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {/* Berat Badan */}
          <div className="rounded-2xl p-3.5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-1" style={{ color: "var(--muted)" }}>
              <span className="text-xs font-medium">Berat Badan</span>
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Scale size={15} />
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-extrabold" style={{ color: "var(--navy)" }}>
                {latestLog.weight_kg}
              </span>
              <span className="text-xs font-semibold" style={{ color: "var(--muted)" }}>kg</span>
            </div>
            {weightDelta && (
              <div
                className={`flex items-center gap-1 text-[11px] font-medium mt-1 ${
                  weightDelta.dir === "up"
                    ? "text-emerald-600"
                    : weightDelta.dir === "down"
                    ? "text-amber-600"
                    : "text-slate-500"
                }`}
              >
                {weightDelta.dir === "up" && <TrendingUp size={12} />}
                {weightDelta.dir === "down" && <TrendingDown size={12} />}
                {weightDelta.dir === "flat" && <Minus size={12} />}
                <span>{weightDelta.text}</span>
              </div>
            )}
          </div>

          {/* Tinggi Badan */}
          <div className="rounded-2xl p-3.5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-1" style={{ color: "var(--muted)" }}>
              <span className="text-xs font-medium">
                {latestLog.measurement_position === "recumbent" ? "Panjang Badan (PB)" : "Tinggi Badan (TB)"}
              </span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Ruler size={15} />
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-extrabold" style={{ color: "var(--navy)" }}>
                {latestLog.height_cm}
              </span>
              <span className="text-xs font-semibold" style={{ color: "var(--muted)" }}>cm</span>
            </div>
            {heightDelta && (
              <div className="text-[11px] font-medium text-emerald-600 mt-1 flex items-center gap-1">
                <TrendingUp size={12} />
                <span>{heightDelta} dari sebelumnya</span>
              </div>
            )}
          </div>

          {/* Lingkar Kepala / BMI */}
          <div className="rounded-2xl p-3.5 col-span-2 sm:col-span-1" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-1" style={{ color: "var(--muted)" }}>
              <span className="text-xs font-medium">
                {latestLog.head_circ_cm ? "Lingkar Kepala" : "Indeks Massa Tubuh"}
              </span>
              <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                <Activity size={15} />
              </div>
            </div>
            {latestLog.head_circ_cm ? (
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-extrabold" style={{ color: "var(--navy)" }}>
                  {latestLog.head_circ_cm}
                </span>
                <span className="text-xs font-semibold" style={{ color: "var(--muted)" }}>cm</span>
              </div>
            ) : bmiInfo ? (
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-extrabold" style={{ color: "var(--navy)" }}>
                    {bmiInfo.bmi}
                  </span>
                  <span className="text-xs font-semibold" style={{ color: "var(--muted)" }}>BMI</span>
                </div>
                <span className="text-[11px] font-semibold text-rose-600">
                  {bmiInfo.badge.label}
                </span>
              </div>
            ) : (
              <span className="text-sm" style={{ color: "var(--muted)" }}>-</span>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl p-6 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <Scale size={32} className="mx-auto mb-2" style={{ color: "var(--muted)" }} />
          <p className="text-sm font-semibold" style={{ color: "var(--navy)" }}>
            Belum ada catatan pertumbuhan
          </p>
          <p className="text-xs mt-0.5 mb-3" style={{ color: "var(--muted)" }}>
            Mulai catat berat dan tinggi badan untuk melihat tren pertumbuhan
          </p>
          <button
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs font-semibold cursor-pointer"
          >
            <Plus size={14} />
            <span>Catat Pengukuran Pertama</span>
          </button>
        </div>
      )}

      {/* History Table */}
      {logs.length > 0 && (
        <div className="rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <h4 className="font-bold text-sm mb-3" style={{ color: "var(--navy)" }}>
            Riwayat Penimbangan ({logs.length})
          </h4>
          <div className="space-y-2.5">
            {logs.map((log) => {
              const ageAtMeasure = calculateDetailedAge(
                member.birth_date,
                log.measured_at,
                member.is_premature,
                member.gestational_weeks
              );

              return (
                <div
                  key={log.id}
                  className="p-3 rounded-xl flex items-center justify-between gap-3"
                  style={{ background: "var(--s1, #f1f8fd)" }}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">
                        {new Date(log.measured_at).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 font-medium">
                        Usia: {ageAtMeasure.formatted}
                      </span>
                      {ageAtMeasure.correctedFormatted && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                          Koreksi: {ageAtMeasure.correctedFormatted}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-600 mt-1 flex-wrap">
                      <span>
                        BB: <strong className="text-slate-800">{log.weight_kg} kg</strong>
                      </span>
                      <span>•</span>
                      <span>
                        TB: <strong className="text-slate-800">{log.height_cm} cm</strong>
                        {log.measurement_position === "recumbent" && " (PB)"}
                      </span>
                      {log.head_circ_cm && (
                        <>
                          <span>•</span>
                          <span>
                            LK: <strong className="text-slate-800">{log.head_circ_cm} cm</strong>
                          </span>
                        </>
                      )}
                    </div>

                    {log.notes && (
                      <p className="text-[11px] text-slate-500 italic mt-0.5">{log.notes}</p>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      if (window.confirm("Hapus catatan penimbangan ini?")) {
                        onDeleteLog(log.id);
                      }
                    }}
                    className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                    title="Hapus log"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

