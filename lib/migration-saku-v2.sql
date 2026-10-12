-- ═══════════════════════════════════════════════════════
-- Migration: Saku v2 — Saku-Pos Link & Borrow System
-- Jalankan di Supabase SQL Editor
-- ═══════════════════════════════════════════════════════

-- 1. Tambah kolom ke tabel children (rename konsep ke "saku")
ALTER TABLE children
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'standalone'
    CHECK (type IN ('standalone', 'linked')),
  ADD COLUMN IF NOT EXISTS linked_pos_id UUID REFERENCES pos(id) ON DELETE SET NULL;

-- 2. Expand check constraint untuk child_transactions type
--    Hapus constraint lama, tambah yang baru dengan tipe tambahan
ALTER TABLE child_transactions
  DROP CONSTRAINT IF EXISTS child_transactions_type_check;

ALTER TABLE child_transactions
  ADD CONSTRAINT child_transactions_type_check
    CHECK (type IN ('in', 'out', 'cycle_surplus', 'cycle_deficit', 'withdraw_for_pos', 'return_to_saku'));

-- 3. Tambah kolom referensi ke child_transactions
ALTER TABLE child_transactions
  ADD COLUMN IF NOT EXISTS ref_cycle_id UUID REFERENCES cycles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ref_transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL;

-- 4. Tambah kolom ke transactions untuk mencatat penarikan saku
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS saku_id UUID REFERENCES children(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS saku_withdraw_amount BIGINT DEFAULT 0;

-- ═══ Verifikasi ═══
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'children';
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'child_transactions';
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'transactions';
