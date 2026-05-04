-- ═══════════════════════════════════════════════
-- Dompet Pintar v6 — Database Migration
-- Jalankan SQL ini di Supabase SQL Editor
-- ═══════════════════════════════════════════════

-- ══ Phase 5: Historical Pos Snapshots ══
-- Create table to store the budget target of pos per cycle
CREATE TABLE public.cycle_pos_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_id TEXT NOT NULL,
    pos_id TEXT NOT NULL,
    monthly_target BIGINT NOT NULL,
    goal_target BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Disable RLS for now to match current dev environment simplicity
ALTER TABLE public.cycle_pos_history DISABLE ROW LEVEL SECURITY;
