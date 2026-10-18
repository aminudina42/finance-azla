-- ═══════════════════════════════════════════════════════════════
-- Migration v12: Kasir & Harga Modal (Cost Price)
-- Menambahkan kolom cost_price pada receipt_items dan total_cost pada receipts
-- Jalankan file ini di Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1. Tambah kolom cost_price ke receipt_items (harga modal satuan)
ALTER TABLE public.receipt_items
  ADD COLUMN IF NOT EXISTS cost_price NUMERIC(15, 2) NOT NULL DEFAULT 0;

-- 2. Tambah kolom total_cost ke receipts (total modal transaksi)
ALTER TABLE public.receipts
  ADD COLUMN IF NOT EXISTS total_cost NUMERIC(15, 2) NOT NULL DEFAULT 0;

-- 3. Hitung ulang total_cost untuk transaksi yang sudah ada (jika ada)
UPDATE public.receipts r
SET total_cost = COALESCE((
  SELECT SUM(COALESCE(ri.cost_price, 0) * COALESCE(ri.quantity, 1))
  FROM public.receipt_items ri
  WHERE ri.receipt_id = r.id
), 0)
WHERE r.total_cost IS NULL;

-- 4. Beri komentar pada kolom untuk dokumentasi
COMMENT ON COLUMN public.receipt_items.cost_price IS 'Harga modal/beli satuan item (tidak dicetak di struk pelanggan)';
COMMENT ON COLUMN public.receipts.total_cost IS 'Total modal transaksi kasir untuk kalkulasi laba dan rekap';

