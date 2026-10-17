# PLAN: Redesain Navbar Ada Fakta — Opsi 1 (Modern Newsroom)

> **Status:** Siap Ditinjau (Menunggu Perintah Anda Sebelum Implementasi)  
> **Target Portal:** Ada Fakta (`adafakta.web.id`)  
> **Teknologi:** Next.js 16 (App Router), React 19, Tailwind CSS v4  
> **Konsep:** *"Modern Newsroom"* — Standar portal berita digital modern (seperti The Verge, Reuters, Detik modern) yang ramping, elegan, cepat, dan ramah smartphone.

---

## 1. Latar Belakang & Masalah Navbar Saat Ini

Navbar yang terpasang saat ini di `app/(public)/layout.tsx` memiliki sejumlah kekurangan:

| Aspek | Kondisi Saat Ini (Lama) | Target Opsi 1 (Modern Newsroom) |
|---|---|---|
| **Tinggi di Mobile** | Memakan ~160px vertikal (~35% tinggi layar HP sebelum artikel pertama muncul) | Dipadatkan menjadi **56px** (Header) + **38px** (Category Strip), hemat ruang hingga **>45%** |
| **Gaya Visual** | Kotak hitam kaku (`bg-gray-900`) mengambang di tengah layar | **Glassmorphism sticky** (`bg-white/95 backdrop-blur-md`) dengan hairline border tipis dan elegan |
| **Menu Mobile** | Tidak ada tombol Hamburger (☰) maupun Drawer menu samping | Tersedia **Mobile Slide-Over Drawer** lengkap dengan kategori, pencarian, dan link legal redaksi |
| **Indikator Aktif** | Kategori tidak tahu halaman mana yang sedang aktif | **Active Route Indicator** dinamis (`usePathname`) dengan garis aksen merah/hitam |
| **Informasi Tanggal** | Tidak ada penunjuk hari/tanggal bahasa Indonesia di desktop | **Top Utility Bar** memuat tanggal real-time WIB dan indikator *Live Update* |
| **Ergonomi Pencarian** | Tombol cari hanya ikon bulat di kanan tanpa shortcut | Search bar bersih di desktop + ikon pencarian mudah dijangkau di mobile & drawer |

---

## 2. Wireframe & Desain Visual

### A. Tampilan Desktop (> 1024px)

```text
+-------------------------------------------------------------------------------------------------------+
|  [Tier 1: Top Utility Bar - h: 32px | bg-gray-50 border-b border-gray-100]                            |
|  Sabtu, 17 Oktober 2026  •  Jakarta (WIB)  |  🟢 LIVE UPDATE       [Tentang] [Redaksi] [Pedoman] [WA] |
+-------------------------------------------------------------------------------------------------------+
|  [Tier 2: Main Sticky Glass Header - h: 64px | bg-white/95 backdrop-blur-md shadow-xs]               |
|                                                                                                       |
|  adafakta         Semua   Software   Hardware   AI   Infrastruktur   Gadget   Regional   [🔍 Cari] [💬 Lapor] |
|  (Logo)                  ───────── (active underline)                                                |
+-------------------------------------------------------------------------------------------------------+
|  [Tier 3: Slim Breaking News Ticker - h: 36px | bg-red-50/60 border-b border-red-100/50]              |
|  [🔴 BREAKING]  Gemini 2.5 Pro Resmi Dirilis dengan Peningkatan Penalaran...             [Lihat Selengkapnya →] |
+-------------------------------------------------------------------------------------------------------+
```

### B. Tampilan Mobile (< 768px)

```text
+---------------------------------------------------+
| [Mobile Header - h: 56px | Sticky Glassmorphism] |
|                                                   |
|  [☰ Menu]             adafakta            [🔍]   |
+---------------------------------------------------+
| [Swipeable Category Tabs - h: 38px | bg-white]    |
|  Semua  •  Software  •  Hardware  •  AI  •  Gad... >|
+---------------------------------------------------+
| [Breaking Ticker Mini - h: 32px]                  |
|  [BREAKING] Judul berita terkini...               |
+---------------------------------------------------+
|                                                   |
|  (Konten Artikel Langsung Terlihat di Layar!)    |
|                                                   |
```

### C. Mobile Slide-Over Drawer (Menu Samping)

Saat pengguna menekan tombol Hamburger **[☰]** di mobile:

