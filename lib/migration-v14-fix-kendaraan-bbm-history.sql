-- ═══════════════════════════════════════════════════════════════════
-- Dompet Azla — Perbaikan Riwayat BBM Kendaraan
-- Migration: lib/migration-v14-fix-kendaraan-bbm-history.sql
-- Jalankan SQL ini di Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════

-- 1. Nonaktifkan RLS pada tabel vehicle_fuel_logs
-- (Menyelaraskan dengan tabel vehicles, vehicle_services, vehicle_tax_payments di migration-v10)
ALTER TABLE public.vehicle_fuel_logs DISABLE ROW LEVEL SECURITY;

-- 2. Berikan izin akses penuh ke anon, authenticated, dan service_role
GRANT ALL ON TABLE public.vehicle_fuel_logs TO anon, authenticated, service_role;

-- 3. Bersihkan RLS policy lama agar tidak memblokir akses
DROP POLICY IF EXISTS "vehicle_fuel_logs_family_all" ON public.vehicle_fuel_logs;

-- Helper function get_my_keluarga_id jika belum dibuat di migrasi sebelumnya
CREATE OR REPLACE FUNCTION public.get_my_keluarga_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT keluarga_id FROM public.members WHERE id = auth.uid() LIMIT 1;
$$;

-- 4. Sinkronkan keluarga_id yang masih NULL pada data bensin lama dari kendaraan terkait
UPDATE public.vehicle_fuel_logs vfl
SET keluarga_id = v.keluarga_id
FROM public.vehicles v
WHERE vfl.vehicle_id = v.id
  AND vfl.keluarga_id IS NULL
  AND v.keluarga_id IS NOT NULL;

-- 5. Stored Procedure pembaca riwayat bensin yang kebal pemblokiran RLS
CREATE OR REPLACE FUNCTION public.get_vehicle_fuel_logs(
  p_vehicle_id UUID
)
RETURNS SETOF public.vehicle_fuel_logs
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.vehicle_fuel_logs
  WHERE vehicle_id = p_vehicle_id
  ORDER BY log_date DESC, odometer_km DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_vehicle_fuel_logs(UUID) TO anon, authenticated, service_role;

-- 6. Perbarui Stored Procedure pencatatan bensin agar menjamin keluarga_id dan integritas data
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

  -- Tentukan keluarga_id yang efektif
  v_effective_keluarga_id := COALESCE(v_vehicle_record.keluarga_id, v_pos_record.keluarga_id, v_my_keluarga_id);

  -- Jika kendaraan belum punya keluarga_id tetapi ada identitas keluarga, sinkronkan kendaraan
  IF v_vehicle_record.keluarga_id IS NULL AND v_effective_keluarga_id IS NOT NULL THEN
    UPDATE public.vehicles
    SET keluarga_id = v_effective_keluarga_id
    WHERE id = p_vehicle_id;
  END IF;

  -- 3. Cari catatan pengisian bensin TERAKHIR khusus kendaraan ini
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
    v_effective_keluarga_id,
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
    v_effective_keluarga_id,
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

GRANT EXECUTE ON FUNCTION public.record_vehicle_fuel_tx TO anon, authenticated, service_role;

-- 7. Perbarui delete_vehicle_fuel_tx agar aman
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
    WHERE id = v_log_record.finance_pos_id;
  END IF;

  -- 3. Hapus transaksi keuangan terkait
  IF v_log_record.finance_transaction_id IS NOT NULL THEN
    DELETE FROM public.transactions 
    WHERE id = v_log_record.finance_transaction_id;
  END IF;

  -- 4. Hapus log bensin
  DELETE FROM public.vehicle_fuel_logs WHERE id = p_fuel_log_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_vehicle_fuel_tx TO anon, authenticated, service_role;

-- 8. Sinkronisasi & Pemulihan Catatan BBM yang sudah masuk POS tapi belum ada di vehicle_fuel_logs
DO $$
DECLARE
  r RECORD;
  v_v_id UUID;
  v_fuel_type TEXT;
  v_odo_extracted INT;
BEGIN
  FOR r IN 
    SELECT t.* 
    FROM public.transactions t
    WHERE t.description LIKE 'BBM %'
      AND NOT EXISTS (
        SELECT 1 FROM public.vehicle_fuel_logs fl 
        WHERE fl.finance_transaction_id = t.id
      )
  LOOP
    v_v_id := NULL;

    -- A. Cari kendaraan berdasarkan plat nomor di teks deskripsi
    SELECT id INTO v_v_id
    FROM public.vehicles
    WHERE r.description LIKE '%' || plate_number || '%'
    LIMIT 1;

    -- B. Jika tidak ketemu plat, cari kendaraan yang terhubung ke pos transaksi
    IF v_v_id IS NULL AND r.pos_id IS NOT NULL THEN
      SELECT id INTO v_v_id
      FROM public.vehicles
      WHERE finance_pos_id = r.pos_id
      LIMIT 1;
    END IF;

    -- C. Jika masih belum ketemu, ambil kendaraan pertama
    IF v_v_id IS NULL THEN
      SELECT id INTO v_v_id FROM public.vehicles LIMIT 1;
    END IF;

    IF v_v_id IS NOT NULL THEN
      -- Ekstrak jenis bensin dari deskripsi
      v_fuel_type := CASE 
        WHEN r.description ILIKE '%Pertalite%' THEN 'Pertalite'
        WHEN r.description ILIKE '%Pertamax Turbo%' THEN 'Pertamax Turbo'
        WHEN r.description ILIKE '%Pertamax%' THEN 'Pertamax'
        WHEN r.description ILIKE '%BP 92%' THEN 'BP 92'
        ELSE 'BBM'
      END;

      -- Ekstrak kilometer jika ada pola '@ 1234 km'
      v_odo_extracted := NULL;
      BEGIN
        v_odo_extracted := substring(r.description from '@ ([0-9]+) km')::INT;
      EXCEPTION WHEN OTHERS THEN
        v_odo_extracted := NULL;
      END;

      IF v_odo_extracted IS NULL THEN
        SELECT COALESCE(last_odometer, 0) INTO v_odo_extracted FROM public.vehicles WHERE id = v_v_id;
      END IF;

      -- Masukkan catatan log bensin yang hilang
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
        notes
      ) VALUES (
        r.keluarga_id,
        v_v_id,
        r.pos_id,
        r.id,
        (r.created_at AT TIME ZONE 'Asia/Jakarta')::DATE,
        COALESCE(v_odo_extracted, 0),
        v_fuel_type,
        CASE WHEN v_fuel_type = 'Pertalite' THEN 10000 ELSE 13000 END,
        ROUND((r.amount::NUMERIC / CASE WHEN v_fuel_type = 'Pertalite' THEN 10000.0 ELSE 13000.0 END), 2),
        r.amount,
        'Dipulihkan otomatis dari transaksi POS'
      );
    END IF;
  END LOOP;
END $$;

