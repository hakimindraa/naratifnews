import { db } from '@/db';
import { jurnalisDrafts } from '@/db/schema';
import { desc } from 'drizzle-orm';
import JurnalisClientView, { JurnalisDraftItem } from './JurnalisClientView';

export const dynamic = 'force-dynamic';

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
    created_at: d.createdAt.toISOString(),
  }));

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <JurnalisClientView initialDrafts={formattedDrafts} />
    </div>
  );
}
