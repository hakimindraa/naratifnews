import type { MetadataRoute } from 'next';
import { connection } from 'next/server';
import { db } from '@/db';
import { articles } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.adafakta.web.id';

  let articleUrls: MetadataRoute.Sitemap = [];

  try {
    const publishedArticles = await db
      .select({
        id: articles.id,
        category: articles.category,
        slug: articles.slug,
        updatedAt: articles.updatedAt,
        publishedAt: articles.publishedAt,
      })
      .from(articles)
      .where(eq(articles.status, 'published'))
      .orderBy(desc(articles.publishedAt));

    articleUrls = publishedArticles.map((article) => ({
      url: `${siteUrl}/berita/${article.category.toLowerCase()}/${article.id}/${article.slug}`,
      lastModified: article.updatedAt || article.publishedAt || new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    }));
  } catch (error: any) {
    if (error?.digest?.startsWith('NEXT_')) {
      throw error;
    }
    console.error('Error fetching articles for sitemap:', error);
  }

  const categories = ['software', 'hardware', 'ai', 'infrastruktur', 'gadget', 'regional'];
  const categoryUrls: MetadataRoute.Sitemap = categories.map((cat) => ({
    url: `${siteUrl}/berita/${cat}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.7,
  }));

  const staticPages = ['tentang', 'redaksi', 'kontak', 'privasi', 'pedoman'];
  const staticUrls: MetadataRoute.Sitemap = staticPages.map((slug) => ({
    url: `${siteUrl}/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  }));

  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: 'hourly' as const,
      priority: 1.0,
    },
    ...categoryUrls,
    ...staticUrls,
    ...articleUrls,
  ];
}
