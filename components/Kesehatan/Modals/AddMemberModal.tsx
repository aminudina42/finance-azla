"use client";

import React, { useState, useEffect } from "react";
import type { HealthFamilyMember, HealthRelationRole, HealthGender, HealthBloodType } from "@/lib/types";
import { X, UserPlus, UserCheck, Trash2 } from "lucide-react";

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberToEdit?: HealthFamilyMember | null;
  onSubmit: (data: {
    name: string;
    relation_role: HealthRelationRole;
    gender: HealthGender;
    birth_date: string;
    is_premature: boolean;
    gestational_weeks?: number | null;
    blood_type: HealthBloodType;
    allergies: string[];
    chronic_conditions: string[];
    bpjs_number?: string;
  }) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export default function AddMemberModal({
  isOpen,
  onClose,
  memberToEdit,
  onSubmit,
  onDelete,
}: AddMemberModalProps) {
  const [name, setName] = useState("");
  const [relationRole, setRelationRole] = useState<HealthRelationRole>("anak");
  const [gender, setGender] = useState<HealthGender>("male");
  const [birthDate, setBirthDate] = useState("");
  const [isPremature, setIsPremature] = useState(false);
  const [gestationalWeeks, setGestationalWeeks] = useState("35");
  const [bloodType, setBloodType] = useState<HealthBloodType>("unknown");
  const [allergiesInput, setAllergiesInput] = useState("");
  const [chronicInput, setChronicInput] = useState("");
  const [bpjsNumber, setBpjsNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (memberToEdit) {
      setName(memberToEdit.name || "");
      setRelationRole(memberToEdit.relation_role || "anak");
      setGender(memberToEdit.gender || "male");
      setBirthDate(memberToEdit.birth_date ? memberToEdit.birth_date.split("T")[0] : "");
      setIsPremature(!!memberToEdit.is_premature);
      setGestationalWeeks(memberToEdit.gestational_weeks ? String(memberToEdit.gestational_weeks) : "35");
      setBloodType(memberToEdit.blood_type || "unknown");
      setAllergiesInput(memberToEdit.allergies?.join(", ") || "");
      setChronicInput(memberToEdit.chronic_conditions?.join(", ") || "");
      setBpjsNumber(memberToEdit.bpjs_number || "");
    } else {
      setName("");
      setRelationRole("anak");
      setGender("male");
      setBirthDate("");
      setIsPremature(false);
      setGestationalWeeks("35");
      setBloodType("unknown");
      setAllergiesInput("");
      setChronicInput("");
      setBpjsNumber("");
    }
    setErrorMsg(null);
  }, [isOpen, memberToEdit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg("Nama anggota wajib diisi");
      return;
    }
    if (!birthDate) {
      setErrorMsg("Tanggal lahir wajib diisi");
      return;
    }

    try {
      setLoading(true);
      const allergies = allergiesInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const chronicConditions = chronicInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      await onSubmit({
        name: name.trim(),
        relation_role: relationRole,
        gender,
        birth_date: birthDate,
        is_premature: isPremature,
        gestational_weeks: isPremature ? parseInt(gestationalWeeks) || null : null,
        blood_type: bloodType,
        allergies,
        chronic_conditions: chronicConditions,
        bpjs_number: bpjsNumber.trim() || undefined,
      });

      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || "Gagal menyimpan profil anggota");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!memberToEdit || !onDelete) return;
    if (window.confirm(`Hapus data profil kesehatan "${memberToEdit.name}" beserta seluruh riwayat tumbuh kembang & rekam medisnya?`)) {
      try {
        setDeleting(true);
        await onDelete(memberToEdit.id);
        onClose();
      } catch (err: any) {
        setErrorMsg(err?.message || "Gagal menghapus anggota");
      } finally {
        setDeleting(false);
      }
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
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              {memberToEdit ? <UserCheck size={18} /> : <UserPlus size={18} />}
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                {memberToEdit ? "Edit Profil Kesehatan" : "Tambah Anggota Kesehatan"}
              </h3>
              <p className="text-xs text-slate-500">
                {memberToEdit ? "Perbarui tanggal lahir, nama & info medis" : "Profil anak, balita, atau keluarga"}
              </p>
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
          <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Lengkap / Panggilan *
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Azla Althaf"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-medium focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 placeholder:text-slate-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Peran Keluarga
              </label>
              <select
                value={relationRole}
                onChange={(e) => setRelationRole(e.target.value as HealthRelationRole)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-medium focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
              >
                <option value="anak">Anak</option>
                <option value="suami">Ayah / Suami</option>
                <option value="istri">Ibu / Istri</option>
                <option value="orang_tua">Kakek / Nenek</option>
                <option value="lainnya">Lainnya</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Jenis Kelamin
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as HealthGender)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-medium focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
              >
                <option value="male">Laki-laki</option>
                <option value="female">Perempuan</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tanggal Lahir *
              </label>
              <input
                type="date"
                required
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-medium focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Golongan Darah
              </label>
              <select
                value={bloodType}
                onChange={(e) => setBloodType(e.target.value as HealthBloodType)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-medium focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
              >
                <option value="unknown">Tidak Tahu</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>
          </div>

          {/* Prematur Checkbox (Khusus Anak) */}
          {relationRole === "anak" && (
            <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPremature}
                  onChange={(e) => setIsPremature(e.target.checked)}
                  className="rounded text-rose-500 focus:ring-rose-400"
                />
                <span className="text-xs font-semibold text-blue-950">
                  Lahir Prematur (&lt; 37 minggu)
                </span>
              </label>
              {isPremature && (
                <div className="mt-2">
                  <label className="block text-[11px] text-blue-800 mb-1">
                    Usia Kehamilan saat Lahir (Minggu)
                  </label>
                  <input
                    type="number"
                    min="24"
                    max="36"
                    value={gestationalWeeks}
                    onChange={(e) => setGestationalWeeks(e.target.value)}
                    className="w-24 px-2 py-1 rounded-lg border border-blue-300 bg-white text-slate-800 text-xs font-bold"
                  />
                  <p className="text-[10px] text-blue-700 mt-1">
                    Digunakan untuk menghitung Usia Koreksi kurva pertumbuhan WHO.
                  </p>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Riwayat Alergi (Pisahkan koma)
            </label>
            <input
              type="text"
              placeholder="Contoh: Amoxicillin, Udang, Debu"
              value={allergiesInput}
              onChange={(e) => setAllergiesInput(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-medium focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 placeholder:text-slate-400"
            />
            <p className="text-[11px] text-slate-500 mt-0.5">
              Alergi obat akan memicu peringatan otomatis saat mencatat resep.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Penyakit Bawaan / Kronis (Opsional)
            </label>
            <input
              type="text"
              placeholder="Contoh: Asma, Hipertensi"
              value={chronicInput}
              onChange={(e) => setChronicInput(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-medium focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 placeholder:text-slate-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nomor BPJS Kesehatan (Opsional)
            </label>
            <input
              type="text"
              placeholder="0001234567890"
              value={bpjsNumber}
              onChange={(e) => setBpjsNumber(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-medium focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 placeholder:text-slate-400"
            />
          </div>

          <div className="pt-2 flex items-center justify-between gap-2">
            {memberToEdit && onDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting || loading}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 cursor-pointer disabled:opacity-50 transition-colors"
              >
                <Trash2 size={14} />
                <span>{deleting ? "Menghapus..." : "Hapus Profil"}</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading || deleting}
                className="px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold cursor-pointer disabled:opacity-50 transition-colors"
              >
                {loading
                  ? "Menyimpan..."
                  : memberToEdit
                  ? "Simpan Perubahan"
                  : "Simpan Anggota"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

