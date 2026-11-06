# 📋 Rencana Implementasi: Integrasi Webhook Lengkap (AdaFakta ➔ Kantor AI 3D)

> **Status Dokumen:** 📝 Draft Perencanaan Dua Arah (AdaFakta & Kantor AI)  
> **Prinsip Utama:** Tidak ada file kode yang diubah/diimplementasikan sebelum rencana ini disetujui.

---

## 1. Latar Belakang & Tujuan

* **Tujuan Utama:** Menghubungkan seluruh aktivitas di 12 menu web admin **AdaFakta** ke dashboard visual 3D **Kantor AI**.
* **Keamanan:** Menggunakan prinsip *Fire-and-Forget* non-blocking dengan batas waktu (*timeout*) 1.5 detik dan peredam error senyap (*silent catch*), menjamin web AdaFakta 100% aman dan tidak terbebani.
* **Hasil:** Setiap aksi di AdaFakta (berita masuk, foto sampul ImgBB, artikel terbit, sadur URL, AI studio, tambah penulis, hingga pembersihan DB) langsung memicu animasi dan reaksi diorama 3D di Kantor AI.

---

## 2. Bagian I: Pembaruan di Proyek AdaFakta (`e:\porto\naratif`)

### A. Format Data Baru di [`lib/kantorAiNotifier.ts`](file:///e:/porto/naratif/lib/kantorAiNotifier.ts)
Tipe payload diperkaya dengan data spesifik (penulis, link artikel, kutipan/excerpt, model AI, dan sumber):

```typescript
export interface KantorAIPayload {
  action: 
    | 'draft_created'       // Berita baru masuk dari bot/RSS
    | 'cover_generated'     // Foto sampul selesai di-scrape & diunggah ke ImgBB
    | 'article_published'   // Artikel resmi terbit (Waterfall Queue / Instant Publish)
    | 'article_rewritten'   // Berita selesai disadur dari URL luar (Menu Sadur)
    | 'ai_studio_generated' // Artikel selesai diracik dari AI Studio (Menu AI Studio)
    | 'author_created'      // Wartawan/penulis baru didaftarkan (Menu Tim Penulis)
    | 'db_purged';          // Pembersihan sampah database selesai (Menu Maintenance)

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

### B. Titik Pemasangan di Modul AdaFakta
1. **Draf Baru Masuk ([`app/api/incoming-news/route.ts`](file:///e:/porto/naratif/app/api/incoming-news/route.ts)):**
   - Mengirim `action: 'draft_created'`, `title`, `source`, `category`, `excerpt`.
2. **Foto Sampul Selesai ([`app/admin/jurnalis/actions.ts`](file:///e:/porto/naratif/app/admin/jurnalis/actions.ts)):**
   - Mengirim `action: 'cover_generated'`, `title`, `coverUrl`, `category`.
3. **Artikel Terbit ([`app/api/cron/jurnalis-publisher/route.ts`](file:///e:/porto/naratif/app/api/cron/jurnalis-publisher/route.ts) & `instantPublishDraftAction`):**
   - Mengirim `action: 'article_published'`, `title`, `category`, `coverUrl`, `articleUrl`, `author`, `excerpt`.
4. **Sadur Berita Luar ([`app/admin/sadur/actions.ts`](file:///e:/porto/naratif/app/admin/sadur/actions.ts)):**
   - Di dalam `generateSadurArticleAction`: mengirim `action: 'article_rewritten'`, `title`, `source`, `author`.
5. **AI Studio Generator ([`app/admin/generator/actions.ts`](file:///e:/porto/naratif/app/admin/generator/actions.ts)):**
   - Di dalam `generateArticleAction`: mengirim `action: 'ai_studio_generated'`, `title`, `model`, `category`.
6. **Pendaftaran Penulis ([`app/admin/penulis/actions.ts`](file:///e:/porto/naratif/app/admin/penulis/actions.ts)):**
   - Di dalam `createAuthorAction`: mengirim `action: 'author_created'`, nama penulis, role/jabatan.
7. **Pembersihan Database ([`app/admin/maintenance/actions.ts`](file:///e:/porto/naratif/app/admin/maintenance/actions.ts)):**
   - Di dalam `executePurgeAction`: mengirim `action: 'db_purged'`, jumlah data yang dibersihkan.

---

## 3. Bagian II: Apa yang Perlu Dikonfigurasi & Dibuat di Proyek Web Kantor AI

Berikut adalah panduan teknis yang bisa langsung Anda terapkan di proyek **Kantor AI**:

### 1. File Konfigurasi Environment (`.env.local` di Kantor AI)
Tambahkan variabel pengaman token rahasia:
```env
WEBHOOK_SECRET="kantorai_secret_super_aman_2026"
```

### 2. File Endpoint Penerima (`app/api/incoming-news/route.ts` di Kantor AI)
Buat atau perbarui file ini di proyek Kantor AI untuk menerima data dari AdaFakta:

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
    } = payload;

    // 3. Logika Pemicu Animasi Karakter 3D Berdasarkan Jenis Aksi:
    switch (action) {
      case 'draft_created':
        // 🕵️‍♂️ Agent Scout (Meja Berita Masuk) bereaksi & mencatat
        console.log(`[Kantor AI] Berita baru masuk: ${title} dari ${source}`);
        break;

      case 'cover_generated':
        // 📸 Agent Pixel (Fotografer) memotret & foto ImgBB muncul di layar monitor
        console.log(`[Kantor AI] Foto sampul baru: ${coverUrl}`);
        break;

      case 'article_published':
        // 🎉 Karakter yang namanya cocok dengan author berdiri di panggung
        // Layar LED besar menampilkan title, excerpt, dan tombol articleUrl
        // Efek konfeti meletup di dalam ruangan
        console.log(`[Kantor AI] Artikel terbit oleh ${author}: ${title}`);
        break;

      case 'article_rewritten':
        // 🔗 Karakter di Meja Sadur URL membaca koran/website luar
        console.log(`[Kantor AI] Artikel disadur dari ${source}: ${title}`);
        break;

      case 'ai_studio_generated':
        // 🪄 Karakter di Lab AI Studio meracik artikel menggunakan model ${model}
        console.log(`[Kantor AI] Konten AI Studio selesai dibuat via ${model}`);
        break;

      case 'author_created':
        // 👥 Foto/nama wartawan baru muncul di papan struktur organisasi
        console.log(`[Kantor AI] Wartawan baru bergabung: ${title}`);
        break;

      case 'db_purged':
        // 🧹 Karakter Cleaning Bot menyapu lantai ruang server
        console.log(`[Kantor AI] Ruang data baru saja dibersihkan`);
        break;
    }

    return NextResponse.json({
      success: true,
      receivedAction: action,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error handling webhook in Kantor AI:', error);
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}
```

