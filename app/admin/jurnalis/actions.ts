'use server';

import { db, sql } from '@/db';
import { articles, jurnalisDrafts, systemSettings } from '@/db/schema';
import { eq, desc, inArray, and, isNotNull, gt } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { uploadImageToImgbb } from '../media-actions';
import { notifySearchEngines } from '@/lib/indexing';
import { sendTelegramMessage } from '@/lib/telegram';
import { getAISettings } from '@/app/admin/pengaturan/actions';

function generateSlug(text: string): string {
  const base = text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 150);
  const randomSuffix = Math.random().toString(36).substring(2, 7);
  return `${base}-${randomSuffix}`;
}

export async function deleteDraftAction(draftId: number) {
  try {
    await db.delete(jurnalisDrafts).where(eq(jurnalisDrafts.id, draftId));
    revalidatePath('/admin/jurnalis');
    revalidatePath('/admin');
    return { success: true };
  } catch (err: any) {
    console.error('Gagal menghapus draf jurnalis:', err);
    return { success: false, error: err?.message || 'Gagal menghapus draf' };
  }
}

export async function deleteMultipleDraftsAction(draftIds: number[]) {
  try {
    if (!draftIds || draftIds.length === 0) return { success: true, count: 0 };
    await db.delete(jurnalisDrafts).where(inArray(jurnalisDrafts.id, draftIds));
    revalidatePath('/admin/jurnalis');
    revalidatePath('/admin');
    return { success: true, count: draftIds.length };
  } catch (err: any) {
    console.error('Gagal menghapus beberapa draf jurnalis:', err);
    return { success: false, error: err?.message || 'Gagal menghapus draf terpilih' };
  }
}

export async function deleteAllDraftsAction(scope: 'all' | 'draft' | 'generated' = 'all') {
  try {
    if (scope === 'draft') {
      await db.delete(jurnalisDrafts).where(eq(jurnalisDrafts.status, 'draft'));
    } else if (scope === 'generated') {
      await db.delete(jurnalisDrafts).where(eq(jurnalisDrafts.status, 'generated'));
    } else {
      await db.delete(jurnalisDrafts);
    }
    revalidatePath('/admin/jurnalis');
    revalidatePath('/admin');
    return { success: true };
  } catch (err: any) {
    console.error('Gagal menghapus semua draf jurnalis:', err);
    return { success: false, error: err?.message || 'Gagal menghapus seluruh draf' };
  }
}

