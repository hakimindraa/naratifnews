# Rencana Revisi Layout Responsif Mobile: Pemisahan Carousel Tematik per Baris

Dokumen ini merupakan **revisi rencana tata letak mobile**, di mana ketiga kategori (**Nasional**, **Internasional**, dan **Sport**) **TIDAK DIGABUNGKAN**, melainkan **DIPISAH** dan **DISELIPKAN BERTAHAP** di antara baris-baris *Berita Terbaru* pada layar ponsel.

---

## 1. Konsep Utama Layout Mobile (Pola "Magazine Feed")

* **Berita Terbaru di Mobile**: Ditampilkan dalam format **2 Kolom (`grid-cols-2`)** yang proporsional dan mudah dibaca di layar HP.
* **Pemisahan 3 Kategori Tematik**:
  Setiap beberapa baris berita terbaru, diselipkan 1 baris khusus untuk kategori tertentu yang dapat **digeser ke samping (*Horizontal Swipe Snap*)**.
* **Jaminan Tampilan Desktop**:
  **100% TIDAK DIUBAH**. Di desktop, layout tetap 8 kolom (kiri) untuk Berita Terbaru dan 4 kolom (kanan) untuk Sidebar Tematik vertikal. Komponen carousel selingan mobile ini disembunyikan di desktop (`lg:hidden`).

---

## 2. Struktur Ritme Tampilan Layar Ponsel (Mobile Wireframe)

Berikut alur pengalaman scroll pembaca di ponsel dari atas ke bawah:

```
┌────────────────────────────────────────────────────────┐
│ 📰 Berita Terbaru (4 Artikel Pertama - 2 Kolom)        │
│ ┌────────────────────────┐  ┌────────────────────────┐ │
│ │ [Foto Berita 1]        │  │ [Foto Berita 2]        │ │
│ │ Judul Berita 1...      │  │ Judul Berita 2...      │ │
│ └────────────────────────┘  └────────────────────────┘ │
│ ┌────────────────────────┐  ┌────────────────────────┐ │
│ │ [Foto Berita 3]        │  │ [Foto Berita 4]        │ │
│ │ Judul Berita 3...      │  │ Judul Berita 4...      │ │
│ └────────────────────────┘  └────────────────────────┘ │
├────────────────────────────────────────────────────────┤
│ 🇮🇩 KABAR NASIONAL (Selingan 1 - Geser Menyamping ➔)    │
│  [◄ GESER JEMPOL KE KANAN / KIRI (SNAP CAROUSEL) ►]    │
│ ┌─────────────────────┐  ┌─────────────────────┐  ┌─── │
│ │ [Foto Nasional 1]   │  │ [Foto Nasional 2]   │  │ .. │
│ │ Judul Berita Nas 1  │  │ Judul Berita Nas 2  │  │    │
│ │ 2 jam lalu          │  │ 4 jam lalu          │  │    │
│ └─────────────────────┘  └─────────────────────┘  └─── │
├────────────────────────────────────────────────────────┤
│ 📰 Lanjutan Berita Terbaru (4 Artikel Berikutnya)      │
│ ┌────────────────────────┐  ┌────────────────────────┐ │
│ │ [Foto Berita 5]        │  │ [Foto Berita 6]        │ │
│ │ Judul Berita 5...      │  │ Judul Berita 6...      │ │
│ └────────────────────────┘  └────────────────────────┘ │
│ ┌────────────────────────┐  ┌────────────────────────┐ │
│ │ [Foto Berita 7]        │  │ [Foto Berita 8]        │ │
│ │ Judul Berita 7...      │  │ Judul Berita 8...      │ │
│ └────────────────────────┘  └────────────────────────┘ │
├────────────────────────────────────────────────────────┤
│ 🌍 JENDELA INTERNASIONAL (Selingan 2 - Geser Samping ➔)│
│  [◄ GESER JEMPOL KE KANAN / KIRI (SNAP CAROUSEL) ►]    │
│ ┌─────────────────────┐  ┌─────────────────────┐  ┌─── │
│ │ [Foto Global 1]     │  │ [Foto Global 2]     │  │ .. │
│ │ Judul Berita Inter 1│  │ Judul Berita Inter 2│  │    │
│ │ 1 jam lalu          │  │ 3 jam lalu          │  │    │
│ └─────────────────────┘  └─────────────────────┘  └─── │
├────────────────────────────────────────────────────────┤
│ 📰 Lanjutan Berita Terbaru (4 Artikel Berikutnya)      │
│ ┌────────────────────────┐  ┌────────────────────────┐ │
│ │ [Foto Berita 9]        │  │ [Foto Berita 10]       │ │
│ │ Judul Berita 9...      │  │ Judul Berita 10...     │ │
│ └────────────────────────┘  └────────────────────────┘ │
│ ┌────────────────────────┐  ┌────────────────────────┐ │
│ │ [Foto Berita 11]       │  │ [Foto Berita 12]       │ │
│ │ Judul Berita 11...     │  │ Judul Berita 12...     │ │
│ └────────────────────────┘  └────────────────────────┘ │
├────────────────────────────────────────────────────────┤
│ ⚽ ARENA SPORT (Selingan 3 - Geser Menyamping ➔)       │
│  [◄ GESER JEMPOL KE KANAN / KIRI (SNAP CAROUSEL) ►]    │
│ ┌─────────────────────┐  ┌─────────────────────┐  ┌─── │
│ │ [Foto Sport 1]      │  │ [Foto Sport 2]      │  │ .. │
│ │ Judul Skor / Laga 1 │  │ Judul Transfer 2    │  │    │
│ │ 30 mnt lalu         │  │ 2 jam lalu          │  │    │
│ └─────────────────────┘  └─────────────────────┘  └─── │
├────────────────────────────────────────────────────────┤
│ 📰 Sisa Berita Terbaru (Hingga Akhir)                  │
│ ┌────────────────────────┐  ┌────────────────────────┐ │
│ │ [Foto Berita 13]       │  │ [Foto Berita 14]       │ │
│ └────────────────────────┘  └────────────────────────┘ │
│                                                        │
│             [ ⬇ Muat Lebih Banyak Berita ]             │
└────────────────────────────────────────────────────────┘
```

