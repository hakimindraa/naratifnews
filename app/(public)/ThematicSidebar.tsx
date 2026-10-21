import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';
import { ChevronRight, Globe, Trophy, Flag } from 'lucide-react';

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
  icon: React.ReactNode;
  categorySlug: string;
  categoryName: string;
  badgeColor: string;
  accentBorder: string;
  articles: ThematicArticleItem[];
}

function ThematicBlock({
  title,
  icon,
  categorySlug,
  categoryName,
  badgeColor,
  accentBorder,
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
    <div className="bg-white rounded-xl border border-gray-200/80 p-4 sm:p-5 shadow-2xs">
      {/* Header Blok */}
      <div className={`flex items-center justify-between pb-3 mb-3.5 border-b ${accentBorder}`}>
        <div className="flex items-center gap-2">
          {icon}
          <h4 className="text-sm font-bold font-heading text-gray-900 tracking-wide">
            {title}
          </h4>
        </div>
        <Link
          href={`/berita/${categorySlug}`}
          className="inline-flex items-center text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors group"
        >
          <span>Lihat Semua</span>
          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {articles.length === 0 ? (
        <div className="py-6 px-4 text-center rounded-lg bg-gray-50/70 border border-dashed border-gray-200 text-xs text-gray-400">
          <p>Belum ada berita {categoryName.toLowerCase()} yang diterbitkan.</p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {/* Kartu Utama dengan Cover */}
          {firstArticle && (
            <Link
              href={`/berita/${firstArticle.category.toLowerCase()}/${firstArticle.id}/${firstArticle.slug}`}
              className="group block bg-gray-50/50 rounded-lg overflow-hidden border border-gray-100 shadow-2xs hover:shadow-xs transition-all"
            >
              <div className="aspect-video w-full overflow-hidden bg-gray-100 relative">
                <img
                  src={firstArticle.coverUrl || ''}
                  alt={firstArticle.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <span
                  className={`absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shadow-xs ${badgeColor}`}
                >
                  {firstArticle.category}
                </span>
              </div>
              <div className="p-3">
                <h5 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-2 text-xs sm:text-sm leading-snug">
                  {firstArticle.title}
                </h5>
                <span className="text-[10px] text-gray-400 mt-1.5 block font-medium">
                  {getTimeAgo(firstArticle.publishedAt)}
                </span>
              </div>
            </Link>
          )}

          {/* List Ringkas Berita Berikutnya */}
          {remainingArticles.length > 0 && (
            <div className="divide-y divide-gray-100 pt-1">
              {remainingArticles.map((art) => (
                <Link
                  key={art.id}
                  href={`/berita/${art.category.toLowerCase()}/${art.id}/${art.slug}`}
                  className="py-2.5 first:pt-0 last:pb-0 group flex items-start gap-2.5 block"
                >
                  <span className="text-gray-300 font-bold text-xs mt-0.5 select-none">•</span>
                  <div className="min-w-0 flex-1">
                    <h5 className="font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors line-clamp-2 text-xs leading-snug">
                      {art.title}
                    </h5>
                    <span className="text-[10px] text-gray-400 block mt-1 font-medium">
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
        icon={<Flag className="w-4 h-4 text-red-600" />}
        categorySlug="nasional"
        categoryName="Nasional"
        badgeColor="bg-red-600 text-white"
        accentBorder="border-red-100"
        articles={nasionalArticles}
      />

      {/* 2. Blok Internasional */}
      <ThematicBlock
        title="Jendela Internasional"
        icon={<Globe className="w-4 h-4 text-sky-600" />}
        categorySlug="internasional"
        categoryName="Internasional"
        badgeColor="bg-sky-600 text-white"
        accentBorder="border-sky-100"
        articles={internasionalArticles}
      />

      {/* 3. Blok Olahraga / Sport */}
      <ThematicBlock
        title="Arena Sport"
        icon={<Trophy className="w-4 h-4 text-amber-600" />}
        categorySlug="sport"
        categoryName="Sport"
        badgeColor="bg-amber-600 text-white"
        accentBorder="border-amber-100"
        articles={sportArticles}
      />
    </aside>
  );
}
