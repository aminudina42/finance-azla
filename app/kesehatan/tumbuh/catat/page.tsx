"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { useApp } from "@/lib/store";
import {
  getHealthFamilyMembers,
  createGrowthLog,
} from "@/lib/health-service";
import type { HealthFamilyMember } from "@/lib/types";
import { sanitizeDecimalInput } from "@/lib/health-utils";
import { Scale, Check, AlertTriangle, Calendar, Ruler, Info } from "lucide-react";

function CatatTumbuhContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetMemberId = searchParams.get("memberId");

  const { currentKeluarga, refreshData } = useApp();

  const [members, setMembers] = useState<HealthFamilyMember[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>(targetMemberId || "");
  const [loadingMembers, setLoadingMembers] = useState(true);

  const [measuredAt, setMeasuredAt] = useState(() => new Date().toISOString().split("T")[0]);
  const [weightStr, setWeightStr] = useState("");
  const [heightStr, setHeightStr] = useState("");
  const [headCircStr, setHeadCircStr] = useState("");
  const [position, setPosition] = useState<"recumbent" | "standing">("standing");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadMembers() {
      setLoadingMembers(true);
      if (currentKeluarga?.id) {
        const data = await getHealthFamilyMembers(currentKeluarga.id);
        setMembers(data);
        if (!selectedMemberId && data.length > 0) {
          // Default to first 'anak' or first member
          const child = data.find((m) => m.relation_role === "anak");
          setSelectedMemberId(child ? child.id : data[0].id);
        }
      }
      setLoadingMembers(false);
    }
    loadMembers();
  }, [currentKeluarga?.id]);

  const selectedMember = members.find((m) => m.id === selectedMemberId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentKeluarga?.id || !selectedMemberId) {
      setErrorMsg("Pilih anak / anggota keluarga terlebih dahulu");
      return;
    }

    setErrorMsg(null);

    const weight = sanitizeDecimalInput(weightStr);
    const height = sanitizeDecimalInput(heightStr);
    const headCirc = headCircStr ? sanitizeDecimalInput(headCircStr) : null;

    if (!weight || weight <= 0) {
      setErrorMsg("Berat badan harus lebih dari 0 kg");
      return;
    }
    if (!height || height <= 0) {
      setErrorMsg("Tinggi badan harus lebih dari 0 cm");
      return;
    }

    if (selectedMember?.relation_role === "anak" && weight > 60) {
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
      const res = await createGrowthLog(currentKeluarga.id, {
        family_member_id: selectedMemberId,
        measured_at: measuredAt,
        weight_kg: weight,
        height_cm: height,
        head_circ_cm: headCirc,
        measurement_position: position,
        notes: notes.trim() || undefined,
      });

      if (!res.success) {
        throw new Error(res.error?.message || "Gagal menyimpan data penimbangan");
      }

      await refreshData();
      router.push(`/kesehatan?tab=growth&memberId=${selectedMemberId}`);
    } catch (err: any) {
      setErrorMsg(err?.message || "Gagal menyimpan data penimbangan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh pb-32" style={{ background: "var(--bg, #f8fafc)", color: "var(--text, #17375f)" }}>
      <PageHeader
        title="Catat Tumbuh Kembang"
        subtitle={selectedMember ? `Anak: ${selectedMember.name}` : "Kurva Pertumbuhan WHO"}
        backHref={`/kesehatan${selectedMemberId ? `?memberId=${selectedMemberId}` : ""}`}
      />

      <main className="max-w-xl mx-auto px-4 pt-5">
        {errorMsg && (
          <div className="mb-5 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2.5 shadow-sm">
            <AlertTriangle size={18} className="shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 1. Pilih Pasien / Anak */}
          <div className="p-4 rounded-2xl border bg-white shadow-sm" style={{ borderColor: "var(--border, #e2e8f0)" }}>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Anak / Anggota yang Ditimbang *
            </label>
            {loadingMembers ? (
              <div className="h-10 rounded-xl bg-slate-100 animate-pulse" />
            ) : (
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.relation_role === "anak" ? "Anak" : m.relation_role})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 2. Pengukuran Antropometri */}
          <div className="p-4 rounded-2xl border bg-white shadow-sm space-y-4" style={{ borderColor: "var(--border, #e2e8f0)" }}>
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Scale size={18} className="text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">Hasil Pengukuran Fisik</h2>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Tanggal Penimbangan *
              </label>
              <input
                type="date"
                required
                value={measuredAt}
                onChange={(e) => setMeasuredAt(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Berat Badan (kg) *
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  placeholder="Contoh: 12.4"
                  value={weightStr}
                  onChange={(e) => setWeightStr(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Panjang / Tinggi (cm) *
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  placeholder="Contoh: 88.5"
                  value={heightStr}
                  onChange={(e) => setHeightStr(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Lingkar Kepala (cm - opsional)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Contoh: 46.2"
                  value={headCircStr}
                  onChange={(e) => setHeadCircStr(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Posisi Pengukuran Tinggi
                </label>
                <select
                  value={position}
                  onChange={(e) => setPosition(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="standing">Berdiri (Anak &gt; 2 tahun)</option>
                  <option value="recumbent">Terlentang (Bayi &lt; 2 tahun)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Catatan (Posyandu / Dokter Anak)
              </label>
              <textarea
                rows={2}
                placeholder="Contoh: Ditimbang di Posyandu Melati, nafsu makan bagus"
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
                disabled={loading}
                className="w-2/3 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md shadow-blue-200 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? (
                  <span>Menyimpan...</span>
                ) : (
                  <>
                    <Check size={18} />
                    <span>Simpan Pengukuran</span>
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

export default function CatatTumbuhPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Memuat formulir...</div>}>
      <CatatTumbuhContent />
    </Suspense>
  );
}