### 3. Pemetaan Visual di Diorama 3D Kantor AI

| Event Webhook | Karakter 3D yang Bereaksi | Elemen Visual / Objek 3D di Kantor |
|---|---|---|
| `draft_created` | **Agent Scout** (Meja Depan) | Mengetik cepat di keyboard, lampu radar berkedip. |
| `cover_generated` | **Agent Pixel** (Fotografer) | Lampu blitz menyala, foto ImgBB muncul di monitor mejanya. |
| `article_published` | **Author/Redaktur & Panggung** | Karakter berdiri, selebrasi konfeti, artikel tampil di layar LED besar. |
| `article_rewritten` | **Agent Sadur** (Meja Sadur URL) | Karakter memegang berkas/koran sumber luar. |
| `ai_studio_generated` | **Agent Studio** (Lab AI) | Tabung hologram / partikel bercahaya menyala. |
| `author_created` | **Papan Struktur Tim** | Kartu nama wartawan baru dipasang di dinding. |
| `db_purged` | **Cleaning Bot** | Robot mini berjalan menyapu lantai ruang server. |

---

## 4. Jaminan Keamanan Sistem (Zero-Impact Guarantee)
1. **Tidak Ada Beban Database:** Webhook dikirim setelah transaksi database AdaFakta selesai 100%.
2. **Koneksi Terisolasi:** Menggunakan `fetch` dengan `AbortController` 1.5 detik di dalam blok `try/catch` senyap.
3. **Web AdaFakta Kebal:** Jika web Kantor AI dimatikan atau internet terputus, operasional portal berita AdaFakta berjalan normal 100% tanpa delay dan tanpa error.

---

## 5. Persetujuan Pengguna

Rencana pembaruan ini telah dirancang untuk mencakup seluruh fungsionalitas admin secara elegan dan aman.  
Tidak ada kode yang diubah sebelum ada persetujuan dari Anda.

Apakah rencana integrasi lengkap di atas sudah sesuai dan siap kita terapkan ke proyek AdaFakta ini?
