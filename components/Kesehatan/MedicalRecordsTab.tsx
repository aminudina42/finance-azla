"use client";

import React from "react";
import type { HealthFamilyMember, HealthMedicalRecord } from "@/lib/types";
import { Plus, Trash2, Stethoscope, CheckCircle2, Clock, Pill, DollarSign, Building } from "lucide-react";

interface MedicalRecordsTabProps {
  member: HealthFamilyMember;
  records: HealthMedicalRecord[];
  onOpenAddModal: () => void;
  onDeleteRecord: (id: string, deleteAssociatedTransaction?: boolean) => void;
  onToggleCured: (record: HealthMedicalRecord) => void;
}

export default function MedicalRecordsTab({
  member,
  records,
  onOpenAddModal,
  onDeleteRecord,
  onToggleCured,
}: MedicalRecordsTabProps) {
  const handleDelete = (rec: HealthMedicalRecord) => {
    if (rec.transaction_id && rec.cost_amount > 0) {
      const deleteTx = window.confirm(
        `Catatan ini memiliki transaksi pengeluaran sebesar Rp ${rec.cost_amount.toLocaleString(
          "id-ID"
        )} di Dompet.\n\nKlik "OK" jika ingin MENGHAPUS pengeluaran di Dompet juga.\nKlik "Cancel" jika hanya ingin menghapus rekam medis.`
      );
      onDeleteRecord(rec.id, deleteTx);
    } else {
      if (window.confirm(`Hapus catatan medis "${rec.illness_name}"?`)) {
        onDeleteRecord(rec.id, false);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Action Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-base text-slate-900">
            Riwayat Sakit & Pengobatan
          </h3>
          <p className="text-xs text-slate-500">
            Catatan episode sakit, faskes dokter, resep obat, dan biaya
          </p>
        </div>
        <button
          onClick={onOpenAddModal}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold transition-colors cursor-pointer"
        >
          <Plus size={15} />
          <span>+ Catat Berobat</span>
        </button>
      </div>

      {records.length === 0 ? (
        <div
          className="rounded-2xl p-6 text-center transition-colors"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <Stethoscope size={32} className="mx-auto text-slate-300 mb-2" />
          <p className="text-sm font-semibold text-slate-700">
            Tidak ada riwayat sakit
          </p>
          <p className="text-xs text-slate-400 mt-0.5 mb-3">
            Alhamdulillah, anggota keluarga dalam kondisi sehat walafiat
          </p>
          <button
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs font-semibold cursor-pointer"
          >
            <Plus size={14} />
            <span>Catat Riwayat Berobat</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((rec) => (
            <div
              key={rec.id}
              className="rounded-2xl p-4 transition-colors"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-base text-slate-900">
                      {rec.illness_name}
                    </h4>
                    {rec.is_cured ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 size={11} />
                        Sembuh
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                        <Clock size={11} />
                        Dalam Pemulihan
                      </span>
                    )}

                    {rec.payment_method === "bpjs" && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        BPJS
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                    <span>
                      Mulai:{" "}
                      <strong className="text-slate-700">
                        {new Date(rec.start_date).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </strong>
                    </span>
                    {rec.end_date && (
                      <>
                        <span>•</span>
                        <span>
                          Selesai:{" "}
                          <strong className="text-slate-700">
                            {new Date(rec.end_date).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </strong>
                        </span>
                      </>
                    )}
                  </div>

                  {(rec.doctor_name || rec.clinic_hospital) && (
                    <div className="flex items-center gap-2 text-xs text-slate-600 mt-1.5">
                      <Building size={13} className="text-slate-400" />
                      <span>
                        {rec.clinic_hospital}
                        {rec.doctor_name && rec.clinic_hospital ? ` • ` : ""}
                        {rec.doctor_name}
                      </span>
                    </div>
                  )}

                  {rec.diagnosis && (
                    <p className="text-xs text-slate-600 mt-1.5">
                      <span className="font-semibold text-slate-700">
                        Diagnosis:
                      </span>{" "}
                      {rec.diagnosis}
                    </p>
                  )}

                  {rec.symptoms && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      <span className="font-medium">Gejala:</span> {rec.symptoms}
                    </p>
                  )}

                  {/* Medications List */}
                  {rec.medications && rec.medications.length > 0 && (
                    <div className="mt-3 pt-2">
                      <span className="text-xs font-bold text-slate-700 block mb-1.5">
                        Obat yang Diresepkan ({rec.medications.length})
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {rec.medications.map((m) => (
                          <div
                            key={m.id}
                            className="rounded-lg p-2 text-xs bg-white border border-slate-200"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-800">
                                {m.medicine_name}
                              </span>
                              {m.is_antibiotic && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-red-50 text-red-700 border border-red-200">
                                  Antibiotik
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {m.dosage} • {m.frequency} {m.timing_rule ? `(${m.timing_rule})` : ""}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Biaya */}
                  {rec.cost_amount > 0 && (
                    <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-slate-700">
                      <DollarSign size={14} className="text-emerald-500" />
                      <span>Biaya: Rp {rec.cost_amount.toLocaleString("id-ID")}</span>
                      {rec.transaction_id && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                          Tercatat di Dompet
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2">
                  <button
                    onClick={() => handleDelete(rec)}
                    className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                    title="Hapus riwayat sakit"
                  >
                    <Trash2 size={16} />
                  </button>

                  <button
                    onClick={() => onToggleCured(rec)}
                    className={`text-[11px] font-semibold px-2 py-1 rounded-lg border transition-colors cursor-pointer ${
                      rec.is_cured
                        ? "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        : "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                    }`}
                  >
                    {rec.is_cured ? "Ubah: Belum Sembuh" : "Tandai Sembuh"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

