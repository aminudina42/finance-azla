-- ═══════════════════════════════════════════════════════════════════
-- Dompet Azla — Modul Wisata Keluarga: Katalog Destinasi Wisata Bersama
-- Migration: lib/migration-v28-katalog-destinasi-wisata.sql
-- ═══════════════════════════════════════════════════════════════════

-- 1. Tabel Master Destinasi Wisata Publik
CREATE TABLE IF NOT EXISTS public.tourist_destinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'rekreasi' CHECK (category IN ('rekreasi', 'alam', 'kuliner', 'edukasi', 'budaya', 'belanja', 'penginapan', 'lainnya')),
  maps_url TEXT,
  social_url TEXT,
  estimated_ticket_price BIGINT NOT NULL DEFAULT 0 CHECK (estimated_ticket_price >= 0),
  notes TEXT,
  created_by UUID REFERENCES public.members(id) ON DELETE SET NULL,
  created_by_family_name TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Pastikan check constraint mencakup 'budaya' jika tabel sudah sempat terbentuk sebelumnya
ALTER TABLE public.tourist_destinations 
  DROP CONSTRAINT IF EXISTS tourist_destinations_category_check;
ALTER TABLE public.tourist_destinations 
  ADD CONSTRAINT tourist_destinations_category_check 
  CHECK (category IN ('rekreasi', 'alam', 'kuliner', 'edukasi', 'budaya', 'belanja', 'penginapan', 'lainnya'));

-- Index Performa untuk Pencarian Cepat & Filter
CREATE INDEX IF NOT EXISTS idx_tourist_destinations_city ON public.tourist_destinations(city);
CREATE INDEX IF NOT EXISTS idx_tourist_destinations_name ON public.tourist_destinations(name);
CREATE INDEX IF NOT EXISTS idx_tourist_destinations_category ON public.tourist_destinations(category);

-- 2. Alter Tabel trip_items: Tambah Kolom destination_id (Snapshot Integrity Pattern)
ALTER TABLE public.trip_items 
ADD COLUMN IF NOT EXISTS destination_id UUID REFERENCES public.tourist_destinations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_trip_items_destination ON public.trip_items(destination_id);

-- 3. Row Level Security (RLS)
ALTER TABLE public.tourist_destinations ENABLE ROW LEVEL SECURITY;

-- Policy Select: Semua pengguna (authenticated & anon) dapat membaca seluruh katalog destinasi
DROP POLICY IF EXISTS "tourist_destinations_select_all" ON public.tourist_destinations;
CREATE POLICY "tourist_destinations_select_all" ON public.tourist_destinations
  FOR SELECT USING (true);

-- Policy Insert: Pengguna login dapat menambahkan spot wisata publik
DROP POLICY IF EXISTS "tourist_destinations_insert_auth" ON public.tourist_destinations;
CREATE POLICY "tourist_destinations_insert_auth" ON public.tourist_destinations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Policy Update: Pembuat asli atau superadmin dapat mengedit data destinasi
DROP POLICY IF EXISTS "tourist_destinations_update_owner" ON public.tourist_destinations;
CREATE POLICY "tourist_destinations_update_owner" ON public.tourist_destinations
  FOR UPDATE USING (
    created_by = auth.uid() 
    OR EXISTS (SELECT 1 FROM public.superadmins WHERE user_id = auth.uid())
  )
  WITH CHECK (
    created_by = auth.uid() 
    OR EXISTS (SELECT 1 FROM public.superadmins WHERE user_id = auth.uid())
  );

-- Policy Delete: Pembuat asli atau superadmin dapat menghapus data destinasi
DROP POLICY IF EXISTS "tourist_destinations_delete_owner" ON public.tourist_destinations;
CREATE POLICY "tourist_destinations_delete_owner" ON public.tourist_destinations
  FOR DELETE USING (
    created_by = auth.uid() 
    OR EXISTS (SELECT 1 FROM public.superadmins WHERE user_id = auth.uid())
  );

-- Berikan izin akses tabel
GRANT ALL ON TABLE public.tourist_destinations TO authenticated, service_role;
GRANT SELECT ON TABLE public.tourist_destinations TO anon;

-- 4. Seed Data Rekomendasi Destinasi Populer Awal
INSERT INTO public.tourist_destinations (name, city, category, maps_url, social_url, estimated_ticket_price, notes, created_by_family_name)
VALUES
  ('Taman Safari Indonesia Bogor', 'Bogor', 'rekreasi', 'https://maps.app.goo.gl/tamansafaribogor', 'https://instagram.com/taman_safari', 240000, 'Cocok untuk wisata mobil keliling satwa liar & pertunjukan lumba-lumba/harimau.', 'Keluarga Azla'),
  ('Kebun Raya Bogor', 'Bogor', 'alam', 'https://maps.app.goo.gl/kebunrayabogor', 'https://instagram.com/kebunraya_id', 25000, 'Sewa sepeda listrik atau piknik santai di bawah pohon rindang dekat danau.', 'Keluarga Azla'),
  ('Cimory Dairyland Farm Theme Park Puncak', 'Bogor', 'rekreasi', 'https://maps.app.goo.gl/cimorydairyland', 'https://instagram.com/dairyland.puncak', 40000, 'Banyak area interaksi hewan lucu, kincir angin & spot foto Instagramable anak-anak.', 'Keluarga Azla'),
  ('Orchid Forest Cikole', 'Bandung', 'alam', 'https://maps.app.goo.gl/orchidforestcikole', 'https://instagram.com/orchidforestcikole', 50000, 'Hutan pinus sejuk, jembatan gantung kayu, dan koleksi anggrek terlengkap.', 'Keluarga Azla'),
  ('Farmhouse Susu Lembang', 'Bandung', 'rekreasi', 'https://maps.app.goo.gl/farmhouselembang', 'https://instagram.com/farmhouselembang', 35000, 'Tiket masuk bisa ditukar susu murni Lembang. Ada spot rumah Hobbit.', 'Keluarga Azla'),
  ('Dusun Bambu Lembang', 'Bandung', 'kuliner', 'https://maps.app.goo.gl/dusunbambu', 'https://instagram.com/dusun_bambu', 30000, 'Wisata kuliner saung danau dengan pemandangan pegunungan asri.', 'Keluarga Azla'),
  ('Candi Prambanan', 'Yogyakarta', 'edukasi', 'https://maps.app.goo.gl/prambanan', 'https://instagram.com/candiprambanan', 50000, 'Kompleks candi Hindu megah warisan dunia UNESCO, sangat edukatif untuk anak.', 'Keluarga Azla'),
  ('HeHa Sky View', 'Yogyakarta', 'kuliner', 'https://maps.app.goo.gl/hehaskyview', 'https://instagram.com/hehaskyview', 30000, 'Pemandangan sunset dan citylight Jogja dari ketinggian bukit Patuk.', 'Keluarga Azla'),
  ('Jatim Park 2 (Batu Secret Zoo)', 'Malang', 'edukasi', 'https://maps.app.goo.gl/jatimpark2', 'https://instagram.com/jatimparksatu', 140000, 'Kebun binatang modern interaktif dan museum satwa bertaraf internasional.', 'Keluarga Azla'),
  ('Garuda Wisnu Kencana (GWK)', 'Bali', 'budaya', 'https://maps.app.goo.gl/gwkbali', 'https://instagram.com/gwkbali', 125000, 'Patung megah karya Nyoman Nuarta dan pertunjukan tari Kecak harian.', 'Keluarga Azla')
ON CONFLICT DO NOTHING;
