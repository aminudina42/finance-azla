-- ═══════════════════════════════════════════════════════════════════
-- Dompet Azla / Catat Keluarga — Security Hardening & Data Integrity Fixes
-- Migration: lib/migration-v16-security-and-data-fixes.sql
-- Menutup Celah P0 & P1 Hasil Eksekusi QA Test Scenario
-- Jalankan SQL ini di Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────
-- 1. FIX BUG-SEC-001: Cegah Privilege Escalation pada Tabel members
-- ───────────────────────────────────────────────────────────────────
-- Trigger database untuk memastikan bahwa member biasa tidak dapat
-- mengubah perannya (role) menjadi admin, dan tidak dapat mengubah
-- keluarga_id secara sepihak melalui direct REST API PATCH.

CREATE OR REPLACE FUNCTION public.check_member_role_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Jika role diubah, pastikan pengguna yang melakukan adalah admin keluarga
  IF (OLD.role IS DISTINCT FROM NEW.role) THEN
    IF NOT public.is_keluarga_admin() THEN
      RAISE EXCEPTION 'Akses ditolak: Hanya Admin keluarga yang berhak mengubah role anggota.';
    END IF;
  END IF;

  -- Cegah pemindahan keluarga_id anggota secara sepihak
  IF (OLD.keluarga_id IS DISTINCT FROM NEW.keluarga_id) THEN
    IF NOT public.is_keluarga_admin() THEN
      RAISE EXCEPTION 'Akses ditolak: Tidak dapat memindahkan keluarga_id anggota secara langsung.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_member_role_update ON public.members;
CREATE TRIGGER trg_check_member_role_update
BEFORE UPDATE ON public.members
FOR EACH ROW
EXECUTE FUNCTION public.check_member_role_update();

-- Perbarui policy RLS members_update
DROP POLICY IF EXISTS "members_update" ON public.members;
CREATE POLICY "members_update" ON public.members
  FOR UPDATE
  USING (
    id = auth.uid() 
    OR (keluarga_id = public.get_my_keluarga_id() AND public.is_keluarga_admin())
  )
  WITH CHECK (
    id = auth.uid() 
    OR (keluarga_id = public.get_my_keluarga_id() AND public.is_keluarga_admin())
  );


-- ───────────────────────────────────────────────────────────────────
-- 2. FIX FINDING-SEC-001: Aktifkan Kembali RLS pada vehicle_fuel_logs
-- ───────────────────────────────────────────────────────────────────
-- Mengaktifkan isolasi data multi-tenant agar catatan BBM hanya dapat
-- dibaca dan ditulis oleh anggota keluarga dari kendaraan tersebut.

ALTER TABLE public.vehicle_fuel_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vehicle_fuel_logs_family_all" ON public.vehicle_fuel_logs;
CREATE POLICY "vehicle_fuel_logs_family_all" ON public.vehicle_fuel_logs
  FOR ALL
  USING (
    keluarga_id IS NOT NULL 
    AND keluarga_id = public.get_my_keluarga_id()
  )
  WITH CHECK (
    keluarga_id IS NOT NULL 
    AND keluarga_id = public.get_my_keluarga_id()
  );


-- ───────────────────────────────────────────────────────────────────
-- 3. FIX BUG-BATCH4-004: Naikkan Tipe Data Efisiensi BBM ke NUMERIC(10, 2)
-- ───────────────────────────────────────────────────────────────────
-- Mengatasi exception fatal 'numeric field overflow' jika efisiensi >= 10.000 km/L

ALTER TABLE public.vehicle_fuel_logs
ALTER COLUMN efficiency_km_l TYPE NUMERIC(10, 2);

-- Update Stored Procedure record_vehicle_fuel_tx dengan NUMERIC(10, 2)
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
  v_efficiency_km_l NUMERIC(10, 2) := NULL;
  v_my_keluarga_id UUID;
  v_effective_keluarga_id UUID;
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
    END IF;
  END IF;

  -- 1. Validasi Pos Keuangan
  SELECT * INTO v_pos_record FROM public.pos WHERE id = p_finance_pos_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pos anggaran tidak ditemukan.');
  END IF;

  -- 2. Validasi Kendaraan
  SELECT * INTO v_vehicle_record FROM public.vehicles WHERE id = p_vehicle_id AND archived_at IS NULL;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Kendaraan tidak ditemukan atau sudah diarsipkan.');
  END IF;

  -- Tentukan keluarga_id efektif (utamakan dari kendaraan atau pos)
  v_effective_keluarga_id := COALESCE(v_vehicle_record.keluarga_id, v_pos_record.keluarga_id, v_my_keluarga_id);

  -- 3. Validasi Odometer Monotonik
  IF v_vehicle_record.last_odometer > 0 AND p_odometer_km <= v_vehicle_record.last_odometer THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Kilometer saat ini (' || p_odometer_km || ' km) harus lebih besar dari kilometer terakhir (' || v_vehicle_record.last_odometer || ' km).'
    );
  END IF;

  -- 4. Hitung Jarak & Efisiensi Konsumsi BBM
  SELECT * INTO v_prev_log
  FROM public.vehicle_fuel_logs
  WHERE vehicle_id = p_vehicle_id
  ORDER BY log_date DESC, created_at DESC
  LIMIT 1;

  IF FOUND THEN
    IF p_odometer_km > v_prev_log.odometer_km THEN
      v_distance_km := p_odometer_km - v_prev_log.odometer_km;
      IF p_fuel_liters > 0 THEN
        v_efficiency_km_l := ROUND((v_distance_km::NUMERIC / p_fuel_liters), 2);
      END IF;
    END IF;
  END IF;

  -- 5. Susun Deskripsi Transaksi
  v_tx_desc := 'Isi BBM ' || v_vehicle_record.plate_number || ' (' || p_fuel_type || ' ' || p_fuel_liters || 'L)';
  IF p_notes IS NOT NULL AND TRIM(p_notes) <> '' THEN
    v_tx_desc := v_tx_desc || ' - ' || TRIM(p_notes);
  END IF;

  -- 6. Insert Transaksi Pengeluaran
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
    v_effective_keluarga_id,
    p_log_date::TIMESTAMPTZ
  ) RETURNING id INTO v_tx_id;

  -- 7. Update Saldo Pos
  UPDATE public.pos
  SET current_balance = current_balance - p_total_cost
  WHERE id = p_finance_pos_id;

  -- 8. Insert Log BBM Kendaraan
  INSERT INTO public.vehicle_fuel_logs (
    vehicle_id,
    finance_transaction_id,
    log_date,
    odometer_km,
    fuel_type,
    cost_per_liter,
    fuel_liters,
    total_cost,
    distance_km,
    efficiency_km_l,
    notes,
    keluarga_id
  ) VALUES (
    p_vehicle_id,
    v_tx_id,
    p_log_date,
    p_odometer_km,
    p_fuel_type,
    p_cost_per_liter,
    p_fuel_liters,
    p_total_cost,
    v_distance_km,
    v_efficiency_km_l,
    p_notes,
    v_effective_keluarga_id
  ) RETURNING id INTO v_fuel_log_id;

  -- 9. Update Odometer Kendaraan
  UPDATE public.vehicles
  SET 
    last_odometer = p_odometer_km,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_vehicle_id;

  RETURN jsonb_build_object(
    'success', true,
    'fuel_log_id', v_fuel_log_id,
    'transaction_id', v_tx_id,
    'distance_km', v_distance_km,
    'efficiency_km_l', v_efficiency_km_l,
    'new_odometer', p_odometer_km,
    'pos_balance_deducted', p_total_cost
  );
END;
$$;
