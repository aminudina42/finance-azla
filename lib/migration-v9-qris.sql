-- lib/migration-v9-qris.sql
-- Deskripsi: Tambah kolom konfigurasi QRIS ke tabel stores

ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS qris_active BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS qris_data TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS qris_name TEXT DEFAULT '';
