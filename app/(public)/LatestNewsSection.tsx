'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';
import { Loader2, ChevronDown } from 'lucide-react';
import { ArticleCardItem, getMoreArticles } from './actions';

interface LatestNewsSectionProps {
  initialArticles: ArticleCardItem[];
  initialHasMore: boolean;
  initialOffset: number;
}

export default function LatestNewsSection({
  initialArticles,
  initialHasMore,
  initialOffset,
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
    <div className="mt-16">
      {/* Section Header */}
      <div className="flex items-center mb-8">
        <h3 className="text-2xl font-bold font-heading text-gray-900">Berita Terbaru</h3>
        <div className="ml-4 flex-grow h-px bg-gray-200"></div>
      </div>

      {/* Articles Grid (4 Columns) */}
      <div className="grid grid-cols-2 gap-4 sm:gap-x-6 sm:gap-y-10 lg:grid-cols-4">
        {articlesList.map((article) => (
          <div key={article.id} className="group cursor-pointer">
            <Link
              href={`/berita-teknologi/${article.category.toLowerCase()}/${article.id}/${article.slug}`}
              className="flex flex-col gap-2 sm:gap-0 sm:h-full items-start"
            >
              {/* Thumbnail Image */}
              <div className="relative w-full aspect-[4/3] sm:h-48 sm:aspect-auto bg-gray-100 overflow-hidden rounded-lg sm:rounded-xl mb-2 sm:mb-4 shadow-sm shrink-0">
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
                <h4 className="font-bold text-gray-900 group-hover:text-gray-600 transition-colors line-clamp-3 mb-1 sm:mb-3 text-sm sm:text-lg leading-snug sm:flex-grow">
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
