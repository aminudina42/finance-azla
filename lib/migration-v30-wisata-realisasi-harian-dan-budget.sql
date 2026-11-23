-- ═══════════════════════════════════════════════════════════════════
-- Dompet Azla — Realisasi Anggaran Harian & Independensi Event Wisata
-- Migration: lib/migration-v30-wisata-realisasi-harian-dan-budget.sql
-- ═══════════════════════════════════════════════════════════════════

-- 1. Buat Tabel Baru: trip_expenses (Pencatatan Harian Mandiri)
CREATE TABLE IF NOT EXISTS public.trip_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  keluarga_id UUID NOT NULL REFERENCES public.keluarga(id) ON DELETE CASCADE,
  day_number INT NOT NULL CHECK (day_number >= 1),
  category TEXT NOT NULL CHECK (category IN ('transport', 'ticket', 'food', 'lodging', 'shopping', 'other')),
  title TEXT NOT NULL,
  amount BIGINT NOT NULL CHECK (amount >= 0),
  notes TEXT,
  expense_date DATE DEFAULT CURRENT_DATE,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  odometer_km INT,
  fuel_liters NUMERIC(6,2),
  fuel_log_id UUID REFERENCES public.vehicle_fuel_logs(id) ON DELETE SET NULL,
  trip_item_id UUID REFERENCES public.trip_items(id) ON DELETE SET NULL,
  created_by UUID,
  user_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indeks Performa
CREATE INDEX IF NOT EXISTS idx_trip_expenses_trip_day ON public.trip_expenses(trip_id, day_number);
CREATE INDEX IF NOT EXISTS idx_trip_expenses_keluarga ON public.trip_expenses(keluarga_id);

-- 2. Row Level Security (RLS) Multi-Tenant
ALTER TABLE public.trip_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trip_expenses_select_family" ON public.trip_expenses;
CREATE POLICY "trip_expenses_select_family" ON public.trip_expenses
  FOR SELECT TO authenticated
  USING (keluarga_id = public.get_my_keluarga_id());

DROP POLICY IF EXISTS "trip_expenses_insert_family" ON public.trip_expenses;
CREATE POLICY "trip_expenses_insert_family" ON public.trip_expenses
  FOR INSERT TO authenticated
  WITH CHECK (keluarga_id = public.get_my_keluarga_id());

DROP POLICY IF EXISTS "trip_expenses_update_family" ON public.trip_expenses;
CREATE POLICY "trip_expenses_update_family" ON public.trip_expenses
  FOR UPDATE TO authenticated
  USING (keluarga_id = public.get_my_keluarga_id());

DROP POLICY IF EXISTS "trip_expenses_delete_family" ON public.trip_expenses;
CREATE POLICY "trip_expenses_delete_family" ON public.trip_expenses
  FOR DELETE TO authenticated
  USING (keluarga_id = public.get_my_keluarga_id());

-- 3. Data Migration: Pindahkan data pengeluaran lama dari trip_items ke trip_expenses
INSERT INTO public.trip_expenses (
  trip_id,
  keluarga_id,
  day_number,
  category,
  title,
  amount,
  notes,
  trip_item_id,
  created_at,
  updated_at
)
SELECT 
  ti.trip_id,
  ti.keluarga_id,
  ti.day_number,
  ti.category,
  ti.title,
  ti.actual_cost,
  ti.notes,
  ti.id,
  ti.created_at,
  ti.updated_at
FROM public.trip_items ti
WHERE ti.is_completed = true 
  AND ti.actual_cost IS NOT NULL 
  AND ti.actual_cost > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.trip_expenses te WHERE te.trip_item_id = ti.id
  );

-- 4. Stored Procedure: record_trip_daily_expense_tx
-- Mencatat pengeluaran wisata harian TANPA memotong POS keuangan (murni standalone),
-- dengan dukungan integrasi fuel_log & odometer kendaraan keluarga jika kategori bensin diisi.
CREATE OR REPLACE FUNCTION public.record_trip_daily_expense_tx(
  p_trip_id UUID,
  p_day_number INT,
  p_category TEXT,
  p_title TEXT,
  p_amount BIGINT,
  p_notes TEXT DEFAULT NULL,
  p_vehicle_id UUID DEFAULT NULL,
  p_odometer_km INT DEFAULT NULL,
  p_fuel_liters NUMERIC DEFAULT NULL,
  p_trip_item_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_user_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_keluarga_id UUID;
  v_exp_id UUID;
  v_fuel_log_id UUID := NULL;
  v_vehicle RECORD;
BEGIN
  v_keluarga_id := public.get_my_keluarga_id();
  IF v_keluarga_id IS NULL THEN
    SELECT keluarga_id INTO v_keluarga_id FROM public.trips WHERE id = p_trip_id;
  END IF;

  IF v_keluarga_id IS NULL THEN
    RAISE EXCEPTION 'Akses ditolak: Data keluarga tidak ditemukan atau tidak valid';
  END IF;

  -- 1. Jika kategori Transport & ada pengisian data BBM Kendaraan
  IF p_category = 'transport' AND p_vehicle_id IS NOT NULL AND p_odometer_km IS NOT NULL AND p_fuel_liters IS NOT NULL THEN
    SELECT * INTO v_vehicle FROM public.vehicles WHERE id = p_vehicle_id;
    IF FOUND THEN
      INSERT INTO public.vehicle_fuel_logs (
        keluarga_id, vehicle_id, log_date, odometer_km, fuel_type, fuel_liters, total_cost, notes
      ) VALUES (
        v_keluarga_id, p_vehicle_id, CURRENT_DATE, p_odometer_km, 'BBM Wisata', p_fuel_liters, p_amount, 'Wisata: ' || p_title
      ) RETURNING id INTO v_fuel_log_id;

      -- Update odometer terakhir kendaraan jika lebih besar
      UPDATE public.vehicles
      SET last_odometer = GREATEST(COALESCE(last_odometer, 0), p_odometer_km),
          updated_at = NOW()
      WHERE id = p_vehicle_id;
    END IF;
  END IF;

  -- 2. Insert ke trip_expenses (Murni Standalone Tanpa Memotong POS)
  INSERT INTO public.trip_expenses (
    trip_id, keluarga_id, day_number, category, title, amount, notes,
    vehicle_id, odometer_km, fuel_liters, fuel_log_id, trip_item_id,
    created_by, user_name
  ) VALUES (
    p_trip_id, v_keluarga_id, p_day_number, p_category, p_title, p_amount, p_notes,
    p_vehicle_id, p_odometer_km, p_fuel_liters, v_fuel_log_id, p_trip_item_id,
    p_user_id, p_user_name
  ) RETURNING id INTO v_exp_id;

  -- 3. Jika ditautkan dari trip_item, tandai item selesai & simpan actual_cost
  IF p_trip_item_id IS NOT NULL THEN
    UPDATE public.trip_items
    SET is_completed = true,
        actual_cost = p_amount,
        updated_at = NOW()
    WHERE id = p_trip_item_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'expense_id', v_exp_id,
    'fuel_log_id', v_fuel_log_id
  );
END;
$$;

-- Berikan izin eksekusi ke authenticated dan role lainnya
GRANT EXECUTE ON FUNCTION public.record_trip_daily_expense_tx TO anon, authenticated, service_role;
