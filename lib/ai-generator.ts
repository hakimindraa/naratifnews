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
  region?: string;
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

function extractKeywords(prompt: string, category = 'AI', region?: string): { localQuery: string; globalQuery: string } {
  const isRegional = category.toLowerCase() === 'regional';
  const stopWords = new Set([
    'bahas', 'ulas', 'sorot', 'analisis', 'buatkan', 'tuliskan', 'berita', 'mendalam',
    'tentang', 'terkait', 'bagaimana', 'perkembangan', 'terkini', 'terbaru', 'mutakhir',
    'generasi', 'baru', 'inovasi', 'industri', 'masyarakat', 'berdasarkan', 'riset',
    'data', 'faktual', 'fakta', 'saat', 'ini', 'dan', 'yang', 'di', 'dari', 'ke', 'untuk',
    'dengan', 'pada', 'serta', 'bagi', 'para', 'adopsi', 'standar', 'ekosistem', 'tren',
    'pengaruhnya', 'terhadap', 'pasar', 'laporan', 'rilis', 'era', 'digital', 'dunia'
  ]);

  const words = prompt
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));

  const uniqueWords = Array.from(new Set(words));

  // ISOLASI KATEGORI REGIONAL: Tidak mencampurkan kata kunci teknologi sama sekali
  if (isRegional) {
    const regionalTerms = [
      'kebijakan pemprov pemda dinas',
      'pelayanan publik fasilitas daerah',
      'anggaran dinas proyek infrastruktur daerah',
      'peristiwa warga tata kota daerah'
    ];
    const baseTerm = regionalTerms[Math.floor(Math.random() * regionalTerms.length)];
    const cleanRegion = (region && region !== 'Umum' && !region.toLowerCase().includes('semua')) ? region.trim() : '';

    const queryParts: string[] = [];
    if (cleanRegion) {
      queryParts.push(cleanRegion);
    }
    if (uniqueWords.length > 0) {
      queryParts.push(uniqueWords.slice(0, 3).join(' '));
    } else {
      queryParts.push(baseTerm);
    }

    const localQuery = queryParts.join(' ').slice(0, 60);
    return {
      localQuery,
      globalQuery: '', // Regional 100% berita Indonesia, tidak mencari ke media global US
    };
  }

  // Kategori Teknologi (AI, Software, Hardware, Infrastruktur, Gadget)
  const categoryTerms: Record<string, { id: string[]; en: string[] }> = {
    ai: {
      id: ['AI kecerdasan buatan', 'model AI OpenAI Google', 'kecerdasan buatan terapan', 'AI agent inovasi'],
      en: ['Artificial Intelligence AI', 'LLM AI models', 'generative AI tech', 'AI agents technology'],
    },
    software: {
      id: ['software teknologi aplikasi', 'rekayasa perangkat lunak', 'developer open source cloud', 'framework bahasa pemrograman'],
      en: ['software engineering tools', 'developer tech framework', 'open source software', 'cloud native app'],
    },
    hardware: {
      id: ['semikonduktor chipset hardware', 'prosesor GPU komputasi', 'arsitektur semikonduktor chip', 'fabrikasi silikon hardware'],
      en: ['semiconductor hardware chips', 'processor GPU computing', 'chip architecture technology', 'silicon hardware tech'],
    },
    infrastruktur: {
      id: ['data center cloud keamanan siber', 'infrastruktur komputasi awan', 'jaringan server telekomunikasi', 'keamanan siber data breach'],
      en: ['cloud data center cybersecurity', 'cloud infrastructure computing', 'network telecom servers', 'cybersecurity technology'],
    },
    gadget: {
      id: ['smartphone gadget teknologi', 'HP terbaru kamera baterai', 'perangkat wearable tablet pintar', 'gadget consumer tech'],
      en: ['smartphone consumer tech gadget', 'flagship smartphone review', 'wearable smart devices', 'mobile consumer electronics'],
    },
  };

  const catKey = category.toLowerCase();
  const defaultTerms = categoryTerms[catKey] || {
    id: ['teknologi terkini', 'inovasi teknologi digital'],
    en: ['technology news', 'digital innovation tech'],
  };

  // Pilih variasi istilah kategori secara acak agar query dinamis jika prompt berupa preset umum
  const randomIdTerm = defaultTerms.id[Math.floor(Math.random() * defaultTerms.id.length)];
  const randomEnTerm = defaultTerms.en[Math.floor(Math.random() * defaultTerms.en.length)];

  // Jika kata kunci unik banyak (misal prompt panjang/preset), kita pilih 2-3 kata dengan offset bervariasi
  let keywordSlice = '';
  if (uniqueWords.length > 4) {
    const offset = Math.floor(Math.random() * Math.max(1, uniqueWords.length - 2));
    keywordSlice = uniqueWords.slice(offset, offset + 3).join(' ');
  } else if (uniqueWords.length > 0) {
    keywordSlice = uniqueWords.join(' ');
  }

  const localQuery = keywordSlice ? `${keywordSlice} ${randomIdTerm.split(' ')[0]}`.trim() : randomIdTerm;
  const globalQuery = keywordSlice ? `${keywordSlice} tech`.trim() : randomEnTerm;

  return {
    localQuery: localQuery.slice(0, 60),
    globalQuery: globalQuery.slice(0, 60),
  };
}

