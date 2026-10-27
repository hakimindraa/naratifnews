# 🏛️ Cetak Biru Lengkap Redesain Halaman Publik Ada Fakta (CNN Edition: Header s/d Footer)

> **Status:** Draft Perencanaan Menyeluruh (Header s/d Footer) — Menunggu Persetujuan User  
> **Brand:** `adafakta` (Portal Berita Faktual & Sains Teknologi Terpercaya)  
> **Inspirasi Referensi:** [edition.cnn.com](https://edition.cnn.com)  
> **Filosofi Inti:** *World-Class Editorial Grid, CNN Sans Typography, Hairline Dividers, High-Density Information, Zero Bubble Cards*.  
> **Ruang Lingkup:** Seluruh halaman publik: Header ➔ Hot Topics ➔ Hero 3 Kolom ➔ Data Widget ➔ Kabar Nusantara ➔ Feed Berita Terbaru ➔ Thematic Deep-Dive ➔ Kanal Eksplorasi ➔ Footer.  
> **Aturan:** *Jangan implementasi apa pun dulu sampai seluruh cetak biru ini disetujui oleh user.*

---

## 1. Sistem Tipografi & Font CNN (*CNN Sans Style*)

CNN memiliki identitas visual yang khas melalui font **CNN Sans** (berakar dari *Helvetica Neue* & *Neue Haas Grotesk*). Di Ada Fakta, kita akan menerapkan padanan Google Fonts terbaik:

* **Font Judul (`--font-heading`):** **`Public_Sans`** / **`Inter_Tight`** (bobot 800 & 900)
* **Font Teks Tubuh (`--font-sans`):** **`Inter`** (bobot 400, 500, 600)

```
┌────────────────────────────────────────────────────────────────────────┐
│  CONTOH GAYA TIPOGRAFI CNN:                                            │
│                                                                        │
│  🔴 TERKINI • 10 MENIT LALU                                            │
│  Netanyahu fights for his political survival                           │
│  as pivotal Israeli election kicks off                                 │
└────────────────────────────────────────────────────────────────────────┘
```

### Aturan Skala Tipografi Kartu Berita:
1. **Headline Lead (Judul Terbesar Kolom Tengah):**
   `font-heading font-black text-2xl sm:text-3xl lg:text-[38px] tracking-tight leading-[1.12] text-gray-950 hover:text-red-700 transition-colors`
2. **Headline Sekunder (Kolom Kiri & Sub-Hero):**
   `font-heading font-extrabold text-base sm:text-lg lg:text-xl tracking-tight leading-snug text-gray-900 hover:text-red-600 transition-colors`
3. **Headline List / Populer (Kolom Kanan & Feed):**
   `font-heading font-bold text-sm sm:text-[15px] tracking-tight leading-snug text-gray-900 hover:text-red-600 transition-colors`
4. **Category Kicker & Tag Status:**
   `text-[11px] font-black uppercase tracking-wider text-red-600` (atau hitam `text-gray-900` untuk opini/analisis)
5. **Metadata & Durasi Waktu:**
   `text-[11px] font-normal text-gray-500`

---

## 2. Diagram Arsitektur Penuh: Dari Header Sampai Footer

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [BAGIAN 1] HEADER RAMPING 1 BARIS (56px)                                                                         │
│ [≡]  adafakta   Nasional  Internasional  Regional  AI  Gadget  Software  Hardware  Lainnya ▾  [🟢 Live] [🔍] [⚫ WA]│
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ [BAGIAN 2] HOT TOPICS SUB-BAR (32px)                                                                             │
│ Topik Hangat:  #teknologi  |  #ai  |  #gadget  |  #nasional  |  #ekspor gas  |  #infrastruktur                  │
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ [BAGIAN 3] HERO 3-KOLOM CNN (LEAD STORY & SUPPORTING GRID)                                                       │
│ ┌───────────────────────────┬───────────────────────────────────────────────┬──────────────────────────────────┐ │
│ │ KOLOM KIRI (25%)          │ KOLOM TENGAH (50% - ANCHOR UTAMA)             │ KOLOM KANAN (25%)                │ │
│ │                           │                                               │                                  │ │
│ │ [Foto 16:9 Sekunder]      │ JUDUL HEADLINE UTAMA PALING BESAR             │ 🔥 POPULER HARI INI              │ │
│ │ Judul Berita Sorotan      │ FONT BLACK ALA CNN (36-38PX)                  │ 01 Judul Populer Utama           │ │
│ │ ───────────────────────── │ (Diletakkan Tepat di Atas Foto Hero)          │    ⏱️ 20 menit lalu               │ │
│ │ 🔴 Terkini                │                                               │ ──────────────────────────────── │ │
│ │ Rangkuman berita cepat 1  │ [          FOTO HERO UTAMA 16:9          ]    │ 02 Judul Berita Populer 2        │ │
│ │ ───────────────────────── │ [        RESOLUSI TINGGI TAJAM           ]    │ ──────────────────────────────── │ │
│ │ Analisis & Opini          │                                               │ 03 Judul Berita Populer 3        │ │
│ │ Rangkuman berita cepat 2  │ 🔴 Terkini • [Kategori] • 15 menit lalu       │ ──────────────────────────────── │ │
│ │ ───────────────────────── │ Narasi pembuka artikel yang menggugah...      │ 04 Judul Berita Populer 4        │ │
│ │ [Foto Mini] Kilas Berita  │ • Sub-topik terkait: Berita pilihan 1         │ ──────────────────────────────── │ │
│ │ Cuplikan ringkas daerah   │ • Sub-topik terkait: Berita pilihan 2         │ 📜 KILAS BALIK ARSIP             │ │
│ │                           │                                               │ [Foto 16:9] Judul Arsip Pilihan  │ │
│ └───────────────────────────┴───────────────────────────────────────────────┴──────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ [BAGIAN 4] BILAH DATA & PASAR (MARKET & WEATHER STRIP ALA CNN)                                                   │
│ 💵 USD/IDR: Rp 16.245   │   ⛅ Cuaca Jakarta: 29°C Cerah Berawan   │   🍃 Kualitas Udara: AQI 68 (Sedang)       │
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ [BAGIAN 5] KABAR NUSANTARA (REGIONAL SPOTLIGHT)                                                                  │
│ ┌───────────────────────┬───────────────────────┬───────────────────────┬──────────────────────────────────────┐ │
│ │ [Foto] IKN NUSANTARA  │ │ [Foto] JAWA BARAT   │ │ [Foto] SULAWESI SEL   │ │ [Foto] SUMATERA UTARA              │ │
│ │ Judul Berita Daerah 1 │ │ Judul Berita Daerah 2 │ Judul Berita Daerah 3 │ │ Judul Berita Daerah 4              │ │
│ └───────────────────────┴───────────────────────┴───────────────────────┴──────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ [BAGIAN 6] GRID BERITA UTAMA MENGALIR (LATEST NEWS RIVER & THEMATIC SIDEBAR)                                    │
│ ┌───────────────────────────────────────────────────────────┬──────────────────────────────────────────────────┐ │
│ │ SISI KIRI (65% LEBAR) - FEED BERITA TERBARU               │ SISI KANAN (35% LEBAR) - THEMATIC DEEP DIVE      │ │
│ │                                                           │                                                  │ │
│ │ [Foto 16:9] Judul Berita Format Hero                      │ ── NASIONAL ───────────────────────────────────  │ │
│ │ Narasi ringkas dan waktu terbit...                        │ [Foto] Berita Utama Nasional                     │ │
│ │ ───────────────────────────────────────────────────────── │ • Peluru berita nasional 1                       │ │
│ │ [Thumb 100x75]  Judul Berita List Samping (Detik/CNN)     │ • Peluru berita nasional 2                       │ │
│ │                 🔴 AI & Sains • 25 menit lalu             │ ── INTERNASIONAL ──────────────────────────────  │ │
│ │ ───────────────────────────────────────────────────────── │ [Foto] Berita Dunia Utama                        │ │
│ │ [Thumb 100x75]  Judul Berita List Samping                 │ • Peluru berita dunia 1                          │ │
│ │                 Gadget • 40 menit lalu                    │ ── SPORT & OTOMASI ────────────────────────────  │ │
│ │ ───────────────────────────────────────────────────────── │ [Foto] Berita Sport Pilihan                      │ │
│ │ [Tombol: Muat Berita Lainnya ▾]                           │                                                  │ │
│ └───────────────────────────────────────────────────────────┴──────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ [BAGIAN 7] KANAL EKSPLORASI KATEGORI (TOPIC HUBS)                                                                │
│ [ AI & Otomasi ] [ Gadget & Perangkat ] [ Software & Web ] [ Hardware ] [ Infrastruktur ] [ Regional ]          │
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ [BAGIAN 8] FOOTER RESMI CNN STYLE (DARK EDITORIAL DIRECTORY)                                                     │
│ adafakta. • Direktori Kanal Berita • Standar Dewan Pers • Susunan Redaksi • Hak Jawab • Copyright 2026           │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Rincian Desain & Struktur Tiap Bagian (Section-by-Section)

---

### BAGIAN 1: Header Ramping 1 Baris (56px)
* **Desain:** Menggabungkan bilah atas dan bilah navigasi menjadi **1 baris ramping** berwarna putih bersih dengan garis batas bawah tipis `border-b border-gray-200`.
* **Kiri:** Tombol hamburger drawer `≡` + Brand Logo `ada`**`fakta`**.
* **Tengah:** Tautan kategori utama dengan font tebal tegas: `Nasional`, `Internasional`, `Regional`, `AI`, `Gadget`, `Software`, `Hardware`, `Lainnya ▾`.
* **Kanan:** Indikator `🟢 Live`, tombol pencarian `🔍`, dan tombol hitam elegan `[⚫ Saluran WA]`.

---

### BAGIAN 2: Sub-Bar Topik Hangat (Hot Topics Strip)
* **Desain:** Garis pita horizontal tipis (32px) berlatar abu-abu sangat muda (`bg-gray-50/70`) dengan garis batas `border-b border-gray-200`.
* **Konten:** Tagar trending dinamis dari database yang dipisahkan oleh tanda pipa tipis:
  `Topik Hangat:  #teknologi  |  #ai  |  #gadget  |  #nasional  |  #ekspor gas  |  #infrastruktur`
* **Karakter:** Bersih, tidak menabrak tombol lain, dan memberikan akses instan ke isu yang sedang dibicarakan publik.

---

### BAGIAN 3: Hero 3-Kolom CNN (Pilar Utama Tampilan Halaman)
* **Desain Kartu:** **Zero Bubble / No Heavy Cards.** Tidak menggunakan kartu kotak bulat dengan shadow tebal. Menggunakan format koran digital modern dengan garis pemisah vertikal tipis `border-r border-gray-200`.
* **Kolom Kiri (25%):**
  - **1 Berita Pilihan Sekunder:** Foto 16:9 dengan judul bold font-extrabold di bawahnya.
  - **2 Berita Analisis/Teks:** Dibatasi garis horizontal tipis dengan label `🔴 Terkini` dan `Analisis`.
  - **1 Berita Mini Visual:** Cuplikan ringkas daerah.
* **Kolom Tengah (50% - Lead Story Anchor):**
  - **Judul Raksasa di ATAS Foto Hero:** Ciri khas paling kuat dari CNN. Judul dicetak ekstra besar (`text-3xl sm:text-4xl lg:text-[38px] font-black tracking-tight leading-[1.12] text-gray-950`).
  - **Foto Hero 16:9:** Resolusi tinggi, jernih, dengan efek hover zoom halus.
  - **Lead Deck:** Ringkasan narasi pembuka artikel yang tajam.
  - **Sub-headline Peluru Terkait:** 2-3 tautan berita terkait isu utama di bawah foto dengan bullet point merah.
* **Kolom Kanan (25% - Populer & Arsip):**
  - **🔥 Populer Hari Ini:** 5 artikel terpopuler bernomor urut tebal (`01`, `02`, `03`...) dengan tipografi rapat khas CNN right-rail.
  - **Kilas Balik:** 1 artikel arsip pilihan dengan foto 16:9 di bagian bawah kolom.

---

### BAGIAN 4: Bilah Data & Pasar (Market & Weather Strip ala CNN)
* **Desain:** Bilah data horizontal ramping yang disematkan langsung di bawah Hero Grid.
* **Konten Nyata Ada Fakta:**
  - Kurs Rupiah terhadap Dolar AS: `💵 USD/IDR Rp 16.245`
  - Cuaca Jakarta: `⛅ 29°C Cerah Berawan`
  - Kualitas Udara: `🍃 AQI 68 (Sedang)`
  - Tren Pencarian Indonesia
* **Tampilan:** Menggantikan kotak widget tebal menjadi pita status berdefinisi tajam dengan hairline border.

---

### BAGIAN 5: Kabar Nusantara (Regional Spotlight 4 Kolom)
* **Header Bagian:** Judul tegas `KABAR NUSANTARA` dengan garis aksen merah tipis di atasnya.
* **Struktur Kartu (4 Kolom Rata):**
  - Foto 16:9 dengan transisi zoom halus.
  - Label Kicker Wilayah berhuruf kapital merah/abu-abu (`IKN NUSANTARA`, `JAWA BARAT`, `SUMATERA UTARA`).
  - Judul berita bold 2 baris (`font-extrabold text-sm sm:text-base leading-snug`).
  - Waktu terbit relatif (`15 menit lalu`).
  - Garis pembatas vertikal antar-kartu.

---

### BAGIAN 6: Feed Berita Mengalir & Thematic Sidebar
* **Sisi Kiri (65%): Feed Berita Terbaru (`LatestNewsSection`)**
  - **Struktur Kartu Berita:**
    - Pola Hero berkala (foto lebar 16:9 di atas, judul di bawah).
    - Pola List Samping CNN/Detik (thumbnail persegi panjang 100×75 di kiri, judul bold di kanan, waktu di bawah).
    - Setiap item dipisahkan oleh garis pemisah horizontal tipis `border-b border-gray-200 pb-4`.
  - **Tombol Muat Lebih Banyak:** Desain minimalis elegan `Muat Berita Lainnya ▾`.
* **Sisi Kanan (35%): Thematic Deep-Dive Sidebar (`ThematicSidebar`)**
  - Blok kanal tematik: `Nasional`, `Internasional`, dan `Sport`.
  - Tiap blok memiliki 1 berita utama dengan gambar + 3 sub-headline peluru di bawahnya dipisahkan garis tipis.

---

### BAGIAN 7: Kanal Eksplorasi Kategori (Topic Hubs)
* **Desain:** Grid bersih berlatar putih dengan border tipis menampilkan hub kanal: `AI & Otomasi`, `Gadget`, `Software`, `Hardware`, `Infrastruktur`, `Nasional`, `Regional`, `Sport`.
* **Konten per Hub:** Nama kanal, jumlah artikel terbit, judul artikel terbaru, dan tautan eksplorasi.

---

### BAGIAN 8: Footer Editorial Resmi CNN Style
* **Desain:** Latar belakang hitam pekat `#0c0c0c` dengan garis atas abu-abu gelap `border-t border-gray-800`.
* **Kolom 1 (Brand & Visi):** Logo `adafakta.` putih tebal, deskripsi independensi media, dan kepatuhan terhadap Pedoman Media Siber Dewan Pers.
* **Kolom 2 (Direktori Kanal Berita):** Daftar tautan seluruh kanal berita Ada Fakta dalam 2 sub-kolom rapi.
* **Kolom 3 (Navigasi Redaksi & Kemitraan):** Tautan ke `Tentang Kami`, `Susunan Redaksi`, `Pedoman Media Siber`, `Kebijakan Privasi`, dan `Kontak & Hak Jawab`.
* **Baris Bawah:** Hak Cipta © 2026 Ada Fakta, tautan kembali ke atas (*Back to Top*), dan catatan lisensi pers digital.

---

## 4. Rencana Implementasi & Garansi Rollback Aman

1. **Titik Awal (Safety Checkpoint):**
   - Membuat branch Git: `feature/cnn-full-layout`.
2. **Eksekusi Bertahap:**
   - Tahap 1: Setup Font CNN `Public_Sans` di `layout.tsx` & `globals.css`.
   - Tahap 2: Rombak Header & Hot Topics di `components/navbar/`.
   - Tahap 3: Susun Grid Hero 3 Kolom di `app/(public)/page.tsx`.
   - Tahap 4: Sesuaikan kartu-kartu berita di `KabarNusantaraSection`, `LatestNewsSection`, dan `DailyAssistanceWidget`.
   - Tahap 5: Poles Footer di `layout.tsx`.
3. **Pilihan Reject:**
   - Jika Anda tidak cocok dengan hasilnya, cukup ketik: *"Reject / Kembalikan ke awal"*, maka `git checkout main` akan mengembalikan 100% website Anda persis seperti semula dalam hitungan 1 detik.

---

> [!NOTE]
> **Belum ada perubahan kode yang diterapkan.** Dokumen ini adalah rancangan komprehensif satu halaman penuh dari atas hingga bawah. Silakan tinjau dan beri tahu saya bila siap untuk mulai diterapkan!
