'use server';

import { db } from '@/db';
import { authors, articles } from '@/db/schema';
import { eq, desc, sql, count, or, ilike } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export interface AuthorItem {
  id: number;
  name: string;
  role: string;
  avatarUrl: string | null;
  bio: string | null;
  articleCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Mengambil seluruh data penulis beserta jumlah artikel yang ditulis.
 * Jika tabel masih kosong, otomatis mengisi data awal (seeding).
 */
export async function getAuthorsWithStatsAction(): Promise<{
  success: boolean;
  authors: AuthorItem[];
  error?: string;
}> {
  try {
    const list = await db.select().from(authors).orderBy(desc(authors.id));

    // Jika belum ada penulis sama sekali, inisialisasi default
    if (list.length === 0) {
      const defaultAuthors = [
        {
          name: 'Indra Hakim Lesmana',
          role: 'Pemimpin Redaksi',
          bio: 'Jurnalis dan pengamat teknologi dengan fokus liputan kecerdasan buatan, komputasi awan, dan ekosistem digital Indonesia.',
          avatarUrl: 'https://i.ibb.co.com/C3gTd5P3/6a5cb57eda421-distribusi-bbm-gemini-1265-711.webp',
        },
        {
          name: 'Desk Teknologi',
          role: 'Tim Redaksi',
          bio: 'Tim liputan editorial Naratif yang mengulas gadget, inovasi hardware, software, dan perkembangan sains harian.',
          avatarUrl: null,
        },
        {
          name: 'Redaksi Naratif (AI)',
          role: 'Asisten Redaksi Cerdas',
          bio: 'Sistem kurasi dan asisten editorial kecerdasan buatan Naratif untuk pemrosesan data dan saduran berita global.',
          avatarUrl: null,
        },
      ];

      for (const da of defaultAuthors) {
        await db.insert(authors).values(da);
      }

      // Re-fetch setelah seeding
      const seeded = await db.select().from(authors).orderBy(desc(authors.id));
      return { success: true, authors: seeded };
    }

    // Ambil hitungan artikel per penulis
    const stats = await db
      .select({
        author: articles.author,
        authorId: articles.authorId,
        count: count(articles.id),
      })
      .from(articles)
      .groupBy(articles.author, articles.authorId);

    const authorsWithCount: AuthorItem[] = list.map((a) => {
      // Hitung berdasarkan authorId atau kecocokan nama
      const matched = stats.filter(
        (s) => s.authorId === a.id || s.author?.toLowerCase().trim() === a.name.toLowerCase().trim()
      );
      const totalArticles = matched.reduce((sum, item) => sum + Number(item.count || 0), 0);

      return {
        ...a,
        articleCount: totalArticles,
      };
    });

    return { success: true, authors: authorsWithCount };
  } catch (err: any) {
    console.error('[Get Authors Error]:', err);
    return { success: false, authors: [], error: err.message || 'Gagal memuat daftar penulis.' };
  }
}

/**
 * Tambah Penulis Baru
 */
export async function createAuthorAction(formData: FormData) {
  const name = (formData.get('name') as string)?.trim();
  const role = (formData.get('role') as string)?.trim() || 'Redaksi';
  const avatarUrl = (formData.get('avatarUrl') as string)?.trim() || null;
  const bio = (formData.get('bio') as string)?.trim() || null;

  if (!name) {
    return { error: 'Nama penulis wajib diisi.' };
  }

  try {
    const [inserted] = await db
      .insert(authors)
      .values({
        name,
        role,
        avatarUrl,
        bio,
      })
      .returning();

    revalidatePath('/admin/penulis');
    revalidatePath('/admin/tulis');
    return { success: true, author: inserted };
  } catch (err: any) {
    console.error('[Create Author Error]:', err);
    return { error: err.message || 'Gagal menambahkan penulis.' };
  }
}

/**
 * Perbarui Profil Penulis
 */
export async function updateAuthorAction(id: number, formData: FormData) {
  const name = (formData.get('name') as string)?.trim();
  const role = (formData.get('role') as string)?.trim() || 'Redaksi';
  const avatarUrl = (formData.get('avatarUrl') as string)?.trim() || null;
  const bio = (formData.get('bio') as string)?.trim() || null;

  if (!name) {
    return { error: 'Nama penulis wajib diisi.' };
  }

  try {
    const [oldAuthor] = await db.select().from(authors).where(eq(authors.id, id)).limit(1);
    const oldName = oldAuthor?.name;

    await db
      .update(authors)
      .set({
        name,
        role,
        avatarUrl,
        bio,
        updatedAt: new Date(),
      })
      .where(eq(authors.id, id));

    // Sinkronkan nama dan ID di seluruh artikel yang sudah terkait (baik lewat authorId maupun nama lama)
    if (oldName) {
      await db
        .update(articles)
        .set({ author: name, authorId: id })
        .where(or(
          eq(articles.authorId, id),
          eq(articles.author, oldName),
          ilike(articles.author, oldName)
        ));
    } else {
      await db
        .update(articles)
        .set({ author: name, authorId: id })
        .where(eq(articles.authorId, id));
    }

    revalidatePath('/', 'layout');
    revalidatePath('/admin');
    revalidatePath('/admin/penulis');
    revalidatePath('/admin/tulis');
    return { success: true };
  } catch (err: any) {
    console.error('[Update Author Error]:', err);
    return { error: err.message || 'Gagal memperbarui profil penulis.' };
  }
}

/**
 * Hapus Penulis
 */
export async function deleteAuthorAction(id: number) {
  try {
    await db.delete(authors).where(eq(authors.id, id));

    revalidatePath('/admin/penulis');
    revalidatePath('/admin/tulis');
    return { success: true };
  } catch (err: any) {
    console.error('[Delete Author Error]:', err);
    return { error: err.message || 'Gagal menghapus penulis.' };
  }
}
