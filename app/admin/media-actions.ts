'use server';

export interface EditorialPhoto {
  id: string;
  title: string;
  thumbUrl: string;
  fullUrl: string;
  author?: string;
  source: string;
}

export interface ImgbbUploadResult {
  success?: boolean;
  url?: string;
  thumbUrl?: string;
  displayUrl?: string;
  error?: string;
}

/**
 * Memeriksa apakah IMGBB_API_KEY sudah disetel di environment
 */
export async function getImgbbConfigStatus(): Promise<{ configured: boolean }> {
  const apiKey = process.env.IMGBB_API_KEY?.trim();
  return { configured: Boolean(apiKey) };
}

/**
 * Mengunggah file gambar lokal atau URL gambar eksternal ke ImgBB CDN
 */
export async function uploadImageToImgbb(formData: FormData): Promise<ImgbbUploadResult> {
  const apiKey = process.env.IMGBB_API_KEY?.trim();
  if (!apiKey) {
    return {
      error: 'Kunci IMGBB_API_KEY belum disetel di file .env.local. Dapatkan API Key gratis di https://api.imgbb.com lalu tambahkan ke .env.local.',
    };
  }

  const file = formData.get('file') as File | null;
  const imageUrl = formData.get('imageUrl') as string | null;
  const name = (formData.get('name') as string | null) || 'adafakta-image';

  if (!file && !imageUrl) {
    return { error: 'Pilih berkas gambar atau masukkan URL gambar yang valid.' };
  }

  try {
    const imgbbBody = new FormData();
    if (file && file.size > 0) {
      // Validasi ukuran maks 32MB sesuai batas ImgBB
      if (file.size > 32 * 1024 * 1024) {
        return { error: 'Ukuran berkas melebihi batas 32MB.' };
      }
      imgbbBody.append('image', file);
      imgbbBody.append('name', name);
    } else if (imageUrl) {
      let finalUrl = imageUrl;
      // Otomatis pasang parameter kompresi < 100 KB jika gambar dari Unsplash
      if (finalUrl.includes('images.unsplash.com')) {
        try {
          const u = new URL(finalUrl);
          u.searchParams.set('w', '1000');
          u.searchParams.set('q', '70');
          u.searchParams.set('auto', 'format');
          finalUrl = u.toString();
        } catch {
          // gunakan URL asli jika gagal parse
        }
      }
      imgbbBody.append('image', finalUrl);
      imgbbBody.append('name', name);
    }

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: 'POST',
      body: imgbbBody,
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      const msg = data.error?.message || 'Gagal mengunggah gambar ke CDN ImgBB.';
      return { error: msg };
    }

    // Helper normalisasi agar selalu menggunakan domain mirror stabil .co.com
    const normalizeImgbbUrl = (u?: string) => {
      if (!u) return u;
      return u.replace(/https?:\/\/i\.ibb\.co\//g, 'https://i.ibb.co.com/');
    };

    // Mengambil direct link asli berakhiran ekstensi (.webp, .jpg, .png)
    const directUrl = normalizeImgbbUrl(data.data.image?.url || data.data.url);
    const thumbUrl = normalizeImgbbUrl(data.data.thumb?.url) || directUrl;
    const displayUrl = normalizeImgbbUrl(data.data.display_url) || directUrl;

    return {
      success: true,
      url: directUrl,
      thumbUrl,
      displayUrl,
    };
  } catch (err: any) {
    console.error('[ImgBB Upload Error]:', err);
    return { error: err.message || 'Terjadi gangguan jaringan saat mengunggah ke ImgBB.' };
  }
}

/**
 * Mencari foto bebas royalti berkualitas tinggi melalui Wikimedia Commons API
 */
export async function searchEditorialPhotos(query: string): Promise<{
  success: boolean;
  photos: EditorialPhoto[];
  error?: string;
}> {
  const cleanQuery = query.trim();
  if (!cleanQuery) {
    return { success: true, photos: [] };
  }

  try {
    // Search Wikimedia Commons with bitmap filter (jpg, png, webp) dan renderan lebar 1000px (< 100 KB)
    const searchQuery = `${cleanQuery} filetype:bitmap`;
    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(
      searchQuery
    )}&gsrlimit=12&prop=imageinfo&iiprop=url|mime|thumburl|extmetadata&iiurlwidth=1000&format=json&origin=*`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'AdaFaktaNews/1.0 (Editorial Media Tool; contact@adafakta.web.id)',
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return { success: false, photos: [], error: 'Gagal menghubungi server penyedia foto.' };
    }

    const data = await res.json();
    const pages = data.query?.pages || {};

    const photos: EditorialPhoto[] = Object.values(pages)
      .filter((p: any) => {
        const info = p.imageinfo?.[0];
        if (!info || !info.url) return false;
        const mime = info.mime?.toLowerCase() || '';
        return mime.includes('jpeg') || mime.includes('png') || mime.includes('webp');
      })
      .map((p: any) => {
        const info = p.imageinfo[0];
        const meta = info.extmetadata || {};
        const cleanTitle = p.title?.replace(/^File:/i, '').replace(/\.[a-zA-Z0-9]+$/, '') || 'Foto';
        const artist = meta.Artist?.value?.replace(/<[^>]*>?/gm, '').trim();

        return {
          id: String(p.pageid),
          title: cleanTitle,
          thumbUrl: info.thumburl || info.url,
          fullUrl: info.url,
          author: artist ? artist.slice(0, 50) : undefined,
          source: 'Wikimedia Commons (Bebas Royalti)',
        };
      });

    return { success: true, photos };
  } catch (err: any) {
    console.error('[Search Photos Error]:', err);
    return { success: false, photos: [], error: err.message || 'Gagal mencari foto.' };
  }
}
