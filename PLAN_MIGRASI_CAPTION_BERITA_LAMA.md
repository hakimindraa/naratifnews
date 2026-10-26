# 🗄️ Rencana Kerja: Migrasi & Penyelarasan Caption Foto Berita Lama (Standar Kompas, Detik, & CNN)

> **Status:** Draft Perencanaan (Belum Diimplementasikan)  
> **Tujuan:** Membersihkan dan menyelaraskan seluruh *caption* foto pada **47 artikel lama yang sudah terbit** dan **34 draf jurnalis** di database agar terbebas dari kata *"Ilustrasi liputan:"* / *"Ilustrasi:"*, serta otomatis menggunakan format jurnalistik standar media nasional (Kompas/Detik/CNN).  
> **Prinsip Utama:** *Zero Downtime*, *Safe Data Transformation*, *Automated Frontend Display Guard*, *Complete Historical Clean-Up*.

---

## 1. Analisis Temuan Data Database

Berdasarkan pemeriksaan langsung ke database AdaFakta:
* **Tabel `articles` (Artikel Terbit):** Ditemukan **47 artikel** dengan `cover_caption` memuat kata *"Ilustrasi"*.
  * Contoh:  
    *`[#169] Pangkalpinang Gandeng Kampus untuk Perkuat Pengelolaan Sampah Berbasis Eco-Masjid`*  
    *Caption saat ini:* `Ilustrasi liputan: Pangkalpinang Gandeng Kampus untuk Perkuat Pengelolaan Sampah Berbasis Eco-Masji` *(terpotong di ujung).*
* **Tabel `jurnalis_drafts` (Antrean Draf):** Ditemukan **34 draf** dengan format lama `Ilustrasi: ...`.

---

## 2. Aturan Transformasi Caption (Standar Kompas/Detik/CNN)

Rumus pembersihan yang akan diterapkan:

1. **Hapus Awalan Kaku:**
   * Memotong teks awalan: `Ilustrasi liputan: `, `Ilustrasi: `, `Foto ilustrasi: `, `Ilustrasi berita: `.
2. **Koreksi Teks Terpotong:**
   * Jika teks caption yang tersisa merupakan potongan dari judul berita (seperti kasus `Eco-Masji`), sistem otomatis menyelaraskannya dengan judul lengkap artikel.
3. **Pemberian Kredit Dokumentasi Baku:**
   * Menutup kalimat dengan kredit standar jurnalistik:
     * Jika ada sumber media rujukan: `(Foto: Dok. [Sumber])`
     * Jika berita internal/umum: `(Foto: Dok. Redaksi)` atau `(Foto: Dok. Istimewa)`.

### Contoh Hasil Transformasi:

| ID Artikel | Judul Berita | Caption Lama | Caption Baru (Standar Media Nasional) |
| :---: | :--- | :--- | :--- |
| **#169** | Pangkalpinang Gandeng Kampus untuk Perkuat Pengelolaan Sampah Berbasis Eco-Masjid | `Ilustrasi liputan: Pangkalpinang Gandeng Kampus untuk Perkuat Pengelolaan Sampah Berbasis Eco-Masji` | `Pangkalpinang Gandeng Kampus untuk Perkuat Pengelolaan Sampah Berbasis Eco-Masjid. (Foto: Dok. Redaksi)` |
| **#166** | Pengamat Dorong Wisata Berbasis Budaya untuk Perkuat Ekonomi... | `Ilustrasi liputan: Pengamat Dorong Wisata Berbasis Budaya untuk Perkuat Ekonomi...` | `Pengamat Dorong Wisata Berbasis Budaya untuk Perkuat Ekonomi. (Foto: Dok. Redaksi)` |
| **#89** | Kasus Keracunan MBG di Sumut Soroti Urgensi Pengawasan Program... | `Ilustrasi penyajian makanan program Makan Bergizi Gratis di salah satu sekolah dasar...` | `Penyajian makanan program Makan Bergizi Gratis di sekolah dasar Sumatera Utara. (Foto: Dok. Istimewa)` |
| **Draf #90** | Limbah Tambak Udang Dibuang ke Laut Sumbawa, Pemprov NTB... | `Ilustrasi: Limbah Tambak Udang Dibuang ke Laut Sumbawa, Pemprov NTB Siapkan...` | `Limbah Tambak Udang Dibuang ke Laut Sumbawa, Pemprov NTB Siapkan Sanksi Berat. (Foto: Dok. Istimewa)` |

---

## 3. Rencana Langkah Kerja

### Langkah 1: Pasang Frontend Display Guard di Halaman Baca Publik
* **File Target:** `app/(public)/berita/[category]/[id]/[slug]/page.tsx`
* **Tindakan:**
  * Membungkus tampilan `article.coverCaption` dengan fungsi `sanitizeCoverCaption(article.coverCaption, article.title, 'Redaksi')`.
  * **Manfaat:** Seketika pengunjung membuka berita lama mana pun di website, tulisan "Ilustrasi liputan:" langsung hilang secara instan di layar tanpa menunggu migrasi database selesai.

### Langkah 2: Buat Skrip Migrasi Database Aman (`scripts/clean-cover-captions.mjs`)
* **File Target:** `scripts/clean-cover-captions.mjs`
* **Fitur Skrip:**
  1. Mengambil seluruh baris di `articles` dan `jurnalis_drafts` yang memiliki caption memuat kata `ilustrasi`.
  2. Menerapkan regex pembersihan cerdas:
     ```javascript
     function cleanCaption(oldCaption, title, source) {
       let text = (oldCaption || title || '').trim();
       text = text.replace(/^(?:foto\s+)?ilustrasi(?:\s+(?:liputan|berita|sampul|artikel))?\s*[:–—-]?\s*/i, '');
       
       // Jika potongan teks terpotong pendek dari judul, pulihkan ke judul penuh
       if (title && title.toLowerCase().startsWith(text.toLowerCase()) && text.length < title.length) {
         text = title;
       }
       
       text = text.replace(/[.\s]+$/, '');
       const credit = source && source !== 'Redaksi' ? source : 'Redaksi';
       return `${text}. (Foto: Dok. ${credit})`;
     }
     ```
  3. Memperbarui baris data di database Neon Postgres menggunakan SQL batch aman.
  4. Menampilkan laporan sebelum dan sesudah untuk setiap artikel yang diperbarui.

### Langkah 3: Revalidasi Cache Publik Next.js
* Memanggil `revalidatePath('/', 'layout')` agar seluruh cache halaman Next.js segera memuat data caption baru yang sudah bersih.

---

## 4. Validasi & Pengujian

1. **Uji Dry-Run:** Menjalankan skrip dalam mode simulasi terlebih dahulu untuk memastikan tidak ada teks yang rusak atau terpotong salah.
2. **Uji Eksekusi Nyata:** Mengeksekusi pembaruan ke database Postgres.
3. **Pemeriksaan Halaman Artikel Nyata:**
   * Membuka langsung artikel `#169` di browser publik:  
     `http://localhost:3000/berita/regional/169/pangkalpinang-gandeng-kampus-untuk-perkuat-pengelolaan-sampah-berbasis-eco-masjid-...`
   * Memastikan caption di bawah foto utama telah berubah menjadi:  
     `Pangkalpinang Gandeng Kampus untuk Perkuat Pengelolaan Sampah Berbasis Eco-Masjid. (Foto: Dok. Redaksi)`
4. **Pemeriksaan Meja Jurnalis:** Membuka `/admin/jurnalis` dan memastikan seluruh draf di antrean telah berformat bersih tanpa kata "Ilustrasi".
