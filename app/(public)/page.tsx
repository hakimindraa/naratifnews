import Link from "next/link";
import { db } from "@/db";
import { articles } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";

export const instant = false;

export default async function Home() {
  // Ambil hanya artikel yang berstatus published
  const publishedArticles = await db
    .select()
    .from(articles)
    .where(eq(articles.status, 'published'))
    .orderBy(desc(articles.publishedAt))
    .limit(10);

  const featuredArticle = publishedArticles.length > 0 ? publishedArticles[0] : null;
  const latestArticles = publishedArticles.slice(1, 5);
  // Untuk populer, sementara kita ambil dari urutan 5-10
  const popularArticles = publishedArticles.slice(5, 10);

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
          {/* Main Featured Article */}
          <div className="lg:w-2/3 flex flex-col">
            <div className="flex-grow">
              <Link href={`/${featuredArticle.category.toLowerCase()}/${featuredArticle.id}/${featuredArticle.slug}`} className="relative block w-full h-[320px] sm:h-[450px] lg:h-[500px] bg-gray-100 overflow-hidden rounded-xl mb-5 shadow-sm group">
                <img
                  src={featuredArticle.coverUrl || ''}
                  alt={featuredArticle.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
                
                <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8">
                  <div className="mb-3">
                    <span className="bg-blue-600 text-white text-[10px] sm:text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-sm shadow-md">
                      {featuredArticle.category}
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-4xl lg:text-5xl font-bold font-heading text-white group-hover:text-blue-100 transition-colors mb-2 leading-tight line-clamp-3">
                    {featuredArticle.title}
                  </h2>
                  <div className="flex items-center text-xs sm:text-sm text-gray-300 font-medium">
                    <span className="font-bold text-gray-100">{featuredArticle.author}</span>
                    <span className="mx-2">•</span>
                    <span>
                      {featuredArticle.publishedAt 
                        ? formatDistanceToNow(new Date(featuredArticle.publishedAt), { addSuffix: true, locale: id })
                        : ''}
                    </span>
                  </div>
                </div>
              </Link>
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
                    <div className="text-5xl font-black font-heading text-gray-100 group-hover:text-blue-100 transition-colors -mt-2">
                      {index + 1}
                    </div>
                    <div>
                      <div className="text-blue-600 text-xs font-bold uppercase tracking-wider mb-1">
                        {article.category}
                      </div>
                      <h4 className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors line-clamp-2 text-base leading-snug">
                        <Link href={`/${article.category.toLowerCase()}/${article.id}/${article.slug}`}>{article.title}</Link>
                      </h4>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Latest Articles Grid */}
      {latestArticles.length > 0 && (
        <div className="mt-16">
          <div className="flex items-center mb-8">
            <h3 className="text-2xl font-bold font-heading text-gray-900">Berita Terbaru</h3>
            <div className="ml-4 flex-grow h-px bg-gray-200"></div>
          </div>
          
          <div className="flex flex-col gap-5 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-x-6 sm:gap-y-10">
            {latestArticles.map((article) => (
              <div key={article.id} className="group cursor-pointer">
                <Link href={`/${article.category.toLowerCase()}/${article.id}/${article.slug}`} className="flex flex-row sm:flex-col gap-4 sm:gap-0 sm:h-full items-center sm:items-start">
                  
                  {/* Thumbnail Image */}
                  <div className="relative w-1/3 sm:w-full aspect-[4/3] sm:h-48 sm:aspect-auto bg-gray-100 overflow-hidden rounded-lg sm:rounded-xl sm:mb-4 shadow-sm shrink-0">
                    <img
                      src={article.coverUrl || ''}
                      alt={article.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  
                  {/* Text Content */}
                  <div className="flex flex-col w-2/3 sm:w-full justify-center sm:justify-start">
                    <div className="text-blue-600 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1 sm:mb-2">
                      {article.category}
                    </div>
                    <h4 className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors line-clamp-3 mb-1 sm:mb-3 text-sm sm:text-lg leading-snug sm:flex-grow">
                      {article.title}
                    </h4>
                    <div className="text-[10px] sm:text-xs text-gray-500 font-medium sm:mt-auto">
                      {article.publishedAt 
                        ? formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true, locale: id })
                        : ''}
                    </div>
                  </div>

                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
