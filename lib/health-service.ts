/**
 * Health Management Service Layer
 * CatatKeluarga (finance-azla)
 */

import { supabase } from "@/lib/supabase";
import type {
  HealthFamilyMember,
  HealthGrowthLog,
  HealthVitalLog,
  HealthMedicalRecord,
  HealthMedication,
  HealthRelationRole,
  HealthGender,
  HealthBloodType,
  HealthVitalType,
  HealthVitalData,
  StatusKeluarga,
} from "@/lib/types";

export interface CreateHealthMemberInput {
  name: string;
  relation_role: HealthRelationRole;
  gender: HealthGender;
  birth_date: string;
  is_premature?: boolean;
  gestational_weeks?: number | null;
  blood_type: HealthBloodType;
  allergies?: string[];
  chronic_conditions?: string[];
  bpjs_number?: string | null;
  avatar_url?: string | null;
  auth_member_id?: string | null;
}

export interface CreateGrowthLogInput {
  family_member_id: string;
  measured_at: string;
  weight_kg: number;
  height_cm: number;
  head_circ_cm?: number | null;
  arm_circ_cm?: number | null;
  measurement_position?: "recumbent" | "standing";
  notes?: string | null;
}

export interface CreateVitalLogInput {
  family_member_id: string;
  measured_at: string;
  vital_type: HealthVitalType;
  data: HealthVitalData;
  notes?: string | null;
}

export interface CreateMedicalRecordInput {
  family_member_id: string;
  illness_name: string;
  diagnosis?: string | null;
  symptoms?: string | null;
  start_date: string;
  end_date?: string | null;
  is_cured?: boolean;
  doctor_name?: string | null;
  clinic_hospital?: string | null;
  payment_method: "pribadi" | "bpjs" | "asuransi_kantor" | "asuransi_swasta";
  cost_amount?: number;
  finance_pos_id?: string | null;
  user_id?: string;
  user_name?: string;
  user_role?: StatusKeluarga;
  attachment_urls?: string[];
  notes?: string | null;
  medications?: Array<{
    medicine_name: string;
    is_antibiotic: boolean;
    dosage: string;
    frequency: string;
    timing_rule?: string | null;
    start_date: string;
    end_date?: string | null;
    is_active: boolean;
    notes?: string | null;
  }>;
}

// ═══════════════════════════════════════════════════════════════════
// 1. HEALTH FAMILY MEMBERS
// ═══════════════════════════════════════════════════════════════════

export async function getHealthFamilyMembers(keluargaId?: string): Promise<HealthFamilyMember[]> {
  try {
    let query = supabase
      .from("health_family_members")
      .select("*")
      .order("created_at", { ascending: true });

    if (keluargaId) {
      query = query.eq("keluarga_id", keluargaId);
    }

    const { data, error } = await query;
    if (error) {
      console.warn("getHealthFamilyMembers error or table not yet migrated:", error);
      return [];
    }

    // Auto-seed fallback: if table is empty, auto-populate from `members`
    if ((!data || data.length === 0) && keluargaId) {
      const { data: existingMembers } = await supabase
        .from("members")
        .select("*")
        .eq("keluarga_id", keluargaId);

      if (existingMembers && existingMembers.length > 0) {
        const seedRows = existingMembers.map((m) => ({
          keluarga_id: keluargaId,
          auth_member_id: m.id,
          name: m.display_name,
          relation_role: (m.status_keluarga || "anak") as HealthRelationRole,
          gender: m.status_keluarga === "istri" ? ("female" as HealthGender) : ("male" as HealthGender),
          birth_date: "2000-01-01",
          blood_type: "unknown" as HealthBloodType,
          allergies: [],
          chronic_conditions: [],
        }));

        const { data: inserted } = await supabase
          .from("health_family_members")
          .insert(seedRows)
          .select();

        if (inserted && inserted.length > 0) {
          return inserted as HealthFamilyMember[];
        }
      }
    }

    return (data || []) as HealthFamilyMember[];
  } catch (err) {
    console.error("getHealthFamilyMembers exception:", err);
    return [];
  }
}

