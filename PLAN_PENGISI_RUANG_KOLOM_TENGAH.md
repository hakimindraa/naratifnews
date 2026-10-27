# 📐 Cetak Biru Perencanaan: Pengisi Ruang Kosong Kolom Tengah (Lead Story)

> **Status:** Draft Usulan Desain Layout Struktur — Menunggu Review & Arahan User  
> **Target Lokasi:** [app/(public)/page.tsx](file:///e:/porto/naratif/app/(public)/page.tsx#L278-L291) (Kolom Tengah / 50% Grid Hero CNN)  
> **Posisi:** Tepat di bawah sub-peluru berita terkait (*"• Jurnalisme Robot..."*) dan di atas garis batas *Daily Assistance Widget*.  
> **Tinggi Ruang Kosong yang Tersedia:** ± 180px – 220px (untuk menyeimbangkan tinggi Kolom Kiri & Kolom Kanan).  
> **Aturan:** *Hanya rencana desain tata letak (mockup struktur). Jangan implementasi apa pun sebelum disetujui.*

---

## 🔍 Analisis Masalah Ruang Kosong Saat Ini

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ STRUKTUR GRID 3-KOLOM SAAT INI:                                                                        │
│                                                                                                        │
│ ┌───────────────────────────┬───────────────────────────────────────────────┬────────────────────────┐ │
│ │ KOLOM KIRI (25%)          │ KOLOM TENGAH (50%)                            │ KOLOM KANAN (25%)      │ │
│ ├───────────────────────────┼───────────────────────────────────────────────┼────────────────────────┤ │
│ │ [Foto 16:9]               │ JUDUL BESAR HEADLINE UTAMA                    │ 🔥 POPULER HARI INI    │ │
│ │ Kategori: AI              │ font-normal, 32px Inter                       │ 01 Waka KPK Usulkan... │ │
│ │ Judul Sorotan 1           │                                               │ 02 Gubernur Banten...  │ │
│ │                           │ [                                           ] │ 03 Setahun Berjalan... │ │
│ │ ─── hairline ───────────  │ [              FOTO HERO 16:9               ] │ 04 Pangkalpinang...    │ │
│ │ 🔴 Terkini                │ [                                           ] │ 05 HIMK Tanjung...     │ │
│ │ Judul Analisis 1          │                                               │                        │ │
│ │ ─── hairline ───────────  │ NASIONAL • 16 menit lalu                      │ ─── hairline ───────── │ │
│ │ Analisis                  │                                               │ 📜 KILAS BALIK ARSIP   │ │
│ │ Judul Analisis 2          │ • Jurnalisme Robot Ancam Karir Wartawan...    │ [Foto] Judul Samsung.. │ │
│ │ ─── hairline ───────────  │                                               │                        │ │
│ │ [Foto] Berita Bromo       │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │                        │ │
│ │ Judul Sorotan 2           │ ░░░░░░░░ RUANG KOSONG (± 200px) ░░░░░░░░░░░░  │                        │ │
│ │                           │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │                        │ │
│ └───────────────────────────┴───────────────────────────────────────────────┴────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🎨 3 Opsi Solusi Desain Struktur

---

### OPSI 1: Mini Carousel Auto-Swipe (*Saran Anda: Paling Dinamis & Interaktif*) ⭐

Menempatkan slider kartu berita ringkas yang berputar secara otomatis ke samping setiap 4.5 detik.

#### 1. Diagram Layout Struktur:
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [Foto Hero Utama 16:9]                                                       │
│ NASIONAL • 16 menit lalu                                                     │
│ • Jurnalisme Robot Ancam Karir Wartawan, Begini Strategi Jurnalis Bertahan   │
├──────────────────────────────────────────────────────────────────────────────┤
│ ⚡ PILIHAN REDAKSI                                 ‹  [● ○ ○ ○]  ›           │
│                                                                              │
│ ┌───────────────────────────────┐  ┌───────────────────────────────────────┐ │
│ │ [Thumb 16:9]   NASIONAL       │  │ [Thumb 16:9]   EKONOMI                │ │
│ │ [Mini 90x60]   Pemerintah     │  │ [Mini 90x60]   Nilai Tukar Rupiah     │ │
│ │                Siapkan Bansos │  │                Menguat di Akhir Pekan │ │
│ │                Beras Baru     │  │                ke Rp 15.800           │ │
│ │                ⏱️ 1 jam lalu  │  │                ⏱️ 2 jam lalu          │ │
│ └───────────────────────────────┘  └───────────────────────────────────────┘ │
│                (Slide 1 dari 4 — Bergeser Halus Otomatis)                    │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### 2. Karakteristik & Fitur Opsi 1:
* **Komposisi Konten:** Menampilkan 2 kartu berita mini per *slide* (total ada 4–6 berita pilihan dalam antrean geser).
* **Perilaku Gerak (*Auto-swipe*):** 
  - Geser otomatis ke samping (*smooth slide transition*) setiap 4.5 detik.
  - **Smart Pause on Hover:** Begitu kursor mouse diarahkan ke salah satu kartu berita, putaran otomatis langsung berhenti (*pause*) agar pembaca tidak terganggu saat membaca judul.
  - Tombol manual panah kiri `‹` dan kanan `›` plus indikator titik (*dot pagination*) untuk pengguna yang ingin mengklik manual.
* **Kelebihan:** Halaman terlihat sangat modern, berkelas, tidak membosankan, dan mampu memuat banyak artikel penting dalam area yang hemat ruang.

---

### OPSI 2: Dual Sub-Lead Grid 2-Kolom (*Gaya Standar CNN / NYTimes: Paling Simetris*)

Menempatkan 2 kartu berita sorotan berukuran mini berdampingan secara statis tanpa animasi.

#### 1. Diagram Layout Struktur:
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [Foto Hero Utama 16:9]                                                       │
│ NASIONAL • 16 menit lalu                                                     │
│ • Jurnalisme Robot Ancam Karir Wartawan, Begini Strategi Jurnalis Bertahan   │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ ┌────────────────────────────────────┬─────────────────────────────────────┐ │
│ │ [FOTO MINI 16:9]                   │ [FOTO MINI 16:9]                    │ │
│ │                                    │                                     │ │
│ │ TEKNOLOGI                          │ BISNIS                              │ │
│ │ Apple Resmi Gandeng OpenAI         │ Impor Minyak RI Ditargetkan Turun   │ │
│ │ untuk Fitur Siri Generasi Baru     │ 20% Berkat B40 Nasional             │ │
│ │ ⏱️ 45 menit lalu                   │ ⏱️ 2 jam lalu                       │ │
│ └────────────────────────────────────┴─────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### 2. Karakteristik & Fitur Opsi 2:
* **Komposisi Konten:** 2 kolom simetris (`grid grid-cols-2 gap-4`). Masing-masing kolom menampilkan:
  - Foto mini 16:9 yang tajam dengan rasio proporsional.
  - Kicker kategori huruf merah (`text-red-600 text-[10px] font-bold uppercase`).
  - Judul berita 2 baris dengan font Inter normal/medium (`leading-snug`).
* **Kelebihan:** 
  - 100% konsisten dengan desain klasik CNN Edition dan New York Times.
  - Sangat bersih, statis (tanpa timer JavaScript), dan kedua berita langsung terbaca sekaligus tanpa perlu menunggu pergeseran slide.
  - Tingginya pas menyamakan batas bawah kolom kiri dan kolom kanan.

---

### OPSI 3: Ringkasan Berita Eksekutif + Multi-Peluru Terkait (*Gaya BBC / Reuters*)

Memperkuat nilai jurnalisme berita utama dengan menambahkan cuplikan isi (*excerpt*) dan daftar berita bertopik serupa.

#### 1. Diagram Layout Struktur:
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [Foto Hero Utama 16:9]                                                       │
│ NASIONAL • 16 menit lalu                                                     │
│                                                                              │
│ ▌ "Wakil Ketua Komisi III DPR Ahmad Sahroni secara tegas menentang usulan    │
│ ▌ KPK terkait perampasan aset pejabat negara yang tidak patuh LHKPN dengan   │
│ ▌ menekankan perlindungan hak asasi manusia dalam proses hukum."             │
│                                                                              │
│ ───────────────────────────────── hairline ───────────────────────────────── │
│ 📌 BERITA TERKAIT TOPIK INI:                                                 │
│ • Jurnalisme Robot Ancam Karir Wartawan, Begini Strategi Jurnalis Bertahan   │
│ • Waka KPK: Perampasan Aset Jadi Solusi Efektif Pengembalian Kerugian Negara │
│ • ICW Desak DPR Segera Sahkan RUU Perampasan Aset Tanpa Trik Politik         │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### 2. Karakteristik & Fitur Opsi 3:
* **Komposisi Konten:** 
  - 1 kotak kutipan ringkasan (*deck summary*) dengan aksen garis vertikal merah di sebelah kiri (`border-l-2 border-red-600`).
  - 3 baris tautan peluru berita terkait (*related stories*) dipisah garis tipis halus.
* **Kelebihan:** Sangat editorial, memperkuat konteks berita utama bagi pembaca yang ingin cepat paham inti berita tanpa harus langsung klik.

---

## 📊 Matriks Perbandingan 3 Opsi

| Kriteria | Opsi 1: Carousel Auto-Swipe | Opsi 2: Dual Grid Mini CNN | Opsi 3: Excerpt & Multi-Peluru |
| :--- | :---: | :---: | :---: |
| **Karakter Visual** | Dinamis, Modern, Bergerak | Kokoh, Bersih, Simetris | Informatif, Tajam, Editorial |
| **Jumlah Artikel Tertampung** | **4 – 6 Artikel** (Banyak) | 2 Artikel | 3 – 4 Artikel (Teks) |
| **Unsur Gambar** | Ada (Foto Mini Slide) | Ada (2 Foto Mini Statis) | Dominan Teks Ringkasan |
| **Beban Kinerja / JS** | Ringan (Client Slider Hook) | Nol JS (Pure Server Render) | Nol JS (Pure Server Render) |
| **Keseimbangan Kolom** | ⭐⭐⭐⭐⭐ (Sangat Pas) | ⭐⭐⭐⭐⭐ (Sangat Pas) | ⭐⭐⭐⭐ (Cukup Pas) |

---

## 📌 Rekomendasi Selanjutnya

1. Jika Anda ingin halaman depan terasa **hidup, interaktif, dan modern**, pilih **Opsi 1 (Carousel Auto-Swipe)**.
2. Jika Anda menyukai tata letak **koran formal yang statis, kokoh, dan rapi**, pilih **Opsi 2 (Dual Grid Mini CNN)**.

*Silakan pelajari dan pilih salah satu opsi di atas. Saya siap mengimplementasikan opsi yang Anda putuskan.*
