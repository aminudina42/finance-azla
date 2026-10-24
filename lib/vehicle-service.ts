import { supabase } from "@/lib/supabase";
import type { PostgrestError } from "@supabase/supabase-js";
import type {
  Vehicle,
  VehicleTaxPayment,
  VehicleService,
  VehicleServiceItem,
  VehicleNotification,
  VehicleFuelLog,
  StatusKeluarga,
} from "@/lib/types";

export interface CreateVehicleInput {
  plate_number: string;
  vehicle_type: "Motor" | "Mobil";
  brand: string;
  model: string;
  next_tax_due_date: string;
  last_odometer?: number;
  notes?: string;
  service_reminder_interval_months?: 1 | 2;
  service_reminder_enabled?: boolean;
  tax_reminder_enabled?: boolean;
  finance_pos_id?: string | null;
}


export interface RecordFuelInput {
  vehicle_id: string;
  log_date: string;
  odometer_km: number;
  fuel_type: string;
  cost_per_liter?: number;
  fuel_liters: number;
  total_cost: number;
  finance_pos_id: string;
  user_id: string;
  user_name: string;
  user_role: StatusKeluarga;
  notes?: string;
}

export interface RecordTaxPaymentInput {
  vehicle_id: string;
  tax_period: string;
  payment_date: string;
  next_due_date: string;
  amount: number;
  finance_pos_id: string;
  user_id: string;
  user_name: string;
  user_role: StatusKeluarga;
  receipt_url?: string;
  notes?: string;
}

export interface RecordServiceInput {
  vehicle_id: string;
  service_date: string;
  service_type: "Servis Ringan" | "Servis Besar";
  cost_mode: "total" | "itemized";
  total_cost: number;
  service_description: string;
  odometer_km: number;
  workshop_name?: string;
  finance_pos_id: string;
  user_id: string;
  user_name: string;
  user_role: StatusKeluarga;
  receipt_url?: string;
  notes?: string;
  items?: Array<{
    item_name: string;
    item_category: "Jasa" | "Part";
    quantity: number;
    unit_price: number;
    subtotal: number;
  }>;
}

// ── Vehicles CRUD ──

export async function getVehicles(): Promise<Vehicle[]> {
  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching vehicles:", error);
    return [];
  }
  return data || [];
}

export async function getVehicleById(id: string): Promise<Vehicle | null> {
  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error(`Error fetching vehicle ${id}:`, error);
    return null;
  }
  return data;
}

export async function createVehicle(
  input: CreateVehicleInput,
  userId?: string
): Promise<{ data: Vehicle | null; error: PostgrestError | null }> {
  const payload = {
    ...input,
    user_id: userId || null,
    last_odometer: typeof input.last_odometer === "number" && !isNaN(input.last_odometer) ? input.last_odometer : 0,
    service_reminder_interval_months: input.service_reminder_interval_months || 1,
    service_reminder_enabled: input.service_reminder_enabled ?? true,
    tax_reminder_enabled: input.tax_reminder_enabled ?? true,
    finance_pos_id: input.finance_pos_id || null,
  };

  const { data, error } = await supabase
    .from("vehicles")
    .insert(payload)
    .select()
    .single();

  return { data, error };
}

export async function updateVehicle(
  id: string,
  updates: Partial<Vehicle>
): Promise<{ data: Vehicle | null; error: PostgrestError | null }> {
  const { data, error } = await supabase
    .from("vehicles")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  return { data, error };
}

export async function archiveVehicle(
  id: string
): Promise<{ success: boolean; error: PostgrestError | null }> {
  const { error } = await supabase
    .from("vehicles")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);

  return { success: !error, error };
}

// ── Tax Payments ──

export async function getVehicleTaxPayments(vehicleId: string): Promise<VehicleTaxPayment[]> {
  const { data, error } = await supabase
    .from("vehicle_tax_payments")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .order("payment_date", { ascending: false });

  if (error) {
    console.error("Error fetching tax payments:", error);
    return [];
  }
  return data || [];
}

