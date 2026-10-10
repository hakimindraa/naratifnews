# PLAN: Naratif (Portal Berita)

> Portal berita bersih, minimalis, dan ramah semua usia. Konten diunggah lewat file `.md` di panel admin, disimpan di Neon, dan diterbitkan terjadwal lewat cron-job.org yang memanggil endpoint di Vercel.

## 1. Tujuan & Prinsip

- Tampilan ala portal berita umum (Detik, Kompas) tetapi lebih bersih dan lega.
- Mudah dibaca semua usia: teks besar, kontras tinggi, area klik besar.
- Pengelola tunggal: alur kerja sesederhana mungkin (upload `.md` → terbit).
- Cepat dan ramah SEO (ISR, structured data, sitemap).
- Biaya rendah (Vercel + Neon + imgbb).

## 2. Tech Stack

| Bagian | Pilihan |
|---|---|
| Framework | Next.js (App Router) + TypeScript |
| Styling | Tailwind CSS (+ `@tailwindcss/typography`) |
| Database | Neon (Postgres serverless) |
| ORM | Drizzle ORM + `drizzle-kit` |
| Auth admin | Password via env + cookie sesi (atau Auth.js, satu akun) |
| Markdown | `gray-matter` (frontmatter), `react-markdown`, `remark-gfm`, `rehype-sanitize` |
| Gambar | imgbb (hanya URL) lewat `next/image` |
| Deploy | Vercel |
| Penjadwalan | cron-job.org (gratis) memanggil endpoint Next.js; Vercel Cron tidak dipakai |
| Font | Plus Jakarta Sans (judul) + Inter (isi) via `next/font` |

## 3. Struktur Proyek

```
naratif/
├─ app/
│  ├─ layout.tsx                 # font, header, footer
│  ├─ page.tsx                   # beranda
│  ├─ [category]/
│  │  ├─ page.tsx                # daftar berita per kategori
│  │  └─ [slug]/page.tsx         # halaman artikel
│  ├─ cari/page.tsx              # pencarian
│  ├─ admin/
│  │  ├─ login/page.tsx
│  │  ├─ page.tsx                # daftar artikel + upload
│  │  ├─ actions.ts              # server actions
│  │  └─ [id]/page.tsx           # edit status/jadwal
│  ├─ api/cron/publish/route.ts  # cron penerbit
│  ├─ sitemap.ts
│  └─ robots.ts
├─ components/                   # Header, ArticleCard, Hero, Markdown, dll.
├─ db/
│  ├─ index.ts                   # koneksi Neon
│  └─ schema.ts
├─ lib/
│  ├─ markdown.ts                # parsing & validasi frontmatter
│  ├─ auth.ts                    # cek sesi admin
│  └─ seo.ts                     # helper metadata & JSON-LD
├─ middleware.ts                 # proteksi /admin
├─ vercel.json                   # tanpa entri "crons" (jadwal diatur di cron-job.org)
├─ drizzle.config.ts
└─ .env.local
```

## 4. Format File `.md`

```md
---
title: Judul Berita Kamu
slug: judul-berita-kamu
excerpt: Ringkasan singkat 1-2 kalimat.
category: ekonomi
author: Nama Penulis
cover: https://i.ibb.co/xxxxxx/foto.jpg
cover_caption: Keterangan foto (opsional)
publish_at: 2026-10-12T08:00:00+07:00
tags: [ekonomi, umkm]
---

Paragraf pertama...

## Subjudul

Isi berita...
```

**Aturan validasi saat upload:**
- Wajib: `title`, `slug`, `category`, `cover`.
- `slug` harus unik dan huruf kecil dengan tanda hubung.
- `cover` harus berawalan `https://i.ibb.co/`.
- `category` harus ada di daftar kategori yang diizinkan.
- `publish_at` opsional; jika kosong, artikel disimpan sebagai draft.
- Ukuran file maksimal 1 MB.

## 5. Skema Database

**`articles`**
- `id`, `slug` (unik), `title`, `excerpt`, `content` (markdown mentah)
- `cover_url`, `cover_caption`
- `category`, `author`, `tags` (array teks)
- `status`: `draft` | `scheduled` | `published`
- `publish_at`, `published_at`, `created_at`, `updated_at`

**Index:** `(status, published_at DESC)`, `(category, published_at DESC)`, `slug`.

**Kategori** awal (konstanta di kode): Terbaru, Nasional, Ekonomi, Teknologi, Olahraga, Hiburan, Gaya Hidup.

## 6. Alur Kerja

1. Admin login di `/admin`.
2. Upload satu atau beberapa file `.md`.
3. Server mem-parsing frontmatter dan memvalidasi.
4. Tersimpan ke Neon dengan status `draft` atau `scheduled`.
5. Admin dapat mengubah status: **Terbitkan sekarang**, **Jadwalkan**, **Jadikan draft**, **Hapus**.
6. Cron berjalan, artikel `scheduled` yang waktunya lewat menjadi `published`.
7. `revalidatePath` dipanggil agar beranda dan kategori langsung ter-update.

