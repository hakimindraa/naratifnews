# Rencana Penambahan Kategori & Desain Layout Homepage

Dokumen ini merinci rencana penambahan kategori baru (**Internasional**, **Nasional**, **Sport**), usulan kategori pelengkap, serta konsep desain layout penempatannya di halaman utama (*Homepage*) portal berita.

---

## 1. Ringkasan Kategori Baru yang Diminta

| No | Kategori | Slug URL | Cakupan Konten Berita | Icon / Nuansa |
|:--:|:---|:---|:---|:---:|
| 1 | **Nasional** | `/berita/nasional` | Isu kebijakan pemerintah pusat, hukum, politik, peristiwa penting tanah air | 🇮🇩 Merah-Putih |
| 2 | **Internasional** | `/berita/internasional` | Berita mancanegara, geopolitik dunia, diplomasi, peristiwa global | 🌍 Biru Global |
| 3 | **Sport** | `/berita/sport` | Olahraga: Sepak bola (Timnas & Liga), Bulutangkis, MotoGP, F1, dll. | ⚽ Oranye Sporty |

---

## 2. Saran Kategori Tambahan dari Asisten (Opsional untuk Dipertimbangkan)

Jika portal berita Ada Fakta ingin berkembang semakin lengkap dan komprehensif, berikut 3 kategori yang sangat umum dan memiliki daya tarik pembaca tinggi:

1. **Bisnis & Finansial (`Bisnis`)**
   - *Cakupan*: Ekonomi makro, pasar modal/IHSG, perbankan, startup, dan investasi ritel.
   - *Manfaat*: Menarik pembaca profesional dan meningkatkan nilai CPM iklan Google AdSense.
2. **Otomotif (`Otomotif`)**
   - *Cakupan*: Tren kendaraan listrik (EV), peluncuran mobil & motor baru, review, dan tips otomotif.
   - *Manfaat*: Kategori favorit pengiklan industri otomotif.
3. **Hiburan & Lifestyle (`Hiburan`)**
   - *Cakupan*: Sinema, musik, pop culture, gaming, gaya hidup modern.
   - *Manfaat*: Trafik tinggi dan viralitas di media sosial.

*(Catatan: Kategori tambahan ini bersifat saran. Kita bisa fokus pada Nasional, Internasional, dan Sport terlebih dahulu).*

---

## 3. Desain Layout Homepage (Menjawab Permintaan Penempatan Berita)

Pengguna menanyakan:
> *"Bisa ga ya di tampilan homenya menampilkan kategori itu kayak kategori nusantara, tapi isi di tempat kosong atau disamping berita terbaru?"*

**Jawaban: Tentu saja sangat bisa dan justru akan membuat portal berita terlihat jauh lebih profesional, padat informasi, dan tidak monoton.**

Kami menyusun **2 Opsi Desain Layout** untuk Anda pilih:

---

### OPSI 1 (Direkomendasikan): Layout 2 Kolom "Feed Berita Terbaru + Sidebar Tematik"

Saat ini, seksi *Berita Terbaru* mengambil layar penuh 4 kolom ke bawah sehingga bagian kanan terasa kosong jika pembaca scroll jauh. Pada **Opsi 1**, bagian bawah dibagi menjadi rasio **8 : 4 (Desktop)**:
* **Kolom Kiri (Lebar 8 Kolom)**: Feed *Berita Terbaru* (2 Kolom Card) + tombol *Muat Lebih Banyak*.
* **Kolom Kanan (Lebar 4 Kolom - Sidebar Tematik)**: Kotak berita *Nasional*, *Internasional*, dan *Sport* yang kompak dan tersusun vertikal.

