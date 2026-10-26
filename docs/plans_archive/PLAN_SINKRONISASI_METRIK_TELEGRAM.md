# RENCANA KERJA: SINKRONISASI METRIK ARSIP & TERJADWAL (WEB ADMIN & BOT TELEGRAM)

Dokumen perencanaan teknis untuk menyelaraskan (*synchronize*) metrik **Total Arsip**, **Sudah Terbit**, dan **Terjadwal** antara Dasbor Web Admin (`/admin`) dan Bot Telegram AdaFakta (`@adafaktaBOT`).

---

## 1. Analisis Perbedaan Saat Ini

Berdasarkan investigasi pada basis kode dan tangkapan layar pengguna:

| Metrik | Dasbor Web Admin | Bot Telegram Saat Ini | Penyebab Ketidaksinkronan |
| :--- | :---: | :---: | :--- |
| **Total Artikel / Arsip** | **92** | **83** | Web admin menggabungkan tabel `articles` (83) + `jurnalis_drafts` siap terbit (9). Bot telegram hanya membaca tabel `articles` (83). |
| **Sudah Terbit / Tayang** | **83** | **83** | ✅ **Sinkron** (kedua sistem membaca artikel berstatus `published`). |
| **Terjadwal** | **9** | *(Tidak Ditampilkan)* | Web admin menghitung 9 antrean draf jurnalis berfoto sebagai `scheduled`. Di bot telegram, baris ini belum dimuat di menu `/start`. |
| **Draf Review** | **0** | **0** | ✅ **Sinkron** (tidak ada draf manual/AI mentah). |
| **Teks Interval Antrean** | *(Dinamis)* | *"Per 2 Jam"* | Bot telegram dan kartu dasbor masih memuat teks statis "per 2 jam", padahal interval kini sudah fleksibel (Waterfall Queue). |

---

## 2. Rincian Teknis Perbaikan

### A. Bot Telegram: Menu Utama `/start` (`sendWelcomeMessage`)
* **File**: `app/api/telegram/webhook/route.ts`
* **Logika Baru**:
  1. Ambil data dari tabel `articles` (status `published`, `scheduled`, `draft`).
  2. Ambil data dari tabel `jurnalis_drafts` yang berstatus antrean siap tayang:
     `status = 'ready_to_publish' AND cover_url IS NOT NULL`
  3. Hitung total terjadwal gabungan:
     `totalScheduled = articlesScheduled + jurnalisQueuedCount`
  4. Hitung total arsip keseluruhan:
     `totalArsip = totalPublished + totalDraft + totalScheduled` (hasil: **92**)
  5. Tampilkan baris `⏳ Terjadwal` pada blok status bot telegram.

```html
<!-- Format Tampilan Baru di Bot Telegram (/start) -->
📊 <b>STATUS PORTAL REDAKSI:</b>
📁 Total Arsip : <b>92 artikel</b>
🚀 Tayang Web  : <b>83 artikel</b>
⏳ Terjadwal   : <b>9 artikel</b>
📝 Draf Review : <b>0 artikel</b>
🤖 Autopilot AI: 🔴 Nonaktif
⏰ Rilis Berikutnya: Hari ini, 13.00 WIB (⏳ 12 mnt lagi)
```

### B. Bot Telegram: Menu Statistik (`sendStatsMessage`)
* **File**: `app/api/telegram/webhook/route.ts`
* **Logika Baru**:
  * Menyelaraskan query statistik agar `total` dan `scheduled` juga mengikutsertakan antrean draf jurnalis yang siap tayang, sehingga konsisten jika pengguna menekan tombol `📊 Cek Statistik`.

### C. Bot Telegram: Sinkronisasi Teks Interval Jurnalis AI
* **File**: `app/api/telegram/webhook/route.ts`
* Pada fungsi `sendJurnalisStatusMessage` dan handler upload foto telegram:
  * Mengambil interval aktif dari `system_settings` (`jurnalis_publish_interval_minutes`).
  * Mengganti teks statis *"Per 2 Jam Sekali"* menjadi dinamis:
    * Contoh: `Per 1 Jam Sekali (Waterfall Queue)` atau sesuai interval yang dipilih admin di web.

### D. Web Admin: Kartu Sumber Draf Jurnalis AI
* **File**: `app/admin/page.tsx`
* Mengubah teks statis pada kartu sumber Jurnalis AI:
  * Dari: `Antrean berkala per 2 jam`
  * Menjadi: Dinamis sesuai interval aktif (misal: `Antrean berkala per 1 jam`).

---

## 3. Hasil yang Diharapkan Setelah Implementasi

1. **Konsistensi Angka 100%**:
   * Dasbor Web Admin: **Total 92 • Terbit 83 • Terjadwal 9 • Draf 0**
   * Bot Telegram: **Total 92 • Terbit 83 • Terjadwal 9 • Draf 0**
2. **Transparansi Antrean**:
   * Admin yang mengelola portal lewat HP (Telegram) langsung tahu bahwa ada 9 berita yang sedang mengantre terbit tanpa harus membuka laptop/web admin.
3. **Harmonisasi Interval**:
   * Teks di bot telegram dan kartu dasbor web otomatis merefleksikan interval aktif (1 Jam / 30 Menit / 2 Jam).

---

## 4. Rencana Langkah Kerja (Checklist)

- [ ] **Langkah 1**: Perbarui `sendWelcomeMessage` di `app/api/telegram/webhook/route.ts` untuk menghitung antrean `jurnalisDrafts` dan menampilkan baris `⏳ Terjadwal`.
- [ ] **Langkah 2**: Perbarui `sendStatsMessage` di `app/api/telegram/webhook/route.ts` agar metrik statistik telegram selaras.
- [ ] **Langkah 3**: Perbarui teks interval di `sendJurnalisStatusMessage` pada bot Telegram agar membaca interval dinamis.
- [ ] **Langkah 4**: Perbarui teks subtitle kartu Jurnalis AI di `app/admin/page.tsx` agar dinamis sesuai interval aktif.
- [ ] **Langkah 5**: Lakukan validasi build / TypeScript (`tsc --noEmit`) untuk memastikan tidak ada kesalahan tipe data.