## 7. Cron Job (cron-job.org)

Penjadwalan memakai **cron-job.org** (layanan gratis) yang memanggil endpoint Next.js di Vercel. Vercel Cron tidak dipakai, jadi tidak terkena batas paket Hobby.

### Endpoint

- `GET /api/cron/publish`, dilindungi header `Authorization: Bearer $CRON_SECRET`.
- Logika: ubah semua artikel `scheduled` dengan `publish_at <= now()` menjadi `published`, isi `published_at`, lalu `revalidatePath`.
- Respons hanya JSON kecil, misalnya `{ "published": 2 }`.

```ts
// app/api/cron/publish/route.ts
export const maxDuration = 20;          // di bawah batas 30 detik cron-job.org
export const dynamic = "force-dynamic"; // jangan di-cache
```

### Batasan cron-job.org yang perlu dipatuhi

| Batasan | Yang harus dilakukan |
|---|---|
| Respons maksimal sekitar 64 KB | Kembalikan JSON sederhana saja, jangan isi artikel atau daftar panjang |
| Timeout 30 detik | Query singkat + `maxDuration = 20`; gunakan koneksi pooled Neon |
| Email konfirmasi akun aktif berkala | Pantau email, klik konfirmasi bila datang |
| Syarat layanan bisa berubah | Cek halaman resmi cron-job.org sebelum bergantung penuh |

### Setelan di dasbor cron-job.org

- **URL**: `https://domainkamu.com/api/cron/publish`
- **Method**: `GET`
- **Header**: `Authorization: Bearer ISI_CRON_SECRET_KAMU`
- **Jadwal**: tiap 5 menit (cukup untuk portal berita; tiap 1 menit tidak perlu)
- **Timezone**: `Asia/Jakarta` (kolom `publish_at` di database tetap menyimpan zona waktu `+07:00`)
- **Notifikasi**: aktifkan email jika eksekusi gagal atau URL down
- **Simpan log eksekusi** untuk memeriksa riwayat jika ada artikel yang tidak terbit

### Catatan

- Pastikan `vercel.json` **tidak** berisi entri `crons`, supaya Vercel tidak menjalankan jadwal ganda.
- `DATABASE_URL` memakai connection string **pooled** Neon (mengandung `-pooler`).
- Jika suatu saat cron-job.org tidak lagi cocok, cukup ganti pemanggilnya ke layanan lain atau Vercel Cron (paket Pro). Endpoint tidak perlu diubah.

## 8. Desain & UI

**Prinsip visual**
- Dasar putih, teks hampir hitam (`#111`), satu warna aksen untuk link dan label kategori.
- Banyak ruang kosong, garis pemisah tipis, tanpa animasi berlebihan.
- Mode gelap sebagai tahap lanjutan.

**Tipografi**
- Judul: Plus Jakarta Sans, tebal.
- Isi artikel: Inter, minimal 18px, line-height 1.7, lebar baris maksimal sekitar 680px.
- Meta (tanggal, penulis): 14px, warna abu-abu tua yang tetap kontras.

**Halaman**
- **Header**: logo Naratif, navigasi kategori (scroll horizontal di mobile), ikon cari. Sticky.
- **Beranda**: berita utama besar + 3-4 berita pendukung, daftar "Terbaru", blok per kategori.
- **Kategori**: daftar kartu dengan pagination (atau tombol "Muat lebih banyak").
- **Artikel**: breadcrumb, judul, penulis, tanggal terbit, gambar utama + caption, isi, tag, berita terkait, tombol bagikan.
- **Pencarian**: kolom cari dengan hasil berdasarkan judul dan excerpt.
- **Footer**: tentang, kontak, redaksi, kebijakan privasi, pedoman media.

**Aksesibilitas**
- Kontras minimal WCAG AA.
- Area klik minimal 44x44px.
- Fokus keyboard terlihat jelas, `alt` pada gambar, HTML semantik.

## 9. SEO

- Metadata dinamis (`generateMetadata`) per artikel dan kategori.
- JSON-LD `NewsArticle` di tiap artikel.
- Open Graph + Twitter Card memakai `cover_url`.
- `sitemap.xml` otomatis, plus news sitemap bila mendaftar Google News.
- `robots.txt`; `/admin` dan `/api` diberi `noindex`.
- URL bersih: `/ekonomi/judul-berita-kamu`.
- Canonical URL dan RSS feed (`/feed.xml`).

## 10. Keamanan

