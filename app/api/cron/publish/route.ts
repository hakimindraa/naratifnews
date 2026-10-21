import { NextResponse } from 'next/server';
import { db } from '@/db';
import { articles, aiGenerationLogs, jurnalisDrafts } from '@/db/schema';
import { lte, eq, and, isNotNull, or, isNull, asc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { notifySearchEngines } from '@/lib/indexing';
import { instantPublishDraftAction } from '@/app/admin/jurnalis/actions';

export const maxDuration = 20; // 20 seconds, below cron-job.org's 30s timeout

export async function GET(request: Request) {
  try {
    // 1. Verifikasi header otorisasi
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.adafakta.web.id';

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
      .returning({ id: articles.id, slug: articles.slug, title: articles.title, category: articles.category });

    // 4. Jika ada artikel yang diterbitkan, revalidate cache & catat log
    if (updatedArticles.length > 0) {
      await db.insert(aiGenerationLogs).values({
        prompt: `[Publish Scheduled] ${updatedArticles.length} artikel diterbitkan otomatis`,
        articleId: updatedArticles[0]?.id || null,
        articleTitle: `${updatedArticles.length} artikel terjadwal terbit`,
        category: 'Scheduler',
        status: 'published',
        model: 'system-scheduler',
        durationMs: 50,
        createdAt: now,
      }).catch((err) => console.warn('Gagal catat log cron publish:', err));

      // Instant Indexing: Kirim URL artikel yang baru terbit ke Google & Bing (IndexNow)
      const publishedUrls = updatedArticles.map(
        (art) => `${siteUrl}/berita/${(art.category || 'ai').toLowerCase()}/${art.id}/${art.slug}`
      );
      notifySearchEngines(publishedUrls).catch((err) =>
        console.warn('Publish Cron Indexing Notification Error:', err)
      );

      revalidatePath('/', 'layout'); // Revalidate seluruh situs agar data baru muncul
    }

    // 5. Cek apakah ada draf Jurnalis AI yang jatuh tempo (publish_at <= now)
    let jurnalisPublishedCount = 0;
    try {
      const [dueJurnalis] = await db
        .select({ id: jurnalisDrafts.id })
        .from(jurnalisDrafts)
        .where(
          and(
            eq(jurnalisDrafts.status, 'ready_to_publish'),
            isNotNull(jurnalisDrafts.coverUrl),
            isNotNull(jurnalisDrafts.generatedArticle),
            or(
              isNull(jurnalisDrafts.publishAt),
              lte(jurnalisDrafts.publishAt, now)
            )
          )
        )
        .orderBy(asc(jurnalisDrafts.publishAt), asc(jurnalisDrafts.createdAt))
        .limit(1);

      if (dueJurnalis) {
        const pubRes = await instantPublishDraftAction(dueJurnalis.id);
        if (pubRes.success) {
          jurnalisPublishedCount = 1;
        }
      }
    } catch (jErr) {
      console.warn('Gagal menerbitkan antrean draf jurnalis di cron publish:', jErr);
    }

    // 6. Kembalikan JSON kecil (syarat cron-job.org)
    return NextResponse.json({
      success: true,
      published_count: updatedArticles.length + jurnalisPublishedCount,
      articles_published: updatedArticles.length,
      jurnalis_published: jurnalisPublishedCount,
      timestamp: now.toISOString()
    });

  } catch (error: any) {
    if (error?.digest?.startsWith('NEXT_')) {
      throw error;
    }
    console.error('Cron error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
