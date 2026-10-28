-- ═══════════════════════════════════════════════════════════════════════
-- CatatKeluarga — Migration v21: Comprehensive Security Hardening
-- File: lib/migration-v21-security-hardening.sql
-- 
-- Perbaikan Keamanan:
-- 1. SCR-001: Peningkatan Entropi Kode Undangan (CSPRNG) & Proteksi Brute-force
-- 2. SCR-003: Prosedur Transaksi Medis Atomik (ACID) record_health_expense_tx
-- 3. Multi-Tenant Auto-Set Trigger pada tabel Health Tracking
-- ═══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- BAGIAN 1: TABEL PENCATATAN PERCOBAAN GAGAL (BRUTE-FORCE THROTTLE)
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.invite_code_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  attempt_time TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_invite_attempts_user_time 
  ON public.invite_code_attempts(user_id, attempt_time DESC);

ALTER TABLE public.invite_code_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invite_attempts_own_read" ON public.invite_code_attempts;
CREATE POLICY "invite_attempts_own_read" ON public.invite_code_attempts
  FOR ALL USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────
-- BAGIAN 2: UPDATE RPC CREATE_NEW_KELUARGA (CSPRNG gen_random_uuid)
-- ─────────────────────────────────────────────────────────────────────

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

  -- Buat kode undangan unik CSPRNG 8 karakter (4.29 miliar kombinasi unik)
  v_invite_code := 'AZLA-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

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

-- ─────────────────────────────────────────────────────────────────────
-- BAGIAN 3: UPDATE RPC JOIN_KELUARGA_BY_CODE DENGAN BRUTE-FORCE THROTTLE
-- ─────────────────────────────────────────────────────────────────────

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
  v_recent_attempts INT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Akses ditolak: Anda harus login terlebih dahulu.';
  END IF;

  -- Cek batas percobaan gagal dalam 15 menit terakhir (maksimal 5 kali)
  SELECT count(*) INTO v_recent_attempts
  FROM public.invite_code_attempts
  WHERE user_id = v_user_id 
    AND attempt_time > (now() - interval '15 minutes');

  IF v_recent_attempts >= 5 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Terlalu banyak percobaan kode yang salah. Harap tunggu 15 menit sebelum mencoba kembali.'
    );
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
    -- Catat percobaan gagal untuk proteksi brute-force
    INSERT INTO public.invite_code_attempts (user_id, attempt_time)
    VALUES (v_user_id, now());

    RETURN jsonb_build_object(
      'success', false,
      'message', 'Kode undangan tidak ditemukan. Pastikan huruf dan angka sudah benar.'
    );
  END IF;

  -- Jika berhasil, bersihkan catatan percobaan gagal
  DELETE FROM public.invite_code_attempts WHERE user_id = v_user_id;

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

