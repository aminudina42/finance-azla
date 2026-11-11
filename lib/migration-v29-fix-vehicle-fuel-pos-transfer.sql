-- ═══════════════════════════════════════════════════════════════════
-- Dompet Azla / CatatKeluarga — Migration v29
-- Fix: Resilient POS Rebalancing & Transaction Transfer on Fuel Log Edit
-- Menyelesaikan bug Notion dfb16ad0: Edit sumber pos riwayat BBM tidak memindahkan transaksi/dana
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.update_vehicle_fuel_tx(
  p_fuel_log_id UUID,
  p_log_date DATE,
  p_odometer_km INT,
  p_fuel_type TEXT,
  p_cost_per_liter BIGINT,
  p_fuel_liters NUMERIC,
  p_total_cost BIGINT,
  p_finance_pos_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_log RECORD;
  v_new_pos RECORD;
  v_vehicle_record RECORD;
  v_my_keluarga_id UUID;
  v_cost_diff BIGINT;
  v_tx_desc TEXT;
  v_target_tx_id UUID;
  v_effective_keluarga_id UUID;
  v_caller_id UUID;
  v_user_name TEXT := 'User';
  v_user_role TEXT := 'suami';
BEGIN
  v_my_keluarga_id := public.get_my_keluarga_id();
  v_caller_id := auth.uid();

  -- 1. Ambil data log bensin saat ini
  SELECT * INTO v_old_log FROM public.vehicle_fuel_logs WHERE id = p_fuel_log_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Catatan bensin tidak ditemukan';
  END IF;

  -- Validasi multi-tenant keluarga
  IF v_old_log.keluarga_id IS NOT NULL AND v_my_keluarga_id IS NOT NULL AND v_old_log.keluarga_id <> v_my_keluarga_id THEN
    RAISE EXCEPTION 'Akses ditolak: Catatan bensin bukan milik keluarga Anda';
  END IF;

  -- 2. Ambil data kendaraan
  SELECT * INTO v_vehicle_record FROM public.vehicles WHERE id = v_old_log.vehicle_id;

  -- Tentukan keluarga_id efektif
  v_effective_keluarga_id := COALESCE(v_old_log.keluarga_id, v_vehicle_record.keluarga_id, v_my_keluarga_id);

  -- Format deskripsi transaksi baru
  v_tx_desc := 'BBM ' || p_fuel_type || ' — ' || 
               COALESCE(v_vehicle_record.brand, '') || ' ' || 
               COALESCE(v_vehicle_record.model, '') || ' (' || 
               COALESCE(v_vehicle_record.plate_number, '') || ') @ ' || 
               TO_CHAR(p_odometer_km, 'FM999,999,999') || ' km';

  -- 3. Resilient Lookup: Jika finance_transaction_id belum terhubung atau bernilai NULL, cari transaksi BBM terkait
  v_target_tx_id := v_old_log.finance_transaction_id;

  IF v_target_tx_id IS NULL AND v_old_log.finance_pos_id IS NOT NULL THEN
    SELECT id INTO v_target_tx_id
    FROM public.transactions
    WHERE pos_id = v_old_log.finance_pos_id
      AND amount = v_old_log.total_cost
      AND description ILIKE '%BBM%'
    ORDER BY created_at DESC
    LIMIT 1;

    -- Jika ditemukan, sambungkan kembali ke log bensin
    IF v_target_tx_id IS NOT NULL THEN
      UPDATE public.vehicle_fuel_logs
      SET finance_transaction_id = v_target_tx_id
      WHERE id = p_fuel_log_id;
    END IF;
  END IF;

  -- Ambil data POS baru jika ada
  IF p_finance_pos_id IS NOT NULL THEN
    SELECT * INTO v_new_pos FROM public.pos WHERE id = p_finance_pos_id;
  END IF;

  -- 4. Penyesuaian Saldo POS Keuangan & Transaksi Terkait
  IF v_target_tx_id IS NOT NULL THEN
    -- A. Jika POS pemotongan berubah
    IF v_old_log.finance_pos_id IS DISTINCT FROM p_finance_pos_id THEN
      -- Refund saldo POS lama
      IF v_old_log.finance_pos_id IS NOT NULL AND v_old_log.total_cost > 0 THEN
        UPDATE public.pos
        SET current_balance = current_balance + v_old_log.total_cost
        WHERE id = v_old_log.finance_pos_id;
      END IF;

      -- Potong saldo POS baru
      IF p_finance_pos_id IS NOT NULL AND p_total_cost > 0 THEN
        UPDATE public.pos
        SET current_balance = current_balance - p_total_cost
        WHERE id = p_finance_pos_id;
      END IF;

      -- Pindahkan transaksi ke POS baru
      UPDATE public.transactions
      SET pos_id = p_finance_pos_id,
          pos_name = COALESCE(v_new_pos.name, 'Pos'),
          pos_icon = COALESCE(v_new_pos.icon, '⛽'),
          amount = p_total_cost,
          description = v_tx_desc
      WHERE id = v_target_tx_id;

    -- B. Jika POS sama tetapi nominal/deskripsi berubah
    ELSE
      v_cost_diff := p_total_cost - v_old_log.total_cost;
      IF v_cost_diff <> 0 AND p_finance_pos_id IS NOT NULL THEN
        UPDATE public.pos
        SET current_balance = current_balance - v_cost_diff
        WHERE id = p_finance_pos_id;
      END IF;

      -- Update data transaksi
      UPDATE public.transactions
      SET amount = p_total_cost,
          description = v_tx_desc
      WHERE id = v_target_tx_id;
    END IF;

  -- C. Kasus transaksi belum pernah dibuat sebelumnya: Buat transaksi baru di Pos baru
  ELSIF p_finance_pos_id IS NOT NULL AND p_total_cost > 0 THEN
    -- Ambil identitas pembuat
    IF v_caller_id IS NOT NULL THEN
      SELECT display_name, COALESCE(status_keluarga, 'suami')
      INTO v_user_name, v_user_role
      FROM public.members
      WHERE id = v_caller_id;
    END IF;

    -- Potong saldo pos baru
    UPDATE public.pos
    SET current_balance = current_balance - p_total_cost
    WHERE id = p_finance_pos_id;

    -- Insert transaksi baru
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
      COALESCE(v_new_pos.name, 'Pos'),
      COALESCE(v_new_pos.icon, '⛽'),
      COALESCE(v_caller_id, '00000000-0000-0000-0000-000000000000'::uuid),
      COALESCE(v_user_name, 'User'),
      COALESCE(v_user_role, 'suami'),
      v_tx_desc,
      v_effective_keluarga_id,
      NOW()
    ) RETURNING id INTO v_target_tx_id;
  END IF;

  -- 5. Update baris di vehicle_fuel_logs
  UPDATE public.vehicle_fuel_logs
  SET log_date = p_log_date,
      odometer_km = p_odometer_km,
      fuel_type = p_fuel_type,
      cost_per_liter = p_cost_per_liter,
      fuel_liters = p_fuel_liters,
      total_cost = p_total_cost,
      finance_pos_id = p_finance_pos_id,
      finance_transaction_id = COALESCE(v_target_tx_id, v_old_log.finance_transaction_id),
      notes = p_notes
  WHERE id = p_fuel_log_id;

  -- 6. Hitung ulang rantai efisiensi dan update last_odometer kendaraan
  PERFORM public.recalculate_vehicle_fuel_logs(v_old_log.vehicle_id);

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_target_tx_id,
    'pos_id', p_finance_pos_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_vehicle_fuel_tx TO anon, authenticated, service_role;
