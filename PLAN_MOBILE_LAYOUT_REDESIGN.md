# 📱 Plan Redesain Layout Mobile Portal Berita (Ultra-Dense Ala Detikcom & Tribunnews)

> **Status:** Draft Perencanaan & Analisis Arsitektur Layout (Revisi 2: Kepadatan Maksimal / *Ultra-Dense*)  
> **Tujuan:** Mengubah antarmuka mobile AdaFakta agar terasa sangat penuh, padat informasi (*high-density*), hidup, dan menyajikan banyak berita dalam satu layar scroll menyerupai Detikcom dan Tribunnews.  
> **Prinsip Utama:** *Zero Dead-Space*, *Full-Bleed Edge-to-Edge*, *High-Contrast Visual Anchors*, *One-Thumb Browsing*.

---

## 1. Mengapa Desain Sebelumnya Masih Terasa "Kurang Penuh"?

1. **Jarak Antar Elemen Terlalu Longgar:** Masih terdapat ruang kosong putih (*white gutters*) di bawah header dan sebelum feed berita.
2. **Headline Terisolasi Seperti Kartu Blog:** Belum menggunakan gaya portal berita besar di mana foto utama menyatu langsung dengan judul atau memiliki teks *headline overlay* tebal.
3. **Belum Ada Running Text / Breaking News Strip:** Portal berita besar selalu memiliki strip merah/kuning bergerak di bagian paling atas yang langsung menarik pandangan mata dan mengisi layar.
4. **Kurang Elemen Berita Sekunder di Bawah Headline:** Begitu headline selesai, portal besar langsung menyisipkan 2-3 peluru berita cepat (*quick sub-headlines*) dan blok nomor urut populer sebelum masuk ke feed utama.

---

## 2. Struktur Desain Baru: Beranda Mobile Ultra-Padat (Ultra-Dense Homepage)

```
┌────────────────────────────────────────────────────────┐
│ [≡]                 ADA FAKTA                 [🔍]    │  <-- Header Ramping (48px)
├────────────────────────────────────────────────────────┤
│ ⚡ TERKINI: Pemerintah Sahkan Regulasi AI Nasional      │  <-- Running Ticker Strip Merah (Kuat & Aktif)
├────────────────────────────────────────────────────────┤
│ [Semua] [Nasional] [Regional] [Teknologi] [Bisnis] ➔   │  <-- Kategori Pill Padat (Sticky)
├────────────────────────────────────────────────────────┤
│                                                        │
│         FOTO HEADLINE UTAMA (100% TEPI KE TEPI)        │  <-- Full-Bleed 16:9 Tanpa Margin Samping
│                                                        │
│ ┌────────────────────────────────────────────────────┐ │
│ │ DPR Sahkan Regulasi Transformasi AI & Keamanan     │ │  <-- Judul Bold Kontras Tinggi
│ │ ⏱️ 10 menit lalu • Redaksi                         │ │
│ └────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────┤
│ • Kominfo Paparkan Skema Investasi Digital Sektor AI   │  <-- 2 Baris Peluru Berita Hangat (Rapat)
│ • Analisis Dampak Ekonomi Sektor Kecerdasan Buatan     │
├────────────────────────────────────────────────────────┤
│ 🔥 TERPOPULER                                          │
│ ┌───────────────┬───────────────┬────────────────────┐ │
│ │ 01 Judul      │ 02 Judul      │ 03 Judul           │ │  <-- Blok 3 Kolom / List Rapat Nomor Merah
│ │    Populer 1  │    Populer 2  │    Populer 3       │ │
│ └───────────────┴───────────────┴────────────────────┘ │
├────────────────────────────────────────────────────────┤
│ 📰 BERITA TERBARU (Feed Mengalir Penuh & Padat)        │
│                                                        │
│ ┌─ [Nasional] ────────────────────────── [Foto 1:1] ─┐ │
│ │ Judul Berita Utama Terbaca 2-3 Baris   [ 80x80px ] │ │  <-- Format Utama: Judul Lebar Kiri,
│ │ ⏱️ 10 menit lalu                       [         ] │ │      Thumbnail Kanan Rapat
│ └────────────────────────────────────────────────────┘ │
│ ────────────────────────────────────────────────────── │  <-- Garis Pemisah Tipis (Hairline)
│ ┌─ [Teknologi] ───────────────────────── [Foto 1:1] ─┐ │
│ │ Judul Berita Berikutnya Jelas & Rapi   [ 80x80px ] │ │
│ │ ⏱️ 25 menit lalu                       [         ] │ │
│ └────────────────────────────────────────────────────┘ │
│ ────────────────────────────────────────────────────── │
│ ┌─ [Regional] ────────────────────────── [Foto 1:1] ─┐ │
│ │ Berita Daerah Terkini dari Berbagai    [ 80x80px ] │ │
│ │ ⏱️ 40 menit lalu                       [         ] │ │
│ └────────────────────────────────────────────────────┘ │
│                                                        │
│   [ 🧭 Selingan: Kabar Nusantara Carousel ]            │  <-- Carousel Geser Horizontal Tiap 4 Baris
│                                                        │
│   [ Muat Lebih Banyak / Infinite Scroll Stream ]       │
└────────────────────────────────────────────────────────┘
```

