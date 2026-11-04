import { uploadImageToImgbb } from '@/app/admin/media-actions';

/**
 * Pembersih kata kunci judul berita agar menjadi query pencarian visual yang akurat
 */
export function sanitizeImageSearchQuery(title: string, category?: string): {
  primary: string;
  secondary: string;
  fallback: string;
} {
  const cat = category?.trim() || 'Nasional';
  const defaultFallback = `${cat} indonesia berita`;

  if (!title) {
    return {
      primary: defaultFallback,
      secondary: `${cat} indonesia`,
      fallback: defaultFallback,
    };
  }

  // 1. Bersihkan prefix portal & editorial umum
  let clean = title
    .replace(/^adafaktanews\s*[-–—:]\s*/i, '')
    .replace(/^(breaking news|update|eksklusif|terkini|viral|sorotan)\s*[-–—:]\s*/i, '')
    .replace(/[\[\]\(\)\{\}"'“”‘’:,;!?\/\\]/g, ' ')
    .trim();

  // 2. Hapus kata sambung & kata pengantar yang tidak bernilai visual
  const stopWords = new Set([
    'dan', 'di', 'ke', 'dari', 'pada', 'untuk', 'dengan', 'yang', 'dalam',
    'oleh', 'atas', 'karena', 'saat', 'ketika', 'setelah', 'sebelum', 'hingga',
    'sampai', 'sejak', 'adalah', 'yaitu', 'yakni', 'akan', 'telah', 'sudah',
    'bisa', 'dapat', 'harus', 'agar', 'supaya', 'tentang', 'terkait', 'soal',
    'ini', 'itu', 'tersebut', 'menjadi', 'sebagai', 'serta', 'juga', 'pun',
    'tak', 'tidak', 'bukan', 'ada', 'lebih', 'paling', 'sangat', 'kembali',
    'segera', 'resmi', 'sukses', 'siap', 'dorong', 'gandeng', 'klaim', 'beberkan',
    'ungkap', 'sebut', 'kata', 'ungkapkan', 'catat', 'permasalahkan', 'belum', 'balas',
    'minta', 'sorot', 'nilai', 'tanggapi', 'buka', 'tutup', 'tinjau', 'datang'
  ]);

  const words = clean
    .split(/\s+/)
    .map((w) => w.trim().replace(/[^\w-]/g, ''))
    .filter((w) => w.length >= 3);

  const meaningfulWords = words.filter((w) => !stopWords.has(w.toLowerCase()));
  const tokenSource = meaningfulWords.length >= 2 ? meaningfulWords : words;

  // Variasi 1: Kata kunci inti (3-4 kata)
  const primary = tokenSource.slice(0, 4).join(' ') || defaultFallback;

  // Variasi 2: Lebih ringkas (2-3 kata subjek utama)
  const secondary = tokenSource.slice(0, 3).join(' ') || primary;

  // Variasi 3: Topik subjek utama + konteks berita
  const fallback = tokenSource[0]
    ? `${tokenSource[0]} ${cat} indonesia`
    : defaultFallback;

  return { primary, secondary, fallback };
}

/**
 * Mencari kandidat URL gambar asli dari mesin pencari web (HD & Landscape)
 */
export async function searchCandidateImages(query: string): Promise<string[]> {
  const searchUrl = `https://www.bing.com/images/search?q=${encodeURIComponent(
    query
  )}&qft=+filterui:aspect-wide&first=1&scenario=ImageBasicHover`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000); // 7s max timeout

    const res = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`Pencarian gambar gagal dengan status HTTP ${res.status}`);
      return [];
    }

    const html = await res.text();
    const murls: string[] = [];
    const murlRegex = /&quot;murl&quot;:&quot;(https:\/\/[^&"]+?)&quot;/gi;
    let match: RegExpExecArray | null;

    while ((match = murlRegex.exec(html)) !== null) {
      const rawUrl = match[1].replace(/\\/g, '');
      const lower = rawUrl.toLowerCase();
      // Validasi ekstensi gambar & filter out icon/avatar/logo/favicon
      const hasImageExt =
        lower.includes('.jpg') ||
        lower.includes('.jpeg') ||
        lower.includes('.png') ||
        lower.includes('.webp');

      if (
        hasImageExt &&
        !lower.includes('favicon') &&
        !lower.includes('icon') &&
        !lower.includes('logo') &&
        !lower.includes('avatar') &&
        !lower.includes('placeholder') &&
        !lower.includes('transparent')
      ) {
        murls.push(rawUrl);
      }
    }

    return murls;
  } catch (err: any) {
    console.warn('Error saat scrape kandidat gambar:', err?.message || err);
    return [];
  }
}

/**
 * Fungsi Inti: Mencari gambar di Google/Web berdasarkan judul dengan Multi-Level Query Fallback,
 * lalu mengunduh buffer dan mengunggahnya ke ImgBB agar menghasilkan URL permanen yang aman.
 */
export async function searchAndUploadCoverImage(
  title: string,
  category?: string
): Promise<{ success: boolean; coverUrl?: string; error?: string }> {
  try {
    const { primary, secondary, fallback } = sanitizeImageSearchQuery(title, category);
    const querySteps = [primary, secondary, fallback].filter(Boolean);

    let candidates: string[] = [];

    // Coba setiap variasi kata kunci dari yang paling spesifik ke yang lebih ringkas
    for (const q of querySteps) {
      candidates = await searchCandidateImages(q);
      if (candidates.length > 0) {
        break;
      }
    }

    if (candidates.length === 0) {
      return {
        success: false,
        error: `Tidak ada gambar yang ditemukan untuk topik "${primary}".`,
      };
    }

    // Coba upload maksimal 4 kandidat teratas hingga berhasil
    for (let i = 0; i < Math.min(4, candidates.length); i++) {
      const candidateUrl = candidates[i];
      try {
        const formData = new FormData();
        formData.append('imageUrl', candidateUrl);
        formData.append('name', `cover-${Date.now()}`);

        const uploadRes = await uploadImageToImgbb(formData);

        if (uploadRes.url) {
          const finalUrl = uploadRes.url.replace(/https?:\/\/i\.ibb\.co\//g, 'https://i.ibb.co.com/');
          return {
            success: true,
            coverUrl: finalUrl,
          };
        }
      } catch (uploadErr) {
        // Lanjutkan coba kandidat berikutnya jika kandidat ini gagal
        continue;
      }
    }

    return {
      success: false,
      error: 'Semua kandidat gambar eksternal gagal di-upload ke ImgBB.',
    };
  } catch (err: any) {
    console.error('Error in searchAndUploadCoverImage:', err);
    return {
      success: false,
      error: err?.message || 'Terjadi kesalahan saat mencari dan mengunggah gambar sampul.',
    };
  }
}