export async function recordVehicleTaxPayment(input: RecordTaxPaymentInput): Promise<{ success: boolean; error?: unknown }> {
  // 1. Try atomic RPC first
  const { data: rpcData, error: rpcError } = await supabase.rpc("record_vehicle_tax_tx", {
    p_vehicle_id: input.vehicle_id,
    p_tax_period: input.tax_period,
    p_payment_date: input.payment_date,
    p_next_due_date: input.next_due_date,
    p_amount: input.amount,
    p_finance_pos_id: input.finance_pos_id,
    p_user_id: input.user_id,
    p_user_name: input.user_name,
    p_user_role: input.user_role,
    p_receipt_url: input.receipt_url || null,
    p_notes: input.notes || null,
  });

  if (!rpcError && rpcData?.success) {
    return { success: true };
  }

  // 2. Fallback to client-side sequential execution if RPC is not installed
  console.warn("RPC record_vehicle_tax_tx failed or not found, using sequential fallback:", rpcError?.message);

  try {
    const { data: pos } = await supabase.from("pos").select("name, icon, current_balance").eq("id", input.finance_pos_id).single();
    const { data: veh } = await supabase.from("vehicles").select("brand, model, plate_number").eq("id", input.vehicle_id).single();

    const desc = `Pajak Kendaraan — ${veh?.brand || ""} ${veh?.model || ""} (${veh?.plate_number || ""}) Periode ${input.tax_period}`;

    // Create transaction
    const { data: tx, error: txErr } = await supabase
      .from("transactions")
      .insert({
        amount: input.amount,
        type: "expense",
        pos_id: input.finance_pos_id,
        pos_name: pos?.name || "Pos",
        pos_icon: pos?.icon || "🚗",
        user_id: input.user_id,
        user_name: input.user_name,
        user_role: input.user_role,
        description: desc,
      })
      .select()
      .single();

    if (txErr) throw txErr;

    // Deduct pos balance
    if (pos) {
      await supabase.from("pos").update({ current_balance: pos.current_balance - input.amount }).eq("id", input.finance_pos_id);
    }

    // Insert tax payment
    const { error: taxErr } = await supabase.from("vehicle_tax_payments").insert({
      vehicle_id: input.vehicle_id,
      tax_period: input.tax_period,
      payment_date: input.payment_date,
      next_due_date: input.next_due_date,
      amount: input.amount,
      finance_pos_id: input.finance_pos_id,
      finance_transaction_id: tx?.id,
      receipt_url: input.receipt_url,
      notes: input.notes,
    });

    if (taxErr) throw taxErr;

    // Update vehicle next due date
    await supabase.from("vehicles").update({ next_tax_due_date: input.next_due_date }).eq("id", input.vehicle_id);

    return { success: true };
  } catch (err: unknown) {
    console.error("Fallback tax record error:", err);
    return { success: false, error: err };
  }
}

// ── Service History ──

export async function getVehicleServices(vehicleId: string): Promise<VehicleService[]> {
  const { data, error } = await supabase
    .from("vehicle_services")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .order("service_date", { ascending: false });

  if (error) {
    console.error("Error fetching vehicle services:", error);
    return [];
  }
  return data || [];
}

export async function getVehicleServiceById(serviceId: string): Promise<{
  service: VehicleService | null;
  items: VehicleServiceItem[];
}> {
  const { data: service, error: sErr } = await supabase
    .from("vehicle_services")
    .select("*")
    .eq("id", serviceId)
    .single();

  if (sErr || !service) {
    return { service: null, items: [] };
  }

  const { data: items } = await supabase
    .from("vehicle_service_items")
    .select("*")
    .eq("service_id", serviceId);

  return { service, items: items || [] };
}

