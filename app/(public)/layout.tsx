import { db } from "@/db";
import { articles } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Ambil data terbaru untuk konten dinamis di Navbar/Header
  const recentArticles = await db
    .select()
    .from(articles)
    .where(eq(articles.status, 'published'))
    .orderBy(desc(articles.publishedAt))
    .limit(20);

  const breakingNews = recentArticles.length > 0 ? recentArticles[0] : null;

  // Ekstrak tag unik dari artikel-artikel terbaru untuk Trending Pills
  const uniqueTags = new Set<string>();
  recentArticles.forEach(article => {
    if (article.tags && Array.isArray(article.tags)) {
      article.tags.forEach(tag => {
        if (uniqueTags.size < 5 && tag) {
          uniqueTags.add(tag);
        }
      });
    }
  });
  let trendingTags = Array.from(uniqueTags);
  // Fallback jika belum ada tag sama sekali di database
  if (trendingTags.length === 0) {
    trendingTags = ['Teknologi', 'AI', 'Gadget', 'Software', 'Infrastruktur'];
  }

  return (
    <>
      {/* NON-STICKY HEADER */}
      <header className="bg-white flex flex-col">
        {/* Top Bar: Logo & Search */}
        <div className="bg-white py-4 md:py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
            <div className="w-9 md:w-11"></div> {/* Spacer to perfectly center logo against search button */}

            <div className="flex-1 flex justify-center">
              <a href="/" className="text-3xl md:text-5xl font-black font-heading tracking-tighter">
                <span className="text-gray-900">naratif</span><span className="text-gray-400">tekno</span>
              </a>
            </div>

            <div>
              <a href="/cari" className="text-gray-500 hover:text-blue-700 transition-colors bg-gray-100 p-2 md:p-2.5 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </a>
            </div>
          </div>
        </div>

        {/* Constrained Wrapper for Main Navbar */}
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Main Navbar */}
          <div className="relative mb-2 md:mb-4">
            <nav className="bg-gray-900 text-white rounded-lg shadow-sm">
              <div className="px-4 sm:px-5 lg:px-6 overflow-x-auto scrollbar-hide flex items-center justify-start md:justify-center h-10 md:h-12 space-x-6 md:space-x-8">
                {['Software', 'Hardware', 'AI', 'Infrastruktur', 'Gadget'].map((cat) => (
                  <a key={cat} href={`/berita-teknologi/${cat.toLowerCase().replace(' ', '-')}`} className="text-xs md:text-sm font-bold whitespace-nowrap hover:text-gray-300 transition-colors uppercase tracking-wide">
                    {cat}
                  </a>
                ))}
              </div>
            </nav>
            {/* Scroll hint gradient (Mobile only) */}
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-gray-900 to-transparent rounded-r-lg pointer-events-none md:hidden"></div>
          </div>
        </div>
      </header>

      {/* STICKY SECTION (Trending & Breaking News) */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100 py-3 mb-6">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Sub-menu / Trending Tags */}
          <div className="relative mb-3">
            <div className="overflow-x-auto scrollbar-hide">
              <div className="flex items-center space-x-3 text-xs md:text-sm">
                <span className="font-bold text-gray-800 whitespace-nowrap shrink-0 flex items-center">
                  <svg className="w-4 h-4 mr-1 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" /></svg>
                  Trending:
                </span>
                <div className="flex space-x-2">
                  {trendingTags.map(tag => (
                    <Link key={tag} href={`/cari?q=${encodeURIComponent(tag)}`} className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold px-3 py-1.5 rounded-full whitespace-nowrap transition-colors">
                      {tag}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
            {/* Scroll hint gradient (Mobile only) */}
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none md:hidden"></div>
          </div>

          {/* Breaking News Ticker */}
          <div>
            {breakingNews ? (
              <div className="flex items-center">
                <span className="bg-red-600 text-white text-[10px] md:text-xs font-black px-2.5 py-1 rounded-sm mr-3 shrink-0 uppercase tracking-wider shadow-sm">Breaking</span>
                <div className="truncate text-xs md:text-sm font-semibold text-gray-800">
                  <Link href={`/berita-teknologi/${breakingNews.category.toLowerCase()}/${breakingNews.id}/${breakingNews.slug}`} className="hover:text-blue-700 hover:underline transition-colors">
                    {breakingNews.title}
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex items-center">
                <span className="bg-gray-400 text-white text-[10px] md:text-xs font-black px-2.5 py-1 rounded-sm mr-3 shrink-0 uppercase tracking-wider shadow-sm">Info</span>
                <div className="truncate text-xs md:text-sm font-semibold text-gray-500">
                  Belum ada berita terbaru hari ini.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {children}

      <footer className="bg-gray-900 text-white mt-12 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center">
          <div className="mb-6 md:mb-0 text-center md:text-left">
            <a href="/" className="text-3xl font-bold font-heading text-white tracking-tight">Naratif</a>
            <p className="text-gray-400 mt-2 text-sm max-w-sm">Portal berita dan informasi terfokus seputar perkembangan teknologi, pemrograman, hardware, dan inovasi digital setiap hari.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-sm font-medium text-gray-300">
            <a href="/tentang" className="hover:text-white transition-colors">Tentang</a>
            <a href="/redaksi" className="hover:text-white transition-colors">Redaksi</a>
            <a href="/kontak" className="hover:text-white transition-colors">Kontak</a>
            <a href="/privasi" className="hover:text-white transition-colors">Kebijakan Privasi</a>
            <a href="/pedoman" className="hover:text-white transition-colors">Pedoman Media</a>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 pt-8 border-t border-gray-800 text-center text-gray-500 text-xs">
          &copy; 2026 Naratif. All rights reserved.
        </div>
      </footer>
    </>
  );
}
