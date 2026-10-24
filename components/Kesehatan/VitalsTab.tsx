"use client";

import React from "react";
import type { HealthFamilyMember, HealthVitalLog, BloodPressureData, BloodSugarData, CholesterolData, UricAcidData } from "@/lib/types";
import {
  getBloodPressureStatus,
  getBloodSugarStatus,
  getCholesterolStatus,
  getUricAcidStatus,
} from "@/lib/health-utils";
import { Plus, Trash2, Heart, Droplets, Activity, Zap, AlertCircle } from "lucide-react";

interface VitalsTabProps {
  member: HealthFamilyMember;
  logs: HealthVitalLog[];
  onOpenAddModal: () => void;
  onDeleteLog: (id: string) => void;
}

export default function VitalsTab({
  member,
  logs,
  onOpenAddModal,
  onDeleteLog,
}: VitalsTabProps) {
  // Find latest for each type
  const latestBP = logs.find((l) => l.vital_type === "blood_pressure");
  const latestSugar = logs.find((l) => l.vital_type === "blood_sugar");
  const latestChol = logs.find((l) => l.vital_type === "cholesterol");
  const latestUric = logs.find((l) => l.vital_type === "uric_acid");

  const bpData = latestBP ? (latestBP.data as BloodPressureData) : null;
  const sugarData = latestSugar ? (latestSugar.data as BloodSugarData) : null;
  const cholData = latestChol ? (latestChol.data as CholesterolData) : null;
  const uricData = latestUric ? (latestUric.data as UricAcidData) : null;

  const bpStatus = bpData ? getBloodPressureStatus(bpData.systolic, bpData.diastolic) : null;
  const sugarStatus = sugarData ? getBloodSugarStatus(sugarData.value, sugarData.category) : null;
  const cholStatus = cholData ? getCholesterolStatus(cholData.total) : null;
  const uricStatus = uricData ? getUricAcidStatus(uricData.value, member.gender) : null;

  const getBadgeClass = (color: string) => {
    switch (color) {
      case "green":
        return "bg-emerald-50 text-emerald-700 border border-emerald-200";
      case "yellow":
        return "bg-amber-50 text-amber-800 border border-amber-200";
      case "red":
        return "bg-red-50 text-red-700 border border-red-200";
      default:
        return "bg-blue-50 text-blue-700 border border-blue-200";
    }
  };

  return (
    <div className="space-y-4">
      {/* Action Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-base text-slate-900">
            Tanda Vital & Biomarker
          </h3>
          <p className="text-xs text-slate-500">
            Monitoring tensi darah, gula darah, kolesterol, dan asam urat
          </p>
        </div>
        <button
          onClick={onOpenAddModal}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold transition-colors cursor-pointer"
        >
          <Plus size={15} />
          <span>+ Catat Hasil Cek</span>
        </button>
      </div>

      {/* Grid of 4 Biomarker Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Tensi Darah */}
        <div className="rounded-2xl p-3.5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-1" style={{ color: "var(--muted)" }}>
            <span className="text-xs font-medium">Tensi Darah</span>
            <div className="w-7 h-7 rounded-lg bg-red-50 text-red-500 flex items-center justify-center">
              <Heart size={15} />
            </div>
          </div>
          {bpData ? (
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-extrabold" style={{ color: "var(--navy)" }}>
                  {bpData.systolic}/{bpData.diastolic}
                </span>
                <span className="text-xs" style={{ color: "var(--muted)" }}>mmHg</span>
              </div>
              {bpData.pulse && (
                <p className="text-[11px] mt-0.5" style={{ color: "var(--muted)" }}>Nadi: {bpData.pulse} bpm</p>
              )}
              {bpStatus && (
                <div className="mt-2">
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${getBadgeClass(
                      bpStatus.color
                    )}`}
                  >
                    {bpStatus.isCrisis && <AlertCircle size={10} />}
                    {bpStatus.label}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>Belum ada data</p>
          )}
        </div>

        {/* Gula Darah */}
        <div className="rounded-2xl p-3.5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-1" style={{ color: "var(--muted)" }}>
            <span className="text-xs font-medium">Gula Darah</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center">
              <Droplets size={15} />
            </div>
          </div>
          {sugarData ? (
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-extrabold" style={{ color: "var(--navy)" }}>
                  {sugarData.value}
                </span>
                <span className="text-xs" style={{ color: "var(--muted)" }}>
                  {sugarData.category === "hba1c" ? "%" : "mg/dL"}
                </span>
              </div>
              <p className="text-[11px] mt-0.5 capitalize" style={{ color: "var(--muted)" }}>
                Tipe: {sugarData.category}
              </p>
              {sugarStatus && (
                <div className="mt-2">
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${getBadgeClass(
                      sugarStatus.color
                    )}`}
                  >
                    {sugarStatus.label}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>Belum ada data</p>
          )}
        </div>

        {/* Kolesterol Total */}
        <div className="rounded-2xl p-3.5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-1" style={{ color: "var(--muted)" }}>
            <span className="text-xs font-medium">Kolesterol Total</span>
            <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <Activity size={15} />
            </div>
          </div>
          {cholData ? (
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-extrabold" style={{ color: "var(--navy)" }}>
                  {cholData.total}
                </span>
                <span className="text-xs" style={{ color: "var(--muted)" }}>mg/dL</span>
              </div>
              {cholStatus && (
                <div className="mt-2">
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${getBadgeClass(
                      cholStatus.color
                    )}`}
                  >
                    {cholStatus.label}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>Belum ada data</p>
          )}
        </div>

        {/* Asam Urat */}
        <div className="rounded-2xl p-3.5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-1" style={{ color: "var(--muted)" }}>
            <span className="text-xs font-medium">Asam Urat</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center">
              <Zap size={15} />
            </div>
          </div>
          {uricData ? (
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-extrabold" style={{ color: "var(--navy)" }}>
                  {uricData.value}
                </span>
                <span className="text-xs" style={{ color: "var(--muted)" }}>mg/dL</span>
              </div>
              {uricStatus && (
                <div className="mt-2">
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${getBadgeClass(
                      uricStatus.color
                    )}`}
                  >
                    {uricStatus.label}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>Belum ada data</p>
          )}
        </div>
      </div>

      {/* History Log List */}
      {logs.length > 0 && (
        <div className="rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <h4 className="font-bold text-sm mb-3" style={{ color: "var(--navy)" }}>
            Riwayat Pengecekan ({logs.length})
          </h4>
          <div className="space-y-2.5">
            {logs.map((log) => {
              let displayVal = "";
              let title = "";
              if (log.vital_type === "blood_pressure") {
                const d = log.data as BloodPressureData;
                title = "Tensi Darah";
                displayVal = `${d.systolic}/${d.diastolic} mmHg ${d.pulse ? `(${d.pulse} bpm)` : ""}`;
              } else if (log.vital_type === "blood_sugar") {
                const d = log.data as BloodSugarData;
                title = `Gula Darah (${d.category})`;
                displayVal = `${d.value} ${d.category === "hba1c" ? "%" : "mg/dL"}`;
              } else if (log.vital_type === "cholesterol") {
                const d = log.data as CholesterolData;
                title = "Kolesterol Total";
                displayVal = `${d.total} mg/dL`;
              } else if (log.vital_type === "uric_acid") {
                const d = log.data as UricAcidData;
                title = "Asam Urat";
                displayVal = `${d.value} mg/dL`;
              }

              return (
                <div
                  key={log.id}
                  className="p-3 rounded-xl flex items-center justify-between gap-3"
                  style={{ background: "var(--s1, #f1f8fd)" }}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-slate-900">
                        {title}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(log.measured_at).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-800 mt-0.5">
                      {displayVal}
                    </div>
                    {log.notes && (
                      <p className="text-[11px] text-slate-500 italic mt-0.5">{log.notes}</p>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      if (window.confirm("Hapus catatan pemeriksaan ini?")) {
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

