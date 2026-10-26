export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ═══ Database Row Types ═══

export interface Keluarga {
  id: string;
  nama_keluarga: string;
  invite_code: string;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export type StatusKeluarga = "suami" | "istri" | "anak";

export interface Member {
  id: string;
  keluarga_id: string;
  display_name: string;
  role: "admin" | "member";
  status_keluarga?: StatusKeluarga | null;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  name: string;
  role: StatusKeluarga;
}

export interface Pos {
  id: string;
  keluarga_id?: string;
  name: string;
  icon: string;
  sub: string;
  monthly_target: number;
  current_balance: number;
  order_index: number;
  is_goal: boolean;
  goal_target: number;
}

export interface PosConfigItem {
  id?: string;
  name: string;
  icon?: string;
  monthly_target: number;
  is_goal?: boolean;
}

export interface Transaction {
  id: string;
  keluarga_id?: string;
  amount: number;
  type: "income" | "expense";
  pos_id: string;
  pos_name: string;
  pos_icon: string;
  user_id: string;
  user_name: string;
  user_role: StatusKeluarga;
  description: string;
  created_at: string;
  // Saku borrow fields
  saku_id?: string | null;
  saku_withdraw_amount?: number | null;
}

export interface Cycle {
  id: string;
  keluarga_id?: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  label: string;
  created_at?: string;
}

export interface Child {
  id: string;
  keluarga_id?: string;
  name: string;
  icon: string;
  balance: number;
  // Saku v2 fields
  type: "standalone" | "linked";
  linked_pos_id?: string | null;
}

export type SakuTxType = "in" | "out" | "cycle_surplus" | "cycle_deficit" | "withdraw_for_pos" | "return_to_saku";

export interface ChildTransaction {
  id: string;
  keluarga_id?: string;
  child_id: string;
  type: SakuTxType;
  amount: number;
  description: string;
  icon: string;
  created_at: string;
  // Saku v2 reference fields
  ref_cycle_id?: string | null;
  ref_transaction_id?: string | null;
}

export interface CyclePosHistory {
  id: string;
  keluarga_id?: string;
  cycle_id: string;
  pos_id: string;
  monthly_target: number;
  goal_target: number;
  created_at: string;
}

export interface Debt {
  id: string;
  keluarga_id?: string;
  name: string;
  icon: string;
  total_amount: number;
  remaining_amount: number;
  monthly_payment: number;
  due_date: number;
  principal_amount?: number;
  tenor_months?: number;
  paid_months?: number;
  creditor_name?: string;
  account_number?: string;
  notes?: string;
  created_at: string;
}

export interface DebtPayment {
  id: string;
  keluarga_id?: string;
  debt_id: string;
  pos_id?: string | null;
  pos_name?: string | null;
  transaction_id?: string | null;
  payment_number: number;
  amount: number;
  payment_date: string;
  notes?: string | null;
  created_by?: string | null;
  user_name?: string | null;
  created_at: string;
}

export interface Store {
  id: string;
  keluarga_id?: string;
  user_id: string;
  name: string;
  address: string;
  logo_url: string | null;
  created_at: string;
  qris_active?: boolean;
  qris_data?: string;
  qris_name?: string;
}

export interface Receipt {
  id: string;
  keluarga_id?: string;
  store_id: string;
  user_id: string;
  receipt_number: string;
  total: number;
  total_cost?: number;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReceiptItem {
  id: string;
  receipt_id: string;
  item_name: string;
  quantity: number;
  price: number;
  cost_price?: number;
  discount: number;
  price_after_discount: number;
  sort_order: number;
}

export interface Vehicle {
  id: string;
  keluarga_id?: string;
  user_id?: string | null;
  plate_number: string;
  vehicle_type: "Motor" | "Mobil";
  brand: string;
  model: string;
  next_tax_due_date: string;
  last_service_date?: string | null;
  last_odometer: number;
  service_reminder_interval_months: 1 | 2;
  service_reminder_enabled: boolean;
  tax_reminder_enabled: boolean;
  finance_pos_id?: string | null;
  notes?: string | null;
  archived_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface VehicleTaxPayment {
  id: string;
  vehicle_id: string;
  tax_period: string;
  payment_date: string;
  next_due_date: string;
  amount: number;
  finance_pos_id?: string | null;
  finance_transaction_id?: string | null;
  receipt_url?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface VehicleService {
  id: string;
  vehicle_id: string;
  service_date: string;
  service_type: "Servis Ringan" | "Servis Besar";
  cost_mode: "total" | "itemized";
  total_cost: number;
  service_description: string;
  odometer_km: number;
  workshop_name?: string | null;
  finance_pos_id?: string | null;
  finance_transaction_id?: string | null;
  receipt_url?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface VehicleServiceItem {
  id: string;
  service_id: string;
  item_name: string;
  item_category: "Jasa" | "Part";
  quantity: number;
  unit_price: number;
  subtotal: number;
  created_at: string;
}


export interface VehicleFuelLog {
  id: string;
  keluarga_id?: string;
  vehicle_id: string;
  finance_pos_id?: string | null;
  finance_transaction_id?: string | null;
  log_date: string;
  odometer_km: number;
  fuel_type: string;
  cost_per_liter?: number | null;
  fuel_liters: number;
  total_cost: number;
  distance_km?: number | null;
  efficiency_km_l?: number | null;
  notes?: string | null;
  created_at: string;
}

export interface VehicleNotification {
  id: string;
  vehicle_id: string;
  notification_type: "service_reminder" | "tax_reminder" | "tax_success" | "service_recorded";
  title: string;
  message: string;
  reference_id?: string | null;
  scheduled_at: string;
  sent_at?: string | null;
  is_read: boolean;
  status: "pending" | "sent" | "cancelled" | "failed";
  created_at: string;
}

// ═══ Modul Kesehatan Keluarga ═══

export type HealthRelationRole = "suami" | "istri" | "anak" | "orang_tua" | "lainnya";
export type HealthGender = "male" | "female";
export type HealthBloodType = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-" | "unknown";

export interface HealthFamilyMember {
  id: string;
  keluarga_id: string;
  auth_member_id?: string | null;
  name: string;
  relation_role: HealthRelationRole;
  gender: HealthGender;
  birth_date: string;
  is_premature?: boolean;
  gestational_weeks?: number | null;
  blood_type: HealthBloodType;
  allergies: string[];
  chronic_conditions: string[];
  bpjs_number?: string | null;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface HealthGrowthLog {
  id: string;
  keluarga_id: string;
  family_member_id: string;
  measured_at: string;
  weight_kg: number;
  height_cm: number;
  head_circ_cm?: number | null;
  arm_circ_cm?: number | null;
  measurement_position: "recumbent" | "standing";
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
}

export type HealthVitalType = "blood_pressure" | "blood_sugar" | "cholesterol" | "uric_acid" | "body_temp";

export interface BloodPressureData {
  systolic: number;
  diastolic: number;
  pulse?: number;
}

export interface BloodSugarData {
  value: number;
  category: "fasting" | "postprandial" | "random" | "hba1c";
}

export interface CholesterolData {
  total: number;
  ldl?: number;
  hdl?: number;
  triglycerides?: number;
}

export interface UricAcidData {
  value: number;
}

export interface BodyTempData {
  celsius: number;
}

export type HealthVitalData =
  | BloodPressureData
  | BloodSugarData
  | CholesterolData
  | UricAcidData
  | BodyTempData;

export interface HealthVitalLog {
  id: string;
  keluarga_id: string;
  family_member_id: string;
  measured_at: string;
  vital_type: HealthVitalType;
  data: HealthVitalData;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
}

export interface HealthMedicalRecord {
  id: string;
  keluarga_id: string;
  family_member_id: string;
  illness_name: string;
  diagnosis?: string | null;
  symptoms?: string | null;
  start_date: string;
  end_date?: string | null;
  is_cured: boolean;
  doctor_name?: string | null;
  clinic_hospital?: string | null;
  payment_method: "pribadi" | "bpjs" | "asuransi_kantor" | "asuransi_swasta";
  cost_amount: number;
  transaction_id?: string | null;
  attachment_urls: string[];
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  // Joined field
  medications?: HealthMedication[];
}

export interface HealthMedication {
  id: string;
  keluarga_id: string;
  medical_record_id?: string | null;
  family_member_id: string;
  medicine_name: string;
  is_antibiotic: boolean;
  dosage: string;
  frequency: string;
  timing_rule?: string | null;
  start_date: string;
  end_date?: string | null;
  is_active: boolean;
  stopped_reason?: "finished" | "cured" | "side_effects" | "doctor_order" | null;
  notes?: string | null;
  created_at: string;
}

// ═══ Wisata / Itinerary Types ═══

export type TripStatus = "planning" | "ongoing" | "completed";

export type TripCategory =
  | "transport"
  | "ticket"
  | "food"
  | "lodging"
  | "shopping"
  | "other";

export type TripChecklistAssignee = "suami" | "istri" | "anak" | "semua";

export interface Trip {
  id: string;
  keluarga_id: string;
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  finance_pos_id?: string | null;
  vehicle_id?: string | null;
  total_budget_limit: number;
  status: TripStatus;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TripItem {
  id: string;
  trip_id: string;
  keluarga_id: string;
  day_number: number;
  start_time?: string | null;
  category: TripCategory;
  title: string;
  location?: string | null;
  booking_code?: string | null;
  notes?: string | null;
  estimated_cost: number;
  actual_cost?: number | null;
  is_completed: boolean;
  transaction_id?: string | null;
  fuel_log_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TripChecklist {
  id: string;
  trip_id: string;
  keluarga_id: string;
  item_name: string;
  assigned_to: TripChecklistAssignee;
  is_checked: boolean;
  checked_by?: string | null;
  checked_at?: string | null;
  created_at: string;
}

// ═══ Superadmin & Global Settings ═══

export interface SuperadminRow {
  user_id: string;
  created_at: string;
}

export interface DeveloperBank {
  enabled: boolean;
  name: string;
  account: string;
  holder: string;
}

export interface DeveloperSettings {
  show_qris: boolean;
  qris_url: string;
  qris_name: string;
  banks: [DeveloperBank, DeveloperBank, DeveloperBank];
  message: string;
}

export interface MenuIconOverrides {
  [menuId: string]: string; // menuId -> custom iconSrc URL or empty string
}

// ═══ Supabase Database Schema ═══

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, "id"> & { id?: string };
        Update: Partial<User>;
      };
      pos: {
        Row: Pos;
        Insert: Omit<Pos, "id" | "is_goal" | "goal_target"> & { id?: string; is_goal?: boolean; goal_target?: number };
        Update: Partial<Pos>;
      };
      transactions: {
        Row: Transaction;
        Insert: Omit<Transaction, "id" | "created_at" | "type"> & {
          id?: string;
          created_at?: string;
          type?: "income" | "expense";
        };
        Update: Partial<Transaction>;
      };
      cycles: {
        Row: Cycle;
        Insert: Omit<Cycle, "id"> & { id?: string };
        Update: Partial<Cycle>;
      };
      children: {
        Row: Child;
        Insert: Omit<Child, "id"> & { id?: string; type?: "standalone" | "linked"; linked_pos_id?: string | null };
        Update: Partial<Child>;
      };
      child_transactions: {
        Row: ChildTransaction;
        Insert: Omit<ChildTransaction, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
          ref_cycle_id?: string | null;
          ref_transaction_id?: string | null;
        };
        Update: Partial<ChildTransaction>;
      };
      debts: {
        Row: Debt;
        Insert: Omit<Debt, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Debt>;
      };
      debt_payments: {
        Row: DebtPayment;
        Insert: Omit<DebtPayment, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<DebtPayment>;
      };
      cycle_pos_history: {
        Row: CyclePosHistory;
        Insert: Omit<CyclePosHistory, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<CyclePosHistory>;
      };
      stores: {
        Row: Store;
        Insert: Omit<Store, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
          qris_active?: boolean;
          qris_data?: string;
          qris_name?: string;
        };
        Update: Partial<Store>;
      };
      receipts: {
        Row: Receipt;
        Insert: Omit<Receipt, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Receipt>;
      };
      receipt_items: {
        Row: ReceiptItem;
        Insert: Omit<ReceiptItem, "id" | "price_after_discount"> & {
          id?: string;
          price_after_discount?: number;
        };
        Update: Partial<ReceiptItem>;
      };
      vehicles: {
        Row: Vehicle;
        Insert: Omit<Vehicle, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Vehicle>;
      };
      vehicle_tax_payments: {
        Row: VehicleTaxPayment;
        Insert: Omit<VehicleTaxPayment, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<VehicleTaxPayment>;
      };
      vehicle_services: {
        Row: VehicleService;
        Insert: Omit<VehicleService, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<VehicleService>;
      };
      vehicle_service_items: {
        Row: VehicleServiceItem;
        Insert: Omit<VehicleServiceItem, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<VehicleServiceItem>;
      };
      vehicle_fuel_logs: {
        Row: VehicleFuelLog;
        Insert: Omit<VehicleFuelLog, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<VehicleFuelLog>;
      };
      vehicle_notifications: {
        Row: VehicleNotification;
        Insert: Omit<VehicleNotification, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<VehicleNotification>;
      };
      trips: {
        Row: Trip;
        Insert: Omit<Trip, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Trip>;
      };
      trip_items: {
        Row: TripItem;
        Insert: Omit<TripItem, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<TripItem>;
      };
      trip_checklists: {
        Row: TripChecklist;
        Insert: Omit<TripChecklist, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<TripChecklist>;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
