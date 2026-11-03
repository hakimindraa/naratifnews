import { uploadImageToImgbb } from '@/app/admin/media-actions';

/**
 * Pembersih kata kunci judul berita agar menjadi query pencarian visual yang akurat
 */
export function sanitizeImageSearchQuery(title: string, category?: string): string {
  if (!title) return category || 'berita nasional';

  // 1. Bersihkan prefix editorial umum
  let clean = title
    .replace(/^adafaktanews\s*[-–—:]\s*/i, '')
    .replace(/^(breaking news|update|eksklusif|terkini|viral)\s*[-–—:]\s*/i, '')
    .replace(/[\[\]\(\)\{\}"'“”‘’]/g, ' ')
    .trim();

  // 2. Hapus kata sambung & kata pengantar yang tidak bernilai visual
  const stopWords = new Set([
    'dan', 'di', 'ke', 'dari', 'pada', 'untuk', 'dengan', 'yang', 'dalam',
    'oleh', 'atas', 'karena', 'saat', 'ketika', 'setelah', 'sebelum', 'hingga',
    'sampai', 'sejak', 'adalah', 'yaitu', 'yakni', 'akan', 'telah', 'sudah',
    'bisa', 'dapat', 'harus', 'agar', 'supaya', 'tentang', 'terkait', 'soal',
    'ini', 'itu', 'tersebut', 'menjadi', 'sebagai', 'serta', 'juga', 'pun',
    'tak', 'tidak', 'bukan', 'ada', 'lebih', 'paling', 'sangat', 'kembali',
    'segera', 'resmi', 'sukses', 'siap', 'dorong', 'gandeng', 'klaim', 'beberkan'
  ]);

  const words = clean
    .split(/\s+/)
    .map((w) => w.trim().replace(/[^\w-]/g, ''))
    .filter((w) => w.length > 2 && !stopWords.has(w.toLowerCase()));

  // Ambil 3-5 kata kunci visual utama
  const selectedWords = words.slice(0, 5);

  if (selectedWords.length === 0) {
    return category ? `${category} indonesia` : 'berita indonesia';
  }

  return selectedWords.join(' ');
}

/**
 * Mencari kandidat URL gambar asli dari mesin pencari web (HD & Landscape)
 */
export async function searchCandidateImages(query: string): Promise<string[]> {
  const searchUrl = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&first=1&scenario=ImageBasicHover`;

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
    const murlRegex = /&quot;murl&quot;:&quot;(https:\/\/[^&"]+?\.(?:jpe?g|png|webp))&quot;/gi;
    let match: RegExpExecArray | null;

    while ((match = murlRegex.exec(html)) !== null) {
      const url = match[1];
      // Filter out domain pelacak / ikon / placeholder
      const lower = url.toLowerCase();
      if (
        !lower.includes('favicon') &&
        !lower.includes('icon') &&
        !lower.includes('logo') &&
        !lower.includes('avatar') &&
        !lower.includes('placeholder')
      ) {
        murls.push(url);
      }
    }

    return murls;
  } catch (err: any) {
    console.warn('Error saat scrape kandidat gambar:', err?.message || err);
    return [];
  }
}

/**
 * Fungsi Inti: Mencari gambar di Google/Web berdasarkan judul,
 * lalu mengunggahnya ke ImgBB agar menghasilkan URL permanen yang aman.
 */
export async function searchAndUploadCoverImage(
  title: string,
  category?: string
): Promise<{ success: boolean; coverUrl?: string; error?: string }> {
  try {
    const query = sanitizeImageSearchQuery(title, category);
    const candidates = await searchCandidateImages(query);

    if (candidates.length === 0) {
      return {
        success: false,
        error: `Tidak ada gambar yang ditemukan untuk topik "${query}".`,
      };
    }

    // Coba upload maksimal 3 kandidat teratas hingga berhasil
    for (let i = 0; i < Math.min(3, candidates.length); i++) {
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
        // Lanjutkan coba kandidat berikutnya jika kandidat ini gagal (misal hotlink protection)
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

