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
  
  // URL lengkap artikel (bisa disesuaikan dengan domain asli nantinya)
  const articleUrl = `https://naratif.com/berita-teknologi/${category}/${articleId}/${slug}`;

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
        <Link href="/" className="hover:text-blue-600 transition-colors">Home</Link>
        <ChevronRight className="w-4 h-4 mx-2" />
        <Link href={`/berita-teknologi/${category}`} className="hover:text-blue-600 transition-colors">{article.category}</Link>
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
            
            <div className="flex gap-2">
              <button className="flex items-center justify-center w-10 h-10 bg-[#1877F2] text-white rounded-full hover:bg-opacity-90 transition-all">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </button>
              <button className="flex items-center justify-center w-10 h-10 bg-[#1DA1F2] text-white rounded-full hover:bg-opacity-90 transition-all">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
              </button>
              <button className="flex items-center justify-center w-10 h-10 bg-[#25D366] text-white rounded-full hover:bg-opacity-90 transition-all">
                <MessageCircle className="w-5 h-5" />
              </button>
              <button className="flex items-center justify-center w-10 h-10 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 transition-all">
                <Link2 className="w-5 h-5" />
              </button>
            </div>
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

          <div className="prose prose-lg max-w-none text-gray-800 font-sans prose-headings:font-heading prose-a:text-blue-600 hover:prose-a:text-blue-700">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeSanitize]}
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
            <div className="mb-8 p-6 bg-blue-50 rounded-xl border border-blue-100">
              <h3 className="font-bold font-heading text-blue-900 text-lg mb-2">Berlangganan Newsletter</h3>
              <p className="text-sm text-blue-700 mb-4">Dapatkan update berita terkini langsung di inbox Anda.</p>
              <div className="flex">
                <input type="email" placeholder="Email Anda" className="w-full px-3 py-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                <button className="bg-blue-600 text-white px-4 py-2 rounded-r-lg hover:bg-blue-700 text-sm font-bold">Kirim</button>
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
