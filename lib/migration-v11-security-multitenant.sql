-- ═══════════════════════════════════════════════════════════════════════
-- Dompet Azla — Migration v11: Multi-Tenant & Keamanan Database (RLS)
-- File: lib/migration-v11-security-multitenant.sql
-- Jalankan SQL ini di Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════

-- 1. TABEL KELUARGA (TENANT UNIT)
CREATE TABLE IF NOT EXISTS public.keluarga (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_keluarga TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. TABEL MEMBERS (MAPPING USER AUTH KE KELUARGA)
CREATE TABLE IF NOT EXISTS public.members (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  keluarga_id UUID NOT NULL REFERENCES public.keluarga(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  status_keluarga TEXT DEFAULT 'suami' CHECK (status_keluarga IN ('suami', 'istri', 'anak')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Kolom status_keluarga jika tabel sudah ada sebelumnya
DO $$
BEGIN
  ALTER TABLE public.members ADD COLUMN IF NOT EXISTS status_keluarga TEXT DEFAULT 'suami';
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'members_status_keluarga_check'
  ) THEN
    ALTER TABLE public.members ADD CONSTRAINT members_status_keluarga_check CHECK (status_keluarga IN ('suami', 'istri', 'anak'));
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_members_keluarga ON public.members(keluarga_id);

-- 3. INITIAL SEED / MIGRASI KELUARGA AWAL UNTUK DATA EXISTING
-- Buat keluarga default jika belum ada sama sekali
DO $$
DECLARE
  v_default_keluarga_id UUID;
  v_first_auth_id UUID;
BEGIN
  -- Cek apakah sudah ada keluarga
  SELECT id INTO v_default_keluarga_id FROM public.keluarga LIMIT 1;
  
  IF v_default_keluarga_id IS NULL THEN
    -- Ambil user pertama dari auth.users jika ada
    SELECT id INTO v_first_auth_id FROM auth.users ORDER BY created_at ASC LIMIT 1;
    
    INSERT INTO public.keluarga (id, nama_keluarga, invite_code, created_by)
    VALUES (
      gen_random_uuid(),
      'Keluarga Azla',
      'AZLA-' || upper(substr(md5(random()::text), 1, 6)),
      v_first_auth_id
    )
    RETURNING id INTO v_default_keluarga_id;
  END IF;

  -- Hubungkan user auth yang ada ke tabel members jika belum terdaftar
  IF v_first_auth_id IS NOT NULL THEN
    INSERT INTO public.members (id, keluarga_id, display_name, role)
    VALUES (v_first_auth_id, v_default_keluarga_id, 'Admin Keluarga', 'admin')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Jika ada user lain di auth.users, masukkan sebagai member
  INSERT INTO public.members (id, keluarga_id, display_name, role)
  SELECT id, v_default_keluarga_id, COALESCE(raw_user_meta_data->>'name', email, 'Anggota'), 'member'
  FROM auth.users
  WHERE id <> COALESCE(v_first_auth_id, '00000000-0000-0000-0000-000000000000'::uuid)
  ON CONFLICT (id) DO NOTHING;
END $$;

-- 4. TAMBAH KOLOM keluarga_id KE SEMUA TABEL INTI
ALTER TABLE public.pos ADD COLUMN IF NOT EXISTS keluarga_id UUID REFERENCES public.keluarga(id) ON DELETE CASCADE;
ALTER TABLE public.cycles ADD COLUMN IF NOT EXISTS keluarga_id UUID REFERENCES public.keluarga(id) ON DELETE CASCADE;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS keluarga_id UUID REFERENCES public.keluarga(id) ON DELETE CASCADE;
ALTER TABLE public.children ADD COLUMN IF NOT EXISTS keluarga_id UUID REFERENCES public.keluarga(id) ON DELETE CASCADE;
ALTER TABLE public.child_transactions ADD COLUMN IF NOT EXISTS keluarga_id UUID REFERENCES public.keluarga(id) ON DELETE CASCADE;
ALTER TABLE public.debts ADD COLUMN IF NOT EXISTS keluarga_id UUID REFERENCES public.keluarga(id) ON DELETE CASCADE;
ALTER TABLE public.cycle_pos_history ADD COLUMN IF NOT EXISTS keluarga_id UUID REFERENCES public.keluarga(id) ON DELETE CASCADE;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS keluarga_id UUID REFERENCES public.keluarga(id) ON DELETE CASCADE;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS keluarga_id UUID REFERENCES public.keluarga(id) ON DELETE CASCADE;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS keluarga_id UUID REFERENCES public.keluarga(id) ON DELETE CASCADE;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS keluarga_id UUID REFERENCES public.keluarga(id) ON DELETE CASCADE;

-- Sesuaikan constraint user_role pada transactions agar mendukung peran suami, istri, dan anak
DO $$
BEGIN
  ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_user_role_check;
  ALTER TABLE public.transactions ADD CONSTRAINT transactions_user_role_check CHECK (user_role IN ('suami', 'istri', 'anak'));
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 5. MIGRASI DATA LAMA: PASANGKAN DATA TANPA KELUARGA_ID KE DEFAULT KELUARGA
DO $$
DECLARE
  v_default_keluarga_id UUID;
BEGIN
  SELECT id INTO v_default_keluarga_id FROM public.keluarga LIMIT 1;
  
  IF v_default_keluarga_id IS NOT NULL THEN
    UPDATE public.pos SET keluarga_id = v_default_keluarga_id WHERE keluarga_id IS NULL;
    UPDATE public.cycles SET keluarga_id = v_default_keluarga_id WHERE keluarga_id IS NULL;
    UPDATE public.transactions SET keluarga_id = v_default_keluarga_id WHERE keluarga_id IS NULL;
    UPDATE public.children SET keluarga_id = v_default_keluarga_id WHERE keluarga_id IS NULL;
    UPDATE public.child_transactions SET keluarga_id = v_default_keluarga_id WHERE keluarga_id IS NULL;
    UPDATE public.debts SET keluarga_id = v_default_keluarga_id WHERE keluarga_id IS NULL;
    UPDATE public.cycle_pos_history SET keluarga_id = v_default_keluarga_id WHERE keluarga_id IS NULL;
    UPDATE public.app_settings SET keluarga_id = v_default_keluarga_id WHERE keluarga_id IS NULL;
    UPDATE public.stores SET keluarga_id = v_default_keluarga_id WHERE keluarga_id IS NULL;
    UPDATE public.receipts SET keluarga_id = v_default_keluarga_id WHERE keluarga_id IS NULL;
    UPDATE public.vehicles SET keluarga_id = v_default_keluarga_id WHERE keluarga_id IS NULL;
  END IF;
END $$;

-- 6. PERBAIKI CONSTRAINT APP_SETTINGS
-- app_settings sebelumnya memiliki UNIQUE(key) global, ubah agar unik per (keluarga_id, key)
DO $$
BEGIN
  ALTER TABLE public.app_settings DROP CONSTRAINT IF EXISTS app_settings_key_key;
  -- Tambahkan unique constraint baru jika belum ada
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'app_settings_keluarga_key_unique'
  ) THEN
    ALTER TABLE public.app_settings ADD CONSTRAINT app_settings_keluarga_key_unique UNIQUE (keluarga_id, key);
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 7. HELPER FUNCTIONS DENGAN SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.get_my_keluarga_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT keluarga_id FROM public.members WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_keluarga_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.members WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- 8. AKTIFKAN ROW LEVEL SECURITY (RLS) DI SEMUA TABEL
ALTER TABLE public.keluarga ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.child_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycle_pos_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_tax_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_service_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_notifications ENABLE ROW LEVEL SECURITY;

-- 8b. AUTO-SET TRIGGER UNTUK keluarga_id JIKA TIDAK DISERTAKAN SAAT INSERT
CREATE OR REPLACE FUNCTION public.auto_set_keluarga_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.keluarga_id IS NULL THEN
    NEW.keluarga_id := public.get_my_keluarga_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY[
    'pos',
    'cycles',
    'transactions',
    'children',
    'child_transactions',
    'debts',
    'cycle_pos_history',
    'app_settings',
    'stores',
    'receipts',
    'vehicles'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trigger_auto_set_keluarga_id ON public.%I;', tbl);
    EXECUTE format('
      CREATE TRIGGER trigger_auto_set_keluarga_id
      BEFORE INSERT ON public.%I
      FOR EACH ROW
      EXECUTE FUNCTION public.auto_set_keluarga_id();
    ', tbl);
  END LOOP;
END $$;

-- 8c. POLICIES: TABEL USERS (Hanya profil sendiri atau anggota satu keluarga)
DROP POLICY IF EXISTS "users_select_all" ON public.users;
DROP POLICY IF EXISTS "users_select_family_or_own" ON public.users;
DROP POLICY IF EXISTS "users_upsert_own" ON public.users;
CREATE POLICY "users_select_family_or_own" ON public.users FOR SELECT USING (
  id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.members m1
    JOIN public.members m2 ON m1.keluarga_id = m2.keluarga_id
    WHERE m1.id = auth.uid() AND m2.id = public.users.id
  )
);
CREATE POLICY "users_upsert_own" ON public.users FOR ALL USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- 9. BERSIHKAN POLICY LAMA AGAR TIDAK DUPLIKAT
DROP POLICY IF EXISTS "keluarga_select" ON public.keluarga;
DROP POLICY IF EXISTS "keluarga_insert" ON public.keluarga;
DROP POLICY IF EXISTS "keluarga_update" ON public.keluarga;

DROP POLICY IF EXISTS "members_select" ON public.members;
DROP POLICY IF EXISTS "members_insert" ON public.members;
DROP POLICY IF EXISTS "members_update" ON public.members;
DROP POLICY IF EXISTS "members_delete" ON public.members;

-- 10. POLICIES: KELUARGA
CREATE POLICY "keluarga_select" ON public.keluarga
  FOR SELECT USING (id = public.get_my_keluarga_id() OR auth.uid() = created_by);

CREATE POLICY "keluarga_insert" ON public.keluarga
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "keluarga_update" ON public.keluarga
  FOR UPDATE USING (id = public.get_my_keluarga_id() AND public.is_keluarga_admin());

-- 11. POLICIES: MEMBERS
CREATE POLICY "members_select" ON public.members
  FOR SELECT USING (keluarga_id = public.get_my_keluarga_id() OR id = auth.uid());

CREATE POLICY "members_insert" ON public.members
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "members_update" ON public.members
  FOR UPDATE USING (id = auth.uid() OR (keluarga_id = public.get_my_keluarga_id() AND public.is_keluarga_admin()));

CREATE POLICY "members_delete" ON public.members
  FOR DELETE USING (id = auth.uid() OR (keluarga_id = public.get_my_keluarga_id() AND public.is_keluarga_admin()));

-- 12. MACRO HELPER UNTUK MEMBUAT POLICY STANDAR KELUARGA (pos, cycles, dll)
DO $$
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY[
    'pos',
    'cycles',
    'transactions',
    'children',
    'child_transactions',
    'debts',
    'cycle_pos_history',
    'app_settings',
    'stores',
    'receipts',
    'vehicles'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s_family_all" ON public.%I;', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_family_policy" ON public.%I;', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_family_select" ON public.%I;', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_family_insert" ON public.%I;', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_family_update" ON public.%I;', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_family_delete" ON public.%I;', tbl, tbl);

    EXECUTE format('
      CREATE POLICY "%s_family_all" ON public.%I
      FOR ALL
      USING (keluarga_id = public.get_my_keluarga_id())
      WITH CHECK (keluarga_id = public.get_my_keluarga_id());
    ', tbl, tbl);
  END LOOP;
END $$;

-- 13. POLICIES: TABEL DEPENDEN (RECEIPT_ITEMS, VEHICLE DETAILS)
DROP POLICY IF EXISTS "receipt_items_family_all" ON public.receipt_items;
CREATE POLICY "receipt_items_family_all" ON public.receipt_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.receipts r 
      WHERE r.id = receipt_items.receipt_id 
        AND r.keluarga_id = public.get_my_keluarga_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.receipts r 
      WHERE r.id = receipt_items.receipt_id 
        AND r.keluarga_id = public.get_my_keluarga_id()
    )
  );

DROP POLICY IF EXISTS "vehicle_tax_payments_family_all" ON public.vehicle_tax_payments;
CREATE POLICY "vehicle_tax_payments_family_all" ON public.vehicle_tax_payments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.vehicles v 
      WHERE v.id = vehicle_tax_payments.vehicle_id 
        AND v.keluarga_id = public.get_my_keluarga_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.vehicles v 
      WHERE v.id = vehicle_tax_payments.vehicle_id 
        AND v.keluarga_id = public.get_my_keluarga_id()
    )
  );