export async function recordVehicleService(input: RecordServiceInput): Promise<{ success: boolean; serviceId?: string; error?: unknown }> {
  // 1. Try atomic RPC first
  const { data: rpcData, error: rpcError } = await supabase.rpc("record_vehicle_service_tx", {
    p_vehicle_id: input.vehicle_id,
    p_service_date: input.service_date,
    p_service_type: input.service_type,
    p_cost_mode: input.cost_mode,
    p_total_cost: input.total_cost,
    p_service_description: input.service_description,
    p_odometer_km: input.odometer_km,
    p_workshop_name: input.workshop_name || null,
    p_finance_pos_id: input.finance_pos_id,
    p_user_id: input.user_id,
    p_user_name: input.user_name,
    p_user_role: input.user_role,
    p_receipt_url: input.receipt_url || null,
    p_notes: input.notes || null,
  });

  if (!rpcError && rpcData?.success) {
    const serviceId = rpcData.service_id;
    // Insert itemized items if any
    if (input.items && input.items.length > 0 && serviceId) {
      await supabase.from("vehicle_service_items").insert(
        input.items.map((item) => ({
          service_id: serviceId,
          ...item,
        }))
      );
    }
    return { success: true, serviceId };
  }

  // 2. Sequential Fallback
  console.warn("RPC record_vehicle_service_tx failed or not found, using sequential fallback:", rpcError?.message);

  try {
    const { data: pos } = await supabase.from("pos").select("name, icon, current_balance").eq("id", input.finance_pos_id).single();
    const { data: veh } = await supabase.from("vehicles").select("brand, model, plate_number, last_odometer").eq("id", input.vehicle_id).single();

    const desc = `${input.service_type} — ${veh?.brand || ""} ${veh?.model || ""} (${veh?.plate_number || ""})`;

    // Insert transaction
    const { data: tx, error: txErr } = await supabase
      .from("transactions")
      .insert({
        amount: input.total_cost,
        type: "expense",
        pos_id: input.finance_pos_id,
        pos_name: pos?.name || "Pos",
        pos_icon: pos?.icon || "🔧",
        user_id: input.user_id,
        user_name: input.user_name,
        user_role: input.user_role,
        description: desc,
      })
      .select()
      .single();

    if (txErr) throw txErr;

    // Deduct pos balance
    if (pos) {
      await supabase.from("pos").update({ current_balance: pos.current_balance - input.total_cost }).eq("id", input.finance_pos_id);
    }

    // Insert service record
    const { data: newService, error: sErr } = await supabase
      .from("vehicle_services")
      .insert({
        vehicle_id: input.vehicle_id,
        service_date: input.service_date,
        service_type: input.service_type,
        cost_mode: input.cost_mode,
        total_cost: input.total_cost,
        service_description: input.service_description,
        odometer_km: input.odometer_km,
        workshop_name: input.workshop_name,
        finance_pos_id: input.finance_pos_id,
        finance_transaction_id: tx?.id,
        receipt_url: input.receipt_url,
        notes: input.notes,
      })
      .select()
      .single();

    if (sErr) throw sErr;

    // Insert items if itemized
    if (input.items && input.items.length > 0 && newService) {
      await supabase.from("vehicle_service_items").insert(
        input.items.map((item) => ({
          service_id: newService.id,
          ...item,
        }))
      );
    }

    // Update vehicle last_service_date and odometer
    const newOdometer = Math.max(veh?.last_odometer || 0, input.odometer_km);
    await supabase.from("vehicles").update({
      last_service_date: input.service_date,
      last_odometer: newOdometer,
      updated_at: new Date().toISOString(),
    }).eq("id", input.vehicle_id);

    return { success: true, serviceId: newService?.id };
  } catch (err: unknown) {
    console.error("Fallback service record error:", err);
    return { success: false, error: err };
  }
}

// ── Notifications ──

export async function getVehicleNotifications(): Promise<VehicleNotification[]> {
  const { data, error } = await supabase
    .from("vehicle_notifications")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching vehicle notifications:", error);
    return [];
  }
  return data || [];
}

export async function markNotificationAsRead(id: string): Promise<void> {
  await supabase.from("vehicle_notifications").update({ is_read: true }).eq("id", id);
}


// ── Vehicle Fuel Tracking ──

