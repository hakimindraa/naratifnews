# 📰 Cetak Biru Perencanaan: Redesain Bagian Bawah (Feed Berita Terbaru & Sidebar Tematik)

> **Status:** Selesai Diimplementasikan (Approved & Implemented)  
> **Dasar Konsep:** CNN Hybrid Dynamic Flow — *Kombinasi Modul CNN 2-Kolom + Selingan 3-Kolom Kotak + Selingan 2 List + Selingan 1 Berita Besar Melintang*  
> **Berkas Terkait:**  
> 1. [app/(public)/LatestNewsSection.tsx](file:///e:/porto/naratif/app/(public)/LatestNewsSection.tsx)  
> 2. [app/(public)/ThematicSidebar.tsx](file:///e:/porto/naratif/app/(public)/ThematicSidebar.tsx)  
> 3. [app/(public)/page.tsx](file:///e:/porto/naratif/app/(public)/page.tsx)  

---

## 1. Konsep & Filosofi Desain

Agar feed kolom kiri tidak monoton hanya berisi modul 2-kolom terus-menerus, kita menambahkan **selingan variasi ritme editorial** yang berganti-ganti secara elegan saat di-*scroll*:

1. **Modul CNN 2-Kolom (Base Modules):** 2 modul berdampingan, masing-masing 1 foto utama + 2 berita list mini.
2. **Selingan A: 3 Kolom Kotak (*Trio Grid*):** 3 berita berdampingan (1/3 kolom masing-masing).
3. **Selingan B: 2 List Berita Horizontal:** 2 baris list koran (foto di kiri, teks di kanan).
4. **Selingan C: 1 Kolom Berita Besar (*Headline Breaker*):** 1 foto lebar melintang penuh dengan judul sorotan utama.
5. **Sidebar Kanan Tetap Eksis:** Kolom kanan tetap melayang anggun (*sticky*) dengan garis batas koran vertikal.

---

## 2. Skema Alur Visual (*Scrolling Flow Diagram*)

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ ALUR RITME DINAMIS FEED KIRI DENGAN SELINGAN BERGANTI-GANTI:                                           │
│                                                                                                        │
│ ┌───────────────────────────────────────────────────────────────────┬────────────────────────────────┐ │
│ │ FEED BERITA TERBARU (Lebar 8 Kolom)                               │ SIDEBAR TEMATIK (Lebar 4 Kolom)│ │
│ │ [BERITA TERBARU]                                     KABAR TERKINI│ (Menyatu dgn Garis Vertikal)   │ │
│ ├───────────────────────────────────────────────────────────────────┼────────────────────────────────┤ │
│ │ 1. [MODUL CNN: 2 KOLOM BERDAMPINGAN]                              │ 🔴 KABAR NASIONAL      Lihat > │ │
│ │ ┌───────────────────────────────┐ ┌─────────────────────────────┐ │ ────────────────────────────── │ │
│ │ │ ▌ INFRASTRUKTUR               │ │ ▌ REGIONAL                  │ │ [ Foto 16:9 Tajam ]            │ │
│ │ │ [ FOTO BESAR 16:9 ]           │ │ [ FOTO BESAR 16:9 ]         │ │ Sahroni Tolak Usulan KPK...    │ │
│ │ │ Judul Utama                   │ │ Judul Utama                 │ │ ────────────────────────────── │ │
│ │ │ ───────────────────────────── │ │ ─────────────────────────── │ │ • Singapura Bereaksi Tegas...  │ │
│ │ │ [Foto] Berita Mini 1          │ │ [Foto] Berita Mini 1        │ │ • Api Padam, Jalur Bromo...    │ │
│ │ │ [Foto] Berita Mini 2          │ │ [Foto] Berita Mini 2        │ │ • Waka KPK Usulkan Rampas...   │ │
│ │ └───────────────────────────────┘ └─────────────────────────────┘ │                                │ │
│ │ ────────────────────────────────────────────────── hairline ───── │ 🌐 INTERNASIONAL       Lihat > │ │
│ │                                                                   │ ────────────────────────────── │ │
│ │ 2. [SELINGAN A: 3 KOLOM KOTAK BERDAMPINGAN (TRIO GRID)]           │ [ Foto 16:9 Tajam ]            │ │
│ │ ┌──────────────────┐    ┌──────────────────┐   ┌────────────────┐ │ Krisis Timur Tengah Memanas... │ │
│ │ │ [Foto 16:9]      │    │ [Foto 16:9]      │   │ [Foto 16:9]    │ │ • Mahasiswa Serbia Protes...   │ │
│ │ │ Judul Berita 1   │    │ Judul Berita 2   │   │ Judul Berita 3 │ │ • Kimi K3.1 Pro Resmi Rilis... │ │
│ │ └──────────────────┘    └──────────────────┘   └────────────────┘ │                                │ │
│ │ ────────────────────────────────────────────────── hairline ───── │ ⚽ SPORT INDONESIA     Lihat > │ │
│ │                                                                   │ ────────────────────────────── │ │
│ │ 3. [MODUL CNN: 2 KOLOM BERDAMPINGAN BERIKUTNYA]                   │ [ Foto 16:9 ] Timnas Optimis.. │ │
│ │ ┌───────────────────────────────┐ ┌─────────────────────────────┐ │ • Target Poin Kualifikasi...   │ │
│ │ │ ▌ NASIONAL                    │ │ ▌ INTERNASIONAL             │ │                                │ │
│ │ │ [ FOTO BESAR 16:9 ]           │ │ [ FOTO BESAR 16:9 ]         │ │ (Sticky: Melayang anggun saat  │ │
│ │ │ Judul Utama                   │ │ Judul Utama                 │ │  halaman di-scroll)            │ │
│ │ │ ───────────────────────────── │ │ ─────────────────────────── │ │                                │ │
│ │ │ [Foto] Berita Mini 1          │ │ [Foto] Berita Mini 1        │ │                                │ │
│ │ │ [Foto] Berita Mini 2          │ │ [Foto] Berita Mini 2        │ │                                │ │
│ │ └───────────────────────────────┘ └─────────────────────────────┘ │                                │ │
│ │ ────────────────────────────────────────────────── hairline ───── │                                │ │
│ │                                                                   │                                │ │
│ │ 4. [SELINGAN B: 2 LIST BERITA HORIZONTAL]                         │                                │ │
│ │ [Thumbnail Kiri]  KATEGORI • Judul Berita di Kanan                │                                │ │
│ │ ────────────────────────────────────────────────── hairline ───── │                                │ │
│ │ [Thumbnail Kiri]  KATEGORI • Judul Berita di Kanan                │                                │ │
│ │ ────────────────────────────────────────────────── hairline ───── │                                │ │
│ │                                                                   │                                │ │
│ │ 5. [SELINGAN C: 1 KOLOM BERITA BESAR MELINTANG (HEADLINE HERO)]   │                                │ │
│ │ ┌───────────────────────────────────────────────────────────────┐ │                                │ │
│ │ │ [               FOTO PANORAMA RESOLUSI TINGGI 16:9          ] │ │                                │ │
│ │ │ KATEGORI • 2 jam lalu                                         │ │                                │ │
│ │ │ Judul Utama Berita Sorotan Besar yang Memikat                 │ │                                │ │
│ │ └───────────────────────────────────────────────────────────────┘ │                                │ │
│ │                                                                   │                                │ │
│ │ ... Lalu siklus berulang: Modul CNN ➔ Trio ➔ CNN ➔ List ➔ Besar...│                                │ │
│ └───────────────────────────────────────────────────────────────────┴────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Rincian Teknis Eksekusi di [LatestNewsSection.tsx](file:///e:/porto/naratif/app/(public)/LatestNewsSection.tsx)

1. **Struktur Pengelompokan Data (*Data Partitioning*):**
   - Artikel dialokasikan secara siklis:
     - **Batch 1:** 2 Modul CNN (6 artikel: 2 modul × 3 artikel).
     - **Selingan A:** 3 Kolom Kotak (3 artikel).
     - **Batch 2:** 2 Modul CNN (6 artikel).
     - **Selingan B:** 2 List Baris Horizontal (2 artikel).
     - **Selingan C:** 1 Berita Besar Melintang (1 artikel).
     - **Berulang Kembali:** Saat pembaca menekan tombol *"Muat Berita Lainnya"*, siklus berlanjut otomatis.
2. **Kerapian & Keseimbangan Visual:**
   - Modul CNN tetap menggunakan header aksen bar hitam tebal `▌ NAMA KATEGORI`.
   - Garis pemisah hairline tipis membatasi antar-blok selingan sehingga mata pembaca nyaman berpindah fokus.
3. **Responsivitas Layar HP (Mobile UX):**
   - Di layar sentuh ponsel, semua blok (baik modul CNN, 3 kolom, maupun 1 berita besar) menyesuaikan diri ke 1 kolom vertikal yang proporsional dan tidak berantakan.
4. **Penanganan Otomatis Modul Tunggal (Solusi 1 - Adaptive Full-Width):**
   - Jika sisa artikel pada suatu baris hanya cukup untuk 1 modul CNN (tidak ada pasangan modul kedua di kanan), modul tersebut otomatis melebar memenuhi 2 kolom: berita utama di kolom kiri dan 2 berita pendukung di kolom kanan, sehingga tidak ada ruang kosong yang bolong. Begitu berita tambahan dimuat lewat *Load More*, tata letak kembali berpasangan normal.

---

*Cetak biru ini telah berhasil diimplementasikan secara penuh.*
