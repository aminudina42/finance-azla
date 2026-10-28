import { supabase } from "@/lib/supabase";
import type { PostgrestError } from "@supabase/supabase-js";
import type {
  Trip,
  TripItem,
  TripChecklist,
  TripCategory,
  TripStatus,
  TripChecklistAssignee,
  StatusKeluarga,
} from "./types";

export interface CreateTripInput {
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  finance_pos_id?: string | null;
  vehicle_id?: string | null;
  total_budget_limit: number;
  status?: TripStatus;
  notes?: string | null;
}

export interface CreateTripItemInput {
  trip_id: string;
  day_number: number;
  start_time?: string | null;
  end_time?: string | null;
  category: TripCategory;
  title: string;
  location?: string | null;
  booking_code?: string | null;
  notes?: string | null;
  estimated_cost: number;
}

export interface CreateTripChecklistInput {
  trip_id: string;
  item_name: string;
  assigned_to: TripChecklistAssignee;
}

export interface RecordTripExpenseInput {
  trip_item_id: string;
  actual_cost: number;
  user_id: string;
  user_name: string;
  user_role: StatusKeluarga;
  odometer_km?: number | null;
  fuel_liters?: number | null;
  saku_id?: string | null;
  saku_withdraw_amount?: number;
}

// ── Trips CRUD ──

export async function getTrips(keluargaId?: string): Promise<Trip[]> {
  let query = supabase
    .from("trips")
    .select("*")
    .order("start_date", { ascending: false });

  if (keluargaId) {
    query = query.eq("keluarga_id", keluargaId);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching trips:", error);
    return [];
  }
  return data || [];
}

export async function getTripById(id: string): Promise<Trip | null> {
  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error(`Error fetching trip ${id}:`, error);
    return null;
  }
  return data;
}

export async function createTrip(
  input: CreateTripInput,
  keluargaId: string
): Promise<{ data: Trip | null; error: PostgrestError | null }> {
  const payload = {
    ...input,
    keluarga_id: keluargaId,
    status: input.status || "planning",
    total_budget_limit: Number(input.total_budget_limit) || 0,
  };

  const { data, error } = await supabase
    .from("trips")
    .insert(payload)
    .select()
    .single();

  return { data, error };
}

export async function updateTrip(
  id: string,
  input: Partial<Trip>
): Promise<{ error: PostgrestError | null }> {
  const { error } = await supabase
    .from("trips")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id);

  return { error };
}

export async function deleteTrip(id: string): Promise<{ error: PostgrestError | null }> {
  const { error } = await supabase.from("trips").delete().eq("id", id);
  return { error };
}

// ── Trip Items CRUD ──

export async function getTripItems(tripId: string): Promise<TripItem[]> {
  const { data, error } = await supabase
    .from("trip_items")
    .select("*")
    .eq("trip_id", tripId)
    .order("day_number", { ascending: true })
    .order("start_time", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (error) {
    console.error(`Error fetching trip items for ${tripId}:`, error);
    return [];
  }
  return data || [];
}

export async function createTripItem(
  input: CreateTripItemInput,
  keluargaId: string
): Promise<{ data: TripItem | null; error: PostgrestError | null }> {
  const payload = {
    ...input,
    keluarga_id: keluargaId,
    estimated_cost: Number(input.estimated_cost) || 0,
    is_completed: false,
  };

  const { data, error } = await supabase
    .from("trip_items")
    .insert(payload)
    .select()
    .single();

  return { data, error };
}

export async function updateTripItem(
  id: string,
  input: Partial<TripItem>
): Promise<{ error: PostgrestError | null }> {
  const { error } = await supabase
    .from("trip_items")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id);

  return { error };
}

export async function deleteTripItem(id: string): Promise<{ error: PostgrestError | null }> {
  const { error } = await supabase.from("trip_items").delete().eq("id", id);
  return { error };
}

// ── One-Tap Expense (Atomic RPC) ──

export interface RecordTripExpenseResult {
  success: boolean;
  message?: string;
  transaction_id?: string;
  fuel_log_id?: string;
  pos_deducted?: number;
  saku_deducted?: number;
  error?: string;
}

export async function recordTripExpense(
  params: RecordTripExpenseInput
): Promise<RecordTripExpenseResult> {
  const { data, error } = await supabase.rpc("record_trip_expense_tx", {
    p_trip_item_id: params.trip_item_id,
    p_actual_cost: params.actual_cost,
    p_user_id: params.user_id,
    p_user_name: params.user_name,
    p_user_role: params.user_role,
    p_odometer_km: params.odometer_km || null,
    p_fuel_liters: params.fuel_liters || null,
    p_saku_id: params.saku_id || null,
    p_saku_withdraw_amount: params.saku_withdraw_amount || 0,
  });

  if (error) {
    console.error("Error executing record_trip_expense_tx:", error);
    return {
      success: false,
      error: error.message || "Gagal mencatat pengeluaran wisata secara atomic",
    };
  }

  return (
    data || {
      success: true,
    }
  );
}

export async function rollbackTripExpense(
  tripItemId: string
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.rpc("rollback_trip_expense_tx", {
    p_trip_item_id: tripItemId,
  });

  if (error) {
    console.error("Error executing rollback_trip_expense_tx:", error);
    return {
      success: false,
      error: error.message || "Gagal membatalkan pengeluaran wisata",
    };
  }

  return {
    success: true,
    ...data,
  };
}

// ── Checklists CRUD ──

export async function getTripChecklists(tripId: string): Promise<TripChecklist[]> {
  const { data, error } = await supabase
    .from("trip_checklists")
    .select("*")
    .eq("trip_id", tripId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error(`Error fetching trip checklists for ${tripId}:`, error);
    return [];
  }
  return data || [];
}

export async function createTripChecklist(
  input: CreateTripChecklistInput,
  keluargaId: string
): Promise<{ data: TripChecklist | null; error: PostgrestError | null }> {
  const payload = {
    ...input,
    keluarga_id: keluargaId,
    is_checked: false,
  };

  const { data, error } = await supabase
    .from("trip_checklists")
    .insert(payload)
    .select()
    .single();

  return { data, error };
}

export async function toggleTripChecklist(
  id: string,
  isChecked: boolean,
  checkedBy?: string | null
): Promise<{ error: PostgrestError | null }> {
  const payload: Partial<TripChecklist> = {
    is_checked: isChecked,
    checked_by: isChecked ? checkedBy || null : null,
    checked_at: isChecked ? new Date().toISOString() : null,
  };

  const { error } = await supabase
    .from("trip_checklists")
    .update(payload)
    .eq("id", id);

  return { error };
}

export async function deleteTripChecklist(id: string): Promise<{ error: PostgrestError | null }> {
  const { error } = await supabase.from("trip_checklists").delete().eq("id", id);
  return { error };
}
