import { supabase } from "@/lib/supabase";
import type { PostgrestError } from "@supabase/supabase-js";
import { formatCityName, formatMapsUrl, formatSocialUrl } from "@/lib/wisata-utils";
import type {
  Trip,
  TripItem,
  TripChecklist,
  TripCategory,
  TripStatus,
  TripChecklistAssignee,
  StatusKeluarga,
  TouristDestination,
  CreateTouristDestinationInput,
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
  destination_id?: string | null;
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
  pos_id?: string | null;
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
    throw error;
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
    throw error;
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
    throw error;
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
    p_pos_id: params.pos_id || null,
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

// ── Tourist Destinations (Katalog Destinasi Bersama) ──

export async function getTouristDestinations(
  searchQuery?: string,
  cityFilter?: string
): Promise<TouristDestination[]> {
  let query = supabase
    .from("tourist_destinations")
    .select("*")
    .order("name", { ascending: true });

  if (cityFilter && cityFilter !== "semua") {
    query = query.ilike("city", `%${cityFilter.trim()}%`);
  }

  if (searchQuery && searchQuery.trim()) {
    const q = searchQuery.trim();
    query = query.or(`name.ilike.%${q}%,city.ilike.%${q}%,notes.ilike.%${q}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching tourist destinations:", error);
    throw error;
  }
  return data || [];
}

export async function getTouristCities(): Promise<string[]> {
  const { data, error } = await supabase
    .from("tourist_destinations")
    .select("city");

  if (error) {
    console.error("Error fetching destination cities:", error);
    return [];
  }

  const uniqueCities = Array.from(
    new Set((data || []).map((d) => formatCityName(d.city)).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  return uniqueCities;
}

export async function createTouristDestination(
  input: CreateTouristDestinationInput,
  memberId?: string,
  familyName?: string
): Promise<{ data: TouristDestination | null; error: PostgrestError | null }> {
  const payload = {
    name: input.name.trim(),
    city: formatCityName(input.city),
    category: input.category || "rekreasi",
    maps_url: formatMapsUrl(input.maps_url),
    social_url: formatSocialUrl(input.social_url),
    estimated_ticket_price: Math.max(0, Number(input.estimated_ticket_price) || 0),
    notes: input.notes?.trim() || null,
    created_by: memberId || null,
    created_by_family_name: familyName || null,
  };

  const { data, error } = await supabase
    .from("tourist_destinations")
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error("Error creating tourist destination:", error);
  }
  return { data, error };
}

export async function updateTouristDestination(
  id: string,
  input: Partial<CreateTouristDestinationInput>
): Promise<{ error: PostgrestError | null }> {
  const payload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) payload.name = input.name.trim();
  if (input.city !== undefined) payload.city = formatCityName(input.city);
  if (input.category !== undefined) payload.category = input.category;
  if (input.maps_url !== undefined) payload.maps_url = formatMapsUrl(input.maps_url);
  if (input.social_url !== undefined) payload.social_url = formatSocialUrl(input.social_url);
  if (input.estimated_ticket_price !== undefined) {
    payload.estimated_ticket_price = Math.max(0, Number(input.estimated_ticket_price) || 0);
  }
  if (input.notes !== undefined) payload.notes = input.notes ? input.notes.trim() : null;

  const { error } = await supabase
    .from("tourist_destinations")
    .update(payload)
    .eq("id", id);

  if (error) {
    console.error(`Error updating tourist destination ${id}:`, error);
  }
  return { error };
}

export async function deleteTouristDestination(id: string): Promise<{ error: PostgrestError | null }> {
  const { error } = await supabase
    .from("tourist_destinations")
    .delete()
    .eq("id", id);

  if (error) {
    console.error(`Error deleting tourist destination ${id}:`, error);
  }
  return { error };
}
