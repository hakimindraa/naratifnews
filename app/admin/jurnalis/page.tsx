import { db } from '@/db';
import { jurnalisDrafts } from '@/db/schema';
import { desc } from 'drizzle-orm';
import JurnalisClientView, { JurnalisDraftItem } from './JurnalisClientView';

export const instant = false;

export default async function AdminJurnalisPage() {
  const drafts = await db
    .select()
    .from(jurnalisDrafts)
    .orderBy(desc(jurnalisDrafts.createdAt))
    .limit(100);

  const formattedDrafts: JurnalisDraftItem[] = drafts.map((d) => ({
    id: d.id,
    title: d.title,
    source: d.source,
    original_url: d.originalUrl,
    published_at: d.publishedAt ? d.publishedAt.toISOString() : null,
    summary: d.summary || '',
    status: d.status,
    generated_title: d.generatedTitle,
    generated_article: d.generatedArticle,
    category: d.category,
    tags: d.tags || [],
    cover_url: d.coverUrl,
    cover_caption: d.coverCaption,
    publish_at: d.publishAt ? d.publishAt.toISOString() : null,
    created_at: d.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-4 sm:space-y-6">
      <JurnalisClientView initialDrafts={formattedDrafts} />
    </div>
  );
}
