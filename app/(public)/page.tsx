import Link from "next/link";
import { db } from "@/db";
import { articles } from "@/db/schema";
import { eq, desc, asc, notInArray, and } from "drizzle-orm";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import LatestNewsSection from "./LatestNewsSection";
import DailyAssistanceWidget from "./DailyAssistanceWidget";

export const instant = false;

export default async function Home() {
  // Ambil artikel terbitan terbaru hingga 60 artikel
  const publishedArticles = await db
    .select()
    .from(articles)
    .where(eq(articles.status, 'published'))
    .orderBy(desc(articles.publishedAt))
    .limit(60);

  // 1. Headline Utama
  const featuredArticle = publishedArticles.length > 0 ? publishedArticles[0] : null;

  // 2. Baca Juga (Format Minimalis di bawah Headline)
  const bacaJugaArticles = publishedArticles.slice(1, 3);

  // 3. Berita Sorotan (3 Kartu Pilihan Redaksi tepat di bawah Baca Juga)
  const sorotanArticles = publishedArticles.slice(3, 6);

  // 4. Populer Hari Ini (5 Artikel)
  const popularArticles = publishedArticles.slice(6, 11);

  // Kumpulan ID yang sudah dipakai di atas agar Kilas Balik tidak menampilkan artikel yang sama
  const usedTopIds = publishedArticles.slice(0, 11).map((a) => a.id);

  // 5. Kilas Balik: Mengambil 4 artikel arsip lama dari database
  let kilasBalikArticles: typeof publishedArticles = [];
  try {
    if (usedTopIds.length > 0) {
      kilasBalikArticles = await db
        .select()
        .from(articles)
        .where(and(eq(articles.status, 'published'), notInArray(articles.id, usedTopIds)))
        .orderBy(asc(articles.publishedAt))
        .limit(4);
    } else {
      kilasBalikArticles = await db
        .select()
        .from(articles)
        .where(eq(articles.status, 'published'))
        .orderBy(asc(articles.publishedAt))
        .limit(4);
    }
  } catch (err) {
    console.warn("Gagal memuat kilas balik:", err);
  }

  // 6. Berita Terbaru (Feed Utama)
  const rawLatestArticles = publishedArticles.slice(11, 55);
  const hasMore = publishedArticles.length > 54;

  const initialLatestArticles = rawLatestArticles.map((a) => ({
    id: a.id,
    slug: a.slug,
    title: a.title,
    coverUrl: a.coverUrl,
    category: a.category,
    publishedAt: a.publishedAt ? a.publishedAt.toISOString() : null,
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {publishedArticles.length === 0 && (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-700 mb-2">Belum Ada Berita yang Terbit</h2>
          <p className="text-gray-500">
            Silakan unggah artikel Markdown melalui panel admin dengan waktu terbit (publish_at) di masa lalu agar muncul di sini.
          </p>
        </div>
      )}

      {featuredArticle && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
          {/* KOLOM KIRI (LEBAR 6 DARI 12): Headline Utama + Baca Juga + Berita Sorotan */}
          <div className="lg:col-span-6 flex flex-col">
            {/* Card Headline Utama */}
            <div className="flex flex-col w-full bg-white border border-gray-100 overflow-hidden rounded-2xl mb-6 shadow-xs hover:shadow-md transition-all group">
              <Link
                href={`/berita-teknologi/${featuredArticle.category.toLowerCase()}/${featuredArticle.id}/${featuredArticle.slug}`}
                className="w-full relative overflow-hidden bg-gray-50 aspect-video block"
              >
                <img
                  src={featuredArticle.coverUrl || ''}
                  alt={featuredArticle.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </Link>

              <div className="p-5 sm:p-7 flex flex-col justify-center bg-white">
                <div className="mb-3 flex items-center gap-2">
                  <span className="bg-gray-900 text-white text-[10px] sm:text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md shadow-2xs">
                    {featuredArticle.category}
                  </span>
                  <span className="text-xs text-gray-400 font-medium">Headline</span>
                </div>

                <Link
                  href={`/berita-teknologi/${featuredArticle.category.toLowerCase()}/${featuredArticle.id}/${featuredArticle.slug}`}
                >
                  <h2 className="text-2xl sm:text-3xl font-bold font-heading text-gray-900 group-hover:text-indigo-600 transition-colors mb-3 leading-tight line-clamp-3">
                    {featuredArticle.title}
                  </h2>
                </Link>

                <div className="flex items-center text-xs sm:text-sm text-gray-500 font-medium mt-1">
                  <span className="font-bold text-gray-800">{featuredArticle.author}</span>
                  <span className="mx-2">•</span>
                  <span>
                    {featuredArticle.publishedAt
                      ? formatDistanceToNow(new Date(featuredArticle.publishedAt), { addSuffix: true, locale: id })
                      : ''}
                  </span>
                </div>

                {/* BACA JUGA (Format Minimalis Inline ala Kompas) */}
                {bacaJugaArticles.length > 0 && (
                  <div className="mt-5 pt-4 border-t border-gray-100 space-y-2">
                    {bacaJugaArticles.map((bj) => (
                      <div key={bj.id} className="text-xs sm:text-sm leading-relaxed">
                        <span className="font-semibold text-gray-700 mr-1.5">Baca juga:</span>
                        <Link
                          href={`/berita-teknologi/${bj.category.toLowerCase()}/${bj.id}/${bj.slug}`}
                          className="text-sky-600 hover:text-sky-700 font-medium hover:underline transition-colors"
                        >
                          {bj.title}
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* BERITA SOROTAN (3 Kartu Pilihan Redaksi) */}
            {sorotanArticles.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <h3 className="text-sm sm:text-base font-bold font-heading text-gray-900 uppercase tracking-wider">
                      Berita Sorotan
                    </h3>
                  </div>
                  <span className="text-[11px] text-gray-400 font-medium sm:hidden">Geser ➔</span>
                  <span className="text-[11px] text-gray-400 font-medium hidden sm:inline">Pilihan Redaksi</span>
                </div>

                <div className="flex overflow-x-auto sm:grid sm:grid-cols-3 gap-3.5 pb-3 sm:pb-0 scrollbar-hide snap-x">
                  {sorotanArticles.map((art) => (
                    <Link
                      key={art.id}
                      href={`/berita-teknologi/${art.category.toLowerCase()}/${art.id}/${art.slug}`}
                      className="group flex flex-col bg-white rounded-xl border border-gray-100 overflow-hidden shadow-2xs hover:shadow-sm transition-all w-[240px] sm:w-auto shrink-0 snap-start"
                    >
                      <div className="aspect-video w-full overflow-hidden bg-gray-50 relative">
                        <img
                          src={art.coverUrl || ''}
                          alt={art.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                      <div className="p-3 flex flex-col justify-between flex-1">
                        <div>
                          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block mb-1">
                            {art.category}
                          </span>
                          <h4 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-2 text-xs sm:text-sm leading-snug">
                            {art.title}
                          </h4>
                        </div>
                        <span className="text-[10px] text-gray-400 mt-2 block">
                          {art.publishedAt
                            ? formatDistanceToNow(new Date(art.publishedAt), { addSuffix: true, locale: id })
                            : ''}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* KOLOM KANAN (LEBAR 6 DARI 12): Populer Hari Ini & Kilas Balik di atas, Info Harian & Tren di bawah */}
          <div className="lg:col-span-6 flex flex-col justify-between lg:border-l lg:border-gray-200/80 lg:pl-8">
            {/* Subgrid: Populer Hari Ini (col 1) & Kilas Balik (col 2) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
              {/* Populer Hari Ini */}
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-5 pb-2 border-b border-gray-200">
                  <h3 className="text-base font-bold font-heading text-gray-900 flex items-center gap-2">
                    <span>Populer Hari Ini</span>
                  </h3>
                </div>

                <div className="flex flex-col divide-y divide-gray-100">
                  {popularArticles.length === 0 ? (
                    <p className="text-gray-400 text-xs py-4">Belum ada artikel populer.</p>
                  ) : (
                    popularArticles.map((article, index) => (
                      <Link
                        key={article.id}
                        href={`/berita-teknologi/${article.category.toLowerCase()}/${article.id}/${article.slug}`}
                        className="py-3.5 first:pt-0 group flex items-start gap-3.5 cursor-pointer"
                      >
                        <span className="text-3xl sm:text-4xl font-black font-heading text-gray-200 group-hover:text-indigo-500 transition-colors shrink-0 leading-none w-7 text-center">
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-0.5">
                            {article.category}
                          </span>
                          <h4 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-2 text-xs sm:text-sm leading-snug">
                            {article.title}
                          </h4>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </div>

              {/* Kilas Balik */}
              <div className="flex flex-col sm:border-l sm:border-gray-200/80 sm:pl-6">
                <div className="flex items-center justify-between mb-5 pb-2 border-b border-gray-200">
                  <h3 className="text-base font-bold font-heading text-gray-900 flex items-center gap-2">
                    <span>Kilas Balik</span>
                  </h3>
                  <span className="text-[11px] text-gray-400 font-medium">Arsip</span>
                </div>

                <div className="space-y-4">
                  {kilasBalikArticles.length === 0 ? (
                    <p className="text-gray-400 text-xs py-4">Belum ada arsip kilas balik.</p>
                  ) : (
                    <>
                      {/* Kartu Utama Kilas Balik */}
                      {kilasBalikArticles[0] && (
                        <Link
                          href={`/berita-teknologi/${kilasBalikArticles[0].category.toLowerCase()}/${kilasBalikArticles[0].id}/${kilasBalikArticles[0].slug}`}
                          className="group block bg-gray-50/80 rounded-xl border border-gray-100 overflow-hidden shadow-2xs hover:shadow-xs transition-all"
                        >
                          <div className="aspect-video w-full overflow-hidden bg-gray-100 relative">
                            <img
                              src={kilasBalikArticles[0].coverUrl || ''}
                              alt={kilasBalikArticles[0].title}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          </div>
                          <div className="p-3">
                            <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                              <span className="font-bold uppercase text-purple-700">{kilasBalikArticles[0].category}</span>
                              <span>
                                {kilasBalikArticles[0].publishedAt
                                  ? formatDistanceToNow(new Date(kilasBalikArticles[0].publishedAt), { addSuffix: true, locale: id })
                                  : ''}
                              </span>
                            </div>
                            <h4 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-2 text-xs sm:text-sm leading-snug">
                              {kilasBalikArticles[0].title}
                            </h4>
                          </div>
                        </Link>
                      )}

                      {/* List Thumbnail Kecil Kilas Balik Berikutnya */}
                      <div className="divide-y divide-gray-100 pt-1">
                        {kilasBalikArticles.slice(1).map((kb) => (
                          <Link
                            key={kb.id}
                            href={`/berita-teknologi/${kb.category.toLowerCase()}/${kb.id}/${kb.slug}`}
                            className="py-3 first:pt-0 group flex items-center gap-3"
                          >
                            <div className="w-16 h-12 rounded-lg overflow-hidden bg-gray-100 shrink-0 border border-gray-100">
                              <img
                                src={kb.coverUrl || ''}
                                alt={kb.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-2 text-xs leading-snug">
                                {kb.title}
                              </h4>
                              <span className="text-[10px] text-gray-400 block mt-1">
                                {kb.publishedAt
                                  ? formatDistanceToNow(new Date(kb.publishedAt), { addSuffix: true, locale: id })
                                  : ''}
                              </span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Widget: Info Harian & Tren */}
            <DailyAssistanceWidget />
          </div>
        </div>
      )}

      {/* Bagian Bawah: Feed Berita Terbaru dengan Load More */}
      <LatestNewsSection
        initialArticles={initialLatestArticles}
        initialHasMore={hasMore}
        initialOffset={11 + rawLatestArticles.length}
      />
    </div>
  );
}
