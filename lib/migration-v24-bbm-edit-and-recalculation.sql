-- ═══════════════════════════════════════════════════════════════════
-- Dompet Azla / CatatKeluarga — Migration v24
-- Edit Riwayat BBM, Penyelarasan POS & Dynamic Recalculation Engine
-- Migration: lib/migration-v24-bbm-edit-and-recalculation.sql
-- ═══════════════════════════════════════════════════════════════════

-- 1. Stored Procedure untuk menghitung ulang efisiensi BBM berantai & odometer kendaraan
CREATE OR REPLACE FUNCTION public.recalculate_vehicle_fuel_logs(
  p_vehicle_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rec RECORD;
  v_prev_odo INT := NULL;
  v_dist INT;
  v_eff NUMERIC(6, 2);
  v_max_odo INT := 0;
BEGIN
  -- Iterasi seluruh log bensin kendaraan dari odometer terkecil / tanggal terawal
  FOR v_rec IN
    SELECT id, odometer_km, fuel_liters
    FROM public.vehicle_fuel_logs
    WHERE vehicle_id = p_vehicle_id
    ORDER BY odometer_km ASC, log_date ASC, created_at ASC
  LOOP
    IF v_prev_odo IS NULL THEN
      -- Catatan pertama adalah baseline / titik awal
      v_dist := NULL;
      v_eff := NULL;
    ELSE
      v_dist := v_rec.odometer_km - v_prev_odo;
      IF v_dist > 0 AND v_rec.fuel_liters > 0 THEN
        v_eff := ROUND((v_dist::NUMERIC / v_rec.fuel_liters), 2);
      ELSE
        v_dist := NULL;
        v_eff := NULL;
      END IF;
    END IF;

    -- Update log jika nilai kalkulasi berubah
    UPDATE public.vehicle_fuel_logs
    SET distance_km = v_dist,
        efficiency_km_l = v_eff
    WHERE id = v_rec.id;

    v_prev_odo := v_rec.odometer_km;
    IF v_rec.odometer_km > v_max_odo THEN
      v_max_odo := v_rec.odometer_km;
    END IF;
  END LOOP;

  -- Kalibrasi odometer terakhir pada tabel vehicles
  IF v_max_odo > 0 THEN
    UPDATE public.vehicles
    SET last_odometer = GREATEST(
      v_max_odo,
      COALESCE((SELECT MAX(odometer_km) FROM public.vehicle_services WHERE vehicle_id = p_vehicle_id), 0)
    )
    WHERE id = p_vehicle_id;
  ELSE
    -- Jika sudah tidak ada log bensin tersisa, ambil dari max servis atau 0
    UPDATE public.vehicles
    SET last_odometer = COALESCE(
      (SELECT MAX(odometer_km) FROM public.vehicle_services WHERE vehicle_id = p_vehicle_id),
      0
    )
    WHERE id = p_vehicle_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.recalculate_vehicle_fuel_logs(UUID) TO anon, authenticated, service_role;

-- 2. Stored Procedure untuk Mengedit Riwayat BBM (Atomic POS Rebalancing & Auto Recalculation)
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

      -- Potong saldo POS baru
      IF p_finance_pos_id IS NOT NULL AND p_total_cost > 0 THEN
        UPDATE public.pos
        SET current_balance = current_balance - p_total_cost
        WHERE id = p_finance_pos_id;
      END IF;

      -- Update data transaksi
      UPDATE public.transactions
      SET pos_id = p_finance_pos_id,
          amount = p_total_cost,
          description = v_tx_desc,
          date = p_log_date
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
          description = v_tx_desc,
          date = p_log_date
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

-- 3. Perbarui delete_vehicle_fuel_tx agar langsung memicu rekalkulasi otomatis
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
  v_vehicle_id UUID;
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

  v_vehicle_id := v_log_record.vehicle_id;

  -- 2. Kembalikan saldo pos keuangan HANYA jika transaksi terkait masih ada (anti-double refund)
  IF v_log_record.finance_pos_id IS NOT NULL AND v_log_record.total_cost > 0 THEN
    IF v_log_record.finance_transaction_id IS NOT NULL THEN
      IF EXISTS (SELECT 1 FROM public.transactions WHERE id = v_log_record.finance_transaction_id) THEN
        UPDATE public.pos
        SET current_balance = current_balance + v_log_record.total_cost
        WHERE id = v_log_record.finance_pos_id;

        -- 3. Hapus transaksi keuangan terkait
        DELETE FROM public.transactions 
        WHERE id = v_log_record.finance_transaction_id;
      END IF;
    END IF;
  END IF;

  -- 4. Hapus log bensin
  DELETE FROM public.vehicle_fuel_logs WHERE id = p_fuel_log_id;

  -- 5. Hitung ulang rantai efisiensi dan sinkronkan odometer kendaraan
  IF v_vehicle_id IS NOT NULL THEN
    PERFORM public.recalculate_vehicle_fuel_logs(v_vehicle_id);
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_vehicle_fuel_tx TO anon, authenticated, service_role;