DROP POLICY IF EXISTS "vehicle_services_family_all" ON public.vehicle_services;
CREATE POLICY "vehicle_services_family_all" ON public.vehicle_services
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.vehicles v 
      WHERE v.id = vehicle_services.vehicle_id 
        AND v.keluarga_id = public.get_my_keluarga_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.vehicles v 
      WHERE v.id = vehicle_services.vehicle_id 
        AND v.keluarga_id = public.get_my_keluarga_id()
    )
  );

DROP POLICY IF EXISTS "vehicle_service_items_family_all" ON public.vehicle_service_items;
CREATE POLICY "vehicle_service_items_family_all" ON public.vehicle_service_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.vehicle_services vs
      JOIN public.vehicles v ON v.id = vs.vehicle_id
      WHERE vs.id = vehicle_service_items.service_id 
        AND v.keluarga_id = public.get_my_keluarga_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.vehicle_services vs
      JOIN public.vehicles v ON v.id = vs.vehicle_id
      WHERE vs.id = vehicle_service_items.service_id 
        AND v.keluarga_id = public.get_my_keluarga_id()
    )
  );

DROP POLICY IF EXISTS "vehicle_notifications_family_all" ON public.vehicle_notifications;
CREATE POLICY "vehicle_notifications_family_all" ON public.vehicle_notifications
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.vehicles v 
      WHERE v.id = vehicle_notifications.vehicle_id 
        AND v.keluarga_id = public.get_my_keluarga_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.vehicles v 
      WHERE v.id = vehicle_notifications.vehicle_id 
        AND v.keluarga_id = public.get_my_keluarga_id()
    )
  );

