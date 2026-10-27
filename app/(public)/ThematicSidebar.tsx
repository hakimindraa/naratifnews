import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';

export interface ThematicArticleItem {
  id: number;
  slug: string;
  title: string;
  coverUrl: string | null;
  category: string;
  publishedAt: string | null;
}

interface ThematicSidebarProps {
  nasionalArticles: ThematicArticleItem[];
  internasionalArticles: ThematicArticleItem[];
  sportArticles: ThematicArticleItem[];
}

interface ThematicBlockProps {
  title: string;
  categorySlug: string;
  categoryName: string;
  articles: ThematicArticleItem[];
}

function ThematicBlock({
  title,
  categorySlug,
  categoryName,
  articles,
}: ThematicBlockProps) {
  const getTimeAgo = (dateStr: string | null) => {
    if (!dateStr) return '';
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: id });
    } catch {
      return '';
    }
  };

  const firstArticle = articles.length > 0 ? articles[0] : null;
  const remainingArticles = articles.slice(1, 4);

  return (
    <div className="bg-white border border-gray-200 p-4 sm:p-5">
      {/* Header Blok ala CNN */}
      <div className="flex items-center justify-between pb-2 mb-3.5 border-b-2 border-black">
        <h4 className="text-sm font-bold font-heading text-gray-900 uppercase tracking-wider">
          {title}
        </h4>
        <Link
          href={`/berita/${categorySlug}`}
          className="inline-flex items-center text-xs font-semibold text-gray-600 hover:text-black transition-colors group font-heading"
        >
          <span>Lihat Semua</span>
        </Link>
      </div>

      {articles.length === 0 ? (
        <div className="py-6 px-4 text-center bg-gray-50 border border-dashed border-gray-200 text-xs text-gray-400">
          <p>Belum ada berita {categoryName.toLowerCase()} yang diterbitkan.</p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {/* Kartu Utama dengan Cover */}
          {firstArticle && (
            <Link
              href={`/berita/${firstArticle.category.toLowerCase()}/${firstArticle.id}/${firstArticle.slug}`}
              className="group block overflow-hidden border-b border-gray-200 pb-3"
            >
              <div className="aspect-video w-full overflow-hidden bg-gray-100 mb-2.5">
                <img
                  src={firstArticle.coverUrl || ''}
                  alt={firstArticle.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 block mb-1">
                  {firstArticle.category}
                </span>
                <h5 className="font-heading font-semibold text-gray-900 group-hover:text-red-600 transition-colors line-clamp-2 text-xs sm:text-sm leading-snug">
                  {firstArticle.title}
                </h5>
                <span className="text-[10px] text-gray-400 mt-1.5 block font-normal">
                  {getTimeAgo(firstArticle.publishedAt)}
                </span>
              </div>
            </Link>
          )}

          {/* List Ringkas Berita Berikutnya */}
          {remainingArticles.length > 0 && (
            <div className="divide-y divide-gray-200 pt-1">
              {remainingArticles.map((art) => (
                <Link
                  key={art.id}
                  href={`/berita/${art.category.toLowerCase()}/${art.id}/${art.slug}`}
                  className="py-2.5 first:pt-0 last:pb-0 group flex items-start gap-2 block"
                >
                  <span className="text-gray-400 font-bold text-xs mt-0.5 select-none">•</span>
                  <div className="min-w-0 flex-1">
                    <h5 className="font-heading font-medium sm:font-semibold text-gray-900 group-hover:text-red-600 transition-colors line-clamp-2 text-xs leading-snug">
                      {art.title}
                    </h5>
                    <span className="text-[10px] text-gray-400 block mt-1 font-normal">
                      {getTimeAgo(art.publishedAt)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ThematicSidebar({
  nasionalArticles,
  internasionalArticles,
  sportArticles,
}: ThematicSidebarProps) {
  return (
    <aside className="space-y-6">
      {/* 1. Blok Nasional */}
      <ThematicBlock
        title="Kabar Nasional"
        categorySlug="nasional"
        categoryName="Nasional"
        articles={nasionalArticles}
      />

      {/* 2. Blok Internasional */}
      <ThematicBlock
        title="Jendela Internasional"
        categorySlug="internasional"
        categoryName="Internasional"
        articles={internasionalArticles}
      />

      {/* 3. Blok Olahraga / Sport */}
      <ThematicBlock
        title="Arena Sport"
        categorySlug="sport"
        categoryName="Sport"
        articles={sportArticles}
      />
    </aside>
  );
}
