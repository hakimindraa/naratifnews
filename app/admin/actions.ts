'use server';

import matter from 'gray-matter';
import { db } from '@/db';
import { articles } from '@/db/schema';
import { revalidatePath } from 'next/cache';
import { eq, desc, like, sql, inArray } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { encrypt } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { notifySearchEngines } from '@/lib/indexing';
import { sendTelegramMessage } from '@/lib/telegram';

export async function uploadMarkdownFile(formData: FormData) {
  try {
    const file = formData.get('file') as File;
    if (!file) return { error: 'Tidak ada file yang dipilih' };
    
    if (file.size > 2 * 1024 * 1024) {
      return { error: 'Ukuran file maksimal 2 MB' };
    }

    const text = await file.text();
    
    // Fitur: Bulk Upload
    // Kita memisahkan teks berdasarkan teks '---SPLIT---' jika ada. 
    // Jika tidak ada, array ini hanya berisi 1 elemen (1 artikel).
    const rawArticles = text.split(/^---SPLIT---$/m).map(t => t.trim()).filter(t => t.length > 0);
    
    let successCount = 0;
    const errors: string[] = [];

    for (const rawText of rawArticles) {
      try {
        // Parse frontmatter
        const { data, content } = matter(rawText);
        
        // Validasi field wajib
        if (!data.title || !data.slug || !data.category || !data.cover) {
          errors.push(`Gagal: Artikel dengan slug '${data.slug || 'unknown'}' frontmatternya tidak lengkap.`);
          continue;
        }

        if (!data.cover.startsWith('http')) {
          errors.push(`Gagal: Cover untuk '${data.title}' harus berupa link (http).`);
          continue;
        }

        const categoryAllowed = ['Software', 'Hardware', 'AI', 'Infrastruktur', 'Gadget', 'Regional'];
        const rawCategory = String(data.category || '').trim().toLowerCase();
        const categoryMap: Record<string, string> = {
          'ai': 'AI',
          'software': 'Software',
          'hardware': 'Hardware',
          'infrastruktur': 'Infrastruktur',
          'gadget': 'Gadget',
          'regional': 'Regional',
        };
        const catFormatted = categoryMap[rawCategory] || (data.category.charAt(0).toUpperCase() + data.category.slice(1));
        
        if (!categoryAllowed.includes(catFormatted)) {
          errors.push(`Gagal: Kategori '${data.category}' pada '${data.title}' tidak valid.`);
          continue;
        }

        // Tentukan status dan waktu terbit
        let status = 'draft';
        let publishAt = null;
        let publishedAt = null;

        if (data.publish_at) {
          // Pastikan selalu dibaca sebagai WIB (UTC+7) jika tidak ada informasi timezone
          let pStr = String(data.publish_at).trim();
          if (!pStr.includes('+') && !pStr.endsWith('Z')) {
            // Jika dipisah spasi atau T
            if (pStr.includes(' ')) {
              pStr = pStr.replace(' ', 'T');
            }
            pStr += '+07:00';
          }
          publishAt = new Date(pStr);
          if (publishAt <= new Date()) {
            status = 'published';
            publishedAt = new Date(); // terbit sekarang
          } else {
            status = 'scheduled';
          }
        }

        // Normalisasi tags (bisa format array YAML maupun teks dipisah koma)
        let formattedTags: string[] = [];
        if (Array.isArray(data.tags)) {
          formattedTags = data.tags.map((t: any) => String(t).trim().replace(/^#/, '')).filter(Boolean);
        } else if (typeof data.tags === 'string' && data.tags.trim()) {
          formattedTags = data.tags.split(',').map((t: string) => t.trim().replace(/^#/, '')).filter(Boolean);
        }

        // Auto-generate excerpt jika belum diisi di frontmatter
        let excerpt = (data.excerpt || '').trim();
        if (!excerpt && content) {
          excerpt = content
            .replace(/#+\s+/g, '')
            .replace(/[*_`\[\]()]/g, '')
            .substring(0, 160)
            .trim();
          if (excerpt.length >= 150) excerpt += '...';
        }

        // Cek apakah slug sudah ada (untuk update/overwrite)
        const existing = await db.select({ id: articles.id }).from(articles).where(eq(articles.slug, data.slug)).limit(1);

        if (existing.length > 0) {
          // Update
          await db.update(articles).set({
            title: data.title,
            excerpt: excerpt,
            content: content,
            coverUrl: data.cover,
            coverCaption: data.cover_caption || '',
            category: catFormatted,
            author: data.author || 'Redaksi',
            tags: formattedTags,
            status: status,
            publishAt: publishAt,
            publishedAt: publishedAt,
            updatedAt: new Date(),
          }).where(eq(articles.id, existing[0].id));
        } else {
          // Insert
          await db.insert(articles).values({
            slug: data.slug,
            title: data.title,
            excerpt: excerpt,
            content: content,
            coverUrl: data.cover,
            coverCaption: data.cover_caption || '',
            category: catFormatted,
            author: data.author || 'Redaksi',
            tags: formattedTags,
            status: status,
            publishAt: publishAt,
            publishedAt: publishedAt,
          });
        }
        
        successCount++;
      } catch (err: any) {
        errors.push(`Gagal memproses salah satu artikel: ${err.message}`);
      }
    } // end for loop

    revalidatePath('/', 'layout');
    
    if (errors.length > 0) {
      if (successCount > 0) {
        return { success: true, message: `Berhasil mengunggah ${successCount} artikel. Tapi ada ${errors.length} error: ${errors[0]}` };
      } else {
        return { error: `Gagal semua. Error: ${errors.join(' | ')}` };
      }
    }

    return { success: true, message: `Luar biasa! Berhasil mengunggah ${successCount} artikel sekaligus.` };

  } catch (error: any) {
    console.error(error);
    return { error: error.message || 'Terjadi kesalahan saat memproses file.' };
  }
}

export async function deleteArticle(id: number) {
  try {
    await db.delete(articles).where(eq(articles.id, id));
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error) {
    return { error: 'Gagal menghapus artikel' };
  }
}

export async function quickPublishArticleAction(id: number) {
  try {
    const now = new Date();
    const [updated] = await db
      .update(articles)
      .set({
        status: 'published',
        publishedAt: now,
        publishAt: now,
        updatedAt: now,
      })
      .where(eq(articles.id, id))
      .returning();

    if (updated) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.adafakta.web.id';
      const articleUrl = `${siteUrl}/berita/${(updated.category || 'software').toLowerCase()}/${updated.id}/${updated.slug}`;
      notifySearchEngines(articleUrl).catch((err) => console.warn('Quick Publish Indexing Error:', err));
    }

    revalidatePath('/', 'layout');
    revalidatePath('/admin');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal mempublikasikan artikel' };
  }
}

export async function bulkPublishArticlesAction(ids: number[]) {
  try {
    if (!ids || ids.length === 0) {
      return { success: false, error: 'Tidak ada artikel yang dipilih.' };
    }

    const now = new Date();
    const updatedArticles = await db
      .update(articles)
      .set({
        status: 'published',
        publishedAt: now,
        publishAt: now,
        updatedAt: now,
      })
      .where(inArray(articles.id, ids))
      .returning({
        id: articles.id,
        slug: articles.slug,
        category: articles.category,
      });

    // Pemicu Instant Indexing ke Google & Bing untuk semua artikel yang terbit
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.adafakta.web.id';
    for (const art of updatedArticles) {
      const articleUrl = `${siteUrl}/berita/${(art.category || 'software').toLowerCase()}/${art.id}/${art.slug}`;
      notifySearchEngines(articleUrl).catch((err) => console.warn('Bulk Publish Indexing Error:', err));
    }

    revalidatePath('/', 'layout');
    revalidatePath('/admin');
    return { success: true, count: updatedArticles.length };
  } catch (error: any) {
    console.error('Bulk publish error:', error);
    return { success: false, error: error.message || 'Gagal mempublikasikan artikel secara massal' };
  }
}

export async function bulkDeleteArticlesAction(ids: number[]) {
  try {
    if (!ids || ids.length === 0) {
      return { success: false, error: 'Tidak ada artikel yang dipilih.' };
    }

    await db.delete(articles).where(inArray(articles.id, ids));

    revalidatePath('/', 'layout');
    revalidatePath('/admin');
    return { success: true, count: ids.length };
  } catch (error: any) {
    console.error('Bulk delete error:', error);
    return { success: false, error: error.message || 'Gagal menghapus artikel secara massal' };
  }
}

export async function bulkDraftArticlesAction(ids: number[]) {
  try {
    if (!ids || ids.length === 0) {
      return { success: false, error: 'Tidak ada artikel yang dipilih.' };
    }

    const now = new Date();
    const updatedArticles = await db
      .update(articles)
      .set({
        status: 'draft',
        updatedAt: now,
      })
      .where(inArray(articles.id, ids))
      .returning({ id: articles.id });

    revalidatePath('/', 'layout');
    revalidatePath('/admin');
    return { success: true, count: updatedArticles.length };
  } catch (error: any) {
    console.error('Bulk draft error:', error);
    return { success: false, error: error.message || 'Gagal mengubah status ke draf secara massal' };
  }
}

export async function updateArticle(id: number, formData: FormData) {
  try {
    const title = formData.get('title') as string;
    const slug = formData.get('slug') as string;
    const category = formData.get('category') as string;
    const author = (formData.get('author') as string || 'Redaksi').trim();
    const authorIdRaw = formData.get('authorId') as string | null;
    const authorId = authorIdRaw && !isNaN(Number(authorIdRaw)) ? Number(authorIdRaw) : null;
    const excerpt = formData.get('excerpt') as string;
    const coverUrl = formData.get('coverUrl') as string;
    const coverCaption = (formData.get('coverCaption') as string || '').trim();
    const tagsStr = (formData.get('tags') as string || '').trim();
    const publishAtStr = formData.get('publishAt') as string;
    const content = formData.get('content') as string;

    const tags = tagsStr 
      ? tagsStr.split(',').map(t => t.trim().replace(/^#/, '')).filter(t => t.length > 0)
      : [];

    // Ganti 'T' menjadi spasi dan tambahkan UTC+7 (WIB) agar tidak dianggap UTC oleh server Vercel
    const safePublishAtStr = publishAtStr ? publishAtStr.replace('T', ' ') + '+07:00' : '';
    const publishAt = safePublishAtStr ? new Date(safePublishAtStr) : null;
    
    let status = 'draft';
    let publishedAt = null;

    if (publishAt) {
      if (publishAt <= new Date()) {
        status = 'published';
        publishedAt = new Date(); // If backdated, set publishedAt to now
      } else {
        status = 'scheduled';
      }
    }

    await db.update(articles)
      .set({
        title,
        slug,
        category,
        author: author || 'Redaksi',
        authorId: authorId,
        coverCaption,
        tags,
        excerpt,
        coverUrl,
        content,
        publishAt,
        publishedAt,
        status,
        updatedAt: new Date(),
      })
      .where(eq(articles.id, id));

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.adafakta.web.id';
    const articleUrl = `${siteUrl}/berita/${(category || 'software').toLowerCase()}/${id}/${slug}`;

    if (status === 'published') {
      notifySearchEngines(articleUrl).catch((err) => console.warn('Update Article Indexing Error:', err));
    }

    // Kirim notifikasi Telegram ke Admin jika disetel (Fitur C)
    const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
    if (adminChatId) {
      const statusLabel = status === 'published' ? '🚀 Terbit' : status === 'scheduled' ? '⏳ Terjadwal' : '📝 Draf';
      const notifText = `🔔 <b>ARTIKEL DIPERBARUI DI WEB ADMIN</b>
────────────────────

📰 <b>${title}</b>

📂 <b>Kategori</b> : <code>${category}</code>
✍️ <b>Penulis</b>  : <b>${author || 'Redaksi'}</b>
📊 <b>Status</b>   : <code>${statusLabel}</code>

────────────────────
<i>Perubahan artikel berhasil disimpan ke database Neon DB.</i>`;

      sendTelegramMessage(adminChatId, notifText, {
        inlineKeyboard: [
          [
            { text: '🌐 Buka di Website', url: articleUrl },
            { text: '✏️ Buka Editor Web', url: `${siteUrl}/admin/edit/${id}` },
          ],
        ],
      }).catch((tgErr) => console.warn('Telegram update notif error:', tgErr));
    }

    revalidatePath('/', 'layout');
    revalidatePath('/admin');
    revalidatePath(`/berita/${(category || 'software').toLowerCase()}/${id}/${slug}`);
    return { success: true };
  } catch (error) {
    return { error: 'Gagal mengupdate artikel' };
  }
}

export async function createArticle(formData: FormData) {
  try {
    const title = (formData.get('title') as string || '').trim();
    let slug = (formData.get('slug') as string || '').trim();
    const category = (formData.get('category') as string || 'Software').trim();
    let excerpt = (formData.get('excerpt') as string || '').trim();
    const coverUrl = (formData.get('coverUrl') as string || '').trim();
    const coverCaption = (formData.get('coverCaption') as string || '').trim();
    const publishAtStr = (formData.get('publishAt') as string || '').trim();
    const content = (formData.get('content') as string || '').trim();
    const author = (formData.get('author') as string || 'Redaksi').trim();
    const authorIdRaw = formData.get('authorId') as string | null;
    const authorId = authorIdRaw && !isNaN(Number(authorIdRaw)) ? Number(authorIdRaw) : null;
    const tagsStr = (formData.get('tags') as string || '').trim();

    if (!title) return { error: 'Judul artikel wajib diisi.' };
    if (!content) return { error: 'Konten artikel wajib diisi.' };
    if (!coverUrl) return { error: 'Link cover gambar wajib diisi.' };

    // Format category
    const categoryAllowed = ['Software', 'Hardware', 'AI', 'Infrastruktur', 'Gadget', 'Regional'];
    const rawCategory = category.toLowerCase();
    const categoryMap: Record<string, string> = {
      'ai': 'AI',
      'software': 'Software',
      'hardware': 'Hardware',
      'infrastruktur': 'Infrastruktur',
      'gadget': 'Gadget',
      'regional': 'Regional',
    };
    const catFormatted = categoryMap[rawCategory] || 'Software';

    // Auto-generate slug jika kosong
    if (!slug) {
      slug = title
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }

    // Auto-generate excerpt jika kosong
    if (!excerpt) {
      excerpt = content
        .replace(/#+\s+/g, '')
        .replace(/[*_`\[\]()]/g, '')
        .substring(0, 160)
        .trim();
      if (excerpt.length >= 150) excerpt += '...';
    }

    // Cek apakah slug sudah ada
    const existing = await db.select({ id: articles.id }).from(articles).where(eq(articles.slug, slug)).limit(1);
    if (existing.length > 0) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    // Waktu terbit
    const safePublishAtStr = publishAtStr ? publishAtStr.replace('T', ' ') + '+07:00' : '';
    const publishAt = safePublishAtStr ? new Date(safePublishAtStr) : new Date();

    let status = 'published';
    let publishedAt: Date | null = new Date();

    if (publishAt > new Date()) {
      status = 'scheduled';
      publishedAt = null;
    }

    const tags = tagsStr 
      ? tagsStr.split(',').map(t => t.trim().replace(/^#/, '')).filter(t => t.length > 0)
      : [];

    const [newArticle] = await db.insert(articles).values({
      title,
      slug,
      category: catFormatted,
      excerpt,
      content,
      coverUrl,
      coverCaption,
      author: author || 'Redaksi',
      authorId: authorId,
      tags,
      status,
      publishAt,
      publishedAt,
    }).returning({ id: articles.id, slug: articles.slug });

    if (status === 'published') {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.adafakta.web.id';
      const articleUrl = `${siteUrl}/berita/${catFormatted.toLowerCase()}/${newArticle.id}/${newArticle.slug}`;
      notifySearchEngines(articleUrl).catch((err) => console.warn('Create Article Indexing Error:', err));
    }

    revalidatePath('/', 'layout');
    return { success: true, id: newArticle.id };
  } catch (error: any) {
    console.error('Error creating article:', error);
    return { error: error.message || 'Gagal menyimpan artikel baru.' };
  }
}

export interface InternalLinkItem {
  id: number;
  title: string;
  slug: string;
  category: string;
  url: string;
  publishedAt: string | null;
}

export async function getInternalLinkArticles(query?: string): Promise<InternalLinkItem[]> {
  try {
    let rows;
    if (query && query.trim()) {
      const q = `%${query.trim().toLowerCase()}%`;
      rows = await db
        .select({
          id: articles.id,
          title: articles.title,
          slug: articles.slug,
          category: articles.category,
          publishedAt: articles.publishedAt,
        })
        .from(articles)
        .where(like(sql`LOWER(${articles.title})`, q))
        .orderBy(desc(articles.id))
        .limit(20);
    } else {
      rows = await db
        .select({
          id: articles.id,
          title: articles.title,
          slug: articles.slug,
          category: articles.category,
          publishedAt: articles.publishedAt,
        })
        .from(articles)
        .orderBy(desc(articles.id))
        .limit(30);
    }

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      slug: r.slug,
      category: r.category,
      url: `/berita/${r.category.toLowerCase().replace(/\s+/g, '-')}/${r.id}/${r.slug}`,
      publishedAt: r.publishedAt ? new Date(r.publishedAt).toISOString() : null,
    }));
  } catch (error) {
    console.error('Failed to get internal link articles:', error);
    return [];
  }
}

