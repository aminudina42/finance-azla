-- ═══════════════════════════════════════════════════════════════════════
-- CatatKeluarga — Migration v19: Fitur Lapor Bug & Kirim Saran (Feedback)
-- Integrasi Kanban Notion Board
-- File: lib/migration-v19-user-feedback.sql
-- ═══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- BAGIAN 1: TABEL USER_FEEDBACKS
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keluarga_id UUID REFERENCES public.keluarga(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name TEXT NOT NULL DEFAULT '',
  user_email TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL CHECK (type IN ('bug', 'saran', 'pertanyaan')) DEFAULT 'bug',
  priority TEXT NOT NULL CHECK (priority IN ('High', 'Medium', 'Low')) DEFAULT 'Medium',
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  steps_to_reproduce TEXT,
  current_url TEXT,
  app_version TEXT DEFAULT 'v1.0.0',
  device_info JSONB DEFAULT '{}'::jsonb,
  attachment_url TEXT,
  status TEXT NOT NULL CHECK (status IN ('baru', 'ditinjau', 'proses', 'selesai', 'ditolak')) DEFAULT 'baru',
  admin_notes TEXT,
  
  -- Kolom Tracking Sinkronisasi Notion
  notion_page_id TEXT,
  notion_page_url TEXT,
  notion_sync_status TEXT NOT NULL CHECK (notion_sync_status IN ('pending', 'synced', 'failed', 'disabled')) DEFAULT 'pending',
  notion_sync_error TEXT,
  notion_synced_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indeks untuk performa query
CREATE INDEX IF NOT EXISTS idx_user_feedbacks_user_id ON public.user_feedbacks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feedbacks_created_at ON public.user_feedbacks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_feedbacks_sync_status ON public.user_feedbacks(notion_sync_status);

-- ─────────────────────────────────────────────────────────────────────
-- BAGIAN 2: ROW LEVEL SECURITY (RLS)
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.user_feedbacks ENABLE ROW LEVEL SECURITY;

-- 1. Insert: Hanya user terautentikasi yang boleh mengirim feedback
DROP POLICY IF EXISTS "feedbacks_insert_authenticated" ON public.user_feedbacks;
CREATE POLICY "feedbacks_insert_authenticated" ON public.user_feedbacks
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 2. Select: Pengguna bisa melihat laporannya sendiri; Superadmin bisa melihat semua laporan
DROP POLICY IF EXISTS "feedbacks_select_own_or_superadmin" ON public.user_feedbacks;
CREATE POLICY "feedbacks_select_own_or_superadmin" ON public.user_feedbacks
  FOR SELECT USING (auth.uid() = user_id OR public.is_superadmin());

-- 3. Update & Delete: Hanya Superadmin yang berhak mengedit / menghapus status feedback
DROP POLICY IF EXISTS "feedbacks_update_superadmin" ON public.user_feedbacks;
CREATE POLICY "feedbacks_update_superadmin" ON public.user_feedbacks
  FOR UPDATE USING (public.is_superadmin()) WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS "feedbacks_delete_superadmin" ON public.user_feedbacks;
CREATE POLICY "feedbacks_delete_superadmin" ON public.user_feedbacks
  FOR DELETE USING (public.is_superadmin());

-- ─────────────────────────────────────────────────────────────────────
-- BAGIAN 3: SUPABASE STORAGE BUCKET (FEEDBACKS)
-- ─────────────────────────────────────────────────────────────────────

-- Buat bucket feedbacks jika belum ada (Public read agar bisa diakses oleh Notion API)
INSERT INTO storage.buckets (id, name, public)
VALUES ('feedbacks', 'feedbacks', true)
ON CONFLICT (id) DO NOTHING;

-- Policy Storage: User authenticated bisa upload screenshot ke folder feedbacks
DROP POLICY IF EXISTS "feedbacks_storage_insert_authenticated" ON storage.objects;
CREATE POLICY "feedbacks_storage_insert_authenticated" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'feedbacks' AND
    auth.role() = 'authenticated'
  );

-- Policy Storage: Siapapun (publik) bisa baca gambar screenshot
DROP POLICY IF EXISTS "feedbacks_storage_select_public" ON storage.objects;
CREATE POLICY "feedbacks_storage_select_public" ON storage.objects
  FOR SELECT USING (bucket_id = 'feedbacks');

-- ─────────────────────────────────────────────────────────────────────
-- BAGIAN 4: SEED GLOBAL SETTINGS (ICON MENU LAPOR)
-- ─────────────────────────────────────────────────────────────────────

INSERT INTO public.global_settings (key, value) VALUES
  ('menu_icon_lapor', '')
ON CONFLICT (key) DO NOTHING;