```text
+───────────────────────────+
│ adafakta               [✕]│  <- Header Drawer & Tombol Tutup
├───────────────────────────┤
│ [ 🔍 Cari berita di sini ]│  <- Input Pencarian Cepat
├───────────────────────────┤
│ KATEGORI UTAMA            │
│ 📰 Semua Berita           │
│ 💻 Software               │
│ ⚙️ Hardware               │
│ 🤖 Kecerdasan Buatan (AI) │
│ 🌐 Infrastruktur & Jaringan│
│ 📱 Gadget & Smartphone    │
│ 🗺️ Kabar Regional         │
├───────────────────────────┤
│ TENTANG KAMI              │
│ • Susunan Redaksi         │
│ • Pedoman Media Siber     │
│ • Kebijakan Privasi       │
│ • Hubungi Redaksi         │
├───────────────────────────┤
│ 💬 Kirim Fakta via WA     │  <- Tombol Direct WhatsApp Lapor
│ 📢 Channel Telegram       │
├───────────────────────────┤
│ © 2026 Ada Fakta          │
+───────────────────────────+
```

---

## 3. Struktur Komponen & Arsitektur File

Seluruh navbar akan dimodularisasi ke dalam direktori khusus: `app/(public)/components/navbar/`. Hal ini membuat kode sangat rapi, mudah dirawat, dan terpisah dari layout utama.

```text
app/(public)/
├── components/
│   └── navbar/
│       ├── TopUtilityBar.tsx         # [Server/Client] Tanggal hari ini, Live update pulse, info redaksi
│       ├── MainNavbar.tsx            # [Client] Header utama desktop & mobile (logo, links, search, drawer trigger)
│       ├── MobileDrawer.tsx          # [Client] Off-canvas drawer (animasi slide, backdrop blur, lock scroll)
│       ├── CategoryPillsMobile.tsx   # [Client] Strip horizontal kategori swipeable dengan fading edge
│       ├── BreakingTicker.tsx        # [Server/Client] Ticker berita breaking ramping dan elegan
│       └── index.tsx                 # [Container] Komponen penyatu yang dipanggil di layout.tsx
└── layout.tsx                        # Menggunakan <NavbarContainer ... /> menggantikan header lama
```

---

## 4. Rincian Teknis Komponen

### 1. `TopUtilityBar.tsx` (Desktop Utility Bar)
- **Tampilan:** Ketinggian ramping `h-8` (32px), latar belakang `bg-gray-50/80 border-b border-gray-100`.
- **Elemen Kiri:**
  - Tanggal otomatis dalam format Bahasa Indonesia: `Sabtu, 17 Oktober 2026`.
  - Jam/Indikator zona waktu: `WIB`.
  - Indikator status: Titik hijau berdenyut (`animate-pulse`) bertuliskan *"Live Update"*.
- **Elemen Kanan:**
  - Navigasi cepat: *Tentang*, *Redaksi*, *Pedoman*, *Kontak*.
  - Ikon mini WhatsApp / Telegram redaksi.
- **Responsif:** Tersembunyi otomatis di layar tablet/smartphone (`hidden lg:flex`).

### 2. `MainNavbar.tsx` (Header Utama Sticky Glass)
- **Status:** Sticky di bagian atas layar (`sticky top-0 z-40 bg-white/95 backdrop-blur-md shadow-xs border-b border-gray-100`).
- **Elemen Kiri (Mobile):** Tombol Hamburger (☰) dengan area sentuh ergonomis (44x44px).
- **Elemen Tengah/Kiri (Desktop):**
  - Logo `adafakta` tipografi khas (`font-heading font-black tracking-tighter text-2xl lg:text-3xl`).
- **Elemen Navigasi Tengah (Desktop):**
  - Daftar kategori: *Semua*, *Software*, *Hardware*, *AI*, *Infrastruktur*, *Gadget*, *Regional*.
  - Integrasi `usePathname()` dari `next/navigation`:
    - Link yang aktif otomatis mendapatkan aksen teks tegas (`text-red-600 font-bold`) dan garis bawah aktif (`border-b-2 border-red-600`).
    - Link tidak aktif memiliki efek hover halus (`hover:text-red-600 transition-colors`).
- **Elemen Kanan:**
  - Tombol Search (Desktop: tombol pill pencarian yang elegan dengan icon kaca pembesar; Mobile: ikon bulat).
  - Tombol CTA: Tombol *"Lapor Fakta"* bernuansa merah/hitam yang mengarahkan langsung ke WhatsApp redaksi.

