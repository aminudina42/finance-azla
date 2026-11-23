"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { useApp } from "@/lib/store";
import {
  getHealthFamilyMembers,
  createVitalLog,
} from "@/lib/health-service";
import type {
  HealthFamilyMember,
  HealthVitalType,
  HealthVitalData,
} from "@/lib/types";
import { sanitizeDecimalInput } from "@/lib/health-utils";
import {
  Heart,
  Droplets,
  Activity,
  Zap,
  AlertTriangle,
  Check,
  Calendar,
  Clock,
  FileText,
} from "lucide-react";

function CatatVitalsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetMemberId = searchParams.get("memberId");
  const initialType = (searchParams.get("type") as HealthVitalType) || "blood_pressure";

  const { currentKeluarga, refreshData } = useApp();

  const [members, setMembers] = useState<HealthFamilyMember[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>(targetMemberId || "");
  const [loadingMembers, setLoadingMembers] = useState(true);

  const [activeTab, setActiveTab] = useState<HealthVitalType>(initialType);
  const [measuredDate, setMeasuredDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [measuredTime, setMeasuredTime] = useState(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  });

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

  useEffect(() => {
    async function loadMembers() {
      setLoadingMembers(true);
      if (currentKeluarga?.id) {
        const data = await getHealthFamilyMembers(currentKeluarga.id);
        setMembers(data);
        if (!selectedMemberId && data.length > 0) {
          setSelectedMemberId(data[0].id);
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
      setErrorMsg("Pilih anggota keluarga terlebih dahulu");
      return;
    }

    setErrorMsg(null);

    let vitalData: HealthVitalData;

    if (activeTab === "blood_pressure") {
      const systolic = sanitizeDecimalInput(systolicStr);
      const diastolic = sanitizeDecimalInput(diastolicStr);
      const pulse = pulseStr ? sanitizeDecimalInput(pulseStr) : undefined;

      if (!systolic || !diastolic) {
        setErrorMsg("Angka Sistolik dan Diastolik wajib diisi");
        return;
      }
      if (systolic < diastolic + 10) {
        setErrorMsg("Tekanan sistolik (atas) harus lebih tinggi minimal 10 mmHg dari diastolik (bawah)");
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
        setErrorMsg("Nilai gula darah harus lebih dari 0 mg/dL");
        return;
      }
      vitalData = { value, category: sugarCategory };
    } else if (activeTab === "cholesterol") {
      const total = sanitizeDecimalInput(cholTotalStr);
      if (!total || total <= 0) {
        setErrorMsg("Nilai kolesterol total harus lebih dari 0 mg/dL");
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
        setErrorMsg("Nilai asam urat harus lebih dari 0 mg/dL");
        return;
      }
      vitalData = { value };
    } else {
      setErrorMsg("Tipe pemeriksaan tidak valid");
      return;
    }

    const measuredAt = `${measuredDate}T${measuredTime}:00`;

    try {
      setLoading(true);
      const res = await createVitalLog(currentKeluarga.id, {
        family_member_id: selectedMemberId,
        measured_at: new Date(measuredAt).toISOString(),
        vital_type: activeTab,
        data: vitalData,
        notes: notes.trim() || undefined,
      });

      if (!res.success) {
        throw new Error(res.error?.message || "Gagal menyimpan tanda vital");
      }

      await refreshData();
      router.push(`/kesehatan?tab=vitals&memberId=${selectedMemberId}`);
    } catch (err: any) {
      setErrorMsg(err?.message || "Gagal menyimpan tanda vital");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh pb-32" style={{ background: "var(--bg, #f8fafc)", color: "var(--text, #17375f)" }}>
      <PageHeader
        title="Catat Tanda Vital"
        subtitle={selectedMember ? `Pasien: ${selectedMember.name}` : "Biomarker Kesehatan"}
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
          {/* 1. Pilih Pasien */}
          <div className="p-4 rounded-2xl border bg-white shadow-sm" style={{ borderColor: "var(--border, #e2e8f0)" }}>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Pasien Anggota Keluarga *
            </label>
            {loadingMembers ? (
              <div className="h-10 rounded-xl bg-slate-100 animate-pulse" />
            ) : (
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.relation_role})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 2. Pemilihan Jenis Biomarker / Tanda Vital */}
          <div className="p-4 rounded-2xl border bg-white shadow-sm space-y-4" style={{ borderColor: "var(--border, #e2e8f0)" }}>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
                Kategori Biomarker *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: "blood_pressure", label: "Tensi Darah", icon: Heart, activeClass: "bg-rose-50 border-rose-500 text-rose-700" },
                  { id: "blood_sugar", label: "Gula Darah", icon: Droplets, activeClass: "bg-amber-50 border-amber-500 text-amber-700" },
                  { id: "cholesterol", label: "Kolesterol", icon: Activity, activeClass: "bg-indigo-50 border-indigo-500 text-indigo-700" },
                  { id: "uric_acid", label: "Asam Urat", icon: Zap, activeClass: "bg-emerald-50 border-emerald-500 text-emerald-700" },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveTab(item.id as any)}
                      className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all text-center ${
                        isSelected
                          ? `${item.activeClass} shadow-sm ring-1 ring-offset-0`
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <Icon size={18} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Input Form per Tab */}
            <div className="pt-2 border-t border-slate-100">
              {/* TAB 1: TENSI */}
              {activeTab === "blood_pressure" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Sistolik (mmHg) *
                      </label>
                      <input
                        type="number"
                        required
                        placeholder="120"
                        value={systolicStr}
                        onChange={(e) => setSystolicStr(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-rose-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Diastolik (mmHg) *
                      </label>
                      <input
                        type="number"
                        required
                        placeholder="80"
                        value={diastolicStr}
                        onChange={(e) => setDiastolicStr(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-rose-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Detak Nadi / Pulse (bpm - opsional)
                    </label>
                    <input
                      type="number"
                      placeholder="72"
                      value={pulseStr}
                      onChange={(e) => setPulseStr(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: GULA DARAH */}
              {activeTab === "blood_sugar" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Kondisi Saat Cek Gula Darah *
                    </label>
                    <select
                      value={sugarCategory}
                      onChange={(e) => setSugarCategory(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="fasting">Puasa (Min. 8 jam tanpa makan)</option>
                      <option value="postprandial">2 Jam Setelah Makan</option>
                      <option value="random">Gula Darah Sewaktu (GDS)</option>
                      <option value="hba1c">HbA1c (Rata-rata 3 Bulan, %)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Kadar Gula ({sugarCategory === "hba1c" ? "%" : "mg/dL"}) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      placeholder={sugarCategory === "hba1c" ? "5.7" : "105"}
                      value={sugarValStr}
                      onChange={(e) => setSugarValStr(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              )}

              {/* TAB 3: KOLESTEROL */}
              {activeTab === "cholesterol" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Kolesterol Total (mg/dL) *
                    </label>
                    <input
                      type="number"
                      required
                      placeholder="190"
                      value={cholTotalStr}
                      onChange={(e) => setCholTotalStr(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        LDL (Jahat)
                      </label>
                      <input
                        type="number"
                        placeholder="110"
                        value={ldlStr}
                        onChange={(e) => setLdlStr(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        HDL (Baik)
                      </label>
                      <input
                        type="number"
                        placeholder="55"
                        value={hdlStr}
                        onChange={(e) => setHdlStr(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Trigliserida
                      </label>
                      <input
                        type="number"
                        placeholder="140"
                        value={triglyceridesStr}
                        onChange={(e) => setTriglyceridesStr(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: ASAM URAT */}
              {activeTab === "uric_acid" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Kadar Asam Urat (mg/dL) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      placeholder="5.8"
                      value={uricValStr}
                      onChange={(e) => setUricValStr(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 3. Waktu Pengukuran & Catatan */}
          <div className="p-4 rounded-2xl border bg-white shadow-sm space-y-4" style={{ borderColor: "var(--border, #e2e8f0)" }}>
            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tanggal Cek *
                </label>
                <input
                  type="date"
                  required
                  value={measuredDate}
                  onChange={(e) => setMeasuredDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Waktu / Jam
                </label>
                <input
                  type="time"
                  required
                  value={measuredTime}
                  onChange={(e) => setMeasuredTime(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Catatan Tambahan (Opsional)
              </label>
              <textarea
                rows={2}
                placeholder="Contoh: Diukur sehabis bangun tidur pagi sebelum sarapan"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500"
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
                className="w-2/3 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold shadow-md shadow-rose-200 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? (
                  <span>Menyimpan...</span>
                ) : (
                  <>
                    <Check size={18} />
                    <span>Simpan Hasil Periksa</span>
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

export default function CatatVitalsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Memuat formulir...</div>}>
      <CatatVitalsContent />
    </Suspense>
  );
}
