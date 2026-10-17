# PANDUAN LENGKAP SETUP & MIGRASI: ADA FAKTA (adafakta.web.id)

Panduan teknis langkah demi langkah untuk mengonfigurasi dan mengaktifkan seluruh layanan eksternal portal berita **Ada Fakta** (`https://www.adafakta.web.id`).

---

## DAFTAR ISI
1. [Langkah 1: Pengaturan DNS di IDwebhost](#langkah-1-pengaturan-dns-di-idwebhost)
2. [Langkah 2: Menambahkan Domain di Vercel](#langkah-2-menambahkan-domain-di-vercel)
3. [Langkah 3: Pendaftaran di Google Search Console](#langkah-3-pendaftaran-di-google-search-console)
4. [Langkah 4: Otorisasi Google Indexing API (Instant Indexing)](#langkah-4-otorisasi-google-indexing-api-instant-indexing)
5. [Langkah 5: Pendaftaran Situs di Google AdSense](#langkah-5-pendaftaran-situs-di-google-adsense)
6. [Langkah 6: Update Jadwal Otomatis di cron-job.org](#langkah-6-update-jadwal-otomatis-di-cron-joborg)
7. [Langkah 7: Hubungkan Ulang Bot Telegram](#langkah-7-hubungkan-ulang-bot-telegram)
8. [Langkah 8: Mengganti Logo Tab & Favicon Google (favicon.ico)](#langkah-8-mengganti-logo-tab--favicon-google-faviconico)
9. [Langkah 9: Login Kembali ke Dashboard Admin](#langkah-9-login-kembali-ke-dashboard-admin)

---

### Langkah 1: Pengaturan DNS di IDwebhost
*(Menghubungkan domain dari registrar ke server hosting Vercel)*

1. Masuk ke Member Area **IDwebhost** -> Pilih menu **Domain** -> Klik domain **`adafakta.web.id`**.
2. Buka menu **DNS Management** (Kelola DNS).
3. Tambahkan 2 baris rekod berikut:
   * **Baris 1 (A Record):**
     * Host / Name: `@` *(atau kosongkan jika default IDwebhost)*
     * Record Type: `A`
     * Address / Value: `76.76.21.21` *(IP Resmi Vercel)*
     * TTL: `14400`
   * **Baris 2 (CNAME Record):**
     * Host / Name: `www`
     * Record Type: `CNAME`
     * Address / Value: `cname.vercel-dns.com`
     * TTL: `14400`
4. Klik **Save Changes / Simpan**.

---

### Langkah 2: Menambahkan Domain di Vercel
*(Menghubungkan nama domain baru ke aplikasi web Next.js)*

1. Buka dashboard proyek Anda di **Vercel** (`https://vercel.com/dashboard`).
2. Masuk ke tab **Settings** -> pilih menu **Domains** di sebelah kiri.
3. Tambahkan 2 entri domain:
   * Masukkan `adafakta.web.id` -> Klik **Add**.
   * Masukkan `www.adafakta.web.id` -> Klik **Add** (pilih opsi redirect to `adafakta.web.id` atau biarkan default).
4. Masuk ke menu **Environment Variables** di Vercel:
   * Cari variabel bernama `NEXT_PUBLIC_SITE_URL`.
   * Ubah nilainya menjadi: `https://www.adafakta.web.id`
   * Klik **Save**.
5. Masuk ke tab **Deployments** -> Pada deployment terbaru, klik ikon titik tiga (`...`) di kanan -> Pilih **Redeploy** (agar environment variable baru aktif di server live).

---

### Langkah 3: Pendaftaran di Google Search Console
*(Mendaftarkan properti baru agar seluruh artikel diindeks Google di domain baru)*

1. Buka [Google Search Console](https://search.google.com/search-console).
2. Di pojok kiri atas, klik dropdown properti -> Pilih **"+ Tambahkan properti"** (*Add property*).
3. Pada jendela pop-up, pilih kotak sebelah **KANAN** (**"Awalan URL"**):
   * Masukkan URL: `https://www.adafakta.web.id`
   * Klik tombol **Lanjutkan**.
4. Pada pilihan metode verifikasi:
   * Pilih opsi **"Tag HTML"**.
   * Kode verifikasi Anda:
     ```html
     <meta name="google-site-verification" content="3LJKvrRNp9AokPfB1aXVprINx5QN1n5xC9_VQ7yYRmQ" />
     ```
5. Kode ini **sudah otomatis dipasang** di [app/layout.tsx](file:///e:/porto/naratif/app/layout.tsx):
   ```ts
   verification: {
     google: "3LJKvrRNp9AokPfB1aXVprINx5QN1n5xC9_VQ7yYRmQ",
   },
   ```
6. Lakukan commit & push ke Git (deploy ke Vercel).
7. Setelah deploy selesai, kembali ke Google Search Console dan klik tombol **VERIFIKASI**. Status akan langsung centang hijau sukses!
8. **Kirim Peta Situs (Sitemap):**
   * Di bilah menu sebelah kiri, klik **Peta Situs** (*Sitemaps*).
   * Pada kolom *Tambahkan peta situs baru*, ketik: **`sitemap.xml`** -> Klik **Kirim** (*Submit*).
   * Ketik juga: **`news-sitemap.xml`** (Peta situs khusus Google News 48 jam terakhir) -> Klik **Kirim** (*Submit*).
   * *(Kedua sitemap akan berstatus sukses centang hijau dan otomatis dirayapi oleh robot Googlebot & Googlebot-News).*


---

### Langkah 4: Otorisasi Google Indexing API (Instant Indexing)
*(PENTING: Agar fitur kirim sinyal pengindeksan instan Google tetap jalan otomatis)*

Website Anda memiliki robot Google Service Account untuk mempercepat pengindeksan artikel. Agar robot ini diizinkan mengindeks domain baru Anda di Google Search Console:
1. Di Google Search Console properti `https://www.adafakta.web.id`, buka menu **Pengaturan** (*Settings*) di bilah kiri bawah.
2. Klik menu **Pengguna dan Izin** (*Users and permissions*).
3. Klik tombol biru **Tambahkan Pengguna** (*Add User*) di pojok kanan atas.
4. Masukkan alamat email service account robot Anda (dari file `.env.local`):
   👉 `naratifnews@bottele-508619.iam.gserviceaccount.com`
5. Pilih izin (*Permission*): **Pemilik** (*Owner*).
6. Klik **Tambah** (*Add*).  
*(Selesai! Sekarang setiap kali Anda merilis atau menyadur berita, sistem otomatis mengirim sinyal instan ke Google).*

---

### Langkah 5: Pendaftaran Situs di Google AdSense
*(Menggunakan akun AdSense yang sama tanpa perlu mendaftar dari awal)*

1. Buka dashboard [Google AdSense](https://adsense.google.com/).
2. Di menu navigasi sebelah kiri, klik **Situs** (*Sites*).
3. Klik tombol biru **Situs Baru** (*New Site*) di pojok kanan atas.
4. Masukkan nama domain: **`adafakta.web.id`** -> Klik **Simpan**.
5. File `ads.txt` website Anda sudah otomatis aktif dan terpasang di alamat:
   👉 `https://www.adafakta.web.id/ads.txt`
6. Centang kotak konfirmasi bahwa Anda telah memasang file ads.txt, lalu klik **Minta Peninjauan** (*Request Review*).

---

### Langkah 6: Update Jadwal Otomatis di cron-job.org
*(Menjamin Autopilot AI dan Penerbitan Berita Berjalan Tepat Waktu)*

1. Buka dan login ke akun Anda di [cron-job.org](https://cron-job.org/).
2. Buka menu **Cronjobs**.
3. Edit tugas **Autopilot News**:
   * Ubah URL target menjadi:
     👉 `https://www.adafakta.web.id/api/cron/autopilot`
   * Header `Authorization: Bearer <CRON_SECRET>` tetap sama.
   * Klik **Save**.
4. Edit tugas **Publish Scheduled**:
   * Ubah URL target menjadi:
     👉 `https://www.adafakta.web.id/api/cron/publish`
   * Header `Authorization: Bearer <CRON_SECRET>` tetap sama.
   * Klik **Save**.

---

### Langkah 7: Hubungkan Ulang Bot Telegram
*(Menghubungkan Webhook Bot ke Domain Baru)*

1. Setelah domain aktif di Vercel dan selesai dideploy, buka browser Anda.
2. Kunjungi link ini satu kali saja:
   👉 `https://www.adafakta.web.id/api/telegram/setup`
3. Halaman web akan membalas pesan JSON sukses:
   ```json
   {
     "success": true,
     "message": "Webhook Telegram berhasil didaftarkan..."
   }
   ```
4. Buka bot Telegram Anda di HP, kirim perintah `/start` untuk memastikan bot sudah aktif dengan identitas **ADA FAKTA REDAKSI BOT**.

---

### Langkah 8: Mengganti Logo Tab & Favicon Google (favicon.ico)
*(Mengubah ikon lingkaran biru huruf 'N' lama menjadi logo huruf 'A' Ada Fakta di tab browser dan hasil pencarian Google)*

1. Buka situs gratis pembuat favicon: **[favicon.io/favicon-generator/](https://favicon.io/favicon-generator/)**
2. Atur pengaturannya:
   * **Text:** `A` (atau `AF`)
   * **Background:** Pilih **Rounded** atau **Circle**
   * **Background Color:** `#111827` *(Hitam pekat elegan)* atau `#4F46E5` *(Indigo khas modern)*
   * **Font Color:** `#FFFFFF` *(Putih bersih)*
   * **Font Family:** Pilih font tegas seperti *Montserrat*, *Inter*, atau *Poppins*
3. Klik tombol hijau **Download**.
4. Buka file ZIP hasil download, cari file bernama: **`favicon.ico`**.
5. Salin (*copy*) file `favicon.ico` tersebut, lalu tempel (*paste*) ke dalam folder proyek Anda di:
   👉 `e:\porto\naratif\app\favicon.ico` *(timpa/replace file yang lama)*.
6. Commit & push ke Vercel. Google Search dan browser tab akan otomatis memperbarui logo Anda menjadi huruf **A**!

---

### Langkah 9: Login Kembali ke Dashboard Admin
1. Buka alamat admin: `https://www.adafakta.web.id/admin`
2. Masukkan password admin Anda: `indra12`
3. Selesai! Sesi cookie baru (`adafakta_session`) akan tersimpan rapi di browser Anda.

---

### Ringkasan URL Penting Website Baru Anda:
* **Beranda Publik:** `https://www.adafakta.web.id`
* **Kanal Kategori:** `https://www.adafakta.web.id/berita/[kategori]`
* **Baca Artikel:** `https://www.adafakta.web.id/berita/[kategori]/[id]/[slug]`
* **Peta Situs Google:** `https://www.adafakta.web.id/sitemap.xml`
* **Feed Berita RSS:** `https://www.adafakta.web.id/rss.xml`
* **File AdSense:** `https://www.adafakta.web.id/ads.txt`
* **Panel Redaksi Admin:** `https://www.adafakta.web.id/admin`
