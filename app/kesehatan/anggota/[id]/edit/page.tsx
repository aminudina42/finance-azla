"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { useApp } from "@/lib/store";
import {
  getHealthFamilyMembers,
  updateHealthFamilyMember,
  deleteHealthFamilyMember,
} from "@/lib/health-service";
import type {
  HealthFamilyMember,
  HealthRelationRole,
  HealthGender,
  HealthBloodType,
} from "@/lib/types";
import { UserCheck, Check, AlertTriangle, Trash2, Heart } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditAnggotaKesehatanPage({ params }: PageProps) {
  const router = useRouter();
  const { id } = use(params);
  const { currentKeluarga, refreshData } = useApp();

  const [member, setMember] = useState<HealthFamilyMember | null>(null);
  const [loadingInit, setLoadingInit] = useState(true);

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
    async function loadData() {
      setLoadingInit(true);
      if (currentKeluarga?.id) {
        const members = await getHealthFamilyMembers(currentKeluarga.id);
        const target = members.find((m) => m.id === id);
        if (target) {
          setMember(target);
          setName(target.name || "");
          setRelationRole(target.relation_role || "anak");
          setGender(target.gender || "male");
          setBirthDate(target.birth_date ? target.birth_date.split("T")[0] : "");
          setIsPremature(!!target.is_premature);
          setGestationalWeeks(target.gestational_weeks ? String(target.gestational_weeks) : "35");
          setBloodType(target.blood_type || "unknown");
          setAllergiesInput(target.allergies?.join(", ") || "");
          setChronicInput(target.chronic_conditions?.join(", ") || "");
          setBpjsNumber(target.bpjs_number || "");
        } else {
          setErrorMsg("Data anggota tidak ditemukan");
        }
      }
      setLoadingInit(false);
    }
    loadData();
  }, [currentKeluarga?.id, id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Nama anggota wajib diisi");
      return;
    }
    if (!birthDate) {
      setErrorMsg("Tanggal lahir wajib diisi");
      return;
    }

    setErrorMsg(null);

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

      const res = await updateHealthFamilyMember(id, {
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

      if (!res.success) {
        throw new Error(res.error?.message || "Gagal memperbarui profil anggota");
      }

      await refreshData();
      router.push(`/kesehatan?memberId=${id}`);
    } catch (err: any) {
      setErrorMsg(err?.message || "Gagal memperbarui profil anggota");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!member) return;
    if (
      window.confirm(
        `Hapus profil kesehatan "${member.name}" beserta seluruh riwayat periksa & tumbuh kembangnya?`
      )
    ) {
      try {
        setDeleting(true);
        const res = await deleteHealthFamilyMember(id);
        if (!res.success) throw new Error("Gagal menghapus anggota");

        await refreshData();
        router.push("/kesehatan");
      } catch (err: any) {
        setErrorMsg(err?.message || "Gagal menghapus anggota");
      } finally {
        setDeleting(false);
      }
    }
  };

  if (loadingInit) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-4">
        <p className="text-sm text-slate-500 font-medium">Memuat data anggota...</p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh pb-32" style={{ background: "var(--bg, #f8fafc)", color: "var(--text, #17375f)" }}>
      <PageHeader
        title="Edit Profil Kesehatan"
        subtitle={member ? `Pasien: ${member.name}` : "Perbarui Info Medis"}
        backHref={`/kesehatan?memberId=${id}`}
        action={
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors"
            title="Hapus Anggota"
          >
            <Trash2 size={18} />
          </button>
        }
      />

      <main className="max-w-xl mx-auto px-4 pt-5">
        {errorMsg && (
          <div className="mb-5 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2.5 shadow-sm">
            <AlertTriangle size={18} className="shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 1. Biodata Pokok */}
          <div className="p-4 rounded-2xl border bg-white shadow-sm space-y-4" style={{ borderColor: "var(--border, #e2e8f0)" }}>
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <UserCheck size={18} className="text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">Identitas Pribadi</h2>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nama Lengkap / Panggilan *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Hubungan Keluarga *
                </label>
                <select
                  value={relationRole}
                  onChange={(e) => setRelationRole(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="anak">Anak</option>
                  <option value="ayah">Ayah / Suami</option>
                  <option value="ibu">Ibu / Istri</option>
                  <option value="kakek">Kakek</option>
                  <option value="nenek">Nenek</option>
                  <option value="lainnya">Lainnya</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Jenis Kelamin *
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="male">Laki-laki (Boy)</option>
                  <option value="female">Perempuan (Girl)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Tanggal Lahir *
              </label>
              <input
                type="date"
                required
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Prematuritas */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPremature}
                  onChange={(e) => setIsPremature(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs font-semibold text-slate-700">
                  Lahir Prematur (&lt; 37 minggu kehamilan)
                </span>
              </label>

              {isPremature && (
                <div className="pt-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Usia Kehamilan Saat Lahir (Minggu)
                  </label>
                  <input
                    type="number"
                    min={24}
                    max={36}
                    value={gestationalWeeks}
                    onChange={(e) => setGestationalWeeks(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>
          </div>

          {/* 2. Profil Medis & Darah */}
          <div className="p-4 rounded-2xl border bg-white shadow-sm space-y-4" style={{ borderColor: "var(--border, #e2e8f0)" }}>
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Heart size={18} className="text-rose-600" />
              <h2 className="text-sm font-bold text-slate-900">Data Klinis & Medis</h2>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Golongan Darah
                </label>
                <select
                  value={bloodType}
                  onChange={(e) => setBloodType(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="unknown">Belum Tahu</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="AB">AB</option>
                  <option value="O">O</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  No. BPJS Kesehatan
                </label>
                <input
                  type="text"
                  placeholder="000123456789"
                  value={bpjsNumber}
                  onChange={(e) => setBpjsNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Riwayat Alergi Obat / Makanan (Pisahkan koma)
              </label>
              <input
                type="text"
                placeholder="Contoh: Amoxicillin, Paracetamol, Seafood, Telur"
                value={allergiesInput}
                onChange={(e) => setAllergiesInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Penyakit Kronis / Bawaan (Pisahkan koma)
              </label>
              <input
                type="text"
                placeholder="Contoh: Asma, Diabetes, Hipertensi"
                value={chronicInput}
                onChange={(e) => setChronicInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    <span>Perbarui Profil</span>
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
