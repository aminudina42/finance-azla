-- ═══════════════════════════════════════════════
-- Dompet Pintar v5 — Database Migration
-- Jalankan SQL ini di Supabase SQL Editor
-- ═══════════════════════════════════════════════

-- ══ Phase 4: Debt Principal & Tenor Tracking ══
-- Add columns for handling Kredit / Pinjaman dengan Bunga
ALTER TABLE debts
ADD COLUMN IF NOT EXISTS principal_amount bigint DEFAULT 0,
ADD COLUMN IF NOT EXISTS tenor_months int DEFAULT 0,
ADD COLUMN IF NOT EXISTS paid_months int DEFAULT 0;
