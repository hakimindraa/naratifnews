# ⚡ Rencana Kerja: Optimasi Dashboard Admin (Ringan, Bersih, Anti-Lag & Bebas Animasi Lebay)

> **Status:** Draft Perencanaan (Belum Diimplementasikan)  
> **Tujuan:** Menjadikan seluruh area Admin (`/admin`) terasa sangat ringan (*lightweight*), berkecepatan tinggi (*instant response*), bernuansa monokrom redaksi profesional, dan bebas dari animasi yang membebani CPU/GPU serta hiasan visual yang berlebihan (*no gimmicks, zero lag*).  
> **Prinsip Utama:** *Clean Editorial Typography*, *Zero Repaint Animations*, *No Unnecessary Badges/Gradients*, *On-Demand Background Tasks*.

---

## 1. Analisis Elemen yang Membebani & Bikin "Lebay"

| Komponen / Lokasi | Kondisi Saat Ini (Beban & Ramai) | Rencana Pengurangan / Optimasi |
| :--- | :--- | :--- |
| **Sidebar Admin**<br>`AdminLayoutClient.tsx` | • Hampir semua menu ditempeli badge warna-warni (`Bot Intel`, `Pro AI`, `Baru`, `Profil`, `Live`, `Cuan`, `CDN`, `Auto`).<br>• Dot status redaksi berkedip (`animate-pulse`).<br>• Efek hover membesar pada ikon (`scale-110`). | 🧹 **Hapus seluruh 8 badge** dekoratif di menu.<br>🧹 Hapus efek `animate-pulse` (gunakan dot solid tenang).<br>🧹 Hapus efek `scale-110` pada ikon. |
| **Widget Bot Telegram**<br>`BotJurnalisWidget.tsx` | • 2 lingkaran blur raksasa dekoratif (`blur-2xl` & `blur-xl`).<br>• Animasi radar `animate-ping` & `animate-pulse`.<br>• Gradien neon ungu-indigo dengan bayangan tebal (`shadow-indigo-500/20`). | 🧹 **Hapus 100% bola blur dekoratif**.<br>🧹 Hapus efek `animate-ping` & `animate-pulse`.<br>🧹 Ganti gradien neon menjadi kartu putih bersih flat dengan border netral (`border-gray-200`). |
| **Kartu Produksi AI**<br>`app/admin/page.tsx` | • 5 kartu menggunakan gradien pelangi berbeda (ungu, indigo, cyan, amber, abu-abu).<br>• Efek hover kartu membesar (`scale-105`) dan panah bergeser.<br>• Dot berkedip pada status Draf Review. | 🧹 **Seragamkan semua kartu** menjadi putih bersih monokrom.<br>🧹 Hapus efek `scale-105` dan transisi gerak panah.<br>🧹 Hapus animasi pulse pada status draf review. |
| **Modal & Popover**<br>`ImgbbMediaModal.tsx`<br>`DraftPhotoModal.tsx`<br>`AuthorModal.tsx` | • Memakai efek kaca buram latar (`backdrop-blur-md` / `backdrop-blur-xs`).<br>• Efek transisi melayang (`animate-in zoom-in-95 fade-in`). | 🧹 **Hapus CSS blur** (ganti warna solid overlay `bg-black/50`).<br>🧹 Hapus animasi zoom/fade (modal langsung muncul instan 0 ms). |
| **Status Deploy Vercel**<br>`VercelStatusBadge.tsx` | • Polling latar belakang otomatis terus-menerus (`setInterval` 10s saat build, 5m saat idle).<br>• Tombol redeploy berkedip `animate-bounce` & `animate-ping`. | ⚡ **Ubah polling menjadi on-demand** (hanya mengecek saat tombol ditekan).<br>🧹 Hapus animasi bounce dan ping pada tombol. |

---

## 2. Pratinjau Desain Layout Baru

### A. Sidebar Navigasi: Rapi, Bersih, Monokrom
```
[ SEBELUMNYA - TERLALU RAMAI ]            [ SESUDAH - BERSIH & PROFESIONAL ]
┌─────────────────────────────────┐       ┌─────────────────────────────────┐
│ 📰 Jurnalis AI    [ Bot Intel ] │       │ 📰 Jurnalis AI                  │
│ ✏️ Tulis Berita                 │       │ ✏️ Tulis Berita                 │
│ ✨ AI Studio          [ Pro AI ]│  ──>  │ ✨ AI Studio                    │
│ 🔗 Sadur Berita URL     [ Baru ]│       │ 🔗 Sadur Berita URL             │
│ 👥 Tim Penulis        [ Profil ]│       │ 👥 Tim Penulis                  │
│ ⏱️ Cron Job            [ Live ] │       │ ⏱️ Cron Job                     │
│ 🪙 Manajemen Iklan     [ Cuan ] │       │ 🪙 Manajemen Iklan              │
│ 🖼️ Media ImgBB          [ CDN ] │       │ 🖼️ Media ImgBB                  │
│ ⚙️ Pengaturan AI                │       │ ⚙️ Pengaturan AI                 │
│ 🗄️ Pembersihan DB       [ Auto ]│       │ 🗄️ Pembersihan DB               │
└─────────────────────────────────┘       └─────────────────────────────────┘
```