- Proteksi `/admin` lewat middleware dan cek sesi di setiap server action.
- Password admin di env, di-hash, cookie `httpOnly` + `secure` + `sameSite`.
- Batasi percobaan login (rate limit sederhana).
- Sanitasi markdown dengan `rehype-sanitize`; tidak mengizinkan HTML mentah/script.
- Validasi URL gambar dan ukuran file.
- Rahasia hanya di environment variable Vercel, jangan di-commit.

## 11. Environment Variables

```
DATABASE_URL=            # connection string Neon (pooled)
CRON_SECRET=             # string acak panjang
ADMIN_PASSWORD_HASH=     # hash password admin
SESSION_SECRET=          # string acak untuk cookie sesi
NEXT_PUBLIC_SITE_URL=https://naratif.example
```

## 12. Tahapan Pengerjaan

### Fase 1: Fondasi
- [ ] Buat proyek Next.js + TypeScript + Tailwind
- [ ] Pasang font (Plus Jakarta Sans, Inter) via `next/font`
- [ ] Buat database Neon dan koneksi Drizzle
- [ ] Buat skema, jalankan migrasi pertama
- [ ] Hubungkan repo ke Vercel dan set env

### Fase 2: Admin & Upload
- [ ] Halaman login + middleware proteksi
- [ ] Form upload `.md` (server action)
- [ ] Parsing dan validasi frontmatter
- [ ] Daftar artikel di admin (status, jadwal, aksi)
- [ ] Aksi: terbitkan, jadwalkan, draft, hapus, timpa slug lama

### Fase 3: Tampilan Publik
- [ ] Layout, header, footer
- [ ] Beranda (hero + terbaru + blok kategori)
- [ ] Halaman kategori dengan pagination
- [ ] Halaman artikel + render markdown + berita terkait
- [ ] Pencarian
- [ ] Konfigurasi `next/image` untuk `i.ibb.co`

### Fase 4: Cron & Cache
- [ ] Endpoint `/api/cron/publish` + `CRON_SECRET` + `maxDuration = 20`
- [ ] Pastikan respons hanya JSON kecil (jauh di bawah 64 KB)
- [ ] Buat akun cron-job.org, atur URL, header `Authorization`, jadwal tiap 5 menit, timezone `Asia/Jakarta`
- [ ] Aktifkan notifikasi email error di cron-job.org
- [ ] Pastikan `vercel.json` tidak berisi `crons`
- [ ] ISR (`revalidate`) + `revalidatePath` setelah terbit
- [ ] Uji skenario artikel terjadwal

### Fase 5: SEO & Kualitas
- [ ] Metadata, JSON-LD, Open Graph
- [ ] Sitemap, robots, RSS
- [ ] Halaman 404 dan error yang rapi
- [ ] Audit Lighthouse (performa, aksesibilitas, SEO)
- [ ] Uji di mobile dan berbagai ukuran layar

### Fase 6: Peluncuran
- [ ] Pasang domain dan HTTPS
- [ ] Halaman statis: Tentang, Redaksi, Kontak, Privasi, Pedoman Media
- [ ] Daftarkan ke Google Search Console (dan Google News bila memenuhi syarat)
- [ ] Unggah 10-20 artikel awal sebelum publik
- [ ] Backup berkala database Neon

### Fase 7: Pengembangan Lanjutan (opsional)
- [ ] Mode gelap
- [ ] Newsletter
- [ ] Analitik (Vercel Analytics / Plausible)
- [ ] Komentar atau tombol reaksi
- [ ] Halaman penulis
- [ ] Iklan (setelah trafik cukup)

## 13. Risiko & Catatan

| Risiko | Penanganan |
|---|---|
| Cron Vercel Hobby hanya 1x/hari | Pakai cron-job.org (gratis, bisa tiap menit) |
| cron-job.org gagal/berubah kebijakan | Aktifkan notifikasi error; endpoint tetap sama sehingga mudah pindah layanan |
| Respons cron lebih dari 64 KB atau lebih dari 30 detik | Respons JSON kecil, `maxDuration = 20`, koneksi pooled Neon |
| Gambar imgbb hilang/lambat | Jangan pakai expiration; simpan cadangan file asli |
| Slug bentrok | Validasi unik + opsi timpa |
| Konten tidak orisinal | Hanya terbitkan tulisan sendiri/berlisensi agar aman untuk Google News & AdSense |
| Markdown berbahaya | Sanitasi dengan `rehype-sanitize` |
| Kehilangan data | Backup/branch Neon berkala |

## 14. Definisi Selesai (MVP)

- Admin bisa login, upload `.md`, dan mengatur status/jadwal.
- Artikel terjadwal terbit otomatis (dipicu cron-job.org) dan muncul di beranda tanpa deploy ulang.
- Beranda, kategori, dan artikel tampil rapi di mobile dan desktop.
- Skor Lighthouse minimal 90 untuk Performance, Accessibility, dan SEO.
- Sitemap dan metadata aktif, situs terdaftar di Search Console.
