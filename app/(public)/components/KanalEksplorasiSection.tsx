import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';

export interface ChannelItem {
  id: number;
  slug: string;
  title: string;
  coverUrl: string | null;
  category: string;
  publishedAt: string | null;
}

export interface CategoryChannel {
  name: string;
  slug: string;
  badgeColor?: string;
  badgeBg?: string;
  accentBorder?: string;
  iconName?: string;
  latestArticle: ChannelItem | null;
  subArticles?: ChannelItem[];
  totalArticles: number;
}

interface KanalEksplorasiSectionProps {
  channels: CategoryChannel[];
  trendingTags: string[];
}

export default function KanalEksplorasiSection({
  channels,
  trendingTags,
}: KanalEksplorasiSectionProps) {
  return (
    <section className="mt-8 sm:mt-16 pt-6 sm:pt-10 border-t border-gray-200/90 px-3.5 sm:px-0 space-y-6 sm:space-y-8">
      {/* 1. Bar Topik Populer (Bersih & Polos Bebas Ikon) */}
      {trendingTags && trendingTags.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-4 border-b border-gray-200">
          <div className="flex items-center gap-2 shrink-0">
            <h4 className="text-xs font-bold font-heading text-gray-900 uppercase tracking-wider">
              Topik Populer:
            </h4>
          </div>

          {/* Tags Pills Scrollable */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide py-0.5">
            {trendingTags.map((tag) => (
              <Link
                key={tag}
                href={`/cari?q=${encodeURIComponent(tag)}`}
                className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-sm text-[11px] sm:text-xs font-medium bg-white hover:bg-gray-100 text-gray-800 border border-gray-200 hover:border-black whitespace-nowrap transition-colors"
              >
                <span className="text-gray-400 font-semibold">#</span>
                <span>{tag}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 2. Grid Kanal Berita Lengkap (Eksplorasi Kanal Polos Bebas Ikon) */}
      <div className="space-y-4 sm:space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-gray-200">
          <div>
            <h3 className="text-base sm:text-xl font-bold font-heading text-gray-900 tracking-tight">
              Jelajahi Kanal Berita
            </h3>
            <p className="text-[10px] sm:text-xs text-gray-500 hidden sm:block">
              Liputan mendalam berdasarkan kategori dan rubrik pilihan
            </p>
          </div>

          <Link
            href="/berita/nasional"
            className="text-xs sm:text-sm font-semibold text-gray-900 hover:text-gray-600 transition-colors group"
          >
            <span>Semua Kanal ➔</span>
          </Link>
        </div>

        {/* Grid Kartu Kanal: 1 Kolom di Mobile, 2 Kolom di Tablet, 3 Kolom di Desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4.5">
          {channels.map((chan) => (
            <div
              key={chan.slug}
              className="bg-white rounded-sm border border-gray-200 p-3.5 shadow-2xs hover:border-gray-400 transition-colors flex flex-col justify-between group"
            >
              <div>
                {/* Header Kanal (Polos tanpa kotak ikon) */}
                <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-gray-100">
                  <Link
                    href={`/berita/${chan.slug}`}
                    className="font-bold text-xs sm:text-sm text-gray-900 hover:text-gray-600 font-heading transition-colors"
                  >
                    {chan.name}
                  </Link>
                  <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                    {chan.totalArticles} Berita
                  </span>
                </div>

                {/* Berita Utama di Kanal Ini */}
                {chan.latestArticle ? (
                  <div className="space-y-2.5">
                    <Link
                      href={`/berita/${chan.slug}/${chan.latestArticle.id}/${chan.latestArticle.slug}`}
                      className="block group/item"
                    >
                      <div className="flex gap-2.5 items-start">
                        <div className="w-20 h-16 rounded-sm overflow-hidden bg-gray-100 shrink-0 relative aspect-[4/3]">
                          <img
                            src={chan.latestArticle.coverUrl || ''}
                            alt={chan.latestArticle.title}
                            className="w-full h-full object-cover group-hover/item:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs sm:text-sm font-semibold text-gray-900 group-hover/item:text-gray-600 transition-colors line-clamp-2 leading-snug">
                            {chan.latestArticle.title}
                          </h4>
                          <span className="text-[10px] text-gray-400 block mt-1">
                            {chan.latestArticle.publishedAt
                              ? formatDistanceToNow(new Date(chan.latestArticle.publishedAt), {
                                  addSuffix: true,
                                  locale: id,
                                })
                              : ''}
                          </span>
                        </div>
                      </div>
                    </Link>

                    {/* Sub-articles / Judul Berita Terkait Lainnya di Kanal Ini */}
                    {chan.subArticles && chan.subArticles.length > 0 && (
                      <div className="pt-2 border-t border-gray-100 space-y-1.5">
                        {chan.subArticles.map((sub) => (
                          <Link
                            key={sub.id}
                            href={`/berita/${chan.slug}/${sub.id}/${sub.slug}`}
                            className="group/sub flex items-start gap-1.5 text-[11px] leading-snug text-gray-600 hover:text-black transition-colors"
                          >
                            <span className="text-gray-400 font-bold shrink-0">•</span>
                            <span className="line-clamp-1 font-medium">{sub.title}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic py-2">Belum ada berita di kanal ini.</p>
                )}
              </div>

              {/* Footer Kanal Link */}
              <Link
                href={`/berita/${chan.slug}`}
                className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px] font-semibold text-gray-500 group-hover:text-black transition-colors"
              >
                <span>Buka Kanal {chan.name}</span>
                <span>➔</span>
              </Link>
            </div>
          ))}
        </div>

        {/* Pintasan Indeks Kategori Mobile & Desktop */}
        <div className="pt-4 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
          <span className="text-xs font-bold text-gray-500 mr-1">Indeks Rubrik:</span>
          {channels.map((chan) => (
            <Link
              key={chan.slug}
              href={`/berita/${chan.slug}`}
              className="text-[11px] px-2.5 py-1 rounded-sm bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-black font-medium transition-colors"
            >
              {chan.name}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
