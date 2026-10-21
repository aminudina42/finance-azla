-- ═══════════════════════════════════════════════
-- PERINGATAN KEAMANAN: HANYA UNTUK DEBUGGING LOKAL LAMA
-- JANGAN JALANKAN DI PRODUCTION ATAU SISTEM MULTI-TENANT AKTIF!
-- Menjalankan file ini akan mencabut seluruh pembatas isolasi data antar keluarga.
-- Gunakan lib/migration-v11-security-multitenant.sql untuk konfigurasi RLS yang benar.
-- ═══════════════════════════════════════════════

-- Disable RLS untuk semua tabel (agar anon key bisa akses)
-- Nanti bisa diaktifkan kembali saat auth sudah siap
alter table pos disable row level security;
alter table cycles disable row level security;
alter table transactions disable row level security;
alter table children disable row level security;
alter table child_transactions disable row level security;
alter table users disable row level security;
