import { db } from '@/db';
import { articles, aiGenerationLogs } from '@/db/schema';
import { desc, sql } from 'drizzle-orm';

export interface SimilarArticleMatch {
  id: number;
  title: string;
  category: string;
  slug: string;
  publishedAt: Date | null;
  createdAt: Date;
  score: number;
}

export interface SimilarityCheckResult {
  hasSimilar: boolean;
  highestScore: number;
  matchedArticle: SimilarArticleMatch | null;
  similarArticles: SimilarArticleMatch[];
  warningMessage?: string;
}

// Stopwords Bahasa Indonesia & Inggris umum untuk tokenisasi kata kunci
const STOP_WORDS = new Set([
  'dan', 'yang', 'di', 'dari', 'ke', 'untuk', 'pada', 'dengan', 'adalah', 'ini', 'itu',
  'atau', 'saat', 'akan', 'telah', 'sudah', 'bisa', 'dapat', 'oleh', 'dalam', 'serta',
  'bagi', 'para', 'juga', 'tentang', 'terkait', 'sebagai', 'lebih', 'menjadi', 'terhadap',
  'the', 'and', 'in', 'of', 'to', 'a', 'for', 'on', 'with', 'at', 'by', 'from', 'is', 'an'
]);

/**
 * Ekstraksi token kata kunci unik dari teks (lowercase, tanpa tanda baca, tanpa stopword)
 */
export function extractKeywords(text: string): Set<string> {
  const cleaned = text
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
  return new Set(cleaned);
}

/**
 * Menghitung tingkat kemiripan teks menggunakan Jaccard / Dice Similarity (0.0 s.d 1.0)
 */
export function calculateTextSimilarity(text1: string, text2: string): number {
  if (!text1 || !text2) return 0;

  const t1 = text1.trim().toLowerCase();
  const t2 = text2.trim().toLowerCase();

  // Jika sama persis
  if (t1 === t2) return 1.0;

  const words1 = extractKeywords(text1);
  const words2 = extractKeywords(text2);

  if (words1.size === 0 || words2.size === 0) return 0;

  let intersectionCount = 0;
  for (const w of words1) {
    if (words2.has(w)) {
      intersectionCount++;
    }
  }

  // Dice Coefficient: 2 * |A ∩ B| / (|A| + |B|)
  const diceScore = (2 * intersectionCount) / (words1.size + words2.size);
  return Math.min(1.0, Math.round(diceScore * 100) / 100);
}

/**
 * Mengecek apakah judul / naskah baru memiliki kemiripan dengan artikel di database
 */
export async function findSimilarArticles(
  newTitle: string,
  newExcerpt?: string,
  threshold = 0.55
): Promise<SimilarityCheckResult> {
  try {
    // Ambil 30 artikel terakhir dari database Neon
    const existing = await db
      .select({
        id: articles.id,
        title: articles.title,
        category: articles.category,
        slug: articles.slug,
        excerpt: articles.excerpt,
        publishedAt: articles.publishedAt,
        createdAt: articles.createdAt,
      })
      .from(articles)
      .orderBy(desc(articles.id))
      .limit(30);

    const matches: SimilarArticleMatch[] = [];

    for (const item of existing) {
      // 1. Hitung skor kemiripan judul
      const titleScore = calculateTextSimilarity(newTitle, item.title);

      // 2. Jika ada excerpt, hitung juga kemiripan deskripsi
      let excerptScore = 0;
      if (newExcerpt && item.excerpt) {
        excerptScore = calculateTextSimilarity(newExcerpt, item.excerpt);
      }

      // Skor gabungan berbobot (Judul 70%, Excerpt 30%)
      const combinedScore = excerptScore > 0 ? (titleScore * 0.7 + excerptScore * 0.3) : titleScore;
      const finalScore = Math.max(titleScore, Math.round(combinedScore * 100) / 100);

      if (finalScore >= threshold) {
        matches.push({
          id: item.id,
          title: item.title,
          category: item.category,
          slug: item.slug,
          publishedAt: item.publishedAt,
          createdAt: item.createdAt,
          score: finalScore,
        });
      }
    }

    // Urutkan dari skor tertinggi
    matches.sort((a, b) => b.score - a.score);

    const hasSimilar = matches.length > 0;
    const highestScore = hasSimilar ? matches[0].score : 0;
    const matchedArticle = hasSimilar ? matches[0] : null;

    let warningMessage = undefined;
    if (hasSimilar && matchedArticle) {
      const percent = Math.round(matchedArticle.score * 100);
      warningMessage = `Terdeteksi kemiripan topik ${percent}% dengan artikel terdahulu: "${matchedArticle.title}".`;
    }

    return {
      hasSimilar,
      highestScore,
      matchedArticle,
      similarArticles: matches,
      warningMessage,
    };
  } catch (error) {
    console.warn('Gagal melakukan pengecekan duplikasi:', error);
    return {
      hasSimilar: false,
      highestScore: 0,
      matchedArticle: null,
      similarArticles: [],
    };
  }
}

/**
 * Mengecek apakah URL sumber sudah pernah disadur sebelumnya di portal Naratif
 */
export async function checkSourceUrlHistory(targetUrl: string): Promise<{
  isAlreadyScraped: boolean;
  matchedTitle?: string;
  matchedArticleId?: number;
  matchedDate?: Date;
}> {
  try {
    const cleanUrl = targetUrl.trim();
    if (!cleanUrl) return { isAlreadyScraped: false };

    // 1. Cek di tabel ai_generation_logs
    const logs = await db
      .select({
        articleId: aiGenerationLogs.articleId,
        articleTitle: aiGenerationLogs.articleTitle,
        createdAt: aiGenerationLogs.createdAt,
        prompt: aiGenerationLogs.prompt,
      })
      .from(aiGenerationLogs)
      .where(sql`${aiGenerationLogs.prompt} LIKE ${'%' + cleanUrl + '%'}`)
      .orderBy(desc(aiGenerationLogs.id))
      .limit(1);

    if (logs.length > 0 && logs[0].articleTitle) {
      return {
        isAlreadyScraped: true,
        matchedTitle: logs[0].articleTitle,
        matchedArticleId: logs[0].articleId || undefined,
        matchedDate: logs[0].createdAt,
      };
    }

    return { isAlreadyScraped: false };
  } catch (err) {
    console.warn('Pengecekan riwayat URL sumber:', err);
    return { isAlreadyScraped: false };
  }
}
