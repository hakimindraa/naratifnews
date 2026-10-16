/**
 * Smart URL Scraper untuk Ada Fakta
 * Mengekstrak teks murni berita dari URL mana pun secara gratis
 * Menggunakan pendekatan Dual-Layer (Reader Engine + Direct HTML Parser Fallback)
 */

export interface ScrapedSourceData {
  title: string;
  content: string;
  domain: string;
  wordCount: number;
  excerpt: string;
  sourceUrl: string;
}

export async function scrapeArticleFromUrl(targetUrl: string): Promise<ScrapedSourceData> {
  const cleanUrl = targetUrl.trim();

  // 1. Validasi URL
  if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
    throw new Error('URL tidak valid. Harap gunakan awalan http:// atau https://');
  }

  let domain = '';
  try {
    const parsed = new URL(cleanUrl);
    domain = parsed.hostname.replace(/^www\./, '');
  } catch {
    throw new Error('Format tautan URL tidak valid.');
  }

  // 2. LAYER 1: Coba gunakan Reader Engine (Jina Reader - 100% Gratis & Pembersih Iklan Andal)
  try {
    const jinaEndpoint = `https://r.jina.ai/${cleanUrl}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000); // 12s timeout

    const res = await fetch(jinaEndpoint, {
      method: 'GET',
      headers: {
        'Accept': 'text/plain',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const text = await res.text();
      if (text && text.trim().length > 150) {
        return parseReaderText(text, cleanUrl, domain);
      }
    }
  } catch (err) {
    console.warn('Reader Engine (Layer 1) timeout/gagal, beralih ke Layer 2:', err);
  }

  // 3. LAYER 2: Fallback Direct Fetch + HTML Parsing
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(cleanUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 AdaFaktaBot/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`Situs sumber merespons kode status ${res.status}: ${res.statusText}`);
    }

    const html = await res.text();
    return parseHtmlDirectly(html, cleanUrl, domain);
  } catch (err: any) {
    throw new Error(`Gagal membaca isi URL (${domain}): ${err.message || 'Situs tidak dapat diakses atau diblokir.'}`);
  }
}

/**
 * Parsing teks bersih hasil Reader Engine (Markdown format)
 */
function parseReaderText(rawMarkdown: string, sourceUrl: string, domain: string): ScrapedSourceData {
  let title = '';
  const lines = rawMarkdown.split('\n');
  const cleanBodyLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Ekstrak Title dari format Jina (Title: ... atau # ...)
    if (!title && trimmed.startsWith('Title:')) {
      title = trimmed.replace(/^Title:\s*/i, '').trim();
      continue;
    }
    if (!title && trimmed.startsWith('# ') && !trimmed.toLowerCase().includes('http')) {
      title = trimmed.replace(/^#\s*/, '').trim();
      continue;
    }

    // Lewati baris metadata Jina
    if (
      trimmed.startsWith('URL Source:') ||
      trimmed.startsWith('Published Time:') ||
      trimmed.startsWith('Markdown Content:') ||
      trimmed.includes('Cookie Policy')
    ) {
      continue;
    }

    cleanBodyLines.push(line);
  }

  let content = cleanBodyLines.join('\n').trim();

  // Jika title belum ditemukan, buat dari baris pertama atau fallback ke nama domain
  if (!title) {
    title = cleanBodyLines.find((l) => l.trim().length > 10)?.trim().replace(/^[#*_\-\s]+/, '') || `Berita dari ${domain}`;
  }

  // Batasi panjang konten sumber agar tidak melebihi konteks token AI (~12.000 karakter)
  if (content.length > 14000) {
    content = content.slice(0, 14000) + '\n\n...(konten artikel dipotong untuk efisiensi)...';
  }

  const words = content.split(/\s+/).filter(Boolean);
  const excerpt = content
    .replace(/[#*`_\[\]()]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 260) + '...';

  return {
    title,
    content,
    domain,
    wordCount: words.length,
    excerpt,
    sourceUrl,
  };
}

/**
 * Fallback parser HTML murni jika reader layer 1 tidak merespons
 */
function parseHtmlDirectly(html: string, sourceUrl: string, domain: string): ScrapedSourceData {
  // Ekstrak Title
  let title = '';
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch && titleMatch[1]) {
    title = decodeHtmlEntities(titleMatch[1].trim());
    // Bersihkan akhiran umum seperti " | The Verge" atau " - Reuters"
    title = title.replace(/\s*([\|\-–—]\s*[^\|\-–—]+)$/i, '').trim();
  }

  // Bersihkan tag-tag non-konten
  let sanitized = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ')
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, ' ')
    .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, ' ');

  // Ambil semua isi teks dalam paragraf <p>
  const paragraphMatches = sanitized.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || [];
  const paragraphs: string[] = [];

  for (const p of paragraphMatches) {
    const textOnly = decodeHtmlEntities(p.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
    if (textOnly.length > 40 && !textOnly.toLowerCase().includes('cookie') && !textOnly.toLowerCase().includes('subscribe')) {
      paragraphs.push(textOnly);
    }
  }

  let content = paragraphs.join('\n\n').trim();

  if (!title) {
    title = `Berita Terbaru dari ${domain}`;
  }

  if (content.length < 100) {
    throw new Error('Konten teks artikel terlalu pendek atau dilindungi paywall/captcha.');
  }

  if (content.length > 14000) {
    content = content.slice(0, 14000) + '\n\n...(konten artikel dipotong)...';
  }

  const words = content.split(/\s+/).filter(Boolean);
  const excerpt = content.slice(0, 260) + '...';

  return {
    title,
    content,
    domain,
    wordCount: words.length,
    excerpt,
    sourceUrl,
  };
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}
