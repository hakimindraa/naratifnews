# 📋 PLAN.md: Rencana Integrasi Penuh Web Admin AdaFakta ➔ Web Kantor AI (Diorama 3D)

> **Status:** 📝 Draft Perencanaan Dua Arah (Menunggu Persetujuan Pengguna Sebelum Eksekusi Kode)  
> **Prinsip Utama:** Tidak ada file kode yang diubah/diimplementasikan sebelum rencana ini disetujui.

---

## 1. Ringkasan & Tujuan Utama

1. **Sinkronisasi Dua Arah:** Menghubungkan aktivitas di 12 modul web admin **AdaFakta** secara langsung ke dashboard visual 3D **Kantor AI**.
2. **Kekayaan Data (Enriched Payload):** Tidak hanya mengirim judul, tetapi juga nama penulis (`author`), tautan langsung artikel (`articleUrl`), cuplikan naskah (`excerpt`), asal media (`source`), dan model kecerdasan buatan (`model`).
3. **Jaminan Nol Dampak (Zero-Impact Guarantee):**
   * Menggunakan prinsip *Fire-and-Forget* non-blocking.
   * Dibatasi batas waktu ketat (*timeout*) **1.5 detik** via `AbortController`.
   * Penanganan error senyap (*silent catch*): Jika web Kantor AI offline, laptop mati, atau koneksi terputus, web AdaFakta tetap berjalan 100% normal tanpa delay maupun crash.

---

## 2. Bagian I: Pembaruan di Proyek Ini (AdaFakta - `e:\porto\naratif`)

### A. File yang Akan Diperbarui: [`lib/kantorAiNotifier.ts`](file:///e:/porto/naratif/lib/kantorAiNotifier.ts)
Memperluas antarmuka `KantorAIPayload` agar mendukung 7 aksi spesifik dari seluruh fitur admin:

```typescript
export interface KantorAIPayload {
  action: 
    | 'draft_created'       // Berita baru masuk dari bot Telegram / RSS
    | 'cover_generated'     // Foto sampul selesai di-scrape Google & diunggah ke ImgBB
    | 'article_published'   // Artikel resmi terbit (Waterfall Queue / Instant Publish)
    | 'article_rewritten'   // Berita selesai disadur dari URL luar (Menu Sadur URL)
    | 'ai_studio_generated' // Artikel selesai diracik dari prompt (Menu AI Studio)
    | 'author_created'      // Wartawan/penulis baru didaftarkan (Menu Tim Penulis)
    | 'db_purged';          // Pembersihan database selesai (Menu Maintenance)

  title: string;
  category?: string;
  coverUrl?: string;
  articleUrl?: string;
  author?: string;
  excerpt?: string;
  source?: string;
  model?: string;
  metadata?: Record<string, any>;
}
```

### B. Titik Pemasangan Sinyal di Proyek AdaFakta

| No | Modul / Halaman Admin | File Sumber | Fungsi Target | Event yang Dipancarkan | Data yang Disertakan |
|---|---|---|---|---|---|
| 1 | **Jurnalis AI (Berita Masuk)** | `app/api/incoming-news/route.ts` | `POST handler` | `draft_created` | `title`, `source`, `category`, `excerpt` |
| 2 | **Jurnalis AI (Foto ImgBB)** | `app/admin/jurnalis/actions.ts` | `attachPhotoToDraftAction` & `attachPhotoUrlToDraftAction` | `cover_generated` | `title`, `coverUrl`, `category` |
| 3 | **Penerbitan Artikel** | `app/api/cron/jurnalis-publisher/route.ts` & `instantPublishDraftAction` | Publisher Handler & Instant Publish | `article_published` | `title`, `category`, `coverUrl`, `articleUrl`, `author`, `excerpt` |
| 4 | **Sadur Berita URL** | `app/admin/sadur/actions.ts` | `generateSadurArticleAction` | `article_rewritten` | `title`, `source`, `author`, `category` |
| 5 | **AI Studio** | `app/admin/generator/actions.ts` | `generateArticleAction` | `ai_studio_generated` | `title`, `model`, `category` |
| 6 | **Tim Penulis** | `app/admin/penulis/actions.ts` | `createAuthorAction` | `author_created` | `title` (Nama Penulis), `metadata` (Role/Jabatan) |
| 7 | **Pembersihan DB** | `app/admin/maintenance/actions.ts` | `executePurgeAction` | `db_purged` | `title` (Jumlah baris yang dibersihkan) |

---

## 3. Bagian II: Apa yang Perlu Ditambahkan di Proyek Web Kantor AI

Berikut adalah daftar file, kode, dan konfigurasi yang harus dibuat di proyek **Kantor AI**:

### 1. Konfigurasi Lingkungan (`.env.local` di Kantor AI)
Tambahkan token rahasia webhook yang sama persis dengan AdaFakta:
```env
WEBHOOK_SECRET="kantorai_secret_super_aman_2026"
```