-- 14. SECURE STORED PROCEDURES (RPC) UNTUK TRANSAKSI KENDARAAN
-- Memastikan pengguna tidak bisa mengeksekusi servis/pajak pada kendaraan keluarga lain
CREATE OR REPLACE FUNCTION public.record_vehicle_tax_tx(
  p_vehicle_id UUID,
  p_tax_period TEXT,
  p_payment_date DATE,
  p_next_due_date DATE,
  p_amount BIGINT,
  p_finance_pos_id UUID DEFAULT NULL,
  p_receipt_url TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_my_keluarga_id UUID;
  v_veh_keluarga_id UUID;
  v_pos_keluarga_id UUID;
  v_tx_id UUID := NULL;
  v_tax_id UUID;
  v_pos_name TEXT := 'Pajak Kendaraan';
  v_pos_icon TEXT := '🚗';
  v_user_name TEXT := 'Sistem';
  v_user_role TEXT := 'suami';
  v_user_id UUID;
  v_veh_plate TEXT;
BEGIN
  v_my_keluarga_id := public.get_my_keluarga_id();
  v_user_id := auth.uid();

  -- Validasi kepemilikan kendaraan
  SELECT plate_number, keluarga_id INTO v_veh_plate, v_veh_keluarga_id
  FROM public.vehicles
  WHERE id = p_vehicle_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Kendaraan dengan ID % tidak ditemukan', p_vehicle_id;
  END IF;

  IF v_veh_keluarga_id IS NOT NULL AND v_veh_keluarga_id <> v_my_keluarga_id THEN
    RAISE EXCEPTION 'Akses ditolak: Kendaraan bukan milik keluarga Anda';
  END IF;

  -- Profil user pembuat
  IF v_user_id IS NOT NULL THEN
    SELECT display_name, COALESCE(status_keluarga, 'suami') INTO v_user_name, v_user_role FROM public.members WHERE id = v_user_id;
    IF v_user_name IS NULL THEN
      SELECT name, role INTO v_user_name, v_user_role FROM public.users WHERE id = v_user_id;
    END IF;
  END IF;

  -- Validasi dan eksekusi potong saldo pos jika dipilih
  IF p_finance_pos_id IS NOT NULL THEN
    SELECT name, icon, keluarga_id INTO v_pos_name, v_pos_icon, v_pos_keluarga_id
    FROM public.pos
    WHERE id = p_finance_pos_id;

    IF v_pos_keluarga_id IS NOT NULL AND v_pos_keluarga_id <> v_my_keluarga_id THEN
      RAISE EXCEPTION 'Akses ditolak: Pos keuangan bukan milik keluarga Anda';
    END IF;

    -- Buat transaksi pengeluaran keuangan
    INSERT INTO public.transactions (
      amount,
      pos_id,
      pos_name,
      pos_icon,
      user_id,
      user_name,
      user_role,
      description,
      type,
      keluarga_id
    ) VALUES (
      p_amount,
      p_finance_pos_id,
      COALESCE(v_pos_name, 'Pajak Kendaraan'),
      COALESCE(v_pos_icon, '🚗'),
      v_user_id,
      COALESCE(v_user_name, 'User'),
      COALESCE(v_user_role, 'suami'),
      'Bayar Pajak ' || COALESCE(v_veh_plate, ''),
      'expense',
      v_my_keluarga_id
    ) RETURNING id INTO v_tx_id;

    -- Update saldo pos
    UPDATE public.pos
    SET current_balance = current_balance - p_amount
    WHERE id = p_finance_pos_id;
  END IF;

  -- Buat record riwayat pembayaran pajak
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

  -- Update tanggal jatuh tempo pajak di kendaraan
  UPDATE public.vehicles
  SET next_tax_due_date = p_next_due_date,
      updated_at = NOW()
  WHERE id = p_vehicle_id;

  -- Batalkan notifikasi pajak pending lama
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

-- Secure procedure untuk servis
CREATE OR REPLACE FUNCTION public.record_vehicle_service_tx(
  p_vehicle_id UUID,
  p_service_date DATE,
  p_service_type TEXT,
  p_cost_mode TEXT,
  p_total_cost BIGINT,
  p_service_description TEXT,
  p_odometer_km INT,
  p_workshop_name TEXT DEFAULT NULL,
  p_finance_pos_id UUID DEFAULT NULL,
  p_receipt_url TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_my_keluarga_id UUID;
  v_veh_keluarga_id UUID;
  v_pos_keluarga_id UUID;
  v_tx_id UUID := NULL;
  v_service_id UUID;
  v_pos_name TEXT := 'Servis Kendaraan';
  v_pos_icon TEXT := '🔧';
  v_user_name TEXT := 'Sistem';
  v_user_role TEXT := 'suami';
  v_user_id UUID;
  v_veh_plate TEXT;
BEGIN
  v_my_keluarga_id := public.get_my_keluarga_id();
  v_user_id := auth.uid();

  -- Validasi kendaraan
  SELECT plate_number, keluarga_id INTO v_veh_plate, v_veh_keluarga_id
  FROM public.vehicles
  WHERE id = p_vehicle_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Kendaraan dengan ID % tidak ditemukan', p_vehicle_id;
  END IF;

  IF v_veh_keluarga_id IS NOT NULL AND v_veh_keluarga_id <> v_my_keluarga_id THEN
    RAISE EXCEPTION 'Akses ditolak: Kendaraan bukan milik keluarga Anda';
  END IF;

  -- Profil user pembuat
  IF v_user_id IS NOT NULL THEN
    SELECT display_name, COALESCE(status_keluarga, 'suami') INTO v_user_name, v_user_role FROM public.members WHERE id = v_user_id;
    IF v_user_name IS NULL THEN
      SELECT name, role INTO v_user_name, v_user_role FROM public.users WHERE id = v_user_id;
    END IF;
  END IF;

  -- Validasi dan potong saldo pos jika dipilih
  IF p_finance_pos_id IS NOT NULL THEN
    SELECT name, icon, keluarga_id INTO v_pos_name, v_pos_icon, v_pos_keluarga_id
    FROM public.pos
    WHERE id = p_finance_pos_id;

    IF v_pos_keluarga_id IS NOT NULL AND v_pos_keluarga_id <> v_my_keluarga_id THEN
      RAISE EXCEPTION 'Akses ditolak: Pos keuangan bukan milik keluarga Anda';
    END IF;

    INSERT INTO public.transactions (
      amount,
      pos_id,
      pos_name,
      pos_icon,
      user_id,
      user_name,
      user_role,
      description,
      type,
      keluarga_id
    ) VALUES (
      p_total_cost,
      p_finance_pos_id,
      COALESCE(v_pos_name, 'Servis Kendaraan'),
      COALESCE(v_pos_icon, '🔧'),
      v_user_id,
      COALESCE(v_user_name, 'User'),
      COALESCE(v_user_role, 'suami'),
      COALESCE(p_service_type, 'Servis') || ' ' || COALESCE(v_veh_plate, ''),
      'expense',
      v_my_keluarga_id
    ) RETURNING id INTO v_tx_id;

    UPDATE public.pos
    SET current_balance = current_balance - p_total_cost
    WHERE id = p_finance_pos_id;
  END IF;

  -- Catat riwayat servis
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

  -- Update tanggal servis dan odometer
  UPDATE public.vehicles
  SET last_service_date = GREATEST(COALESCE(last_service_date, p_service_date), p_service_date),
      last_odometer = GREATEST(COALESCE(last_odometer, 0), p_odometer_km),
      updated_at = NOW()
  WHERE id = p_vehicle_id;

  -- Batalkan notifikasi servis pending lama
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

-- 15. RPC ONBOARDING: BUAT KELUARGA BARU (DENGAN STARTER POS)
CREATE OR REPLACE FUNCTION public.create_new_keluarga(
  p_nama_keluarga TEXT,
  p_display_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_keluarga_id UUID;
  v_invite_code TEXT;
  v_cycle_id UUID;
  v_start_date DATE;
  v_end_date DATE;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Akses ditolak: Anda harus login terlebih dahulu.';
  END IF;

  IF TRIM(p_nama_keluarga) = '' THEN
    RAISE EXCEPTION 'Nama keluarga tidak boleh kosong.';
  END IF;

  -- Buat kode undangan unik 6 karakter
  v_invite_code := 'AZLA-' || upper(substr(md5(random()::text), 1, 6));

  -- Buat record keluarga
  INSERT INTO public.keluarga (
    nama_keluarga,
    invite_code,
    created_by
  ) VALUES (
    TRIM(p_nama_keluarga),
    v_invite_code,
    v_user_id
  ) RETURNING id INTO v_keluarga_id;

  -- Jadikan user sebagai Admin di tabel members
  INSERT INTO public.members (
    id,
    keluarga_id,
    display_name,
    role
  ) VALUES (
    v_user_id,
    v_keluarga_id,
    COALESCE(NULLIF(TRIM(p_display_name), ''), 'Admin'),
    'admin'
  )
  ON CONFLICT (id) DO UPDATE
  SET keluarga_id = v_keluarga_id,
      display_name = COALESCE(NULLIF(TRIM(p_display_name), ''), members.display_name),
      role = 'admin',
      updated_at = NOW();

  -- Pastikan ada di tabel users untuk backward-compatibility
  INSERT INTO public.users (id, name, role)
  VALUES (v_user_id, COALESCE(NULLIF(TRIM(p_display_name), ''), 'Admin'), 'suami')
  ON CONFLICT (id) DO NOTHING;

  -- Buat starter pos default untuk keluarga baru
  INSERT INTO public.pos (keluarga_id, name, icon, sub, monthly_target, current_balance, order_index, is_goal, goal_target)
  VALUES
    (v_keluarga_id, 'Tabungan', '🏦', 'Akumulasi masa depan', 1500000, 1500000, 0, true, 20000000),
    (v_keluarga_id, 'Belanja Dapur', '🍚', 'Kebutuhan pangan pokok', 1200000, 1200000, 1, false, 0),
    (v_keluarga_id, 'Listrik & Air', '⚡', 'Tagihan bulanan rumah', 400000, 400000, 2, false, 0),
    (v_keluarga_id, 'Transportasi', '🚗', 'Bensin & servis kendaraan', 500000, 500000, 3, false, 0),
    (v_keluarga_id, 'Uang Saku', '💼', 'Kebutuhan pribadi', 500000, 500000, 4, false, 0);

  -- Buat siklus gajian aktif pertama (sebulan ke depan)
  v_start_date := CURRENT_DATE;
  v_end_date := CURRENT_DATE + INTERVAL '1 month' - INTERVAL '1 day';
  
  INSERT INTO public.cycles (keluarga_id, start_date, end_date, is_active, label)
  VALUES (
    v_keluarga_id,
    v_start_date,
    v_end_date,
    true,
    to_char(v_start_date, 'DD Mon') || ' – ' || to_char(v_end_date, 'DD Mon YYYY')
  ) RETURNING id INTO v_cycle_id;

  -- Setting tanggal gajian default
  INSERT INTO public.app_settings (keluarga_id, key, value)
  VALUES (v_keluarga_id, 'gajian_date', to_char(v_start_date, 'DD'))
  ON CONFLICT (keluarga_id, key) DO UPDATE SET value = EXCLUDED.value;

  RETURN jsonb_build_object(
    'success', true,
    'keluarga_id', v_keluarga_id,
    'nama_keluarga', p_nama_keluarga,
    'invite_code', v_invite_code
  );
END;
$$;

-- 16. RPC ONBOARDING: GABUNG KELUARGA DENGAN KODE UNDANGAN
CREATE OR REPLACE FUNCTION public.join_keluarga_by_code(
  p_invite_code TEXT,
  p_display_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_keluarga_id UUID;
  v_keluarga_name TEXT;
  v_clean_code TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Akses ditolak: Anda harus login terlebih dahulu.';
  END IF;

  v_clean_code := UPPER(TRIM(p_invite_code));
  IF v_clean_code = '' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Kode undangan tidak boleh kosong.');
  END IF;

  -- Cari keluarga berdasarkan kode undangan
  SELECT id, nama_keluarga INTO v_keluarga_id, v_keluarga_name
  FROM public.keluarga
  WHERE UPPER(TRIM(invite_code)) = v_clean_code;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Kode undangan tidak ditemukan. Pastikan huruf dan angka sudah benar.'
    );
  END IF;

  -- Daftarkan user ke tabel members sebagai member
  INSERT INTO public.members (
    id,
    keluarga_id,
    display_name,
    role
  ) VALUES (
    v_user_id,
    v_keluarga_id,
    COALESCE(NULLIF(TRIM(p_display_name), ''), 'Anggota'),
    'member'
  )
  ON CONFLICT (id) DO UPDATE
  SET keluarga_id = v_keluarga_id,
      display_name = COALESCE(NULLIF(TRIM(p_display_name), ''), members.display_name),
      role = 'member',
      updated_at = NOW();

  -- Pastikan ada di tabel users
  INSERT INTO public.users (id, name, role)
  VALUES (v_user_id, COALESCE(NULLIF(TRIM(p_display_name), ''), 'Anggota'), 'istri')
  ON CONFLICT (id) DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'keluarga_id', v_keluarga_id,
    'nama_keluarga', v_keluarga_name
  );
END;
$$;

-- 17. RPC KELOLA ANGGOTA: UPDATE NAMA PANGGILAN, PERAN, & STATUS KELUARGA
DROP FUNCTION IF EXISTS public.update_family_member(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.update_family_member(UUID, TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.update_family_member(
  p_member_id UUID,
  p_display_name TEXT,
  p_role TEXT,
  p_status_keluarga TEXT DEFAULT 'suami'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_caller_keluarga_id UUID;
  v_caller_role TEXT;
  v_target_keluarga_id UUID;
  v_target_current_role TEXT;
  v_admin_count INT;
  v_clean_name TEXT;
  v_clean_role TEXT;
  v_clean_status TEXT;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Akses ditolak: Anda harus login terlebih dahulu.';
  END IF;

  v_clean_name := TRIM(p_display_name);
  IF v_clean_name = '' THEN
    RAISE EXCEPTION 'Nama panggilan tidak boleh kosong.';
  END IF;

  v_clean_role := LOWER(TRIM(p_role));
  IF v_clean_role NOT IN ('admin', 'member') THEN
    RAISE EXCEPTION 'Peran tidak valid. Pilihan: admin atau member.';
  END IF;

  v_clean_status := LOWER(TRIM(COALESCE(p_status_keluarga, 'suami')));
  IF v_clean_status NOT IN ('suami', 'istri', 'anak') THEN
    v_clean_status := 'suami';
  END IF;

  -- Cek profil pemanggil
  SELECT keluarga_id, role INTO v_caller_keluarga_id, v_caller_role
  FROM public.members
  WHERE id = v_caller_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profil keluarga pemanggil tidak ditemukan.';
  END IF;

  -- Cek profil target anggota
  SELECT keluarga_id, role INTO v_target_keluarga_id, v_target_current_role
  FROM public.members
  WHERE id = p_member_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Anggota tidak ditemukan di keluarga.';
  END IF;

  IF v_target_keluarga_id <> v_caller_keluarga_id THEN
    RAISE EXCEPTION 'Akses ditolak: Anggota bukan bagian dari keluarga Anda.';
  END IF;

  -- Validasi perubahan role: hanya Admin yang boleh mengubah role!
  IF v_clean_role <> v_target_current_role THEN
    IF v_caller_role <> 'admin' THEN
      RAISE EXCEPTION 'Hanya Admin yang berhak mengubah peran (role) anggota keluarga.';
    END IF;

    -- Jika menurunkan admin menjadi member: pastikan minimal ada 1 admin lain!
    IF v_target_current_role = 'admin' AND v_clean_role = 'member' THEN
      SELECT COUNT(*) INTO v_admin_count
      FROM public.members
      WHERE keluarga_id = v_target_keluarga_id AND role = 'admin';

      IF v_admin_count <= 1 THEN
        RAISE EXCEPTION 'Keluarga harus memiliki minimal satu Admin. Tunjuk anggota lain sebagai Admin terlebih dahulu.';
      END IF;
    END IF;
  END IF;

  -- Validasi perubahan nama atau status: Admin boleh ubah siapa saja, member hanya boleh ubah profil sendiri
  IF v_caller_id <> p_member_id AND v_caller_role <> 'admin' THEN
    RAISE EXCEPTION 'Anda hanya dapat mengubah profil Anda sendiri.';
  END IF;

  -- Update tabel members
  UPDATE public.members
  SET display_name = v_clean_name,
      role = v_clean_role,
      status_keluarga = v_clean_status,
      updated_at = NOW()
  WHERE id = p_member_id;

  -- Update tabel users jika ada
  UPDATE public.users
  SET name = v_clean_name,
      role = CASE WHEN v_clean_status = 'istri' THEN 'istri' ELSE 'suami' END
  WHERE id = p_member_id;

  RETURN jsonb_build_object(
    'success', true,
    'member_id', p_member_id,
    'display_name', v_clean_name,
    'role', v_clean_role,
    'status_keluarga', v_clean_status
  );
END;
$$;

-- 18. RPC KELOLA ANGGOTA: KELUARKAN ANGGOTA DARI KELUARGA
DROP FUNCTION IF EXISTS public.remove_family_member(UUID);
CREATE OR REPLACE FUNCTION public.remove_family_member(
  p_member_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_caller_keluarga_id UUID;
  v_caller_role TEXT;
  v_target_keluarga_id UUID;
  v_target_role TEXT;
  v_admin_count INT;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Akses ditolak: Anda harus login terlebih dahulu.';
  END IF;

  IF v_caller_id = p_member_id THEN
    RAISE EXCEPTION 'Untuk meninggalkan keluarga sendiri, gunakan fungsi Keluar dari Keluarga.';
  END IF;

  SELECT keluarga_id, role INTO v_caller_keluarga_id, v_caller_role
  FROM public.members
  WHERE id = v_caller_id;

  IF v_caller_role <> 'admin' THEN
    RAISE EXCEPTION 'Hanya Admin yang berhak mengeluarkan anggota dari keluarga.';
  END IF;

  SELECT keluarga_id, role INTO v_target_keluarga_id, v_target_role
  FROM public.members
  WHERE id = p_member_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Anggota tidak ditemukan.';
  END IF;

  IF v_target_keluarga_id <> v_caller_keluarga_id THEN
    RAISE EXCEPTION 'Akses ditolak: Anggota bukan bagian dari keluarga Anda.';
  END IF;

  -- Jika target adalah admin, pastikan masih ada admin lain
  IF v_target_role = 'admin' THEN
    SELECT COUNT(*) INTO v_admin_count
    FROM public.members
    WHERE keluarga_id = v_target_keluarga_id AND role = 'admin';

    IF v_admin_count <= 1 THEN
      RAISE EXCEPTION 'Tidak dapat mengeluarkan satu-satunya Admin keluarga.';
    END IF;
  END IF;

  -- Hapus dari members (transaksi keuangan tetap tersimpan di tabel transactions)
  DELETE FROM public.members WHERE id = p_member_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Anggota berhasil dikeluarkan dari keluarga.'
  );
END;
$$;

-- 19. RPC KELOLA ANGGOTA: KELUAR DARI KELUARGA SENDIRI (LEAVE FAMILY)
DROP FUNCTION IF EXISTS public.leave_family();
CREATE OR REPLACE FUNCTION public.leave_family()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_caller_keluarga_id UUID;
  v_caller_role TEXT;
  v_admin_count INT;
  v_member_count INT;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Akses ditolak: Anda harus login terlebih dahulu.';
  END IF;

  SELECT keluarga_id, role INTO v_caller_keluarga_id, v_caller_role
  FROM public.members
  WHERE id = v_caller_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', true, 'message', 'Anda tidak terdaftar di keluarga manapun.');
  END IF;

  -- Cek jumlah total anggota dan admin
  SELECT COUNT(*) INTO v_member_count
  FROM public.members
  WHERE keluarga_id = v_caller_keluarga_id;

  -- Jika user adalah admin dan ada anggota lain, dia tidak boleh pergi tanpa menunjuk admin baru
  IF v_caller_role = 'admin' AND v_member_count > 1 THEN
    SELECT COUNT(*) INTO v_admin_count
    FROM public.members
    WHERE keluarga_id = v_caller_keluarga_id AND role = 'admin';

    IF v_admin_count <= 1 THEN
      RAISE EXCEPTION 'Anda adalah satu-satunya Admin. Tunjuk anggota lain sebagai Admin terlebih dahulu sebelum keluar dari keluarga.';
    END IF;
  END IF;

  -- Hapus membership user ini
  DELETE FROM public.members WHERE id = v_caller_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Anda telah berhasil keluar dari keluarga.'
  );
END;
$$;


