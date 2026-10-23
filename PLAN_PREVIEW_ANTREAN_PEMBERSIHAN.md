# RENCANA KERJA & DESAIN LAYOUT: PRATINJAU ANTREAN PEMBERSIHAN DATA (PURGE QUEUE PREVIEW)

Dokumen perencanaan dan desain antarmuka (*UI/UX Layout*) untuk penambahan fitur **Daftar Pratinjau Antrean Berita/Item yang Akan Dihapus** pada halaman Pembersihan Database AdaFakta (`/admin/maintenance`).

---

## 1. Konsep Utama & Tujuan

Fitur ini memberikan **transparansi 100%** bagi Admin. Daripada hanya melihat ringkasan angka, Admin dapat:
1. Melihat **daftar nyata** berita atau item apa saja yang sedang berada dalam siklus retensi.
2. Mengetahui **asal halamannya** secara jelas (*Meja Jurnalis AI: Salinan Draf Live*, *Meja Jurnalis AI: Draf Usulan Mentah*, atau *AI Studio Generator: Log Prompt*).
3. Memantau **kapan tanggal jatuh temponya** (*misal: "Dihapus pada 29 Okt (dalam 6 hari)"* atau *"⚡ Siap Dihapus"*).
4. Menyediakan **opsi hapus satuan manual** langsung di baris item jika Admin ingin membersihkan item tertentu tanpa menunggu jadwal retensi.

---

## 2. Desain Layout & Struktur Antarmuka (Wireframe Visual)

Bagian ini akan dipasang tepat di bawah panel pengaturan retensi pada halaman `/admin/maintenance`:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 📋 PRATINJAU ANTREAN DATA DALAM SIKLUS RETENSI                                                               │
│ Transparansi seluruh data non-publik yang terdaftar dalam siklus pembersihan database                        │
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ [ Filter Kategori: ]                                                                                         │
│ (●) Semua Data (127)   ( ) 📰 Salinan Draf Live (83)   ( ) 🤖 Draf Mentah Bot (28)   ( ) 📑 Log AI (16)       │
│                                                                                                              │
│ [ 🔍 Cari judul berita, kategori, atau prompt...                   ]   [ Tampilkan: 10 per halaman ▼ ]       │
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ TABEL PRATINJAU DATA:                                                                                        │
│                                                                                                              │
│ ITEM & JUDUL BERITA              ASAL HALAMAN (SUMBER)          TGL MASUK     STATUS JADWAL HAPUS   AKSI     │
│ ───────────────────────────────  ─────────────────────────────  ────────────  ────────────────────  ───────  │
│ 📌 World Bank Ungkap Lamanya...   📰 Meja Jurnalis AI           22 Okt 2026   ⏳ Dihapus: 29 Okt     [ 🗑️ ]   │
│    Kategori: Bisnis • ID #104       └─ Salinan Live Terbit         (1 hari lalu) (dalam 6 hari)              │
│                                                                                                              │
│ 📌 Jelang Pemilu Serbia, Demo... 📰 Meja Jurnalis AI           22 Okt 2026   ⏳ Dihapus: 29 Okt     [ 🗑️ ]   │
│    Kategori: Internasional • #103   └─ Salinan Live Terbit         (1 hari lalu) (dalam 6 hari)              │
│                                                                                                              │
│ 📌 PTK Bantu Padamkan Kebakaran  📰 Meja Jurnalis AI           22 Okt 2026   ⏳ Dihapus: 29 Okt     [ 🗑️ ]   │
│    Kategori: Nasional • ID #102     └─ Salinan Live Terbit         (1 hari lalu) (dalam 6 hari)              │
│                                                                                                              │
│ 🤖 Usulan: Gempa M 5.2 Maluku... 🤖 Meja Jurnalis AI           18 Okt 2026   ⏳ Dihapus: 25 Okt     [ 🗑️ ]   │
│    Sumber: Antara • Draf Belum Ada Foto  └─ Draf Mentah Bot         (5 hari lalu) (dalam 2 hari)              │
│                                                                                                              │
│ 📑 Prompt: [Sadur] Reuters AI... 📑 AI Studio / Generator      08 Okt 2026   ⚡ Siap Dihapus         [ 🗑️ ]   │
│    Model: deepseek-v4-flash          └─ Riwayat Log Prompt         (15 hari lalu)(Jatuh Tempo)               │
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Navigasi Halaman:  ◄ Sebelumnya   [ Halaman 1 dari 6 ]   Selanjutnya ►                                      │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Rincian Kolom & Pemetaan Asal Halaman

