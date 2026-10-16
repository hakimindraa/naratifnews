import { NextResponse } from 'next/server';
import { connection } from 'next/server';
import { db } from '@/db';
import { articles } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

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
    const recentArticles = await db
      .select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        excerpt: articles.excerpt,
        content: articles.content,
        category: articles.category,
        author: articles.author,
        coverUrl: articles.coverUrl,
        publishedAt: articles.publishedAt,
        createdAt: articles.createdAt,
      })
      .from(articles)
      .where(eq(articles.status, 'published'))
      .orderBy(desc(articles.publishedAt))
      .limit(30);

    const itemsXml = recentArticles
      .map((art) => {
        const articleUrl = `${siteUrl}/berita/${art.category.toLowerCase()}/${art.id}/${art.slug}`;
        const pubDate = art.publishedAt
          ? new Date(art.publishedAt).toUTCString()
          : new Date(art.createdAt).toUTCString();

        const description =
          art.excerpt ||
          art.content.replace(/[#*`_\[\]()]/g, ' ').replace(/\s+/g, ' ').substring(0, 200).trim() + '...';

        return `
    <item>
      <title>${escapeXml(art.title)}</title>
      <link>${articleUrl}</link>
      <guid isPermaLink="true">${articleUrl}</guid>
      <description>${escapeXml(description)}</description>
      <category>${escapeXml(art.category)}</category>
      <author>${escapeXml(art.author || 'Redaksi Ada Fakta')}</author>
      <pubDate>${pubDate}</pubDate>
      ${
        art.coverUrl
          ? `<enclosure url="${escapeXml(art.coverUrl)}" length="0" type="image/jpeg" />`
          : ''
      }
    </item>`;
      })
      .join('\n');

    const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Ada Fakta</title>
    <link>${siteUrl}</link>
    <description>Portal berita dan informasi seputar perkembangan teknologi, sains, isu regional, dan peristiwa terkini.</description>
    <language>id-ID</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml"/>
    ${itemsXml}
  </channel>
</rss>`;

    return new NextResponse(rssXml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=1800, s-maxage=1800, stale-while-revalidate=86400',
      },
    });
  } catch (error: any) {
    console.error('RSS XML generation error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
