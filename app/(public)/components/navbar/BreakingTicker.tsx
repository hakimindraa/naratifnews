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
    <div className="w-full bg-white border-b border-gray-200 text-xs py-2">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 overflow-hidden">
        {/* Sisi Kiri: Breaking Lead Alert / Topik Hangat */}
        <div className="flex items-center space-x-3 overflow-x-auto scrollbar-hide py-0.5 min-w-0 flex-1">
          <span className="font-heading font-bold text-gray-900 uppercase tracking-wider text-[11px] shrink-0">
            Topik Hangat:
          </span>

          {trendingTags && trendingTags.length > 0 && (
            <div className="flex items-center space-x-2.5 text-xs shrink-0">
              {trendingTags.slice(0, 5).map((tag, i) => (
                <div key={tag} className="flex items-center space-x-2.5">
                  {i > 0 && <span className="text-gray-300 font-light select-none">|</span>}
                  <Link
                    href={`/cari?q=${encodeURIComponent(tag)}`}
                    className="text-gray-700 hover:text-red-700 font-medium whitespace-nowrap transition-colors hover:underline"
                  >
                    #{tag}
                  </Link>
                </div>
              ))}
            </div>
          )}

          {breakingNews && (
            <>
              <span className="text-gray-300 font-light select-none shrink-0 hidden md:inline">|</span>
              <div className="hidden md:flex items-center space-x-2 min-w-0">
                <span className="text-red-600 font-bold uppercase text-[10px] tracking-wider shrink-0">
                  Terkini:
                </span>
                <Link
                  href={`/berita/${breakingNews.category.toLowerCase()}/${breakingNews.id}/${breakingNews.slug}`}
                  className="truncate text-gray-800 hover:text-red-600 transition-colors font-medium text-xs"
                >
                  {breakingNews.title}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