---

## 3. Detail Desain Komponen Selingan Mobile (Mobile Strip Carousel)

Setiap selingan tematik dirancang agar terasa eksklusif dan interaktif:

1. **Header Kategori**:
   - Judul dengan aksen warna kategori:
     - 🇮🇩 **Kabar Nasional**: Badge Merah + Link *"Lihat Semua ➔"* ke `/berita/nasional`
     - 🌍 **Jendela Internasional**: Badge Biru + Link *"Lihat Semua ➔"* ke `/berita/internasional`
     - ⚽ **Arena Sport**: Badge Oranye/Amber + Link *"Lihat Semua ➔"* ke `/berita/sport`
2. **Ukuran & Mekanisme Geser Kartu**:
   - Lebar kartu: **`w-[240px]`** dengan `shrink-0 snap-start`.
   - Di layar ponsel, lebar 240px ini sengaja menyisakan sekitar 20% tepi kartu berikutnya di sebelah kanan. Ini adalah prinsip UX modern yang memberi tahu jempol pembaca secara visual bahwa deretan ini **bisa digeser ke samping**.
   - Dilengkapi *snap scroll* CSS murni (`overflow-x-auto scrollbar-hide snap-x snap-mandatory`) yang sangat ringan dan tidak memberatkan performa rendering ponsel.

---

## 4. Perbandingan Tampilan Desktop vs Mobile

| Karakteristik | Tampilan Desktop (`lg:`) | Tampilan Layar Ponsel Mobile (`< lg:`) |
|:---|:---|:---|
| **Berita Terbaru** | 2 Kolom kartu di dalam wadah 8-kolom kiri | **2 Kolom kartu (`grid-cols-2`)** proporsional |
| **Kabar Nasional** | Kotak 1 di Sidebar kanan (4 kolom) | **Selingan Carousel Geser ke-1** (setelah 4 berita terbaru) |
| **Jendela Internasional** | Kotak 2 di Sidebar kanan (4 kolom) | **Selingan Carousel Geser ke-2** (setelah 8 berita terbaru) |
| **Arena Sport** | Kotak 3 di Sidebar kanan (4 kolom) | **Selingan Carousel Geser ke-3** (setelah 12 berita terbaru) |
| **Efek Visual** | Sidebar sticky di sebelah kanan layar | Interaktif touch scroll horizontal di sela feed berita |

---

## 5. Status Eksekusi

✅ **Selesai Diimplementasikan dan Terverifikasi**:
1. **Berita Terbaru di Mobile**: Kini tampil proporsional dalam format **2 Kolom (`grid-cols-2 gap-3`)** yang nyaman dibaca dan tidak lagi 1 kolom memanjang.
2. **Pemisahan 3 Kategori Tematik di Mobile**:
   - 🇮🇩 **Kabar Nasional**: Diselipkan sebagai snap carousel horizontal setelah 4 artikel berita terbaru pertama.
   - 🌍 **Jendela Internasional**: Diselipkan sebagai snap carousel horizontal setelah 8 artikel berita terbaru.
   - ⚽ **Arena Sport**: Diselipkan sebagai snap carousel horizontal setelah 12 artikel berita terbaru.
   - Ketiganya bisa digeser menyamping (*swipeable snap scroll*) menggunakan jempol tangan.
3. **Tampilan Desktop 100% Terjaga**: Di desktop (`lg:`), carousel mobile disembunyikan (`lg:hidden`) dan layout sidebar vertikal 8:4 tetap utuh seperti sedia kala.
4. Lolos pengecekan TypeScript (`tsc --noEmit`) dengan **0 error** dan pengujian HTTP SSR dengan status **200 OK**.
