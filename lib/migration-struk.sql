-- ═══════════════════════════════════════════════
-- Struk Dinamis — Database Migration
-- Jalankan SQL ini di Supabase SQL Editor
-- ═══════════════════════════════════════════════

-- 1. Tabel Toko
CREATE TABLE IF NOT EXISTS stores (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  address     TEXT NOT NULL,
  logo_url    TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabel Struk
CREATE TABLE IF NOT EXISTS receipts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID REFERENCES stores(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  receipt_number  TEXT NOT NULL,
  total           NUMERIC(15, 2) NOT NULL DEFAULT 0,
  note            TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabel Item Struk
CREATE TABLE IF NOT EXISTS receipt_items (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id            UUID REFERENCES receipts(id) ON DELETE CASCADE,
  item_name             TEXT NOT NULL,
  quantity              INTEGER NOT NULL DEFAULT 1,
  price                 NUMERIC(15, 2) NOT NULL DEFAULT 0,
  discount              NUMERIC(15, 2) NOT NULL DEFAULT 0,
  price_after_discount  NUMERIC(15, 2) GENERATED ALWAYS AS
                          ((quantity * price) - discount) STORED,
  sort_order            INTEGER DEFAULT 0
);

-- ═══ ROW LEVEL SECURITY ═══

-- Stores: user hanya bisa akses miliknya
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_stores_select" ON stores FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_stores_insert" ON stores FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_stores_update" ON stores FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "user_stores_delete" ON stores FOR DELETE USING (auth.uid() = user_id);

-- Receipts: user hanya bisa akses miliknya
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_receipts_select" ON receipts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_receipts_insert" ON receipts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_receipts_update" ON receipts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "user_receipts_delete" ON receipts FOR DELETE USING (auth.uid() = user_id);

-- Receipt items: akses via receipt ownership
ALTER TABLE receipt_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_receipt_items_select" ON receipt_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM receipts r WHERE r.id = receipt_id AND r.user_id = auth.uid()));
CREATE POLICY "user_receipt_items_insert" ON receipt_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM receipts r WHERE r.id = receipt_id AND r.user_id = auth.uid()));
CREATE POLICY "user_receipt_items_update" ON receipt_items FOR UPDATE
  USING (EXISTS (SELECT 1 FROM receipts r WHERE r.id = receipt_id AND r.user_id = auth.uid()));
CREATE POLICY "user_receipt_items_delete" ON receipt_items FOR DELETE
  USING (EXISTS (SELECT 1 FROM receipts r WHERE r.id = receipt_id AND r.user_id = auth.uid()));

-- ═══ STORAGE BUCKET ═══
-- Buat bucket 'receipt-images' di Supabase Dashboard → Storage
-- Set policy: public read, authenticated write
-- Path pattern: receipts/{receipt_id}.png
