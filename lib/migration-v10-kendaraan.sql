-- ═══════════════════════════════════════════════
-- Dompet Azla — Modul Manajemen Kendaraan
-- Migration: lib/migration-v10-kendaraan.sql
-- Jalankan SQL ini di Supabase SQL Editor
-- ═══════════════════════════════════════════════

-- 1. Tabel Kendaraan (vehicles)
CREATE TABLE IF NOT EXISTS public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  plate_number TEXT NOT NULL,
  vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('Motor', 'Mobil')),
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  next_tax_due_date DATE NOT NULL,
  last_service_date DATE,
  last_odometer INT DEFAULT 0,
  service_reminder_interval_months INT DEFAULT 1 CHECK (service_reminder_interval_months IN (1, 2)),
  service_reminder_enabled BOOLEAN DEFAULT true,
  tax_reminder_enabled BOOLEAN DEFAULT true,
  notes TEXT,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index plat nomor untuk kendaraan aktif
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_plate_number
ON public.vehicles(plate_number)
WHERE archived_at IS NULL;

-- 2. Tabel Pembayaran Pajak (vehicle_tax_payments)
CREATE TABLE IF NOT EXISTS public.vehicle_tax_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  tax_period TEXT NOT NULL,
  payment_date DATE NOT NULL,
  next_due_date DATE NOT NULL,
  amount BIGINT NOT NULL,
  finance_pos_id UUID REFERENCES public.pos(id) ON DELETE SET NULL,
  finance_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  receipt_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabel Riwayat Servis (vehicle_services)
CREATE TABLE IF NOT EXISTS public.vehicle_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  service_date DATE NOT NULL,
  service_type TEXT NOT NULL CHECK (service_type IN ('Servis Ringan', 'Servis Besar')),
  cost_mode TEXT NOT NULL CHECK (cost_mode IN ('total', 'itemized')),
  total_cost BIGINT NOT NULL,
  service_description TEXT NOT NULL,
  odometer_km INT NOT NULL,
  workshop_name TEXT,
  finance_pos_id UUID REFERENCES public.pos(id) ON DELETE SET NULL,
  finance_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  receipt_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabel Item Rincian Biaya Servis (vehicle_service_items)
CREATE TABLE IF NOT EXISTS public.vehicle_service_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES public.vehicle_services(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  item_category TEXT NOT NULL CHECK (item_category IN ('Jasa', 'Part')),
  quantity INT NOT NULL DEFAULT 1,
  unit_price BIGINT NOT NULL,
  subtotal BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tabel Notifikasi & Pengingat Kendaraan (vehicle_notifications)
CREATE TABLE IF NOT EXISTS public.vehicle_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('service_reminder', 'tax_reminder', 'tax_success', 'service_recorded')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  reference_id UUID,
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  is_read BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'cancelled', 'failed')),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Disable RLS selaras dengan lingkungan dev finance-azla (bisa diaktifkan kemudian)
ALTER TABLE public.vehicles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_tax_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_services DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_service_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_notifications DISABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════
-- Stored Procedures / RPC Functions (Atomic)
-- ═══════════════════════════════════════════════

-- A. Function untuk mencatat pembayaran pajak & transaksi keuangan secara atomic
CREATE OR REPLACE FUNCTION public.record_vehicle_tax_tx(
  p_vehicle_id UUID,
  p_tax_period TEXT,
  p_payment_date DATE,
  p_next_due_date DATE,
  p_amount BIGINT,
  p_finance_pos_id UUID,
  p_user_id UUID,
  p_user_name TEXT,
  p_user_role TEXT,
  p_receipt_url TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pos_record RECORD;
  v_vehicle_record RECORD;
  v_tx_id UUID;
  v_tax_id UUID;
  v_tx_desc TEXT;
BEGIN
  -- 1. Ambil data kendaraan
  SELECT * INTO v_vehicle_record FROM public.vehicles WHERE id = p_vehicle_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Kendaraan tidak ditemukan';
  END IF;

  -- 2. Ambil data pos keuangan
  SELECT * INTO v_pos_record FROM public.pos WHERE id = p_finance_pos_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pos Keuangan tidak ditemukan';
  END IF;

  v_tx_desc := 'Pajak Kendaraan — ' || v_vehicle_record.brand || ' ' || v_vehicle_record.model || ' (' || v_vehicle_record.plate_number || ') Periode ' || p_tax_period;

  -- 3. Insert ke transactions
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
    created_at
  ) VALUES (
    p_amount,
    'expense',
    p_finance_pos_id,
    v_pos_record.name,
    v_pos_record.icon,
    p_user_id,
    p_user_name,
    p_user_role,
    v_tx_desc,
    NOW()
  ) RETURNING id INTO v_tx_id;

  -- 4. Kurangi saldo pos keuangan
  UPDATE public.pos
  SET current_balance = current_balance - p_amount
  WHERE id = p_finance_pos_id;

  -- 5. Insert ke vehicle_tax_payments
  INSERT INTO public.vehicle_tax_payments (
    vehicle_id,
    tax_period,
    payment_date,
    next_due_date,
    amount,
    finance_pos_id,
    finance_transaction_id,
    receipt_url,
    notes
  ) VALUES (
    p_vehicle_id,
    p_tax_period,
    p_payment_date,
    p_next_due_date,
    p_amount,
    p_finance_pos_id,
    v_tx_id,
    p_receipt_url,
    p_notes
  ) RETURNING id INTO v_tax_id;

  -- 6. Update tanggal pajak berikutnya di tabel vehicles
  UPDATE public.vehicles
  SET next_tax_due_date = p_next_due_date,
      updated_at = NOW()
  WHERE id = p_vehicle_id;

  -- 7. Batalkan notifikasi pengingat pajak yang belum terkirim untuk kendaraan ini
  UPDATE public.vehicle_notifications
  SET status = 'cancelled'
  WHERE vehicle_id = p_vehicle_id
    AND notification_type = 'tax_reminder'
    AND status = 'pending';

  RETURN jsonb_build_object(
    'success', true,
    'tax_payment_id', v_tax_id,
    'transaction_id', v_tx_id
  );
