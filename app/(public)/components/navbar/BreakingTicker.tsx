import Link from "next/link";

interface ArticleItem {
  id: number;
  slug: string;
  title: string;
  category: string;
}

interface BreakingTickerProps {
  breakingNews: ArticleItem | null;
  trendingTags: string[];
}

export default function BreakingTicker({ breakingNews, trendingTags }: BreakingTickerProps) {
  return (
    <div className="bg-gray-50 border-b border-gray-200 text-xs py-2 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row md:items-center justify-between gap-2">
        {/* Sisi Kiri: Breaking News Headline */}
        <div className="flex items-center min-w-0 flex-1">
          <span className="bg-black text-white text-[10px] md:text-xs font-black px-2 py-0.5 rounded-sm mr-2.5 shrink-0 uppercase tracking-wider shadow-2xs">
            Breaking
          </span>
          {breakingNews ? (
            <Link
              href={`/berita/${breakingNews.category.toLowerCase()}/${breakingNews.id}/${breakingNews.slug}`}
              className="truncate text-xs md:text-sm font-semibold text-gray-900 hover:text-gray-600 transition-colors"
            >
              {breakingNews.title}
            </Link>
          ) : (
            <span className="truncate text-xs text-gray-500 italic">
              Belum ada berita terbit hari ini.
            </span>
          )}
        </div>

        {/* Sisi Kanan: Trending Tags (Desktop & Tablet) */}
        {trendingTags && trendingTags.length > 0 && (
          <div className="hidden md:flex items-center space-x-2 shrink-0 text-xs">
            <span className="font-bold text-gray-800 shrink-0">
              Trending:
            </span>
            <div className="flex items-center space-x-1.5 overflow-x-auto scrollbar-hide">
              {trendingTags.slice(0, 4).map((tag) => (
                <Link
                  key={tag}
                  href={`/cari?q=${encodeURIComponent(tag)}`}
                  className="bg-white hover:bg-gray-100 text-gray-700 hover:text-black font-medium px-2.5 py-0.5 rounded-sm border border-gray-200 shadow-2xs whitespace-nowrap transition-colors text-[11px]"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