### 3. `MobileDrawer.tsx` (Menu Samping Interaktif)
- **Transisi & Animasi:**
  - Menggunakan CSS transition halus (`transition-transform duration-300 ease-in-out`).
  - Posisi `fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-white z-50 shadow-2xl`.
  - Backdrop gelap: `fixed inset-0 bg-black/50 backdrop-blur-xs z-40 transition-opacity`.
- **Interaktivitas:**
  - Tutup saat pengguna menekan tombol **[✕]**.
  - Tutup saat pengguna mengklik area backdrop di luar menu.
  - Tutup otomatis saat pengguna menekan tombol `Escape` di keyboard.
  - Tutup otomatis saat link kategori diklik (pindah halaman).
  - Mengunci scroll body (`document.body.style.overflow = 'hidden'`) saat drawer terbuka agar layar belakang tidak bergeser.

### 4. `CategoryPillsMobile.tsx` (Strip Kategori Mobile)
- **Tampilan:** Baris tab horizontal tepat di bawah header utama mobile (`h-10 border-b border-gray-100 bg-white`).
- **Kemudahan Akses:** Menggunakan horizontal swipe (`overflow-x-auto scrollbar-hide`) dengan padding kanan agar kategori terakhir tidak terpotong.
- **Gradient Hint:** Fading mask putih di tepi kanan (`pointer-events-none bg-gradient-to-l from-white to-transparent w-8`) memberi sinyal visual kepada pengguna bahwa baris ini dapat digeser.

### 5. `BreakingTicker.tsx` (Ticker Berita Terkini)
- **Tampilan:** Baris berita ramping dengan nuansa cerah kontras (`bg-red-50/70 border-b border-red-100`).
- **Badge:** Badge merah tegas `BREAKING` atau `TERKINI` dengan font tebal.
- **Konten:** Judul artikel terbaru dari database dengan efek truncate rapi, link langsung ke artikel, dan ikon panah `→`.

---

## 5. Rencana Langkah Implementasi

Pekerjaan akan dieksekusi dengan 5 tahap sistematis setelah Anda memberikan perintah:

1. **Tahap 1: Pembuatan Komponen Modular**
   - Membuat folder `app/(public)/components/navbar/`.
   - Membuat `TopUtilityBar.tsx`, `CategoryPillsMobile.tsx`, dan `BreakingTicker.tsx`.
2. **Tahap 2: Pembuatan Mobile Drawer & Main Header**
   - Membuat `MobileDrawer.tsx` lengkap dengan drawer overlay, keyboard escape, kuncian scroll, daftar kategori ber-ikon, serta tautan kontak/redaksi.
   - Membuat `MainNavbar.tsx` yang menggabungkan logo, menu desktop dengan `usePathname()`, tombol pencarian, CTA WhatsApp, dan tombol hamburger.
3. **Tahap 3: Integrasi ke Layout Publik**
   - Mengupdate `app/(public)/layout.tsx` untuk memanggil `<NavbarContainer ... />`.
   - Menghapus kode header lama yang memakan ruang vertikal tinggi dan kotak hitam kaku.
   - Memastikan iklan Header Banner (`AdSlot`) tetap tampil proporsional di bawah navbar.
4. **Tahap 4: Pengujian Kualitas & Verifikasi**
   - Menguji di resolusi Desktop (1440px, 1024px), Tablet (768px), dan Mobile (360px, 390px).
   - Menjalankan `npx tsc --noEmit` dan `npm run build` untuk memverifikasi kompatibilitas Next.js 16.
5. **Tahap 5: Deployment**
   - Git add, commit dengan pesan deskriptif.
   - Push ke GitHub repository untuk auto-deploy di Vercel.

---

## 6. Pertanyaan / Konfirmasi Terakhir Sebelum Eksekusi

Sebelum saya memulai penulisan kode, silakan tinjau rencana di atas:
1. Apakah susunan kategori di navbar sudah pas: **Semua, Software, Hardware, AI, Infrastruktur, Gadget, Regional**?
2. Apakah tombol CTA di navbar desktop diarahkan ke **WhatsApp Redaksi / Lapor Fakta** atau tombol lain?
3. Jika sudah sesuai, berikan perintah: **"Lanjutkan implementasi"** dan saya akan langsung mengeksekusinya sampai tuntas.
