import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';

export interface RegionalArticleItem {
  id: number;
  slug: string;
  title: string;
  coverUrl: string | null;
  category: string;
  tags: string[] | null;
  publishedAt: string | null;
  author: string;
}

interface KabarNusantaraSectionProps {
  articles: RegionalArticleItem[];
}

const REGIONAL_KEYWORDS: Array<{ label: string; pattern: RegExp }> = [
  // IKN & Kalimantan
  { label: 'IKN Nusantara', pattern: /\b(ikn|nusantara)\b/i },
  { label: 'Kalimantan Timur', pattern: /\b(kaltim|kalimantan timur|samarinda|balikpapan|kutai)\b/i },
  { label: 'Kalimantan Selatan', pattern: /\b(kalsel|kalimantan selatan|banjarmasin|banjarbaru)\b/i },
  { label: 'Kalimantan Barat', pattern: /\b(kalbar|kalimantan barat|pontianak|singkawang)\b/i },
  { label: 'Kalimantan Tengah', pattern: /\b(kalteng|kalimantan tengah|palangka raya)\b/i },
  { label: 'Kalimantan Utara', pattern: /\b(kaltara|kalimantan utara|tarakan)\b/i },
  // Jawa & Bali
  { label: 'DKI Jakarta', pattern: /\b(jakarta|dki|monas)\b/i },
  { label: 'Jawa Barat', pattern: /\b(jabar|jawa barat|bandung|bogor|depok|bekasi|cirebon)\b/i },
  { label: 'Jawa Tengah', pattern: /\b(jateng|jawa tengah|semarang|solo|surakarta|magelang)\b/i },
  { label: 'DI Yogyakarta', pattern: /\b(yogyakarta|jogja|diy|sleman|bantul)\b/i },
  { label: 'Jawa Timur', pattern: /\b(jatim|jawa timur|surabaya|malang|banyuwangi|sidoarjo)\b/i },
  { label: 'Banten', pattern: /\b(banten|tangerang|serang|cilegon)\b/i },
  { label: 'Bali', pattern: /\b(bali|denpasar|badung|ubud)\b/i },
  // Nusa Tenggara
  { label: 'Nusa Tenggara Barat', pattern: /\b(ntb|lombok|mataram|sumbawa)\b/i },
  { label: 'Nusa Tenggara Timur', pattern: /\b(ntt|kupang|labuan bajo|flores)\b/i },
  // Sumatera
  { label: 'Sumatera Utara', pattern: /\b(sumut|sumatera utara|medan|deliserdang)\b/i },
  { label: 'Sumatera Barat', pattern: /\b(sumbar|sumatera barat|padang|bukittinggi)\b/i },
  { label: 'Riau', pattern: /\b(riau|pekanbaru|dumai)\b/i },
  { label: 'Kepulauan Riau', pattern: /\b(kepri|batam|tanjungpinang)\b/i },
  { label: 'Sumatera Selatan', pattern: /\b(sumsel|sumatera selatan|palembang)\b/i },
  { label: 'Lampung', pattern: /\b(lampung|bandar lampung)\b/i },
  { label: 'Aceh', pattern: /\b(aceh|banda aceh|lhokseumawe)\b/i },
  { label: 'Jambi', pattern: /\b(jambi)\b/i },
  { label: 'Bengkulu', pattern: /\b(bengkulu)\b/i },
  { label: 'Bangka Belitung', pattern: /\b(babel|bangka|belitung|pangkalpinang)\b/i },
  // Sulawesi
  { label: 'Sulawesi Selatan', pattern: /\b(sulsel|sulawesi selatan|makassar)\b/i },
  { label: 'Sulawesi Utara', pattern: /\b(sulut|sulawesi utara|manado)\b/i },
  { label: 'Sulawesi Tengah', pattern: /\b(sulteng|sulawesi tengah|palu)\b/i },
  { label: 'Sulawesi Tenggara', pattern: /\b(sultra|sulawesi tenggara|kendari)\b/i },
  { label: 'Gorontalo', pattern: /\b(gorontalo)\b/i },
  { label: 'Sulawesi Barat', pattern: /\b(sulbar|sulawesi barat|mamuju)\b/i },
  // Maluku & Papua
  { label: 'Maluku', pattern: /\b(maluku|ambon)\b/i },
  { label: 'Maluku Utara', pattern: /\b(malut|maluku utara|ternate)\b/i },
  { label: 'Papua', pattern: /\b(papua|jayapura|merauke|sorong)\b/i },
];

export function detectRegionBadge(tags: string[] | null, title: string): string {
  // 1. Cek tags
  if (tags && Array.isArray(tags)) {
    for (const tag of tags) {
      for (const item of REGIONAL_KEYWORDS) {
        if (item.pattern.test(tag) || tag.toLowerCase() === item.label.toLowerCase()) {
          return item.label;
        }
      }
    }
  }

  // 2. Cek judul
  for (const item of REGIONAL_KEYWORDS) {
    if (item.pattern.test(title)) {
      return item.label;
    }
  }

  return 'Daerah';
}

export default function KabarNusantaraSection({ articles }: KabarNusantaraSectionProps) {
  if (!articles || articles.length === 0) {
    return null;
  }

  return (
    <section className="mb-12 space-y-3">
      {/* Header Bar Polos Minimalis (Persis Seperti Berita Sorotan) */}
      <div className="flex items-center justify-between pb-2 border-b border-gray-200">
        <div className="flex items-center gap-2">

          <h3 className="text-sm sm:text-base font-bold font-heading text-gray-900 uppercase tracking-wider">
            Kabar Nusantara
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-gray-400 font-medium sm:hidden">Geser ➔</span>
          <Link
            href="/berita/regional"
            className="text-[11px] text-gray-400 hover:text-gray-900 font-medium transition-colors hidden sm:inline"
          >
            Berita Daerah ➔
          </Link>
        </div>
      </div>

      {/* Grid Kartu Berita Daerah Minimalis Polos */}
      <div className="flex overflow-x-auto sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pb-3 sm:pb-0 scrollbar-hide snap-x">
        {articles.map((art) => {
          const regionName = detectRegionBadge(art.tags, art.title);

          return (
            <Link
              key={art.id}
              href={`/berita/regional/${art.id}/${art.slug}`}
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
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block mb-1">
                    {regionName}
                  </span>
                  <h4 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-2 text-xs sm:text-sm leading-snug">
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
          );
        })}
      </div>
    </section>
  );
}
