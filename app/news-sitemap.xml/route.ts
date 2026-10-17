import { NextResponse } from 'next/server';
import { connection } from 'next/server';
import { db } from '@/db';
import { articles } from '@/db/schema';
import { eq, desc, gte } from 'drizzle-orm';


function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case '\'':
        return '&apos;';
      case '"':
        return '&quot;';
      default:
        return c;
    }
  });
}

export async function GET() {
  await connection();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.adafakta.web.id';

  try {
    // Google News mengharuskan artikel yang terbit dalam 48 jam (2 hari) terakhir
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

    let recentNews = await db
      .select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        category: articles.category,
        publishedAt: articles.publishedAt,
        createdAt: articles.createdAt,
      })
      .from(articles)
      .where(
        eq(articles.status, 'published')
      )
      .orderBy(desc(articles.publishedAt))
      .limit(1000);

    // Filter artikel 48 jam terakhir
    let newsArticles = recentNews.filter((art) => {
      const pubDate = art.publishedAt ? new Date(art.publishedAt) : new Date(art.createdAt);
      return pubDate >= fortyEightHoursAgo;
    });

    // Fallback: Jika belum ada artikel dalam 48 jam terakhir (misal saat setup awal),
    // ambil maksimal 10 artikel terbaru agar Google Search Console tidak melaporkan error sitemap kosong.
    if (newsArticles.length === 0 && recentNews.length > 0) {
      newsArticles = recentNews.slice(0, 10);
    }

    const itemsXml = newsArticles
      .map((art) => {
        const articleUrl = `${siteUrl}/berita/${art.category.toLowerCase().replace(/\s+/g, '-')}/${art.id}/${art.slug}`;
        const pubDate = (art.publishedAt ? new Date(art.publishedAt) : new Date(art.createdAt)).toISOString();

        return `  <url>
    <loc>${escapeXml(articleUrl)}</loc>
    <news:news>
      <news:publication>
        <news:name>Ada Fakta</news:name>
        <news:language>id</news:language>
      </news:publication>
      <news:publication_date>${pubDate}</news:publication_date>
      <news:title>${escapeXml(art.title)}</news:title>
    </news:news>
  </url>`;
      })
      .join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${itemsXml}
</urlset>`;

    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=900, s-maxage=900, stale-while-revalidate=86400',
      },
    });
  } catch (error: any) {
    if (error?.digest?.startsWith('NEXT_')) {
      throw error;
    }
    console.error('News Sitemap XML generation error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
