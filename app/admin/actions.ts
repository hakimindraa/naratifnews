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
    
    if (file.size > 1024 * 1024) {
      return { error: 'Ukuran file maksimal 1 MB' };
    }

    const text = await file.text();
    
    // Parse frontmatter
    const { data, content } = matter(text);
    
    // Validasi field wajib
    if (!data.title || !data.slug || !data.category || !data.cover) {
      return { error: 'Frontmatter tidak lengkap. Pastikan ada title, slug, category, dan cover.' };
    }

    if (!data.cover.startsWith('http')) {
      return { error: 'URL cover harus berupa link (misal: https://i.ibb.co/...)' };
    }

    const categoryAllowed = ['Terbaru', 'Nasional', 'Ekonomi', 'Teknologi', 'Olahraga', 'Hiburan', 'Gaya Hidup'];
    const catFormatted = data.category.charAt(0).toUpperCase() + data.category.slice(1);
    
    if (!categoryAllowed.includes(catFormatted)) {
      return { error: `Kategori '${data.category}' tidak diizinkan. Gunakan kategori yang valid.` };
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

    revalidatePath('/', 'layout');
    return { success: true, message: `Artikel '${data.title}' berhasil disimpan sebagai ${status}.` };

  } catch (error: any) {
    console.error(error);
    return { error: error.message || 'Terjadi kesalahan saat menyimpan artikel.' };
  }
}
