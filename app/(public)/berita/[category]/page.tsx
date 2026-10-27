import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { db } from "@/db";
import { articles } from "@/db/schema";
import { eq, desc, and, ilike } from "drizzle-orm";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";

import type { Metadata } from "next";

export const instant = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const rawCat = decodeURIComponent(category).trim().toLowerCase();
  const categoryMap: Record<string, string> = {
    'ai': 'AI',
    'software': 'Software',
    'hardware': 'Hardware',
    'infrastruktur': 'Infrastruktur',
    'gadget': 'Gadget',
    'regional': 'Regional',
    'nasional': 'Nasional',
    'internasional': 'Internasional',
    'sport': 'Sport',
  };
  const categoryName = categoryMap[rawCat] || (category.charAt(0).toUpperCase() + category.slice(1));
  const isRegional = rawCat === 'regional';
  const title = isRegional
    ? `Berita Regional Terkini & Kebijakan Daerah - Ada Fakta`
    : `Berita ${categoryName} Terkini - Ada Fakta`;
  const description = isRegional
    ? `Kumpulan berita regional terkini, dinamika pemerintahan daerah, dan isu fasilitas publik di Ada Fakta.`
    : `Kumpulan berita, analisis, dan informasi terkini seputar ${categoryName} di Ada Fakta.`;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.adafakta.web.id';

  return {
    title,
    description,
    alternates: {
      canonical: `${siteUrl}/berita/${rawCat}`,
    },
    openGraph: {
      title,
      description,
      type: 'website',
    },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const rawCat = decodeURIComponent(category).trim().toLowerCase();
  const categoryMap: Record<string, string> = {
    'ai': 'AI',
    'software': 'Software',
    'hardware': 'Hardware',
    'infrastruktur': 'Infrastruktur',
    'gadget': 'Gadget',
    'regional': 'Regional',
    'nasional': 'Nasional',
    'internasional': 'Internasional',
    'sport': 'Sport',
  };
  const categoryName = categoryMap[rawCat] || (category.charAt(0).toUpperCase() + category.slice(1));

  // Ambil artikel per kategori yang published (case-insensitive)
  const categoryArticles = await db
    .select()
    .from(articles)
    .where(
      and(
        eq(articles.status, 'published'),
        ilike(articles.category, categoryName)
      )
    )
    .orderBy(desc(articles.publishedAt))
    .limit(10);

  // Ambil artikel populer (semua kategori) untuk sidebar
  const popularArticles = await db
    .select()
    .from(articles)
    .where(eq(articles.status, 'published'))
    .orderBy(desc(articles.publishedAt))
    .limit(5);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumbs */}
      <nav className="flex text-sm text-gray-500 mb-6 items-center">
        <Link href="/" className="hover:text-gray-900 transition-colors">Home</Link>
        <ChevronRight className="w-4 h-4 mx-2" />
        <span className="text-gray-900 font-medium">{categoryName}</span>
      </nav>

      <div className="flex flex-col lg:flex-row gap-10">
        {/* Main Content (Left Column) */}
        <div className="lg:w-2/3">
          <div className="flex items-center mb-8">
            <h1 className="text-3xl font-bold font-heading text-gray-900 uppercase tracking-tight">
              Indeks <span className="text-gray-900">{categoryName}</span>
            </h1>
            <div className="ml-4 flex-grow h-px bg-gray-200"></div>
          </div>

          <div className="flex flex-col gap-8">
            {categoryArticles.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-sm border border-gray-100">
                <p className="text-gray-500 text-lg">Belum ada berita di kategori {categoryName}.</p>
              </div>
            ) : (
              categoryArticles.map((article) => (
                <div key={article.id} className="group cursor-pointer flex flex-col sm:flex-row gap-6 pb-8 border-b border-gray-100 last:border-0">
                  <Link href={`/berita/${category.toLowerCase()}/${article.id}/${article.slug}`} className="sm:w-1/3 shrink-0">
                    <div className="relative w-full h-48 sm:h-32 overflow-hidden rounded-sm shadow-sm">
                      <img
                        src={article.coverUrl || ''}
                        alt={article.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                  </Link>
                  <div className="sm:w-2/3 flex flex-col">
                    <div className="text-gray-900 text-xs font-bold uppercase tracking-wider mb-2">
                      {article.category}
                    </div>
                    <h2 className="text-xl font-bold font-heading text-gray-900 group-hover:text-gray-600 transition-colors line-clamp-2 mb-2 leading-snug">
                      <Link href={`/berita/${category.toLowerCase()}/${article.id}/${article.slug}`}>{article.title}</Link>
                    </h2>
                    <p className="text-gray-600 text-sm line-clamp-2 mb-3 flex-grow">
                      {article.excerpt}
                    </p>
                    <div className="text-xs text-gray-500 font-medium mt-auto">
                      {article.publishedAt ? formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true, locale: idLocale }) : ''}
                    </div>
                  </div>
                </div>
              ))
            )}
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
                popularArticles.map((article, index) => (
                  <div key={article.id} className="flex gap-4 group cursor-pointer">
                    <div className="text-4xl font-bold font-heading text-gray-200 group-hover:text-gray-300 transition-colors -mt-1">
                      {index + 1}
                    </div>
                    <div>
                      <div className="text-gray-900 text-xs font-bold uppercase tracking-wider mb-1">
                        {article.category}
                      </div>
                      <h4 className="font-bold text-gray-900 group-hover:text-gray-600 transition-colors line-clamp-2 text-sm leading-snug">
                        <Link href={`/berita/${article.category.toLowerCase()}/${article.id}/${article.slug}`}>{article.title}</Link>
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
