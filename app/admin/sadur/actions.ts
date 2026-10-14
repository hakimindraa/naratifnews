'use server';

// Server Actions untuk Sadur Berita URL (Naratif)
import { db } from '@/db';
import { articles, aiGenerationLogs } from '@/db/schema';
import { scrapeArticleFromUrl, ScrapedSourceData } from '@/lib/url-scraper';
import { requestSadurArticleFromSource, AIProvider } from '@/lib/ai-generator';
import { findSimilarArticles, checkSourceUrlHistory, SimilarityCheckResult } from '@/lib/duplicate-detector';
import { getAISettings } from '../pengaturan/actions';
import { revalidatePath } from 'next/cache';

export interface GenerateSadurParams {
  sourceUrl: string;
  sourceTitle: string;
  sourceContent: string;
  domain: string;
  category: string;
  length: 'ringkas' | 'standar' | 'mendalam';
  provider: AIProvider;
  status: 'published' | 'draft';
}

/**
 * 1. Ambil dan pratinjau isi artikel sumber dari URL (disertai cek riwayat URL dan artikel serupa)
 */
export async function previewSourceUrlAction(targetUrl: string): Promise<{
  success: boolean;
  data?: ScrapedSourceData;
  urlHistory?: {
    isAlreadyScraped: boolean;
    matchedTitle?: string;
    matchedArticleId?: number;
    matchedDate?: Date;
  };
  similarInitial?: SimilarityCheckResult | null;
  message?: string;
}> {
  try {
    const cleanUrl = targetUrl?.trim();
    if (!cleanUrl) {
      return { success: false, message: 'Harap masukkan tautan URL berita sumber.' };
    }

    const data = await scrapeArticleFromUrl(cleanUrl);

    // Cek riwayat URL dan kemiripan judul di database (sebagai advisor)
    const [urlHistory, similarCheck] = await Promise.all([
      checkSourceUrlHistory(cleanUrl),
      findSimilarArticles(data.title, undefined, 0.6),
    ]);

    return {
      success: true,
      data,
      urlHistory,
      similarInitial: similarCheck.hasSimilar ? similarCheck : null,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Gagal membaca konten dari URL sumber.',
    };
  }
}

/**
 * 2. Eksekusi penulisan ulang (Sadur) via AI Engine dan simpan ke database
 */
export async function generateSadurArticleAction(params: GenerateSadurParams) {
  const startTime = performance.now();

  try {
    if (!params.sourceContent || params.sourceContent.trim().length < 50) {
      return { success: false, message: 'Konten sumber tidak mencukupi untuk disadur.' };
    }

    // Panggil generator penyadur AI
    const result = await requestSadurArticleFromSource({
      sourceUrl: params.sourceUrl,
      sourceTitle: params.sourceTitle,
      sourceContent: params.sourceContent,
      domain: params.domain,
      category: params.category,
      length: params.length,
      provider: params.provider,
    });

    const now = new Date();
    const isPublish = params.status === 'published';
    const publishedAt = isPublish ? now : null;

    // Simpan artikel hasil saduran ke database Neon
    const [newArticle] = await db
      .insert(articles)
      .values({
        title: result.title,
        slug: result.slug,
        excerpt: result.excerpt,
        content: result.content,
        category: result.category,
        author: 'Redaksi Naratif',
        tags: result.tags,
        coverUrl: null,
        coverCaption: result.coverCaption,
        status: params.status,
        publishedAt,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    const durationMs = Math.round(performance.now() - startTime);

    // Catat log generasi AI
    await db.insert(aiGenerationLogs).values({
      prompt: `[Sadur ${params.domain || 'URL'}] ${params.sourceTitle || params.sourceUrl}`,
      articleId: newArticle.id,
      articleTitle: newArticle.title,
      category: newArticle.category,
      status: newArticle.status,
      model: result.modelUsed || params.provider,
      durationMs,
      errorMessage: null,
      createdAt: now,
    });

    // Cek kemiripan dengan artikel terdahulu di database (Advisory Detector)
    const similarityInfo = await findSimilarArticles(result.title, result.excerpt, 0.55);

    // Revalidasi cache
    revalidatePath('/', 'layout');
    revalidatePath('/admin');
    revalidatePath('/admin/sadur');

    return {
      success: true,
      articleId: newArticle.id,
      title: newArticle.title,
      slug: newArticle.slug,
      category: newArticle.category,
      status: newArticle.status,
      durationMs,
      similarityInfo: similarityInfo.hasSimilar ? similarityInfo : null,
    };
  } catch (error: any) {
    console.error('Error saat menyadur artikel:', error);
    const durationMs = Math.round(performance.now() - startTime);

    await db.insert(aiGenerationLogs).values({
      prompt: `[Sadur Error] ${params.sourceUrl}`,
      articleId: null,
      articleTitle: null,
      category: params.category || 'AI',
      status: 'failed',
      model: params.provider,
      durationMs,
      errorMessage: error.message || 'Gagal menyadur artikel',
      createdAt: new Date(),
    });

    return {
      success: false,
      message: error.message || 'Gagal menyadur artikel.',
    };
  }
}

/**
 * 3. Ambil konfigurasi AI aktif (default provider, model 9router)
 */
export async function getSadurInitialSettings() {
  const settings = await getAISettings();
  return settings;
}
