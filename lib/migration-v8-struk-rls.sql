-- ═══════════════════════════════════════════════
-- Dompet Pintar v8 — Disable RLS for Struk Dinamis
-- Jalankan SQL ini di Supabase SQL Editor
-- agar semua user dapat melihat dan mengelola struk
-- ═══════════════════════════════════════════════

-- Disable Row Level Security (RLS) pada tabel Struk & Toko
-- Hal ini memungkinkan semua user (baik suami maupun istri)
-- untuk melihat, membuat, mengedit, dan menghapus struk satu sama lain.
ALTER TABLE receipts DISABLE ROW LEVEL SECURITY;
ALTER TABLE stores DISABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_items DISABLE ROW LEVEL SECURITY;

-- Catatan: Jika di kemudian hari Anda ingin mengaktifkan kembali RLS,
-- Anda dapat mengubah policy SELECT agar menggunakan `USING (true)`
-- (semua user dapat membaca) dan policy lainnya (INSERT/UPDATE/DELETE)
-- tetap dibatasi ke pembuat struk (auth.uid() = user_id).
