-- =====================================================================
-- Catat Keluarga — Migration v22: Dynamic Invite Code Prefix by Family Name
-- =====================================================================
-- 1. Mengubah generator kode undangan keluarga agar menggunakan prefix dinamis
--    berdasarkan nama keluarga (misal: "Keluarga Pratama" -> "PRATAMA-XXXXXXXX").
-- 2. Mempertahankan entropy CSPRNG 8 karakter heksadesimal (~4.29 miliar kombinasi unik).
-- 3. Menyediakan RPC regenerate_invite_code() untuk admin keluarga me-refresh kode.
-- 4. Menyediakan script migrasi data opsional bagi keluarga lama berawalan 'AZLA-'.
-- =====================================================================

-- ─────────────────────────────────────────────────────────────────────
-- BAGIAN 1: PERBARUI RPC CREATE_NEW_KELUARGA
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
  v_clean_name TEXT;
  v_prefix TEXT;
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

  -- 1. Bersihkan nama keluarga untuk dijadikan prefix dinamis
  -- Buang kata umum di awal seperti "Keluarga", "Family", atau "The" jika diikuti spasi
  v_clean_name := TRIM(REGEXP_REPLACE(p_nama_keluarga, '^(keluarga|family|the)\s+', '', 'i'));
  
  -- Jika setelah dibersihkan ternyata kosong (misal nama diinput hanya "Keluarga"), gunakan nama awal
  IF v_clean_name = '' THEN
    v_clean_name := TRIM(p_nama_keluarga);
  END IF;

  -- 2. Ambil hanya karakter alfanumerik (A-Z, 0-9) dan jadikan UPPERCASE
  v_prefix := UPPER(REGEXP_REPLACE(v_clean_name, '[^a-zA-Z0-9]', '', 'g'));

  -- 3. Batasi panjang prefix maksimal 8 karakter
  v_prefix := SUBSTRING(v_prefix FROM 1 FOR 8);

  -- 4. Fallback jika nama hanya berupa simbol atau kurang dari 2 karakter
  IF v_prefix IS NULL OR LENGTH(v_prefix) < 2 THEN
    v_prefix := 'CK';
  END IF;

  -- 5. Buat kode undangan unik CSPRNG 8 karakter (looping defensif untuk mencegah collision)
  LOOP
    v_invite_code := v_prefix || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.keluarga WHERE invite_code = v_invite_code);
  END LOOP;

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
-- BAGIAN 2: RPC REGENERATE_INVITE_CODE UNTUK ADMIN KELUARGA
-- ─────────────────────────────────────────────────────────────────────
-- Memungkinkan Admin keluarga untuk me-refresh/mengubah kode undangannya
-- mengikuti prefix nama keluarga saat ini.

CREATE OR REPLACE FUNCTION public.regenerate_invite_code()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_keluarga_id UUID;
  v_role TEXT;
  v_nama_keluarga TEXT;
  v_clean_name TEXT;
  v_prefix TEXT;
  v_new_code TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Akses ditolak: Anda harus login terlebih dahulu.';
  END IF;

  -- Ambil data keluarga dan role user saat ini
  SELECT m.keluarga_id, m.role, k.nama_keluarga
  INTO v_keluarga_id, v_role, v_nama_keluarga
  FROM public.members m
  JOIN public.keluarga k ON k.id = m.keluarga_id
  WHERE m.id = v_user_id;

  IF v_keluarga_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Anda belum terdaftar dalam keluarga.');
  END IF;

  -- Hanya admin yang boleh meregenerasi kode undangan
  IF v_role <> 'admin' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Hanya admin keluarga yang dapat memperbarui kode undangan.');
  END IF;

  -- 1. Bersihkan nama keluarga
  v_clean_name := TRIM(REGEXP_REPLACE(v_nama_keluarga, '^(keluarga|family|the)\s+', '', 'i'));
  IF v_clean_name = '' THEN
    v_clean_name := TRIM(v_nama_keluarga);
  END IF;

  -- 2. Ambil karakter alfanumerik (A-Z, 0-9) dan jadikan UPPERCASE
  v_prefix := UPPER(REGEXP_REPLACE(v_clean_name, '[^a-zA-Z0-9]', '', 'g'));
  v_prefix := SUBSTRING(v_prefix FROM 1 FOR 8);

  -- 3. Fallback jika nama terlalu pendek
  IF v_prefix IS NULL OR LENGTH(v_prefix) < 2 THEN
    v_prefix := 'CK';
  END IF;

  -- 4. Generate kode unik baru
  LOOP
    v_new_code := v_prefix || '-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.keluarga WHERE invite_code = v_new_code);
  END LOOP;

  -- 5. Update record keluarga
  UPDATE public.keluarga
  SET invite_code = v_new_code
  WHERE id = v_keluarga_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Kode undangan keluarga berhasil diperbarui!',
    'invite_code', v_new_code
  );
END;
$$;

-- Berikan hak eksekusi ke authenticated user
GRANT EXECUTE ON FUNCTION public.create_new_keluarga(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.regenerate_invite_code() TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- BAGIAN 3 (OPSIONAL): UPDATE KELUARGA YANG MASIH BERAWALAN 'AZLA-'
-- ─────────────────────────────────────────────────────────────────────
-- Hapus tanda komentar jika ingin langsung mengubah kode keluarga yang ada di database:
/*
DO $$
DECLARE
  rec RECORD;
  v_clean_name TEXT;
  v_prefix TEXT;
  v_new_code TEXT;
BEGIN
  FOR rec IN SELECT id, nama_keluarga FROM public.keluarga WHERE invite_code LIKE 'AZLA-%' LOOP
    v_clean_name := TRIM(REGEXP_REPLACE(rec.nama_keluarga, '^(keluarga|family|the)\s+', '', 'i'));
    IF v_clean_name = '' THEN
      v_clean_name := TRIM(rec.nama_keluarga);
    END IF;

    v_prefix := UPPER(REGEXP_REPLACE(v_clean_name, '[^a-zA-Z0-9]', '', 'g'));
    v_prefix := SUBSTRING(v_prefix FROM 1 FOR 8);

    IF v_prefix IS NULL OR LENGTH(v_prefix) < 2 THEN
      v_prefix := 'CK';
    END IF;

    LOOP
      v_new_code := v_prefix || '-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 8));
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.keluarga WHERE invite_code = v_new_code);
    END LOOP;

    UPDATE public.keluarga
    SET invite_code = v_new_code
    WHERE id = rec.id;
  END LOOP;
END $$;
*/
