"use client";

import React, { useState } from "react";
import type { HealthFamilyMember, HealthVitalType, HealthVitalData } from "@/lib/types";
import { sanitizeDecimalInput } from "@/lib/health-utils";
import { X, Heart, Droplets, Activity, Zap, AlertTriangle } from "lucide-react";

interface AddVitalModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: HealthFamilyMember;
  onSubmit: (data: {
    measured_at: string;
    vital_type: HealthVitalType;
    data: HealthVitalData;
    notes?: string;
  }) => Promise<void>;
}

export default function AddVitalModal({
  isOpen,
  onClose,
  member,
  onSubmit,
}: AddVitalModalProps) {
  const [activeTab, setActiveTab] = useState<HealthVitalType>("blood_pressure");
  const [measuredAt, setMeasuredAt] = useState(new Date().toISOString());

  // Blood Pressure
  const [systolicStr, setSystolicStr] = useState("");
  const [diastolicStr, setDiastolicStr] = useState("");
  const [pulseStr, setPulseStr] = useState("");

  // Blood Sugar
  const [sugarValStr, setSugarValStr] = useState("");
  const [sugarCategory, setSugarCategory] = useState<"fasting" | "postprandial" | "random" | "hba1c">("fasting");

  // Cholesterol
  const [cholTotalStr, setCholTotalStr] = useState("");
  const [ldlStr, setLdlStr] = useState("");
  const [hdlStr, setHdlStr] = useState("");
  const [triglyceridesStr, setTriglyceridesStr] = useState("");

  // Uric Acid
  const [uricValStr, setUricValStr] = useState("");

  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    let vitalData: HealthVitalData;

    if (activeTab === "blood_pressure") {
      const systolic = sanitizeDecimalInput(systolicStr);
      const diastolic = sanitizeDecimalInput(diastolicStr);
      const pulse = pulseStr ? sanitizeDecimalInput(pulseStr) : undefined;

      // NS-01: Inverted / Invalid BP
      if (!systolic || !diastolic) {
        setErrorMsg("Sistolik dan diastolik wajib diisi");
        return;
      }
      if (systolic < diastolic + 10) {
        setErrorMsg("Tekanan sistolik (angka atas) harus lebih tinggi minimal 10 mmHg dari diastolik (angka bawah)");
        return;
      }
      if (systolic < 50 || systolic > 280 || diastolic < 30 || diastolic > 180) {
        setErrorMsg("Angka tekanan darah di luar rentang fisiologis wajar");
        return;
      }

      vitalData = { systolic, diastolic, pulse };
    } else if (activeTab === "blood_sugar") {
      const value = sanitizeDecimalInput(sugarValStr);
      if (!value || value <= 0) {
        setErrorMsg("Nilai gula darah harus lebih dari 0");
        return;
      }
      vitalData = { value, category: sugarCategory };
    } else if (activeTab === "cholesterol") {
      const total = sanitizeDecimalInput(cholTotalStr);
      if (!total || total <= 0) {
        setErrorMsg("Nilai kolesterol total harus lebih dari 0");
        return;
      }
      vitalData = {
        total,
        ldl: ldlStr ? sanitizeDecimalInput(ldlStr) : undefined,
        hdl: hdlStr ? sanitizeDecimalInput(hdlStr) : undefined,
        triglycerides: triglyceridesStr ? sanitizeDecimalInput(triglyceridesStr) : undefined,
      };
    } else if (activeTab === "uric_acid") {
      const value = sanitizeDecimalInput(uricValStr);
      if (!value || value <= 0) {
        setErrorMsg("Nilai asam urat harus lebih dari 0");
        return;
      }
      vitalData = { value };
    } else {
      setErrorMsg("Tipe biomarker tidak valid");
      return;
    }

    try {
      setLoading(true);
      await onSubmit({
        measured_at: measuredAt,
        vital_type: activeTab,
        data: vitalData,
        notes: notes.trim() || undefined,
      });

      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || "Gagal menyimpan hasil pemeriksaan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(16, 45, 85, 0.45)", backdropFilter: "blur(6px)" }}
    >
      <div
        data-ui="modal"
        className="rounded-3xl max-w-md w-full p-5 max-h-[90vh] overflow-y-auto"
        style={{ background: "#ffffff", border: "1px solid #d8eaf8", color: "#17375f" }}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <Heart size={18} />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Catat Tanda Vital & Biomarker
              </h3>
              <p className="text-xs text-slate-500">Pasien: {member.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl mt-4">
          <button
            type="button"
            onClick={() => setActiveTab("blood_pressure")}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              activeTab === "blood_pressure"
                ? "bg-white text-rose-600 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Tensi
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("blood_sugar")}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              activeTab === "blood_sugar"
                ? "bg-white text-amber-600 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Gula Darah
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("cholesterol")}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              activeTab === "cholesterol"
                ? "bg-white text-teal-600 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Kolesterol
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("uric_acid")}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              activeTab === "uric_acid"
                ? "bg-white text-blue-600 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Asam Urat
          </button>
        </div>

        {errorMsg && (
          <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle size={14} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          {/* TAB: TENSI */}
          {activeTab === "blood_pressure" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Sistolik (Atas) *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="misal 120"
                    value={systolicStr}
                    onChange={(e) => setSystolicStr(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-bold focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Diastolik (Bawah) *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="misal 80"
                    value={diastolicStr}
                    onChange={(e) => setDiastolicStr(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-bold focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Denyut Nadi / Pulse (bpm)
                </label>
                <input
                  type="number"
                  placeholder="misal 72 (opsional)"
                  value={pulseStr}
                  onChange={(e) => setPulseStr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-medium focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 placeholder:text-slate-400"
                />
              </div>
            </div>
          )}

          {/* TAB: GULA DARAH */}
          {activeTab === "blood_sugar" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nilai Gula Darah *
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    placeholder="misal 115"
                    value={sugarValStr}
                    onChange={(e) => setSugarValStr(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-bold focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kategori Tes
                  </label>
                  <select
                    value={sugarCategory}
                    onChange={(e) => setSugarCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs font-medium focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                  >
                    <option value="fasting">Puasa (GDP)</option>
                    <option value="random">Sewaktu (GDS)</option>
                    <option value="postprandial">2 Jam PP</option>
                    <option value="hba1c">HbA1c (%)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB: KOLESTEROL */}
          {activeTab === "cholesterol" && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kolesterol Total (mg/dL) *
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  placeholder="misal 195"
                  value={cholTotalStr}
                  onChange={(e) => setCholTotalStr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-bold focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 placeholder:text-slate-400"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                    LDL
                  </label>
                  <input
                    type="number"
                    placeholder="100"
                    value={ldlStr}
                    onChange={(e) => setLdlStr(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 text-xs font-bold placeholder:text-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                    HDL
                  </label>
                  <input
                    type="number"
                    placeholder="50"
                    value={hdlStr}
                    onChange={(e) => setHdlStr(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 text-xs font-bold placeholder:text-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                    Trigliserida
                  </label>
                  <input
                    type="number"
                    placeholder="150"
                    value={triglyceridesStr}
                    onChange={(e) => setTriglyceridesStr(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 text-xs font-bold placeholder:text-slate-400"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB: ASAM URAT */}
          {activeTab === "uric_acid" && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kadar Asam Urat (mg/dL) *
              </label>
              <input
                type="text"
                inputMode="decimal"
                required
                placeholder="misal 5.8"
                value={uricValStr}
                onChange={(e) => setUricValStr(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-bold focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 placeholder:text-slate-400"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Batas normal {member.gender === "female" ? "wanita ≤ 6.0 mg/dL" : "pria ≤ 7.0 mg/dL"}
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Catatan / Kondisi saat Cek
            </label>
            <input
              type="text"
              placeholder="Contoh: Cek bangun pagi sebelum sarapan"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-medium focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 placeholder:text-slate-400"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold cursor-pointer disabled:opacity-50 transition-colors"
            >
              {loading ? "Menyimpan..." : "Simpan Hasil"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

