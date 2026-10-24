"use client";

import React, { useState } from "react";
import type { HealthFamilyMember, Pos } from "@/lib/types";
import { sanitizeDecimalInput, checkAllergyRisk } from "@/lib/health-utils";
import { X, Stethoscope, Plus, Trash2, AlertTriangle, DollarSign, Pill } from "lucide-react";

interface MedicationInputItem {
  medicine_name: string;
  is_antibiotic: boolean;
  dosage: string;
  frequency: string;
  timing_rule: string;
}

interface AddMedicalRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: HealthFamilyMember;
  posList: Pos[];
  onSubmit: (data: {
    illness_name: string;
    diagnosis?: string;
    symptoms?: string;
    start_date: string;
    end_date?: string;
    is_cured: boolean;
    doctor_name?: string;
    clinic_hospital?: string;
    payment_method: "pribadi" | "bpjs" | "asuransi_kantor" | "asuransi_swasta";
    cost_amount?: number;
    finance_pos_id?: string;
    medications?: Array<{
      medicine_name: string;
      is_antibiotic: boolean;
      dosage: string;
      frequency: string;
      timing_rule?: string;
      start_date: string;
      end_date?: string;
      is_active: boolean;
    }>;
  }) => Promise<void>;
}

export default function AddMedicalRecordModal({
  isOpen,
  onClose,
  member,
  posList,
  onSubmit,
}: AddMedicalRecordModalProps) {
  const [illnessName, setIllnessName] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
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

  if (!isOpen) return null;

  const handleAddMedRow = () => {
    setMeds([
      ...meds,
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
    setMeds(meds.filter((_, i) => i !== idx));
  };

  const handleUpdateMed = (idx: number, field: keyof MedicationInputItem, val: any) => {
    const updated = [...meds];
    updated[idx] = { ...updated[idx], [field]: val };
    setMeds(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!illnessName.trim()) {
      setErrorMsg("Nama keluhan / penyakit wajib diisi");
      return;
    }

    if (endDate && new Date(endDate) < new Date(startDate)) {
      setErrorMsg("Tanggal selesai tidak boleh lebih awal dari tanggal mulai sakit");
      return;
    }

    const cost = sanitizeDecimalInput(costAmountStr);

    // Filter valid medicines
    const validMeds = meds
      .filter((m) => m.medicine_name.trim().length > 0)
      .map((m) => ({
        medicine_name: m.medicine_name.trim(),
        is_antibiotic: m.is_antibiotic,
        dosage: m.dosage || "1x1",
        frequency: m.frequency || "Tiap hari",
        timing_rule: m.timing_rule || undefined,
        start_date: startDate,
        end_date: isCured && endDate ? endDate : undefined,
        is_active: !isCured,
      }));

    try {
      setLoading(true);
      await onSubmit({
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

      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || "Gagal menyimpan rekam medis");
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
        className="rounded-3xl max-w-lg w-full p-5 max-h-[92vh] overflow-y-auto"
        style={{ background: "#ffffff", border: "1px solid #d8eaf8", color: "#17375f" }}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Stethoscope size={18} />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Catat Berobat & Resep Obat
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
            <AlertTriangle size={14} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Keluhan Sakit / Diagnosis *
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Radang Tenggorokan & Demam"
              value={illnessName}
              onChange={(e) => setIllnessName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-semibold focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 placeholder:text-slate-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tanggal Mulai Sakit *
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-medium focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Status Pemulihan
              </label>
              <div className="flex items-center gap-2 mt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={isCured}
                    onChange={(e) => setIsCured(e.target.checked)}
                    className="rounded text-rose-500"
                  />
                  <span>Sudah Sembuh</span>
                </label>
              </div>
            </div>
          </div>

          {isCured && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tanggal Selesai / Sembuh
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-medium focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Klinik / Rumah Sakit
              </label>
              <input
                type="text"
                placeholder="Puskesmas / RS Siloam"
                value={clinicHospital}
                onChange={(e) => setClinicHospital(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-medium focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Dokter
              </label>
              <input
                type="text"
                placeholder="dr. Budi, Sp.A"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-medium focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Metode Pembayaran
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs font-medium focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
              >
                <option value="pribadi">Biaya Pribadi (Mandiri)</option>
                <option value="bpjs">BPJS Kesehatan (Rp 0)</option>
                <option value="asuransi_kantor">Asuransi Kantor</option>
                <option value="asuransi_swasta">Asuransi Swasta</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Biaya Berobat (Rp)
              </label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={costAmountStr}
                onChange={(e) => setCostAmountStr(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-bold focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Opsi Sinkronisasi ke Pos Keuangan */}
          {sanitizeDecimalInput(costAmountStr) > 0 && posList.length > 0 && (
            <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={recordToFinance}
                  onChange={(e) => setRecordToFinance(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-400"
                />
                <span className="text-xs font-bold text-emerald-900 flex items-center gap-1">
                  <DollarSign size={14} />
                  Catat pengeluaran langsung ke Dompet Keuangan
                </span>
              </label>

              {recordToFinance && (
                <div>
                  <label className="block text-[11px] font-medium text-emerald-800 mb-1">
                    Pilih Pos Pengeluaran:
                  </label>
                  <select
                    value={selectedPosId}
                    onChange={(e) => setSelectedPosId(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-emerald-300 bg-white text-xs font-semibold text-slate-800"
                  >
                    {posList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.icon || ""} {p.name} (Sisa: Rp {p.current_balance?.toLocaleString("id-ID") || 0})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* SECTION RESEP OBAT-OBATAN */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Pill size={15} className="text-rose-500" />
                <span className="text-xs font-bold text-slate-800">
                  Resep Obat ({meds.length})
                </span>
              </div>
              <button
                type="button"
                onClick={handleAddMedRow}
                className="flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
              >
                <Plus size={13} />
                <span>+ Tambah Obat</span>
              </button>
            </div>

            {meds.length === 0 ? (
              <p className="text-xs text-slate-400 italic">
                Belum ada obat ditambahkan. Klik &quot;+ Tambah Obat&quot; jika ada resep dokter.
              </p>
            ) : (
              <div className="space-y-3">
                {meds.map((m, idx) => {
                  const allergyAlert = checkAllergyRisk(m.medicine_name, member.allergies);

                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          placeholder="Nama Obat (misal: Paracetamol / Amoxicillin)"
                          value={m.medicine_name}
                          onChange={(e) => handleUpdateMed(idx, "medicine_name", e.target.value)}
                          className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 text-xs font-bold placeholder:text-slate-400"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveMedRow(idx)}
                          className="text-slate-400 hover:text-red-500 p-1 cursor-pointer transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* Safety Alert for Allergy */}
                      {allergyAlert && (
                        <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-800 text-[11px] font-bold flex items-center gap-1.5">
                          <AlertTriangle size={13} className="shrink-0 text-red-600" />
                          <span>Perhatian: Pasien memiliki riwayat alergi: {allergyAlert}!</span>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Dosis (misal: 1 tablet / 5 ml)"
                          value={m.dosage}
                          onChange={(e) => handleUpdateMed(idx, "dosage", e.target.value)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-800 text-xs placeholder:text-slate-400"
                        />
                        <input
                          type="text"
                          placeholder="Aturan (misal: 3x1 sesudah makan)"
                          value={m.frequency}
                          onChange={(e) => handleUpdateMed(idx, "frequency", e.target.value)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-800 text-xs placeholder:text-slate-400"
                        />
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-slate-700">
                          <input
                            type="checkbox"
                            checked={m.is_antibiotic}
                            onChange={(e) => handleUpdateMed(idx, "is_antibiotic", e.target.checked)}
                            className="rounded text-red-500"
                          />
                          <span>Antibiotik (Wajib Habis)</span>
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
              {loading ? "Menyimpan..." : "Simpan Catatan Sakit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

