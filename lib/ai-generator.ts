import fs from 'fs';
import path from 'path';
import { db } from '@/db';
import { articles, systemSettings } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export interface NewsSource {
  title: string;
  source: string;
  pubDate: string;
  snippet?: string;
  region?: 'ID' | 'GLOBAL';
}

export interface GeneratedArticleDraft {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string[];
  coverCaption: string;
  researchSources?: NewsSource[];
}

export type AIProvider = 'gemini' | 'groq' | '9router';

export interface GenerateArticleOptions {
  prompt: string;
  category?: string;
  length?: 'ringkas' | 'standar' | 'mendalam';
  provider?: AIProvider;
  enableWebSearch?: boolean;
}

function cleanHtml(html: string): string {
  return html
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractKeywords(prompt: string, category = 'AI'): { localQuery: string; globalQuery: string } {
  const stopWords = new Set([
    'bahas', 'ulas', 'sorot', 'analisis', 'buatkan', 'tuliskan', 'berita', 'mendalam',
    'tentang', 'terkait', 'bagaimana', 'perkembangan', 'terkini', 'terbaru', 'mutakhir',
    'generasi', 'baru', 'inovasi', 'industri', 'masyarakat', 'berdasarkan', 'riset',
    'data', 'faktual', 'fakta', 'saat', 'ini', 'dan', 'yang', 'di', 'dari', 'ke', 'untuk',
    'dengan', 'pada', 'serta', 'bagi', 'para', 'adopsi', 'standar', 'ekosistem', 'tren'
  ]);

  const words = prompt
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));

  const uniqueWords = Array.from(new Set(words));
  const keywordSlice = uniqueWords.slice(0, 4).join(' ');

  const categoryTerms: Record<string, { id: string; en: string }> = {
    ai: { id: 'AI kecerdasan buatan', en: 'Artificial Intelligence AI' },
    software: { id: 'software teknologi aplikasi', en: 'software engineering tools' },
    hardware: { id: 'semikonduktor chipset hardware', en: 'semiconductor hardware chips' },
    infrastruktur: { id: 'data center cloud keamanan siber', en: 'cloud data center cybersecurity' },
    gadget: { id: 'smartphone gadget teknologi', en: 'smartphone consumer tech gadget' },
    regional: { id: 'berita daerah pemda kebijakan daerah peristiwa', en: 'regional local government news' },
  };

  const defaultTerms = categoryTerms[category.toLowerCase()] || { id: 'teknologi terkini', en: 'technology news' };

  const localQuery = keywordSlice ? `${keywordSlice} ${defaultTerms.id.split(' ')[0]}`.trim() : defaultTerms.id;
  const globalQuery = keywordSlice ? `${keywordSlice} tech`.trim() : defaultTerms.en;

  return {
    localQuery: localQuery.slice(0, 60),
    globalQuery: globalQuery.slice(0, 60),
  };
}

async function fetchFromRssUrl(url: string, region: 'ID' | 'GLOBAL', maxItems = 3): Promise<NewsSource[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
    });
    clearTimeout(timeoutId);

    if (!res.ok) return [];

    const xml = await res.text();
    const items: NewsSource[] = [];
    const itemRegex = /<item>[\s\S]*?<\/item>/gi;
    const matches = xml.match(itemRegex) || [];

    for (const itemXml of matches.slice(0, maxItems)) {
      const titleMatch = itemXml.match(/<title>([\s\S]*?)<\/title>/i);
      const pubDateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);
      const sourceMatch = itemXml.match(/<source[^>]*>([\s\S]*?)<\/source>/i);
      const descMatch = itemXml.match(/<description>([\s\S]*?)<\/description>/i);

      const rawTitle = titleMatch ? cleanHtml(titleMatch[1]) : '';
      const source = sourceMatch ? cleanHtml(sourceMatch[1]) : (region === 'ID' ? 'Media Nasional' : 'Global Tech Media');
      const pubDate = pubDateMatch ? pubDateMatch[1].trim() : '';
      const rawSnippet = descMatch ? cleanHtml(descMatch[1]) : '';
      // Potong snippet agar padat dan informatif
      const snippet = rawSnippet.length > 250 ? `${rawSnippet.slice(0, 247)}...` : rawSnippet;

      if (rawTitle) {
        items.push({
          title: rawTitle,
          source,
          pubDate,
          snippet: snippet || undefined,
          region,
        });
      }
    }
    return items;
  } catch (err) {
    return [];
  }
}

