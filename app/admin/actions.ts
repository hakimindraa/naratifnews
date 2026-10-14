'use server';

import matter from 'gray-matter';
import { db } from '@/db';
import { articles } from '@/db/schema';
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { encrypt } from '@/lib/auth';
import { redirect } from 'next/navigation';

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

export async function updateArticle(id: number, formData: FormData) {
  try {
    const title = formData.get('title') as string;
    const slug = formData.get('slug') as string;
    const category = formData.get('category') as string;
    const excerpt = formData.get('excerpt') as string;
    const coverUrl = formData.get('coverUrl') as string;
    const publishAtStr = formData.get('publishAt') as string;
    const content = formData.get('content') as string;

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
        excerpt,
        coverUrl,
        content,
        publishAt,
        publishedAt,
        status,
        updatedAt: new Date(),
      })
      .where(eq(articles.id, id));

    revalidatePath('/', 'layout');
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
      tags,
      status,
      publishAt,
      publishedAt,
    }).returning({ id: articles.id, slug: articles.slug });

    revalidatePath('/', 'layout');
    return { success: true, id: newArticle.id };
  } catch (error: any) {
    console.error('Error creating article:', error);
    return { error: error.message || 'Gagal menyimpan artikel baru.' };
  }
}
