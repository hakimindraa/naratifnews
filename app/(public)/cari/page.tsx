import Link from "next/link";
import { Search } from "lucide-react";
import { db } from "@/db";
import { articles } from "@/db/schema";
import { eq, desc, and, ilike, or } from "drizzle-orm";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";

export const instant = false;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q || '';

  // Pencarian ke database (judul atau excerpt)
  let searchResults: any[] = [];
  
  if (query.trim() !== '') {
    searchResults = await db
      .select()
      .from(articles)
      .where(
        and(
          eq(articles.status, 'published'),
          or(
            ilike(articles.title, `%${query}%`),
            ilike(articles.excerpt, `%${query}%`),
            ilike(articles.content, `%${query}%`) // Opsional, cari di konten juga
          )
        )
      )
      .orderBy(desc(articles.publishedAt))
      .limit(20);
  }

  // Ambil artikel populer
  const popularArticles = await db
    .select()
    .from(articles)
    .where(eq(articles.status, 'published'))
    .orderBy(desc(articles.publishedAt))
    .limit(5);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen">
      <div className="flex flex-col lg:flex-row gap-10">
        
        {/* Main Content (Left Column) */}
        <div className="lg:w-2/3">
          <div className="mb-8 bg-gray-50 p-6 rounded-xl border border-gray-100">
            <h1 className="text-2xl font-bold font-heading text-gray-900 mb-4">Cari Berita</h1>
            <form action="/cari" method="GET" className="relative flex items-center">
              <input 
                type="text" 
                name="q"
                defaultValue={query}
                placeholder="Ketik kata kunci pencarian..." 
                className="w-full px-4 py-3 pl-12 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
              />
              <Search className="w-5 h-5 text-gray-400 absolute left-4" />
              <button type="submit" className="absolute right-2 bg-blue-600 text-white px-4 py-1.5 rounded-md hover:bg-blue-700 font-medium text-sm transition-colors">
                Cari
              </button>
            </form>
          </div>

          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 border-b border-gray-200 pb-2">
              {query 
                ? `Hasil pencarian untuk: "${query}" (${searchResults.length} berita)` 
                : "Masukkan kata kunci untuk memulai pencarian"}
            </h2>
          </div>

          <div className="flex flex-col gap-6">
            {query && searchResults.length === 0 && (
              <div className="text-center py-10 bg-gray-50 rounded-lg">
                <p className="text-gray-500">Tidak ada berita yang cocok dengan kata kunci "{query}".</p>
              </div>
            )}

            {searchResults.map((article) => (
              <div key={article.id} className="group cursor-pointer flex flex-col sm:flex-row gap-5 pb-6 border-b border-gray-100 last:border-0">
                <Link href={`/berita-teknologi/${article.category.toLowerCase()}/${article.id}/${article.slug}`} className="sm:w-1/3 shrink-0">
                  <div className="relative w-full h-40 sm:h-28 overflow-hidden rounded-lg shadow-sm">
                    <img
                      src={article.coverUrl || ''}
                      alt={article.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                </Link>
                <div className="sm:w-2/3 flex flex-col">
                  <div className="text-blue-600 text-xs font-bold uppercase tracking-wider mb-1">
                    {article.category}
                  </div>
                  <h3 className="text-lg font-bold font-heading text-gray-900 group-hover:text-blue-700 transition-colors line-clamp-2 mb-2 leading-snug">
                    <Link href={`/berita-teknologi/${article.category.toLowerCase()}/${article.id}/${article.slug}`}>{article.title}</Link>
                  </h3>
                  <div className="text-xs text-gray-500 font-medium mt-auto">
                     {article.publishedAt ? formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true, locale: idLocale }) : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar (Right Column) */}
        <aside className="lg:w-1/3">
          <div className="sticky top-24">
            <div className="flex items-center mb-6">
              <h3 className="text-xl font-bold font-heading text-gray-900">Populer Hari Ini</h3>
              <div className="ml-4 flex-grow h-px bg-gray-200"></div>
            </div>
            
            <div className="flex flex-col gap-5">
              {popularArticles.length === 0 ? (
                <p className="text-gray-500 text-sm">Belum ada berita populer.</p>
              ) : (
                popularArticles.map((pop, index) => (
                  <div key={pop.id} className="flex gap-4 group cursor-pointer">
                    <div className="text-4xl font-black font-heading text-gray-200 group-hover:text-blue-200 transition-colors -mt-1">
                      {index + 1}
                    </div>
                    <div>
                      <div className="text-blue-600 text-xs font-bold uppercase tracking-wider mb-1">
                        {pop.category}
                      </div>
                      <h4 className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors line-clamp-2 text-sm leading-snug">
                        <Link href={`/berita-teknologi/${pop.category.toLowerCase()}/${pop.id}/${pop.slug}`}>{pop.title}</Link>
                      </h4>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
