-- ═══════════════════════════════════════════════════════════════════
-- Dompet Azla / Catat Keluarga — Peningkatan Fitur Hutang & Cicilan (Tahap 1)
-- Migration: lib/migration-v15-debt-improvements.sql
-- Jalankan SQL ini di Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════

-- 1. Tambah kolom baru pada tabel debts (Kreditur, No. Rekening/VA, Catatan)
ALTER TABLE public.debts
ADD COLUMN IF NOT EXISTS creditor_name TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS account_number TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';

-- 2. Buat tabel debt_payments untuk mencatat riwayat angsuran/pembayaran hutang
CREATE TABLE IF NOT EXISTS public.debt_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keluarga_id UUID REFERENCES public.keluarga(id) ON DELETE CASCADE,
  debt_id UUID NOT NULL REFERENCES public.debts(id) ON DELETE CASCADE,
  pos_id UUID REFERENCES public.pos(id) ON DELETE SET NULL,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  payment_number INT NOT NULL DEFAULT 1,
  amount BIGINT NOT NULL,
  payment_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT DEFAULT '',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Index untuk performa query riwayat pembayaran
CREATE INDEX IF NOT EXISTS idx_debt_payments_debt_id ON public.debt_payments(debt_id);
CREATE INDEX IF NOT EXISTS idx_debt_payments_keluarga_id ON public.debt_payments(keluarga_id);
CREATE INDEX IF NOT EXISTS idx_debt_payments_payment_date ON public.debt_payments(payment_date DESC);

-- 4. Aktifkan Row Level Security (RLS) pada tabel debt_payments
ALTER TABLE public.debt_payments ENABLE ROW LEVEL SECURITY;

-- 5. Izin akses dasar
GRANT ALL ON TABLE public.debt_payments TO anon, authenticated, service_role;

-- 6. Trigger auto-set keluarga_id (jika fungsi get_my_keluarga_id ada)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'auto_set_keluarga_id') THEN
    DROP TRIGGER IF EXISTS trigger_auto_set_keluarga_id_debt_payments ON public.debt_payments;
    CREATE TRIGGER trigger_auto_set_keluarga_id_debt_payments
    BEFORE INSERT ON public.debt_payments
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_set_keluarga_id();
  END IF;
END $$;

-- 7. Policy RLS untuk debt_payments: akses dibatasi per keluarga_id
DROP POLICY IF EXISTS "debt_payments_family_all" ON public.debt_payments;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_my_keluarga_id') THEN
    CREATE POLICY "debt_payments_family_all" ON public.debt_payments
      FOR ALL
      USING (
        keluarga_id IS NULL 
        OR keluarga_id = public.get_my_keluarga_id()
      )
      WITH CHECK (
        keluarga_id IS NULL 
        OR keluarga_id = public.get_my_keluarga_id()
      );
  ELSE
    CREATE POLICY "debt_payments_family_all" ON public.debt_payments
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

