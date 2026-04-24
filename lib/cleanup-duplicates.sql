-- ═══════════════════════════════════════════════
-- Cleanup duplicate rows dari schema.sql yang dirun 2x
-- Jalankan di Supabase SQL Editor
-- ═══════════════════════════════════════════════

-- Hapus duplicate pos (keep 1 per name)
DELETE FROM pos WHERE id NOT IN (
  SELECT DISTINCT ON (name) id FROM pos ORDER BY name, created_at ASC
);

-- Hapus duplicate cycles (keep 1 per label)
DELETE FROM cycles WHERE id NOT IN (
  SELECT DISTINCT ON (label) id FROM cycles ORDER BY label, created_at ASC
);

-- Hapus duplicate children (keep 1 per name)
DELETE FROM children WHERE id NOT IN (
  SELECT DISTINCT ON (name) id FROM children ORDER BY name, created_at ASC
);

-- Hapus duplicate users (keep 1 per role)
DELETE FROM users WHERE id NOT IN (
  SELECT DISTINCT ON (role) id FROM users ORDER BY role, created_at ASC
);
