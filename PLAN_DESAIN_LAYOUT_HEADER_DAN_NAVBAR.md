# 📐 Rencana Desain & Opsi Perbaikan Layout Header & Navbar (Ada Fakta)

> **Status:** Draft Perencanaan Desain Layout (Menunggu Arahan & Pilihan User)  
> **Tujuan:** Mengatasi masalah tampilan bagian atas yang terasa "nyambung" / bertumpuk tanpa batas visual yang jelas, teks Terkini dan Trending yang menyatu, serta tombol dobel.  
> **Komponen Terkait:**  
> • `app/(public)/components/navbar/TopUtilityBar.tsx`  
> • `app/(public)/components/navbar/MainNavbar.tsx`  
> • `app/(public)/components/navbar/BreakingTicker.tsx`  
> • `app/(public)/components/navbar/NavbarContainer.tsx`  
> **Aturan:** *Jangan implementasi apa pun dulu sampai user memilih opsi dan memberi persetujuan.*

---

## 1. Analisis Masalah Tampilan Saat Ini

| Bagian | Kondisi Saat Ini | Mengapa Terasa "Nyambung" / Kurang Rapi |
| :--- | :--- | :--- |
| **Terkini & Trending** | Teks berita terkini dan tagar trending berada di satu baris fleksibel tanpa batas pemisah (`gap-2`) | Teks judul berita yang terpotong titik-titik langsung menempel ke kata `Trending: #berita...`. Pembaca melihatnya sebagai satu kalimat panjang yang nyambung. |
| **Tombol Saluran WA** | Ada tombol `Saluran WA Redaksi` di baris atas, dan ada tombol hitam `Saluran Redaksi` di navbar | Dua tombol dengan fungsi yang sama persis berada dalam posisi vertikal yang sejajar, terlihat dobel / menumpuk. |
| **Lapisan Header (3 Baris)** | Top Bar (`bg-gray-50/90`) + Main Navbar (`bg-white/95`) + Breaking Ticker (`bg-gray-50`) bertumpuk | Garis pemisah antar-bilah menggunakan `border-gray-100` yang sangat tipis/samar, sehingga ketiga bilah terlihat seperti satu balok tebal yang merekat jadi satu. |
| **Menu Kategori** | 10 kategori dalam satu baris dengan jarak lebar | Pada layar laptop (1024px - 1366px), jarak antar-elemen menipis dan kategori hampir menabrak logo di kiri dan search bar di kanan. |

---

## 2. Pilihan Opsi Desain Layout

---

### 🟢 OPSI 1 (Rekomendasi): "Clean Newsroom" — Penyempurnaan Ramping & Pemisah Visual Tegas
> **Konsep:** Mempertahankan susunan standar portal berita profesional, tetapi membersihkan tombol dobel, mempertegas batas antar-lapisan, dan memberikan pembatas vertikal yang nyata antara Terkini dan Trending.

```
┌────────────────────────────────────────────────────────────────────────┐
│ Selasa, 27 Oktober 2026 • WIB | 🟢 Live Update   Tentang Redaksi Pedoman Kontak│  <-- Top Bar (Tanpa tombol Saluran dobel)
├────────────────────────────────────────────────────────────────────────┤
│ [adafakta]  Semua Nasional Internasional Regional Sport AI Gadget ...  [🔍 Cari] [⚫ Saluran Redaksi] │  <-- Main Navbar (Sticky)
├────────────────────────────────────────────────────────────────────────┤
│ 🔴 TERKINI  Singapura Bereaksi Tegas atas Ekspor Gas...  │  🔥 TRENDING: [#berita] [#nasional]  │  <-- Divider vertikal tegas & kapsul
└────────────────────────────────────────────────────────────────────────┘
                                    ↓ (Jarak napas / padding vertikal)
┌────────────────────────────────────────────────────────────────────────┐
│                        FEED KONTEN UTAMA BERITA                        │
└────────────────────────────────────────────────────────────────────────┘
```

#### Rincian Perubahan Opsi 1:
1. **Pemisah Nyata Terkini & Trending:**
   - Tambahkan garis pembatas vertikal kontras: `<div className="h-4 w-px bg-gray-300 mx-3 shrink-0" />`.
   - Bungkus bagian `Trending:` dalam kapsul (*pill container*) dengan latar abu-abu halus tersendiri agar terlihat sebagai grup mandiri, bukan kelanjutan teks berita.
2. **Hapus Tombol Saluran Dobel:**
   - Hilangkan `Saluran WA Redaksi` di Top Utility Bar. Cukup tautan editorial (`Tentang | Redaksi | Pedoman | Kontak`).
   - Jadikan tombol hitam `Saluran Redaksi` di Navbar Utama sebagai satu-satunya *Call to Action* utama yang elegan.
3. **Perjelas Border Antar-Lapisan:**
   - Ganti `border-gray-100` dengan `border-gray-200/80` yang lebih berdefinisi.
   - Main Navbar diberi bayangan lembut (`shadow-xs` / `shadow-sm`) saat *sticky* sehingga jelas melayang di atas konten saat di-scroll.

