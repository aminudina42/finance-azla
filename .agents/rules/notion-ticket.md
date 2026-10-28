# Aturan Penanganan Tiket & Bug/Saran Notion

Ketika user menyebutkan follow-up tiket, bug, atau saran fitur dari Notion:
1. **Fokus pada Kode Aplikasi CatatKeluarga**:
   - Tiket Notion adalah issue tracker eksternal. Jangan membaca atau mengutak-atik file internal Notion (`lib/notion-service.ts`, `app/api/feedback/*`) kecuali user secara eksplisit meminta perbaikan pada sistem integrasi Notion itu sendiri.
   - Anggap tiket sebagai bug/fitur pada modul aplikasi (misal: Transaksi, Wisata, BBM/Kendaraan, Pos Anggaran, Hutang, Auth).
2. **Gunakan Script CLI untuk Mengambil Data Tiket**:
   - Gunakan `node scripts/notion-ticket.mjs list` atau `node scripts/notion-ticket.mjs get <query>` untuk membaca substansi tiket (gejala, deskripsi, steps to reproduce, screenshot).
   - Gunakan `node scripts/notion-ticket.mjs start <id>` saat mulai pengerjaan dan `node scripts/notion-ticket.mjs done <id>` setelah selesai.
3. **Patuhi Arsitektur CatatKeluarga**:
   - Selalu periksa schema / migration di `lib/` jika ada perubahan struktur tabel Supabase.
   - Jaga konsistensi UI Tailwind CSS dan komponen React yang sudah ada.
