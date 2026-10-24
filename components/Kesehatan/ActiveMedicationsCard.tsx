"use client";

import React, { useState } from "react";
import type { HealthMedication } from "@/lib/types";
import { Pill, CheckCircle2, AlertTriangle, Clock } from "lucide-react";

interface ActiveMedicationsCardProps {
  medications: HealthMedication[];
  onToggleActive: (id: string, isActive: boolean, stoppedReason?: "finished" | "cured" | "side_effects" | "doctor_order") => Promise<void>;
}

export default function ActiveMedicationsCard({
  medications,
  onToggleActive,
}: ActiveMedicationsCardProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  if (!medications || medications.length === 0) {
    return null;
  }

  const handleStopMed = async (med: HealthMedication) => {
    if (med.is_antibiotic) {
      const confirmAntibiotic = window.confirm(
        `Perhatian Klinis: "${med.medicine_name}" adalah antibiotik. Menghentikan antibiotik sebelum habis berisiko menyebabkan resistensi bakteri. Apakah dokter telah menginstruksikan untuk berhenti?`
      );
      if (!confirmAntibiotic) return;
    }

    try {
      setLoadingId(med.id);
      await onToggleActive(med.id, false, "finished");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="rounded-2xl p-4" style={{ background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.25)" }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <Pill size={18} />
          </div>
          <div>
            <h3 className="font-bold text-sm text-amber-950 flex items-center gap-1.5">
              Obat yang Sedang Diminum
              <span className="text-xs bg-amber-200 text-amber-850 font-bold px-1.5 py-0.2 rounded-full">
                {medications.length}
              </span>
            </h3>
            <p className="text-[11px] text-amber-800">
              Jadwal konsumsi aktif
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2.5">
        {medications.map((med) => (
          <div
            key={med.id}
            className="rounded-xl p-3 flex items-start justify-between gap-3 bg-white"
            style={{ border: "1px solid var(--border)" }}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm text-slate-900">
                  {med.medicine_name}
                </span>
                {med.is_antibiotic && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                    <AlertTriangle size={10} />
                    Antibiotik (Wajib Habis)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-600 mt-1">
                <span className="font-medium text-slate-800">
                  Dosis: {med.dosage}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock size={12} className="text-amber-500" />
                  {med.frequency}
                </span>
                {med.timing_rule && (
                  <>
                    <span>•</span>
                    <span className="italic">{med.timing_rule}</span>
                  </>
                )}
              </div>

              {med.notes && (
                <p className="text-[11px] text-slate-500 mt-1">
                  Catatan: {med.notes}
                </p>
              )}
            </div>

            <button
              onClick={() => handleStopMed(med)}
              disabled={loadingId === med.id}
              className="shrink-0 flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer"
            >
              <CheckCircle2 size={13} />
              <span>{loadingId === med.id ? "Memproses..." : "Selesai"}</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

