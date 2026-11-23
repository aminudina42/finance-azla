"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApp } from "@/lib/store";
import PageHeader from "@/components/PageHeader";
import Skeleton from "@/components/Skeleton";
import MemberSwitcher from "@/components/Kesehatan/MemberSwitcher";
import ActiveMedicationsCard from "@/components/Kesehatan/ActiveMedicationsCard";
import GrowthTab from "@/components/Kesehatan/GrowthTab";
import VitalsTab from "@/components/Kesehatan/VitalsTab";
import MedicalRecordsTab from "@/components/Kesehatan/MedicalRecordsTab";
import {
  getHealthFamilyMembers,
  getGrowthLogs,
  deleteGrowthLog,
  getVitalLogs,
  deleteVitalLog,
  getMedicalRecords,
  updateMedicalRecord,
  deleteMedicalRecord,
  getActiveMedications,
  toggleMedicationActive,
} from "@/lib/health-service";
import { calculateDetailedAge } from "@/lib/health-utils";
import type {
  HealthFamilyMember,
  HealthGrowthLog,
  HealthVitalLog,
  HealthMedicalRecord,
  HealthMedication,
} from "@/lib/types";
import {
  Scale,
  Activity,
  Stethoscope,
  ShieldAlert,
  HeartHandshake,
  UserPlus,
  Edit3,
} from "lucide-react";

function KesehatanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetMemberParam = searchParams.get("memberId");
  const tabParam = searchParams.get("tab") as "growth" | "vitals" | "medical" | null;

  const { currentKeluarga } = useApp();

  const [members, setMembers] = useState<HealthFamilyMember[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(targetMemberParam || null);
  const [activeTab, setActiveTab] = useState<"growth" | "vitals" | "medical">(tabParam || "growth");

  const [growthLogs, setGrowthLogs] = useState<HealthGrowthLog[]>([]);
  const [vitalLogs, setVitalLogs] = useState<HealthVitalLog[]>([]);
  const [medicalRecords, setMedicalRecords] = useState<HealthMedicalRecord[]>([]);
  const [activeMedications, setActiveMedications] = useState<HealthMedication[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // 1. Load Members
  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getHealthFamilyMembers(currentKeluarga?.id);
      setMembers(data);
      if (data.length > 0) {
        if (targetMemberParam && data.some((m) => m.id === targetMemberParam)) {
          setSelectedMemberId(targetMemberParam);
        } else if (!selectedMemberId) {
          setSelectedMemberId(data[0].id);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [currentKeluarga?.id, selectedMemberId, targetMemberParam]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  // Active Selected Member
  const selectedMember = useMemo(() => {
    return members.find((m) => m.id === selectedMemberId) || members[0] || null;
  }, [members, selectedMemberId]);

  // Automatically adjust default tab based on relation role if tabParam not explicitly given
  useEffect(() => {
    if (selectedMember && !tabParam) {
      if (selectedMember.relation_role === "anak") {
        setActiveTab("growth");
      } else {
        setActiveTab("vitals");
      }
    }
  }, [selectedMember?.id, selectedMember?.relation_role, tabParam]);

  // 2. Load Details for Selected Member
  const loadMemberDetails = useCallback(async (memberId: string) => {
    setLoadingDetails(true);
    try {
      const [growth, vitals, records, meds] = await Promise.all([
        getGrowthLogs(memberId),
        getVitalLogs(memberId),
        getMedicalRecords(memberId),
        getActiveMedications(memberId),
      ]);

      setGrowthLogs(growth);
      setVitalLogs(vitals);
      setMedicalRecords(records);
      setActiveMedications(meds);
    } finally {
      setLoadingDetails(false);
    }
  }, []);

  useEffect(() => {
    if (selectedMember?.id) {
      loadMemberDetails(selectedMember.id);
    }
  }, [selectedMember?.id, loadMemberDetails]);

  // Actions
  const handleDeleteGrowth = async (id: string) => {
    if (!selectedMember) return;
    const res = await deleteGrowthLog(id);
    if (res.success) {
      await loadMemberDetails(selectedMember.id);
    }
  };

  const handleDeleteVital = async (id: string) => {
    if (!selectedMember) return;
    const res = await deleteVitalLog(id);
    if (res.success) {
      await loadMemberDetails(selectedMember.id);
    }
  };

  const handleDeleteMedicalRecord = async (id: string, deleteTx: boolean = false) => {
    if (!selectedMember) return;
    const res = await deleteMedicalRecord(id, deleteTx);
    if (res.success) {
      await loadMemberDetails(selectedMember.id);
    }
  };

  const handleToggleCured = async (rec: HealthMedicalRecord) => {
    if (!selectedMember) return;
    const nextState = !rec.is_cured;
    await updateMedicalRecord(rec.id, {
      is_cured: nextState,
      end_date: nextState ? new Date().toISOString().split("T")[0] : null,
    });
    await loadMemberDetails(selectedMember.id);
  };

  const handleToggleMedication = async (
    id: string,
    isActive: boolean,
    stoppedReason?: any
  ) => {
    if (!selectedMember) return;
    await toggleMedicationActive(id, isActive, stoppedReason);
    await loadMemberDetails(selectedMember.id);
  };

  const memberAge = selectedMember
    ? calculateDetailedAge(
        selectedMember.birth_date,
        undefined,
        selectedMember.is_premature,
        selectedMember.gestational_weeks
      )
    : null;

  return (
    <div className="min-h-dvh pb-24" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <PageHeader
        title="Kesehatan Keluarga"
        subtitle="Pantau Tumbuh Kembang & Rekam Medis"
        backHref="/"
        action={
          <button
            onClick={() => router.push("/kesehatan/anggota/tambah")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition-colors cursor-pointer"
            title="Tambah Anggota / Anak"
          >
            <UserPlus size={14} />
            <span className="hidden sm:inline">Tambah Anggota</span>
          </button>
        }
      />

      <main className="max-w-xl mx-auto px-4 pt-4 space-y-4">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-14 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-44 w-full rounded-2xl" />
          </div>
        ) : members.length === 0 ? (
          /* Empty State: No Members registered */
          <div
            className="rounded-3xl p-6 text-center border mt-4"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 mx-auto flex items-center justify-center mb-3">
              <HeartHandshake size={32} />
            </div>
            <h3 className="font-extrabold text-lg" style={{ color: "var(--navy)" }}>
              Mulai Buku Kesehatan Keluarga
            </h3>
            <p className="text-xs max-w-sm mx-auto mt-1 mb-5" style={{ color: "var(--muted)" }}>
              Daftarkan profil Ayah, Ibu, atau Anak untuk mulai mencatat tumbuh kembang balita, riwayat tensi, dan rekam obat.
            </p>
            <button
              onClick={() => router.push("/kesehatan/anggota/tambah")}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              <UserPlus size={16} />
              <span>Tambah Anggota Pertama</span>
            </button>
          </div>
        ) : (
          <>
            {/* 1. Member Switcher */}
            <MemberSwitcher
              members={members}
              selectedMemberId={selectedMember?.id || null}
              onSelectMember={(id) => setSelectedMemberId(id)}
              onAddMember={() => router.push("/kesehatan/anggota/tambah")}
            />

            {/* 2. Member Info & Allergy Banner */}
            {selectedMember && (
              <div
                className="rounded-2xl p-4"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-extrabold" style={{ color: "var(--navy)" }}>
                        {selectedMember.name}
                      </h2>
                      {selectedMember.blood_type && selectedMember.blood_type !== "unknown" && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                          Gol. {selectedMember.blood_type}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs mt-0.5 flex-wrap" style={{ color: "var(--muted)" }}>
                      <span>Usia: <strong style={{ color: "var(--text)" }}>{memberAge?.formatted}</strong></span>
                      {memberAge?.correctedFormatted && (
                        <span className="text-[11px] px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                          Usia Koreksi Prematur: {memberAge.correctedFormatted}
                        </span>
                      )}
                      <span>•</span>
                      <span>
                        Lahir:{" "}
                        <strong style={{ color: "var(--text)" }}>
                          {selectedMember.birth_date
                            ? new Date(selectedMember.birth_date).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : "-"}
                        </strong>
                      </span>
                      {selectedMember.bpjs_number && (
                        <>
                          <span>•</span>
                          <span>BPJS: {selectedMember.bpjs_number}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => router.push(`/kesehatan/anggota/${selectedMember.id}/edit`)}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold cursor-pointer transition-colors"
                    style={{ color: "var(--navy)" }}
                    title="Edit tanggal lahir & data profil"
                  >
                    <Edit3 size={13} />
                    <span>Edit Profil</span>
                  </button>
                </div>

                {/* Prominent Allergy Banner (Safety First!) */}
                {selectedMember.allergies && selectedMember.allergies.length > 0 && (
                  <div className="mt-3 p-2.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2">
                    <ShieldAlert size={16} className="text-red-600 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <span className="font-bold text-red-800">
                        Peringatan Riwayat Alergi:{" "}
                      </span>
                      <span className="font-semibold text-red-700">
                        {selectedMember.allergies.join(", ")}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3. Active Medications Card (If any) */}
            {selectedMember && (
              <ActiveMedicationsCard
                medications={activeMedications}
                onToggleActive={handleToggleMedication}
              />
            )}

            {/* 4. Sub-Navigation Tabs */}
            <div className="flex items-center gap-1.5 p-1 rounded-2xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
              <button
                type="button"
                onClick={() => setActiveTab("growth")}
                className={`flex-1 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === "growth"
                    ? "bg-rose-500 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Scale size={14} />
                <span>Tumbuh Kembang</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("vitals")}
                className={`flex-1 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === "vitals"
                    ? "bg-rose-500 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Activity size={14} />
                <span>Tanda Vital</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("medical")}
                className={`flex-1 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === "medical"
                    ? "bg-rose-500 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Stethoscope size={14} />
                <span>Rekam Medis</span>
              </button>
            </div>

            {/* 5. Tab Content Views */}
            {selectedMember && (
              <div className="pt-1">
                {loadingDetails ? (
                  <div className="space-y-3">
                    <Skeleton className="h-28 w-full rounded-2xl" />
                    <Skeleton className="h-44 w-full rounded-2xl" />
                  </div>
                ) : (
                  <>
                    {activeTab === "growth" && (
                      <GrowthTab
                        member={selectedMember}
                        logs={growthLogs}
                        onOpenAddModal={() => router.push(`/kesehatan/tumbuh/catat?memberId=${selectedMember.id}`)}
                        onDeleteLog={handleDeleteGrowth}
                      />
                    )}

                    {activeTab === "vitals" && (
                      <VitalsTab
                        member={selectedMember}
                        logs={vitalLogs}
                        onOpenAddModal={() => router.push(`/kesehatan/vitals/catat?memberId=${selectedMember.id}`)}
                        onDeleteLog={handleDeleteVital}
                      />
                    )}

                    {activeTab === "medical" && (
                      <MedicalRecordsTab
                        member={selectedMember}
                        records={medicalRecords}
                        onOpenAddModal={() => router.push(`/kesehatan/berobat/baru?memberId=${selectedMember.id}`)}
                        onDeleteRecord={handleDeleteMedicalRecord}
                        onToggleCured={handleToggleCured}
                      />
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default function KesehatanPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh flex items-center justify-center p-4 text-sm text-slate-500">Memuat Buku Kesehatan...</div>}>
      <KesehatanContent />
    </Suspense>
  );
}
