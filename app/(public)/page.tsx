import Link from "next/link";
import { db } from "@/db";
import { articles } from "@/db/schema";
import { eq, desc, asc, notInArray, and, sql } from "drizzle-orm";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import LatestNewsSection from "./LatestNewsSection";
import DailyAssistanceWidget from "./DailyAssistanceWidget";
import KabarNusantaraSection from "./KabarNusantaraSection";
import ThematicSidebar from "./ThematicSidebar";
import KanalEksplorasiSection from "./components/KanalEksplorasiSection";

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

  // 6. Kabar Nusantara: Mengambil 4 artikel Regional terbitan terbaru
  let rawRegionalArticles: typeof publishedArticles = [];
  try {
    rawRegionalArticles = await db
      .select()
      .from(articles)
      .where(and(eq(articles.status, 'published'), eq(articles.category, 'Regional')))
      .orderBy(desc(articles.publishedAt))
      .limit(4);
  } catch (err) {
    console.warn("Gagal memuat kabar nusantara:", err);
  }

  const regionalArticles = rawRegionalArticles.map((a) => ({
    id: a.id,
    slug: a.slug,
    title: a.title,
    coverUrl: a.coverUrl,
    category: a.category,
    tags: a.tags,
    publishedAt: a.publishedAt ? a.publishedAt.toISOString() : null,
    author: a.author,
  }));

  // 7. Berita Terbaru (Feed Utama)
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

  // 8. Sorot Tematik: Nasional, Internasional, Sport untuk Sidebar Samping Berita Terbaru
  let rawNasional: typeof publishedArticles = [];
  let rawInternasional: typeof publishedArticles = [];
  let rawSport: typeof publishedArticles = [];

  try {
    const [resNas, resInt, resSpo] = await Promise.all([
      db
        .select()
        .from(articles)
        .where(and(eq(articles.status, 'published'), eq(articles.category, 'Nasional')))
        .orderBy(desc(articles.publishedAt))
        .limit(4),
      db
        .select()
        .from(articles)
        .where(and(eq(articles.status, 'published'), eq(articles.category, 'Internasional')))
        .orderBy(desc(articles.publishedAt))
        .limit(4),
      db
        .select()
        .from(articles)
        .where(and(eq(articles.status, 'published'), eq(articles.category, 'Sport')))
        .orderBy(desc(articles.publishedAt))
        .limit(4),
    ]);
    rawNasional = resNas;
    rawInternasional = resInt;
    rawSport = resSpo;
  } catch (err) {
    console.warn("Gagal memuat berita tematik sidebar:", err);
  }

  const mapToThematicItem = (a: typeof publishedArticles[0]) => ({
    id: a.id,
    slug: a.slug,
    title: a.title,
    coverUrl: a.coverUrl,
    category: a.category,
    publishedAt: a.publishedAt ? a.publishedAt.toISOString() : null,
  });

  const nasionalArticles = rawNasional.map(mapToThematicItem);
  const internasionalArticles = rawInternasional.map(mapToThematicItem);
  const sportArticles = rawSport.map(mapToThematicItem);

  // 9. Query Kanal & Kategori untuk Seksi Eksplorasi Bawah Halaman
  const categoryDefs = [
    { name: "Nasional", slug: "nasional", dbCategory: "Nasional", iconName: "nasional" },
    { name: "Regional", slug: "regional", dbCategory: "Regional", iconName: "regional" },
    { name: "AI & Otomasi", slug: "ai", dbCategory: "AI", iconName: "ai" },
    { name: "Gadget", slug: "gadget", dbCategory: "Gadget", iconName: "gadget" },
    { name: "Software & Web", slug: "software", dbCategory: "Software", iconName: "software" },
    { name: "Hardware", slug: "hardware", dbCategory: "Hardware", iconName: "hardware" },
    { name: "Infrastruktur", slug: "infrastruktur", dbCategory: "Infrastruktur", iconName: "infrastruktur" },
    { name: "Internasional", slug: "internasional", dbCategory: "Internasional", iconName: "internasional" },
    { name: "Sport", slug: "sport", dbCategory: "Sport", iconName: "sport" },
  ];

  // Hitung jumlah artikel per kategori
  let rawCategoryCounts: { category: string; count: number }[] = [];
  try {
    rawCategoryCounts = await db
      .select({
        category: articles.category,
        count: sql<number>`count(*)::int`,
      })
      .from(articles)
      .where(eq(articles.status, 'published'))
      .groupBy(articles.category);
  } catch (err) {
    console.warn("Gagal memuat kategori counts:", err);
  }

  const categoryCountsMap = new Map<string, number>();
  rawCategoryCounts.forEach((r) => {
    categoryCountsMap.set(r.category.toLowerCase(), r.count);
  });

  // Query 3 artikel terbaru untuk setiap kategori
  const channelResults = await Promise.all(
    categoryDefs.map(async (def) => {
      let rows: typeof publishedArticles = [];
      try {
        rows = await db
          .select()
          .from(articles)
          .where(and(eq(articles.status, 'published'), eq(articles.category, def.dbCategory)))
          .orderBy(desc(articles.publishedAt))
          .limit(3);
      } catch (err) {
        console.warn(`Gagal memuat artikel kategori ${def.dbCategory}:`, err);
      }

      const latest = rows.length > 0 ? rows[0] : null;
      const subs = rows.slice(1).map((r) => ({
        id: r.id,
        slug: r.slug,
        title: r.title,
        coverUrl: r.coverUrl,
        category: r.category,
        publishedAt: r.publishedAt ? r.publishedAt.toISOString() : null,
      }));

      return {
        name: def.name,
        slug: def.slug,
        iconName: def.iconName,
        totalArticles: categoryCountsMap.get(def.slug) || rows.length,
        latestArticle: latest
          ? {
              id: latest.id,
              slug: latest.slug,
              title: latest.title,
              coverUrl: latest.coverUrl,
              category: latest.category,
              publishedAt: latest.publishedAt ? latest.publishedAt.toISOString() : null,
            }
          : null,
        subArticles: subs,
      };
    })
  );

  // Kumpulkan trending tags dari artikel terbit
  const uniqueTags = new Set<string>();
  publishedArticles.forEach((article) => {
    if (article.tags && Array.isArray(article.tags)) {
      article.tags.forEach((tag) => {
        if (uniqueTags.size < 8 && tag && typeof tag === 'string') {
          uniqueTags.add(tag);
        }
      });
    }
  });
  let trendingTags = Array.from(uniqueTags);
  if (trendingTags.length === 0) {
    trendingTags = ['Teknologi', 'AI', 'Gadget', 'Software', 'Infrastruktur', 'Nasional', 'Regional'];
  }

  return (
    <div className="max-w-7xl mx-auto px-0 sm:px-6 lg:px-8 py-0 sm:py-8">
      {/* H1 Semantik Brand & SEO untuk Google Search & Aksesibilitas */}
      <h1 className="sr-only">Ada Fakta: Berita Terkini Hari Ini, Fakta Aktual Terpercaya</h1>

      {publishedArticles.length === 0 && (
        <div className="text-center py-20 bg-white rounded-sm border border-gray-200 mx-4 sm:mx-0">
          <h2 className="text-2xl font-bold text-gray-700 mb-2">Belum Ada Berita yang Terbit</h2>
          <p className="text-gray-500">
            Silakan unggah artikel Markdown melalui panel admin dengan waktu terbit (publish_at) di masa lalu agar muncul di sini.
          </p>
        </div>
      )}

      {featuredArticle && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 mb-8 sm:mb-12">
          {/* KOLOM KIRI (LEBAR 6 DARI 12): Headline Utama + Baca Juga + Berita Sorotan */}
          <div className="lg:col-span-6 flex flex-col">
            {/* Card Headline Utama (Mobile: Full-Bleed Edge-to-Edge) */}
            <div className="flex flex-col w-full bg-white border-b sm:border border-gray-100 overflow-hidden rounded-none sm:rounded-sm mb-4 sm:mb-6 shadow-2xs sm:shadow-xs hover:shadow-md transition-all group">
              <Link
                href={`/berita/${featuredArticle.category.toLowerCase()}/${featuredArticle.id}/${featuredArticle.slug}`}
                className="w-full relative overflow-hidden bg-gray-50 aspect-video block"
              >
                <img
                  src={featuredArticle.coverUrl || ''}
                  alt={featuredArticle.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </Link>

              <div className="p-3.5 sm:p-7 flex flex-col justify-center bg-white">
                <div className="mb-2 sm:mb-3 flex items-center gap-2">
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-500">
                    {featuredArticle.category}
                  </span>
                  <span className="text-xs text-gray-300 font-medium">•</span>
                  <span className="text-xs text-gray-400 font-medium">Headline</span>
                </div>

                <Link
                  href={`/berita/${featuredArticle.category.toLowerCase()}/${featuredArticle.id}/${featuredArticle.slug}`}
                >
                  <h2 className="text-lg sm:text-2xl lg:text-3xl font-semibold text-gray-900 group-hover:text-gray-600 transition-colors mb-2 leading-snug line-clamp-3">
                    {featuredArticle.title}
                  </h2>
                </Link>

                {featuredArticle.publishedAt && (
                  <div className="text-[11px] sm:text-xs text-gray-400 font-medium">
                    {formatDistanceToNow(new Date(featuredArticle.publishedAt), { addSuffix: true, locale: id })}
                  </div>
                )}

                {/* BACA JUGA (Format Minimalis Inline ala Kompas) */}
                {bacaJugaArticles.length > 0 && (
                  <div className="mt-3.5 pt-3 border-t border-gray-100 space-y-1.5">
                    {bacaJugaArticles.map((bj) => (
                      <div key={bj.id} className="text-xs sm:text-sm leading-relaxed">
                        <span className="font-semibold text-gray-700 mr-1.5">Baca juga:</span>
                        <Link
                          href={`/berita/${bj.category.toLowerCase()}/${bj.id}/${bj.slug}`}
                          className="text-gray-900 hover:text-gray-600 font-medium underline underline-offset-2 transition-colors"
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
              <div className="space-y-3 px-3.5 sm:px-0 mb-6 sm:mb-0">
                <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                  <div className="flex items-center gap-2">
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
                      href={`/berita/${art.category.toLowerCase()}/${art.id}/${art.slug}`}
                      className="group flex flex-col bg-white rounded-sm border border-gray-100 overflow-hidden shadow-2xs hover:shadow-sm transition-all w-[240px] sm:w-auto shrink-0 snap-start"
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
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 block mb-1">
                            {art.category}
                          </span>
                          <h4 className="font-semibold text-gray-900 group-hover:text-gray-600 transition-colors line-clamp-2 text-xs sm:text-sm leading-snug">
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
          <div className="lg:col-span-6 flex flex-col justify-between lg:border-l lg:border-gray-200/80 lg:pl-8 px-3.5 sm:px-0">
            {/* Subgrid: Populer Hari Ini (col 1) & Kilas Balik (col 2) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
              {/* Populer Hari Ini */}
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-4 sm:mb-5 pb-2 border-b border-gray-200">
                  <h3 className="text-sm sm:text-base font-bold font-heading text-gray-900 flex items-center gap-2">
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
                        href={`/berita/${article.category.toLowerCase()}/${article.id}/${article.slug}`}
                        className="py-2.5 sm:py-3.5 first:pt-0 group flex items-start gap-3 cursor-pointer"
                      >
                        <span className="text-xl sm:text-2xl font-bold font-heading text-gray-400 group-hover:text-gray-900 transition-colors shrink-0 leading-none w-5 sm:w-7 text-center pt-0.5">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-semibold text-gray-900 group-hover:text-gray-600 transition-colors line-clamp-2 text-[14px] sm:text-sm leading-[1.35]">
                            {article.title}
                          </h4>
                          {article.publishedAt && (
                            <span className="text-[11px] text-gray-400 font-normal mt-1 block">
                              {formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true, locale: id })}
                            </span>
                          )}
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
                          href={`/berita/${kilasBalikArticles[0].category.toLowerCase()}/${kilasBalikArticles[0].id}/${kilasBalikArticles[0].slug}`}
                          className="group block bg-gray-50/80 rounded-sm border border-gray-100 overflow-hidden shadow-2xs hover:shadow-xs transition-all"
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
                              <span className="font-bold uppercase text-gray-500">{kilasBalikArticles[0].category}</span>
                              <span>
                                {kilasBalikArticles[0].publishedAt
                                  ? formatDistanceToNow(new Date(kilasBalikArticles[0].publishedAt), { addSuffix: true, locale: id })
                                  : ''}
                              </span>
                            </div>
                            <h4 className="font-semibold text-gray-900 group-hover:text-gray-600 transition-colors line-clamp-2 text-xs sm:text-sm leading-snug">
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
                            href={`/berita/${kb.category.toLowerCase()}/${kb.id}/${kb.slug}`}
                            className="py-3 first:pt-0 group flex items-center gap-3"
                          >
                            <div className="w-16 h-12 rounded-sm overflow-hidden bg-gray-100 shrink-0 border border-gray-100">
                              <img
                                src={kb.coverUrl || ''}
                                alt={kb.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="font-semibold text-gray-900 group-hover:text-gray-600 transition-colors line-clamp-2 text-xs leading-snug">
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

      {/* Seksi Khusus: Kabar Nusantara (Pojok Daerah) */}
      <KabarNusantaraSection articles={regionalArticles} />

      {/* Bagian Bawah: Feed Berita Terbaru (Lebar 8) + Sidebar Tematik (Lebar 4 Desktop Only) */}
      <div className="mt-6 sm:mt-14 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
        {/* Kolom Kiri: Feed Berita Terbaru (Mobile: 2 Kolom dengan Selingan Carousel Tematik) */}
        <div className="lg:col-span-8 min-w-0">
          <LatestNewsSection
            initialArticles={initialLatestArticles}
            initialHasMore={hasMore}
            initialOffset={11 + rawLatestArticles.length}
            thematicData={{
              nasional: nasionalArticles,
              internasional: internasionalArticles,
              sport: sportArticles,
            }}
          />
        </div>

        {/* Kolom Kanan: Sidebar Tematik Desktop (Nasional, Internasional, Sport) */}
        {/* Disembunyikan di mobile (hidden lg:block) karena di mobile sudah diselipkan rapi di sela-sela feed */}
        <div className="hidden lg:block lg:col-span-4 min-w-0 lg:sticky lg:top-24">
          <ThematicSidebar
            nasionalArticles={nasionalArticles}
            internasionalArticles={internasionalArticles}
            sportArticles={sportArticles}
          />
        </div>
      </div>

      {/* Seksi Eksplorasi Kanal & Topik Hangat (Memenuhi Bagian Bawah dengan Informasi Lengkap) */}
      <KanalEksplorasiSection
        channels={channelResults}
        trendingTags={trendingTags}
      />
    </div>
  );
}
