-- ═══════════════════════════════════════════════════════════════════
-- Dompet Azla — Modul Itinerary & Manajemen Anggaran Wisata Keluarga
-- Migration: lib/migration-v16-fitur-wisata.sql
-- ═══════════════════════════════════════════════════════════════════

-- 1. Tabel Induk Rencana Perjalanan Wisata (Trips)
CREATE TABLE IF NOT EXISTS public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keluarga_id UUID NOT NULL REFERENCES public.keluarga(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  destination TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  finance_pos_id UUID REFERENCES public.pos(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  total_budget_limit BIGINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'ongoing', 'completed')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT chk_trip_dates CHECK (end_date >= start_date),
  CONSTRAINT chk_trip_budget CHECK (total_budget_limit >= 0)
);

-- Index performa untuk query daftar trip keluarga
CREATE INDEX IF NOT EXISTS idx_trips_family_dates ON public.trips(keluarga_id, start_date DESC);
CREATE INDEX IF NOT EXISTS idx_trips_pos ON public.trips(finance_pos_id);
CREATE INDEX IF NOT EXISTS idx_trips_vehicle ON public.trips(vehicle_id);

-- 2. Tabel Item Jadwal & Biaya Lapangan (Trip Items)
CREATE TABLE IF NOT EXISTS public.trip_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  keluarga_id UUID NOT NULL REFERENCES public.keluarga(id) ON DELETE CASCADE,
  day_number INT NOT NULL DEFAULT 1 CHECK (day_number >= 1),
  start_time TIME,
  end_time TIME,
  category TEXT NOT NULL CHECK (category IN ('transport', 'ticket', 'food', 'lodging', 'shopping', 'other')),
  title TEXT NOT NULL,
  location TEXT,
  booking_code TEXT,
  notes TEXT,
  estimated_cost BIGINT NOT NULL DEFAULT 0 CHECK (estimated_cost >= 0),
  actual_cost BIGINT DEFAULT NULL CHECK (actual_cost IS NULL OR actual_cost >= 0),
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  fuel_log_id UUID REFERENCES public.vehicle_fuel_logs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index performa untuk timeline acara per hari
CREATE INDEX IF NOT EXISTS idx_trip_items_order ON public.trip_items(trip_id, day_number, start_time);
CREATE INDEX IF NOT EXISTS idx_trip_items_tx ON public.trip_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_trip_items_fuel ON public.trip_items(fuel_log_id);
ALTER TABLE public.trip_items ADD COLUMN IF NOT EXISTS end_time TIME;

