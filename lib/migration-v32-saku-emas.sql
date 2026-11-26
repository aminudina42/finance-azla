-- ═══════════════════════════════════════════════════════════════════════
-- Migration v32: Saku Multi-Aset (Uang & Emas dalam satuan gram)
-- Jalankan di Supabase SQL Editor
--
-- Aturan Bisnis:
-- 1. Setiap Saku (tabel `children`) menyimpan saldo Uang (`balance`, Rp)
--    dan saldo Emas (`gold_balance`, gram) secara terpisah.
-- 2. Emas selalu dalam satuan gram (presisi 4 desimal, NUMERIC(14,4)),
--    tidak dikonversi ke kg, dan tidak boleh negatif (`gold_balance >= 0`).
-- 3. Transaksi emas bersifat mandiri (hanya `in` / `out`), terpisah dari
--    mekanisme defisit/pinjam Pos yang eksklusif untuk aset uang (`cash`).
-- ═══════════════════════════════════════════════════════════════════════

-- 1. Tambah kolom gold_balance ke tabel children (Saku)
ALTER TABLE children
  ADD COLUMN IF NOT EXISTS gold_balance NUMERIC(14, 4) NOT NULL DEFAULT 0;

-- Pastikan constraint gold_balance >= 0 idempoten
ALTER TABLE children
  DROP CONSTRAINT IF EXISTS children_gold_balance_non_negative;

ALTER TABLE children
  ADD CONSTRAINT children_gold_balance_non_negative
    CHECK (gold_balance >= 0);

-- 2. Tambah kolom asset_type & gold_amount ke tabel child_transactions
ALTER TABLE child_transactions
  ADD COLUMN IF NOT EXISTS asset_type TEXT NOT NULL DEFAULT 'cash',
  ADD COLUMN IF NOT EXISTS gold_amount NUMERIC(14, 4) NOT NULL DEFAULT 0;

-- Constraint nilai asset_type
ALTER TABLE child_transactions
  DROP CONSTRAINT IF EXISTS child_transactions_asset_type_check;

ALTER TABLE child_transactions
  ADD CONSTRAINT child_transactions_asset_type_check
    CHECK (asset_type IN ('cash', 'gold'));

-- Constraint gold_amount >= 0
ALTER TABLE child_transactions
  DROP CONSTRAINT IF EXISTS child_transactions_gold_amount_non_negative;

ALTER TABLE child_transactions
  ADD CONSTRAINT child_transactions_gold_amount_non_negative
    CHECK (gold_amount >= 0);

-- Constraint konsistensi: transaksi emas hanya boleh tipe 'in' atau 'out' dengan gold_amount > 0
ALTER TABLE child_transactions
  DROP CONSTRAINT IF EXISTS child_transactions_gold_rules_check;

ALTER TABLE child_transactions
  ADD CONSTRAINT child_transactions_gold_rules_check
    CHECK (
      asset_type = 'cash'
      OR (type IN ('in', 'out') AND gold_amount > 0)
    );

-- 3. Index komposit untuk filter riwayat transaksi Saku per aset
CREATE INDEX IF NOT EXISTS idx_child_transactions_child_asset_created
  ON child_transactions (child_id, asset_type, created_at DESC);

-- ═══ Verifikasi (opsional jalankan manual) ═══
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name IN ('children', 'child_transactions')
--   AND column_name IN ('gold_balance', 'asset_type', 'gold_amount');

-- ═══ Rollback Plan (jika diperlukan) ═══
-- DROP INDEX IF EXISTS idx_child_transactions_child_asset_created;
-- ALTER TABLE child_transactions DROP CONSTRAINT IF EXISTS child_transactions_gold_rules_check;
-- ALTER TABLE child_transactions DROP CONSTRAINT IF EXISTS child_transactions_gold_amount_non_negative;
-- ALTER TABLE child_transactions DROP CONSTRAINT IF EXISTS child_transactions_asset_type_check;
-- ALTER TABLE child_transactions DROP COLUMN IF EXISTS gold_amount;
-- ALTER TABLE child_transactions DROP COLUMN IF EXISTS asset_type;
-- ALTER TABLE children DROP CONSTRAINT IF EXISTS children_gold_balance_non_negative;
-- ALTER TABLE children DROP COLUMN IF EXISTS gold_balance;