END;
$$;

-- B. Function untuk mencatat servis kendaraan & transaksi keuangan secara atomic
CREATE OR REPLACE FUNCTION public.record_vehicle_service_tx(
  p_vehicle_id UUID,
  p_service_date DATE,
  p_service_type TEXT,
  p_cost_mode TEXT,
  p_total_cost BIGINT,
  p_service_description TEXT,
  p_odometer_km INT,
  p_workshop_name TEXT,
  p_finance_pos_id UUID,
  p_user_id UUID,
  p_user_name TEXT,
  p_user_role TEXT,
  p_receipt_url TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pos_record RECORD;
  v_vehicle_record RECORD;
  v_tx_id UUID;
  v_service_id UUID;
  v_tx_desc TEXT;
BEGIN
  -- 1. Ambil data kendaraan
  SELECT * INTO v_vehicle_record FROM public.vehicles WHERE id = p_vehicle_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Kendaraan tidak ditemukan';
  END IF;

  -- 2. Ambil data pos keuangan
  SELECT * INTO v_pos_record FROM public.pos WHERE id = p_finance_pos_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pos Keuangan tidak ditemukan';
  END IF;

  v_tx_desc := p_service_type || ' — ' || v_vehicle_record.brand || ' ' || v_vehicle_record.model || ' (' || v_vehicle_record.plate_number || ')';

  -- 3. Insert ke transactions
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
    created_at
  ) VALUES (
    p_total_cost,
    'expense',
    p_finance_pos_id,
    v_pos_record.name,
    v_pos_record.icon,
    p_user_id,
    p_user_name,
    p_user_role,
    v_tx_desc,
    NOW()
  ) RETURNING id INTO v_tx_id;

  -- 4. Kurangi saldo pos keuangan
  UPDATE public.pos
  SET current_balance = current_balance - p_total_cost
  WHERE id = p_finance_pos_id;

  -- 5. Insert ke vehicle_services
  INSERT INTO public.vehicle_services (
    vehicle_id,
    service_date,
    service_type,
    cost_mode,
    total_cost,
    service_description,
    odometer_km,
    workshop_name,
    finance_pos_id,
    finance_transaction_id,
    receipt_url,
    notes
  ) VALUES (
    p_vehicle_id,
    p_service_date,
    p_service_type,
    p_cost_mode,
    p_total_cost,
    p_service_description,
    p_odometer_km,
    p_workshop_name,
    p_finance_pos_id,
    v_tx_id,
    p_receipt_url,
    p_notes
  ) RETURNING id INTO v_service_id;

  -- 6. Update cache tanggal servis terakhir dan odometer di tabel vehicles jika lebih baru
  UPDATE public.vehicles
  SET last_service_date = GREATEST(COALESCE(last_service_date, p_service_date), p_service_date),
      last_odometer = GREATEST(COALESCE(last_odometer, 0), p_odometer_km),
      updated_at = NOW()
  WHERE id = p_vehicle_id;

  -- 7. Batalkan notifikasi servis pending lama
  UPDATE public.vehicle_notifications
  SET status = 'cancelled'
  WHERE vehicle_id = p_vehicle_id
    AND notification_type = 'service_reminder'
    AND status = 'pending';

  RETURN jsonb_build_object(
    'success', true,
    'service_id', v_service_id,
    'transaction_id', v_tx_id
  );
END;
$$;
