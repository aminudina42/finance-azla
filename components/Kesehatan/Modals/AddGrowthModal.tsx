"use client";

import React, { useState } from "react";
import type { HealthFamilyMember } from "@/lib/types";
import { sanitizeDecimalInput } from "@/lib/health-utils";
import { X, Scale, AlertCircle } from "lucide-react";

interface AddGrowthModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: HealthFamilyMember;
  onSubmit: (data: {
    measured_at: string;
    weight_kg: number;
    height_cm: number;
    head_circ_cm?: number | null;
    measurement_position: "recumbent" | "standing";
    notes?: string;
  }) => Promise<void>;
}

export default function AddGrowthModal({
  isOpen,
  onClose,
  member,
  onSubmit,
}: AddGrowthModalProps) {
  const [measuredAt, setMeasuredAt] = useState(new Date().toISOString().split("T")[0]);
  const [weightStr, setWeightStr] = useState("");
  const [heightStr, setHeightStr] = useState("");
  const [headCircStr, setHeadCircStr] = useState("");
  const [position, setPosition] = useState<"recumbent" | "standing">("standing");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const weight = sanitizeDecimalInput(weightStr);
    const height = sanitizeDecimalInput(heightStr);
    const headCirc = headCircStr ? sanitizeDecimalInput(headCircStr) : null;

    // NS-01 & NS-03 Validations
    if (!weight || weight <= 0) {
      setErrorMsg("Berat badan harus lebih dari 0 kg");
      return;
    }
    if (!height || height <= 0) {
      setErrorMsg("Tinggi badan harus lebih dari 0 cm");
      return;
    }

    if (member.relation_role === "anak" && weight > 60) {
      const confirmLarge = window.confirm(
        `Perhatian: Anda memasukkan berat badan ${weight} kg untuk anak. Apakah angka ini benar atau maksud Anda ${(weight / 10).toFixed(1)} kg?`
      );
      if (!confirmLarge) return;
    }

    if (height < 30 || height > 250) {
      setErrorMsg("Tinggi badan di luar rentang wajar (30 - 250 cm)");
      return;
    }

    try {
      setLoading(true);
      await onSubmit({
        measured_at: measuredAt,
        weight_kg: weight,
        height_cm: height,
        head_circ_cm: headCirc,
        measurement_position: position,
        notes: notes.trim() || undefined,
      });

      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || "Gagal menyimpan data penimbangan");
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
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Scale size={18} />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Catat Tumbuh Kembang
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

        {errorMsg && (
          <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tanggal Penimbangan
            </label>
            <input
              type="date"
              required
              value={measuredAt}
              onChange={(e) => setMeasuredAt(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Berat Badan (kg) *
              </label>
              <input
                type="text"
                inputMode="decimal"
                required
                placeholder="misal 12.5"
                value={weightStr}
                onChange={(e) => setWeightStr(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-bold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tinggi / Panjang (cm) *
              </label>
              <input
                type="text"
                inputMode="decimal"
                required
                placeholder="misal 88.5"
                value={heightStr}
                onChange={(e) => setHeightStr(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-bold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Posisi Pengukuran
              </label>
              <select
                value={position}
                onChange={(e) => setPosition(e.target.value as "recumbent" | "standing")}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="standing">Berdiri (TB)</option>
                <option value="recumbent">Telentang (PB - Balita)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Lingkar Kepala (cm)
              </label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="Opsional"
                value={headCircStr}
                onChange={(e) => setHeadCircStr(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-bold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Catatan Pengukuran (Opsional)
            </label>
            <input
              type="text"
              placeholder="Contoh: Ditimbang di Posyandu Melati"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-slate-400"
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
              {loading ? "Menyimpan..." : "Simpan Pengukuran"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

