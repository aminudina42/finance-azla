-- ═══════════════════════════════════════════════════════════════════
-- Dompet Azla / CatatKeluarga — Migration v17: Health Tracking
-- File: lib/migration-v17-health-tracking.sql
-- Modul: Tracking Tumbuh Kembang, Tanda Vital, Rekam Medis, & Obat
-- Jalankan file SQL ini di Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════

-- 1. TABEL ANGGOTA KESEHATAN KELUARGA (Mendukung Member Auth & Dependents / Anak)
CREATE TABLE IF NOT EXISTS public.health_family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keluarga_id UUID NOT NULL REFERENCES public.keluarga(id) ON DELETE CASCADE,
  auth_member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  relation_role TEXT NOT NULL DEFAULT 'anak' CHECK (relation_role IN ('suami', 'istri', 'anak', 'orang_tua', 'lainnya')),
  gender TEXT NOT NULL DEFAULT 'male' CHECK (gender IN ('male', 'female')),
  birth_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_premature BOOLEAN DEFAULT false,
  gestational_weeks INT,
  blood_type TEXT DEFAULT 'unknown' CHECK (blood_type IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown')),
  allergies TEXT[] DEFAULT ARRAY[]::TEXT[],
  chronic_conditions TEXT[] DEFAULT ARRAY[]::TEXT[],
  bpjs_number TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. TABEL LOG PERTUMBUHAN / ANTROPOMETRI (ANAK & UMUM)
CREATE TABLE IF NOT EXISTS public.health_growth_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keluarga_id UUID NOT NULL REFERENCES public.keluarga(id) ON DELETE CASCADE,
  family_member_id UUID NOT NULL REFERENCES public.health_family_members(id) ON DELETE CASCADE,
  measured_at DATE NOT NULL DEFAULT CURRENT_DATE,
  weight_kg NUMERIC(5, 2) NOT NULL CHECK (weight_kg > 0 AND weight_kg < 300),
  height_cm NUMERIC(5, 2) NOT NULL CHECK (height_cm > 20 AND height_cm < 260),
  head_circ_cm NUMERIC(5, 2) CHECK (head_circ_cm IS NULL OR (head_circ_cm > 20 AND head_circ_cm < 70)),
  arm_circ_cm NUMERIC(5, 2) CHECK (arm_circ_cm IS NULL OR (arm_circ_cm > 5 AND arm_circ_cm < 60)),
  measurement_position TEXT DEFAULT 'standing' CHECK (measurement_position IN ('recumbent', 'standing')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. TABEL LOG TANDA VITAL & BIOMARKER
CREATE TABLE IF NOT EXISTS public.health_vital_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keluarga_id UUID NOT NULL REFERENCES public.keluarga(id) ON DELETE CASCADE,
  family_member_id UUID NOT NULL REFERENCES public.health_family_members(id) ON DELETE CASCADE,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  vital_type TEXT NOT NULL CHECK (vital_type IN ('blood_pressure', 'blood_sugar', 'cholesterol', 'uric_acid', 'body_temp')),
  data JSONB NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. TABEL REKAM MEDIS SAKIT (EPISODES)
CREATE TABLE IF NOT EXISTS public.health_medical_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keluarga_id UUID NOT NULL REFERENCES public.keluarga(id) ON DELETE CASCADE,
  family_member_id UUID NOT NULL REFERENCES public.health_family_members(id) ON DELETE CASCADE,
  illness_name TEXT NOT NULL,
  diagnosis TEXT,
  symptoms TEXT,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  is_cured BOOLEAN DEFAULT false,
  doctor_name TEXT,
  clinic_hospital TEXT,
  payment_method TEXT DEFAULT 'pribadi' CHECK (payment_method IN ('pribadi', 'bpjs', 'asuransi_kantor', 'asuransi_swasta')),
  cost_amount NUMERIC(12, 2) DEFAULT 0 CHECK (cost_amount >= 0),
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  attachment_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. TABEL RESEP & OBAT-OBATAN
CREATE TABLE IF NOT EXISTS public.health_medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keluarga_id UUID NOT NULL REFERENCES public.keluarga(id) ON DELETE CASCADE,
  medical_record_id UUID REFERENCES public.health_medical_records(id) ON DELETE CASCADE,
  family_member_id UUID NOT NULL REFERENCES public.health_family_members(id) ON DELETE CASCADE,
  medicine_name TEXT NOT NULL,
  is_antibiotic BOOLEAN DEFAULT false,
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL,
  timing_rule TEXT,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  stopped_reason TEXT CHECK (stopped_reason IS NULL OR stopped_reason IN ('finished', 'cured', 'side_effects', 'doctor_order')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. INDEXING
CREATE INDEX IF NOT EXISTS idx_health_members_keluarga ON public.health_family_members(keluarga_id);
CREATE INDEX IF NOT EXISTS idx_health_growth_member ON public.health_growth_logs(family_member_id, measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_health_vitals_member ON public.health_vital_logs(family_member_id, vital_type, measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_health_records_member ON public.health_medical_records(family_member_id, start_date DESC);
CREATE INDEX IF NOT EXISTS idx_health_medications_member ON public.health_medications(family_member_id, is_active);

-- 7. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.health_family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_growth_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_vital_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_medications ENABLE ROW LEVEL SECURITY;

-- Helper RLS Policies
DROP POLICY IF EXISTS "health_members_family_all" ON public.health_family_members;
CREATE POLICY "health_members_family_all" ON public.health_family_members
  FOR ALL TO authenticated
  USING (keluarga_id IN (SELECT keluarga_id FROM public.members WHERE id = auth.uid()))
  WITH CHECK (keluarga_id IN (SELECT keluarga_id FROM public.members WHERE id = auth.uid()));

DROP POLICY IF EXISTS "health_growth_family_all" ON public.health_growth_logs;
CREATE POLICY "health_growth_family_all" ON public.health_growth_logs
  FOR ALL TO authenticated
  USING (keluarga_id IN (SELECT keluarga_id FROM public.members WHERE id = auth.uid()))
  WITH CHECK (keluarga_id IN (SELECT keluarga_id FROM public.members WHERE id = auth.uid()));

DROP POLICY IF EXISTS "health_vitals_family_all" ON public.health_vital_logs;
CREATE POLICY "health_vitals_family_all" ON public.health_vital_logs
  FOR ALL TO authenticated
  USING (keluarga_id IN (SELECT keluarga_id FROM public.members WHERE id = auth.uid()))
  WITH CHECK (keluarga_id IN (SELECT keluarga_id FROM public.members WHERE id = auth.uid()));

DROP POLICY IF EXISTS "health_records_family_all" ON public.health_medical_records;
CREATE POLICY "health_records_family_all" ON public.health_medical_records
  FOR ALL TO authenticated
  USING (keluarga_id IN (SELECT keluarga_id FROM public.members WHERE id = auth.uid()))
  WITH CHECK (keluarga_id IN (SELECT keluarga_id FROM public.members WHERE id = auth.uid()));

DROP POLICY IF EXISTS "health_medications_family_all" ON public.health_medications;
CREATE POLICY "health_medications_family_all" ON public.health_medications
  FOR ALL TO authenticated
  USING (keluarga_id IN (SELECT keluarga_id FROM public.members WHERE id = auth.uid()))
  WITH CHECK (keluarga_id IN (SELECT keluarga_id FROM public.members WHERE id = auth.uid()));

-- 8. INITIAL SEED / AUTO-POPULATE DARI TABEL MEMBERS EXISTING
DO $$
BEGIN
  -- Salin member existing yang belum ada di health_family_members
  INSERT INTO public.health_family_members (
    keluarga_id,
    auth_member_id,
    name,
    relation_role,
    gender,
    birth_date,
    blood_type
  )
  SELECT 
    m.keluarga_id,
    m.id,
    m.display_name,
    COALESCE(m.status_keluarga, 'anak')::TEXT,
    CASE 
      WHEN m.status_keluarga = 'istri' THEN 'female'
      ELSE 'male'
    END,
    '2000-01-01'::DATE,
    'unknown'
  FROM public.members m
  WHERE NOT EXISTS (
    SELECT 1 FROM public.health_family_members hfm 
    WHERE hfm.auth_member_id = m.id
  );
END $$;

