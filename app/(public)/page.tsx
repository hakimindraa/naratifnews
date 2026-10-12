import Link from "next/link";
import { db } from "@/db";
import { articles } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import LatestNewsSection from "./LatestNewsSection";

export const instant = false;

export default async function Home() {
  // Ambil artikel yang berstatus published (hingga 54 artikel: 1 featured, 2 baca juga, 50 latest, + 1 untuk cek apakah ada sisa)
  const publishedArticles = await db
    .select()
    .from(articles)
    .where(eq(articles.status, 'published'))
    .orderBy(desc(articles.publishedAt))
    .limit(54);

  const featuredArticle = publishedArticles.length > 0 ? publishedArticles[0] : null;
  const bacaJugaArticles = publishedArticles.slice(1, 3);
  const rawLatestArticles = publishedArticles.slice(3, 53);
  const hasMore = publishedArticles.length > 53;
  // Untuk populer, sementara kita ambil dari urutan 5-10
  const popularArticles = publishedArticles.slice(5, 10);

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
          <p className="text-gray-500">Silakan unggah artikel Markdown melalui panel admin dengan waktu terbit (publish_at) di masa lalu agar muncul di sini.</p>
        </div>
      )}

      {featuredArticle && (
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Featured Article with Baca Juga */}
          <div className="lg:w-2/3 flex flex-col">
            <div className="flex-grow">
              <div className="flex flex-col w-full bg-white border border-gray-100 overflow-hidden rounded-xl mb-5 shadow-sm group">
                <Link href={`/berita-teknologi/${featuredArticle.category.toLowerCase()}/${featuredArticle.id}/${featuredArticle.slug}`} className="w-full relative overflow-hidden bg-gray-50 aspect-video block">
                  <img
                    src={featuredArticle.coverUrl || ''}
                    alt={featuredArticle.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </Link>

                <div className="p-5 sm:p-8 flex flex-col justify-center bg-white relative z-10">
                  <div className="mb-4">
                    <span className="bg-gray-900 text-white text-[10px] sm:text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-sm shadow-sm">
                      {featuredArticle.category}
                    </span>
                  </div>
                  <Link href={`/berita-teknologi/${featuredArticle.category.toLowerCase()}/${featuredArticle.id}/${featuredArticle.slug}`}>
                    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-heading text-gray-900 group-hover:text-gray-600 transition-colors mb-3 leading-tight line-clamp-3">
                      {featuredArticle.title}
                    </h2>
                  </Link>
                  <div className="flex items-center text-xs sm:text-sm text-gray-500 font-medium mt-1 mb-5">
                    <span className="font-bold text-gray-800">{featuredArticle.author}</span>
                    <span className="mx-2">•</span>
                    <span>
                      {featuredArticle.publishedAt
                        ? formatDistanceToNow(new Date(featuredArticle.publishedAt), { addSuffix: true, locale: id })
                        : ''}
                    </span>
                  </div>

                  {/* BACA JUGA */}
                  {bacaJugaArticles.length > 0 && (
                    <div className="mt-4 pt-4 sm:pt-5 border-t border-dashed border-gray-200">
                        <div className="text-[10px] sm:text-xs font-black text-red-600 uppercase tracking-widest mb-2 sm:mb-3">Baca Juga</div>
                        <ul className="space-y-2 sm:space-y-3">
                          {bacaJugaArticles.map(bj => (
                            <li key={bj.id} className="group/link">
                              <Link href={`/berita-teknologi/${bj.category.toLowerCase()}/${bj.id}/${bj.slug}`} className="flex items-start gap-1.5 sm:gap-2">
                                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 shrink-0 mt-0.5 sm:mt-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                                <span className="text-sm sm:text-base font-bold text-gray-800 group-hover/link:text-gray-600 transition-colors line-clamp-2 leading-snug">{bj.title}</span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Popular List (Sidebar) */}
          <div className="lg:w-1/3 flex flex-col">
            <div className="flex items-center mb-6">
              <h3 className="text-xl font-bold font-heading text-gray-900">Populer Hari Ini</h3>
              <div className="ml-4 flex-grow h-px bg-gray-200"></div>
            </div>
            <div className="flex flex-col gap-6">
              {popularArticles.length === 0 ? (
                <p className="text-gray-500 text-sm">Belum cukup artikel untuk ditampilkan di populer.</p>
              ) : (
                popularArticles.map((article, index) => (
                  <div key={article.id} className="flex gap-4 group cursor-pointer">
                    <div className="text-5xl font-black font-heading text-gray-100 group-hover:text-gray-300 transition-colors -mt-2">
                      {index + 1}
                    </div>
                    <div>
                      <div className="text-gray-900 text-xs font-bold uppercase tracking-wider mb-1">
                        {article.category}
                      </div>
                      <h4 className="font-bold text-gray-900 group-hover:text-gray-600 transition-colors line-clamp-2 text-base leading-snug">
                        <Link href={`/berita-teknologi/${article.category.toLowerCase()}/${article.id}/${article.slug}`}>{article.title}</Link>
                      </h4>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Latest Articles Grid with Load More */}
      <LatestNewsSection
        initialArticles={initialLatestArticles}
        initialHasMore={hasMore}
        initialOffset={3 + rawLatestArticles.length}
      />
    </div>
  );
}
