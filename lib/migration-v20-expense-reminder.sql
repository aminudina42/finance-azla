-- ═══════════════════════════════════════════════════════════════════════
-- CatatKeluarga — Migration v20: Fitur Reminder Pencatatan Keuangan
-- Penambahan Kolom Gender pada Anggota Keluarga & Update RPC Pengelolaan
-- File: lib/migration-v20-expense-reminder.sql
-- Jalankan file SQL ini di Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- 1. TAMBAH KOLOM GENDER PADA TABEL MEMBERS
-- ─────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  -- Tambahkan kolom gender jika belum ada
  ALTER TABLE public.members 
  ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'male' CHECK (gender IN ('male', 'female'));
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Sinkronkan data default awal:
-- Istri -> female
UPDATE public.members
SET gender = 'female'
WHERE status_keluarga = 'istri' AND (gender IS NULL OR gender = 'male');

-- Sinkronkan dari tabel kesehatan jika data anggota sudah memiliki gender di health_family_members
UPDATE public.members m
SET gender = hfm.gender
FROM public.health_family_members hfm
WHERE hfm.auth_member_id = m.id AND hfm.gender IN ('male', 'female');

-- ─────────────────────────────────────────────────────────────────────
-- 2. UPDATE RPC KELOLA ANGGOTA (update_family_member)
-- ─────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_family_member(
  p_member_id UUID,
  p_display_name TEXT,
  p_role TEXT,
  p_status_keluarga TEXT DEFAULT 'suami',
  p_gender TEXT DEFAULT NULL
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
  v_target_current_gender TEXT;
  v_admin_count INT;
  v_clean_name TEXT;
  v_clean_role TEXT;
  v_clean_status TEXT;
  v_clean_gender TEXT;
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

  -- Tentukan gender yang bersih
  IF p_gender IS NOT NULL AND LOWER(TRIM(p_gender)) IN ('male', 'female') THEN
    v_clean_gender := LOWER(TRIM(p_gender));
  ELSIF v_clean_status = 'istri' THEN
    v_clean_gender := 'female';
  ELSIF v_clean_status = 'suami' THEN
    v_clean_gender := 'male';
  ELSE
    v_clean_gender := 'male';
  END IF;

  -- Cek profil pemanggil
  SELECT keluarga_id, role INTO v_caller_keluarga_id, v_caller_role
  FROM public.members
  WHERE id = v_caller_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profil keluarga pemanggil tidak ditemukan.';
  END IF;

  -- Cek profil target anggota
  SELECT keluarga_id, role, gender INTO v_target_keluarga_id, v_target_current_role, v_target_current_gender
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
      gender = v_clean_gender,
      updated_at = NOW()
  WHERE id = p_member_id;

  -- Update tabel users jika ada
  UPDATE public.users
  SET name = v_clean_name,
      role = CASE WHEN v_clean_status = 'istri' THEN 'istri' ELSE 'suami' END
  WHERE id = p_member_id;

  -- Sinkronkan juga ke tabel health_family_members jika ada data terkait
  UPDATE public.health_family_members
  SET name = v_clean_name,
      relation_role = v_clean_status,
      gender = v_clean_gender,
      updated_at = NOW()
  WHERE auth_member_id = p_member_id;

  RETURN jsonb_build_object(
    'success', true,
    'member_id', p_member_id,
    'display_name', v_clean_name,
    'role', v_clean_role,
    'status_keluarga', v_clean_status,
    'gender', v_clean_gender
  );
END;
$$;

