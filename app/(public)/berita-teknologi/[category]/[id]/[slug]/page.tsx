import Link from "next/link";
import { ArrowLeft, ChevronRight, Link2, MessageCircle } from "lucide-react";
import { db } from "@/db";
import { articles } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { notFound } from "next/navigation";
import { Metadata } from "next";
import ShareButtons from "./ShareButtons";

export const instant = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; id: string; slug: string }>;
}): Promise<Metadata> {
  const { category, id: paramId, slug } = await params;
  const articleId = parseInt(paramId, 10);
  
  if (isNaN(articleId)) {
    return { title: 'Not Found' };
  }

  const [article] = await db
    .select()
    .from(articles)
    .where(eq(articles.id, articleId))
    .limit(1);

  if (!article) {
    return { title: 'Not Found' };
  }

  // Buat deskripsi singkat dari konten (hapus karakter markdown dasar dan ambil 160 karakter pertama)
  const plainTextContent = article.content.replace(/[#*`_\[\]()]/g, ' ').replace(/\s+/g, ' ').substring(0, 160).trim() + '...';
  
  // URL lengkap artikel dari domain aktif
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.naratif.web.id';
  const articleUrl = `${siteUrl}/berita-teknologi/${category}/${articleId}/${slug}`;

  return {
    title: `${article.title} - Naratif Tekno`,
    description: plainTextContent,
    openGraph: {
      title: article.title,
      description: plainTextContent,
      url: articleUrl,
      siteName: 'Naratif Tekno',
      images: [
        {
          url: article.coverUrl || '', // WhatsApp/Facebook akan mengambil gambar ini
          width: 1200,
          height: 630,
          alt: article.title,
        },
      ],
      locale: 'id_ID',
      type: 'article',
      publishedTime: article.publishedAt ? new Date(article.publishedAt).toISOString() : undefined,
      authors: [article.author || 'Redaksi Naratif'],
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: plainTextContent,
      images: [article.coverUrl || ''],
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ category: string; id: string; slug: string }>;
}) {
  const { category, id: paramId, slug } = await params;
  
  const articleId = parseInt(paramId, 10);
  
  if (isNaN(articleId)) {
    notFound();
  }

  // Ambil data artikel spesifik
  const [article] = await db
    .select()
    .from(articles)
    .where(eq(articles.id, articleId))
    .limit(1);

  if (!article) {
    notFound();
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.naratif.web.id';
  const articleUrl = `${siteUrl}/berita-teknologi/${category}/${articleId}/${slug}`;

  // Ambil artikel populer
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
        <Link href={`/berita-teknologi/${category}`} className="hover:text-gray-900 transition-colors">{article.category}</Link>
        <ChevronRight className="w-4 h-4 mx-2" />
        <span className="text-gray-900 truncate max-w-xs sm:max-w-md">{article.title}</span>
      </nav>

      <div className="flex flex-col lg:flex-row gap-10">
        {/* Main Content (Left Column) */}
        <article className="lg:w-2/3">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-heading text-gray-900 leading-tight mb-6">
            {article.title}
          </h1>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-200 mb-6 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden shrink-0">
                {/* Fake avatar since we don't store author avatars */}
                <img src="https://ui-avatars.com/api/?name=Naratif+Redaksi&background=random" alt="Author" className="w-full h-full object-cover" />
              </div>
              <div>
                <div className="font-bold text-gray-900">{article.author} - Naratif</div>
                <div className="text-gray-500 text-sm">
                  {article.publishedAt ? new Date(article.publishedAt).toLocaleString('id-ID', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).replace(' pukul', '') : '-'} WIB
                </div>
              </div>
            </div>
            
            <ShareButtons title={article.title} url={articleUrl} />
          </div>

          {article.coverUrl && (
            <div className="w-full mb-8">
              <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-sm mb-3 bg-gray-50">
                <img src={article.coverUrl} alt={article.title} className="w-full h-full object-cover" />
              </div>
              {article.coverCaption && (
                <p className="text-sm text-gray-500 italic">
                  {article.coverCaption}
                </p>
              )}
            </div>
          )}

          <div className="article-content max-w-none text-gray-800 font-sans">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeSanitize]}
              components={{
                h1: ({ children }) => (
                  <h2 className="text-2xl sm:text-3xl font-bold font-heading text-gray-900 mt-10 mb-4 pb-2 border-b border-gray-100 tracking-tight leading-snug">
                    {children}
                  </h2>
                ),
                h2: ({ children }) => (
                  <h2 className="text-2xl sm:text-3xl font-bold font-heading text-gray-900 mt-10 mb-4 pb-2 border-b border-gray-100 tracking-tight leading-snug">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-xl sm:text-2xl font-bold font-heading text-gray-900 mt-8 mb-3 tracking-tight">
                    {children}
                  </h3>
                ),
                p: ({ children }) => (
                  <p className="text-gray-800 text-base sm:text-lg leading-relaxed mb-6 font-normal">
                    {children}
                  </p>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc list-outside pl-6 mb-6 space-y-2 text-base sm:text-lg text-gray-800 leading-relaxed">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-outside pl-6 mb-6 space-y-2 text-base sm:text-lg text-gray-800 leading-relaxed">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className="pl-1 leading-relaxed">
                    {children}
                  </li>
                ),
                strong: ({ children }) => (
                  <strong className="font-bold text-gray-900">
                    {children}
                  </strong>
                ),
                em: ({ children }) => (
                  <em className="italic text-gray-600">
                    {children}
                  </em>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-gray-900 pl-4 py-2 my-6 italic text-gray-700 bg-gray-50 rounded-r-lg text-base sm:text-lg">
                    {children}
                  </blockquote>
                ),
                a: ({ children, href }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-900 hover:text-gray-600 underline underline-offset-2 font-medium transition-colors"
                  >
                    {children}
                  </a>
                ),
                hr: () => <hr className="my-8 border-gray-200" />,
              }}
            >
              {article.content}
            </ReactMarkdown>
          </div>
          
          {/* Tags */}
          {article.tags && article.tags.length > 0 && (
             <div className="mt-10 pt-6 border-t border-gray-200 flex flex-wrap gap-2">
               <span className="font-bold text-gray-700 mr-2">Tag:</span>
               {article.tags.map(tag => (
                 <a key={tag} href={`/cari?q=${tag}`} className="bg-gray-100 text-gray-600 px-3 py-1 text-sm rounded-full hover:bg-gray-200 transition-colors">
                   #{tag}
                 </a>
               ))}
             </div>
          )}
        </article>

        {/* Sidebar (Right Column) */}
        <aside className="lg:w-1/3">
          <div className="sticky top-24">
            {/* Widget Komunitas & Media Sosial Naratif */}
            <div className="mb-8 p-4 sm:p-5 bg-gradient-to-br from-gray-50 via-white to-gray-50 rounded-2xl border border-gray-200 shadow-sm space-y-3.5">
              <div>
                <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-gray-900 bg-gray-100 px-2.5 py-1 rounded-md">
                  Komunitas & Media
                </span>
                <h3 className="font-bold font-heading text-gray-900 text-base sm:text-lg mt-2 leading-snug">
                  Terhubung dengan Naratif
                </h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Dapatkan kabar teknologi terhangat, ulasan gadget, dan tren AI langsung di platform favorit Anda.
                </p>
              </div>

              {/* Saluran WhatsApp (Aktif) */}
              <a
                href="https://whatsapp.com/channel/0029VbDdM7DFSAszJWyjca01"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-between p-3 rounded-xl bg-emerald-50/70 hover:bg-emerald-100/80 border border-emerald-200/80 transition-all group shadow-2xs gap-2"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[#25D366] text-white flex items-center justify-center shadow-sm shrink-0 group-hover:scale-105 transition-transform">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div className="text-left min-w-0">
                    <div className="font-bold text-gray-900 text-sm leading-tight truncate">Saluran WhatsApp</div>
                    <div className="text-[11px] text-emerald-700 font-medium truncate">naratifnews • Update Kilat</div>
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  Ikuti
                </span>
              </a>

              {/* Instagram (Coming Soon) */}
              <div className="w-full p-3 rounded-xl bg-gradient-to-r from-purple-50/60 via-pink-50/50 to-orange-50/50 border border-pink-200/70 shadow-2xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white flex items-center justify-center shadow-sm shrink-0">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                      </svg>
                    </div>
                    <div className="text-left min-w-0">
                      <div className="font-bold text-gray-900 text-sm leading-tight truncate">Instagram</div>
                      <div className="text-[11px] text-pink-600 font-semibold truncate">@naratif.web.id</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold tracking-wider uppercase text-amber-700 bg-amber-100/90 border border-amber-200 px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1 whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                    Segera
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center mb-6">
              <h3 className="text-xl font-bold font-heading text-gray-900">Berita Populer</h3>
              <div className="ml-4 flex-grow h-px bg-gray-200"></div>
            </div>
            
            <div className="flex flex-col gap-5">
              {popularArticles.length === 0 ? (
                <p className="text-sm text-gray-500">Belum ada berita populer.</p>
              ) : (
                popularArticles.map((pop, index) => (
                  <div key={pop.id} className="flex gap-4 group cursor-pointer">
                    <div className="text-4xl font-black font-heading text-gray-200 group-hover:text-gray-300 transition-colors -mt-1">
                      {index + 1}
                    </div>
                    <div>
                      <div className="text-gray-900 text-xs font-bold uppercase tracking-wider mb-1">
                        {pop.category}
                      </div>
                      <h4 className="font-bold text-gray-900 group-hover:text-gray-600 transition-colors line-clamp-2 text-sm leading-snug">
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
