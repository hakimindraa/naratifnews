'use server';

import { db, sql } from '@/db';
import { articles, jurnalisDrafts } from '@/db/schema';
import { eq, desc, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

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
    }

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
        coverUrl: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=1200&auto=format&fit=crop&q=80',
        coverCaption: `Ilustrasi liputan berita: ${title}`,
        status: 'draft',
        tags: ['berita', 'intelijen-jurnalis', chosenCategory.toLowerCase()],
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
