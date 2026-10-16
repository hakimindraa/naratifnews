'use server';

import { db } from '@/db';
import { articles, aiGenerationLogs } from '@/db/schema';
import { requestArticleFromModelRouter, fetchGoogleNewsResearch, NewsSource } from '@/lib/ai-generator';
import { findSimilarArticles, SimilarityCheckResult } from '@/lib/duplicate-detector';
import { revalidatePath } from 'next/cache';
import { desc, eq } from 'drizzle-orm';

export interface GeneratePayload {
  prompt: string;
  category: string;
  region?: string;
  coverUrl?: string;
  status: 'published' | 'draft';
  length: 'standar' | 'mendalam';
  provider?: 'gemini' | 'groq' | '9router';
  enableWebSearch?: boolean;
  prefetchedSources?: NewsSource[];
}

/**
 * Server action mandiri untuk riset berita terkini secara real-time
 * Digunakan agar UI Web Admin dapat menampilkan temuan berita sebelum AI mulai menyusun naskah
 */
export async function searchNewsResearchAction(
  query: string,
  category = 'AI',
  region?: string
): Promise<{ success: boolean; sources: NewsSource[]; error?: string }> {
  try {
    const sources = await fetchGoogleNewsResearch(query, 6, category, region);
    return { success: true, sources };
  } catch (err: any) {
    return { success: false, sources: [], error: err?.message || 'Gagal meriset berita' };
  }
}

export async function generateArticleAction(payload: GeneratePayload) {
  const startTime = performance.now();

  if (!payload.prompt || !payload.prompt.trim()) {
    return { success: false, error: 'Instruksi atau topik berita tidak boleh kosong.' };
  }

  try {
    // 1. Panggil AI Gateway (Gemini / Groq / 9Router) + Riset Google News (Gratis)
    const draft = await requestArticleFromModelRouter({
      prompt: payload.prompt,
      category: payload.category,
      region: payload.region,
      length: payload.length,
      provider: payload.provider || 'gemini',
      enableWebSearch: payload.enableWebSearch !== false,
      prefetchedSources: payload.prefetchedSources,
    });

    // 2. Simpan artikel ke database Neon DB
    const isPublished = payload.status === 'published';
    const cleanCoverUrl = payload.coverUrl?.trim() || null;

    const [newArticle] = await db
      .insert(articles)
      .values({
        title: draft.title,
        slug: draft.slug,
        excerpt: draft.excerpt,
        content: draft.content,
        category: draft.category,
        author: 'Redaksi Naratif (AI)',
        tags: draft.tags,
        coverUrl: cleanCoverUrl,
        coverCaption: draft.coverCaption,
        status: isPublished ? 'published' : 'draft',
        publishedAt: isPublished ? new Date() : null,
      })
      .returning();

    const durationMs = Math.round(performance.now() - startTime);

    // 3. Catat log riwayat eksekusi
    const [newLog] = await db
      .insert(aiGenerationLogs)
      .values({
        prompt: payload.prompt.trim(),
        articleId: newArticle.id,
        articleTitle: newArticle.title,
        category: newArticle.category,
        status: newArticle.status,
        model: draft.modelUsed || 'AI Model',
        durationMs,
        errorMessage: null,
      })
      .returning();

    // 4. Cek kemiripan dengan artikel terdahulu di database (Advisory Detector)
    const similarityInfo = await findSimilarArticles(draft.title, draft.excerpt, 0.55);

    // 5. Revalidate cache halaman
    revalidatePath('/');
    revalidatePath('/admin');
    revalidatePath('/admin/generator');

    return {
      success: true,
      article: newArticle,
      log: newLog,
      researchSources: draft.researchSources || [],
      durationMs,
      similarityInfo: similarityInfo.hasSimilar ? similarityInfo : null,
    };
  } catch (error: any) {
    const durationMs = Math.round(performance.now() - startTime);
    const errorMessage = error?.message || 'Terjadi kesalahan tidak dikenal saat memproses AI.';

    // Catat log kegagalan ke database
    try {
      await db.insert(aiGenerationLogs).values({
        prompt: payload.prompt.trim(),
        articleId: null,
        articleTitle: null,
        category: payload.category || 'AI',
        status: 'failed',
        model: process.env.MODELROUTER_MODEL || 'muse-spark-1.3-contributor',
        durationMs,
        errorMessage,
      });
    } catch (logErr) {
      console.error('Gagal mencatat log error:', logErr);
    }

    return {
      success: false,
      error: errorMessage,
      durationMs,
    };
  }
}

export async function getGenerationDataAction() {
  try {
    const rawLogs = await db
      .select({
        id: aiGenerationLogs.id,
        prompt: aiGenerationLogs.prompt,
        articleId: aiGenerationLogs.articleId,
        articleTitle: aiGenerationLogs.articleTitle,
        category: aiGenerationLogs.category,
        logStatus: aiGenerationLogs.status,
        articleStatus: articles.status,
        model: aiGenerationLogs.model,
        durationMs: aiGenerationLogs.durationMs,
        errorMessage: aiGenerationLogs.errorMessage,
        createdAt: aiGenerationLogs.createdAt,
      })
      .from(aiGenerationLogs)
      .leftJoin(articles, eq(aiGenerationLogs.articleId, articles.id))
      .orderBy(desc(aiGenerationLogs.createdAt))
      .limit(30);

    const logs = rawLogs.map((item) => ({
      id: item.id,
      prompt: item.prompt,
      articleId: item.articleId,
      articleTitle: item.articleTitle,
      category: item.category,
      // Ambil status realtime artikel (misalnya saat artikel dipublish oleh cron job)
      status: item.articleStatus || item.logStatus,
      model: item.model,
      durationMs: item.durationMs,
      errorMessage: item.errorMessage,
      createdAt: item.createdAt,
    }));

    const totalLogs = logs.length;
    const publishedCount = logs.filter((l) => l.status === 'published').length;
    const draftCount = logs.filter((l) => l.status === 'draft').length;
    const failedCount = logs.filter((l) => l.status === 'failed').length;

    const successfulLogs = logs.filter((l) => l.durationMs && l.status !== 'failed');
    const avgDuration =
      successfulLogs.length > 0
        ? `${(successfulLogs.reduce((acc, curr) => acc + (curr.durationMs || 0), 0) / successfulLogs.length / 1000).toFixed(1)}s`
        : '-';

    const successRate =
      totalLogs > 0
        ? `${Math.round(((totalLogs - failedCount) / totalLogs) * 100)}%`
        : '-';

    return {
      success: true,
      logs,
      stats: {
        totalGenerated: totalLogs,
        publishedCount,
        draftCount,
        avgDuration,
        successRate,
      },
    };
  } catch (error: any) {
    console.error('Error fetching logs:', error);
    return {
      success: false,
      logs: [],
      stats: {
        totalGenerated: 0,
        publishedCount: 0,
        draftCount: 0,
        avgDuration: '-',
        successRate: '-',
      },
    };
  }
}

export async function deleteGenerationLogAction(logId: number) {
  try {
    await db.delete(aiGenerationLogs).where(eq(aiGenerationLogs.id, logId));
    revalidatePath('/admin/generator');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function clearFailedLogsAction() {
  try {
    await db.delete(aiGenerationLogs).where(eq(aiGenerationLogs.status, 'failed'));
    revalidatePath('/admin/generator');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

