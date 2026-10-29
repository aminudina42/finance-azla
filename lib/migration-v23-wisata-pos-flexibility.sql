-- ═══════════════════════════════════════════════════════════════════
-- Dompet Azla — Modul Wisata: Fleksibilitas Pemilihan Pos Pengeluaran
-- Migration: lib/migration-v23-wisata-pos-flexibility.sql
-- ═══════════════════════════════════════════════════════════════════

-- 1. Drop signature lama jika ada agar tidak terjadi ambiguitas parameter overload
DROP FUNCTION IF EXISTS public.record_trip_expense_tx(
  UUID, BIGINT, UUID, TEXT, TEXT, INT, NUMERIC, UUID, BIGINT
);

-- 2. Buat atau perbarui Stored Procedure record_trip_expense_tx dengan parameter opsional p_pos_id
CREATE OR REPLACE FUNCTION public.record_trip_expense_tx(
  p_trip_item_id UUID,
  p_actual_cost BIGINT,
  p_user_id UUID,
  p_user_name TEXT,
  p_user_role TEXT,
  p_odometer_km INT DEFAULT NULL,
  p_fuel_liters NUMERIC DEFAULT NULL,
  p_saku_id UUID DEFAULT NULL,
  p_saku_withdraw_amount BIGINT DEFAULT 0,
  p_pos_id UUID DEFAULT NULL
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
  v_effective_pos_id UUID;
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

  -- 4. Tentukan Pos Keuangan Efektif (Prioritas: p_pos_id dari modal belanja -> fallback ke pos bawaan trip)
  v_effective_pos_id := COALESCE(p_pos_id, v_trip.finance_pos_id);

  -- 5. Mutasi Saldo Pos & Saku jika ada biaya riil
  IF p_actual_cost > 0 THEN
    IF v_effective_pos_id IS NULL THEN
      RAISE EXCEPTION 'Pos pengeluaran wajib dipilih untuk mencatat pengeluaran';
    END IF;

    SELECT * INTO v_pos FROM public.pos WHERE id = v_effective_pos_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Pos keuangan tidak ditemukan';
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
    WHERE id = v_effective_pos_id;

    -- Catat transaksi belanja di tabel transactions
    INSERT INTO public.transactions (
      keluarga_id, pos_id, amount, type, user_id, user_name, user_role,
      description, saku_id, saku_withdraw_amount
    ) VALUES (
      v_item.keluarga_id, v_effective_pos_id, p_actual_cost, 'expense',
      p_user_id, p_user_name, p_user_role::public.status_keluarga,
      v_trip.title || ' — ' || v_item.title,
      p_saku_id, v_effective_saku_withdraw
    ) RETURNING id INTO v_tx_id;
  END IF;

  -- 6. Jika kategori Transport & Odometer diinput -> Catat BBM Atomik
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
      v_item.keluarga_id, v_trip.vehicle_id, v_effective_pos_id, v_tx_id,
      CURRENT_DATE, p_odometer_km, 'BBM Wisata', COALESCE(p_fuel_liters, 0), p_actual_cost,
      v_distance_km, v_efficiency_km_l, 'Road Trip: ' || v_trip.title
    ) RETURNING id INTO v_fuel_log_id;

    -- Update last_odometer kendaraan
    UPDATE public.vehicles 
    SET last_odometer = GREATEST(last_odometer, p_odometer_km), updated_at = now() 
    WHERE id = v_trip.vehicle_id;
  END IF;

  -- 7. Update status item jadwal wisata
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

-- Berikan hak akses eksekusi
GRANT EXECUTE ON FUNCTION public.record_trip_expense_tx TO anon, authenticated, service_role;