export async function convertDraftToArticleAction(draftId: number, targetCategory?: string) {
  try {
    const draft = await db.query.jurnalisDrafts.findFirst({
      where: eq(jurnalisDrafts.id, draftId),
    });

    if (!draft) {
      return { success: false, error: 'Draf tidak ditemukan' };
    }

    const title = draft.generatedTitle || draft.title;
    const content = draft.generatedArticle || draft.summary || 'Isi artikel berita...';
    const slug = generateSlug(title);
    const excerpt = (draft.summary || content).slice(0, 180) + '...';

    // Prioritaskan kategori yang diberikan, atau fallback ke 'Nasional'
    const validCategories = ['Nasional', 'Internasional', 'Regional', 'Sport', 'AI', 'Gadget', 'Software', 'Hardware', 'Infrastruktur'];
    let chosenCategory = 'Nasional';
    if (targetCategory && validCategories.includes(targetCategory)) {
      chosenCategory = targetCategory;
    } else if (draft.category && validCategories.includes(draft.category)) {
      chosenCategory = draft.category;
    }

    const rawCoverUrl = draft.coverUrl || 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=1200&auto=format&fit=crop&q=80';
    const coverUrl = rawCoverUrl.replace(/https?:\/\/i\.ibb\.co\//g, 'https://i.ibb.co.com/');
    const coverCaption = draft.coverCaption || `Ilustrasi liputan berita: ${title}`;
    const tags = Array.isArray(draft.tags) && draft.tags.length > 0 
      ? draft.tags 
      : ['berita', 'intelijen-jurnalis', chosenCategory.toLowerCase()];

    // Insert ke tabel articles AdaFakta (Penulis ID 3: Redaksi 2 / penulis 2)
    const [newArticle] = await db
      .insert(articles)
      .values({
        title,
        slug,
        excerpt,
        content,
        category: chosenCategory,
        author: 'Redaksi 2',
        authorId: 3,
        coverUrl,
        coverCaption,
        status: 'draft',
        tags,
      })
      .returning({ id: articles.id, slug: articles.slug });

    // Update status draf jurnalis menjadi 'published'
    await db
      .update(jurnalisDrafts)
      .set({ status: 'published' })
      .where(eq(jurnalisDrafts.id, draftId));

    revalidatePath('/admin/jurnalis');
    revalidatePath('/admin');

    return {
      success: true,
      articleId: newArticle.id,
      slug: newArticle.slug,
      message: 'Berhasil dipindahkan ke draf artikel utama!',
    };
  } catch (err: any) {
    console.error('Gagal memindahkan draf ke artikel:', err);
    return { success: false, error: err?.message || 'Gagal memproses ke artikel' };
  }
}

/**
 * Unggah atau kaitkan foto ImgBB ke draf jurnalis.
 * Jika naskah berita sudah siap (generated), status otomatis dinaikkan ke 'ready_to_publish' (masuk antrean cron).
 */
export async function attachPhotoToDraftAction(draftId: number, formData: FormData) {
  try {
    const draft = await db.query.jurnalisDrafts.findFirst({
      where: eq(jurnalisDrafts.id, draftId),
    });

    if (!draft) {
      return { success: false, error: 'Draf jurnalis tidak ditemukan' };
    }

    const file = formData.get('file') as File | null;
    const directImageUrl = (formData.get('imageUrl') as string | null)?.trim();
    const caption = (formData.get('caption') as string | null)?.trim() || null;

    let finalCoverUrl = '';

    if (file && file.size > 0) {
      // Unggah berkas ke ImgBB
      const uploadRes = await uploadImageToImgbb(formData);
      if (uploadRes.error || !uploadRes.url) {
        return { success: false, error: uploadRes.error || 'Gagal mengunggah foto ke ImgBB' };
      }
      finalCoverUrl = uploadRes.url;
    } else if (directImageUrl) {
      // Jika berupa tautan direct ImgBB, bisa langsung dipakai
      if (directImageUrl.includes('ibb.co')) {
        finalCoverUrl = directImageUrl;
      } else {
        // Jika tautan gambar eksternal, unggah ke ImgBB agar menjadi CDN permanen
        const uploadRes = await uploadImageToImgbb(formData);
        if (uploadRes.error || !uploadRes.url) {
          finalCoverUrl = directImageUrl; // fallback ke URL asli jika upload gagal
        } else {
          finalCoverUrl = uploadRes.url;
        }
      }
    } else {
      return { success: false, error: 'Pilih file gambar atau masukkan URL gambar yang valid.' };
    }

    // Normalisasi link gambar ke i.ibb.co.com
    finalCoverUrl = finalCoverUrl.replace(/https?:\/\/i\.ibb\.co\//g, 'https://i.ibb.co.com/');

    // Jika draf sudah memiliki teks artikel ter-generate, otomatis aktifkan antrean 'ready_to_publish'
    const newStatus = draft.generatedArticle ? 'ready_to_publish' : draft.status;

    // Ambil publishAt dari form atau hitung auto-slot +2 jam
    const publishAtRaw = formData.get('publishAt') as string | null;
    let targetPublishAt: Date | null = null;
    if (publishAtRaw) {
      const parsed = new Date(publishAtRaw);
      if (!isNaN(parsed.getTime())) {
        targetPublishAt = parsed;
      }
    }
    if (!targetPublishAt && newStatus === 'ready_to_publish') {
      const slotRes = await getNextSuggestedPublishTimeAction();
      targetPublishAt = new Date(slotRes.iso);
    }

    await db
      .update(jurnalisDrafts)
      .set({
        coverUrl: finalCoverUrl,
        coverCaption: caption || draft.coverCaption || `Ilustrasi: ${draft.generatedTitle || draft.title}`,
        publishAt: targetPublishAt || draft.publishAt,
        status: newStatus,
      })
      .where(eq(jurnalisDrafts.id, draftId));

    revalidatePath('/admin/jurnalis');
    revalidatePath('/admin');

    return {
      success: true,
      coverUrl: finalCoverUrl,
      status: newStatus,
      publishAt: targetPublishAt ? targetPublishAt.toISOString() : null,
      message: newStatus === 'ready_to_publish' 
        ? 'Foto terpasang & draf resmi masuk antrean publikasi terjadwal!' 
        : 'Foto berhasil disimpan.',
    };
  } catch (err: any) {
    console.error('Gagal memasang foto draf:', err);
    return { success: false, error: err?.message || 'Gagal menyimpan foto' };
  }
}

const JURNALIS_INTERVAL_KEY = 'jurnalis_publish_interval_minutes';
const DEFAULT_JURNALIS_INTERVAL_MINUTES = 60; // 1 Jam default

/**
 * Mengambil interval publikasi antrean jurnalis dalam satuan menit dari system_settings.
 * Default: 60 menit (1 Jam).
 */
export async function getJurnalisPublishIntervalAction(): Promise<number> {
  try {
    const [row] = await db
      .select({ value: systemSettings.value })
      .from(systemSettings)
      .where(eq(systemSettings.key, JURNALIS_INTERVAL_KEY))
      .limit(1);

    if (row && row.value) {
      const parsed = parseInt(row.value, 10);
      if (!isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }
    return DEFAULT_JURNALIS_INTERVAL_MINUTES;
  } catch (err) {
    console.error('Gagal mengambil interval jurnalis:', err);
    return DEFAULT_JURNALIS_INTERVAL_MINUTES;
  }
}

/**
 * Menyimpan interval publikasi antrean jurnalis baru ke system_settings.
 */
export async function updateJurnalisPublishIntervalAction(intervalMinutes: number) {
  try {
    const safeInterval = Math.max(5, Math.min(1440, Number(intervalMinutes) || DEFAULT_JURNALIS_INTERVAL_MINUTES));
    await db
      .insert(systemSettings)
      .values({
        key: JURNALIS_INTERVAL_KEY,
        value: safeInterval.toString(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: {
          value: safeInterval.toString(),
          updatedAt: new Date(),
        },
      });

    revalidatePath('/admin/jurnalis');
    return { success: true, intervalMinutes: safeInterval };
  } catch (err: any) {
    console.error('Gagal menyimpan interval antrean jurnalis:', err);
    return { success: false, error: err?.message || 'Gagal menyimpan interval antrean' };
  }
}

/**
 * Menghitung waktu slot tayang rekomendasi berikutnya (Waterfall Queue).
 * Mencari jadwal publish_at terjauh yang ada di antrean aktif, lalu menambah interval dinamis (default: 1 jam).
 */
export async function getNextSuggestedPublishTimeAction() {
  try {
    const now = new Date();
    const intervalMinutes = await getJurnalisPublishIntervalAction();
    const intervalMs = intervalMinutes * 60 * 1000;

    // 1. Cek antrean jurnalis yang aktif dan memiliki publish_at di masa depan
    const [latestJurnalis] = await db
      .select({ publishAt: jurnalisDrafts.publishAt })
      .from(jurnalisDrafts)
      .where(
        and(
          eq(jurnalisDrafts.status, 'ready_to_publish'),
          isNotNull(jurnalisDrafts.publishAt),
          gt(jurnalisDrafts.publishAt, now)
        )
      )
      .orderBy(desc(jurnalisDrafts.publishAt))
      .limit(1);

    // 2. Cek artikel scheduled manual yang memiliki publish_at di masa depan
    const [latestArticle] = await db
      .select({ publishAt: articles.publishAt })
      .from(articles)
      .where(
        and(
          eq(articles.status, 'scheduled'),
          isNotNull(articles.publishAt),
          gt(articles.publishAt, now)
        )
      )
      .orderBy(desc(articles.publishAt))
      .limit(1);

    let baseTime = now;
    if (latestJurnalis?.publishAt && latestArticle?.publishAt) {
      baseTime = latestJurnalis.publishAt > latestArticle.publishAt ? latestJurnalis.publishAt : latestArticle.publishAt;
    } else if (latestJurnalis?.publishAt) {
      baseTime = latestJurnalis.publishAt;
    } else if (latestArticle?.publishAt) {
      baseTime = latestArticle.publishAt;
    }

    // Tambah interval dinamis (Waterfall Queue)
    const nextSlot = new Date(baseTime.getTime() + intervalMs);

    return {
      success: true,
      iso: nextSlot.toISOString(),
      intervalMinutes,
    };
  } catch (err: any) {
    console.error('Gagal menghitung slot waktu:', err);
    const fallback = new Date(Date.now() + 60 * 60 * 1000);
    return {
      success: true,
      iso: fallback.toISOString(),
      intervalMinutes: 60,
    };
  }
}

/**
 * Update jadwal terbit khusus draf jurnalis
 */
export async function updateDraftScheduleAction(draftId: number, publishAtStr: string) {
  try {
    const publishAt = new Date(publishAtStr);
    if (isNaN(publishAt.getTime())) {
      return { success: false, error: 'Format tanggal dan jam tidak valid' };
    }
    await db.update(jurnalisDrafts).set({ publishAt }).where(eq(jurnalisDrafts.id, draftId));
    revalidatePath('/admin/jurnalis');
    revalidatePath('/admin');
    return { success: true, publishAt: publishAt.toISOString() };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Gagal mengubah jadwal' };
  }
}

/**
 * Hapus foto dari draf dan kembalikan status draf keluar dari antrean publikasi.
 */
export async function removePhotoFromDraftAction(draftId: number) {
  try {
    const draft = await db.query.jurnalisDrafts.findFirst({
      where: eq(jurnalisDrafts.id, draftId),
    });

    if (!draft) {
      return { success: false, error: 'Draf tidak ditemukan' };
    }

    const fallbackStatus = draft.generatedArticle ? 'generated' : 'draft';

    await db
      .update(jurnalisDrafts)
      .set({
        coverUrl: null,
        coverCaption: null,
        publishAt: null,
        status: fallbackStatus,
      })
      .where(eq(jurnalisDrafts.id, draftId));

    revalidatePath('/admin/jurnalis');
    revalidatePath('/admin');

    return {
      success: true,
      status: fallbackStatus,
      message: 'Foto draf telah dihapus. Draf dikeluarkan dari antrean.',
    };
  } catch (err: any) {
    console.error('Gagal menghapus foto draf:', err);
    return { success: false, error: err?.message || 'Gagal menghapus foto' };
  }
}

/**
 * Publikasi instan 1 draf langsung ke portal tanpa menunggu jadwal cron.
 */
export async function instantPublishDraftAction(draftId: number) {
  try {
    const draft = await db.query.jurnalisDrafts.findFirst({
      where: eq(jurnalisDrafts.id, draftId),
    });

    if (!draft) {
      return { success: false, error: 'Draf tidak ditemukan' };
    }

    if (!draft.coverUrl) {
      return { success: false, error: 'Foto cover wajib diisi sebelum menerbitkan berita.' };
    }

    const title = (draft.generatedTitle || draft.title).trim();
    const content = (draft.generatedArticle || draft.summary || '').trim();
    if (!content) {
      return { success: false, error: 'Konten naskah berita belum di-generate oleh AI.' };
    }

    const slug = generateSlug(title);
    const excerpt = (draft.summary || content).slice(0, 180).trim() + '...';

    const validCategories = [
      'Nasional', 'Internasional', 'Regional', 'Sport', 'AI', 'Gadget', 'Software', 'Hardware', 'Infrastruktur'
    ];
    let chosenCategory = 'Nasional';
    if (draft.category && validCategories.includes(draft.category)) {
      chosenCategory = draft.category;
    }

    const now = new Date();
    const rawCover = draft.coverUrl || '';
    const normalizedCoverUrl = rawCover.replace(/https?:\/\/i\.ibb\.co\//g, 'https://i.ibb.co.com/');

    let articleTags: string[] = ['berita', 'adafaktanews', chosenCategory.toLowerCase()];
    if (Array.isArray(draft.tags) && draft.tags.length > 0) {
      articleTags = Array.from(new Set([...articleTags, ...draft.tags]));
    }

    // Insert ke tabel articles utama (Status: published, Penulis ID 3: Redaksi 2 / penulis 2)
    const [newArticle] = await db
      .insert(articles)
      .values({
        title,
        slug,
        excerpt,
        content,
        category: chosenCategory,
        author: 'Redaksi 2',
        authorId: 3,
        coverUrl: normalizedCoverUrl,
        coverCaption: draft.coverCaption || `Ilustrasi liputan: ${title}`,
        status: 'published',
        publishedAt: now,
        publishAt: now,
        tags: articleTags,
        createdAt: now,
        updatedAt: now,
      })
      .returning({
        id: articles.id,
        slug: articles.slug,
        title: articles.title,
        category: articles.category,
      });

    // Update draf jurnalis menjadi 'published'
    await db
      .update(jurnalisDrafts)
      .set({ status: 'published' })
      .where(eq(jurnalisDrafts.id, draftId));

    // Instant Indexing
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.adafakta.web.id';
    const articleUrl = `${siteUrl}/berita/${newArticle.category.toLowerCase()}/${newArticle.id}/${newArticle.slug}`;
    notifySearchEngines(articleUrl).catch((err) =>
      console.warn('Instant publish indexing error:', err)
    );

    // Notifikasi Telegram
    const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID?.trim();
    if (adminChatId) {
      const editUrl = `${siteUrl}/admin/edit/${newArticle.id}`;
      const tgMessage = `🚀 <b>BERITA RESMI TERBIT (INSTANT PUBLISH)</b>
<i>Diterbitkan manual langsung dari Meja Jurnalis AI</i>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📰 <b>${newArticle.title}</b>

┌── 📋 <b>Detail Publikasi</b>
│ 📂 Kategori : <b>${newArticle.category}</b>
│ 🖼️ Foto     : <a href="${draft.coverUrl}">Lihat Foto ImgBB</a>
│ 🌐 Status   : <code>Live di Portal</code>
└──
━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

      sendTelegramMessage(adminChatId, tgMessage, {
        inlineKeyboard: [
          [
            { text: '🌐 Baca di Web', url: articleUrl },
            { text: '✏️ Buka Editor', url: editUrl },
          ],
        ],
      }).catch((tgErr) => console.warn('Telegram instant publish error:', tgErr));
    }

    revalidatePath('/', 'layout');
    revalidatePath('/admin');
    revalidatePath('/admin/jurnalis');

    return {
      success: true,
      articleId: newArticle.id,
      slug: newArticle.slug,
      articleUrl,
      newArticle,
      message: 'Berita berhasil diterbitkan dan langsung tayang di portal!',
    };
  } catch (err: any) {
    console.error('Gagal menerbitkan draf:', err);
    return { success: false, error: err?.message || 'Gagal menerbitkan draf' };
  }
}

function parseAIResponseContent(rawBody: string): string {
  const trimmed = rawBody.trim();

  if (trimmed.startsWith('data:') || trimmed.includes('\ndata:') || trimmed.includes('\r\ndata:')) {
    let accumulated = '';
    const lines = trimmed.split(/\r?\n/);
    for (const line of lines) {
      const lineTrimmed = line.trim();
      if (!lineTrimmed.startsWith('data:')) continue;
      const dataPayload = lineTrimmed.slice(5).trim();
      if (!dataPayload || dataPayload === '[DONE]') continue;
      try {
        const parsed = JSON.parse(dataPayload);
        const piece =
          parsed?.choices?.[0]?.delta?.content ??
          parsed?.choices?.[0]?.message?.content ??
          parsed?.choices?.[0]?.text ??
          '';
        accumulated += piece;
      } catch {}
    }
    if (accumulated.trim()) return accumulated.trim();
  }

  try {
    const json = JSON.parse(trimmed);
    return json?.choices?.[0]?.message?.content ?? trimmed;
  } catch {
    return trimmed;
  }
}

function cleanJsonOutput(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, "");
  }
  return cleaned.trim();
}

/**
 * Eksekusi penyusunan naskah utuh berita AI untuk 1 draf jurnalis.
 * Memakai konfigurasi model AI dinamis, menyisipkan 1-2 link 'Baca Juga', dan mencantumkan sumber rujukan.
 */
export async function generateJurnalisDraftAction(draftId: number) {
  try {
    if (!draftId) {
      return { success: false, error: 'draftId diperlukan' };
    }

    const rows = (await sql`
      SELECT id, title, source, original_url, summary, cover_url
      FROM jurnalis_drafts
      WHERE id = ${draftId}
      LIMIT 1;
    `) as Array<{
      id: number;
      title: string;
      source: string;
      original_url: string;
      summary: string | null;
      cover_url: string | null;
    }>;

    if (!rows || rows.length === 0) {
      return { success: false, error: 'Draf berita tidak ditemukan' };
    }

    const draft = rows[0];

    // Ambil konfigurasi model AI dinamis dari database (Pengaturan AI)
    const aiSettings = await getAISettings();
    const provider = aiSettings.defaultProvider || '9router';

    let baseUrl = (aiSettings.baseUrl || process.env.NINEROUTER_BASE_URL || process.env.LOCAL_9ROUTER_BASE_URL || 'http://node7.botkeep.cloud:40022/v1').trim().replace(/\/+$/, '');
    let apiKey = (aiSettings.apiKey || process.env.NINEROUTER_API_KEY || process.env.LOCAL_9ROUTER_KEY || 'sk-d6bddb272e797ddb-oj08b1-36238240').trim();
    let model = (aiSettings.model || process.env.NINEROUTER_MODEL || process.env.LOCAL_9ROUTER_MODEL || 'radox/deepseek-v4-flash-0731').trim();

    if (provider === 'gemini' && process.env.GEMINI_API_KEY && (model.toLowerCase().includes('gemini') || !aiSettings.model)) {
      baseUrl = (process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai').replace(/\/+$/, '');
      apiKey = process.env.GEMINI_API_KEY;
      model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    } else if (provider === 'groq' && process.env.GROQ_API_KEY && (model.toLowerCase().includes('groq') || model.toLowerCase().includes('gpt-oss'))) {
      baseUrl = (process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1').replace(/\/+$/, '');
      apiKey = process.env.GROQ_API_KEY;
      model = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
    }

    const promptSystem = `Kamu adalah jurnalis dan editor berita senior di media "AdaFakta" (adafakta.web.id). 
Tugasmu adalah menulis artikel berita utuh berbahasa Indonesia yang objektif, faktual, mendalam, dan mematuhi kaidah 5W+1H (What, Who, Where, When, Why, How).

Pedoman penulisan:
1. Buat judul berita yang lugas, menarik, dan informatif (tanpa clickbait murahan).
2. Kalimat pertama pada paragraf pembuka WAJIB diawali langsung dengan teks "adafaktanews - " (huruf kecil semua diikuti tanda hubung dan spasi), contoh: "adafaktanews - [inti peristiwa terhangat...]".
3. Tulis isi berita sebanyak 350 sampai 500 kata yang terdiri dari:
   - Paragraf Lead (diawali adafaktanews - ).
   - Paragraf Penjelasan & Konteks (latar belakang kejadian).
   - Dampak atau implikasi peristiwa bagi masyarakat/sektor terkait.
   - Paragraf Penutup yang merangkum status terkini.
4. Di baris paling akhir naskah berita, sertakan satu baris atribusi rujukan dengan tulisan miring: "*Sumber: ${draft.source}*".
5. Jangan mengarang fakta fiktif di luar konteks berita sumber.
6. Format output HANYA dalam bentuk JSON valid persis seperti ini tanpa komentar tambahan:
{
  "title": "Judul Berita Baru",
  "content": "Isi lengkap artikel berita...",
  "category": "Kategori yang cocok (WAJIB SALAH SATU: Nasional, Internasional, Regional, Sport, AI, Gadget, Software, Hardware, Infrastruktur)",
  "tags": ["tag1", "tag2", "tag3"]
}`;

    const promptUser = `Tolong tuliskan artikel berita lengkap berdasarkan fakta intelijen berikut:
Judul Sumber: ${draft.title}
Sumber Media Asli: ${draft.source}
Tautan Asli: ${draft.original_url}
Ringkasan Fakta: ${draft.summary || '-'}`;

    const endpoint = `${baseUrl}/chat/completions`;

    const aiRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          { role: 'system', content: promptSystem },
          { role: 'user', content: promptUser },
        ],
        temperature: 0.7,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      throw new Error(`AI Gateway error (${aiRes.status}) [Model: ${model}]: ${errText}`);
    }

    const rawText = await aiRes.text();
    const rawContent = parseAIResponseContent(rawText);
    const cleanedJson = cleanJsonOutput(rawContent);

    let aiParsed: {
      title?: string;
      content?: string;
      category?: string;
      tags?: string[];
    } = {};

    try {
      aiParsed = JSON.parse(cleanedJson);
    } catch {
      aiParsed = {
        title: draft.title,
        content: cleanedJson,
        category: 'Umum',
        tags: [],
      };
    }

    const finalTitle = aiParsed.title || draft.title;
    let finalContent = (aiParsed.content || '').trim();

    // Pastikan awalan selalu 'adafaktanews - '
    if (!finalContent.toLowerCase().startsWith('adafaktanews -')) {
      finalContent = finalContent.replace(/^adafaktanews\s*[-–—]?\s*/i, '');
      finalContent = `adafaktanews - ${finalContent.trimStart()}`;
    }

    const finalCategory = aiParsed.category || 'Umum';
    const finalTags = Array.isArray(aiParsed.tags) ? aiParsed.tags : [];

    // Bersihkan penanda sumber sementara jika AI sudah menulisnya di dalam naskah
    const expectedSource = draft.source || 'Media Partner';
    finalContent = finalContent.replace(/\n*\*Sumber:.*?\*\s*$/i, '').trim();

    // Sisipkan Smart Internal Linking ("Baca Juga")
    try {
      let relatedArticles: Array<{ id: number; title: string; slug: string; category: string }> = [];

      const sameCatRows = (await sql`
        SELECT id, title, slug, category
        FROM articles
        WHERE status = 'published' AND LOWER(category) = LOWER(${finalCategory})
        ORDER BY id DESC
        LIMIT 2;
      `) as Array<{ id: number; title: string; slug: string; category: string }>;

      relatedArticles = sameCatRows || [];

      if (relatedArticles.length < 2) {
        const excludeIds = relatedArticles.map((a) => a.id);
        const latestRows = (await sql`
          SELECT id, title, slug, category
          FROM articles
          WHERE status = 'published'
          ORDER BY id DESC
          LIMIT 5;
        `) as Array<{ id: number; title: string; slug: string; category: string }>;

        for (const r of latestRows || []) {
          if (!excludeIds.includes(r.id) && relatedArticles.length < 2) {
            relatedArticles.push(r);
          }
        }
      }

      if (relatedArticles.length > 0 && !/baca juga\s*:/i.test(finalContent)) {
        const paragraphs = finalContent.split(/\n\s*\n/).filter((p) => p.trim().length > 0);

        const buildLinkSnippet = (art: { id: number; title: string; slug: string; category: string }) => {
          const catSlug = (art.category || 'umum').toLowerCase().replace(/\s+/g, '-');
          return `> **Baca Juga:** [${art.title}](/berita/${catSlug}/${art.id}/${art.slug})`;
        };

        const snippet1 = buildLinkSnippet(relatedArticles[0]);
        const snippet2 = relatedArticles.length > 1 ? buildLinkSnippet(relatedArticles[1]) : '';

        if (paragraphs.length >= 5) {
          paragraphs.splice(2, 0, snippet1);
          if (snippet2) {
            paragraphs.splice(5, 0, snippet2);
          }
          finalContent = paragraphs.join('\n\n');
        } else if (paragraphs.length >= 3) {
          paragraphs.splice(1, 0, snippet1);
          if (snippet2 && paragraphs.length >= 3) {
            paragraphs.splice(3, 0, snippet2);
          } else if (snippet2) {
            paragraphs.push(snippet2);
          }
          finalContent = paragraphs.join('\n\n');
        } else {
          finalContent = snippet2 
            ? `${finalContent}\n\n${snippet1}\n\n${snippet2}` 
            : `${finalContent}\n\n${snippet1}`;
        }
      }
    } catch (err) {
      console.warn('Gagal menyisipkan internal link Baca Juga:', err);
    }

    // Pastikan baris akhir selalu memuat atribusi '*Sumber: [sumber]*'
    if (!finalContent.includes('*Sumber:')) {
      finalContent = `${finalContent.trimEnd()}\n\n*Sumber: ${expectedSource}*`;
    }

    const nextStatus = draft.cover_url && draft.cover_url.trim().length > 0 ? 'ready_to_publish' : 'generated';

    // Simpan hasil generate ke database
    await sql`
      UPDATE jurnalis_drafts
      SET 
        generated_title = ${finalTitle},
        generated_article = ${finalContent},
        category = ${finalCategory},
        tags = ${finalTags},
        status = ${nextStatus}
      WHERE id = ${draftId};
    `;

    revalidatePath('/admin/jurnalis');
    revalidatePath('/admin');

    return {
      success: true,
      data: {
        draftId,
        generatedTitle: finalTitle,
        generatedArticle: finalContent,
        category: finalCategory,
        tags: finalTags,
        status: nextStatus,
        coverUrl: draft.cover_url,
      },
    };
  } catch (error: any) {
    console.error('Gagal generate artikel jurnalis action:', error);
    return {
      success: false,
      error: 'Gagal memproses AI',
      details: String(error?.message || error),
    };
  }
}

/**
 * Pasang URL foto cover langsung ke draf jurnalis (dari Telegram atau input manual)
 * Jika naskah sudah siap (generated), draf otomatis berstatus 'ready_to_publish' dan dijadwalkan per 2 jam ke depan.
 */
export async function attachPhotoUrlToDraftAction(draftId: number, photoUrl: string, caption?: string) {
  try {
    const draft = await db.query.jurnalisDrafts.findFirst({
      where: eq(jurnalisDrafts.id, draftId),
    });

    if (!draft) {
      return { success: false, error: 'Draf jurnalis tidak ditemukan' };
    }

    const normalizedCoverUrl = photoUrl.replace(/https?:\/\/i\.ibb\.co\//g, 'https://i.ibb.co.com/');
    const newStatus = draft.generatedArticle ? 'ready_to_publish' : draft.status;

    let targetPublishAt: Date | null = null;
    if (newStatus === 'ready_to_publish') {
      const slotRes = await getNextSuggestedPublishTimeAction();
      targetPublishAt = new Date(slotRes.iso);
    }

    await db
      .update(jurnalisDrafts)
      .set({
        coverUrl: normalizedCoverUrl,
        coverCaption: caption || draft.coverCaption || `Ilustrasi: ${draft.generatedTitle || draft.title}`,
        publishAt: targetPublishAt || draft.publishAt,
        status: newStatus,
      })
      .where(eq(jurnalisDrafts.id, draftId));

    revalidatePath('/admin/jurnalis');
    revalidatePath('/admin');

    return {
      success: true,
      coverUrl: normalizedCoverUrl,
      status: newStatus,
      publishAt: targetPublishAt ? targetPublishAt.toISOString() : null,
      message: newStatus === 'ready_to_publish' 
        ? 'Foto terpasang & draf resmi masuk antrean publikasi terjadwal!' 
        : 'Foto berhasil disimpan.',
    };
  } catch (err: any) {
    console.error('Gagal memasang URL foto draf:', err);
    return { success: false, error: err?.message || 'Gagal memasang foto' };
  }
}