Setiap baris data menyajikan metadata lengkap:

1. **Judul & Detail Item**:
   * Menampilkan judul artikel / judul usulan draf bot / cuplikan prompt AI.
   * Menampilkan kategori topik dan ID basis data.
2. **Asal Halaman (Sumber Asal)**:
   * 🟢 **`📰 Meja Jurnalis AI (Salinan Live Terbit)`**:
     Berasal dari halaman `/admin/jurnalis` dengan status `published` (sudah live di web publik).
   * 🟡 **`🤖 Meja Jurnalis AI (Draf Usulan Mentah)`**:
     Berasal dari usulan bot RSS di `/admin/jurnalis` dengan status `draft` (belum dipasangi foto).
   * 🔵 **`📑 AI Studio / Generator (Log Prompt)`**:
     Berasal dari log eksekusi artikel otomatis di tabel `ai_generation_logs`.
3. **Tanggal Dibuat & Umur Data**:
   * Tanggal kalender (misal: `22 Okt 2026`).
   * Umur data relatif (misal: `1 hari lalu`, `5 hari lalu`).
4. **Status & Hitung Mundur Jadwal Hapus**:
   * Jika belum melewati batas retensi:
     `⏳ Dihapus pada [Tgl Target] (dalam X hari)`
   * Jika sudah melewati batas retensi:
     `⚡ Siap Dihapus (Jatuh Tempo)` dengan badge animasi oranye/merah.
5. **Tombol Hapus Satuan (`[ 🗑️ Hapus ]`)**:
   * Memungkinkan Admin menghapus item tersebut detik itu juga tanpa harus menunggu jadwal cron atau menghapus item lain.

---

## 4. Desain Responsif Mobile (Tampilan HP)

Di layar ponsel (smartphone), tabel otomatis bertransformasi menjadi kartu ringkas (*Compact Cards*):

```
┌────────────────────────────────────────────────────────┐
│ 📰 Meja Jurnalis AI • Salinan Live      [ 🗑️ Hapus ]   │
│ 📌 World Bank Ungkap Lamanya Proses Izin Bisnis...     │
│ ────────────────────────────────────────────────────── │
│ 📅 Dibuat: 22 Okt 2026 (1 hari lalu)                   │
│ ⏳ Jadwal Hapus: 29 Okt 2026 (dalam 6 hari)            │
└────────────────────────────────────────────────────────┘
```

---

## 5. Rincian Teknis Backend (`actions.ts`)

1. **Action `getPurgeCandidateItemsAction(params)`**:
   * Menerima parameter: `{ page: number, pageSize: number, filter: string, search: string }`.
   * Mengambil data gabungan:
     * Dari `jurnalisDrafts` (status `draft` dan `published`).
     * Dari `aiGenerationLogs`.
   * Menghitung tanggal target hapus secara dinamis:
     `targetDeleteDate = new Date(createdAt.getTime() + retentionDays * 24 * 60 * 60 * 1000)`
   * Mengembalikan daftar item dengan paginasi efisien (ringan, tidak menarik teks konten utuh).

2. **Action `deleteIndividualPurgeItemAction(type, id)`**:
   * Menerima tipe item (`'jurnalis_draft'` atau `'ai_log'`) dan ID baris.
   * Menghapus baris terpilih secara instan.
   * Me-revalidasi halaman `/admin/maintenance` dan `/admin/jurnalis`.

---

## 6. Rencana Langkah Kerja (Checklist)

- [x] **Langkah 1**: Buat fungsi query backend `getPurgeCandidateItemsAction` dan `deleteIndividualPurgeItemAction` di `app/admin/maintenance/actions.ts`.
- [x] **Langkah 2**: Tambahkan komponen tabel pratinjau, filter tab asal halaman, kotak pencarian, dan paginasi di `MaintenanceClientView.tsx`.
- [x] **Langkah 3**: Tambahkan modal konfirmasi hapus satuan yang aman.
- [x] **Langkah 4**: Lakukan validasi build / TypeScript (`tsc --noEmit`) untuk memastikan sistem stabil tanpa galat.