### 2. Endpoint Penerima Webhook (`app/api/incoming-news/route.ts` di Kantor AI)
Buat file ini di proyek web Kantor AI Anda untuk menangkap sinyal dari AdaFakta:

```typescript
// app/api/incoming-news/route.ts (Di Proyek Web Kantor AI)
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    // 1. Verifikasi Header Keamanan
    const incomingToken = req.headers.get('x-webhook-token');
    const secret = process.env.WEBHOOK_SECRET || 'kantorai_secret_super_aman_2026';

    if (incomingToken !== secret) {
      return NextResponse.json({ error: 'Unauthorized webhook' }, { status: 401 });
    }

    // 2. Baca Payload Lengkap dari AdaFakta
    const payload = await req.json();
    const {
      action,
      title,
      category,
      coverUrl,
      articleUrl,
      author,
      excerpt,
      source,
      model,
      metadata,
    } = payload;

    // 3. Logika Pemicu Event / Animasi Karakter 3D
    switch (action) {
      case 'draft_created':
        // Pemicu meja Agent Scout (News Hunter)
        console.log(`[Kantor AI] Berita baru masuk: ${title} (${source})`);
        break;

      case 'cover_generated':
        // Pemicu monitor Agent Pixel (Fotografer ImgBB)
        console.log(`[Kantor AI] Foto sampul baru diterima: ${coverUrl}`);
        break;

      case 'article_published':
        // Pemicu Panggung Utama / Selebrasi Redaksi
        console.log(`[Kantor AI] Artikel terbit oleh ${author}: ${title}`);
        break;

      case 'article_rewritten':
        // Pemicu Meja Sadur URL
        console.log(`[Kantor AI] Sadur berita dari ${source}: ${title}`);
        break;

      case 'ai_studio_generated':
        // Pemicu Lab AI Studio
        console.log(`[Kantor AI] Naskah AI diracik menggunakan ${model}`);
        break;

      case 'author_created':
        // Pemicu Papan Tim Redaksi
        console.log(`[Kantor AI] Penulis baru didaftarkan: ${title}`);
        break;

      case 'db_purged':
        // Pemicu Cleaning Bot
        console.log(`[Kantor AI] Ruang database dibersihkan`);
        break;
    }

    // Response sukses ke AdaFakta (harus < 1.5 detik)
    return NextResponse.json({
      success: true,
      receivedAction: action,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error webhook Kantor AI:', error);
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}
```

### 3. Pemetaan Visual Karakter & Diorama 3D di Kantor AI

| Aksi Masuk | Karakter 3D yang Bereaksi | Objek / Animasi di Kantor AI |
|---|---|---|
| `draft_created` | **Agent Scout** (Meja Depan) | Mengetik di keyboard komputer, lampu radar berkedip. |
| `cover_generated` | **Agent Pixel** (Studio Foto) | Memegang kamera, monitor mejanya menampilkan preview gambar ImgBB. |
| `article_published` | **Karakter Penulis (`author`)** | Berdiri ke panggung, konfeti meletup, layar LED besar memajang judul berita dan link artikel (`articleUrl`). |
| `article_rewritten` | **Agent Sadur** (Meja Sadur) | Karakter membaca berkas referensi dari media asal (`source`). |
| `ai_studio_generated` | **Agent Studio** (Lab AI) | Tabung hologram / partikel bercahaya menyala saat model AI bekerja. |
| `author_created` | **Papan Struktur Redaksi** | Muncul kartu profil wartawan baru di dinding kantor. |
| `db_purged` | **Cleaning Bot** | Robot mini berjalan menyapu lantai ruang server database. |

---

## 4. Langkah Eksekusi (Roadmap)

- [ ] **Langkah 1 (AdaFakta):** Update tipe data `KantorAIPayload` di `lib/kantorAiNotifier.ts`.
- [ ] **Langkah 2 (AdaFakta):** Pasang pemanggil `notifyKantorAI` di 4 file tindakan admin (`sadur/actions.ts`, `generator/actions.ts`, `penulis/actions.ts`, `maintenance/actions.ts`) dan perkaya pemanggil di `jurnalis/actions.ts` & `cron/jurnalis-publisher/route.ts`.
- [ ] **Langkah 3 (AdaFakta):** Uji verifikasi TypeScript `npx tsc --noEmit` untuk memastikan 0 error.
- [ ] **Langkah 4 (AdaFakta):** Simpan commit lokal (tanpa push/redeploy otomatis, sesuai arahan pengguna).
- [ ] **Langkah 5 (Kantor AI):** Pengguna menerapkan endpoint receiver dan webhook secret di proyek web Kantor AI.

---

> Rencana ini siap dieksekusi begitu Anda memberikan konfirmasi ("Silakan" / "Lanjut").

