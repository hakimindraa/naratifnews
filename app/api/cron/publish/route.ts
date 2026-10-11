import { NextResponse } from 'next/server';
import { db } from '@/db';
import { articles } from '@/db/schema';
import { lte, eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';
export const maxDuration = 20; // 20 seconds, below cron-job.org's 30s timeout

export async function GET(request: Request) {
  try {
    // 1. Verifikasi header otorisasi
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Cari semua artikel yang statusnya "scheduled" dan waktunya sudah lewat atau sama dengan sekarang
    const now = new Date();
    
    // 3. Update status menjadi "published" dan set publishedAt
    const updatedArticles = await db
      .update(articles)
      .set({ 
        status: 'published',
        publishedAt: now,
        updatedAt: now
      })
      .where(
        and(
          eq(articles.status, 'scheduled'),
          lte(articles.publishAt, now)
        )
      )
      .returning({ id: articles.id, slug: articles.slug });

    // 4. Jika ada artikel yang diterbitkan, revalidate cache
    if (updatedArticles.length > 0) {
      revalidatePath('/', 'layout'); // Revalidate seluruh situs agar data baru muncul
    }

    // 5. Kembalikan JSON kecil (syarat cron-job.org)
    return NextResponse.json({
      success: true,
      published_count: updatedArticles.length,
      timestamp: now.toISOString()
    });

  } catch (error) {
    console.error('Cron error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