#### Wireframe Desktop Opsi 1:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ [Headline Utama & Sorotan]  |  [Populer Hari Ini & Kilas Balik & Widget Asisten]       │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 🗺️ KABAR NUSANTARA (4 Kartu Regional Daerah)                                           │
├───────────────────────────────────────────────────┬────────────────────────────────────┤
│ 📰 BERITA TERBARU (Feed Utama - Lebar 8 Kolom)    │ 📑 SOROT TEMATIK (Lebar 4 Kolom)   │
│                                                   │                                    │
│ ┌──────────────────────┐  ┌─────────────────────┐ │ ┌────────────────────────────────┐ │
│ │ [Gambar Berita 1]    │  │ [Gambar Berita 2]   │ │ │ 🇮🇩 KABAR NASIONAL              │ │
│ │ Kategori: Software   │  │ Kategori: AI        │ │ │ ┌──────────┐ Judul berita      │ │
│ │ Judul Berita Panjang │  │ Judul Berita        │ │ │ │ [Thumb]  │ nasional utama..  │ │
│ │ 2 jam lalu           │  │ 3 jam lalu          │ │ │ └──────────┘                   │ │
│ └──────────────────────┘  └─────────────────────┘ │ │ • Berita nasional ringkas 2    │ │
│                                                   │ │ • Berita nasional ringkas 3    │ │
│ ┌──────────────────────┐  ┌─────────────────────┐ │ └────────────────────────────────┘ │
│ │ [Gambar Berita 3]    │  │ [Gambar Berita 4]   │ │                                    │
│ │ Kategori: Gadget     │  │ Kategori: Hardware  │ │ ┌────────────────────────────────┐ │
│ │ Judul Berita         │  │ Judul Berita        │ │ │ 🌍 JENDELA INTERNASIONAL       │ │
│ │ 4 jam lalu           │  │ 5 jam lalu          │ │ │ ┌──────────┐ Berita dunia      │ │
│ └──────────────────────┘  └─────────────────────┘ │ │ │ [Thumb]  │ terkini & global..│ │
│                                                   │ │ └──────────┘                   │ │
│ ┌──────────────────────┐  ┌─────────────────────┐ │ │ • Berita global ringkas 2      │ │
│ │ [Gambar Berita 5]    │  │ [Gambar Berita 6]   │ │ │ • Berita global ringkas 3      │ │
│ └──────────────────────┘  └─────────────────────┘ │ └────────────────────────────────┘ │
│                                                   │                                    │
│       [ ⬇ Muat Lebih Banyak Berita ]              │ ┌────────────────────────────────┐ │
│                                                   │ │ ⚽ ARENA SPORT                 │ │
│                                                   │ │ ┌──────────┐ Hasil laga & skor │ │
│                                                   │ │ │ [Thumb]  │ transfer pemain.. │ │
│                                                   │ │ └──────────┘                   │ │
│                                                   │ │ • Berita olahraga ringkas 2    │ │
│                                                   │ │ • Berita olahraga ringkas 3    │ │
│                                                   │ │ └────────────────────────────────┘ │
└───────────────────────────────────────────────────┴────────────────────────────────────┘
```

> **Kelebihan Opsi 1**:
> 1. Sangat efisien memanfaatkan ruang horizontal di layar desktop.
> 2. Pembaca yang men-scroll berita terbaru tetap bisa melihat cuplikan berita Nasional, Internasional, dan Sport di sampingnya.
> 3. Tampilan identik dengan portal berita kelas atas (seperti *The Verge, BBC, atau Detikcom*).

---

### OPSI 2: Layout Seksi Tematik 3 Kolom Horizontal (Persis Seperti Kabar Nusantara)

Pada opsi ini, setelah seksi *Kabar Nusantara*, kita buat **1 Seksi Khusus Tematik** dengan layout 3 kolom sejajar, sebelum masuk ke Berita Terbaru:

#### Wireframe Desktop Opsi 2:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 🗺️ KABAR NUSANTARA (Regional)                                                          │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ ⚡ SEKSI KHUSUS: NASIONAL, DUNIA & OLAHRAGA                                            │
│                                                                                        │
│ ┌───────────────────────┐ ┌───────────────────────┐ ┌────────────────────────────────┐ │
│ │ 🇮🇩 NASIONAL           │ │ 🌍 INTERNASIONAL      │ │ ⚽ SPORT                       │ │
│ │ ┌───────────────────┐ │ │ ┌───────────────────┐ │ │ ┌────────────────────┐         │ │
│ │ │ [Foto Card Utama] │ │ │ │ [Foto Card Utama] │ │ │ │ [Foto Card Utama]  │         │ │
│ │ └───────────────────┘ │ │ └───────────────────┘ │ │ └────────────────────┘         │ │
│ │ Judul headline nas..│ │ │ Judul headline int..│ │ │ Judul headline sport..         │ │
│ │                       │ │                       │ │                                │ │
│ │ • List berita 2     │ │ │ • List berita 2     │ │ │ • List berita 2                │ │
│ │ • List berita 3     │ │ │ • List berita 3     │ │ │ • List berita 3                │ │
│ │ [Lihat Semua ➔]     │ │ │ [Lihat Semua ➔]     │ │ │ [Lihat Semua ➔]                │ │
│ └───────────────────────┘ └───────────────────────┘ └────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 📰 BERITA TERBARU (Full Width 4 Kolom Grid seperti sekarang)                           │
│ [Card 1]   [Card 2]   [Card 3]   [Card 4]                                              │
│ [Card 5]   [Card 6]   [Card 7]   [Card 8]                                              │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

> **Kelebihan Opsi 2**:
> 1. Mempertahankan format grid 4 kolom penuh pada seksi Berita Terbaru.
> 2. Ketiga kategori baru mendapatkan sorotan khusus yang seimbang di tengah halaman.

---

## 4. Tampilan Mobile (Responsif Smartphone)

Pada tampilan smartphone:
* Tab Kategori di Navbar otomatis memiliki tombol geser horizontal:
  `[Semua] [Software] [Hardware] [AI] [Infrastruktur] [Gadget] [Regional] [Nasional] [Internasional] [Sport]`
* Di Homepage, seksi tematik dapat diakses dengan swipe horizontal (snap card) yang mulus dan ringan.

---

## 5. Ruang Lingkup Perubahan Sistem (Jika Disetujui Nanti)

Agar penambahan ini terintegrasi penuh dari halaman depan hingga panel admin:

1. **Komponen Navigasi (`app/(public)/components/navbar/NavbarContainer.tsx`)**:
   - Menambahkan `Nasional`, `Internasional`, `Sport` ke daftar kategori menu desktop & mobile drawer.
2. **Halaman Publik (`app/(public)/page.tsx`)**:
   - Menambahkan query pengambilan artikel kategori Nasional, Internasional, dan Sport.
   - Mengimplementasikan tata letak baru (Opsi 1 atau Opsi 2 sesuai pilihan Anda).
3. **Panel Admin Form (`app/admin/tulis/TulisForm.tsx` & `app/admin/edit/[id]/EditForm.tsx`)**:
   - Memasukkan opsi `Nasional`, `Internasional`, `Sport` ke dalam dropdown `Kategori Berita`.
4. **Validasi Server (`app/admin/actions.ts`)**:
   - Mendaftarkan kategori baru ke `categoryAllowed` agar upload Markdown dan form submit valid.
5. **SEO & Sitemap (`app/sitemap.ts`)**:
   - Menambahkan URL kategori baru ke generator sitemap Google.

---

## 6. Status Eksekusi

✅ **Selesai Diimplementasikan dan Terverifikasi (Opsi 1)**:
1. Kategori **Nasional**, **Internasional**, dan **Sport** telah aktif secara menyeluruh (Navbar, Form Admin Tulis/Edit, Router Kategori, AI Generator, Sitemap SEO).
2. Layout Homepage **Opsi 1** telah aktif:
   - Kolom Kiri (Lebar 8): Grid 2 kolom *Berita Terbaru* + tombol *Muat Lebih Banyak*.
   - Kolom Kanan (Lebar 4): *ThematicSidebar* berisi blok **Kabar Nasional**, **Jendela Internasional**, dan **Arena Sport** yang sticky dan rapi.
3. Rute `/berita/nasional`, `/berita/internasional`, dan `/berita/sport` telah diuji dan menghasilkan HTTP 200 OK.
