'use client';

import { useState, Fragment } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';
import { Loader2, ChevronDown } from 'lucide-react';
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
  categorySlug,
  articles,
}: {
  title: string;
  categorySlug: string;
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
    <div className="col-span-2 my-3 py-3 block lg:hidden border-t border-b border-gray-100">
      {/* Header Selingan Tematik (Polos & Minimalis) */}
      <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-gray-100">
        <h4 className="text-xs font-semibold font-heading text-gray-900 uppercase tracking-wider">
          {title}
        </h4>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400 font-medium">Geser ➔</span>
          <Link
            href={`/berita/${categorySlug}`}
            className="text-[11px] font-semibold text-gray-900 hover:text-gray-600 transition-colors"
          >
            Semua
          </Link>
        </div>
      </div>

      {/* Reel Geser Horizontal Kartu Berita */}
      <div className="flex overflow-x-auto gap-3 pb-1 scrollbar-hide snap-x snap-mandatory -mx-3.5 px-3.5">
        {articles.map((art) => (
          <Link
            key={art.id}
            href={`/berita/${art.category.toLowerCase()}/${art.id}/${art.slug}`}
            className="w-[220px] shrink-0 snap-start bg-white rounded-md border border-gray-200 overflow-hidden shadow-2xs hover:border-gray-400 transition-colors flex flex-col justify-between"
          >
            <div className="aspect-video w-full overflow-hidden bg-gray-100 relative">
              <img
                src={art.coverUrl || ''}
                alt={art.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="p-2.5 flex flex-col justify-between flex-1">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 block mb-1">
                  {art.category}
                </span>
                <h5 className="font-semibold text-gray-900 line-clamp-2 text-xs leading-snug">
                  {art.title}
                </h5>
              </div>
              <span suppressHydrationWarning className="text-[10px] text-gray-400 mt-2 block font-normal">
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
      {/* Section Header Polos Minimalis */}
      <div className="flex items-center mb-4 sm:mb-6 px-3.5 sm:px-0">
        <h3 className="text-base sm:text-xl font-bold font-heading text-gray-900">Berita Terbaru</h3>
        <div className="ml-4 flex-grow h-px bg-gray-200"></div>
      </div>

      {/* Grid Utama: Gaya Judul & Layout List ala Detiknews (Thumbnail KIRI, Judul KANAN font-semibold, waktu di bawah) */}
      <div className="grid grid-cols-2 gap-x-3 sm:gap-x-6 gap-y-3.5 sm:gap-y-8 px-3.5 sm:px-0">
        {articlesList.map((article, idx) => {
          // Pola Ritme Mobile (siklus 6 artikel):
          // pattern 0: Hero Penuh (col-span-2, gambar lebar di atas)
          // pattern 1, 2, 3: List Samping Detiknews style (col-span-2, thumbnail di KIRI, judul di KANAN)
          // pattern 4, 5: Mini Grid 2-Kolom (col-span-1, gambar di atas, teks di bawah)
          const pattern = idx % 6;

          return (
            <Fragment key={article.id}>
              {/* TIPE 1: HERO PENUH (col-span-2 di mobile, standard grid di desktop) */}
              {pattern === 0 && (
                <div className="col-span-2 sm:col-span-1 group cursor-pointer pb-3.5 sm:pb-0 border-b sm:border-b-0 border-gray-100">
                  <Link
                    href={`/berita/${article.category.toLowerCase()}/${article.id}/${article.slug}`}
                    className="flex flex-col h-full"
                  >
                    <div className="relative aspect-video w-full rounded-md overflow-hidden bg-gray-100 mb-2.5 sm:mb-4">
                      <img
                        src={article.coverUrl || ''}
                        alt={article.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    </div>
                    <div className="flex flex-col justify-between flex-grow">
                      <div>
                        <h4 className="font-semibold text-gray-900 group-hover:text-gray-600 transition-colors line-clamp-2 text-base sm:text-lg leading-snug">
                          {article.title}
                        </h4>
                      </div>
                      <span suppressHydrationWarning className="text-[11px] sm:text-xs text-gray-400 font-normal mt-1.5 block">
                        {getTimeAgo(article.publishedAt)}
                      </span>
                    </div>
                  </Link>
                </div>
              )}

              {/* TIPE 2: LIST DETIKNEWS STYLE (Thumbnail KIRI, Judul KANAN font-semibold, Waktu di bawah judul) */}
              {(pattern === 1 || pattern === 2 || pattern === 3) && (
                <div className="col-span-2 sm:col-span-1 group cursor-pointer py-3 sm:py-0 border-b sm:border-b-0 border-gray-100">
                  <Link
                    href={`/berita/${article.category.toLowerCase()}/${article.id}/${article.slug}`}
                    className="flex items-start gap-3 sm:flex-col sm:gap-0 sm:h-full"
                  >
                    {/* Thumbnail: Di KIRI persis seperti Detiknews di mobile, di ATAS di desktop */}
                    <div className="relative w-[100px] h-[75px] sm:w-full sm:h-48 rounded-md overflow-hidden bg-gray-100 shrink-0 sm:mb-4">
                      <img
                        src={article.coverUrl || ''}
                        alt={article.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    </div>

                    {/* Text: Di KANAN persis seperti Detiknews di mobile, di BAWAH di desktop */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between sm:h-full">
                      <h4 className="font-semibold text-gray-900 group-hover:text-gray-600 transition-colors line-clamp-2 sm:line-clamp-3 text-[14.5px] sm:text-base leading-[1.35] sm:leading-snug">
                        {article.title}
                      </h4>
                      <div
                        suppressHydrationWarning
                        className="text-[11px] sm:text-xs text-gray-400 font-normal mt-1 sm:mt-auto"
                      >
                        {getTimeAgo(article.publishedAt)}
                      </div>
                    </div>
                  </Link>
                </div>
              )}

              {/* TIPE 3: MINI GRID (col-span-1 di mobile = 2 berita berdampingan, standard grid di desktop) */}
              {(pattern === 4 || pattern === 5) && (
                <div className="col-span-1 sm:col-span-1 group cursor-pointer pb-2 sm:pb-0">
                  <Link
                    href={`/berita/${article.category.toLowerCase()}/${article.id}/${article.slug}`}
                    className="flex flex-col h-full"
                  >
                    <div className="relative aspect-[4/3] sm:aspect-video w-full rounded-md overflow-hidden bg-gray-100 mb-2 sm:mb-4">
                      <img
                        src={article.coverUrl || ''}
                        alt={article.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    </div>
                    <div className="flex flex-col justify-between flex-grow">
                      <h4 className="font-semibold text-gray-900 group-hover:text-gray-600 transition-colors line-clamp-2 text-xs sm:text-base leading-snug">
                        {article.title}
                      </h4>
                      <span suppressHydrationWarning className="text-[10px] sm:text-xs text-gray-400 font-normal mt-1.5 block">
                        {getTimeAgo(article.publishedAt)}
                      </span>
                    </div>
                  </Link>
                </div>
              )}

              {/* Selingan 1 Mobile: Kabar Nasional (setelah artikel ke-4 / index 3) */}
              {idx === 3 && thematicData?.nasional && thematicData.nasional.length > 0 && (
                <div className="col-span-2">
                  <MobileThematicStrip
                    title="Kabar Nasional"
                    categorySlug="nasional"
                    articles={thematicData.nasional}
                  />
                </div>
              )}

              {/* Selingan 2 Mobile: Jendela Internasional (setelah artikel ke-8 / index 7) */}
              {idx === 7 && thematicData?.internasional && thematicData.internasional.length > 0 && (
                <div className="col-span-2">
                  <MobileThematicStrip
                    title="Jendela Internasional"
                    categorySlug="internasional"
                    articles={thematicData.internasional}
                  />
                </div>
              )}

              {/* Selingan 3 Mobile: Arena Sport (setelah artikel ke-12 / index 11) */}
              {idx === 11 && thematicData?.sport && thematicData.sport.length > 0 && (
                <div className="col-span-2">
                  <MobileThematicStrip
                    title="Arena Sport"
                    categorySlug="sport"
                    articles={thematicData.sport}
                  />
                </div>
              )}
            </Fragment>
          );
        })}
      </div>

      {/* Load More Button & Status */}
      <div className="mt-10 sm:mt-12 text-center">
        {hasMore ? (
          <button
            onClick={handleLoadMore}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-white border border-gray-300 hover:border-black text-gray-900 text-xs sm:text-sm font-semibold rounded-md shadow-2xs transition-all disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
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
