# RENCANA KERJA & DESAIN LAYOUT: JURNALIS AI CRON QUEUE (PENDEKATAN B)

> Dokumen perencanaan teknis integrasi antrean penerbitan berkala (*Drip Publishing*) untuk fitur Jurnalis AI AdaFakta. Berita dipublikasikan bertahap (per 1 atau 2 jam) menggunakan Cron Job khusus hanya setelah foto diisi oleh admin.

---

## 1. Konsep Utama & Alur Kerja

```
[1. Pencarian Otomatis] ──> [2. Masuk jurnalis_drafts] ──> [3. AI Siapkan Naskah & Kategori]
                                                                        │
                                                                        ▼
                                                         [Status: Menunggu Foto]
                                                          (Aman, Tidak Diterbitkan)
                                                                        │
                                              ┌─────────────────────────┴─────────────────────────┐
                                              │ Admin mengunggah/mengisi link foto ImgBB          │
                                              └─────────────────────────┬─────────────────────────┘
                                                                        ▼
                                                      [Status: 'ready_to_publish']
                                                       (Masuk Antrean Siap Tayang)
                                                                        │
                                                                        ▼
                                                [CRON JOB: Setiap 1 atau 2 Jam Sekali]
                                                       /api/cron/jurnalis-publisher
                                                                        │
                                              ┌─────────────────────────┴─────────────────────────┐
                                              │ Ambil 1 artikel terlama di antrean 'ready'        │
                                              │ Masukkan ke tabel 'articles' (status: published)  │
                                              │ Update status draf menjadi 'published'            │
                                              │ Picu Google/Bing IndexNow                         │
                                              │ Kirim Notifikasi Laporan ke Telegram Admin        │
                                              └───────────────────────────────────────────────────┘
```

---

## 2. Siklus Status Draf (*Status Lifecycle*)

| Status | Arti & Perilaku Sistem | Aksi Pengguna |
| :--- | :--- | :--- |
| `draft` | Berita baru masuk dari pencarian bot, belum diolah AI. | Bisa klik "⚡ Susun Naskah AI". |
| `generated` | Naskah berita, kategori, dan tags selesai dibuat AI, **tetapi belum ada foto**. Draf ini **DIKUNCI dari penerbitan otomatis**. | Admin mengunggah foto ke kolom ImgBB. |
| `ready_to_publish` | Naskah sudah lengkap dan foto ImgBB **sudah terisi**. Draf resmi masuk antrean antariksa (*queue*). | Menunggu giliran dipanggil oleh cron job (atau opsi klik terbit instan jika darurat). |
| `published` | Artikel telah resmi tayang di portal AdaFakta melalui eksekusi cron job berkala. | Memantau performa di web / Telegram. |
| `archived` | Draf yang ditolak / dihapus oleh admin. | - |

---

## 3. Desain Layout Struktur UI Halaman Jurnalis (`/admin/jurnalis`)

### A. Bagian Header & Baris Metrik Antrean (*Queue Stats*)

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ 📰 Meja Jurnalis AI                                               [🔄 Sinkronisasi Berita]   │
│ Asisten intelijen liputan & antrean penerbitan berkala otomatis                             │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│  [ 📝 Draf Baru: 12 ]    [ ⚠️ Menunggu Foto: 5 ]    [ ⏳ Antrean Tayang: 3 ]    [ 🚀 Tayang: 28 ]    │
│  ───────────────────    ─────────────────────    ──────────────────────    ────────────────  │
│  Usulan bot terkini      Naskah siap, foto kosong  Akan tayang tiap 1-2 jam  Resmi di portal │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

### B. Desain Kartu Berita (News Card)

Setiap kartu berita memiliki layout modular dengan slot foto yang jelas:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ [Kategori: AI] • [Sumber: Reuters] • [20 menit lalu]           [Badge: ⏳ Masuk Antrean]    │
│                                                                                             │
│ 📌 OpenAI Resmi Umumkan Agen Otonom Baru untuk Otomasi Perusahaan                           │
│ adafaktanews - OpenAI meluncurkan arsitektur agen otonom generasi teranyar yang mampu...    │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│ 🖼️ FOTO COVER ARTIKEL (Wajib Diisi untuk Masuk Antrean)                                     │
│                                                                                             │
│ [ KONDISI 1: JIKA FOTO BELUM DIISI ]                                                        │
│ ┌─────────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ 📁 [Klik / Drag Foto dari Galeri HP/PC] atau [Tempel URL Gambar]                        │ │
│ │ 💡 Foto akan otomatis di-upload dan dioptimasi ke CDN ImgBB.                            │ │
│ └─────────────────────────────────────────────────────────────────────────────────────────┘ │
│ ⚠️ Status: Berita tersimpan aman, BELUM masuk antrean tayang karena foto masih kosong.      │
│                                                                                             │
│ [ KONDISI 2: JIKA FOTO SUDAH TERISI ]                                                       │
│ ┌───────────────┬─────────────────────────────────────────────────────────────────────────┐ │
│ │ [Thumbnail    │ ✅ Terhubung ke ImgBB CDN: https://i.ibb.co/xyz/cover.webp              │ │
│ │  Preview      │ 📝 Caption: Ilustrasi peluncuran agen AI OpenAI                         │ │
│ │  120x80 px]   │ [ Ganti Foto ]  [ Hapus ]                                               │ │
│ └───────────────┴─────────────────────────────────────────────────────────────────────────┘ │
│ ✅ Status: SUDAH MASUK ANTREAN TAYANG (Akan diterbitkan cron job pada giliran berikutnya)    │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│ 🏷️ Tags: #openai #kecerdasan-buatan #teknologi-informasi                                    │
│ [ 👁️ Preview Naskah ]     [ 🚀 Terbitkan Sekarang (Bypass) ]     [ 🗑️ Hapus Draf ]         │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Rincian Teknis Implementasi

