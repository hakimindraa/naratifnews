import { db } from "@/db";
import { articles } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import { getAdSettings } from "@/lib/ads";
import AdSlot from "./AdSlot";
import NavbarContainer from "./components/navbar";

export const instant = false;

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Ambil pengaturan iklan dinamis
  const adSettings = await getAdSettings();

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
      {/* MODERN NEWSROOM NAVBAR */}
      <NavbarContainer
        breakingNews={
          breakingNews
            ? {
                id: breakingNews.id,
                slug: breakingNews.slug,
                title: breakingNews.title,
                category: breakingNews.category,
              }
            : null
        }
        trendingTags={trendingTags}
      />

      {/* SLOT IKLAN ATAS (HEADER BANNER) */}
      {adSettings.header?.enabled && (
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-4">
          <AdSlot config={adSettings.header} clientId={adSettings.clientId} />
        </div>
      )}

      {children}

      <footer className="bg-gray-900 text-white mt-12 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center">
          <div className="mb-6 md:mb-0 text-center md:text-left">
            <a href="/" className="text-3xl font-bold font-heading text-white tracking-tight">Ada Fakta</a>
            <p className="text-gray-400 mt-2 text-sm max-w-sm">Portal berita dan informasi seputar perkembangan teknologi, sains, isu regional, dan peristiwa terkini.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-sm font-medium text-gray-300">
            <Link href="/tentang" className="hover:text-white transition-colors">Tentang</Link>
            <Link href="/redaksi" className="hover:text-white transition-colors">Redaksi</Link>
            <Link href="/kontak" className="hover:text-white transition-colors">Kontak</Link>
            <Link href="/privasi" className="hover:text-white transition-colors">Kebijakan Privasi</Link>
            <Link href="/pedoman" className="hover:text-white transition-colors">Pedoman Media</Link>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 pt-8 border-t border-gray-800 text-center text-gray-500 text-xs">
          &copy; 2026 Ada Fakta. All rights reserved.
        </div>
      </footer>
    </>
  );
}
