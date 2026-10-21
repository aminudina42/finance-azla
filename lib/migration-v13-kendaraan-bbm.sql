-- ═══════════════════════════════════════════════════════════════════
-- Dompet Azla — Modul Manajemen Kendaraan & Pelacak Konsumsi BBM
-- Migration: lib/migration-v13-kendaraan-bbm.sql
-- Jalankan SQL ini di Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════

-- 1. Tambah kolom finance_pos_id ke tabel vehicles jika belum ada
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS finance_pos_id UUID REFERENCES public.pos(id) ON DELETE SET NULL;

-- 2. Buat tabel vehicle_fuel_logs untuk mencatat riwayat pengisian bensin
CREATE TABLE IF NOT EXISTS public.vehicle_fuel_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keluarga_id UUID REFERENCES public.keluarga(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  finance_pos_id UUID REFERENCES public.pos(id) ON DELETE SET NULL,
  finance_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  odometer_km INT NOT NULL,
  fuel_type TEXT NOT NULL, -- 'Pertalite', 'Pertamax', 'Pertamax Turbo', 'BP 92', atau custom
  cost_per_liter BIGINT,
  fuel_liters NUMERIC(8, 2) NOT NULL,
  total_cost BIGINT NOT NULL,
  distance_km INT, -- km sekarang - km bensin sebelumnya (NULL jika baseline/pengisian pertama)
  efficiency_km_l NUMERIC(6, 2), -- distance_km / fuel_liters (NULL jika baseline)
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index performa untuk query riwayat bensin per kendaraan
CREATE INDEX IF NOT EXISTS idx_vehicle_fuel_logs_vehicle 
  ON public.vehicle_fuel_logs(vehicle_id, log_date DESC, odometer_km DESC);

-- Aktifkan Row Level Security (RLS) dan amankan akses multi-tenant
ALTER TABLE public.vehicle_fuel_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vehicle_fuel_logs_family_all" ON public.vehicle_fuel_logs;
CREATE POLICY "vehicle_fuel_logs_family_all" ON public.vehicle_fuel_logs
  FOR ALL
  USING (keluarga_id = public.get_my_keluarga_id())
  WITH CHECK (keluarga_id = public.get_my_keluarga_id());

-- Auto-set keluarga_id sebelum insert jika belum ditentukan
DROP TRIGGER IF EXISTS trigger_auto_set_keluarga_id ON public.vehicle_fuel_logs;
CREATE TRIGGER trigger_auto_set_keluarga_id
  BEFORE INSERT ON public.vehicle_fuel_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_set_keluarga_id();

-- ═══════════════════════════════════════════════════════════════════
-- Stored Procedures / RPC Functions (Atomic)
-- ═══════════════════════════════════════════════════════════════════

-- A. Function untuk mencatat pengisian BBM & transaksi keuangan secara atomic
CREATE OR REPLACE FUNCTION public.record_vehicle_fuel_tx(
  p_vehicle_id UUID,
  p_log_date DATE,
  p_odometer_km INT,
  p_fuel_type TEXT,
  p_cost_per_liter BIGINT,
  p_fuel_liters NUMERIC,
  p_total_cost BIGINT,
  p_finance_pos_id UUID,
  p_user_id UUID,
  p_user_name TEXT,
  p_user_role TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pos_record RECORD;
  v_vehicle_record RECORD;
  v_prev_log RECORD;
  v_tx_id UUID;
  v_fuel_log_id UUID;
  v_tx_desc TEXT;
  v_distance_km INT := NULL;
  v_efficiency_km_l NUMERIC(6, 2) := NULL;
  v_my_keluarga_id UUID;
  v_caller_id UUID;
  v_effective_user_name TEXT := p_user_name;
  v_effective_user_role TEXT := p_user_role;
  v_effective_user_id UUID := p_user_id;
BEGIN
  v_my_keluarga_id := public.get_my_keluarga_id();
  v_caller_id := auth.uid();

  -- Ambil identitas pemanggil dari auth/members jika terotentikasi
  IF v_caller_id IS NOT NULL THEN
    v_effective_user_id := v_caller_id;
    SELECT display_name, COALESCE(status_keluarga, 'suami') 
    INTO v_effective_user_name, v_effective_user_role 
    FROM public.members 
    WHERE id = v_caller_id;

    IF v_effective_user_name IS NULL THEN
      v_effective_user_name := COALESCE(p_user_name, 'User');
      v_effective_user_role := COALESCE(p_user_role, 'suami');
    END IF;
  END IF;

  -- 1. Ambil data kendaraan dan validasi kepemilikan keluarga
  SELECT * INTO v_vehicle_record FROM public.vehicles WHERE id = p_vehicle_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Kendaraan tidak ditemukan';
  END IF;

  IF v_vehicle_record.keluarga_id IS NOT NULL AND v_my_keluarga_id IS NOT NULL AND v_vehicle_record.keluarga_id <> v_my_keluarga_id THEN
    RAISE EXCEPTION 'Akses ditolak: Kendaraan bukan milik keluarga Anda';
  END IF;

  -- 2. Ambil data pos keuangan dan validasi kepemilikan keluarga
  SELECT * INTO v_pos_record FROM public.pos WHERE id = p_finance_pos_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pos Keuangan tidak ditemukan';
  END IF;

  IF v_pos_record.keluarga_id IS NOT NULL AND v_my_keluarga_id IS NOT NULL AND v_pos_record.keluarga_id <> v_my_keluarga_id THEN
    RAISE EXCEPTION 'Akses ditolak: Pos Keuangan bukan milik keluarga Anda';
  END IF;

  -- 3. Cari catatan pengisian bensin TERAKHIR khusus kendaraan ini
  -- CATATAN: Odometer servis bengkel dan info kendaraan sengaja diabaikan di sini!
  SELECT * INTO v_prev_log 
  FROM public.vehicle_fuel_logs 
  WHERE vehicle_id = p_vehicle_id
  ORDER BY odometer_km DESC, log_date DESC, created_at DESC 
  LIMIT 1;

  -- 4. Jika ada pengisian bensin sebelumnya, hitung Delta KM & Efisiensi
  IF FOUND THEN
    IF p_odometer_km <= v_prev_log.odometer_km THEN
      RAISE EXCEPTION 'Kilometer saat ini (%) harus lebih besar dari kilometer pengisian bensin sebelumnya (%)', 
        p_odometer_km, v_prev_log.odometer_km;
    END IF;

    v_distance_km := p_odometer_km - v_prev_log.odometer_km;
    IF p_fuel_liters > 0 THEN
      v_efficiency_km_l := ROUND((v_distance_km::NUMERIC / p_fuel_liters), 2);
    END IF;
  END IF;

  v_tx_desc := 'BBM ' || p_fuel_type || ' — ' || v_vehicle_record.brand || ' ' || v_vehicle_record.model || ' (' || v_vehicle_record.plate_number || ') @ ' || p_odometer_km || ' km';

  -- 5. Insert ke tabel transactions (expense)
  INSERT INTO public.transactions (
    amount,
    type,
    pos_id,
    pos_name,
    pos_icon,
    user_id,
    user_name,
    user_role,
    description,
    keluarga_id,
    created_at
  ) VALUES (
    p_total_cost,
    'expense',
    p_finance_pos_id,
    v_pos_record.name,
    v_pos_record.icon,
    v_effective_user_id,
    v_effective_user_name,
    v_effective_user_role,
    v_tx_desc,
    COALESCE(v_vehicle_record.keluarga_id, v_my_keluarga_id),
    NOW()
  ) RETURNING id INTO v_tx_id;

  -- 6. Kurangi saldo pos keuangan
  UPDATE public.pos
  SET current_balance = current_balance - p_total_cost
  WHERE id = p_finance_pos_id;

  -- 7. Insert ke tabel vehicle_fuel_logs
  INSERT INTO public.vehicle_fuel_logs (
    keluarga_id,
    vehicle_id,
    finance_pos_id,
    finance_transaction_id,
    log_date,
    odometer_km,
    fuel_type,
    cost_per_liter,
    fuel_liters,
    total_cost,
    distance_km,
    efficiency_km_l,
    notes
  ) VALUES (
    COALESCE(v_vehicle_record.keluarga_id, v_my_keluarga_id),
    p_vehicle_id,
    p_finance_pos_id,
    v_tx_id,
    p_log_date,
    p_odometer_km,
    p_fuel_type,
    p_cost_per_liter,
    p_fuel_liters,
    p_total_cost,
    v_distance_km,
    v_efficiency_km_l,
    p_notes
  ) RETURNING id INTO v_fuel_log_id;

  -- 8. Update cache last_odometer di tabel vehicles jika lebih tinggi
  UPDATE public.vehicles
  SET last_odometer = GREATEST(COALESCE(last_odometer, 0), p_odometer_km),
      updated_at = NOW()
  WHERE id = p_vehicle_id;

  RETURN jsonb_build_object(
    'success', true,
    'fuel_log_id', v_fuel_log_id,
    'transaction_id', v_tx_id,
    'distance_km', v_distance_km,
    'efficiency_km_l', v_efficiency_km_l
  );
END;
$$;

-- B. Function untuk menghapus catatan bensin & mengembalikan saldo pos secara atomic
CREATE OR REPLACE FUNCTION public.delete_vehicle_fuel_tx(
  p_fuel_log_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_record RECORD;
  v_my_keluarga_id UUID;
BEGIN
  v_my_keluarga_id := public.get_my_keluarga_id();

  -- 1. Ambil data log bensin
  SELECT * INTO v_log_record FROM public.vehicle_fuel_logs WHERE id = p_fuel_log_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Catatan bensin tidak ditemukan';
  END IF;

  -- Validasi otorisasi kepemilikan keluarga (Multi-Tenant BOLA/IDOR protection)
  IF v_log_record.keluarga_id IS NOT NULL AND v_my_keluarga_id IS NOT NULL AND v_log_record.keluarga_id <> v_my_keluarga_id THEN
    RAISE EXCEPTION 'Akses ditolak: Catatan bensin bukan milik keluarga Anda';
  END IF;

  -- 2. Kembalikan saldo pos keuangan jika ada transaksi terkait
  IF v_log_record.finance_pos_id IS NOT NULL AND v_log_record.total_cost > 0 THEN
    UPDATE public.pos
    SET current_balance = current_balance + v_log_record.total_cost
    WHERE id = v_log_record.finance_pos_id
      AND (v_my_keluarga_id IS NULL OR keluarga_id = v_my_keluarga_id);
  END IF;

  -- 3. Hapus transaksi keuangan terkait
  IF v_log_record.finance_transaction_id IS NOT NULL THEN
    DELETE FROM public.transactions 
    WHERE id = v_log_record.finance_transaction_id
      AND (v_my_keluarga_id IS NULL OR keluarga_id = v_my_keluarga_id);
  END IF;

  -- 4. Hapus log bensin
  DELETE FROM public.vehicle_fuel_logs WHERE id = p_fuel_log_id;

  RETURN jsonb_build_object('success', true);
END;
$$;