export async function fetchGoogleNewsResearch(
  query: string,
  maxItems = 6,
  category = 'AI'
): Promise<NewsSource[]> {
  try {
    const { localQuery, globalQuery } = extractKeywords(query, category);

    const localUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(localQuery)}&hl=id&gl=ID&ceid=ID:id`;
    const globalUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(globalQuery)}&hl=en-US&gl=US&ceid=US:en`;

    // Eksekusi paralel 2 jalur (Lokal Indonesia & Global Dunia)
    const [localResult, globalResult] = await Promise.allSettled([
      fetchFromRssUrl(localUrl, 'ID', 3),
      fetchFromRssUrl(globalUrl, 'GLOBAL', 3),
    ]);

    const localSources = localResult.status === 'fulfilled' ? localResult.value : [];
    const globalSources = globalResult.status === 'fulfilled' ? globalResult.value : [];

    let combined = [...localSources, ...globalSources];

    // Fallback jika hasil query spesifik kosong: cari berdasarkan topik umum kategori
    if (combined.length < 2) {
      const fallbackUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(category + ' teknologi')}&hl=id&gl=ID&ceid=ID:id`;
      const fallbackItems = await fetchFromRssUrl(fallbackUrl, 'ID', 3);
      combined = [...combined, ...fallbackItems];
    }

    // Filter judul duplikat
    const seenTitles = new Set<string>();
    const uniqueSources: NewsSource[] = [];

    for (const item of combined) {
      const simplifiedTitle = item.title.slice(0, 35).toLowerCase();
      if (!seenTitles.has(simplifiedTitle)) {
        seenTitles.add(simplifiedTitle);
        uniqueSources.push(item);
      }
      if (uniqueSources.length >= maxItems) break;
    }

    return uniqueSources;
  } catch (err) {
    console.warn('Google News search failed or timed out:', err);
    return [];
  }
}

function extractJSON(text: string): any {
  let str = text.trim();

  // 1. Bersihkan blok ```json ... ``` atau ``` ... ```
  const codeBlockMatch = str.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch && codeBlockMatch[1]) {
    str = codeBlockMatch[1].trim();
  }

  // 2. Ambil dari { pertama sampai } terakhir
  const firstBrace = str.indexOf('{');
  const lastBrace = str.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    str = str.substring(firstBrace, lastBrace + 1);
  }

  // 3. Coba parse standar dulu
  try {
    return JSON.parse(str);
  } catch (e) {
    // gagal, lanjut ke sanitasi
  }

  // 4. Perbaiki unescaped newlines/tabs di dalam string literals JSON (penyebab Bad control character)
  try {
    const fixedControlChars = str.replace(/"((?:\\.|[^"\\])*)"/g, (match) => {
      return match
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');
    });
    return JSON.parse(fixedControlChars);
  } catch (e) {
    // lanjut
  }

  // 5. Perbaiki jika JSON terpotong di akhir
  try {
    let repaired = str.trim();
    if (!repaired.endsWith('}')) {
      const quoteCount = (repaired.match(/(?<!\\)"/g) || []).length;
      if (quoteCount % 2 !== 0) {
        repaired += '"';
      }
      repaired += '\n}';
      return JSON.parse(repaired);
    }
  } catch (e) {
    // lanjut
  }

  // 6. Fallback Ekstraksi Properti Menggunakan Regex (Anti-Gagal Total)
  const titleMatch = str.match(/"title"\s*:\s*"((?:\\.|[^"\\])*)"/);
  const slugMatch = str.match(/"slug"\s*:\s*"((?:\\.|[^"\\])*)"/);
  const excerptMatch = str.match(/"excerpt"\s*:\s*"((?:\\.|[^"\\])*)"/);
  const categoryMatch = str.match(/"category"\s*:\s*"((?:\\.|[^"\\])*)"/);
  const coverCaptionMatch = str.match(/"coverCaption"\s*:\s*"((?:\\.|[^"\\])*)"/);
  const contentMatch = str.match(/"content"\s*:\s*"([\s\S]*?)"(?:\s*,\s*"|\s*})/);

  if (titleMatch || contentMatch) {
    return {
      title: titleMatch ? titleMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n') : '',
      slug: slugMatch ? slugMatch[1] : '',
      excerpt: excerptMatch ? excerptMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n') : '',
      category: categoryMatch ? categoryMatch[1] : '',
      coverCaption: coverCaptionMatch ? coverCaptionMatch[1] : '',
      content: contentMatch ? contentMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n') : '',
      tags: [],
    };
  }

  throw new Error('Gagal mengekstrak format JSON dari respons AI.');
}

function parseAIResponseContent(rawBody: string): string {
  const trimmed = rawBody.trim();

  // 1. Cek apakah ini response SSE streaming (mengandung baris yang diawali data:)
  if (trimmed.startsWith('data:') || trimmed.includes('\ndata:') || trimmed.includes('\r\ndata:')) {
    let accumulatedContent = '';
    const lines = trimmed.split(/\r?\n/);
    for (const line of lines) {
      const lineTrimmed = line.trim();
      if (!lineTrimmed.startsWith('data:')) continue;

      const dataPayload = lineTrimmed.slice(5).trim();
      if (!dataPayload || dataPayload === '[DONE]') continue;

      try {
        const parsedChunk = JSON.parse(dataPayload);
        const choice = parsedChunk?.choices?.[0];
        const piece =
          choice?.delta?.content ??
          choice?.delta?.text ??
          choice?.message?.content ??
          choice?.text ??
          '';
        accumulatedContent += piece;
      } catch {
        // Abaikan baris chunk yang bukan JSON
      }
    }

    if (accumulatedContent.trim()) {
      return accumulatedContent.trim();
    }
  }

  // 2. Coba parse sebagai objek JSON standar
  try {
    const json = JSON.parse(trimmed);

    if (json?.error?.message) {
      throw new Error(`AI Gateway Error: ${json.error.message}`);
    }

    const choice = json?.choices?.[0];
    const content =
      choice?.message?.content ??
      choice?.text ??
      json?.content ??
      json?.response ??
      '';

    if (content) {
      return typeof content === 'string' ? content : JSON.stringify(content);
    }
  } catch (err: any) {
    if (err?.message?.startsWith('AI Gateway Error:')) {
      throw err;
    }
    // Bukan JSON standar, fallback ke string mentah
  }

  // 3. Jika bukan keduanya, kembalikan body mentah agar extractJSON yang menyaring
  return trimmed;
}

function sanitizeSlug(rawSlug: string): string {
  let cleaned = rawSlug
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!cleaned) {
    cleaned = `berita-teknologi-${Date.now()}`;
  } else {
    cleaned = `${cleaned}-${Date.now().toString().slice(-4)}`;
  }
  return cleaned;
}

function getEnvVar(key: string, defaultValue = ''): string {
  // 1. Cek process.env dulu (terutama saat di Vercel / serverless production)
  if (process.env[key]) {
    return process.env[key]!;
  }

  // 2. Fallback baca file .env.local saat running di lokal dev tanpa restart
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const lines = content.split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith(`${key}=`)) {
          let val = trimmed.slice(key.length + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (val) return val;
        }
      }
    }
  } catch (e) {
    // fallback
  }
  return defaultValue;
}

async function getDbConfig(key: string): Promise<string | null> {
  try {
    const [row] = await db
      .select({ value: systemSettings.value })
      .from(systemSettings)
      .where(eq(systemSettings.key, key))
      .limit(1);
    return row?.value?.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Membersihkan heading pertama jika mengulang judul artikel
 */
function cleanContentHeading(content: string, title: string): string {
  let cleaned = content.trim();
  const firstLineMatch = cleaned.match(/^(?:#+\s*)([^\n\r]+)/);
  if (firstLineMatch && firstLineMatch[1]) {
    const headingText = firstLineMatch[1].trim().toLowerCase();
    const titleText = title.trim().toLowerCase();
    if (
      headingText === titleText ||
      titleText.includes(headingText.slice(0, 20)) ||
      headingText.includes(titleText.slice(0, 20))
    ) {
      cleaned = cleaned.replace(/^(?:#+\s*)[^\n\r]+(?:\r?\n)+/, '').trim();
    }
  }
  return cleaned;
}

/**
 * Mengambil 20 artikel terakhir dari database untuk disuntikkan ke AI sebagai memori redaksi
 */
async function getRecentArticlesMemory(limit = 20): Promise<string> {
  try {
    const rows = await db
      .select({
        title: articles.title,
        category: articles.category,
        publishedAt: articles.publishedAt,
        createdAt: articles.createdAt,
      })
      .from(articles)
      .orderBy(desc(articles.id))
      .limit(limit);

    if (!rows || rows.length === 0) return '';

    const list = rows
      .map((r, i) => {
        const d = r.publishedAt ? new Date(r.publishedAt) : new Date(r.createdAt);
        const dateStr = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        return `${i + 1}. [${r.category}] "${r.title}" (${dateStr})`;
      })
      .join('\n');

    return `\n\nARSIP 20 BERITA TERBARU DI PORTAL NARATIF (MEMORI REDAKSI - CEK ANTI-DUPLIKASI):
${list}

PANDUAN ANTI-DUPLIKASI REDAKSI:
- JANGAN PERNAH mengulang fakta, peristiwa, atau topik yang sudah dibahas pada daftar berita di atas!
- Jika topik yang diminta berkaitan dengan salah satu berita di atas, kamu WAJIB menulisnya sebagai 'LIPUTAN KELANJUTAN' (Follow-up / Perkembangan Terbaru / Dampak Baru) dengan sudut pandang yang berbeda, BUKAN mengulang isi berita lama.`;
  } catch (err) {
    console.warn('Gagal memuat memori artikel terdahulu:', err);
    return '';
  }
}

export async function requestArticleFromModelRouter(
  options: GenerateArticleOptions
): Promise<GeneratedArticleDraft & { modelUsed: string; providerUsed: string }> {
  const provider: AIProvider = options.provider || 'gemini';

  const wordCountTarget =
    options.length === 'ringkas'
      ? '350 - 500 kata'
      : options.length === 'mendalam'
      ? '1000 - 1400 kata'
      : '600 - 800 kata';
  const targetCategory = options.category || 'AI';

  // 1. Lakukan riset Google News secara mendalam (Dual Engine: Lokal & Global) jika diaktifkan (Default: Aktif)
  let researchSources: NewsSource[] = [];
  if (options.enableWebSearch !== false) {
    researchSources = await fetchGoogleNewsResearch(options.prompt, 6, targetCategory);
  }

  // 1.1 Ambil 20 artikel terbaru dari database secara dinamis sebagai Memori Anti-Duplikasi
  const memoryContext = await getRecentArticlesMemory(20);

  let baseUrl = '';
  let apiKey = '';
  let modelName = '';
  let useJsonFormat = false;

  if (provider === 'gemini') {
    baseUrl = getEnvVar('GEMINI_BASE_URL', 'https://generativelanguage.googleapis.com/v1beta/openai');
    apiKey = getEnvVar('GEMINI_API_KEY');
    modelName = getEnvVar('GEMINI_MODEL', 'gemini-3.8-flash');
    useJsonFormat = true;
  } else if (provider === 'groq') {
    baseUrl = getEnvVar('GROQ_BASE_URL', 'https://api.groq.com/openai/v1');
    apiKey = getEnvVar('GROQ_API_KEY');
    modelName = getEnvVar('GROQ_MODEL', 'openai/gpt-oss-120b');
    useJsonFormat = true;
  } else {
    const dbBaseUrl = await getDbConfig('ai_9router_base_url');
    const dbApiKey = await getDbConfig('ai_9router_api_key');
    const dbModel = await getDbConfig('ai_9router_model');

    baseUrl = dbBaseUrl || getEnvVar('LOCAL_9ROUTER_BASE_URL', 'http://localhost:20128/v1');
    apiKey = dbApiKey !== null && dbApiKey !== undefined ? dbApiKey : getEnvVar('LOCAL_9ROUTER_KEY');
    modelName = dbModel || getEnvVar('LOCAL_9ROUTER_MODEL', 'oc/muse-spark-1.3-contributor-free');
    useJsonFormat = false;
  }

  if (!apiKey && provider !== '9router') {
    throw new Error(`API Key untuk ${provider} belum disetel di Environment Variables`);
  }

  baseUrl = baseUrl.replace(/\/+$/, '');
  const endpoint = `${baseUrl}/chat/completions`;

  const systemPrompt = `Anda adalah jurnalis teknologi senior dan editor utama di portal media teknologi terkemuka "Naratif" (Indonesia).
Tugas Anda adalah menulis artikel berita teknologi yang mendalam, berwawasan tajam, faktual, dan menarik untuk para antusias teknologi, developer, dan praktisi industri.

ATURAN PENULISAN:
1. Bahasa: Bahasa Indonesia baku, modern, dan bergaya jurnalisme teknologi berbobot (5W + 1H, dengan analisis dampak industri).
2. Format Konten: Gunakan Markdown murni yang rapi (Heading ##, ###, bullet points, penekanan bold, kutipan analitis >). JANGAN gunakan tag HTML mentah seperti <p>, <div>, <span>.
3. Panjang konten: Target ${wordCountTarget}.
4. Kategori artikel HARUS salah satu dari: ["AI", "Software", "Hardware", "Gadget", "Infrastruktur", "Regional"]. Khusus kategori "Regional", fokuskan narasi pada fakta peristiwa daerah, kebijakan/pernyataan kepala daerah (Pemda/Gubernur/Walikota), pelayanan fasilitas publik, dan dampaknya bagi warga.
5. Validitas Riset & E-E-A-T: Manfaatkan entitas, narasumber, angka, dan fakta dari HASIL RISET RIIL yang disediakan. Di akhir konten (bagian paling bawah), WAJIB buatkan sub-heading "## Referensi Berita Terkait" berupa poin-poin yang menyebutkan media/sumber fakta yang Anda jadikan rujukan agar kredibilitas jurnalisme dan SEO E-E-A-T artikel terjamin.
6. Larangan Judul Ganda: DILARANG mengulang judul berita sebagai Heading (# atau ##) di baris pertama 'content'. Bagian 'content' WAJIB langsung dimulai dengan paragraf teks pembuka artikel berita.
7. Output: WAJIB HANYA berupa objek JSON murni (VALID JSON) tanpa pembuka atau penutup obrolan apa pun di luar JSON.

FORMAT STRUKTUR JSON YANG WAJIB ANDA HASILKAN:
{
  "title": "Judul Berita yang Memikat, Faktual, dan Bernilai Berita Tinggi (Maks 15 kata)",
  "slug": "slug-url-ramah-seo-berdasarkan-judul",
  "excerpt": "Ringkasan tajam 2-3 kalimat yang menggambarkan inti berita (maksimal 250 karakter)",
  "category": "${targetCategory}",
  "tags": ["Tag1", "Tag2", "Tag3", "Tag4"],
  "coverCaption": "Deskripsi singkat foto/ilustrasi berita (maksimal 100 karakter)",
  "content": "Isi lengkap berita dalam format Markdown..."
}`;

  let newsContext = '';
  if (researchSources.length > 0) {
    newsContext = `\n\nHASIL RISET DUAL-ENGINE TERKINI (Google News Indonesia & Global):
${researchSources.map((item, idx) => {
  const regionLabel = item.region === 'GLOBAL' ? '[Media Global]' : '[Media Nasional]';
  const snippetStr = item.snippet ? `\n   Konteks/Fakta: "${item.snippet}"` : '';
  return `${idx + 1}. ${regionLabel} [${item.source} - ${item.pubDate}]: ${item.title}${snippetStr}`;
}).join('\n')}\n
PANDUAN PEMANFAATAN RISET:
- Gunakan data, peristiwa, nama perusahaan, narasumber, dan tren dari hasil riset di atas sebagai inti tulisan.
- Padukan konteks global dengan relevansi dan dampaknya bagi industri teknologi maupun pengguna di Indonesia.
- Pada bagian akhir artikel berita, sertakan subjudul "## Referensi Berita Terkait" yang mencantumkan sumber/media di atas secara profesional.`;
  }

  const userPrompt = `Buatkan artikel berita teknologi profesional tentang topik berikut:
"${options.prompt}"
${newsContext}
${memoryContext}
Target Kategori yang diutamakan: ${targetCategory}
Panjang artikel: ${wordCountTarget}

Ingat, balas HANYA dengan dokumen JSON yang valid sesuai format yang ditentukan.`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const payload: any = {
    model: modelName,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
    max_tokens: 4500,
  };
  if (provider === '9router') {
    payload.stream = false;
  }
  if (useJsonFormat) {
    payload.response_format = { type: 'json_object' };
  }

  // Eksekusi request dengan retry handling untuk status 503/429 (Lonjakan trafik sesaat di server Google)
  let response: Response | null = null;
  let lastErrorText = '';

  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      break;
    }

    lastErrorText = await response.text();
    if ((response.status === 503 || response.status === 429) && attempt < maxAttempts) {
      const waitMs = attempt * 2000;
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }
    break;
  }

  if (!response || !response.ok) {
    throw new Error(`AI Gateway Error (${response?.status || 'Unknown'}): ${lastErrorText || response?.statusText}`);
  }

  const rawBodyText = await response.text();
  const rawContent = parseAIResponseContent(rawBodyText);

  if (!rawContent) {
    throw new Error('AI Gateway tidak mengembalikan konten artikel.');
  }

  const parsed = extractJSON(rawContent);

  // Validasi field
  if (!parsed.title || !parsed.content) {
    throw new Error('Respons AI tidak memiliki judul atau konten yang lengkap.');
  }

  const validCategories = ['AI', 'Software', 'Hardware', 'Gadget', 'Infrastruktur', 'Regional'];
  let finalCategory = targetCategory;
  if (parsed.category && validCategories.includes(parsed.category)) {
    finalCategory = parsed.category;
  }

  const tags = Array.isArray(parsed.tags) && parsed.tags.length > 0
    ? parsed.tags.map((t: any) => String(t).trim()).filter(Boolean)
    : [finalCategory, 'Teknologi', 'Naratif'];

  return {
    title: String(parsed.title).trim(),
    slug: sanitizeSlug(parsed.slug || parsed.title),
    excerpt: String(parsed.excerpt || parsed.title).slice(0, 500).trim(),
    content: cleanContentHeading(String(parsed.content).trim(), String(parsed.title).trim()),
    category: finalCategory,
    tags,
    coverCaption: String(parsed.coverCaption || `Ilustrasi liputan ${parsed.title}`).trim(),
    researchSources,
    modelUsed: modelName,
    providerUsed: provider,
  };
}

export interface SadurArticleOptions {
  sourceUrl: string;
  sourceTitle: string;
  sourceContent: string;
  domain: string;
  category?: string;
  length?: 'ringkas' | 'standar' | 'mendalam';
  provider?: AIProvider;
}

export async function requestSadurArticleFromSource(
  options: SadurArticleOptions
): Promise<GeneratedArticleDraft & { modelUsed: string; providerUsed: string }> {
  const provider: AIProvider = options.provider || 'groq';

  const wordCountTarget =
    options.length === 'ringkas'
      ? '350 - 500 kata'
      : options.length === 'mendalam'
      ? '1000 - 1400 kata'
      : '600 - 800 kata';
  const targetCategory = options.category || 'AI';

  let baseUrl = '';
  let apiKey = '';
  let modelName = '';
  let useJsonFormat = false;

  if (provider === 'gemini') {
    baseUrl = getEnvVar('GEMINI_BASE_URL', 'https://generativelanguage.googleapis.com/v1beta/openai');
    apiKey = getEnvVar('GEMINI_API_KEY');
    modelName = getEnvVar('GEMINI_MODEL', 'gemini-3.8-flash');
    useJsonFormat = true;
  } else if (provider === 'groq') {
    baseUrl = getEnvVar('GROQ_BASE_URL', 'https://api.groq.com/openai/v1');
    apiKey = getEnvVar('GROQ_API_KEY');
    modelName = getEnvVar('GROQ_MODEL', 'openai/gpt-oss-120b');
    useJsonFormat = true;
  } else {
    const dbBaseUrl = await getDbConfig('ai_9router_base_url');
    const dbApiKey = await getDbConfig('ai_9router_api_key');
    const dbModel = await getDbConfig('ai_9router_model');

    baseUrl = dbBaseUrl || getEnvVar('LOCAL_9ROUTER_BASE_URL', 'http://localhost:20128/v1');
    apiKey = dbApiKey !== null && dbApiKey !== undefined ? dbApiKey : getEnvVar('LOCAL_9ROUTER_KEY');
    modelName = dbModel || getEnvVar('LOCAL_9ROUTER_MODEL', 'oc/muse-spark-1.3-contributor-free');
    useJsonFormat = false;
  }

  if (!apiKey && provider !== '9router') {
    throw new Error(`API Key untuk ${provider} belum disetel di Environment Variables`);
  }

  // Ambil 20 artikel terbaru dari database secara dinamis sebagai Memori Anti-Duplikasi
  const memoryContext = await getRecentArticlesMemory(20);

  baseUrl = baseUrl.replace(/\/+$/, '');
  const endpoint = `${baseUrl}/chat/completions`;

  const systemPrompt = `Anda adalah jurnalis teknologi senior dan editor penyadur berita di portal media teknologi "Naratif" (Indonesia).
Tugas Anda adalah membaca laporan berita sumber asli, mengekstrak fakta-fakta kunci, dan MENULIS ULANG (REWRITE / SADUR) menjadi naskah berita orisinal berbahasa Indonesia yang segar, berwawasan tajam, dan memenuhi standar jurnalisme piramida terbalik.

ATURAN PENULISAN:
1. Bahasa: Bahasa Indonesia baku, modern, dan bergaya jurnalisme teknologi berbobot.
2. Anti-Plagiarisme: JANGAN melakukan terjemahan harfiah kata demi kata. Susun kembali struktur kalimat dan alur paragraf dengan gaya narasi redaksi Naratif yang mengalir dan dinamis.
3. Faktual & Akurat: Pertahankan semua fakta riil, angka, data teknis, kronologi peristiwa, nama perusahaan, serta nama narasumber dan kutipannya dari artikel sumber.
4. Format Konten: Gunakan Markdown murni (Heading ##, ###, bullet points, penekanan bold, kutipan analitis >). JANGAN gunakan tag HTML mentah seperti <p>, <div>, <span>.
5. Panjang konten: Target ${wordCountTarget}.
6. Kategori artikel HARUS salah satu dari: ["AI", "Software", "Hardware", "Gadget", "Infrastruktur", "Regional"].
7. Atribusi Sumber Wajib: Pada bagian paling bawah artikel (baris terakhir), WAJIB sertakan baris atribusi etis:
   ---
   *Dikutip dan disadur berdasarkan laporan dari ${options.domain || 'sumber terkait'} (${options.sourceUrl}).*
8. Larangan Judul Ganda: DILARANG mengulang judul berita sebagai Heading (# atau ##) di baris pertama 'content'. Bagian 'content' WAJIB langsung dimulai dengan paragraf teks narasi liputan.
9. Output: WAJIB HANYA berupa objek JSON murni (VALID JSON) tanpa teks obrolan apa pun di luar JSON.

FORMAT STRUKTUR JSON YANG WAJIB ANDA HASILKAN:
{
  "title": "Judul Berita Baru yang Menarik, Faktual, dan Orisinal (Maks 15 kata)",
  "slug": "slug-url-ramah-seo-berdasarkan-judul-baru",
  "excerpt": "Ringkasan tajam 2-3 kalimat yang menggambarkan inti berita (maksimal 250 karakter)",
  "category": "${targetCategory}",
  "tags": ["Tag1", "Tag2", "Tag3", "Tag4"],
  "coverCaption": "Deskripsi singkat foto/ilustrasi berita (maksimal 100 karakter)",
  "content": "Isi lengkap berita dalam format Markdown..."
}`;

  const userPrompt = `Silakan sadur dan tulis ulang laporan berita sumber berikut menjadi artikel berita Naratif yang orisinal:

SUMBER ASLI:
- Judul Sumber: "${options.sourceTitle}"
- Media / Domain: ${options.domain}
- URL Sumber: ${options.sourceUrl}

ISI TEKS SUMBER:
"""
${options.sourceContent}
"""
${memoryContext}

Target Kategori yang diutamakan: ${targetCategory}
Panjang artikel target: ${wordCountTarget}

Ingat, balas HANYA dengan dokumen JSON yang valid sesuai format yang ditentukan.`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const payload: any = {
    model: modelName,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
    max_tokens: 4500,
  };
  if (provider === '9router') {
    payload.stream = false;
  }
  if (useJsonFormat) {
    payload.response_format = { type: 'json_object' };
  }

  let response: Response | null = null;
  let lastErrorText = '';

  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      break;
    }

    lastErrorText = await response.text();
    if ((response.status === 503 || response.status === 429) && attempt < maxAttempts) {
      const waitMs = attempt * 2000;
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }
    break;
  }

  if (!response || !response.ok) {
    throw new Error(`AI Gateway Error (${response?.status || 'Unknown'}): ${lastErrorText || response?.statusText}`);
  }

  const rawBodyText = await response.text();
  const rawContent = parseAIResponseContent(rawBodyText);

  if (!rawContent) {
    throw new Error('AI Gateway tidak mengembalikan konten artikel.');
  }

  const parsed = extractJSON(rawContent);

  if (!parsed.title || !parsed.content) {
    throw new Error('Respons AI tidak memiliki judul atau konten yang lengkap.');
  }

  const validCategories = ['AI', 'Software', 'Hardware', 'Gadget', 'Infrastruktur', 'Regional'];
  let finalCategory = targetCategory;
  if (parsed.category && validCategories.includes(parsed.category)) {
    finalCategory = parsed.category;
  }

  const tags = Array.isArray(parsed.tags) && parsed.tags.length > 0
    ? parsed.tags.map((t: any) => String(t).trim()).filter(Boolean)
    : [finalCategory, 'Teknologi', options.domain || 'Naratif'];

  return {
    title: String(parsed.title).trim(),
    slug: sanitizeSlug(parsed.slug || parsed.title),
    excerpt: String(parsed.excerpt || parsed.title).slice(0, 500).trim(),
    content: cleanContentHeading(String(parsed.content).trim(), String(parsed.title).trim()),
    category: finalCategory,
    tags,
    coverCaption: String(parsed.coverCaption || `Ilustrasi liputan ${parsed.title}`).trim(),
    modelUsed: modelName,
    providerUsed: provider,
  };
}