-- 3. Tabel Checklist Bawaan Kolaboratif (Trip Checklists)
CREATE TABLE IF NOT EXISTS public.trip_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  keluarga_id UUID NOT NULL REFERENCES public.keluarga(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  assigned_to TEXT NOT NULL DEFAULT 'semua' CHECK (assigned_to IN ('suami', 'istri', 'anak', 'semua')),
  is_checked BOOLEAN NOT NULL DEFAULT FALSE,
  checked_by UUID REFERENCES public.members(id) ON DELETE SET NULL,
  checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index performa untuk checklist filter peran
CREATE INDEX IF NOT EXISTS idx_trip_checklists_trip ON public.trip_checklists(trip_id, assigned_to);

-- ═══════════════════════════════════════════════════════════════════
-- Row Level Security (RLS) Multi-Tenant
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_checklists ENABLE ROW LEVEL SECURITY;

-- Policy Trips
DROP POLICY IF EXISTS "trips_family_policy" ON public.trips;
CREATE POLICY "trips_family_policy" ON public.trips
  FOR ALL USING (keluarga_id = public.get_my_keluarga_id())
  WITH CHECK (keluarga_id = public.get_my_keluarga_id());

-- Policy Trip Items
DROP POLICY IF EXISTS "trip_items_family_policy" ON public.trip_items;
CREATE POLICY "trip_items_family_policy" ON public.trip_items
  FOR ALL USING (keluarga_id = public.get_my_keluarga_id())
  WITH CHECK (keluarga_id = public.get_my_keluarga_id());

-- Policy Trip Checklists
DROP POLICY IF EXISTS "trip_checklists_family_policy" ON public.trip_checklists;
CREATE POLICY "trip_checklists_family_policy" ON public.trip_checklists
  FOR ALL USING (keluarga_id = public.get_my_keluarga_id())
  WITH CHECK (keluarga_id = public.get_my_keluarga_id());

-- Berikan izin akses penuh ke anon, authenticated, dan service_role
GRANT ALL ON TABLE public.trips TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.trip_items TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.trip_checklists TO anon, authenticated, service_role;

-- ═══════════════════════════════════════════════════════════════════
-- Stored Procedures / RPC Functions (Atomic & ACID Compliant)
-- ═══════════════════════════════════════════════════════════════════

-- A. Prosedur Eksekusi Pengeluaran Aktual Wisata (One-Tap Expense)
CREATE OR REPLACE FUNCTION public.record_trip_expense_tx(
  p_trip_item_id UUID,
  p_actual_cost BIGINT,
  p_user_id UUID,
  p_user_name TEXT,
  p_user_role TEXT,
  p_odometer_km INT DEFAULT NULL,
  p_fuel_liters NUMERIC DEFAULT NULL,
  p_saku_id UUID DEFAULT NULL,
  p_saku_withdraw_amount BIGINT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
  v_trip RECORD;
  v_pos RECORD;
  v_saku RECORD;
  v_tx_id UUID := NULL;
  v_fuel_log_id UUID := NULL;
  v_my_keluarga_id UUID;
  v_prev_log RECORD;
  v_distance_km INT := NULL;
  v_efficiency_km_l NUMERIC(6, 2) := NULL;
  v_pos_deduction BIGINT;
  v_effective_saku_withdraw BIGINT := COALESCE(p_saku_withdraw_amount, 0);
BEGIN
  v_my_keluarga_id := public.get_my_keluarga_id();

  -- 1. Proteksi RBAC: Anak dilarang mencatat transaksi keuangan langsung
  IF LOWER(p_user_role) = 'anak' THEN
    RAISE EXCEPTION 'Akses ditolak: Anggota dengan peran Anak tidak diizinkan mencatat pengeluaran keuangan';
  END IF;

  -- 2. Ambil dan validasi item wisata
  SELECT * INTO v_item FROM public.trip_items WHERE id = p_trip_item_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item wisata tidak ditemukan';
  END IF;

  IF v_my_keluarga_id IS NOT NULL AND v_item.keluarga_id <> v_my_keluarga_id THEN
    RAISE EXCEPTION 'Akses ditolak: Item wisata bukan milik keluarga Anda';
  END IF;

  -- 3. Ambil data perjalanan induk
  SELECT * INTO v_trip FROM public.trips WHERE id = v_item.trip_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perjalanan wisata induk tidak ditemukan';
  END IF;

  -- 4. Mutasi Saldo Pos & Saku (Shortfall Protection)
  IF v_trip.finance_pos_id IS NOT NULL AND p_actual_cost > 0 THEN
    SELECT * INTO v_pos FROM public.pos WHERE id = v_trip.finance_pos_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Pos keuangan terhubung tidak ditemukan';
    END IF;

    -- Hitung alokasi pemotongan pos vs saku
    IF v_effective_saku_withdraw > 0 AND p_saku_id IS NOT NULL THEN
      SELECT * INTO v_saku FROM public.children WHERE id = p_saku_id;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Saku anak terhubung tidak ditemukan';
      END IF;

      -- Potong saku anak
      UPDATE public.children 
      SET balance = balance - v_effective_saku_withdraw 
      WHERE id = p_saku_id;

      -- Catat riwayat di child_transactions
      INSERT INTO public.child_transactions (
        keluarga_id, child_id, type, amount, description, icon
      ) VALUES (
        v_item.keluarga_id, p_saku_id, 'withdraw_for_pos',
        v_effective_saku_withdraw, 'Pinjam untuk Wisata: ' || v_item.title, '🏧'
      );

      -- Pos hanya dipotong sisanya
      v_pos_deduction := GREATEST(0, p_actual_cost - v_effective_saku_withdraw);
    ELSE
      v_pos_deduction := p_actual_cost;
    END IF;

    -- Potong saldo pos keuangan
    UPDATE public.pos 
    SET current_balance = current_balance - v_pos_deduction 
    WHERE id = v_trip.finance_pos_id;

    -- Catat transaksi belanja di tabel transactions
    INSERT INTO public.transactions (
      keluarga_id, pos_id, amount, type, user_id, user_name, user_role,
      description, saku_id, saku_withdraw_amount
    ) VALUES (
      v_item.keluarga_id, v_trip.finance_pos_id, p_actual_cost, 'expense',
      p_user_id, p_user_name, p_user_role::public.status_keluarga,
      v_trip.title || ' — ' || v_item.title,
      p_saku_id, v_effective_saku_withdraw
    ) RETURNING id INTO v_tx_id;
  END IF;

  -- 5. Jika kategori Transport & Odometer diinput -> Catat BBM Atomik
  IF v_item.category = 'transport' AND v_trip.vehicle_id IS NOT NULL AND p_odometer_km IS NOT NULL THEN
    -- Cari log BBM terakhir untuk menghitung efisiensi riil
    SELECT * INTO v_prev_log 
    FROM public.vehicle_fuel_logs 
    WHERE vehicle_id = v_trip.vehicle_id
    ORDER BY odometer_km DESC, log_date DESC, created_at DESC 
    LIMIT 1;

    IF FOUND THEN
      IF p_odometer_km <= v_prev_log.odometer_km THEN
        RAISE EXCEPTION 'Kilometer saat ini (%) harus lebih besar dari kilometer terakhir (%)', 
          p_odometer_km, v_prev_log.odometer_km;
      END IF;

      v_distance_km := p_odometer_km - v_prev_log.odometer_km;
      IF p_fuel_liters IS NOT NULL AND p_fuel_liters > 0 THEN
        v_efficiency_km_l := ROUND((v_distance_km::NUMERIC / p_fuel_liters), 2);
      END IF;
    END IF;

    -- Masukkan log BBM kendaraan
    INSERT INTO public.vehicle_fuel_logs (
      keluarga_id, vehicle_id, finance_pos_id, finance_transaction_id,
      log_date, odometer_km, fuel_type, fuel_liters, total_cost,
      distance_km, efficiency_km_l, notes
    ) VALUES (
      v_item.keluarga_id, v_trip.vehicle_id, v_trip.finance_pos_id, v_tx_id,
      CURRENT_DATE, p_odometer_km, 'BBM Wisata', COALESCE(p_fuel_liters, 0), p_actual_cost,
      v_distance_km, v_efficiency_km_l, 'Road Trip: ' || v_trip.title
    ) RETURNING id INTO v_fuel_log_id;

    -- Update last_odometer kendaraan
    UPDATE public.vehicles 
    SET last_odometer = GREATEST(last_odometer, p_odometer_km), updated_at = now() 
    WHERE id = v_trip.vehicle_id;
  END IF;

  -- 6. Update status item jadwal wisata
  UPDATE public.trip_items
  SET actual_cost = p_actual_cost,
      is_completed = TRUE,
      transaction_id = v_tx_id,
      fuel_log_id = v_fuel_log_id,
      updated_at = now()
  WHERE id = p_trip_item_id;

  RETURN jsonb_build_object(
    'success', true,
    'trip_item_id', p_trip_item_id,
    'transaction_id', v_tx_id,
    'fuel_log_id', v_fuel_log_id,
    'pos_deducted', v_pos_deduction,
    'saku_deducted', v_effective_saku_withdraw
  );
END;
$$;

-- B. Prosedur Rollback / Batalkan Pengeluaran Wisata
CREATE OR REPLACE FUNCTION public.rollback_trip_expense_tx(
  p_trip_item_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
  v_trip RECORD;
  v_tx RECORD;
  v_fuel_log RECORD;
  v_pos_restore BIGINT;
  v_prev_odometer INT := 0;
BEGIN
  -- 1. Ambil data item
  SELECT * INTO v_item FROM public.trip_items WHERE id = p_trip_item_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Item wisata tidak ditemukan'; END IF;
  IF NOT v_item.is_completed THEN RAISE EXCEPTION 'Item wisata belum berstatus selesai'; END IF;

  -- 2. Ambil data trip
  SELECT * INTO v_trip FROM public.trips WHERE id = v_item.trip_id;

  -- 3. Kembalikan saldo Pos & Saku jika ada transaksi
  IF v_item.transaction_id IS NOT NULL THEN
    SELECT * INTO v_tx FROM public.transactions WHERE id = v_item.transaction_id;
    IF FOUND THEN
      -- Kembalikan saku anak jika ada peminjaman
      IF v_tx.saku_id IS NOT NULL AND v_tx.saku_withdraw_amount > 0 THEN
        UPDATE public.children 
        SET balance = balance + v_tx.saku_withdraw_amount 
        WHERE id = v_tx.saku_id;

        -- Catat mutasi pengembalian di child_transactions
        INSERT INTO public.child_transactions (
          keluarga_id, child_id, type, amount, description, icon
        ) VALUES (
          v_item.keluarga_id, v_tx.saku_id, 'return_to_saku',
          v_tx.saku_withdraw_amount, 'Batal Wisata: ' || v_item.title, '↩️'
        );

        v_pos_restore := GREATEST(0, v_tx.amount - v_tx.saku_withdraw_amount);
      ELSE
        v_pos_restore := v_tx.amount;
      END IF;

      -- Kembalikan saldo Pos
      UPDATE public.pos 
      SET current_balance = current_balance + v_pos_restore 
      WHERE id = v_tx.pos_id;

      -- Hapus transaksi dari tabel transactions
      DELETE FROM public.transactions WHERE id = v_item.transaction_id;
    END IF;
  END IF;

  -- 4. Hapus log BBM & Pulihkan Odometer jika ada
  IF v_item.fuel_log_id IS NOT NULL THEN
    DELETE FROM public.vehicle_fuel_logs WHERE id = v_item.fuel_log_id;

    -- Cari odometer tertinggi berikutnya dari log yang tersisa
    IF v_trip.vehicle_id IS NOT NULL THEN
      SELECT COALESCE(MAX(odometer_km), 0) INTO v_prev_odometer 
      FROM public.vehicle_fuel_logs 
      WHERE vehicle_id = v_trip.vehicle_id;

      UPDATE public.vehicles 
      SET last_odometer = v_prev_odometer, updated_at = now() 
      WHERE id = v_trip.vehicle_id;
    END IF;
  END IF;

  -- 5. Reset status item jadwal
  UPDATE public.trip_items
  SET actual_cost = NULL,
      is_completed = FALSE,
      transaction_id = NULL,
      fuel_log_id = NULL,
      updated_at = now()
  WHERE id = p_trip_item_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Pengeluaran wisata berhasil dibatalkan dan saldo dipulihkan'
  );
END;
$$;

