-- ═══════════════════════════════════════════════════════════════════
-- Dompet Azla / CatatKeluarga — Migration v26
-- Buat bucket 'receipt-images' untuk penyimpanan publik gambar struk kasir
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public)
VALUES ('receipt-images', 'receipt-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Policy Storage: User authenticated bisa upload gambar struk kasir
DROP POLICY IF EXISTS "receipt_images_storage_insert_authenticated" ON storage.objects;
CREATE POLICY "receipt_images_storage_insert_authenticated" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'receipt-images' AND
    auth.role() = 'authenticated'
  );

-- Policy Storage: Siapapun (publik) bisa baca gambar struk
DROP POLICY IF EXISTS "receipt_images_storage_select_public" ON storage.objects;
CREATE POLICY "receipt_images_storage_select_public" ON storage.objects
  FOR SELECT USING (bucket_id = 'receipt-images');

-- Policy Storage: Update jika diperlukan
DROP POLICY IF EXISTS "receipt_images_storage_update_authenticated" ON storage.objects;
CREATE POLICY "receipt_images_storage_update_authenticated" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'receipt-images' AND
    auth.role() = 'authenticated'
  );
