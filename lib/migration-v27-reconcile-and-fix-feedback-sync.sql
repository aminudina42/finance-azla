-- ═══════════════════════════════════════════════════════════════════════
-- CatatKeluarga — Migration v27: One-Time Reconcile & RLS Fix User Feedbacks
-- Menghubungkan tiket yang tersangkut 'pending' dengan kartu Notion yang sudah ada
-- dan memperbaiki RLS policy agar user biasa bisa meng-update status sync tiket miliknya.
-- File: lib/migration-v27-reconcile-and-fix-feedback-sync.sql
-- ═══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- BAGIAN 1: REKONSILIASI 3 LAPORAN BUG YANG TERSANGKUT 'PENDING'
-- ─────────────────────────────────────────────────────────────────────

-- 1. Tiket: Tidak bisa hapus pos (Notion ID: 40ca2b64-4619-8193-a7b8-ee00ac7693fe)
UPDATE public.user_feedbacks
SET
  notion_page_id = '40ca2b64-4619-8193-a7b8-ee00ac7693fe',
  notion_page_url = 'https://notion.so/40ca2b6446198193a7b8ee00ac7693fe',
  notion_sync_status = 'synced',
  status = 'selesai',
  notion_sync_error = NULL,
  notion_synced_at = NOW(),
  updated_at = NOW()
WHERE (title ILIKE '%Tidak bisa hapus pos%' OR title ILIKE '%hapus pos%')
  AND (notion_sync_status = 'pending' OR notion_page_id IS NULL);

-- 2. Tiket: Bug di fitur kendaraan (Notion ID: 40ca2b64-4619-81f2-8a04-f5c12ecc269e)
UPDATE public.user_feedbacks
SET
  notion_page_id = '40ca2b64-4619-81f2-8a04-f5c12ecc269e',
  notion_page_url = 'https://notion.so/40ca2b64461981f28a04f5c12ecc269e',
  notion_sync_status = 'synced',
  status = 'selesai',
  notion_sync_error = NULL,
  notion_synced_at = NOW(),
  updated_at = NOW()
WHERE (title ILIKE '%Bug di fitur kendaraan%' OR title ILIKE '%fitur kendaraan%')
  AND (notion_sync_status = 'pending' OR notion_page_id IS NULL);

-- 3. Tiket: Menu edit (Notion ID: 40ba2b64-4619-8131-885e-e875ccbf9346)
UPDATE public.user_feedbacks
SET
  notion_page_id = '40ba2b64-4619-8131-885e-e875ccbf9346',
  notion_page_url = 'https://notion.so/40ba2b6446198131885ee875ccbf9346',
  notion_sync_status = 'synced',
  status = 'selesai',
  notion_sync_error = NULL,
  notion_synced_at = NOW(),
  updated_at = NOW()
WHERE (title ILIKE '%Menu edit%' OR title ILIKE '%riwayat bensin%')
  AND (notion_sync_status = 'pending' OR notion_page_id IS NULL);

-- ─────────────────────────────────────────────────────────────────────
-- BAGIAN 2: PERBAIKAN RLS POLICY UPDATE USER FEEDBACKS
-- ─────────────────────────────────────────────────────────────────────
-- Kebijakan sebelumnya hanya mengizinkan superadmin untuk UPDATE.
-- Hal ini membuat pengguna biasa yang melapor gagal meng-update kolom
-- notion_sync_status dan notion_page_id setelah tiket dibuat di Notion.
-- Kita ubah agar pemilik laporan dapat meng-update laporannya sendiri
-- (atau superadmin dapat meng-update laporan siapapun).

DROP POLICY IF EXISTS "feedbacks_update_superadmin" ON public.user_feedbacks;
DROP POLICY IF EXISTS "feedbacks_update_own_or_superadmin" ON public.user_feedbacks;

CREATE POLICY "feedbacks_update_own_or_superadmin" ON public.user_feedbacks
  FOR UPDATE 
  USING (auth.uid() = user_id OR public.is_superadmin()) 
  WITH CHECK (auth.uid() = user_id OR public.is_superadmin());

-- ─────────────────────────────────────────────────────────────────────
-- BAGIAN 3: RPC HELPER UNTUK REKONSILIASI OTOMATIS (SECURITY DEFINER)
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.reconcile_feedback_notion(
  p_feedback_id UUID,
  p_notion_page_id TEXT,
  p_notion_page_url TEXT,
  p_status TEXT DEFAULT 'selesai'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_feedbacks
  SET
    notion_page_id = p_notion_page_id,
    notion_page_url = p_notion_page_url,
    notion_sync_status = 'synced',
    status = p_status,
    notion_sync_error = NULL,
    notion_synced_at = NOW(),
    updated_at = NOW()
  WHERE id = p_feedback_id;

  RETURN FOUND;
END;
$$;
