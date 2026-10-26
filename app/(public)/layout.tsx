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

      <footer className="bg-gray-950 text-white mt-12 sm:mt-16 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            {/* Kolom 1: Brand & Deskripsi (Lebar 5) */}
            <div className="md:col-span-5 text-center md:text-left space-y-3">
              <Link href="/" className="text-2xl sm:text-3xl font-black font-heading text-white tracking-tight inline-block">
                Ada Fakta.
              </Link>
              <p className="text-gray-400 text-xs sm:text-sm leading-relaxed max-w-sm mx-auto md:mx-0">
                Media informasi dan jurnalisme terpercaya seputar perkembangan sains, kecerdasan buatan, teknologi, isu nasional, dan kabar nusantara.
              </p>
              <div className="pt-2 text-[11px] text-gray-500">
                Pemberitaan berpedoman pada Kode Etik Jurnalistik dan Pedoman Media Siber.
              </div>
            </div>

            {/* Kolom 2: Kanal Berita (Lebar 4) */}
            <div className="md:col-span-4 text-center md:text-left">
              <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                Kanal Berita
              </h5>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-2.5 gap-x-4 text-xs font-medium text-gray-300">
                <Link href="/berita/nasional" className="hover:text-white transition-colors">Nasional</Link>
                <Link href="/berita/regional" className="hover:text-white transition-colors">Regional</Link>
                <Link href="/berita/internasional" className="hover:text-white transition-colors">Internasional</Link>
                <Link href="/berita/ai" className="hover:text-white transition-colors">AI & Otomasi</Link>
                <Link href="/berita/gadget" className="hover:text-white transition-colors">Gadget</Link>
                <Link href="/berita/software" className="hover:text-white transition-colors">Software</Link>
                <Link href="/berita/hardware" className="hover:text-white transition-colors">Hardware</Link>
                <Link href="/berita/infrastruktur" className="hover:text-white transition-colors">Infrastruktur</Link>
                <Link href="/berita/sport" className="hover:text-white transition-colors">Sport</Link>
              </div>
            </div>

            {/* Kolom 3: Navigasi Redaksi & Legal (Lebar 3) */}
            <div className="md:col-span-3 text-center md:text-left">
              <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                Informasi & Redaksi
              </h5>
              <div className="flex flex-col space-y-2 text-xs font-medium text-gray-300">
                <Link href="/tentang" className="hover:text-white transition-colors">Tentang Kami</Link>
                <Link href="/redaksi" className="hover:text-white transition-colors">Susunan Redaksi</Link>
                <Link href="/kontak" className="hover:text-white transition-colors">Kontak & Kerjasama</Link>
                <Link href="/pedoman" className="hover:text-white transition-colors">Pedoman Media Siber</Link>
                <Link href="/privasi" className="hover:text-white transition-colors">Kebijakan Privasi</Link>
              </div>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-gray-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-gray-500 text-xs text-center sm:text-left">
            <div>
              &copy; 2026 Ada Fakta. Hak Cipta Dilindungi Undang-Undang.
            </div>
            <div className="text-[11px] text-gray-500">
              Dikembangkan untuk literasi informasi Indonesia yang jernih dan mendalam.
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
