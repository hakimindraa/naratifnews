# RENCANA KERJA: FITUR PEMBERSIHAN DATABASE & AUTO-PURGE (ADMIN MAINTENANCE)

Dokumen spesifikasi teknis dan desain implementasi untuk halaman baru **Pembersihan Database & Auto-Purge** (`/admin/maintenance`) pada portal media AdaFakta.

---

## 1. Filosofi & Prinsip Keamanan Data

> [!IMPORTANT]
> **GARANSI KEAMANAN SEO GOOGLE 100%**:
> Fitur ini **TIDAK AKAN PERNAH MENYENTUH ATAU MENGHAPUS TABEL `articles`** (artikel yang sudah resmi tayang di web publik). Halaman berita Anda di Google Search, Google News, dan media sosial akan tetap utuh selamanya tanpa broken link (404).

Pembersihan database ini difokuskan secara presisi hanya pada **3 jenis data sampah internal / non-publik**:

1. **Draf Usulan Bot Mentah (`jurnalis_drafts` status `draft`)**:
   Berita intelijen dari bot RSS yang tidak pernah Anda gubris atau beri foto selama X hari.
2. **Salinan Draf yang Sudah Terbit (`jurnalis_drafts` status `published`)**:
   Salinan draf lama di meja jurnalis yang naskah aslinya sudah aman berpindah ke tabel `articles`.
3. **Riwayat Log Panggilan AI (`ai_generation_logs`)**:
   Catatan prompt dan respons AI yang sudah lewat X hari dan tidak lagi diperlukan untuk audit.

---

## 2. Fitur Halaman `/admin/maintenance`

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ 🧹 Pembersihan Database & Auto-Purge                                 [🔄 Segarkan Data]      │
│ Kelola retensi data dan jaga database Neon PostgreSQL tetap ramping & kencang              │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│ 🛡️ STATUS PROTEKSI: Artikel Web Publik (Tabel articles: 83 Berita) DIKUNCI AMAN DARI PURGE   │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│ 📊 KONDISI PENYIMPANAN SAAT INI (Bisa Dibersihkan):                                         │
│  [ 🗑️ Draf Mentah Kedaluwarsa: 38 Baris ]   [ 📦 Draf Sudah Terbit Lama: 15 Baris ]        │
│  [ 📑 Log Riwayat AI Usang: 64 Baris ]      [ 💾 Total Sampah Siap Dihapus: 117 Baris ]     │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│ ⚙️ PENGATURAN RETENSI (Batas Umur Data):                                                    │
│                                                                                             │
│ 1. Usulan Draf Bot Mentah (status 'draft')                                                  │
│    Hapus usulan bot yang tidak diproses setelah:  [ 7 Hari (Rekomendasi) ▼ ]                │
│    (Pilihan: 3 Hari | 5 Hari | 7 Hari | 14 Hari | Nonaktif)                                 │
│                                                                                             │
│ 2. Salinan Draf Jurnalis yang Sudah Terbit (status 'published')                             │
│    Hapus salinan draf jurnalis setelah artikel live: [ 7 Hari (Rekomendasi) ▼ ]             │
│    (Pilihan: 3 Hari | 7 Hari | 14 Hari | 30 Hari | Nonaktif)                                │
│                                                                                             │
│ 3. Riwayat Log AI Generator (ai_generation_logs)                                            │
│    Hapus riwayat prompt AI setelah:               [ 14 Hari (Rekomendasi) ▼ ]               │
│    (Pilihan: 7 Hari | 14 Hari | 30 Hari | Nonaktif)                                         │
│                                                                                             │
│ [ Simpan Pengaturan Retensi ]                                                               │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│ 🚀 AKSI PEMBERSIHAN:                                                                        │
│                                                                                             │
│ [ 🧹 Bersihkan Sampah Sekarang (Manual) ] ──> Langsung eksekusi pembersihan detik ini juga  │
│                                                                                             │
│ 🤖 Eksekusi Otomatis via Cron (Rekomendasi: 1x seminggu di cron-job.org):                   │
│ URL: https://www.adafakta.web.id/api/cron/auto-purge                                        │
│ Header: Authorization: Bearer [CRON_SECRET]                                                 │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Rincian Teknis Arsitektur

### A. Pengaturan Sistem (`system_settings`)
Menggunakan key standar yang sudah ada:
* `purge_retention_drafts_days`: default `'7'` (3, 5, 7, 14, atau 0 untuk nonaktif)
* `purge_retention_published_drafts_days`: default `'7'` (3, 7, 14, 30, atau 0 untuk nonaktif)
* `purge_retention_ai_logs_days`: default `'14'` (7, 14, 30, atau 0 untuk nonaktif)

### B. Server Actions (`app/admin/maintenance/actions.ts`)

1. **`getMaintenanceMetricsAction()`**:
   * Menghitung secara *real-time* jumlah baris yang memenuhi kriteria umur retensi:
     * Draf mentah yang `createdAt < now - X hari`.
     * Draf published yang `createdAt < now - Y hari`.
     * Log AI yang `createdAt < now - Z hari`.
2. **`saveMaintenanceSettingsAction(settings)`**:
   * Menyimpan nilai retensi ke tabel `system_settings`.
3. **`executePurgeAction(scope: 'all' | 'drafts' | 'published_drafts' | 'logs')`**:
   * Menjalankan query `delete` berbasis tanggal secara aman.
   * Mengembalikan laporan jumlah baris yang berhasil dihapus.
   * Melakukan revalidasi path.

### C. Endpoint Otomasi Cron (`app/api/cron/auto-purge/route.ts`)
* **URL**: `GET /api/cron/auto-purge`
* **Proteksi**: Header `Authorization: Bearer CRON_SECRET`
* **Perilaku**:
  1. Membaca pengaturan retensi dari database.
  2. Menghapus data sampah yang sudah jatuh tempo secara aman.
  3. Mengirimkan notifikasi laporan ke Telegram Admin:
     > 🧹 **LAPORAN AUTO-PURGE DATABASE**
     > Database AdaFakta berhasil dibersihkan otomatis:
     > 🗑️ Draf mentah usang : [X] baris dihapus
     > 📦 Draf terbit lama   : [Y] baris dihapus
     > 📑 Log riwayat AI     : [Z] baris dihapus
     > 💾 **Status:** Database ramping, performa tetap optimal!

### D. Navigasi Sidebar Admin (`app/admin/AdminLayoutClient.tsx`)
* Menambahkan item menu baru:
  ```typescript
  {
    label: 'Pembersihan DB',
    href: '/admin/maintenance',
    icon: Trash2, // atau Database / Sparkles
    badge: 'Auto',
  }
  ```

---

## 4. Langkah-Langkah Implementasi (Ketika Disetujui)

- [ ] **Langkah 1**: Buat Server Actions backend (`app/admin/maintenance/actions.ts`) untuk kalkulasi metrik sampah data dan eksekusi penghapusan aman.
- [ ] **Langkah 2**: Buat tampilan UI halaman Admin (`app/admin/maintenance/page.tsx` & `MaintenanceClientView.tsx`) dengan desain modern, visualisasi counter, dropdown retensi, dan tombol manual purge.
- [ ] **Langkah 3**: Buat route cron otomatis (`app/api/cron/auto-purge/route.ts`) beserta notifikasi Telegram.
- [ ] **Langkah 4**: Daftarkan menu `Pembersihan DB` ke sidebar admin di `AdminLayoutClient.tsx`.
- [ ] **Langkah 5**: Lakukan validasi build / TypeScript (`tsc --noEmit`) untuk memastikan sistem 100% stabil.
