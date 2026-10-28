# Aturan Transisi Brainstorming ke Implementasi (Auto-Skill & Contract-First)

Aturan ini berlaku setiap kali sesi diskusi/brainstorming/perencanaan fitur baru selesai dan user memberikan instruksi untuk mulai eksekusi/koding (misal: "gas buat kodenya", "lanjut implementasi", "oke sepakat, buatkan", dsb.).

---

## 1. Auto-Skill Resolution (Wajib Tanpa Perlu User Menyebutkan Skill)
Sebelum membuat atau memodifikasi file kode apa pun, AI **wajib secara proaktif** mengidentifikasi domain teknis fitur yang disepakati dan membaca (`read_file`) file `SKILL.md` yang relevan:

*   **Frontend / UI / Halaman & Komponen React**:
    *   **Skill Wajib**: `high-end-visual-design`, `gpt-taste`, `minimalist-ui`, atau `design-taste-frontend`.
    *   **Standar**: Bebas dari template AI generik (anti-slop), spacing terukur & lega, visual hierarchy tegas, mobile-first responsive, micro-interactions, dark mode konsisten dengan CatatKeluarga.
*   **Database / Schema Supabase / Migrasi SQL**:
    *   **Skill Wajib**: `database-design-quality-review`.
    *   **Standar**: Migrasi idempotent di `lib/migration-vXX-[nama].sql`, validasi foreign keys, index pada kolom query/filter sering, dan row-level security (RLS).
*   **API / Server Actions / Backend Endpoint**:
    *   **Skill Wajib**: `api-design-quality-review` dan/atau `api-security` / `owasp-top-10-web`.
    *   **Standar**: Validasi input (Zod), error response semantik & aman, sanitasi payload, penanganan session/auth.
*   **Quality Assurance / Pengujian**:
    *   **Skill Wajib**: `test-case-writing` atau `functional-testing`.
    *   **Standar**: Menangkap edge cases, validasi boundary, skenario gagal, dan acceptance criteria.

---

## 2. Prinsip "Contract-First" & Dokumentasi di `rekap-file-md/`
Di akhir setiap sesi brainstorming (sebelum masuk ke implementasi kode):
1. **Wajib Buat Rekap Dokumentasi di `rekap-file-md/<NamaFitur>/`**:
   *   `PRD-[NamaFitur].md`: Memuat latar belakang, user journey, aturan bisnis, boundary cases, dan functional requirements.
   *   `Implementation-Plan-[NamaFitur].md`: Memuat arsitektur teknis, schema migration Supabase (`lib/migration-vXX.sql`), types/contract TypeScript, dan rancangan komponen UI.
   *   `Task-List-[NamaFitur].md`: Checklist eksekusi modular (Track DB, Track UI, Track API, Track Integrasi, Track QA).
   *(Catatan: Untuk perbaikan kecil/sub-fitur pada modul yang sudah ada, cukup update/append Task-List pada folder modul terkait).*
2. **Kunci Interface / Data Contract**:
   *   TypeScript Types & DTO yang dicatat dalam dokumen ini menjadi acuan tunggal agar pengerjaan modul DB, UI, dan QA tidak saling bentrok.

---

## 3. Strategi Eksekusi: Paralel vs Sekuensial

*   **Fitur Besar / Modul Baru**:
    *   Terapkan alur modular/paralel (bisa memanfaatkan Subagents / `/teamwork`):
        1. **Simultan (Paralel)**:
           *   Track DB: DDL migrasi SQL (`lib/migration-vXX.sql`) & RLS.
           *   Track UI: Komponen React & styling menggunakan mock data berbasis Contract.
           *   Track QA: Matrix skenario uji & boundary edge cases.
        2. **Sekuensial**:
           *   Track Integrasi: Sambungkan UI ke API/Supabase riil (ganti mock data).
           *   Track Verifikasi: Uji fungsionalitas, build test (`npm run build`), dan pastikan lint/type aman.
*   **Fitur Kecil / Perbaikan Tambahan**:
    *   Jalankan sekuensial cepat dalam satu sesi (DB -> API -> UI -> Test), tetap mematuhi kaidah skill yang relevan.

---

## 4. Transparansi Eksekusi
Di awal pesan implementasi, selalu tampilkan indikator singkat standar skill yang diaktifkan, contoh:
> 🎯 **Standar Skill Diterapkan**: `high-end-visual-design` (UI), `database-design-quality-review` (DB)
Lalu langsung lanjutkan eksekusi kode tanpa membebani user dengan pertanyaan konfirmasi manual.
