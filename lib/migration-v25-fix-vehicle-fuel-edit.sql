-- ═══════════════════════════════════════════════════════════════════
-- Dompet Azla / CatatKeluarga — Migration v25
-- Fix RPC update_vehicle_fuel_tx: Hapus referensi kolom transactions.date yang tidak ada
-- & sinkronisasi pos_name dan pos_icon saat pindah POS
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
BEGIN
  v_my_keluarga_id := public.get_my_keluarga_id();

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

  -- Format deskripsi transaksi baru
  v_tx_desc := 'BBM ' || p_fuel_type || ' — ' || 
               COALESCE(v_vehicle_record.brand, '') || ' ' || 
               COALESCE(v_vehicle_record.model, '') || ' (' || 
               COALESCE(v_vehicle_record.plate_number, '') || ') @ ' || 
               TO_CHAR(p_odometer_km, 'FM999,999,999') || ' km';

  -- 3. Penyesuaian Saldo POS Keuangan & Transaksi Terkait
  IF v_old_log.finance_transaction_id IS NOT NULL THEN
    -- A. Jika POS pemotongan berubah
    IF v_old_log.finance_pos_id IS DISTINCT FROM p_finance_pos_id THEN
      -- Refund saldo POS lama
      IF v_old_log.finance_pos_id IS NOT NULL AND v_old_log.total_cost > 0 THEN
        UPDATE public.pos
        SET current_balance = current_balance + v_old_log.total_cost
        WHERE id = v_old_log.finance_pos_id;
      END IF;

      -- Ambil info POS baru
      IF p_finance_pos_id IS NOT NULL THEN
        SELECT * INTO v_new_pos FROM public.pos WHERE id = p_finance_pos_id;
      END IF;

      -- Potong saldo POS baru
      IF p_finance_pos_id IS NOT NULL AND p_total_cost > 0 THEN
        UPDATE public.pos
        SET current_balance = current_balance - p_total_cost
        WHERE id = p_finance_pos_id;
      END IF;

      -- Update data transaksi (kolom date tidak ada di transactions, gunakan created_at atau pertahankan)
      UPDATE public.transactions
      SET pos_id = p_finance_pos_id,
          pos_name = COALESCE(v_new_pos.name, 'Pos'),
          pos_icon = COALESCE(v_new_pos.icon, '⛽'),
          amount = p_total_cost,
          description = v_tx_desc
      WHERE id = v_old_log.finance_transaction_id;

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
      WHERE id = v_old_log.finance_transaction_id;
    END IF;
  END IF;

  -- 4. Update baris di vehicle_fuel_logs
  UPDATE public.vehicle_fuel_logs
  SET log_date = p_log_date,
      odometer_km = p_odometer_km,
      fuel_type = p_fuel_type,
      cost_per_liter = p_cost_per_liter,
      fuel_liters = p_fuel_liters,
      total_cost = p_total_cost,
      finance_pos_id = p_finance_pos_id,
      notes = p_notes
  WHERE id = p_fuel_log_id;

  -- 5. Hitung ulang rantai efisiensi dan update last_odometer kendaraan
  PERFORM public.recalculate_vehicle_fuel_logs(v_old_log.vehicle_id);

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_vehicle_fuel_tx TO anon, authenticated, service_role;