---

### 🔵 OPSI 2: "Modern Compact" — Ramping 2 Lapisan (Menggabungkan Top Bar)
> **Konsep:** Memangkas lapisan atas agar tidak ada 3 tingkat tumpukan. Header menjadi jauh lebih ringkas, hemat ruang layar, dan foto berita langsung terlihat tinggi di layar pertama (*above the fold*).

```
┌────────────────────────────────────────────────────────────────────────┐
│ [adafakta]  Semua Nasional Regional AI Gadget Software ...   [🔍 Cari] [⚫ Saluran Redaksi] │  <-- Main Header (60px)
├────────────────────────────────────────────────────────────────────────┤
│ 🔴 TERKINI: Singapura Bereaksi Tegas...   │ 📅 27 Okt 2026 • Live Update │ 🔥 #nasional #ai │  <-- Utility + Ticker Terpadu
└────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌────────────────────────────────────────────────────────────────────────┐
│                        FEED KONTEN UTAMA BERITA                        │
└────────────────────────────────────────────────────────────────────────┘
```

#### Rincian Perubahan Opsi 2:
1. Menghilangkan baris Top Utility Bar terpisah, memindahkan tanggal/Live Update ke baris ticker atau footer.
2. Tautan `Tentang`, `Redaksi`, `Pedoman`, `Kontak` disematkan rapi di menu drawer samping (Mobile/Desktop hamburger) dan di footer situs.
3. Mengurangi tinggi total header dari ~132px menjadi ~96px, membuat situs terasa jauh lebih cepat, modern, dan tidak sesak.

---

### 🟣 OPSI 3: "Card Banner Ticker" — Ticker Terpisah sebagai Kartu Melayang
> **Konsep:** Membuat Ticker Terkini & Trending tidak menempel langsung ke navbar sebagai garis penuh, melainkan tampil sebagai satu bilah kartu (*card container*) mandiri di dalam kontainer berita.

```
┌────────────────────────────────────────────────────────────────────────┐
│ Selasa, 27 Okt • WIB | Live Update               Tentang Redaksi Pedoman Kontak│  <-- Top Bar
├────────────────────────────────────────────────────────────────────────┤
│ [adafakta]  Semua Nasional Internasional Regional Sport AI Gadget ...  [🔍 Cari] [⚫ Saluran] │  <-- Navbar Utama
└────────────────────────────────────────────────────────────────────────┘
                                    ↓ (Ada jarak visual nyata 12px)
  ┌────────────────────────────────────────────────────────────────────┐
  │ 🔴 TERKINI  Singapura Bereaksi Tegas...   │ 🔥 TRENDING: [#berita] │  <-- Ticker berbentuk Box / Card Mandiri
  └────────────────────────────────────────────────────────────────────┘
                                    ↓
┌────────────────────────────────────────────────────────────────────────┐
│                        FEED KONTEN UTAMA BERITA                        │
└────────────────────────────────────────────────────────────────────────┘
```

#### Rincian Perubahan Opsi 3:
1. Navbar berakhir dengan bersih di batas bawah putihnya.
2. Ticker berita dibungkus dalam kontainer kartu dengan `rounded-xl border border-gray-200 bg-gray-50/80 p-2.5 my-3`.
3. Efek "nyambung" otomatis hilang 100% karena ada jarak spasi fisik (*white space*) antara navbar dan kotak ticker.

---

## 3. Perbandingan Kelebihan Tiap Opsi

| Kriteria | Opsi 1 (Clean Newsroom) | Opsi 2 (Modern Compact) | Opsi 3 (Card Banner Ticker) |
| :--- | :--- | :--- | :--- |
| **Gaya Visual** | Portal Berita Klasik Modern (Detik/Kompas) | Minimalis Ramping (The Verge/TechCrunch) | Modern Tech & Card Based |
| **Penyelesaian Teks Nyambung** | Sangat Baik (dengan divider & kapsul) | Sangat Baik (terbagi rapi 3 zona) | Sempurna (desain box mandiri) |
| **Penyelesaian Tombol Dobel** | Ya, dihapus di bar atas | Ya, terpusat di navbar | Ya, dihapus di bar atas |
| **Keringanan Tampilan** | Sedang | Paling Ramping (hemat layar) | Sangat Nyaman & Berongga |
| **Tingkat Kompleksitas Perubahan** | Cepat & Aman | Menengah (penataan menu) | Cepat & Aman |

---

## 4. Rekomendasi
Kami sangat merekomendasikan **Opsi 1** jika ingin mempertahankan ciri khas portal berita nasional terpercaya yang lengkap, atau **Opsi 3** jika ingin tampilan yang modern dan berongga tanpa kesan saling menempel.

---

> [!NOTE]
> **Tidak ada perubahan kode yang diterapkan.** Mohon tinjau opsi di atas dan beritahukan opsi mana yang paling sesuai dengan selera Anda.