-- ─────────────────────────────────────────────────────────────────────
-- BAGIAN 4: RPC ATOMIK RECORD_HEALTH_EXPENSE_TX (ACID Transaction)
-- ─────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.record_health_expense_tx(
  p_medical_record_id UUID,
  p_cost BIGINT,
  p_finance_pos_id UUID,
  p_user_id UUID,
  p_user_name TEXT,
  p_user_role TEXT,
  p_illness_name TEXT,
  p_doctor_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_my_keluarga_id UUID;
  v_pos_keluarga_id UUID;
  v_pos_name TEXT;
  v_pos_icon TEXT;
  v_tx_id UUID := NULL;
  v_desc TEXT;
BEGIN
  v_my_keluarga_id := public.get_my_keluarga_id();
  IF v_my_keluarga_id IS NULL THEN
    RAISE EXCEPTION 'Akses ditolak: Profil keluarga tidak ditemukan.';
  END IF;

  -- Validasi pos keuangan milik keluarga pengguna
  SELECT name, icon, keluarga_id INTO v_pos_name, v_pos_icon, v_pos_keluarga_id
  FROM public.pos
  WHERE id = p_finance_pos_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pos keuangan dengan ID % tidak ditemukan.', p_finance_pos_id;
  END IF;

  IF v_pos_keluarga_id <> v_my_keluarga_id THEN
    RAISE EXCEPTION 'Akses ditolak: Pos keuangan bukan milik keluarga Anda.';
  END IF;

  v_desc := 'Biaya Berobat: ' || p_illness_name;
  IF p_doctor_name IS NOT NULL AND TRIM(p_doctor_name) <> '' THEN
    v_desc := v_desc || ' (' || TRIM(p_doctor_name) || ')';
  END IF;

  -- 1. Buat catatan transaksi pengeluaran
  INSERT INTO public.transactions (
    keluarga_id,
    amount,
    type,
    pos_id,
    pos_name,
    pos_icon,
    user_id,
    user_name,
    user_role,
    description
  ) VALUES (
    v_my_keluarga_id,
    p_cost,
    'expense',
    p_finance_pos_id,
    COALESCE(v_pos_name, 'Kesehatan'),
    COALESCE(v_pos_icon, '💊'),
    p_user_id,
    COALESCE(p_user_name, 'Anggota'),
    COALESCE(p_user_role, 'anak'),
    v_desc
  ) RETURNING id INTO v_tx_id;

  -- 2. Potong saldo pos secara atomik di database
  UPDATE public.pos
  SET current_balance = current_balance - p_cost
  WHERE id = p_finance_pos_id;

  -- 3. Tautkan transaksi ke rekam medis jika p_medical_record_id diberikan
  IF p_medical_record_id IS NOT NULL THEN
    UPDATE public.health_medical_records
    SET transaction_id = v_tx_id,
        cost_amount = p_cost,
        updated_at = NOW()
    WHERE id = p_medical_record_id 
      AND keluarga_id = v_my_keluarga_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_tx_id
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- BAGIAN 5: TRIGGER MULTI-TENANT OTOMATIS PADA TABEL KESEHATAN
-- ─────────────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trigger_auto_set_keluarga_id ON public.health_family_members;
CREATE TRIGGER trigger_auto_set_keluarga_id
BEFORE INSERT ON public.health_family_members
FOR EACH ROW EXECUTE FUNCTION public.auto_set_keluarga_id();

DROP TRIGGER IF EXISTS trigger_auto_set_keluarga_id ON public.health_growth_logs;
CREATE TRIGGER trigger_auto_set_keluarga_id
BEFORE INSERT ON public.health_growth_logs
FOR EACH ROW EXECUTE FUNCTION public.auto_set_keluarga_id();

DROP TRIGGER IF EXISTS trigger_auto_set_keluarga_id ON public.health_vital_logs;
CREATE TRIGGER trigger_auto_set_keluarga_id
BEFORE INSERT ON public.health_vital_logs
FOR EACH ROW EXECUTE FUNCTION public.auto_set_keluarga_id();

DROP TRIGGER IF EXISTS trigger_auto_set_keluarga_id ON public.health_medical_records;
CREATE TRIGGER trigger_auto_set_keluarga_id
BEFORE INSERT ON public.health_medical_records
FOR EACH ROW EXECUTE FUNCTION public.auto_set_keluarga_id();

DROP TRIGGER IF EXISTS trigger_auto_set_keluarga_id ON public.health_medications;
CREATE TRIGGER trigger_auto_set_keluarga_id
BEFORE INSERT ON public.health_medications
FOR EACH ROW EXECUTE FUNCTION public.auto_set_keluarga_id();

DROP TRIGGER IF EXISTS trigger_auto_set_keluarga_id ON public.health_vital_logs;
CREATE TRIGGER trigger_auto_set_keluarga_id
BEFORE INSERT ON public.health_vital_logs
FOR EACH ROW EXECUTE FUNCTION public.auto_set_keluarga_id();
-- ─────────────────────────────────────────────────────────────────────
-- BAGIAN 6: ROBUST SUPERADMIN & NOTION FEEDBACK SYNC FIX
-- ─────────────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trigger_auto_set_keluarga_id ON public.health_medical_records;
CREATE TRIGGER trigger_auto_set_keluarga_id
BEFORE INSERT ON public.health_medical_records
FOR EACH ROW EXECUTE FUNCTION public.auto_set_keluarga_id();
-- 1. Auto-seed akun amndnaziz98@gmail.com ke public.superadmins jika sudah terdaftar di auth.users
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'amndnaziz98@gmail.com'
  LIMIT 1;

DROP TRIGGER IF EXISTS trigger_auto_set_keluarga_id ON public.health_medications;
CREATE TRIGGER trigger_auto_set_keluarga_id
BEFORE INSERT ON public.health_medications
FOR EACH ROW EXECUTE FUNCTION public.auto_set_keluarga_id();
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.superadmins (user_id)
    VALUES (v_user_id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
END $$;

-- 2. Tingkatkan keandalan RPC is_superadmin() agar tetap mengenali email fallback
--    meskipun baris tabel superadmins belum terisi atau baru saja dibuat
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.superadmins WHERE user_id = auth.uid()
    UNION
    SELECT 1 FROM auth.users WHERE id = auth.uid() AND email = 'amndnaziz98@gmail.com'
  );
$$;

-- 3. Fungsi RPC claim_superadmin() yang dipanggil oleh server saat superadmin terverifikasi
CREATE OR REPLACE FUNCTION public.claim_superadmin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
  v_email TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;

  IF v_email = 'amndnaziz98@gmail.com' THEN
    INSERT INTO public.superadmins (user_id)
    VALUES (v_user_id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- 4. Pastikan user_feedbacks RLS mengizinkan Superadmin melihat & memperbarui seluruh feedback
ALTER TABLE public.user_feedbacks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feedbacks_select_own_or_superadmin" ON public.user_feedbacks;
CREATE POLICY "feedbacks_select_own_or_superadmin" ON public.user_feedbacks
  FOR SELECT USING (auth.uid() = user_id OR public.is_superadmin());

DROP POLICY IF EXISTS "feedbacks_update_superadmin" ON public.user_feedbacks;
CREATE POLICY "feedbacks_update_superadmin" ON public.user_feedbacks
  FOR UPDATE USING (public.is_superadmin()) WITH CHECK (public.is_superadmin());


