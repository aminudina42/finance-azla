---
name: notion-ticket-resolver
description: Follow up, investigate, fix, or implement bugs and feature suggestions reported in Notion Kanban without loading Notion API plumbing into context. Triggers include "follow up tiket notion", "cek bug notion", "kerjakan tiket notion", "lihat saran fitur notion", "tiket notion", "notion bug", "notion feedback", or ticket ID mentions.
---

# Notion Ticket Resolver Skill

Skill ini memandu AI untuk mem-follow up, mendiagnosa, dan menyelesaikan laporan bug atau saran fitur yang tercatat di papan Kanban Notion CatatKeluarga, **tanpa membuang token membaca file integrasi Notion API**.

---

## 🛡️ Context Shield Rule (Wajib Diikuti)

1. **JANGAN PERNAH** membaca `lib/notion-service.ts`, `app/api/feedback/*`, atau file plumbing Notion lainnya, **KECUALI** isi tiketnya secara eksplisit melaporkan kerusakan pada fitur sinkronisasi Notion itu sendiri.
2. Semua detail tiket (Judul, Tipe, Prioritas, Diagnostik, Deskripsi, Langkah Kejadian, Screenshot) **wajib dibaca via script CLI** `node scripts/notion-ticket.mjs get <id|keyword>`. Script ini sudah memfilter semua metadata Notion sehingga hanya menghasilkan markdown ringkas dan bersih.
3. Langsung arahkan penyelidikan dan coding ke file aplikasi CatatKeluarga yang dilaporkan bermasalah (misalnya `components/Wisata/`, `lib/migration-*.sql`, dsb.).

---

## 🔄 Standard Workflow

### Langkah 1: Ambil Data Tiket (Clean & Fast)
- Jika user belum menyebutkan ID atau nama tiket tertentu:
  ```bash
  node scripts/notion-ticket.mjs list
  ```
- Jika user menyebutkan ID (short/full) atau kata kunci judul:
  ```bash
  node scripts/notion-ticket.mjs get <id_atau_kata_kunci>
  ```
  *Contoh:*
  ```bash
  node scripts/notion-ticket.mjs get 8c03d8b2
  node scripts/notion-ticket.mjs get "wisata"
  ```

### Langkah 2: Tandai Mulai Dikerjakan (In progress)
Begitu tiket teridentifikasi dan mulai diinvestigasi, ubah status tiket di Notion menjadi `In progress`:
```bash
node scripts/notion-ticket.mjs start <id>
```

### Langkah 3: Investigasi & Perbaikan Kode Aplikasi
1. Baca field **Halaman / Rute**, **Deskripsi**, dan **Langkah Kejadian** dari output Langkah 1.
2. Cari file frontend / backend / database terkait di CatatKeluarga:
   - Halaman/Page: `app/(dashboard)/...` atau `app/...`
   - Komponen UI: `components/...`
   - Logic / Utility: `lib/...` atau `hooks/...`
   - Skema Database: `lib/migration-*.sql`
3. Rancang perbaikan atau implementasi fitur.
4. Lakukan edit file dengan teliti dan patuhi arsitektur yang sudah ada.

### Langkah 4: Verifikasi
Pastikan perubahan tidak menimbulkan error atau regresi:
```bash
npm run lint
```

### Langkah 5: Selesaikan Tiket di Notion (Done)
Setelah coding selesai dan diverifikasi:
```bash
node scripts/notion-ticket.mjs done <id>
```

### Langkah 6: Laporan ke User
Berikan ringkasan singkat kepada user:
- Tiket yang diselesaikan (Judul & ID).
- Akar masalah / kebutuhan fitur.
- File-file yang diubah.
- Konfirmasi bahwa status kartu di Notion sudah diperbarui menjadi **Done**.
