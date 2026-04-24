-- ═══════════════════════════════════════════════
-- Dompet Pintar v3 — Enable Public Access (RLS Policies)
-- Jalankan SQL ini di Supabase SQL Editor
-- SETELAH schema.sql sudah dijalankan
-- ═══════════════════════════════════════════════

-- Disable RLS untuk semua tabel (agar anon key bisa akses)
-- Nanti bisa diaktifkan kembali saat auth sudah siap
alter table pos disable row level security;
alter table cycles disable row level security;
alter table transactions disable row level security;
alter table children disable row level security;
alter table child_transactions disable row level security;
alter table users disable row level security;