### B. Widget Bot Jurnalis: Flat & Ramping
```
[ SEBELUMNYA ]
* Background gradien ungu-indigo mencolok.
* Bola blur ungu dan indigo mengambang di pojok kanan (boros render GPU).
* Dot hijau memantul-mantul (animate-ping).
* Banyak bayangan warna tebal.

[ SESUDAH ]
┌───────────────────────────────────────────────────────────────────────────┐
│ 🤖 PORTAL BOT JURNALIS TELEGRAM                            [ ↗ Buka Bot ] │
│ Monitoring intelijen berita & otomasi liputan lapangan.                   │
│ Tautan: https://bottelejurnalis.vercel.app/           [ 📋 Salin Tautan ] │
└───────────────────────────────────────────────────────────────────────────┘
* Background putih bersih, border border-gray-200 tipis.
* Tanpa bola blur, tanpa efek ping berkedip, tipografi tegas dan elegan.
```

### C. Kartu Metrik Produksi Berita: Minimalis Monokrom
```
┌──────────────────┬──────────────────┬──────────────────┬──────────────────┬──────────────────┐
│ Jurnalis AI      │ AI Studio        │ Sadur URL        │ Autopilot        │ Manual / .MD     │
│ 9 Terjadwal      │ 0 Draf           │ 0 Draf           │ 0 Draf           │ 0 Draf           │
│ / 84 usulan      │ / 0 total        │ / 0 total        │ / 0 total        │ / 0 total        │
└──────────────────┴──────────────────┴──────────────────┴──────────────────┴──────────────────┘
* Seluruh kartu seragam putih, angka hitam tebal (kontras tinggi), tanpa gradien pelangi.
```

---

## 3. Rencana Langkah Implementasi

### Langkah 1: Bersihkan Sidebar & Header Admin (`AdminLayoutClient.tsx`)
- Hapus properti `badge` pada seluruh objek di array `navItems`.
- Hapus render elemen `item.badge` di desktop dan mobile.
- Ganti dot `bg-emerald-400 animate-pulse` dengan dot solid tenang `bg-emerald-500`.
- Hapus kelas `group-hover:scale-110` dan ganti `transition-all` menjadi `transition-colors`.
- Hapus `backdrop-blur-md` pada header mobile.

### Langkah 2: Sederhanakan Widget Bot Jurnalis (`BotJurnalisWidget.tsx`)
- Hapus elemen `div` dekoratif blur:
  - `-right-12 -top-12 h-44 w-44 rounded-full bg-indigo-200/30 blur-2xl`
  - `-bottom-10 right-1/3 h-32 w-32 rounded-full bg-purple-200/20 blur-xl`
- Hapus `animate-ping` dan `animate-pulse` pada status widget.
- Ganti `bg-gradient-to-br from-indigo-50/90 via-purple-50/40 to-white` dengan `bg-white border border-gray-200`.
- Hapus shadow warna `shadow-indigo-500/20`.

### Langkah 3: Monokromkan Kartu Dasbor Utama (`app/admin/page.tsx`)
- Hapus gradien pelangi dari 5 kartu sumber AI:
  - `bg-gradient-to-br from-purple-50` -> `bg-white border border-gray-200`
  - `bg-gradient-to-br from-indigo-50` -> `bg-white border border-gray-200`
  - `bg-gradient-to-br from-cyan-50`   -> `bg-white border border-gray-200`
  - `bg-gradient-to-br from-amber-50`  -> `bg-white border border-gray-200`
  - `bg-gradient-to-br from-gray-50`   -> `bg-white border border-gray-200`
- Hapus `group-hover:scale-105` dan `group-hover:translate-x-0.5`.
- Hapus `animate-pulse` pada badge Draf Review.

### Langkah 4: Optimasi Modal & Polling Background
- **Modal Dialog (`ImgbbMediaModal.tsx`, `DraftPhotoModal.tsx`, `AuthorModal.tsx`)**:
  - Hapus kelas animasi `animate-in fade-in zoom-in-95 duration-200` agar modal terbuka seketika tanpa delay transisi.
  - Hapus kelas `backdrop-blur-xs` / `backdrop-blur-sm` pada backdrop overlay hitam.
- **Vercel Status (`VercelStatusBadge.tsx`)**:
  - Hapus timer polling otomatis berkala `setInterval`.
  - Ubah menjadi status statis yang diperiksa saat mount atau manual via tombol refresh.
  - Hapus `animate-bounce` dan `animate-ping`.

### Langkah 5: Pengujian & Validasi
- Jalankan `npx tsc --noEmit` untuk menjamin tidak ada kesalahan sintaks atau tipe TypeScript.
- Uji navigasi di browser: pastikan perpindahan halaman instan, tidak ada lag animasi, dan tampilan terlihat rapi serta berwibawa.