---

## 3. Rincian Teknis Komponen Layar Mobile Penuh

### A. Kontainer Luar Tanpa Padding Berlebih (`px-0` di Bagian Utama)
- Di mobile (`< sm`), kontainer beranda menggunakan `px-0` untuk foto dan header seksi, lalu teks berita diberi padding minimal `px-3.5` atau `px-4`.
- Tidak ada lagi padding ganda `px-4 py-8` yang membuat layar HP bolong di pinggir.

### B. Strip Running Text / Breaking News (Merah Menyala)
```tsx
<div className="bg-red-600 text-white px-3 py-1.5 flex items-center gap-2 text-xs font-semibold overflow-hidden">
  <span className="font-black bg-white text-red-600 px-1.5 py-0.5 rounded text-[10px] tracking-wider uppercase shrink-0">
    ⚡ TERKINI
  </span>
  <div className="truncate">
    {breakingNews.title}
  </div>
</div>
```

### C. Baris Feed Berita Rapat (*Ultra-Dense News Row*)
Menggantikan `grid-cols-2` menjadi baris horizontal dengan rasio foto 1:1 persegi:
```tsx
<div className="flex items-center justify-between gap-3 py-2.5 px-3.5 border-b border-gray-100 group">
  <div className="flex-1 min-w-0">
    <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-red-600 bg-red-50 px-1.5 py-0.5 rounded mb-1">
      {article.category}
    </span>
    <h3 className="text-sm font-bold text-gray-900 group-hover:text-red-600 leading-snug line-clamp-2">
      {article.title}
    </h3>
    <span className="text-[11px] text-gray-400 mt-1 block">
      {timeAgo}
    </span>
  </div>
  <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 shrink-0 aspect-square relative">
    <img src={article.coverUrl} alt={article.title} className="w-full h-full object-cover" />
  </div>
</div>
```

### D. Blok Terpopuler Bernomor Merah (Top Ranking)
- Angka urut besar `01`, `02`, `03` berwarna merah menyala (`text-red-600 font-black text-2xl`).
- Disusun sejajar 3 kolom kompak di mobile atau list vertikal padat, mengisi layar secara efektif.

---

## 4. Tahapan Pengerjaan (Menunggu Persetujuan Anda)

- [ ] **Fase 1:** Pasang strip Breaking News merah kompak tepat di bawah header mobile.
- [ ] **Fase 2:** Ubah feed berita utama di `LatestNewsSection.tsx` dari `grid-cols-2` menjadi **Baris Horizontal 1 Kolom Penuh (Judul di Kiri, Foto 80x80 di Kanan)**.
- [ ] **Fase 3:** Hilangkan double margin di kontainer mobile (`page.tsx`) agar foto headline membentang penuh (*edge-to-edge*).
- [ ] **Fase 4:** Susun blok Berita Populer dengan nomor urut merah tebal agar lebih dinamis dan padat.
