-- ═══════════════════════════════════════════════════════════════════════
-- CatatKeluarga — Migration v18: Superadmin & Traktir Developer
-- File: lib/migration-v18-superadmin-traktir.sql
-- Jalankan SQL ini di Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- BAGIAN 1: TABEL SUPERADMIN (Global, tidak terikat keluarga)
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.superadmins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Aktifkan RLS
ALTER TABLE public.superadmins ENABLE ROW LEVEL SECURITY;

-- Policy: Semua authenticated user bisa baca (untuk cek status sendiri)
DROP POLICY IF EXISTS "superadmins_select_self" ON public.superadmins;
CREATE POLICY "superadmins_select_self" ON public.superadmins
  FOR SELECT USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────
-- BAGIAN 2: TABEL GLOBAL_SETTINGS (Terpisah dari app_settings per-keluarga)
-- app_settings sudah dipakai untuk per-keluarga (unique keluarga_id + key)
-- global_settings untuk konten yang sama untuk SEMUA user
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.global_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Aktifkan RLS
ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;

-- Policy READ: Semua authenticated user bisa baca global settings
DROP POLICY IF EXISTS "global_settings_read_authenticated" ON public.global_settings;
CREATE POLICY "global_settings_read_authenticated" ON public.global_settings
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Policy WRITE: Hanya superadmin via RPC (tidak ada direct write policy)
-- Tulis dilakukan lewat RPC upsert_global_setting yang SECURITY DEFINER

-- ─────────────────────────────────────────────────────────────────────
-- BAGIAN 3: SEED DATA DEFAULT GLOBAL_SETTINGS
-- ─────────────────────────────────────────────────────────────────────

INSERT INTO public.global_settings (key, value) VALUES
  -- Konten Traktir Developer
  ('dev_show_qris',      'false'),
  ('dev_qris_url',       ''),
  ('dev_qris_name',      'Developer CatatKeluarga'),
  ('dev_bank_1_enabled', 'false'),
  ('dev_bank_1_name',    'BCA'),
  ('dev_bank_1_account', ''),
  ('dev_bank_1_holder',  ''),
  ('dev_bank_2_enabled', 'false'),
  ('dev_bank_2_name',    'GoPay / OVO'),
  ('dev_bank_2_account', ''),
  ('dev_bank_2_holder',  ''),
  ('dev_bank_3_enabled', 'false'),
  ('dev_bank_3_name',    'BNI'),
  ('dev_bank_3_account', ''),
  ('dev_bank_3_holder',  ''),
  ('dev_message',        'Terima kasih sudah menggunakan CatatKeluarga! ❤️\nAplikasi ini dibuat dengan penuh cinta untuk membantu keluarga Indonesia mengelola keuangan dengan lebih baik.'),
  -- Icon Menu Override (default kosong = pakai icon bawaan)
  ('menu_icon_saku',      ''),
  ('menu_icon_struk',     ''),
  ('menu_icon_hutang',    ''),
  ('menu_icon_dompet',    ''),
  ('menu_icon_kendaraan', ''),
  ('menu_icon_kesehatan', ''),
  ('menu_icon_wisata',    ''),
  ('menu_icon_traktir',   '')
ON CONFLICT (key) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────
-- BAGIAN 4: RPC HELPER FUNCTION — CEK SUPERADMIN STATUS
-- ─────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.superadmins WHERE user_id = auth.uid()
  );
$$;

-- ─────────────────────────────────────────────────────────────────────
-- BAGIAN 5: RPC — UPSERT GLOBAL SETTING (hanya superadmin)
-- Ini adalah satu-satunya cara tulis ke global_settings dari client
-- ─────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.upsert_global_setting(
  p_key TEXT,
  p_value TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  -- Validasi: harus login
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Akses ditolak: Anda harus login terlebih dahulu.';
  END IF;

  -- Validasi: harus superadmin
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya Superadmin yang dapat mengubah pengaturan global.';
  END IF;

  -- Validasi: key tidak boleh kosong
  IF TRIM(p_key) = '' THEN
    RAISE EXCEPTION 'Key pengaturan tidak boleh kosong.';
  END IF;

  -- Validasi: key harus diawali dev_ atau menu_icon_ (whitelist prefix)
  IF NOT (p_key LIKE 'dev_%' OR p_key LIKE 'menu_icon_%') THEN
    RAISE EXCEPTION 'Key "%" tidak diizinkan. Hanya key dengan prefix dev_ atau menu_icon_ yang dapat diubah.', p_key;
  END IF;

  -- Upsert ke global_settings
  INSERT INTO public.global_settings (key, value, updated_by, updated_at)
  VALUES (p_key, p_value, v_user_id, NOW())
  ON CONFLICT (key)
  DO UPDATE SET
    value = EXCLUDED.value,
    updated_by = EXCLUDED.updated_by,
    updated_at = NOW();

  RETURN jsonb_build_object('success', true, 'key', p_key);
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- BAGIAN 6: RPC — UPSERT MULTIPLE GLOBAL SETTINGS SEKALIGUS (batch)
-- ─────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.upsert_global_settings_batch(
  p_settings JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_key TEXT;
  v_value TEXT;
  v_count INT := 0;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Akses ditolak: Anda harus login terlebih dahulu.';
  END IF;

  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya Superadmin yang dapat mengubah pengaturan global.';
  END IF;

  -- Iterasi semua key-value dari JSONB input
  FOR v_key, v_value IN
    SELECT key, value FROM jsonb_each_text(p_settings)
  LOOP
    -- Whitelist prefix
    IF NOT (v_key LIKE 'dev_%' OR v_key LIKE 'menu_icon_%') THEN
      RAISE EXCEPTION 'Key "%" tidak diizinkan.', v_key;
    END IF;

    INSERT INTO public.global_settings (key, value, updated_by, updated_at)
    VALUES (v_key, v_value, v_user_id, NOW())
    ON CONFLICT (key)
    DO UPDATE SET
      value = EXCLUDED.value,
      updated_by = EXCLUDED.updated_by,
      updated_at = NOW();

    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'updated_count', v_count);
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- BAGIAN 7: SEED SUPERADMIN PERTAMA
-- Email: amndnaziz98@gmail.com
-- ─────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Cari user_id berdasarkan email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'amndnaziz98@gmail.com'
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.superadmins (user_id)
    VALUES (v_user_id)
    ON CONFLICT (user_id) DO NOTHING;

    RAISE NOTICE 'Superadmin berhasil didaftarkan: amndnaziz98@gmail.com (ID: %)', v_user_id;
  ELSE
    RAISE WARNING 'User dengan email amndnaziz98@gmail.com belum ditemukan di auth.users. Jalankan ulang setelah login pertama.';
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────
-- BAGIAN 8: Buat Storage Bucket 'developer' untuk upload QRIS
-- (Jalankan via Supabase Dashboard > Storage jika belum ada)
-- ─────────────────────────────────────────────────────────────────────
-- NOTE: Storage bucket tidak bisa dibuat via SQL. Buat manual:
-- 1. Buka Supabase Dashboard > Storage
-- 2. Klik "New Bucket"
-- 3. Name: "developer", Public: YES
-- 4. Allowed MIME types: image/png, image/jpeg, image/webp
-- 5. Max file size: 5MB