### 1. Penambahan Kolom Tabel Database (`jurnalis_drafts`)
Agar data foto dan status antrean tersimpan dengan rapi tanpa mengotori tabel artikel utama sebelum gilirannya tiba:
* `cover_url`: text (link CDN ImgBB hasil upload admin)
* `cover_caption`: text (keterangan foto)
* `category`: varchar(100) (kategori hasil klasifikasi AI)
* `tags`: text[] (array tags topik)
* `status`: default `'draft'` (mendukung `'draft'`, `'generated'`, `'ready_to_publish'`, `'published'`)

### 2. Endpoint Cron Job Baru (`/api/cron/jurnalis-publisher`)
* **URL**: `GET /api/cron/jurnalis-publisher`
* **Proteksi**: Header `Authorization: Bearer CRON_SECRET`
* **Logika Eksekusi (1 Berita per Panggilan)**:
  1. Cari 1 draf dengan kondisi:
     `status = 'ready_to_publish' AND cover_url IS NOT NULL AND generated_article IS NOT NULL`
     diurutkan berdasarkan `created_at ASC` (draf yang lebih dulu masuk antrean diterbitkan lebih awal).
  2. Jika tidak ada draf siap:
     Kembalikan `{ success: true, message: 'Tidak ada draf dalam antrean siap tayang.' }`.
  3. Jika ada:
     - Masukkan ke tabel `articles` dengan:
       - `title`: `draft.generated_title`
       - `slug`: auto-generated slug unik
       - `content`: `draft.generated_article`
       - `category`: `draft.category`
       - `coverUrl`: `draft.cover_url`
       - `coverCaption`: `draft.cover_caption`
       - `tags`: `draft.tags`
       - `author`: `'Redaksi Ada Fakta'`
       - `status`: `'published'`
       - `publishedAt`: `new Date()`
     - Update draf di `jurnalis_drafts` menjadi `status = 'published'`.
     - Panggil `notifySearchEngines` (Instant Indexing Google & Bing).
     - Panggil `sendTelegramMessage` ke Bot Telegram Admin:
       > 🤖 **JURNALIS AUTOPUBLISH TAYANG**
       > 📰 **[Judul Berita]**
       > 📂 Kategori: [Kategori]
       > 🖼️ Foto ImgBB: [Link]
       > 🌐 Baca: [URL Web]
       > ⏳ Sisa Antrean: [X] berita

### 3. Server Actions & Komponen Upload di Admin
* **Action `attachPhotoToDraftAction(draftId, formData)`**:
  - Menerima file upload atau URL foto.
  - Mengunggah ke ImgBB via `uploadImageToImgbb()`.
  - Mengubah status draf menjadi `ready_to_publish`.
  - Revalidate halaman `/admin/jurnalis`.
* **Action `removePhotoFromDraftAction(draftId)`**:
  - Menghapus foto dari draf dan mengembalikan status ke `generated` (keluar dari antrean).
* **Action `instantPublishDraftAction(draftId)`**:
  - Tombol darurat jika admin tidak mau menunggu giliran cron dan ingin berita tersebut langsung tayang detik itu juga.

---

## 5. Konfigurasi Jadwal di Cron-Job.org

Setelah endpoint dibuat, Anda cukup mendaftarkan URL cron di layanan cron-job.org gratis:
* **URL**: `https://www.adafakta.web.id/api/cron/jurnalis-publisher`
* **Schedule**: 
  - Opsi A: Setiap 1 jam (`0 * * * *`)
  - Opsi B: Setiap 2 jam (`0 */2 * * *`)
* **Headers**: `Authorization: Bearer [CRON_SECRET Anda]`

Dengan begitu, draf yang Anda beri foto akan otomatis tersedot dan terbit satu per satu tanpa Anda harus menjaga website.