async function fetchFromRssUrl(url: string, region: 'ID' | 'GLOBAL', maxItems = 4): Promise<NewsSource[]> {
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
  category = 'AI',
  region?: string
): Promise<NewsSource[]> {
  try {
    const isRegional = category.toLowerCase() === 'regional';
    const { localQuery, globalQuery } = extractKeywords(query, category, region);

    // Filter Waktu 24 Jam Terakhir (when:1d) untuk menjamin berita yang didapat adalah peristiwa terkini hari ini
    const localUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(localQuery + ' when:1d')}&hl=id&gl=ID&ceid=ID:id`;

    // Eksekusi: Khusus Regional hanya mencari di Google News Indonesia (Media Nasional & Lokal), TIDAK ke Global US
    let localSources: NewsSource[] = [];
    let globalSources: NewsSource[] = [];

    if (isRegional) {
      localSources = await fetchFromRssUrl(localUrl, 'ID', maxItems);
    } else {
      const globalUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(globalQuery + ' when:1d')}&hl=en-US&gl=US&ceid=US:en`;
      const [localRes, globalRes] = await Promise.allSettled([
        fetchFromRssUrl(localUrl, 'ID', 4),
        fetchFromRssUrl(globalUrl, 'GLOBAL', 4),
      ]);
      localSources = localRes.status === 'fulfilled' ? localRes.value : [];
      globalSources = globalRes.status === 'fulfilled' ? globalRes.value : [];
    }

    let combined = [...localSources, ...globalSources];

    // Fallback jika hasil query spesifik 1 hari terakhir kosong: cari rentang 2 hari (when:2d)
    if (combined.length < 2) {
      const fallbackUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(localQuery + ' when:2d')}&hl=id&gl=ID&ceid=ID:id`;
      const fallbackItems = await fetchFromRssUrl(fallbackUrl, 'ID', 4);
      combined = [...combined, ...fallbackItems];
    }

    // Fallback jika masih minim: gunakan kata kunci kategori dalam 2 hari terakhir (Terisolasi dari kata 'teknologi' jika Regional)
    if (combined.length < 2) {
      const cleanRegion = (region && region !== 'Umum' && !region.toLowerCase().includes('semua')) ? region.trim() : '';
      const fallbackCatQuery = isRegional
        ? `berita daerah pemda pelayanan publik ${cleanRegion} when:2d`.trim()
        : `${category} teknologi when:2d`;
      const fallbackCatUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(fallbackCatQuery)}&hl=id&gl=ID&ceid=ID:id`;
      const fallbackCatItems = await fetchFromRssUrl(fallbackCatUrl, 'ID', 4);
      combined = [...combined, ...fallbackCatItems];
    }

    // Ambil riwayat judul artikel yang sudah pernah ada di database agar tidak meliput berita yang sudah pernah ditulis
    let recentDbTitles: string[] = [];
    try {
      const recentRows = await db
        .select({ title: articles.title })
        .from(articles)
        .orderBy(desc(articles.id))
        .limit(40);
      recentDbTitles = recentRows.map((r) => r.title.toLowerCase());
    } catch {
      // Abaikan jika query database gagal
    }

    // Filter judul duplikat di antara hasil riset DAN terhadap artikel yang sudah ada di database
    const seenTitles = new Set<string>();
    const uniqueSources: NewsSource[] = [];

    for (const item of combined) {
      const simplifiedTitle = item.title.slice(0, 35).toLowerCase();
      if (seenTitles.has(simplifiedTitle)) continue;

      // Cek apakah topik berita ini sudah pernah dibuat artikelnya di Naratif
      const isAlreadyInDb = recentDbTitles.some((dbTitle) => {
        const itemWords = item.title
          .toLowerCase()
          .replace(/[^a-z0-9]/g, ' ')
          .split(/\s+/)
          .filter((w: string) => w.length > 3);
        if (itemWords.length === 0) return false;
        const matchWords = itemWords.filter((w: string) => dbTitle.includes(w));
        return matchWords.length / itemWords.length >= 0.55;
      });

      if (isAlreadyInDb) {
        // Berita ini sudah pernah ditulis di portal Naratif, lewati agar AI mendapat topik yang benar-benar baru
        continue;
      }

      seenTitles.add(simplifiedTitle);
      uniqueSources.push(item);
      if (uniqueSources.length >= maxItems) break;
    }

    // Jika seluruh hasil tersaring habis (misal semua berita top sudah ditulis), gunakan berita combined agar AI tetap memiliki referensi
    if (uniqueSources.length === 0 && combined.length > 0) {
      for (const item of combined) {
        const simplifiedTitle = item.title.slice(0, 35).toLowerCase();
        if (!seenTitles.has(simplifiedTitle)) {
          seenTitles.add(simplifiedTitle);
          uniqueSources.push(item);
        }
        if (uniqueSources.length >= maxItems) break;
      }
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
export interface InternalLinkCandidate {
  id: number;
  title: string;
  slug: string;
  category: string;
  url: string;
}

/**
 * Mengambil kandidat artikel terbaru untuk Smart Internal Linking ("Baca Juga") otomatis pasca-generasi
 */
async function getInternalLinkCandidates(limit = 15): Promise<InternalLinkCandidate[]> {
  try {
    const rows = await db
      .select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        category: articles.category,
      })
      .from(articles)
      .orderBy(desc(articles.id))
      .limit(limit);

    if (!rows || rows.length === 0) {
      return [];
    }

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      slug: r.slug,
      category: r.category,
      url: `/berita-teknologi/${r.category.toLowerCase().replace(/\s+/g, '-')}/${r.id}/${r.slug}`,
    }));
  } catch (err) {
    console.warn('Gagal memuat kandidat internal link:', err);
    return [];
  }
}

