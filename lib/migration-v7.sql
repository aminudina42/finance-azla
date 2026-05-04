-- ═══════════════════════════════════════════════
-- Dompet Pintar v7 — Database Migration
-- Jalankan SQL ini di Supabase SQL Editor
-- ═══════════════════════════════════════════════

-- ══ Phase 6: User Settings Persistence ══
-- Stores app-level settings like gajian_date
CREATE TABLE IF NOT EXISTS app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Seed default gajian date
INSERT INTO app_settings (key, value)
VALUES ('gajian_date', '25')
ON CONFLICT (key) DO NOTHING;