export async function createHealthFamilyMember(
  keluargaId: string,
  input: CreateHealthMemberInput
): Promise<{ success: boolean; data?: HealthFamilyMember; error?: any }> {
  try {
    const { data, error } = await supabase
      .from("health_family_members")
      .insert({
        keluarga_id: keluargaId,
        auth_member_id: input.auth_member_id || null,
        name: input.name.trim(),
        relation_role: input.relation_role,
        gender: input.gender,
        birth_date: input.birth_date,
        is_premature: input.is_premature || false,
        gestational_weeks: input.gestational_weeks || null,
        blood_type: input.blood_type || "unknown",
        allergies: input.allergies || [],
        chronic_conditions: input.chronic_conditions || [],
        bpjs_number: input.bpjs_number || null,
        avatar_url: input.avatar_url || null,
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, data: data as HealthFamilyMember };
  } catch (err) {
    console.error("createHealthFamilyMember error:", err);
    return { success: false, error: err };
  }
}

export async function updateHealthFamilyMember(
  id: string,
  input: Partial<CreateHealthMemberInput>
): Promise<{ success: boolean; error?: any }> {
  try {
    const { error } = await supabase
      .from("health_family_members")
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error("updateHealthFamilyMember error:", err);
    return { success: false, error: err };
  }
}

export async function deleteHealthFamilyMember(id: string): Promise<{ success: boolean; error?: any }> {
  try {
    const { error } = await supabase.from("health_family_members").delete().eq("id", id);
    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error("deleteHealthFamilyMember error:", err);
    return { success: false, error: err };
  }
}

// ═══════════════════════════════════════════════════════════════════
// 2. GROWTH LOGS (ANTROPOMETRI)
// ═══════════════════════════════════════════════════════════════════

export async function getGrowthLogs(familyMemberId: string): Promise<HealthGrowthLog[]> {
  try {
    const { data, error } = await supabase
      .from("health_growth_logs")
      .select("*")
      .eq("family_member_id", familyMemberId)
      .order("measured_at", { ascending: false });

    if (error) {
      console.warn("getGrowthLogs error:", error);
      return [];
    }
    return (data || []) as HealthGrowthLog[];
  } catch (err) {
    console.error("getGrowthLogs exception:", err);
    return [];
  }
}

export async function createGrowthLog(
  keluargaId: string,
  input: CreateGrowthLogInput
): Promise<{ success: boolean; data?: HealthGrowthLog; error?: any }> {
  try {
    const { data, error } = await supabase
      .from("health_growth_logs")
      .insert({
        keluarga_id: keluargaId,
        family_member_id: input.family_member_id,
        measured_at: input.measured_at,
        weight_kg: input.weight_kg,
        height_cm: input.height_cm,
        head_circ_cm: input.head_circ_cm || null,
        arm_circ_cm: input.arm_circ_cm || null,
        measurement_position: input.measurement_position || "standing",
        notes: input.notes || null,
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, data: data as HealthGrowthLog };
  } catch (err) {
    console.error("createGrowthLog error:", err);
    return { success: false, error: err };
  }
}

export async function deleteGrowthLog(id: string): Promise<{ success: boolean; error?: any }> {
  try {
    const { error } = await supabase.from("health_growth_logs").delete().eq("id", id);
    if (error) throw error;
    return { success: true };
  } catch (err) {
    return { success: false, error: err };
  }
}

// ═══════════════════════════════════════════════════════════════════
// 3. VITAL & BIOMARKER LOGS
// ═══════════════════════════════════════════════════════════════════

export async function getVitalLogs(
  familyMemberId: string,
  vitalType?: HealthVitalType
): Promise<HealthVitalLog[]> {
  try {
    let query = supabase
      .from("health_vital_logs")
      .select("*")
      .eq("family_member_id", familyMemberId)
      .order("measured_at", { ascending: false });

    if (vitalType) {
      query = query.eq("vital_type", vitalType);
    }

    const { data, error } = await query;
    if (error) {
      console.warn("getVitalLogs error:", error);
      return [];
    }
    return (data || []) as HealthVitalLog[];
  } catch (err) {
    console.error("getVitalLogs exception:", err);
    return [];
  }
}

export async function createVitalLog(
  keluargaId: string,
  input: CreateVitalLogInput
): Promise<{ success: boolean; data?: HealthVitalLog; error?: any }> {
  try {
    const { data, error } = await supabase
      .from("health_vital_logs")
      .insert({
        keluarga_id: keluargaId,
        family_member_id: input.family_member_id,
        measured_at: input.measured_at,
        vital_type: input.vital_type,
        data: input.data,
        notes: input.notes || null,
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, data: data as HealthVitalLog };
  } catch (err) {
    console.error("createVitalLog error:", err);
    return { success: false, error: err };
  }
}

export async function deleteVitalLog(id: string): Promise<{ success: boolean; error?: any }> {
  try {
    const { error } = await supabase.from("health_vital_logs").delete().eq("id", id);
    if (error) throw error;
    return { success: true };
  } catch (err) {
    return { success: false, error: err };
  }
}

// ═══════════════════════════════════════════════════════════════════
// 4. MEDICAL RECORDS & MEDICATIONS
// ═══════════════════════════════════════════════════════════════════

export async function getMedicalRecords(familyMemberId: string): Promise<HealthMedicalRecord[]> {
  try {
    const { data: records, error } = await supabase
      .from("health_medical_records")
      .select("*")
      .eq("family_member_id", familyMemberId)
      .order("start_date", { ascending: false });

    if (error) {
      console.warn("getMedicalRecords error:", error);
      return [];
    }

    if (!records || records.length === 0) return [];

    // Fetch associated medications
    const recordIds = records.map((r) => r.id);
    const { data: meds } = await supabase
      .from("health_medications")
      .select("*")
      .in("medical_record_id", recordIds);

    const medsByRecord: Record<string, HealthMedication[]> = {};
    (meds || []).forEach((m) => {
      if (m.medical_record_id) {
        if (!medsByRecord[m.medical_record_id]) {
          medsByRecord[m.medical_record_id] = [];
        }
        medsByRecord[m.medical_record_id].push(m);
      }
    });

    return records.map((r) => ({
      ...r,
      medications: medsByRecord[r.id] || [],
    })) as HealthMedicalRecord[];
  } catch (err) {
    console.error("getMedicalRecords exception:", err);
    return [];
  }
}

export async function createMedicalRecord(
  keluargaId: string,
  input: CreateMedicalRecordInput
): Promise<{ success: boolean; data?: HealthMedicalRecord; error?: any }> {
  try {
    let transactionId: string | null = null;
    const cost = input.cost_amount || 0;

    // Optional: Synchronize expense with Pos Keuangan
    if (cost > 0 && input.finance_pos_id) {
      const { data: pos } = await supabase
        .from("pos")
        .select("name, icon, current_balance")
        .eq("id", input.finance_pos_id)
        .single();

      const desc = `Biaya Berobat: ${input.illness_name}${input.doctor_name ? ` (${input.doctor_name})` : ""}`;

      const { data: tx, error: txErr } = await supabase
        .from("transactions")
        .insert({
          keluarga_id: keluargaId,
          amount: cost,
          type: "expense",
          pos_id: input.finance_pos_id,
          pos_name: pos?.name || "Kesehatan",
          pos_icon: pos?.icon || "💊",
          user_id: input.user_id || "system",
          user_name: input.user_name || "Anggota",
          user_role: input.user_role || "anak",
          description: desc,
        })
        .select()
        .single();

      if (!txErr && tx) {
        transactionId = tx.id;
        // Deduct pos balance
        if (pos) {
          await supabase
            .from("pos")
            .update({ current_balance: (pos.current_balance || 0) - cost })
            .eq("id", input.finance_pos_id);
        }
      }
    }

    // Insert medical record
    const { data: record, error: recErr } = await supabase
      .from("health_medical_records")
      .insert({
        keluarga_id: keluargaId,
        family_member_id: input.family_member_id,
        illness_name: input.illness_name.trim(),
        diagnosis: input.diagnosis || null,
        symptoms: input.symptoms || null,
        start_date: input.start_date,
        end_date: input.end_date || null,
        is_cured: input.is_cured || false,
        doctor_name: input.doctor_name || null,
        clinic_hospital: input.clinic_hospital || null,
        payment_method: input.payment_method || "pribadi",
        cost_amount: cost,
        transaction_id: transactionId,
        attachment_urls: input.attachment_urls || [],
        notes: input.notes || null,
      })
      .select()
      .single();

    if (recErr) throw recErr;

    // Insert medications if any
    if (input.medications && input.medications.length > 0 && record) {
      const medRows = input.medications.map((m) => ({
        keluarga_id: keluargaId,
        medical_record_id: record.id,
        family_member_id: input.family_member_id,
        medicine_name: m.medicine_name.trim(),
        is_antibiotic: m.is_antibiotic || false,
        dosage: m.dosage,
        frequency: m.frequency,
        timing_rule: m.timing_rule || null,
        start_date: m.start_date,
        end_date: m.end_date || null,
        is_active: m.is_active ?? true,
        notes: m.notes || null,
      }));

      await supabase.from("health_medications").insert(medRows);
    }

    return { success: true, data: record as HealthMedicalRecord };
  } catch (err) {
    console.error("createMedicalRecord error:", err);
    return { success: false, error: err };
  }
}

export async function updateMedicalRecord(
  id: string,
  input: Partial<HealthMedicalRecord>
): Promise<{ success: boolean; error?: any }> {
  try {
    const { error } = await supabase
      .from("health_medical_records")
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error("updateMedicalRecord error:", err);
    return { success: false, error: err };
  }
}

export async function deleteMedicalRecord(
  id: string,
  deleteAssociatedTransaction: boolean = false
): Promise<{ success: boolean; error?: any }> {
  try {
    if (deleteAssociatedTransaction) {
      const { data: rec } = await supabase
        .from("health_medical_records")
        .select("transaction_id, cost_amount")
        .eq("id", id)
        .single();

      if (rec?.transaction_id) {
        // Delete transaction
        await supabase.from("transactions").delete().eq("id", rec.transaction_id);
      }
    }

    const { error } = await supabase.from("health_medical_records").delete().eq("id", id);
    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error("deleteMedicalRecord error:", err);
    return { success: false, error: err };
  }
}

// ═══════════════════════════════════════════════════════════════════
// 5. ACTIVE MEDICATIONS MANAGEMENT
// ═══════════════════════════════════════════════════════════════════

export async function getActiveMedications(familyMemberId?: string): Promise<HealthMedication[]> {
  try {
    let query = supabase
      .from("health_medications")
      .select("*")
      .eq("is_active", true)
      .order("start_date", { ascending: false });

    if (familyMemberId) {
      query = query.eq("family_member_id", familyMemberId);
    }

    const { data, error } = await query;
    if (error) {
      console.warn("getActiveMedications error:", error);
      return [];
    }
    return (data || []) as HealthMedication[];
  } catch (err) {
    console.error("getActiveMedications exception:", err);
    return [];
  }
}

export async function toggleMedicationActive(
  id: string,
  isActive: boolean,
  stoppedReason?: "finished" | "cured" | "side_effects" | "doctor_order"
): Promise<{ success: boolean; error?: any }> {
  try {
    const { error } = await supabase
      .from("health_medications")
      .update({
        is_active: isActive,
        stopped_reason: stoppedReason || (isActive ? null : "finished"),
        end_date: isActive ? null : new Date().toISOString().split("T")[0],
      })
      .eq("id", id);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error("toggleMedicationActive error:", err);
    return { success: false, error: err };
  }
}

