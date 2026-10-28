import Link from "next/link";
import { db } from "@/db";
import { articles } from "@/db/schema";
import { eq, desc, asc, notInArray, and } from "drizzle-orm";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import LatestNewsSection from "./LatestNewsSection";
import DailyAssistanceWidget from "./DailyAssistanceWidget";
import KabarNusantaraSection from "./KabarNusantaraSection";
import ThematicSidebar from "./ThematicSidebar";
import CenterCarousel from "./CenterCarousel";

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

  // 4b. Carousel Berita Pilihan Redaksi untuk Kolom Tengah (6 Artikel)
  const carouselArticles = publishedArticles.slice(6, 12).map((a) => ({
    id: a.id,
    slug: a.slug,
    title: a.title,
    coverUrl: a.coverUrl,
    category: a.category,
    publishedAt: a.publishedAt ? a.publishedAt.toISOString() : null,
  }));

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

  // 7. Berita Terbaru (Feed Utama: 30 Berita Awal)
  const rawLatestArticles = publishedArticles.slice(11, 41);
  const hasMore = publishedArticles.length > 41;

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
        <section aria-label="Berita Utama & Pilihan Redaksi" className="mb-6 sm:mb-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-0 border-b border-gray-200 pb-8 sm:pb-10">
            {/* ======================================================== */}
            {/* KOLOM KIRI (25% / lg:col-span-3): Berita Pilihan & Analisis */}
            {/* ======================================================== */}
            <div className="lg:col-span-3 flex flex-col justify-between lg:pr-6 lg:border-r lg:border-gray-200 px-3.5 sm:px-0 space-y-5">
              {/* 1. Berita Sorotan Pilihan 1 dengan Foto 16:9 */}
              {sorotanArticles.length > 0 && (
                <article className="group">
                  <Link
                    href={`/berita/${sorotanArticles[0].category.toLowerCase()}/${sorotanArticles[0].id}/${sorotanArticles[0].slug}`}
                    className="block"
                  >
                    <div className="aspect-video w-full overflow-hidden bg-gray-100 mb-2.5">
                      <img
                        src={sorotanArticles[0].coverUrl || ''}
                        alt={sorotanArticles[0].title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                    <span className="text-red-600 font-bold uppercase text-[11px] tracking-wider block mb-1">
                      {sorotanArticles[0].category}
                    </span>
                    <h3 className="font-heading font-medium text-gray-900 group-hover:text-red-700 transition-colors text-base sm:text-lg leading-snug line-clamp-3">
                      {sorotanArticles[0].title}
                    </h3>
                  </Link>
                </article>
              )}

              {/* 2. Peluru Berita Analisis / Baca Juga dipisah hairline horizontal */}
              {bacaJugaArticles.length > 0 && (
                <div className="divide-y divide-gray-200 pt-2 border-t border-gray-200 space-y-3.5">
                  {bacaJugaArticles.map((bj, i) => (
                    <article key={bj.id} className="pt-3.5 first:pt-0 group">
                      <Link
                        href={`/berita/${bj.category.toLowerCase()}/${bj.id}/${bj.slug}`}
                        className="block"
                      >
                        <span className="text-[11px] font-bold uppercase tracking-wider text-red-600 block mb-1">
                          {i === 0 ? "Terkini" : "Analisis"}
                        </span>
                        <h4 className="font-heading font-medium text-gray-900 group-hover:text-red-600 transition-colors text-sm sm:text-[15px] leading-snug line-clamp-3">
                          {bj.title}
                        </h4>
                      </Link>
                    </article>
                  ))}
                </div>
              )}

              {/* 3. Sorotan Tambahan di Bawah */}
              {sorotanArticles.length > 1 && (
                <article className="pt-4 border-t border-gray-200 group">
                  <Link
                    href={`/berita/${sorotanArticles[1].category.toLowerCase()}/${sorotanArticles[1].id}/${sorotanArticles[1].slug}`}
                    className="flex items-start gap-3"
                  >
                    <div className="w-20 h-16 shrink-0 overflow-hidden bg-gray-100">
                      <img
                        src={sorotanArticles[1].coverUrl || ''}
                        alt={sorotanArticles[1].title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                        {sorotanArticles[1].category}
                      </span>
                      <h4 className="font-heading font-medium text-xs sm:text-sm text-gray-900 group-hover:text-red-600 transition-colors line-clamp-2 leading-snug mt-0.5">
                        {sorotanArticles[1].title}
                      </h4>
                    </div>
                  </Link>
                </article>
              )}
            </div>

            {/* ======================================================== */}
            {/* KOLOM TENGAH (50% / lg:col-span-6): LEAD STORY RAKSASA ALA CNN */}
            {/* ======================================================== */}
            <div className="lg:col-span-6 flex flex-col justify-between lg:px-8 lg:border-r lg:border-gray-200 px-3.5 sm:px-0">
              <article className="group flex flex-col">
                {/* 1. JUDUL RAKSASA DI ATAS FOTO (Ciri Khas Paling Kuat CNN) */}
                <Link
                  href={`/berita/${featuredArticle.category.toLowerCase()}/${featuredArticle.id}/${featuredArticle.slug}`}
                  className="block mb-3.5"
                >
                  <h2 className="font-heading font-normal text-2xl sm:text-3xl lg:text-[32px] leading-snug text-gray-900 group-hover:text-red-700 transition-colors">
                    {featuredArticle.title}
                  </h2>
                </Link>

                {/* 2. FOTO HERO JUMBO 16:9 */}
                <Link
                  href={`/berita/${featuredArticle.category.toLowerCase()}/${featuredArticle.id}/${featuredArticle.slug}`}
                  className="w-full relative overflow-hidden bg-gray-100 aspect-video block mb-3.5"
                >
                  <img
                    src={featuredArticle.coverUrl || ''}
                    alt={featuredArticle.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-102"
                  />
                </Link>

                {/* 3. METADATA & DECK NARASI PEMBUKA */}
                <div className="flex items-center gap-2 mb-2 text-xs">
                  <span className="text-red-600 font-bold uppercase text-[11px] tracking-wider">
                    {featuredArticle.category}
                  </span>
                  <span className="text-gray-300">•</span>
                  {featuredArticle.publishedAt && (
                    <span className="text-gray-500 font-medium text-xs">
                      {formatDistanceToNow(new Date(featuredArticle.publishedAt), { addSuffix: true, locale: id })}
                    </span>
                  )}
                </div>

                {/* 4. SUB-PELURU BERITA TERKAIT DI BAWAH FOTO HERO */}
                {sorotanArticles.length > 2 && (
                  <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                    <Link
                      href={`/berita/${sorotanArticles[2].category.toLowerCase()}/${sorotanArticles[2].id}/${sorotanArticles[2].slug}`}
                      className="flex items-start gap-2 group/sub text-xs sm:text-sm text-gray-800 hover:text-red-600 transition-colors leading-snug"
                    >
                      <span className="text-gray-400 font-bold">•</span>
                      <span className="font-medium underline underline-offset-2">
                        {sorotanArticles[2].title}
                      </span>
                    </Link>
                  </div>
                )}

                {/* 5. CAROUSEL AUTO-SWIPE PILIHAN REDAKSI */}
                <CenterCarousel articles={carouselArticles} />
              </article>
            </div>

            {/* ======================================================== */}
            {/* KOLOM KANAN (25% / lg:col-span-3): POPULER HARI INI & KILAS BALIK */}
            {/* ======================================================== */}
            <div className="lg:col-span-3 flex flex-col justify-between lg:pl-6 px-3.5 sm:px-0 space-y-6">
              {/* POPULER HARI INI (CNN Right-Rail Style) */}
              <div>
                <div className="flex items-center justify-between pb-2 mb-3.5 border-b-2 border-black">
                  <h3 className="text-xs sm:text-sm font-bold font-heading text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span>Populer Hari Ini</span>
                  </h3>
                </div>

                <div className="divide-y divide-gray-100">
                  {popularArticles.map((article, index) => (
                    <Link
                      key={article.id}
                      href={`/berita/${article.category.toLowerCase()}/${article.id}/${article.slug}`}
                      className="py-2.5 sm:py-3 first:pt-0 group flex items-start gap-3 cursor-pointer"
                    >
                      <span className="text-lg sm:text-xl font-bold font-heading text-gray-400 group-hover:text-red-600 transition-colors shrink-0 leading-none w-5 text-center pt-0.5">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-heading font-medium text-gray-900 group-hover:text-red-600 transition-colors line-clamp-2 text-xs sm:text-sm leading-snug">
                          {article.title}
                        </h4>
                        {article.publishedAt && (
                          <span className="text-[10px] text-gray-400 mt-1 block">
                            {formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true, locale: id })}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* KILAS BALIK ARSIP */}
              {kilasBalikArticles.length > 0 && (
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between pb-1.5 mb-2.5 border-b border-gray-200">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      Kilas Balik Arsip
                    </span>
                  </div>
                  <Link
                    href={`/berita/${kilasBalikArticles[0].category.toLowerCase()}/${kilasBalikArticles[0].id}/${kilasBalikArticles[0].slug}`}
                    className="group block"
                  >
                    <div className="aspect-video w-full overflow-hidden bg-gray-100 mb-2">
                      <img
                        src={kilasBalikArticles[0].coverUrl || ''}
                        alt={kilasBalikArticles[0].title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <h4 className="font-heading font-medium text-xs sm:text-sm text-gray-900 group-hover:text-red-600 transition-colors line-clamp-2 leading-snug">
                      {kilasBalikArticles[0].title}
                    </h4>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Widget Bilah Data Finansial & Cuaca (Market & Weather Bar ala CNN) */}
          <DailyAssistanceWidget />
        </section>
      )}

      {/* Seksi Khusus: Kabar Nusantara (Pojok Daerah) */}
      <KabarNusantaraSection articles={regionalArticles} />

      {/* Bagian Bawah: Feed Berita Terbaru (Lebar 8) + Sidebar Tematik (Lebar 4 Desktop Only) */}
      <div className="mt-8 sm:mt-14 grid grid-cols-1 lg:grid-cols-12 gap-0 items-start">
        {/* Kolom Kiri: Feed Berita Terbaru (Stream Horizontal & Selingan Highlight) */}
        <div className="lg:col-span-8 min-w-0 lg:pr-8">
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

        {/* Kolom Kanan: Sidebar Tematik Desktop dengan Garis Vertikal Pemisah Koran */}
        {/* Disembunyikan di mobile (hidden lg:block) karena di mobile sudah diselipkan rapi di sela-sela feed */}
        <div className="hidden lg:block lg:col-span-4 min-w-0 lg:pl-8 lg:border-l lg:border-gray-200 lg:sticky lg:top-24">
          <ThematicSidebar
            nasionalArticles={nasionalArticles}
            internasionalArticles={internasionalArticles}
            sportArticles={sportArticles}
          />
        </div>
      </div>
    </div>
  );
}
