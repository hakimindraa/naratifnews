'use server';

import { db, sql } from '@/db';
import { articles, jurnalisDrafts } from '@/db/schema';
import { eq, desc, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { uploadImageToImgbb } from '../media-actions';
import { notifySearchEngines } from '@/lib/indexing';
import { sendTelegramMessage } from '@/lib/telegram';

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

    const coverUrl = draft.coverUrl || 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=1200&auto=format&fit=crop&q=80';
    const coverCaption = draft.coverCaption || `Ilustrasi liputan berita: ${title}`;
    const tags = Array.isArray(draft.tags) && draft.tags.length > 0 
      ? draft.tags 
      : ['berita', 'intelijen-jurnalis', chosenCategory.toLowerCase()];

    // Insert ke tabel articles AdaFakta
    const [newArticle] = await db
      .insert(articles)
      .values({
        title,
        slug,
        excerpt,
        content,
        category: chosenCategory,
        author: 'Redaksi AdaFakta',
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

    // Jika draf sudah memiliki teks artikel ter-generate, otomatis aktifkan antrean 'ready_to_publish'
    const newStatus = draft.generatedArticle ? 'ready_to_publish' : draft.status;

    await db
      .update(jurnalisDrafts)
      .set({
        coverUrl: finalCoverUrl,
        coverCaption: caption || draft.coverCaption || `Ilustrasi: ${draft.generatedTitle || draft.title}`,
        status: newStatus,
      })
      .where(eq(jurnalisDrafts.id, draftId));

    revalidatePath('/admin/jurnalis');
    revalidatePath('/admin');

    return {
      success: true,
      coverUrl: finalCoverUrl,
      status: newStatus,
      message: newStatus === 'ready_to_publish' 
        ? 'Foto terpasang & draf resmi masuk antrean publikasi berkala!' 
        : 'Foto berhasil disimpan.',
    };
  } catch (err: any) {
    console.error('Gagal memasang foto draf:', err);
    return { success: false, error: err?.message || 'Gagal menyimpan foto' };
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

    let articleTags: string[] = ['berita', 'adafaktanews', chosenCategory.toLowerCase()];
    if (Array.isArray(draft.tags) && draft.tags.length > 0) {
      articleTags = Array.from(new Set([...articleTags, ...draft.tags]));
    }

    // Insert ke tabel articles utama (Status: published)
    const [newArticle] = await db
      .insert(articles)
      .values({
        title,
        slug,
        excerpt,
        content,
        category: chosenCategory,
        author: 'Redaksi Ada Fakta',
        coverUrl: draft.coverUrl,
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
      message: 'Berita berhasil diterbitkan dan langsung tayang di portal!',
    };
  } catch (err: any) {
    console.error('Gagal menerbitkan draf:', err);
    return { success: false, error: err?.message || 'Gagal menerbitkan draf' };
  }
}
