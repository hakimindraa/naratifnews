import Link from 'next/link';
import { MapPin, Building2, ChevronRight, Compass } from 'lucide-react';
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
    <section className="mb-12">
      {/* Container Seksi Nusantara */}
      <div className="bg-gradient-to-b from-emerald-50/60 via-white to-white rounded-2xl border border-emerald-100/90 p-5 sm:p-7 shadow-xs">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 mb-5 border-b border-emerald-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded">
                  Pojok Daerah
                </span>
                <span className="text-xs text-gray-400 hidden sm:inline">•</span>
                <span className="text-xs text-gray-500 hidden sm:inline font-medium">
                  Kebijakan Publik, Fasilitas & Warga
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-extrabold font-heading text-gray-900 tracking-tight mt-0.5">
                Kabar Nusantara
              </h3>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3">
            <span className="text-[11px] text-gray-400 font-medium sm:hidden flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-emerald-600 animate-spin-slow" /> Geser ➔
            </span>
            <Link
              href="/berita-teknologi/regional"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-emerald-700 hover:text-emerald-800 bg-white hover:bg-emerald-50/80 px-3 py-1.5 rounded-lg border border-emerald-200/80 transition-all shadow-2xs group"
            >
              <span>Semua Berita Daerah</span>
              <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>

        {/* Grid Kartu Berita Daerah Responsif (Anti-Terpotong) */}
        <div className="flex overflow-x-auto sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 pb-3 sm:pb-0 scrollbar-hide snap-x">
          {articles.map((art) => {
            const regionName = detectRegionBadge(art.tags, art.title);
            const timeAgo = art.publishedAt
              ? formatDistanceToNow(new Date(art.publishedAt), { addSuffix: true, locale: id })
              : 'Terkini';

            return (
              <Link
                key={art.id}
                href={`/berita-teknologi/regional/${art.id}/${art.slug}`}
                className="group flex flex-col bg-white rounded-xl border border-gray-100 overflow-hidden shadow-2xs hover:shadow-md hover:border-emerald-200 transition-all duration-300 w-[270px] sm:w-auto shrink-0 snap-start"
              >
                {/* Gambar Sampul (Rasio Pasti 16:9) */}
                <div className="aspect-video w-full overflow-hidden bg-gray-100 relative shrink-0">
                  <img
                    src={art.coverUrl || ''}
                    alt={art.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {/* Badge Wilayah Mengambang di Sudut Gambar */}
                  <div className="absolute top-2.5 left-2.5 z-10">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold bg-gray-900/85 backdrop-blur-xs text-white shadow-xs">
                      <MapPin className="w-3 h-3 text-emerald-400" />
                      <span>{regionName}</span>
                    </span>
                  </div>
                </div>

                {/* Konten Kartu */}
                <div className="p-4 flex flex-col justify-between flex-1">
                  <div>
                    {/* Baris Meta Atas */}
                    <div className="flex items-center justify-between text-[10px] text-gray-400 font-medium mb-1.5">
                      <span className="text-emerald-700 font-bold uppercase tracking-wider">
                        Regional
                      </span>
                      <span>{timeAgo}</span>
                    </div>

                    {/* Judul Berita (2 Baris Rapi, Anti-Terpotong) */}
                    <h4 className="font-bold text-gray-900 group-hover:text-emerald-700 transition-colors line-clamp-2 text-xs sm:text-sm leading-snug min-h-[2.5rem]">
                      {art.title}
                    </h4>
                  </div>

                  {/* Footer Kartu (Penulis & Tautan) */}
                  <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px]">
                    <span className="text-gray-500 truncate max-w-[130px] font-medium">
                      {art.author || 'Redaksi'}
                    </span>
                    <span className="text-emerald-700 font-bold inline-flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                      Baca ➔
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