export async function getVehicleFuelLogs(vehicleId: string): Promise<VehicleFuelLog[]> {
  // 1. Coba panggil Stored Procedure SECURITY DEFINER (kebal blokir RLS)
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc("get_vehicle_fuel_logs", {
      p_vehicle_id: vehicleId,
    });
    if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
      return rpcData;
    }
  } catch (err) {
    // Abaikan jika RPC belum diinstall di Supabase
  }

  // 2. Query langsung ke tabel vehicle_fuel_logs
  const { data, error } = await supabase
    .from("vehicle_fuel_logs")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .order("log_date", { ascending: false })
    .order("odometer_km", { ascending: false });

  if (error) {
    console.error("Error fetching vehicle fuel logs:", error);
    return [];
  }
  return data || [];
}

export async function getLastFuelLog(vehicleId: string): Promise<VehicleFuelLog | null> {
  const logs = await getVehicleFuelLogs(vehicleId);
  if (logs && logs.length > 0) {
    // Urutkan berdasarkan odometer tertinggi atau tanggal terbaru
    return [...logs].sort((a, b) => b.odometer_km - a.odometer_km || new Date(b.log_date).getTime() - new Date(a.log_date).getTime())[0];
  }
  return null;
}

export async function getFuelLogsByPosId(posId: string): Promise<VehicleFuelLog[]> {
  try {
    const { data, error } = await supabase
      .from("vehicle_fuel_logs")
      .select("*")
      .eq("finance_pos_id", posId)
      .order("log_date", { ascending: false });

    if (!error && data) {
      return data;
    }
  } catch (err) {
    console.warn("Exception fetching fuel logs for pos:", err);
  }
  return [];
}