/**
 * Menyisipkan tautan internal otomatis jika AI belum menuliskannya di konten
 */
function injectInternalLinkIfMissing(
  content: string,
  candidates: InternalLinkCandidate[],
  currentCategory = ''
): string {
  if (!candidates || candidates.length === 0) return content;

  // Cek apakah konten sudah memiliki format "Baca Juga:"
  if (/baca juga\s*:/i.test(content)) {
    return content;
  }

  // Prioritaskan kategori yang sama, jika tidak ada gunakan semua kandidat
  const sameCategoryCandidates = candidates.filter(
    (c) => c.category.toLowerCase() === currentCategory.toLowerCase()
  );
  const pool = sameCategoryCandidates.length > 0 ? sameCategoryCandidates : candidates;
  const picked = pool[Math.floor(Math.random() * pool.length)];

  if (!picked) return content;

  const bacaJugaSnippet = `\n\n**Baca juga:** [${picked.title}](${picked.url})\n\n`;

  // Sisipkan di tengah artikel (sekitar paragraf ke-3 atau separuh artikel)
  const paragraphs = content.split(/\n\s*\n/);
  if (paragraphs.length >= 4) {
    const splitIndex = Math.min(3, Math.floor(paragraphs.length / 2));
    const before = paragraphs.slice(0, splitIndex).join('\n\n');
    const after = paragraphs.slice(splitIndex).join('\n\n');
    return `${before}${bacaJugaSnippet}${after}`;
  } else {
    // Jika artikel pendek, taruh sebelum bagian akhir
    return `${content.trimEnd()}${bacaJugaSnippet}`;
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

  // 1. Lakukan riset Google News secara mendalam jika diaktifkan (Default: Aktif)
  let researchSources: NewsSource[] = [];
  if (options.enableWebSearch !== false) {
    researchSources = await fetchGoogleNewsResearch(options.prompt, 6, targetCategory, options.region);
  }

  // 1.1 Ambil kandidat artikel terbaru untuk Smart Internal Linking ("Baca Juga") otomatis pasca-generasi
  const internalCandidates = await getInternalLinkCandidates(15);

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

  const isRegional = targetCategory.toLowerCase() === 'regional';
  const cleanRegion = (options.region && options.region !== 'Umum' && !options.region.toLowerCase().includes('semua'))
    ? options.region.trim()
    : '';
  const regionalScope = cleanRegion ? `khusus wilayah ${cleanRegion}` : 'daerah';

  const systemPrompt = isRegional
    ? `Anda adalah wartawan senior liputan daerah dan editor meja berita regional di portal media terkemuka "Naratif" (Indonesia).
Tugas Anda adalah menulis berita liputan ${regionalScope} yang faktual, mendalam, dan relevan bagi kehidupan warga setempat.

ATURAN PENULISAN:
1. Bahasa: Bahasa Indonesia baku, bergaya jurnalisme meja kota/daerah yang lugas, hangat, dan berimbang (5W + 1H).
2. Sudut Pandang Faktual: Fokuskan narasi pada fakta peristiwa daerah, kebijakan/pernyataan kepala daerah (Pemprov/Pemkab/Pemkot, Gubernur, Bupati, Walikota, atau Kepala Dinas terkait), pelayanan fasilitas publik, dan dampaknya bagi warga.
3. Format Konten: Gunakan Markdown murni yang rapi (Heading ##, ###, bullet points, penekanan bold, kutipan analitis >). JANGAN gunakan tag HTML mentah seperti <p>, <div>, <span>.
4. Panjang konten: Target ${wordCountTarget}.
5. Kategori: WAJIB bernilai "Regional".
6. Atribusi Sumber Riset: Di akhir naskah berita (baris terakhir), WAJIB sertakan garis pembatas (---) diikuti satu baris sumber ringkas: "*Sumber: [Nama-nama media/dinas rujukan, dipisahkan koma].*". Contoh: "*Sumber: Antara, Detik, Pemprov Jatim.*". DILARANG mencantumkan link URL panjang atau teks bertele-tele.
7. Larangan Judul Ganda: DILARANG mengulang judul berita sebagai Heading (# atau ##) di baris pertama 'content'. Bagian 'content' WAJIB langsung dimulai dengan paragraf teks narasi pembuka.
8. Output: WAJIB HANYA berupa objek JSON murni (VALID JSON) tanpa pembuka atau penutup obrolan apa pun di luar JSON.

FORMAT STRUKTUR JSON YANG WAJIB ANDA HASILKAN:
{
  "title": "Judul Berita Daerah yang Memikat, Faktual, dan Bernilai Berita Tinggi (Maks 15 kata)",
  "slug": "slug-url-ramah-seo-berdasarkan-judul",
  "excerpt": "Ringkasan tajam 2-3 kalimat yang menggambarkan inti berita (maksimal 250 karakter)",
  "category": "Regional",
  "tags": ["Regional", "${cleanRegion || 'Daerah'}", "Kebijakan Daerah", "Pemda"],
  "coverCaption": "Deskripsi singkat foto/ilustrasi berita (maksimal 100 karakter)",
  "content": "Isi lengkap berita dalam format Markdown..."
}`
    : `Anda adalah jurnalis teknologi senior dan editor utama di portal media teknologi terkemuka "Naratif" (Indonesia).
Tugas Anda adalah menulis artikel berita teknologi yang mendalam, berwawasan tajam, faktual, dan menarik untuk para antusias teknologi, developer, dan praktisi industri.

ATURAN PENULISAN:
1. Bahasa: Bahasa Indonesia baku, modern, dan bergaya jurnalisme teknologi berbobot (5W + 1H, dengan analisis dampak industri).
2. Format Konten: Gunakan Markdown murni yang rapi (Heading ##, ###, bullet points, penekanan bold, kutipan analitis >). JANGAN gunakan tag HTML mentah seperti <p>, <div>, <span>.
3. Panjang konten: Target ${wordCountTarget}.
4. Kategori artikel HARUS salah satu dari: ["AI", "Software", "Hardware", "Gadget", "Infrastruktur"].
5. Atribusi Sumber Riset: Di akhir naskah berita (baris terakhir), WAJIB sertakan garis pembatas (---) diikuti satu baris sumber ringkas: "*Sumber: [Nama-nama media berita rujukan, dipisahkan koma].*". Contoh: "*Sumber: Cult of Mac, Finder Australia, TelecomTalk.*". DILARANG mencantumkan link URL panjang atau teks bertele-tele.
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
- Pada bagian paling akhir artikel, sertakan garis pembatas (---) dan satu baris ringkas: "*Sumber: [Daftar nama media berita yang menjadi referensi di atas dipisahkan koma].*" (Contoh: "*Sumber: Reuters, TechCrunch, The Verge.*"). JANGAN mencantumkan link URL mentah.`;
  }

  const userPrompt = `Buatkan artikel berita ${isRegional ? `regional liputan ${regionalScope}` : 'teknologi'} profesional tentang topik berikut:
"${options.prompt}"
${newsContext}
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

  const cleanedContent = cleanContentHeading(String(parsed.content).trim(), String(parsed.title).trim());
  const finalContent = injectInternalLinkIfMissing(cleanedContent, internalCandidates, finalCategory);

  return {
    title: String(parsed.title).trim(),
    slug: sanitizeSlug(parsed.slug || parsed.title),
    excerpt: String(parsed.excerpt || parsed.title).slice(0, 500).trim(),
    content: finalContent,
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

  // Ambil kandidat artikel terbaru untuk Smart Internal Linking ("Baca Juga") otomatis pasca-generasi
  const internalCandidates = await getInternalLinkCandidates(15);

  baseUrl = baseUrl.replace(/\/+$/, '');
  const endpoint = `${baseUrl}/chat/completions`;

  const cleanDomain = options.domain
    ? options.domain.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '')
    : 'Sumber Terkait';

  const systemPrompt = `Anda adalah jurnalis teknologi senior dan editor penyadur berita di portal media teknologi "Naratif" (Indonesia).
Tugas Anda adalah membaca laporan berita sumber asli, mengekstrak fakta-fakta kunci, dan MENULIS ULANG (REWRITE / SADUR) menjadi naskah berita orisinal berbahasa Indonesia yang segar, berwawasan tajam, dan memenuhi standar jurnalisme piramida terbalik.

ATURAN PENULISAN:
1. Bahasa: Bahasa Indonesia baku, modern, dan bergaya jurnalisme teknologi berbobot.
2. Anti-Plagiarisme: JANGAN melakukan terjemahan harfiah kata demi kata. Susun kembali struktur kalimat dan alur paragraf dengan gaya narasi redaksi Naratif yang mengalir dan dinamis.
3. Faktual & Akurat: Pertahankan semua fakta riil, angka, data teknis, kronologi peristiwa, nama perusahaan, serta nama narasumber dan kutipannya dari artikel sumber.
4. Format Konten: Gunakan Markdown murni (Heading ##, ###, bullet points, penekanan bold, kutipan analitis >). JANGAN gunakan tag HTML mentah seperti <p>, <div>, <span>.
5. Panjang konten: Target ${wordCountTarget}.
6. Kategori artikel HARUS salah satu dari: ["AI", "Software", "Hardware", "Gadget", "Infrastruktur", "Regional"].
7. Atribusi Sumber Wajib: Pada bagian paling bawah artikel (baris terakhir), WAJIB sertakan garis pembatas (---) dan satu baris sumber ringkas:
   ---
   *Sumber: ${cleanDomain}.*
   (Cukup tulis nama media sumber yang bersih, DILARANG mencantumkan link URL panjang atau teks bertele-tele).
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

  const cleanedContent = cleanContentHeading(String(parsed.content).trim(), String(parsed.title).trim());
  const finalContent = injectInternalLinkIfMissing(cleanedContent, internalCandidates, finalCategory);

  return {
    title: String(parsed.title).trim(),
    slug: sanitizeSlug(parsed.slug || parsed.title),
    excerpt: String(parsed.excerpt || parsed.title).slice(0, 500).trim(),
    content: finalContent,
    category: finalCategory,
    tags,
    coverCaption: String(parsed.coverCaption || `Ilustrasi liputan ${parsed.title}`).trim(),
    modelUsed: modelName,
    providerUsed: provider,
  };
}

