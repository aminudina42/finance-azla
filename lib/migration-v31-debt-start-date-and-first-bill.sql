-- ═══════════════════════════════════════════════════════════════════
-- Dompet Azla / Catat Keluarga — Tanggal Mulai & Jatuh Tempo Angsuran Pertama Pinjaman
-- Migration: lib/migration-v31-debt-start-date-and-first-bill.sql
-- Jalankan SQL ini di Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════

-- 1. Tambah kolom start_date (tanggal pinjaman diajukan/dimulai)
--    dan first_bill_date (tanggal jatuh tempo angsuran pertama)
ALTER TABLE public.debts
ADD COLUMN IF NOT EXISTS start_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS first_bill_date DATE;

-- 2. Beri komentar dokumentasi kolom
COMMENT ON COLUMN public.debts.start_date IS 'Tanggal pengajuan atau pencairan pinjaman/kredit';
COMMENT ON COLUMN public.debts.first_bill_date IS 'Tanggal jatuh tempo angsuran pertama (misal bulan berikutnya)';