export async function recordVehicleFuelTx(
  input: RecordFuelInput
): Promise<{ data: any; error: any }> {
  // 1. Coba RPC atomic PostgreSQL terlebih dahulu
  const { data, error } = await supabase.rpc("record_vehicle_fuel_tx", {
    p_vehicle_id: input.vehicle_id,
    p_log_date: input.log_date,
    p_odometer_km: input.odometer_km,
    p_fuel_type: input.fuel_type,
    p_cost_per_liter: input.cost_per_liter || null,
    p_fuel_liters: input.fuel_liters,
    p_total_cost: input.total_cost,
    p_finance_pos_id: input.finance_pos_id,
    p_user_id: input.user_id,
    p_user_name: input.user_name,
    p_user_role: input.user_role,
    p_notes: input.notes || null,
  });

  if (!error && data?.success) {
    return { data, error: null };
  }

  // 2. Sequential Fallback jika RPC gagal atau belum terinstall
  console.warn("RPC record_vehicle_fuel_tx failed or not found, using sequential fallback:", error?.message);

  try {
    const { data: pos } = await supabase
      .from("pos")
      .select("name, icon, current_balance, keluarga_id")
      .eq("id", input.finance_pos_id)
      .single();

    const { data: veh } = await supabase
      .from("vehicles")
      .select("brand, model, plate_number, last_odometer, keluarga_id")
      .eq("id", input.vehicle_id)
      .single();

    const desc = `BBM ${input.fuel_type} — ${veh?.brand || ""} ${veh?.model || ""} (${veh?.plate_number || ""}) @ ${input.odometer_km.toLocaleString("id-ID")} km`;

    // Ambil log bensin terakhir untuk hitung delta km dan efisiensi
    const lastLog = await getLastFuelLog(input.vehicle_id);
    let distanceKm: number | null = null;
    let efficiencyKmL: number | null = null;

    if (lastLog) {
      if (input.odometer_km <= lastLog.odometer_km) {
        return {
          data: null,
          error: new Error(`Kilometer saat ini (${input.odometer_km.toLocaleString("id-ID")} km) harus lebih besar dari kilometer pengisian sebelumnya (${lastLog.odometer_km.toLocaleString("id-ID")} km)`),
        };
      }
      distanceKm = input.odometer_km - lastLog.odometer_km;
      if (input.fuel_liters > 0) {
        efficiencyKmL = Math.round((distanceKm / input.fuel_liters) * 100) / 100;
      }
    }

    const targetKeluargaId = veh?.keluarga_id || pos?.keluarga_id || null;

    // Buat transaksi keuangan di tabel transactions
    const { data: tx, error: txErr } = await supabase
      .from("transactions")
      .insert({
        amount: input.total_cost,
        type: "expense",
        pos_id: input.finance_pos_id,
        pos_name: pos?.name || "Pos",
        pos_icon: pos?.icon || "⛽",
        user_id: input.user_id,
        user_name: input.user_name,
        user_role: input.user_role,
        description: desc,
        ...(targetKeluargaId ? { keluarga_id: targetKeluargaId } : {}),
      })
      .select()
      .single();

    if (txErr) throw txErr;

    // Kurangi saldo pos keuangan
    if (pos) {
      await supabase
        .from("pos")
        .update({ current_balance: pos.current_balance - input.total_cost })
        .eq("id", input.finance_pos_id);
    }

    // Insert catatan riwayat BBM ke vehicle_fuel_logs
    const { data: fuelLog, error: fuelErr } = await supabase
      .from("vehicle_fuel_logs")
      .insert({
        vehicle_id: input.vehicle_id,
        finance_pos_id: input.finance_pos_id,
        finance_transaction_id: tx?.id,
        log_date: input.log_date,
        odometer_km: input.odometer_km,
        fuel_type: input.fuel_type,
        cost_per_liter: input.cost_per_liter || null,
        fuel_liters: input.fuel_liters,
        total_cost: input.total_cost,
        distance_km: distanceKm,
        efficiency_km_l: efficiencyKmL,
        notes: input.notes || null,
        ...(targetKeluargaId ? { keluarga_id: targetKeluargaId } : {}),
      })
      .select()
      .single();

    if (fuelErr) throw fuelErr;

    // Update last_odometer kendaraan jika lebih tinggi
    const newOdometer = Math.max(veh?.last_odometer || 0, input.odometer_km);
    await supabase
      .from("vehicles")
      .update({
        last_odometer: newOdometer,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.vehicle_id);

    return {
      data: {
        success: true,
        fuel_log_id: fuelLog?.id,
        transaction_id: tx?.id,
        distance_km: distanceKm,
        efficiency_km_l: efficiencyKmL,
      },
      error: null,
    };
  } catch (err: any) {
    console.error("Fallback fuel record error:", err);
    return { data: null, error: err };
  }
}

export async function deleteVehicleFuelTx(
  fuelLogId: string
): Promise<{ success: boolean; error: any }> {
  // 1. Coba RPC atomic PostgreSQL terlebih dahulu
  const { data, error } = await supabase.rpc("delete_vehicle_fuel_tx", {
    p_fuel_log_id: fuelLogId,
  });

  if (!error && data?.success) {
    return { success: true, error: null };
  }

  // 2. Sequential Fallback
  console.warn("RPC delete_vehicle_fuel_tx failed or not found, using sequential fallback:", error?.message);

  try {
    const { data: logRecord } = await supabase
      .from("vehicle_fuel_logs")
      .select("*")
      .eq("id", fuelLogId)
      .single();

    if (logRecord) {
      let txExists = false;
      if (logRecord.finance_transaction_id) {
        const { data: txRecord } = await supabase
          .from("transactions")
          .select("id")
          .eq("id", logRecord.finance_transaction_id)
          .maybeSingle();
        txExists = Boolean(txRecord);
      }

      // Only refund POS balance if the transaction actually existed and was not previously deleted (anti-double refund)
      if (txExists && logRecord.finance_pos_id && logRecord.total_cost > 0) {
        const { data: pos } = await supabase
          .from("pos")
          .select("current_balance")
          .eq("id", logRecord.finance_pos_id)
          .single();

        if (pos) {
          await supabase
            .from("pos")
            .update({ current_balance: pos.current_balance + logRecord.total_cost })
            .eq("id", logRecord.finance_pos_id);
        }
      }

      if (logRecord.finance_transaction_id && txExists) {
        await supabase
          .from("transactions")
          .delete()
          .eq("id", logRecord.finance_transaction_id);
      }

      await supabase.from("vehicle_fuel_logs").delete().eq("id", fuelLogId);
    }

    return { success: true, error: null };
  } catch (err: any) {
    console.error("Fallback delete fuel log error:", err);
    return { success: false, error: err };
  }
}
