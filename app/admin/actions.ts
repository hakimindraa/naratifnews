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

        const categoryAllowed = ['Software', 'Hardware', 'AI', 'Infrastruktur', 'Gadget'];
        const catFormatted = data.category.charAt(0).toUpperCase() + data.category.slice(1);
        
        if (!categoryAllowed.includes(catFormatted)) {
          errors.push(`Gagal: Kategori '${data.category}' pada '${data.title}' tidak valid.`);
          continue;
        }

        // Tentukan status dan waktu terbit
        let status = 'draft';
        let publishAt = null;
        let publishedAt = null;

        if (data.publish_at) {
          publishAt = new Date(data.publish_at);
          if (publishAt <= new Date()) {
            status = 'published';
            publishedAt = new Date(); // terbit sekarang
          } else {
            status = 'scheduled';
          }
        }

        // Cek apakah slug sudah ada (untuk update/overwrite)
        const existing = await db.select({ id: articles.id }).from(articles).where(eq(articles.slug, data.slug)).limit(1);

        if (existing.length > 0) {
          // Update
          await db.update(articles).set({
            title: data.title,
            excerpt: data.excerpt || '',
            content: content,
            coverUrl: data.cover,
            coverCaption: data.cover_caption || '',
            category: catFormatted,
            author: data.author || 'Redaksi',
            tags: data.tags || [],
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
            excerpt: data.excerpt || '',
            content: content,
            coverUrl: data.cover,
            coverCaption: data.cover_caption || '',
            category: catFormatted,
            author: data.author || 'Redaksi',
            tags: data.tags || [],
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

    // Ganti 'T' menjadi spasi agar node.js selalu mem-parsingnya sebagai Waktu Lokal, bukan UTC.
    const safePublishAtStr = publishAtStr ? publishAtStr.replace('T', ' ') : '';
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
