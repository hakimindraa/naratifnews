'use client';

import { useState, Fragment, useMemo } from 'react';
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
    <div className="my-2 py-3 block lg:hidden border-t border-b border-gray-100">
      {/* Header Selingan Tematik (Polos & Minimalis) */}
      <div className="flex items-center justify-between pb-1.5 mb-2.5 border-b border-gray-100">
        <h4 className="text-xs font-semibold font-heading text-gray-900 uppercase tracking-wider">
          {title}
        </h4>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400 font-medium">Geser</span>
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
                <h5 className="font-heading font-medium text-gray-900 line-clamp-2 text-xs leading-snug">
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

  // Mengelompokkan berita dalam siklus ritme editorial dinamis & variatif:
  // Step 0: Modul CNN 2-Kolom -> Step 1: 3 Kolom Kotak (Trio) -> Step 2: Modul CNN 2-Kolom -> Step 3: 2 List Berita -> Step 4: 1 Berita Besar Melintang -> berulang
  const dynamicBlocks = useMemo(() => {
    type FeedBlock =
      | {
          type: 'cnn_pair';
          id: string;
          moduleA: { lead: ArticleCardItem; subs: ArticleCardItem[] };
          moduleB?: { lead: ArticleCardItem; subs: ArticleCardItem[] };
          stepIndex: number;
        }
      | {
          type: 'trio';
          id: string;
          articles: ArticleCardItem[];
          stepIndex: number;
        }
      | {
          type: 'horizontal_pair';
          id: string;
          articles: ArticleCardItem[];
          stepIndex: number;
        }
      | {
          type: 'spotlight';
          id: string;
          article: ArticleCardItem;
          stepIndex: number;
        };

    const blocks: FeedBlock[] = [];
    let i = 0;
    let step = 0;

    while (i < articlesList.length) {
      const mode = step % 5;

      if (mode === 0 || mode === 2) {
        // Mode 2 Modul CNN Berdampingan (Maksimal 6 artikel: 3 untuk Modul A, 3 untuk Modul B)
        const leadA = articlesList[i];
        if (!leadA) break;
        i++;
        const subsA: ArticleCardItem[] = [];
        if (i < articlesList.length) subsA.push(articlesList[i++]);
        if (i < articlesList.length) subsA.push(articlesList[i++]);

        let moduleB: { lead: ArticleCardItem; subs: ArticleCardItem[] } | undefined = undefined;
        if (i < articlesList.length) {
          const leadB = articlesList[i++];
          const subsB: ArticleCardItem[] = [];
          if (i < articlesList.length) subsB.push(articlesList[i++]);
          if (i < articlesList.length) subsB.push(articlesList[i++]);
          moduleB = { lead: leadB, subs: subsB };
        }

        blocks.push({
          type: 'cnn_pair',
          id: `cnn-${leadA.id}-${step}`,
          moduleA: { lead: leadA, subs: subsA },
          moduleB,
          stepIndex: step,
        });
      } else if (mode === 1) {
        // Mode Selingan 3 Kolom Kotak (Trio Grid)
        const trioItems = articlesList.slice(i, i + 3);
        if (trioItems.length > 0) {
          blocks.push({
            type: 'trio',
            id: `trio-${trioItems[0].id}-${step}`,
            articles: trioItems,
            stepIndex: step,
          });
          i += trioItems.length;
        }
      } else if (mode === 3) {
        // Mode Selingan 2 List Berita Horizontal
        const horizItems = articlesList.slice(i, i + 2);
        if (horizItems.length > 0) {
          blocks.push({
            type: 'horizontal_pair',
            id: `horiz-${horizItems[0].id}-${step}`,
            articles: horizItems,
            stepIndex: step,
          });
          i += horizItems.length;
        }
      } else if (mode === 4) {
        // Mode Selingan 1 Berita Besar Melintang Penuh (Headline Breaker)
        const spot = articlesList[i];
        if (spot) {
          blocks.push({
            type: 'spotlight',
            id: `spot-${spot.id}-${step}`,
            article: spot,
            stepIndex: step,
          });
          i++;
        }
      }

      step++;
    }

    return blocks;
  }, [articlesList]);

  if (articlesList.length === 0) {
    return null;
  }

  return (
    <div>
      {/* Section Header Tegas ala CNN */}
      <div className="flex items-center justify-between mb-4 sm:mb-6 pb-2 border-b-2 border-black px-3.5 sm:px-0">
        <h3 className="text-sm sm:text-base font-bold font-heading text-gray-900 uppercase tracking-wider">
          Berita Terbaru
        </h3>
        <span className="text-xs text-red-600 font-bold uppercase font-heading tracking-wide">
          Kabar Terkini
        </span>
      </div>

      {/* Alur Berita Dinamis dengan Selingan Variatif (CNN Pairs, 3 Kolom, 2 List, 1 Berita Besar) */}
      <div className="divide-y divide-gray-200 px-3.5 sm:px-0">
        {dynamicBlocks.map((block) => {
          // 1. BLOK MODUL CNN BERPASANGAN 2-KOLOM
          if (block.type === 'cnn_pair') {
            return (
              <Fragment key={block.id}>
                <div className="py-5 sm:py-6 first:pt-0">
                  {!block.moduleB ? (
                    /* KASUS A: HANYA ADA 1 MODUL (TIDAK ADA PASANGAN MODUL B) -> ADAPTIVE FULL WIDTH */
                    <div>
                      <div className="flex items-center gap-1.5 mb-2.5 sm:mb-3">
                        <span className="w-1 h-3.5 bg-black inline-block"></span>
                        <Link
                          href={`/berita/${block.moduleA.lead.category.toLowerCase()}`}
                          className="text-xs font-bold font-heading uppercase tracking-wider text-gray-900 hover:text-red-600 transition-colors"
                        >
                          {block.moduleA.lead.category}
                        </Link>
                      </div>

                      {block.moduleA.subs.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-7 items-start">
                          {/* Kolom Kiri: Berita Utama Modul */}
                          <Link
                            href={`/berita/${block.moduleA.lead.category.toLowerCase()}/${block.moduleA.lead.id}/${block.moduleA.lead.slug}`}
                            className="group block"
                          >
                            <div className="aspect-video w-full overflow-hidden bg-gray-100 mb-2">
                              <img
                                src={block.moduleA.lead.coverUrl || ''}
                                alt={block.moduleA.lead.title}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                loading="lazy"
                              />
                            </div>
                            <h4 className="font-heading font-medium text-gray-900 group-hover:text-red-600 transition-colors line-clamp-3 text-sm sm:text-[15px] leading-snug">
                              {block.moduleA.lead.title}
                            </h4>
                            <span
                              suppressHydrationWarning
                              className="text-[10px] sm:text-[11px] text-gray-400 font-normal mt-1 block"
                            >
                              {getTimeAgo(block.moduleA.lead.publishedAt)}
                            </span>
                          </Link>

                          {/* Kolom Kanan: 2 Berita Pendukung Mengisi Sisi Kanan secara Simetris (Bukan Kosong!) */}
                          <div className="space-y-3 sm:border-l sm:border-gray-100 sm:pl-6">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block pb-1 border-b border-gray-100">
                              Kabar Terkait Lainnya
                            </span>
                            <div className="divide-y divide-gray-100">
                              {block.moduleA.subs.map((sub) => (
                                <Link
                                  key={sub.id}
                                  href={`/berita/${sub.category.toLowerCase()}/${sub.id}/${sub.slug}`}
                                  className="group flex items-start gap-3 py-2.5 first:pt-0 last:pb-0"
                                >
                                  <div className="w-20 h-14 shrink-0 overflow-hidden bg-gray-100">
                                    <img
                                      src={sub.coverUrl || ''}
                                      alt={sub.title}
                                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                      loading="lazy"
                                    />
                                  </div>
                                  <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch">
                                    <h5 className="font-heading font-normal text-gray-900 group-hover:text-red-600 transition-colors line-clamp-2 text-xs sm:text-[13px] leading-snug">
                                      {sub.title}
                                    </h5>
                                    <span
                                      suppressHydrationWarning
                                      className="text-[10px] text-gray-400 font-normal mt-0.5 block"
                                    >
                                      {getTimeAgo(sub.publishedAt)}
                                    </span>
                                  </div>
                                </Link>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <Link
                          href={`/berita/${block.moduleA.lead.category.toLowerCase()}/${block.moduleA.lead.id}/${block.moduleA.lead.slug}`}
                          className="group flex flex-col sm:flex-row items-start gap-4 sm:gap-6"
                        >
                          <div className="w-full sm:w-1/2 aspect-video overflow-hidden bg-gray-100 shrink-0">
                            <img
                              src={block.moduleA.lead.coverUrl || ''}
                              alt={block.moduleA.lead.title}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                              loading="lazy"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-heading font-medium text-gray-900 group-hover:text-red-600 transition-colors line-clamp-3 text-sm sm:text-base leading-snug">
                              {block.moduleA.lead.title}
                            </h4>
                            <span
                              suppressHydrationWarning
                              className="text-[10px] sm:text-[11px] text-gray-400 font-normal mt-1 block"
                            >
                              {getTimeAgo(block.moduleA.lead.publishedAt)}
                            </span>
                          </div>
                        </Link>
                      )}
                    </div>
                  ) : (
                    /* KASUS B: LENGKAP 2 MODUL BERDAMPINGAN (NORMAL) */
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 sm:gap-x-7 gap-y-7 sm:gap-y-8">
                      {/* Modul A */}
                      <div className="flex flex-col justify-between h-full">
                        <div>
                          <div className="flex items-center gap-1.5 mb-2 sm:mb-2.5">
                            <span className="w-1 h-3.5 bg-black inline-block"></span>
                            <Link
                              href={`/berita/${block.moduleA.lead.category.toLowerCase()}`}
                              className="text-xs font-bold font-heading uppercase tracking-wider text-gray-900 hover:text-red-600 transition-colors"
                            >
                              {block.moduleA.lead.category}
                            </Link>
                          </div>
                          <Link
                            href={`/berita/${block.moduleA.lead.category.toLowerCase()}/${block.moduleA.lead.id}/${block.moduleA.lead.slug}`}
                            className="group block mb-3"
                          >
                            <div className="aspect-video w-full overflow-hidden bg-gray-100 mb-2">
                              <img
                                src={block.moduleA.lead.coverUrl || ''}
                                alt={block.moduleA.lead.title}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                loading="lazy"
                              />
                            </div>
                            <h4 className="font-heading font-medium text-gray-900 group-hover:text-red-600 transition-colors line-clamp-3 text-sm sm:text-[15px] leading-snug">
                              {block.moduleA.lead.title}
                            </h4>
                            <span
                              suppressHydrationWarning
                              className="text-[10px] sm:text-[11px] text-gray-400 font-normal mt-1 block"
                            >
                              {getTimeAgo(block.moduleA.lead.publishedAt)}
                            </span>
                          </Link>
                        </div>

                        {block.moduleA.subs.length > 0 && (
                          <div className="border-t border-gray-200 pt-2.5 space-y-2.5 mt-auto">
                            {block.moduleA.subs.map((sub) => (
                              <Link
                                key={sub.id}
                                href={`/berita/${sub.category.toLowerCase()}/${sub.id}/${sub.slug}`}
                                className="group flex items-start gap-2.5"
                              >
                                <div className="w-18 h-12 sm:w-20 sm:h-13 shrink-0 overflow-hidden bg-gray-100">
                                  <img
                                    src={sub.coverUrl || ''}
                                    alt={sub.title}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    loading="lazy"
                                  />
                                </div>
                                <div className="flex-1 min-w-0 flex flex-col justify-between">
                                  <h5 className="font-heading font-normal text-gray-900 group-hover:text-red-600 transition-colors line-clamp-2 text-xs sm:text-[13px] leading-snug">
                                    {sub.title}
                                  </h5>
                                  <span
                                    suppressHydrationWarning
                                    className="text-[10px] text-gray-400 font-normal mt-0.5 block"
                                  >
                                    {getTimeAgo(sub.publishedAt)}
                                  </span>
                                </div>
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Modul B */}
                      <div className="flex flex-col justify-between h-full">
                        <div>
                          <div className="flex items-center gap-1.5 mb-2 sm:mb-2.5">
                            <span className="w-1 h-3.5 bg-black inline-block"></span>
                            <Link
                              href={`/berita/${block.moduleB.lead.category.toLowerCase()}`}
                              className="text-xs font-bold font-heading uppercase tracking-wider text-gray-900 hover:text-red-600 transition-colors"
                            >
                              {block.moduleB.lead.category}
                            </Link>
                          </div>
                          <Link
                            href={`/berita/${block.moduleB.lead.category.toLowerCase()}/${block.moduleB.lead.id}/${block.moduleB.lead.slug}`}
                            className="group block mb-3"
                          >
                            <div className="aspect-video w-full overflow-hidden bg-gray-100 mb-2">
                              <img
                                src={block.moduleB.lead.coverUrl || ''}
                                alt={block.moduleB.lead.title}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                loading="lazy"
                              />
                            </div>
                            <h4 className="font-heading font-medium text-gray-900 group-hover:text-red-600 transition-colors line-clamp-3 text-sm sm:text-[15px] leading-snug">
                              {block.moduleB.lead.title}
                            </h4>
                            <span
                              suppressHydrationWarning
                              className="text-[10px] sm:text-[11px] text-gray-400 font-normal mt-1 block"
                            >
                              {getTimeAgo(block.moduleB.lead.publishedAt)}
                            </span>
                          </Link>
                        </div>

                        {block.moduleB.subs.length > 0 && (
                          <div className="border-t border-gray-200 pt-2.5 space-y-2.5 mt-auto">
                            {block.moduleB.subs.map((sub) => (
                              <Link
                                key={sub.id}
                                href={`/berita/${sub.category.toLowerCase()}/${sub.id}/${sub.slug}`}
                                className="group flex items-start gap-2.5"
                              >
                                <div className="w-18 h-12 sm:w-20 sm:h-13 shrink-0 overflow-hidden bg-gray-100">
                                  <img
                                    src={sub.coverUrl || ''}
                                    alt={sub.title}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    loading="lazy"
                                  />
                                </div>
                                <div className="flex-1 min-w-0 flex flex-col justify-between">
                                  <h5 className="font-heading font-normal text-gray-900 group-hover:text-red-600 transition-colors line-clamp-2 text-xs sm:text-[13px] leading-snug">
                                    {sub.title}
                                  </h5>
                                  <span
                                    suppressHydrationWarning
                                    className="text-[10px] text-gray-400 font-normal mt-0.5 block"
                                  >
                                    {getTimeAgo(sub.publishedAt)}
                                  </span>
                                </div>
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Selingan Mobile Strip 1: Kabar Nasional (setelah blok CNN pertama) */}
                {block.stepIndex === 0 && thematicData?.nasional && thematicData.nasional.length > 0 && (
                  <div className="block lg:hidden my-2">
                    <MobileThematicStrip
                      title="Kabar Nasional"
                      categorySlug="nasional"
                      articles={thematicData.nasional}
                    />
                  </div>
                )}

                {/* Selingan Mobile Strip 2: Jendela Internasional (setelah blok CNN kedua) */}
                {block.stepIndex === 2 && thematicData?.internasional && thematicData.internasional.length > 0 && (
                  <div className="block lg:hidden my-2">
                    <MobileThematicStrip
                      title="Jendela Internasional"
                      categorySlug="internasional"
                      articles={thematicData.internasional}
                    />
                  </div>
                )}
              </Fragment>
            );
          }

          // 2. SELINGAN A: 3 KOLOM KOTAK BERDAMPINGAN (TRIO GRID)
          if (block.type === 'trio') {
            return (
              <Fragment key={block.id}>
                <div className="py-5 sm:py-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
                    {block.articles.map((art) => (
                      <Link
                        key={art.id}
                        href={`/berita/${art.category.toLowerCase()}/${art.id}/${art.slug}`}
                        className="group flex flex-col justify-between"
                      >
                        <div>
                          <div className="aspect-video w-full overflow-hidden bg-gray-100 mb-2">
                            <img
                              src={art.coverUrl || ''}
                              alt={art.title}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                              loading="lazy"
                            />
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 block mb-0.5">
                            {art.category}
                          </span>
                          <h4 className="font-heading font-normal sm:font-medium text-gray-900 group-hover:text-red-600 transition-colors line-clamp-2 text-xs sm:text-[13px] leading-snug">
                            {art.title}
                          </h4>
                        </div>
                        <span
                          suppressHydrationWarning
                          className="text-[10px] sm:text-[11px] text-gray-400 font-normal mt-1.5 block"
                        >
                          {getTimeAgo(art.publishedAt)}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              </Fragment>
            );
          }

          // 3. SELINGAN B: 2 BARIS LIST BERITA HORIZONTAL
          if (block.type === 'horizontal_pair') {
            return (
              <Fragment key={block.id}>
                <div className="py-2">
                  <div className="divide-y divide-gray-100">
                    {block.articles.map((art) => (
                      <article key={art.id} className="py-3 sm:py-3.5 first:pt-0 last:pb-0 group">
                        <Link
                          href={`/berita/${art.category.toLowerCase()}/${art.id}/${art.slug}`}
                          className="flex items-start gap-3.5 sm:gap-4.5"
                        >
                          <div className="w-28 h-20 sm:w-40 sm:h-26 shrink-0 overflow-hidden bg-gray-100">
                            <img
                              src={art.coverUrl || ''}
                              alt={art.title}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                              loading="lazy"
                            />
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch">
                            <div>
                              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-red-600 block mb-0.5 sm:mb-1">
                                {art.category}
                              </span>
                              <h4 className="font-heading font-normal sm:font-medium text-gray-900 group-hover:text-red-600 transition-colors line-clamp-2 sm:line-clamp-3 text-xs sm:text-[15px] leading-snug">
                                {art.title}
                              </h4>
                            </div>
                            <span
                              suppressHydrationWarning
                              className="text-[10px] sm:text-[11px] text-gray-400 font-normal mt-1 block"
                            >
                              {getTimeAgo(art.publishedAt)}
                            </span>
                          </div>
                        </Link>
                      </article>
                    ))}
                  </div>
                </div>
              </Fragment>
            );
          }

          // 4. SELINGAN C: 1 KOLOM BERITA BESAR MELINTANG PENUH (HEADLINE BREAKER)
          return (
            <Fragment key={block.id}>
              <div className="py-5 sm:py-6">
                <Link
                  href={`/berita/${block.article.category.toLowerCase()}/${block.article.id}/${block.article.slug}`}
                  className="group block"
                >
                  <div className="aspect-video sm:aspect-[21/9] w-full overflow-hidden bg-gray-100 mb-3">
                    <img
                      src={block.article.coverUrl || ''}
                      alt={block.article.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-red-600 block mb-1">
                    {block.article.category}
                  </span>
                  <h4 className="font-heading font-normal sm:font-medium text-gray-900 group-hover:text-red-600 transition-colors line-clamp-2 text-sm sm:text-lg leading-snug">
                    {block.article.title}
                  </h4>
                  <span
                    suppressHydrationWarning
                    className="text-[10px] sm:text-[11px] text-gray-400 font-normal mt-1.5 block"
                  >
                    {getTimeAgo(block.article.publishedAt)}
                  </span>
                </Link>
              </div>

              {/* Selingan Mobile Strip 3: Arena Sport (setelah blok berita besar) */}
              {thematicData?.sport && thematicData.sport.length > 0 && (
                <div className="block lg:hidden my-2">
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

      {/* Tombol Muat Berita Lainnya */}
      <div className="mt-8 sm:mt-10 text-center">
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
                <span>Muat Berita Lainnya</span>
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
