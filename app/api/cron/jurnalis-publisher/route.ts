import { NextResponse } from 'next/server';
import { db } from '@/db';
import { articles, jurnalisDrafts, aiGenerationLogs } from '@/db/schema';
import { eq, and, isNotNull, asc, lte, or, isNull, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { notifySearchEngines } from '@/lib/indexing';
import { sendTelegramMessage } from '@/lib/telegram';
import { sanitizeCoverCaption } from '@/lib/ai-generator';

export const maxDuration = 45;

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

export async function GET(request: Request) {
  try {
    // 1. Verifikasi header otorisasi Cron Secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.adafakta.web.id';
    const now = new Date();

    // 2. Ambil 1 draf 'ready_to_publish' yang sudah punya foto & naskah, dan jam tayangnya sudah tiba
    const [draftToPublish] = await db
      .select()
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

    if (!draftToPublish) {
      return NextResponse.json({
        success: true,
        message: 'Tidak ada draf jurnalis yang jatuh tempo untuk diterbitkan saat ini.',
        published: null,
        timestamp: now.toISOString(),
      });
    }

    // 3. Susun data artikel sesuai standar AdaFakta
    const title = (draftToPublish.generatedTitle || draftToPublish.title).trim();
    const content = (draftToPublish.generatedArticle || draftToPublish.summary || '').trim();
    const slug = generateSlug(title);
    const excerpt = (draftToPublish.summary || content).slice(0, 180).trim() + '...';

    // Format & validasi kategori
    const validCategories = [
      'Nasional',
      'Internasional',
      'Regional',
      'Sport',
      'AI',
      'Gadget',
      'Software',
      'Hardware',
      'Infrastruktur',
    ];
    let chosenCategory = 'Nasional';
    if (draftToPublish.category && validCategories.includes(draftToPublish.category)) {
      chosenCategory = draftToPublish.category;
    }

    const rawCover = draftToPublish.coverUrl!;
    const coverUrl = rawCover.replace(/https?:\/\/i\.ibb\.co\//g, 'https://i.ibb.co.com/');
    const coverCaption = sanitizeCoverCaption(
      draftToPublish.coverCaption,
      title,
      draftToPublish.source || 'Istimewa'
    );

    let articleTags: string[] = ['berita', 'adafaktanews', chosenCategory.toLowerCase()];
    if (Array.isArray(draftToPublish.tags) && draftToPublish.tags.length > 0) {
      articleTags = Array.from(new Set([...articleTags, ...draftToPublish.tags]));
    }

    // 4. Masukkan ke tabel articles utama (Status: published, Penulis ID 3: Redaksi 2 / penulis 2)
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

    // 5. Update status draf jurnalis menjadi 'published'
    await db
      .update(jurnalisDrafts)
      .set({ status: 'published' })
      .where(eq(jurnalisDrafts.id, draftToPublish.id));

    // 6. Hitung sisa antrean yang masih menunggu
    const [queueCountResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(jurnalisDrafts)
      .where(
        and(
          eq(jurnalisDrafts.status, 'ready_to_publish'),
          isNotNull(jurnalisDrafts.coverUrl)
        )
      );

    const remainingQueue = queueCountResult?.count || 0;

    // 7. Catat ke ai_generation_logs
    await db
      .insert(aiGenerationLogs)
      .values({
        prompt: `[Jurnalis Cron Queue] ${title}`,
        articleId: newArticle.id,
        articleTitle: newArticle.title,
        category: newArticle.category,
        status: 'published',
        model: 'jurnalis-cron-queue',
        durationMs: 100,
        errorMessage: null,
        createdAt: now,
      })
      .catch((err) => console.warn('Gagal mencatat log jurnalis cron:', err));

    // 8. Instant Indexing (Google & Bing / IndexNow)
    const articleUrl = `${siteUrl}/berita/${newArticle.category.toLowerCase()}/${newArticle.id}/${newArticle.slug}`;
    notifySearchEngines(articleUrl).catch((err) =>
      console.warn('Jurnalis Queue Indexing Error:', err)
    );

    // 9. Revalidasi Seluruh Cache Web
    revalidatePath('/', 'layout');
    revalidatePath('/admin');
    revalidatePath('/admin/jurnalis');

    // 10. Kirim Notifikasi Laporan ke Telegram Admin
    const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID?.trim();
    if (adminChatId) {
      const editUrl = `${siteUrl}/admin/edit/${newArticle.id}`;
      const tgMessage = `🤖 <b>JURNALIS AUTOPUBLISH RESMI TAYANG</b>
<i>Penerbitan Berkala dari Antrean Draf</i>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📰 <b>${newArticle.title}</b>

┌── 📋 <b>Detail Artikel</b>
│ 📂 Kategori : <b>${newArticle.category}</b>
│ 🖼️ Cover    : <a href="${coverUrl}">Lihat Foto ImgBB</a>
│ 🌐 Status   : 🚀 <code>Published (Live di Portal)</code>
│ ⏳ Sisa Antrean : <b>${remainingQueue} berita</b>
└──
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ <i>Berita tayang tepat waktu sesuai jadwal antrean Anda.</i>`;

      sendTelegramMessage(adminChatId, tgMessage, {
        inlineKeyboard: [
          [
            { text: '🌐 Baca di Portal', url: articleUrl },
            { text: '✏️ Buka Editor Web', url: editUrl },
          ],
          [
            { text: '📰 Cek Meja Jurnalis', url: `${siteUrl}/admin/jurnalis` },
          ],
        ],
      }).catch((tgErr) => console.warn('Telegram notify error:', tgErr));
    }

    return NextResponse.json({
      success: true,
      message: 'Berhasil menerbitkan 1 artikel dari antrean jurnalis.',
      published: {
        id: newArticle.id,
        title: newArticle.title,
        slug: newArticle.slug,
        category: newArticle.category,
        article_url: articleUrl,
      },
      remaining_queue: remainingQueue,
      timestamp: now.toISOString(),
    });
  } catch (error: any) {
    if (error?.digest?.startsWith('NEXT_')) {
      throw error;
    }
    console.error('Jurnalis Queue Cron Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}
