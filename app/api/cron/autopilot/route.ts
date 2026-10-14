import { NextResponse } from 'next/server';
import { db } from '@/db';
import { articles, aiGenerationLogs, systemSettings } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { fetchGoogleNewsResearch, requestArticleFromModelRouter, AIProvider } from '@/lib/ai-generator';
import { sendTelegramMessage } from '@/lib/telegram';
import { revalidatePath } from 'next/cache';

export const maxDuration = 60; // Timeout 60 detik untuk operasi AI & riset berita

export async function GET(request: Request) {
  try {
    // 1. Verifikasi header otorisasi
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.naratif.web.id';

    // 2. Baca konfigurasi Autopilot dari tabel system_settings
    const settingsRows = await db.select().from(systemSettings);
    const settingsMap = new Map<string, string>();
    for (const row of settingsRows) {
      settingsMap.set(row.key, row.value);
    }

    const isManual = request.headers.get('x-manual-trigger') === 'true';
    const isEnabled = settingsMap.get('autopilot_enabled') === 'true';
    if (!isEnabled && !isManual) {
      return NextResponse.json({
        success: true,
        message: 'Mode Autopilot sedang NONAKTIF di Pengaturan Web.',
        timestamp: new Date().toISOString(),
      });
    }

    const provider = (settingsMap.get('autopilot_provider') as AIProvider) || 'groq';
    const publishMode = settingsMap.get('autopilot_status') || 'published';
    const isPublish = publishMode === 'published';
    const articleLength = (settingsMap.get('autopilot_length') as 'ringkas' | 'standar' | 'mendalam') || 'standar';
    const telegramNotify = settingsMap.get('autopilot_telegram_notify') !== 'false';

    let rawCategories: string[] = ['AI', 'Software', 'Hardware', 'Gadget', 'Infrastruktur', 'Regional'];
    try {
      const parsedCat = JSON.parse(settingsMap.get('autopilot_categories') || '[]');
      if (Array.isArray(parsedCat) && parsedCat.length > 0) {
        rawCategories = parsedCat;
      }
    } catch {
      // gunakan default
    }

    // 3. Rotasi Kategori (Bergantian tiap jadwal agar topik variatif)
    const lastCategoryIdx = parseInt(settingsMap.get('autopilot_last_category_idx') || '0', 10);
    const currentCategoryIdx = (lastCategoryIdx + 1) % rawCategories.length;
    const selectedCategory = rawCategories[currentCategoryIdx] || 'AI';

    // Simpan indeks rotasi berikutnya
    await db
      .insert(systemSettings)
      .values({ key: 'autopilot_last_category_idx', value: String(currentCategoryIdx), updatedAt: new Date() })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: { value: String(currentCategoryIdx), updatedAt: new Date() },
      });

    // 4. Riset Berita Terhangat Hari Ini via Google News
    const newsSources = await fetchGoogleNewsResearch(selectedCategory, 5, selectedCategory);

    // 5. Pengecekan Anti-Duplikasi: Hindari menulis berita yang sama dengan 10 artikel terakhir
    const recentArticles = await db
      .select({ title: articles.title, slug: articles.slug })
      .from(articles)
      .orderBy(desc(articles.id))
      .limit(10);

    const recentTitlesLower = recentArticles.map((a) => a.title.toLowerCase());

    let chosenNewsItem = newsSources.find((item) => {
      const cleanNewsTitle = item.title.toLowerCase();
      // Pastikan belum pernah ditulis sebelumnya
      return !recentTitlesLower.some((recent) => recent.includes(cleanNewsTitle.slice(0, 30)));
    });

    if (!chosenNewsItem && newsSources.length > 0) {
      chosenNewsItem = newsSources[0];
    }

    const topicPrompt = chosenNewsItem
      ? `Liput dan analisis perkembangan berita terkini: "${chosenNewsItem.title}". Berikan analisis mendalam mengenai latar belakang, dampak bagi ekosistem industri teknologi, serta relevansinya bagi Indonesia dan dunia.`
      : `Bahas tren teknologi terkini dan kemajuan inovasi di bidang ${selectedCategory} serta pengaruhnya terhadap perkembangan industri digital saat ini.`;

    // 6. Racik Naskah Berita menggunakan AI Engine
    const startTime = performance.now();
    const draftArticle = await requestArticleFromModelRouter({
      prompt: topicPrompt,
      category: selectedCategory,
      length: articleLength,
      provider: provider,
      enableWebSearch: true,
    });

    const now = new Date();
    const status = isPublish ? 'published' : 'draft';
    const publishedAt = isPublish ? now : null;

    // 7. Simpan Artikel Baru ke Database Neon
    const [newArticle] = await db
      .insert(articles)
      .values({
        title: draftArticle.title,
        slug: draftArticle.slug,
        excerpt: draftArticle.excerpt,
        content: draftArticle.content,
        category: draftArticle.category,
        author: 'Redaksi Naratif (Autopilot AI)',
        tags: draftArticle.tags,
        coverUrl: null,
        coverCaption: draftArticle.coverCaption,
        status,
        publishedAt,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    const durationMs = Math.round(performance.now() - startTime);

    // 8. Catat Log ke ai_generation_logs
    await db.insert(aiGenerationLogs).values({
      prompt: `[Autopilot] ${draftArticle.title}`,
      articleId: newArticle.id,
      articleTitle: newArticle.title,
      category: newArticle.category,
      status: newArticle.status,
      model: draftArticle.modelUsed || provider,
      durationMs,
      errorMessage: null,
      createdAt: now,
    });

    // 9. Revalidasi Cache Halaman Web Naratif
    revalidatePath('/', 'layout');

    // 10. Kirim Notifikasi Laporan ke Bot Telegram Pemilik Web
    const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID?.trim();
    if (telegramNotify && adminChatId) {
      const articleUrl = `${siteUrl}/berita-teknologi/${newArticle.category.toLowerCase()}/${newArticle.id}/${newArticle.slug}`;
      const editUrl = `${siteUrl}/admin/edit/${newArticle.id}`;
      const statusText = isPublish ? '🚀 <b>Langsung Terbit (Published)</b>' : '📝 <b>Disimpan ke Draf (Draft)</b>';

      const reportMessage = `🤖 <b>LAPORAN AUTOPILOT REDAKSI</b>
━━━━━━━━━━━━━━━━━━━━
📰 <b>${newArticle.title}</b>
📂 Kategori: <b>${newArticle.category}</b>
⏱️ Waktu Pembuatan: <b>${(durationMs / 1000).toFixed(1)}s</b> (via <i>${draftArticle.modelUsed || provider}</i>)
🌐 Status: ${statusText}
━━━━━━━━━━━━━━━━━━━━
${
  isPublish
    ? '✅ Artikel telah otomatis tayang di portal naratif.web.id.'
    : '📝 Artikel siap ditinjau di Dasbor Redaksi sebelum diterbitkan.'
}`;

      await sendTelegramMessage(adminChatId, reportMessage, {
        inlineKeyboard: [
          [
            { text: '🌐 Baca di Web', url: articleUrl },
            { text: '✏️ Buka di Admin', url: editUrl },
          ],
        ],
      }).catch((err) => console.warn('Telegram notify error:', err));
    }

    return NextResponse.json({
      success: true,
      message: 'Artikel Autopilot berhasil dibuat dan diproses!',
      article_id: newArticle.id,
      title: newArticle.title,
      category: newArticle.category,
      status: newArticle.status,
      duration_ms: durationMs,
      timestamp: now.toISOString(),
    });
  } catch (error: any) {
    if (error?.digest?.startsWith('NEXT_')) {
      throw error;
    }
    console.error('Autopilot Cron Error:', error);

    // Kirim peringatan error ke Telegram jika gagal
    const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID?.trim();
    if (adminChatId) {
      await sendTelegramMessage(
        adminChatId,
        `⚠️ <b>Peringatan Autopilot Redaksi</b>\n\nTerjadi kendala saat meriset/membuat berita otomatis hari ini:\n<code>${
          error?.message || 'Error tidak dikenal'
        }</code>`
      ).catch(() => {});
    }

    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
