"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { useApp } from "@/lib/store";
import {
  getHealthFamilyMembers,
  createMedicalRecord,
} from "@/lib/health-service";
import type { HealthFamilyMember } from "@/lib/types";
import { sanitizeDecimalInput, checkAllergyRisk } from "@/lib/health-utils";
import {
  Stethoscope,
  Plus,
  Trash2,
  AlertTriangle,
  Pill,
  Check,
  Building2,
  User,
  Calendar,
  CreditCard,
  DollarSign,
  FileText,
  ShieldAlert,
} from "lucide-react";

interface MedicationInputItem {
  medicine_name: string;
  is_antibiotic: boolean;
  dosage: string;
  frequency: string;
  timing_rule: string;
}

function CatatBerobatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetMemberId = searchParams.get("memberId");

  const { currentKeluarga, posList, refreshData } = useApp();

  const [members, setMembers] = useState<HealthFamilyMember[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>(targetMemberId || "");
  const [loadingMembers, setLoadingMembers] = useState(true);

  // Form states
  const [illnessName, setIllnessName] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState("");
  const [isCured, setIsCured] = useState(false);
  const [doctorName, setDoctorName] = useState("");
  const [clinicHospital, setClinicHospital] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"pribadi" | "bpjs" | "asuransi_kantor" | "asuransi_swasta">("pribadi");
  const [costAmountStr, setCostAmountStr] = useState("");
  const [recordToFinance, setRecordToFinance] = useState(false);
  const [selectedPosId, setSelectedPosId] = useState<string>(posList[0]?.id || "");

  // Dynamic medications list
  const [meds, setMeds] = useState<MedicationInputItem[]>([]);

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

  const handleAddMedRow = () => {
    setMeds((prev) => [
      ...prev,
      {
        medicine_name: "",
        is_antibiotic: false,
        dosage: "3x1",
        frequency: "Sesudah makan",
        timing_rule: "Sesudah makan",
      },
    ]);
  };

  const handleRemoveMedRow = (idx: number) => {
    setMeds((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateMed = (idx: number, field: keyof MedicationInputItem, val: any) => {
    setMeds((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: val };
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentKeluarga?.id || !selectedMemberId) {
      setErrorMsg("Pilih anggota keluarga terlebih dahulu");
      return;
    }

    if (!illnessName.trim()) {
      setErrorMsg("Keluhan sakit atau diagnosis wajib diisi");
      return;
    }

    setErrorMsg(null);

    const cost = Math.max(0, sanitizeDecimalInput(costAmountStr.replace(/\D/g, "")));

    const validMeds = meds
      .filter((m) => m.medicine_name.trim().length > 0)
      .map((m) => ({
        medicine_name: m.medicine_name.trim(),
        is_antibiotic: m.is_antibiotic,
        dosage: m.dosage || "1x sehari",
        frequency: m.frequency || "Tiap hari",
        timing_rule: m.timing_rule || undefined,
        start_date: startDate,
        end_date: isCured && endDate ? endDate : undefined,
        is_active: !isCured,
      }));

    try {
      setLoading(true);
      const res = await createMedicalRecord(currentKeluarga.id, {
        family_member_id: selectedMemberId,
        illness_name: illnessName.trim(),
        diagnosis: diagnosis.trim() || undefined,
        symptoms: symptoms.trim() || undefined,
        start_date: startDate,
        end_date: isCured && endDate ? endDate : undefined,
        is_cured: isCured,
        doctor_name: doctorName.trim() || undefined,
        clinic_hospital: clinicHospital.trim() || undefined,
        payment_method: paymentMethod,
        cost_amount: cost > 0 ? cost : undefined,
        finance_pos_id: recordToFinance && cost > 0 ? selectedPosId : undefined,
        medications: validMeds,
      });

      if (!res.success) {
        throw new Error(res.error?.message || "Gagal menyimpan rekam medis");
      }

      await refreshData();
      router.push(`/kesehatan?tab=records&memberId=${selectedMemberId}`);
    } catch (err: any) {
      setErrorMsg(err?.message || "Gagal menyimpan rekam medis");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh pb-32" style={{ background: "var(--bg, #f8fafc)", color: "var(--text, #17375f)" }}>
      <PageHeader
        title="Catat Berobat & Resep"
        subtitle={selectedMember ? `Pasien: ${selectedMember.name}` : "Rekam Medis Keluarga"}
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

            {selectedMember && selectedMember.allergies && selectedMember.allergies.length > 0 && (
              <div className="mt-3 p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 text-amber-800 text-xs flex items-center gap-2">
                <ShieldAlert size={15} className="shrink-0 text-amber-600" />
                <span>
                  <strong>Perhatian Riwayat Alergi:</strong> {selectedMember.allergies.join(", ")}
                </span>
              </div>
            )}
          </div>

          {/* 2. Informasi Keluhan & Waktu */}
          <div className="p-4 rounded-2xl border bg-white shadow-sm space-y-4" style={{ borderColor: "var(--border, #e2e8f0)" }}>
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Stethoscope size={18} className="text-rose-600" />
              <h2 className="text-sm font-bold text-slate-900">Keluhan & Diagnosis</h2>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Keluhan Sakit / Diagnosis *
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Radang Tenggorokan & Demam Tinggi"
                value={illnessName}
                onChange={(e) => setIllnessName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Diagnosis Medis Dokter (Bila ada)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Faringitis Akut"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Gejala yang Dirasakan
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Nyeri telan, batuk kering, lemas"
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Mulai Sakit *
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tanggal Sembuh
                </label>
                <input
                  type="date"
                  disabled={!isCured}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:opacity-50 disabled:bg-slate-50"
                />
              </div>
            </div>

            <label className="flex items-center gap-2.5 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={isCured}
                onChange={(e) => {
                  setIsCured(e.target.checked);
                  if (e.target.checked && !endDate) {
                    setEndDate(new Date().toISOString().split("T")[0]);
                  }
                }}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-xs font-semibold text-slate-700">
                Alhamdulillah, pasien sudah sembuh
              </span>
            </label>
          </div>

          {/* 3. Fasilitas Kesehatan & Dokter */}
          <div className="p-4 rounded-2xl border bg-white shadow-sm space-y-4" style={{ borderColor: "var(--border, #e2e8f0)" }}>
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Building2 size={18} className="text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">Fasilitas Kesehatan & Dokter</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Klinik / Rumah Sakit / Puskesmas
                </label>
                <input
                  type="text"
                  placeholder="Contoh: RS Hermina / Puskesmas"
                  value={clinicHospital}
                  onChange={(e) => setClinicHospital(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nama Dokter / Bidan
                </label>
                <input
                  type="text"
                  placeholder="Contoh: dr. Anita, Sp.A"
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Metode Pembayaran
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: "pribadi", label: "Pribadi / Umum" },
                  { id: "bpjs", label: "BPJS Kesehatan" },
                  { id: "asuransi_kantor", label: "Asuransi Kantor" },
                  { id: "asuransi_swasta", label: "Asuransi Swasta" },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id as any)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all text-center ${
                      paymentMethod === m.id
                        ? "bg-blue-50 border-blue-500 text-blue-700 shadow-sm"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Integrasi Keuangan */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Total Biaya Berobat & Obat (Rp)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    Rp
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={costAmountStr}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "");
                      setCostAmountStr(digits ? Number(digits).toLocaleString("id-ID") : "");
                    }}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {costAmountStr && (
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={recordToFinance}
                    onChange={(e) => setRecordToFinance(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-semibold text-slate-700">
                    Potong otomatis dari Pos Keuangan Keluarga
                  </span>
                </label>
              )}

              {recordToFinance && costAmountStr && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Pilih Pos Anggaran Kesehatan:
                  </label>
                  <select
                    value={selectedPosId}
                    onChange={(e) => setSelectedPosId(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {posList.map((pos) => (
                      <option key={pos.id} value={pos.id}>
                        {pos.name} (Saldo: Rp {pos.current_balance.toLocaleString("id-ID")})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* 4. Resep Obat Dinamis */}
          <div className="p-4 rounded-2xl border bg-white shadow-sm space-y-4" style={{ borderColor: "var(--border, #e2e8f0)" }}>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Pill size={18} className="text-emerald-600" />
                <h2 className="text-sm font-bold text-slate-900">Daftar Resep Obat</h2>
              </div>
              <button
                type="button"
                onClick={handleAddMedRow}
                className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-100 transition-colors"
              >
                <Plus size={14} />
                <span>Tambah Obat</span>
              </button>
            </div>

            {meds.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center italic">
                Belum ada obat yang ditambahkan. Klik &quot;+ Tambah Obat&quot; jika dokter meresepkan obat.
              </p>
            ) : (
              <div className="space-y-3.5">
                {meds.map((m, idx) => {
                  const allergyAlert = selectedMember
                    ? checkAllergyRisk(m.medicine_name, selectedMember.allergies)
                    : null;

                  return (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3 relative"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-extrabold text-slate-500">
                          Obat #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveMedRow(idx)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      {allergyAlert && (
                        <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 font-semibold">
                          <AlertTriangle size={14} className="shrink-0" />
                          <span>Peringatan: {allergyAlert}</span>
                        </div>
                      )}

                      <div>
                        <input
                          type="text"
                          required
                          placeholder="Nama obat (contoh: Amoxicillin / Paracetamol)"
                          value={m.medicine_name}
                          onChange={(e) => handleUpdateMed(idx, "medicine_name", e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="text"
                          placeholder="Dosis (3x1)"
                          value={m.dosage}
                          onChange={(e) => handleUpdateMed(idx, "dosage", e.target.value)}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <select
                          value={m.frequency}
                          onChange={(e) => handleUpdateMed(idx, "frequency", e.target.value)}
                          className="px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="Tiap hari">Tiap hari</option>
                          <option value="Tiap 8 jam">Tiap 8 jam</option>
                          <option value="Tiap 12 jam">Tiap 12 jam</option>
                          <option value="Jika demam/sakit">Bila perlu</option>
                        </select>
                        <select
                          value={m.timing_rule}
                          onChange={(e) => handleUpdateMed(idx, "timing_rule", e.target.value)}
                          className="px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="Sesudah makan">Sesudah makan</option>
                          <option value="Sebelum makan">Sebelum makan</option>
                          <option value="Bersama makan">Bersama makan</option>
                          <option value="Sebelum tidur">Sebelum tidur</option>
                        </select>
                      </div>

                      <label className="flex items-center gap-2 cursor-pointer pt-1">
                        <input
                          type="checkbox"
                          checked={m.is_antibiotic}
                          onChange={(e) => handleUpdateMed(idx, "is_antibiotic", e.target.checked)}
                          className="w-3.5 h-3.5 rounded text-amber-600 focus:ring-amber-500"
                        />
                        <span className="text-[11px] font-semibold text-amber-900">
                          Ini adalah Antibiotik (Wajib dihabiskan sampai tuntas)
                        </span>
                      </label>
                    </div>
                  );
                })}
              </div>
            )}
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
                    <span>Simpan Rekam Medis</span>
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

export default function CatatBerobatPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Memuat formulir...</div>}>
      <CatatBerobatContent />
    </Suspense>
  );
}
