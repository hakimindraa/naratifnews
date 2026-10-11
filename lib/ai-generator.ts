export interface NewsSource {
  title: string;
  source: string;
  pubDate: string;
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
  length?: 'standar' | 'mendalam';
  provider?: AIProvider;
  enableWebSearch?: boolean;
}

export async function fetchGoogleNewsResearch(query: string, maxItems = 4): Promise<NewsSource[]> {
  try {
    const cleanQuery = query.slice(0, 80).replace(/[^\w\s-]/g, ' ').trim();
    if (!cleanQuery) return [];

    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(cleanQuery)}&hl=id&gl=ID&ceid=ID:id`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
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

      const rawTitle = (titleMatch ? titleMatch[1] : '').replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim();
      const source = (sourceMatch ? sourceMatch[1] : 'Media Nasional').replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim();
      const pubDate = pubDateMatch ? pubDateMatch[1].trim() : '';

      if (rawTitle) {
        items.push({
          title: rawTitle,
          source,
          pubDate,
        });
      }
    }
    return items;
  } catch (err) {
    console.warn('Google News search failed or timed out:', err);
    return [];
  }
}

function extractJSON(text: string): any {
  // 1. Coba parse langsung
  try {
    return JSON.parse(text);
  } catch (e) {
    // Lanjut ke pembersihan
  }

  // 2. Bersihkan blok ```json ... ``` atau ``` ... ```
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch && codeBlockMatch[1]) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch (e) {
      // lanjut ke pencarian kurung kurawal
    }
  }

  // 3. Ambil dari { pertama sampai } terakhir
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const jsonSubstring = text.substring(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(jsonSubstring);
    } catch (e) {
      // gagal
    }
  }

  throw new Error('Gagal mengekstrak format JSON dari respons AI.');
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

import fs from 'fs';
import path from 'path';

function getEnvVar(key: string, defaultValue = ''): string {
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
    // fallback to process.env
  }
  return process.env[key] || defaultValue;
}

export async function requestArticleFromModelRouter(
  options: GenerateArticleOptions
): Promise<GeneratedArticleDraft & { modelUsed: string; providerUsed: string }> {
  const provider: AIProvider = options.provider || 'gemini';

  // 1. Lakukan riset Google News secara gratis jika diaktifkan (Default: Aktif)
  let researchSources: NewsSource[] = [];
  if (options.enableWebSearch !== false) {
    researchSources = await fetchGoogleNewsResearch(options.prompt, 4);
  }

  let baseUrl = '';
  let apiKey = '';
  let modelName = '';
  let useJsonFormat = false;

  if (provider === 'gemini') {
    baseUrl = getEnvVar('GEMINI_BASE_URL', 'https://generativelanguage.googleapis.com/v1beta/openai');
    apiKey = getEnvVar('GEMINI_API_KEY', 'AIzaSyD_lhIrfhwgagV4JKr1DOwfpfCe0itCmSI');
    modelName = getEnvVar('GEMINI_MODEL', 'gemini-3.8-flash');
    useJsonFormat = true;
  } else if (provider === 'groq') {
    baseUrl = getEnvVar('GROQ_BASE_URL', 'https://api.groq.com/openai/v1');
    apiKey = getEnvVar('GROQ_API_KEY');
    modelName = getEnvVar('GROQ_MODEL', 'openai/gpt-oss-120b');
    useJsonFormat = true;
  } else {
    baseUrl = getEnvVar('LOCAL_9ROUTER_BASE_URL', 'http://localhost:20128/v1');
    apiKey = getEnvVar('LOCAL_9ROUTER_KEY', 'sk-112992202cc5a537-c30afk-edb2de20');
    modelName = getEnvVar('LOCAL_9ROUTER_MODEL', 'oc/muse-spark-1.3-contributor-free');
    useJsonFormat = false;
  }

  if (!apiKey && provider !== '9router') {
    throw new Error(`API Key untuk ${provider} belum disetel di file .env.local`);
  }

  baseUrl = baseUrl.replace(/\/+$/, '');
  const endpoint = `${baseUrl}/chat/completions`;

  const wordCountTarget = options.length === 'mendalam' ? '1000 - 1400 kata' : '600 - 800 kata';
  const targetCategory = options.category || 'AI';

  const systemPrompt = `Anda adalah jurnalis teknologi senior dan editor utama di portal media teknologi terkemuka "Naratif" (Indonesia).
Tugas Anda adalah menulis artikel berita teknologi yang mendalam, berwawasan tajam, faktual, dan menarik untuk para antusias teknologi, developer, dan praktisi industri.

ATURAN PENULISAN:
1. Bahasa: Bahasa Indonesia baku, modern, dan bergaya jurnalisme teknologi berbobot (5W + 1H, dengan analisis dampak industri).
2. Format Konten: Gunakan Markdown murni yang rapi (Heading ##, ###, bullet points, penekanan bold, kutipan analitis >). JANGAN gunakan tag HTML mentah seperti <p>, <div>, <span>.
3. Panjang konten: Target ${wordCountTarget}.
4. Kategori artikel HARUS salah satu dari: ["AI", "Software", "Hardware", "Gadget", "Infrastruktur"].
5. Output: WAJIB HANYA berupa objek JSON murni (VALID JSON) tanpa pembuka atau penutup obrolan apa pun di luar JSON.

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
    newsContext = `\n\nHASIL RISET GOOGLE NEWS INDONESIA TERKINI (Gunakan fakta, entitas, tanggal, dan data perkembangan industri berikut sebagai acuan utama artikel):
${researchSources.map((item, idx) => `${idx + 1}. [${item.source} - ${item.pubDate}]: ${item.title}`).join('\n')}\n`;
  }

  const userPrompt = `Buatkan artikel berita teknologi profesional tentang topik berikut:
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
    max_tokens: 3500,
  };
  if (useJsonFormat) {
    payload.response_format = { type: 'json_object' };
  }

  // Eksekusi request dengan retry handling untuk status 503/429
  let response: Response | null = null;
  let lastErrorText = '';

  for (let attempt = 1; attempt <= 2; attempt++) {
    response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      break;
    }

    lastErrorText = await response.text();
    if ((response.status === 503 || response.status === 429) && attempt < 2) {
      await new Promise((r) => setTimeout(r, 2000));
      continue;
    }
    break;
  }

  if (!response || !response.ok) {
    throw new Error(`AI Gateway Error (${response?.status || 'Unknown'}): ${lastErrorText || response?.statusText}`);
  }

  const jsonResponse = await response.json();
  const rawContent = jsonResponse?.choices?.[0]?.message?.content;

  if (!rawContent) {
    throw new Error('AI Gateway tidak mengembalikan konten artikel.');
  }

  const parsed = extractJSON(rawContent);

  // Validasi field
  if (!parsed.title || !parsed.content) {
    throw new Error('Respons AI tidak memiliki judul atau konten yang lengkap.');
  }

  const validCategories = ['AI', 'Software', 'Hardware', 'Gadget', 'Infrastruktur'];
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
    content: String(parsed.content).trim(),
    category: finalCategory,
    tags,
    coverCaption: String(parsed.coverCaption || `Ilustrasi liputan ${parsed.title}`).trim(),
    researchSources,
    modelUsed: modelName,
    providerUsed: provider,
  };
}
