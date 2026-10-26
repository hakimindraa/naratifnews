# RENCANA KERJA: WATERFALL QUEUE DENGAN INTERVAL FLEKSIBEL (JURNALIS AI ADAFAKTA)

Dokumen spesifikasi teknis untuk implementasi **Metode A: Antrean Berjadwal Runtun (*Waterfall Queue*)** pada Meja Jurnalis AI AdaFakta (`/admin/jurnalis`).

---

## 1. Konsep Utama: Antrean Berjadwal Runtun (*Waterfall Queue*)

Sistem antrean ini menyusun jam tayang berita secara berantai dan transparan berdasarkan interval yang dapat diatur sendiri oleh Admin (default: **1 Jam**).

```
[ Berita Masuk dari Bot ]
         │
         ▼
[ Naskah Disusun AI ] ──> Status: 'generated' (Menunggu Foto Cover)
         │
         ▼ (Admin Pasang Foto Cover ImgBB)
┌────────────────────────────────────────────────────────────────────────┐
│ ENGINE PERHITUNGAN WATERFALL QUEUE                                     │
│ 1. Baca Interval Aktif dari system_settings (misal: 60 menit)          │
│ 2. Cek jadwal tayang (publish_at) terlama di masa depan               │
│    - Jika belum ada antrean di depan  ──> Jadwal = Sekarang + 60 menit │
│    - Jika Berita A dijadwalkan 13:00  ──> Berita B = 13:00 + 60m (14:00)│
│    - Jika Berita B dijadwalkan 14:00  ──> Berita C = 14:00 + 60m (15:00)│
└──────────────────────────────────┬─────────────────────────────────────┘
                                   ▼
                   Status: 'ready_to_publish'
               (Tertera Jam Tayang Pasti & Urutan)
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ CRON JOB PENGECEK RINGAN (Setiap 5 - 10 Menit di cron-job.org)        │
│ URL: GET /api/cron/jurnalis-publisher                                  │
│                                                                        │
│ Query: status = 'ready_to_publish' AND publish_at <= Waktu_Sekarang    │
│ Eksekusi: Terbitkan 1 artikel paling awal yang telah jatuh tempo       │
│ Notifikasi: Kirim laporan sukses ke Telegram Admin                     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Rincian Teknis Komponen

### A. Pengaturan Sistem (`system_settings`)
Tabel `system_settings` sudah tersedia di skema database. Kita akan menggunakan key khusus:
* **Key**: `'jurnalis_publish_interval_minutes'`
* **Value**: `'60'` (default 1 jam; dapat bernilai `'30'`, `'60'`, `'120'`, `'180'`, dll)

### B. Backend & Server Actions (`app/admin/jurnalis/actions.ts`)

1. **`getJurnalisPublishIntervalAction()`**:
   * Membaca pengaturan interval dari tabel `system_settings`.
   * Jika belum ada di database, default kembali ke `60` (1 jam).

2. **`updateJurnalisPublishIntervalAction(intervalMinutes: number)`**:
   * Menyimpan / meng-upsert nilai interval baru ke tabel `system_settings`.
   * Melakukan revalidasi cache halaman (`revalidatePath('/admin/jurnalis')`).

3. **Penyempurnaan `getNextSuggestedPublishTimeAction()`**:
   * Mengganti penambahan paten 2 jam (`2 * 60 * 60 * 1000`) dengan nilai dinamis:
     `const intervalMs = intervalMinutes * 60 * 1000;`
   * Logika pengecekan antrean:
     * Cari berita di `jurnalis_drafts` (status `ready_to_publish`) dan `articles` (status `scheduled`) yang memiliki `publish_at > now()`.
     * Ambil waktu `publish_at` yang paling jauh di masa depan (`baseTime`).
     * Jadwalkan draf baru pada: `new Date(baseTime.getTime() + intervalMs)`.

### C. Antarmuka Pengguna / UI (`app/admin/jurnalis/JurnalisClientView.tsx`)

1. **Widget Kontrol Interval di Header Meja Jurnalis**:
   * Terpasang rapi di samping filter status / baris statistik.
   * Format:
     ```
     ⏱️ Jeda Antrean Otomatis: [ 30 Menit ] [ 1 Jam (Default) ] [ 2 Jam ] [ 3 Jam ]
     🟢 Mode Waterfall Aktif • Giliran berikutnya berjarak [X] menit
     ```
   * Begitu admin memilih opsi interval baru, sistem langsung menyimpan secara otomatis (asinkron) dengan indikator tersimpan.

2. **Visualisasi Antrean pada Kartu Berita (`isQueued`)**:
   * **Nomor Antrean**: Label visual urutan (misal: `#1 Antrean`, `#2 Antrean`, `#3 Antrean`) diurutkan berdasarkan `publish_at ASC`.
   * **Waktu Tayang & Hitung Mundur**:
     * Jam Tayang Absolut: `📅 Tayang: 14:00 WIB`
     * Hitung Mundur Relatif: `⏳ Dalam 42 menit` atau `⚡ Siap Tayang (Menunggu Cron)` jika waktu sudah terlewati.
   * **Opsi Penyesuaian Manual**: Tombol "Ubah Jam" tetap tersedia melalui modal jika admin ingin memajukan/memundurkan jadwal berita tertentu.
   * **Tombol Bypass Darurat**: Tetap tersedia tombol `🚀 Terbitkan Sekarang (Bypass)` jika ada berita mendesak (*breaking news*) yang ingin langsung ditayangkan tanpa menunggu antrean.

3. **Pembaruan Modal Pasang Foto (`DraftPhotoModal.tsx`)**:
   * Mengambil rekomendasi jam tayang secara dinamis sesuai interval aktif yang telah dipilih admin.

---

## 3. Alur Kerja Pemicu Cron Eksternal

* **Jadwal Eksekusi**: Disarankan disetel setiap **5–10 menit** di **cron-job.org**.
* **Keuntungan Cron Ringan**:
  * Cron hanya bertugas memeriksa: *“Adakah berita dengan `publish_at <= Sekarang`?”*
  * Jika belum ada jadwal yang tiba, cron selesai dalam hitungan milidetik tanpa membebani server.
  * Begitu sebuah berita jatuh tempo (genap 1 jam atau sesuai jeda), berita langsung tayang maksimal dalam selisih 5-10 menit.

---

## 4. Rencana Implementasi Bertahap (Ketika Disetujui)

- [ ] **Langkah 1**: Buat fungsi pembaca & penyimpan interval (`getJurnalisPublishIntervalAction` & `updateJurnalisPublishIntervalAction`) di `actions.ts`.
- [ ] **Langkah 2**: Perbarui fungsi `getNextSuggestedPublishTimeAction()` agar menggunakan interval dinamis dari database.
- [ ] **Langkah 3**: Tambahkan widget kontrol interval di `JurnalisClientView.tsx` dan parsing data interval awal dari `page.tsx`.
- [ ] **Langkah 4**: Perbaiki tampilan kartu antrean agar memuat nomor urut (#1, #2, dst.) dan hitung mundur waktu tayang transparan.
- [ ] **Langkah 5**: Uji coba aliran data (memasang foto -> melihat jadwal tayang otomatis +1 jam runtun -> verifikasi tampilan di UI).
