-- ═══════════════════════════════════════════════
-- Dompet Pintar v4 — Database Migration
-- Jalankan SQL ini di Supabase SQL Editor
-- SETELAH schema.sql sudah dijalankan sebelumnya
-- ═══════════════════════════════════════════════

-- ══ Phase 1: Multiple Income Streams ══
-- Add type column to transactions (income/expense)
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'expense' CHECK (type IN ('income', 'expense'));

-- ══ Phase 2: Savings Goals ══
-- Add goal tracking columns to pos
ALTER TABLE pos 
ADD COLUMN IF NOT EXISTS is_goal boolean DEFAULT false;

ALTER TABLE pos 
ADD COLUMN IF NOT EXISTS goal_target bigint DEFAULT 0;

-- ══ Phase 3: Debt & Liability Management ══
-- Create debts table
CREATE TABLE IF NOT EXISTS debts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  icon text NOT NULL DEFAULT '💳',
  total_amount bigint NOT NULL,
  remaining_amount bigint NOT NULL,
  monthly_payment bigint DEFAULT 0,
  due_date int CHECK (due_date BETWEEN 1 AND 31),
  created_at timestamptz DEFAULT now()
);
