'use client';

import { useState, Fragment } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';
import { Loader2, ChevronDown, Flag, Globe, Trophy } from 'lucide-react';
import { ArticleCardItem, getMoreArticles } from './actions';

interface ThematicItem {
  id: number;
  slug: string;
  title: string;
  coverUrl: string | null;
  category: string;
  publishedAt: string | null;
}

interface LatestNewsSectionProps {
  initialArticles: ArticleCardItem[];
  initialHasMore: boolean;
  initialOffset: number;
  thematicData?: {
    nasional: ThematicItem[];
    internasional: ThematicItem[];
    sport: ThematicItem[];
  };
}

function MobileThematicStrip({
  title,
  icon,
  categorySlug,
  badgeColor,
  articles,
}: {
  title: string;
  icon: React.ReactNode;
  categorySlug: string;
  badgeColor: string;
  articles: ThematicItem[];
}) {
  const getTimeAgo = (dateStr: string | null) => {
    if (!dateStr) return '';
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: id });
    } catch {
      return '';
    }
  };

  if (!articles || articles.length === 0) return null;

  return (
    <div className="col-span-2 my-2 py-3 px-3 sm:px-4 rounded-2xl bg-gray-50/80 border border-gray-200/90 block lg:hidden shadow-2xs">
      {/* Header Selingan Tematik */}
      <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-gray-200/70">
        <div className="flex items-center gap-1.5">
          {icon}
          <h4 className="text-xs sm:text-sm font-bold font-heading text-gray-900 uppercase tracking-wider">
            {title}
          </h4>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400 font-medium">Geser ➔</span>
          <Link
            href={`/berita/${categorySlug}`}
            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            Semua
          </Link>
        </div>
      </div>

      {/* Reel Geser Horizontal (Swipeable Snap Scroll) */}
      <div className="flex overflow-x-auto gap-3 pb-1 scrollbar-hide snap-x snap-mandatory -mx-3 px-3 sm:mx-0 sm:px-0">
        {articles.map((art) => (
          <Link
            key={art.id}
            href={`/berita/${art.category.toLowerCase()}/${art.id}/${art.slug}`}
            className="w-[230px] shrink-0 snap-start bg-white rounded-xl border border-gray-200/80 overflow-hidden shadow-2xs hover:shadow-xs flex flex-col justify-between"
          >
            <div className="aspect-video w-full overflow-hidden bg-gray-100 relative">
              <img
                src={art.coverUrl || ''}
                alt={art.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <span
                className={`absolute top-2 left-2 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shadow-xs ${badgeColor}`}
              >
                {art.category}
              </span>
            </div>
            <div className="p-2.5 flex flex-col justify-between flex-1">
              <h5 className="font-bold text-gray-900 line-clamp-2 text-xs leading-snug">
                {art.title}
              </h5>
              <span className="text-[10px] text-gray-400 mt-2 block font-medium">
                {getTimeAgo(art.publishedAt)}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function LatestNewsSection({
  initialArticles,
  initialHasMore,
  initialOffset,
  thematicData,
}: LatestNewsSectionProps) {
  const [articlesList, setArticlesList] = useState<ArticleCardItem[]>(initialArticles);
  const [hasMore, setHasMore] = useState<boolean>(initialHasMore);
  const [offset, setOffset] = useState<number>(initialOffset);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleLoadMore = async () => {
    if (isLoading || !hasMore) return;
    setIsLoading(true);

    try {
      const result = await getMoreArticles(offset, 20);
      if (result.articles.length > 0) {
        setArticlesList((prev) => [...prev, ...result.articles]);
        setOffset((prev) => prev + result.articles.length);
      }
      setHasMore(result.hasMore);
    } catch (err) {
      console.error('Gagal memuat berita tambahan:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getTimeAgo = (dateStr: string | null) => {
    if (!dateStr) return '';
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: id });
    } catch {
      return '';
    }
  };

  if (articlesList.length === 0) {
    return null;
  }

  return (
    <div>
      {/* Section Header */}
      <div className="flex items-center mb-6">
        <h3 className="text-xl sm:text-2xl font-bold font-heading text-gray-900">Berita Terbaru</h3>
        <div className="ml-4 flex-grow h-px bg-gray-200"></div>
      </div>

      {/* Articles Grid (2 Kolom di Mobile & 2 Kolom di Desktop 8-Col) */}
      <div className="grid grid-cols-2 gap-3 sm:gap-x-6 sm:gap-y-8">
        {articlesList.map((article, idx) => (
          <Fragment key={article.id}>
            <div className="group cursor-pointer flex flex-col justify-between">
              <Link
                href={`/berita/${article.category.toLowerCase()}/${article.id}/${article.slug}`}
                className="flex flex-col gap-1.5 sm:gap-0 sm:h-full items-start"
              >
                {/* Thumbnail Image */}
                <div className="relative w-full aspect-[4/3] sm:h-48 sm:aspect-auto bg-gray-100 overflow-hidden rounded-sm mb-1.5 sm:mb-4 shadow-2xs shrink-0">
                  <img
                    src={article.coverUrl || ''}
                    alt={article.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>

                {/* Text Content */}
                <div className="flex flex-col w-full justify-start">
                  <div className="text-gray-900 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1 sm:mb-2">
                    {article.category}
                  </div>
                  <h4 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-2 sm:line-clamp-3 mb-1 sm:mb-3 text-xs sm:text-base lg:text-lg leading-snug sm:flex-grow">
                    {article.title}
                  </h4>
                  <div
                    suppressHydrationWarning
                    className="text-[10px] sm:text-xs text-gray-500 font-medium sm:mt-auto"
                  >
                    {getTimeAgo(article.publishedAt)}
                  </div>
                </div>
              </Link>
            </div>

            {/* Selingan 1 Mobile: Kabar Nasional (setelah artikel ke-4 / index 3) */}
            {idx === 3 && thematicData?.nasional && thematicData.nasional.length > 0 && (
              <MobileThematicStrip
                title="Kabar Nasional"
                icon={<Flag className="w-3.5 h-3.5 text-red-600" />}
                categorySlug="nasional"
                badgeColor="bg-red-600 text-white"
                articles={thematicData.nasional}
              />
            )}

            {/* Selingan 2 Mobile: Jendela Internasional (setelah artikel ke-8 / index 7) */}
            {idx === 7 && thematicData?.internasional && thematicData.internasional.length > 0 && (
              <MobileThematicStrip
                title="Jendela Internasional"
                icon={<Globe className="w-3.5 h-3.5 text-sky-600" />}
                categorySlug="internasional"
                badgeColor="bg-sky-600 text-white"
                articles={thematicData.internasional}
              />
            )}

            {/* Selingan 3 Mobile: Arena Sport (setelah artikel ke-12 / index 11) */}
            {idx === 11 && thematicData?.sport && thematicData.sport.length > 0 && (
              <MobileThematicStrip
                title="Arena Sport"
                icon={<Trophy className="w-3.5 h-3.5 text-amber-600" />}
                categorySlug="sport"
                badgeColor="bg-amber-600 text-white"
                articles={thematicData.sport}
              />
            )}
          </Fragment>
        ))}
      </div>

      {/* Load More Button & Status */}
      <div className="mt-12 text-center">
        {hasMore ? (
          <button
            onClick={handleLoadMore}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 px-7 py-3 bg-white border border-gray-300 hover:border-gray-900 text-gray-900 text-sm font-bold rounded-xl shadow-sm hover:shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
                <span>Memuat Berita...</span>
              </>
            ) : (
              <>
                <span>Muat Lebih Banyak</span>
                <ChevronDown className="w-4 h-4 text-gray-500 group-hover:translate-y-0.5 transition-transform" />
              </>
            )}
          </button>
        ) : (
          articlesList.length > 8 && (
            <div className="flex items-center justify-center gap-3 text-xs text-gray-400 font-medium">
              <span className="w-12 h-px bg-gray-200"></span>
              <span>Semua berita terbaru telah ditampilkan</span>
              <span className="w-12 h-px bg-gray-200"></span>
            </div>
          )
        )}
      </div>
    </div>
  );
}
