"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useApp } from "@/lib/store";
import PageHeader from "@/components/PageHeader";
import Skeleton from "@/components/Skeleton";
import MemberSwitcher from "@/components/Kesehatan/MemberSwitcher";
import ActiveMedicationsCard from "@/components/Kesehatan/ActiveMedicationsCard";
import GrowthTab from "@/components/Kesehatan/GrowthTab";
import VitalsTab from "@/components/Kesehatan/VitalsTab";
import MedicalRecordsTab from "@/components/Kesehatan/MedicalRecordsTab";
import AddMemberModal from "@/components/Kesehatan/Modals/AddMemberModal";
import AddGrowthModal from "@/components/Kesehatan/Modals/AddGrowthModal";
import AddVitalModal from "@/components/Kesehatan/Modals/AddVitalModal";
import AddMedicalRecordModal from "@/components/Kesehatan/Modals/AddMedicalRecordModal";
import {
  getHealthFamilyMembers,
  createHealthFamilyMember,
  updateHealthFamilyMember,
  deleteHealthFamilyMember,
  getGrowthLogs,
  createGrowthLog,
  deleteGrowthLog,
  getVitalLogs,
  createVitalLog,
  deleteVitalLog,
  getMedicalRecords,
  createMedicalRecord,
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

export default function KesehatanPage() {
  const { currentKeluarga, posList } = useApp();

  const [members, setMembers] = useState<HealthFamilyMember[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"growth" | "vitals" | "medical">("growth");

  const [growthLogs, setGrowthLogs] = useState<HealthGrowthLog[]>([]);
  const [vitalLogs, setVitalLogs] = useState<HealthVitalLog[]>([]);
  const [medicalRecords, setMedicalRecords] = useState<HealthMedicalRecord[]>([]);
  const [activeMedications, setActiveMedications] = useState<HealthMedication[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Modals state
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<HealthFamilyMember | null>(null);
  const [isAddGrowthOpen, setIsAddGrowthOpen] = useState(false);
  const [isAddVitalOpen, setIsAddVitalOpen] = useState(false);
  const [isAddMedicalOpen, setIsAddMedicalOpen] = useState(false);

  // 1. Load Members
  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getHealthFamilyMembers(currentKeluarga?.id);
      setMembers(data);
      if (data.length > 0 && !selectedMemberId) {
        setSelectedMemberId(data[0].id);
      }
    } finally {
      setLoading(false);
    }
  }, [currentKeluarga?.id, selectedMemberId]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  // Active Selected Member
  const selectedMember = useMemo(() => {
    return members.find((m) => m.id === selectedMemberId) || members[0] || null;
  }, [members, selectedMemberId]);

  // Automatically adjust default tab based on relation role (Anak -> growth, Suami/Istri -> vitals)
  useEffect(() => {
    if (selectedMember) {
      if (selectedMember.relation_role === "anak") {
        setActiveTab("growth");
      } else {
        setActiveTab("vitals");
      }
    }
  }, [selectedMember?.id, selectedMember?.relation_role]);

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
  const handleSaveMember = async (data: any) => {
    if (!currentKeluarga?.id) return;
    if (memberToEdit) {
      const res = await updateHealthFamilyMember(memberToEdit.id, data);
      if (res.success) {
        await loadMembers();
        setMemberToEdit(null);
      }
    } else {
      const res = await createHealthFamilyMember(currentKeluarga.id, data);
      if (res.success && res.data) {
        await loadMembers();
        setSelectedMemberId(res.data.id);
      }
    }
  };

  const handleDeleteMember = async (id: string) => {
    const res = await deleteHealthFamilyMember(id);
    if (res.success) {
      setMemberToEdit(null);
      setIsAddMemberOpen(false);
      await loadMembers();
    }
  };

  const handleAddGrowth = async (data: any) => {
    if (!currentKeluarga?.id || !selectedMember) return;
    const res = await createGrowthLog(currentKeluarga.id, {
      ...data,
      family_member_id: selectedMember.id,
    });
    if (res.success) {
      await loadMemberDetails(selectedMember.id);
    }
  };

  const handleDeleteGrowth = async (id: string) => {
    if (!selectedMember) return;
    const res = await deleteGrowthLog(id);
    if (res.success) {
      await loadMemberDetails(selectedMember.id);
    }
  };

  const handleAddVital = async (data: any) => {
    if (!currentKeluarga?.id || !selectedMember) return;
    const res = await createVitalLog(currentKeluarga.id, {
      ...data,
      family_member_id: selectedMember.id,
    });
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

  const handleAddMedicalRecord = async (data: any) => {
    if (!currentKeluarga?.id || !selectedMember) return;
    const res = await createMedicalRecord(currentKeluarga.id, {
      ...data,
      family_member_id: selectedMember.id,
    });
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
        subtitle="Tracking tumbuh kembang, tanda vital & rekam medis"
        backHref="/"
      />

      <main className="max-w-2xl mx-auto px-4 pt-3 space-y-4">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-14 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
        ) : members.length === 0 ? (
          /* Empty Members State */
          <div
            className="rounded-3xl p-8 text-center"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
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
              onClick={() => {
                setMemberToEdit(null);
                setIsAddMemberOpen(true);
              }}
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
              onAddMember={() => {
                setMemberToEdit(null);
                setIsAddMemberOpen(true);
              }}
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
                    onClick={() => {
                      setMemberToEdit(selectedMember);
                      setIsAddMemberOpen(true);
                    }}
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
            <ActiveMedicationsCard
              medications={activeMedications}
              onToggleActive={handleToggleMedication}
            />

            {/* 4. Sub-Module Navigation Tabs */}
            <div
              className="flex items-center gap-1.5 p-1 rounded-2xl"
              style={{ background: "var(--s1, #f1f8fd)" }}
            >
              <button
                onClick={() => setActiveTab("growth")}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-colors"
                style={{
                  background: activeTab === "growth" ? "var(--surface)" : "transparent",
                  color: activeTab === "growth" ? "var(--color-da-primary, #287ff0)" : "var(--muted)",
                  boxShadow: activeTab === "growth" ? "0 1px 4px rgba(16, 45, 85, 0.06)" : "none",
                }}
              >
                <Scale size={15} />
                <span>Tumbuh Kembang</span>
              </button>

              <button
                onClick={() => setActiveTab("vitals")}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-colors"
                style={{
                  background: activeTab === "vitals" ? "var(--surface)" : "transparent",
                  color: activeTab === "vitals" ? "var(--color-da-primary, #287ff0)" : "var(--muted)",
                  boxShadow: activeTab === "vitals" ? "0 1px 4px rgba(16, 45, 85, 0.06)" : "none",
                }}
              >
                <Activity size={15} />
                <span>Tanda Vital</span>
              </button>

              <button
                onClick={() => setActiveTab("medical")}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-colors"
                style={{
                  background: activeTab === "medical" ? "var(--surface)" : "transparent",
                  color: activeTab === "medical" ? "var(--color-da-primary, #287ff0)" : "var(--muted)",
                  boxShadow: activeTab === "medical" ? "0 1px 4px rgba(16, 45, 85, 0.06)" : "none",
                }}
              >
                <Stethoscope size={15} />
                <span>Riwayat Sakit</span>
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
                        onOpenAddModal={() => setIsAddGrowthOpen(true)}
                        onDeleteLog={handleDeleteGrowth}
                      />
                    )}

                    {activeTab === "vitals" && (
                      <VitalsTab
                        member={selectedMember}
                        logs={vitalLogs}
                        onOpenAddModal={() => setIsAddVitalOpen(true)}
                        onDeleteLog={handleDeleteVital}
                      />
                    )}

                    {activeTab === "medical" && (
                      <MedicalRecordsTab
                        member={selectedMember}
                        records={medicalRecords}
                        onOpenAddModal={() => setIsAddMedicalOpen(true)}
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

      {/* MODALS */}
      {isAddMemberOpen && (
        <AddMemberModal
          isOpen={isAddMemberOpen}
          memberToEdit={memberToEdit}
          onClose={() => {
            setIsAddMemberOpen(false);
            setMemberToEdit(null);
          }}
          onSubmit={handleSaveMember}
          onDelete={handleDeleteMember}
        />
      )}

      {isAddGrowthOpen && selectedMember && (
        <AddGrowthModal
          isOpen={isAddGrowthOpen}
          onClose={() => setIsAddGrowthOpen(false)}
          member={selectedMember}
          onSubmit={handleAddGrowth}
        />
      )}

      {isAddVitalOpen && selectedMember && (
        <AddVitalModal
          isOpen={isAddVitalOpen}
          onClose={() => setIsAddVitalOpen(false)}
          member={selectedMember}
          onSubmit={handleAddVital}
        />
      )}

      {isAddMedicalOpen && selectedMember && (
        <AddMedicalRecordModal
          isOpen={isAddMedicalOpen}
          onClose={() => setIsAddMedicalOpen(false)}
          member={selectedMember}
          posList={posList || []}
          onSubmit={handleAddMedicalRecord}
        />
      )}
    </div>
  );
}
