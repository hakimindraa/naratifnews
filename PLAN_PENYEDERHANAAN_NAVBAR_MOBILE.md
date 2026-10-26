# 📱 Rencana Kerja: Penyederhanaan Navbar Mobile (Eliminasi Pil Kategori Redundan)

> **Status:** Draft Perencanaan (Belum Diimplementasikan)  
> **Tujuan:** Menghapus baris pil geser kategori horizontal (`CategoryPillsMobile`) di layar HP karena menduplikasi isi Menu Burger, sehingga tinggi header berkurang drastis dari 125px menjadi 78px, membebaskan ruang layar agar berita utama langsung terlihat tanpa terdorong ke bawah.  
> **Prinsip Utama:** *Zero Redundant Navigation*, *Maximum Screen Real Estate*, *One-Tap Burger Drawer*, *Clean & Sleek Mobile Header*.

---

## 1. Analisis Masalah Tumpukan Header Mobile Saat Ini

Di tampilan layar HP saat ini, bagian atas layar memuat **3 tumpukan menu sekaligus**:

```
┌────────────────────────────────────────────────────────┐
│ [≡]                  ADA FAKTA                  [🔍]   │  <-- Layer 1: Header Utama (~50px)
├────────────────────────────────────────────────────────┤
│ [Semua] [Nasional] [Internasional] [Regional] [Sport] ➔│  <-- Layer 2: Pil Geser Kategori (~42px) ⚠️ REDUNDAN
├────────────────────────────────────────────────────────┤
│ ⚡ TERKINI: DPR Sahkan Regulasi Transformasi AI...     │  <-- Layer 3: Running Text Ticker (~32px)
├────────────────────────────────────────────────────────┤
│ ⬇️ KONTEN BERITA (Terdorong terlalu jauh ke bawah)      │
```

* **Total Tinggi Header:** Mencapai **~124px** hanya untuk area navigasi.
* **Mubazir / Dobel:** Pengguna yang mengklik ikon burger `[≡]` sudah menemukan seluruh kategori (Semua, Nasional, Internasional, Regional, Sport, AI, Gadget, Software, Hardware, Infrastruktur). Keberadaan Layer 2 menjadi duplikasi yang membuang ruang pandang.

---

## 2. Desain Layout Struktur Baru (Sleek & Ultra-Compact)

Setelah pil kategori dihapus, struktur header mobile disederhanakan menjadi **2 layer fungsional yang ramping**:

```
┌────────────────────────────────────────────────────────┐
│ [≡]                  ADA FAKTA                  [🔍]   │  <-- Layer 1: Header Utama Ramping (48px)
├────────────────────────────────────────────────────────┤
│ ⚡ TERKINI: DPR Sahkan Regulasi Transformasi AI...     │  <-- Layer 2: Breaking News Ticker Tipis (30px)
├────────────────────────────────────────────────────────┤
│                                                        │
│   📰 FOTO & BERITA UTAMA LANGSUNG MUNCUL DI SINI       │  <-- Konten naik ~45px lebih tinggi!
│                                                        │
```

### Ke mana Kategori Berita Berpindah?
1. **Pusat Navigasi Utama di Menu Burger (`[≡]`):**
   * Saat pengunjung mengetuk `[≡]`, drawer menu dari kiri terbuka dengan mulus menampilkan seluruh kategori dengan badge dan ikon yang elegan.
2. **Kategori di Beranda Publik:**
   * Di beranda (*homepage*), kategori tetap tersaji secara natural melalui seksi berita: *Kabar Nusantara (Regional)*, *Kanal Eksplorasi (AI, Gadget, Software)*, dan *Feed Berita Terbaru*.

---

## 3. Perbandingan Sebelum vs Sesudah

| Parameter | Desain Saat Ini (Lama) | Desain Baru (Setelah Disederhanakan) |
| :--- | :--- | :--- |
| **Jumlah Lapisan Header** | 3 Layer (Header + Pil + Ticker) | **2 Layer** (Header + Ticker) |
| **Total Tinggi Header Layar HP** | ~124px (Makan 15-20% tinggi layar HP) | **~78px** (Ringkas, hanya ~10% tinggi layar) |
| **Posisi Foto Headline Berita** | Terdorong jauh ke bawah layar | **Langsung menyambut mata pembaca** |
| **Akses Kategori Berita** | Ganda (Di Menu Burger & Di Pil Geser) | **Terpusat di Menu Burger `[≡]`** |
| **Beban DOM / Performa Scroll** | Render listener `overflow-x-auto` | **Lebih ringan dan mulus tanpa jeda scroll** |

---

## 4. Rencana Langkah Kerja & File Target

### Langkah 1: Lepas Komponen dari `NavbarContainer.tsx`
* **File Target:** `app/(public)/components/navbar/NavbarContainer.tsx`
* **Tindakan:**
  * Hapus pemanggilan `<CategoryPillsMobile categories={CATEGORIES} />` di baris 49.
  * Hapus import `import CategoryPillsMobile from "./CategoryPillsMobile";`.

### Langkah 2: Hapus File Komponen yang Sudah Tidak Dipakai
* **File Target:** `app/(public)/components/navbar/CategoryPillsMobile.tsx`
* **Tindakan:**
  * Menghapus file `CategoryPillsMobile.tsx` agar tidak menjadi kode mati (*dead code*).
  * Bersihkan re-export di `app/(public)/components/navbar/index.ts` jika ada.

### Langkah 3: Validasi & Pengujian
1. Jalankan `npx tsc --noEmit` untuk memastikan tidak ada import yang rusak.
2. Buka tampilan mobile di `http://localhost:3000` via Chrome DevTools (mode inspeksi HP):
   * Pastikan tumpukan pil hitam/abu-abu `[Semua] [Nasional] ...` sudah hilang.
   * Pastikan header atas langsung tersambung ke running text ticker dengan rapi.
   * Pastikan menu burger `[≡]` tetap membuka drawer kategori secara sempurna.
