'use server';

import { db } from "@/db";
import { articles } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export interface ArticleCardItem {
  id: number;
  slug: string;
  title: string;
  coverUrl: string | null;
  category: string;
  publishedAt: string | null;
}

export async function getMoreArticles(
  offset: number,
  limit: number = 20
): Promise<{ articles: ArticleCardItem[]; hasMore: boolean }> {
  try {
    // Ambil limit + 1 untuk mengetahui apakah masih ada data berikutnya
    const rows = await db
      .select({
        id: articles.id,
        slug: articles.slug,
        title: articles.title,
        coverUrl: articles.coverUrl,
        category: articles.category,
        publishedAt: articles.publishedAt,
      })
      .from(articles)
      .where(eq(articles.status, 'published'))
      .orderBy(desc(articles.publishedAt))
      .offset(offset)
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    return {
      articles: items.map((a) => ({
        id: a.id,
        slug: a.slug,
        title: a.title,
        coverUrl: a.coverUrl,
        category: a.category,
        publishedAt: a.publishedAt ? a.publishedAt.toISOString() : null,
      })),
      hasMore,
    };
  } catch (error) {
    console.error('Error fetching more articles:', error);
    return {
      articles: [],
      hasMore: false,
    };
  }
}
