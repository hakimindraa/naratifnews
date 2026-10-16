import { NextRequest, NextResponse } from 'next/server';
import {
  sendTelegramMessage,
  editTelegramMessage,
  deleteTelegramMessage,
  deleteTelegramMessages,
  answerCallbackQuery,
  setTelegramCommands,
  getTelegramFileUrl,
  SendMessageOptions,
} from '@/lib/telegram';
import {
  requestArticleFromModelRouter,
  requestSadurArticleFromSource,
  fetchGoogleNewsResearch,
  NewsSource,
} from '@/lib/ai-generator';
import { scrapeArticleFromUrl } from '@/lib/url-scraper';
import { findSimilarArticles, checkSourceUrlHistory } from '@/lib/duplicate-detector';
import { db } from '@/db';
import { articles, aiGenerationLogs, authors } from '@/db/schema';
import { revalidatePath } from 'next/cache';
import { eq, desc } from 'drizzle-orm';
import { BOT_COMMANDS } from '../setup/route';
import { getAutopilotScheduleInfo } from '@/lib/autopilot-schedule';
import { uploadImageToImgbb } from '@/app/admin/media-actions';
import { notifySearchEngines } from '@/lib/indexing';

export const maxDuration = 60; // Timeout 60 detik untuk operasi AI

const PRESET_TOPICS: Record<string, { label: string; prompt: string }> = {
  AI: {
    label: '🤖 Tren & Inovasi AI Terkini',
    prompt: 'Tren & inovasi kecerdasan buatan AI terkini dan dampaknya bagi ekosistem industri dan masyarakat',
  },
  Software: {
    label: '💻 Ekosistem & Tren Software',
    prompt: 'Ekosistem dan tren software engineering, open source, serta aplikasi modern terkini',
  },
  Hardware: {
    label: '⚙️ Dinamika Semikonduktor & Hardware',
    prompt: 'Dinamika industri semikonduktor, fabrikasi chip, dan inovasi arsitektur hardware global',
  },
  Infrastruktur: {
    label: '☁️ Infrastruktur Cloud & Keamanan',
    prompt: 'Infrastruktur cloud computing, data center AI modern, dan pertahanan keamanan siber',
  },
  Gadget: {
    label: '📱 Inovasi Gadget & Konsumen',
    prompt: 'Inovasi gadget konsumen, smartphone flagship, dan tren perangkat pintar terkini',
  },
  Regional: {
    label: '🏛️ Berita Regional & Daerah',
    prompt: 'Dinamika kebijakan publik pemerintah daerah, fasilitas publik, dan isu masyarakat regional terkini',
  },
};

const REGIONAL_PROVINCES = [
  // Halaman 1 (Pusat & Jawa-Bali)
  'Umum',
  'DKI Jakarta',
  'Jawa Barat',
  'Jawa Tengah',
  'DI Yogyakarta',
  'Jawa Timur',
  'Banten',
  'Bali',
  // Halaman 2 (Sumatera & Kalimantan Timur)
  'Sumatera Utara',
  'Sumatera Barat',
  'Riau',
  'Kepulauan Riau',
  'Sumatera Selatan',
  'Lampung',
  'Aceh',
  'Kalimantan Timur',
  // Halaman 3 (Kalimantan, Sulawesi, Nusa Tenggara, Maluku & Papua)
  'Kalimantan Barat',
  'Kalimantan Selatan',
  'Sulawesi Selatan',
  'Sulawesi Utara',
  'Nusa Tenggara Barat',
  'Nusa Tenggara Timur',
  'Maluku',
  'Papua',
];

function buildRegionalKeyboard(page: number) {
  const itemsPerPage = 8;
  const totalPages = Math.ceil(REGIONAL_PROVINCES.length / itemsPerPage);
  const safePage = Math.max(1, Math.min(page, totalPages));
  const startIndex = (safePage - 1) * itemsPerPage;
  const currentProvinces = REGIONAL_PROVINCES.slice(startIndex, startIndex + itemsPerPage);

  const keyboard: Array<Array<{ text: string; callback_data: string }>> = [];

  for (let i = 0; i < currentProvinces.length; i += 2) {
    const row = [{ text: `📍 ${currentProvinces[i]}`, callback_data: `reg:${currentProvinces[i]}` }];
    if (currentProvinces[i + 1]) {
      row.push({ text: `📍 ${currentProvinces[i + 1]}`, callback_data: `reg:${currentProvinces[i + 1]}` });
    }
    keyboard.push(row);
  }

  // Row navigasi paginasi (Sebelumnya | Hal X/Y | Berikutnya)
  const navRow: Array<{ text: string; callback_data: string }> = [];
  if (safePage > 1) {
    navRow.push({ text: '◀️ Sebelumnya', callback_data: `regpage:${safePage - 1}` });
  }
  navRow.push({ text: `• ${safePage}/${totalPages} •`, callback_data: `regpage:${safePage}` });
  if (safePage < totalPages) {
    navRow.push({ text: 'Berikutnya ▶️', callback_data: `regpage:${safePage + 1}` });
  }
  keyboard.push(navRow);

  // Row navigasi kembali
  keyboard.push([
    { text: '⬅️ Kembali ke Kategori', callback_data: 'btn:menu' },
    { text: '🏠 Menu Utama', callback_data: 'btn:start' },
  ]);

  return { keyboard, safePage, totalPages };
}

function getRegionalStepText(safePage: number, totalPages: number) {
  const pageLabel =
    safePage === 1
      ? 'Jawa, Bali & Nasional'
      : safePage === 2
      ? 'Sumatera & Kalimantan Timur'
      : 'Kalimantan, Sulawesi, NT & Papua';

  return `🏛️ <b>PILIH WILAYAH LIPUTAN REGIONAL (${safePage}/${totalPages})</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Pilih provinsi target untuk riset berita daerah:

┌── 📍 <b>Cakupan Wilayah</b>
│ Wilayah: <b>${pageLabel}</b>
│ Fokus: Kebijakan publik pemda, fasilitas publik & warga
└──

👇 <i>Pilih salah satu provinsi di bawah ini:</i>`;
}

interface ArticleRunParams {
  chatId: number | string;
  topic: string;
  category?: string;
  region?: string;
  length: 'ringkas' | 'standar' | 'mendalam';
  provider?: 'gemini' | 'groq' | '9router';
  enableWebSearch: boolean;
  isPublish: boolean;
  siteUrl: string;
  messageId?: number;
}

// Helper untuk memperbarui pesan di tempat (In-Place Edit) agar chat tidak panjang menumpuk
async function updateOrSendMessage(
  chatId: number | string,
  messageId: number | undefined,
  text: string,
  options: SendMessageOptions = {}
) {
  if (messageId) {
    const editRes = await editTelegramMessage(chatId, messageId, text, options);
    if (editRes.success) return editRes;
  }
  return await sendTelegramMessage(chatId, text, options);
}

async function runArticleGeneration({
  chatId,
  topic,
  category,
  region,
  length,
  provider = 'gemini',
  enableWebSearch,
  isPublish,
  siteUrl,
  messageId,
}: ArticleRunParams) {
  const isRegional = category?.toLowerCase() === 'regional';
  const cleanRegion = (region && region !== '-' && region !== 'Umum') ? region : '';

  const lengthLabel =
    length === 'ringkas' ? 'Ringkas (~400 kata)' : length === 'mendalam' ? 'Mendalam (~1200 kata)' : 'Standar (~700 kata)';
  const statusLabel = isPublish ? '🚀 Terbit Langsung' : '📝 Simpan Draf';
  const providerLabel =
    provider === 'groq'
      ? '🚀 Groq Cloud (GPT-OSS)'
      : provider === '9router'
      ? '🌐 9Router Gateway'
      : '⚡ Google Gemini 2.5 Flash';

  // FASE 1: Memulai & Riset Fakta (30% Progres)
  const fase1Text = `⏳ <b>PROSES LIPUTAN AI BERJALAN</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 <b>Topik:</b> <i>"${topic}"</i>

┌── 📋 <b>Parameter Liputan</b>
│ 📂 Kategori : <b>${category || 'AI'}${cleanRegion ? ` (${cleanRegion})` : ''}</b>
│ 🎯 Target   : <b>${statusLabel}</b>
│ 🤖 Engine   : <b>${providerLabel}</b>
└──

<b>Tahapan Eksekusi:</b>
🔄 <b>[1/3] ${enableWebSearch ? (isRegional ? `Melacak berita daerah ${cleanRegion || 'lokal'}...` : 'Melacak fakta Google News terkini...') : 'Menyiapkan basis pengetahuan AI...'}</b>
⏳ [2/3] Menyusun narasi & gaya jurnalistik
⏳ [3/3] Validasi arsip & simpan database

<code>[▰▰▰▱▱▱▱▱▱▱] 30% • Riset Fakta</code>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏱️ <i>Sedang mengumpulkan referensi berita dan fakta lokal...</i>`;

  let activeMessageId = messageId;
  if (activeMessageId) {
    const editRes = await editTelegramMessage(chatId, activeMessageId, fase1Text);
    if (!editRes.success) {
      const sendRes = await sendTelegramMessage(chatId, fase1Text);
      activeMessageId = sendRes.data?.result?.message_id;
    }
  } else {
    const sendRes = await sendTelegramMessage(chatId, fase1Text);
    activeMessageId = sendRes.data?.result?.message_id;
  }

  const startTime = performance.now();

  try {
    // 1. Eksekusi Riset Google News Nyata Terlebih Dahulu
    let researchSources: NewsSource[] = [];
    if (enableWebSearch !== false) {
      researchSources = await fetchGoogleNewsResearch(
        topic,
        6,
        category,
        isRegional ? (cleanRegion || 'Umum') : undefined
      );
    }

    // 2. FASE 2: Tampilkan Live Temuan Berita & Masuk Tahap Penulisan Naskah
    if (activeMessageId) {
      let sourcesPreviewBox = '';
      if (researchSources.length > 0) {
        const sourceItems = researchSources.slice(0, 2).map((s, idx) => {
          const cleanTitle = s.title.replace(/<[^>]*>/g, '').trim();
          const shortTitle = cleanTitle.length > 60 ? `${cleanTitle.slice(0, 57)}...` : cleanTitle;
          const timeTag = s.timeAgo ? `⏱️ ${s.timeAgo}` : '⏱️ Terkini';
          const linkPart = s.url ? ` • <a href="${s.url}">Link Berita ↗</a>` : '';
          return `│ ${idx + 1}. <b>${s.source}</b> (${timeTag})\n│    <i>"${shortTitle}"</i>${linkPart}`;
        }).join('\n');

        sourcesPreviewBox = `\n┌── 🔍 <b>Temuan Riset Google News (${researchSources.length} Berita)</b>\n${sourceItems}\n└──\n`;
      }

      const fase2Text = `⏳ <b>PROSES LIPUTAN AI BERJALAN</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 <b>Topik:</b> <i>"${topic}"</i>

┌── 📋 <b>Parameter Liputan</b>
│ 📂 Kategori : <b>${category || 'AI'}${cleanRegion ? ` (${cleanRegion})` : ''}</b>
│ 🎯 Target   : <b>${statusLabel}</b>
│ 🤖 Engine   : <b>${providerLabel}</b>
└──${sourcesPreviewBox}
<b>Tahapan Eksekusi:</b>
✅ <b>Riset fakta berita berhasil didapatkan</b>
🔄 <b>[2/3] AI sedang meracik naskah jurnalistik...</b>
⏳ [3/3] Validasi arsip & simpan database

<code>[▰▰▰▰▰▰▰▱▱▱] 70% • Penulisan Naskah</code>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏱️ <i>Menyusun struktur naskah, sudut pandang berita, dan kutipan...</i>`;
      await editTelegramMessage(chatId, activeMessageId, fase2Text).catch(() => {});
    }

    // 3. Panggil AI untuk menulis naskah berdasarkan fakta riset di atas
    const draftArticle = await requestArticleFromModelRouter({
      prompt: topic,
      category,
      region: isRegional ? (cleanRegion || 'Umum') : undefined,
      length,
      provider: provider || 'gemini',
      enableWebSearch,
      prefetchedSources: researchSources,
    });

    // 4. FASE 3: Finalisasi Database (90% Progres)
    if (activeMessageId) {
      const fase3Text = `⏳ <b>PROSES LIPUTAN AI BERJALAN</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 <b>Topik:</b> <i>"${topic}"</i>

┌── 📋 <b>Parameter Liputan</b>
│ 📂 Kategori : <b>${category || 'AI'}${cleanRegion ? ` (${cleanRegion})` : ''}</b>
│ 🎯 Target   : <b>${statusLabel}</b>
│ 🤖 Engine   : <b>${providerLabel}</b>
└──

<b>Tahapan Eksekusi:</b>
✅ <b>Riset fakta berita selesai</b>
✅ <b>Naskah jurnalistik selesai disusun</b>
🔄 <b>[3/3] Memeriksa kemiripan arsip & menyimpan...</b>

<code>[▰▰▰▰▰▰▰▰▰▱] 90% • Finalisasi Database</code>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏱️ <i>Menyimpan naskah ke database Neon DB...</i>`;
      await editTelegramMessage(chatId, activeMessageId, fase3Text).catch(() => {});
    }

    const status = isPublish ? 'published' : 'draft';
    const publishedAt = isPublish ? new Date() : null;

    const [newArticle] = await db
      .insert(articles)
      .values({
        title: draftArticle.title,
        slug: draftArticle.slug,
        excerpt: draftArticle.excerpt,
        content: draftArticle.content,
        category: draftArticle.category,
        author: 'Redaksi Naratif (Telegram AI)',
        tags: draftArticle.tags,
        coverUrl: null, // Sampul dapat ditambahkan manual via web admin
        coverCaption: draftArticle.coverCaption,
        status,
        publishedAt,
      })
      .returning();

    const durationMs = Math.round(performance.now() - startTime);

    // Catat ke log AI
    await db.insert(aiGenerationLogs).values({
      prompt: topic,
      articleId: newArticle.id,
      articleTitle: newArticle.title,
      category: newArticle.category,
      status: newArticle.status,
      model: draftArticle.modelUsed || providerLabel,
      durationMs,
      errorMessage: null,
    });

    // Pengecekan kemiripan artikel arsip (Advisory)
    const similarityInfo = await findSimilarArticles(newArticle.title, newArticle.excerpt || undefined, 0.55);
    const similarityNote =
      similarityInfo.hasSimilar && similarityInfo.matchedArticle
        ? `\n⚠️ <b>Catatan Kemiripan Arsip:</b>\n<code>Mirip ~${Math.round(
            similarityInfo.highestScore * 100
          )}% dengan: "${similarityInfo.matchedArticle.title}"</code>\n`
        : '';

    // Siapkan daftar sumber berita rujukan dengan tautan aktif untuk pesan sukses
    const finalSources = (draftArticle.researchSources && draftArticle.researchSources.length > 0)
      ? draftArticle.researchSources
      : researchSources;

    const sourcesSection = finalSources && finalSources.length > 0
      ? `\n┌── 🌐 <b>Sumber Berita Rujukan (${finalSources.length})</b>\n${finalSources.slice(0, 3).map((s) => {
          const cleanTitle = s.title.replace(/<[^>]*>/g, '').trim();
          const shortTitle = cleanTitle.length > 45 ? `${cleanTitle.slice(0, 42)}...` : cleanTitle;
          const timeTag = s.timeAgo ? ` (${s.timeAgo})` : '';
          return s.url
            ? `│ • <b>${s.source}</b>${timeTag}: <a href="${s.url}">${shortTitle} ↗</a>`
            : `│ • <b>${s.source}</b>${timeTag}: <i>${shortTitle}</i>`;
        }).join('\n')}\n└──`
      : '';

    // Revalidasi cache web
    revalidatePath('/', 'layout');

    const articleUrl = `${siteUrl}/berita-teknologi/${newArticle.category.toLowerCase()}/${newArticle.id}/${newArticle.slug}`;
    const editUrl = `${siteUrl}/admin/edit/${newArticle.id}`;
    const tagsFormatted = (newArticle.tags || []).map((t: string) => `<code>#${t}</code>`).join(' ');

    if (isPublish) {
      const successText = `🎉 <b>BERITA BERHASIL DITERBITKAN!</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📰 <b>${newArticle.title}</b>

┌── 📋 <b>Detail Publikasi</b>
│ 📂 Kategori : <b>${newArticle.category}${cleanRegion ? ` (${cleanRegion})` : ''}</b>
│ 🌐 Riset    : <b>${enableWebSearch ? (isRegional ? 'Google News Daerah (100% ID)' : 'Google News Global Aktif') : 'Murni Analisis AI'}</b>
│ ⏱️ Durasi   : <b>${(durationMs / 1000).toFixed(1)}s</b> (via <i>${draftArticle.modelUsed || providerLabel}</i>)
│ 🏷️ Tag      : ${tagsFormatted || '<code>#berita</code>'}
└──${sourcesSection}${similarityNote}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ <i>Artikel telah terbit di portal Naratif. Anda dapat menambahkan foto sampul lewat Web Admin.</i>`;

      await updateOrSendMessage(chatId, activeMessageId, successText, {
        inlineKeyboard: [
          [{ text: '📖 Baca di Website', url: articleUrl }],
          [{ text: '✏️ Tambah Sampul di Web', url: editUrl }],
          [
            { text: '✍️ Tulis Berita Baru', callback_data: 'btn:menu' },
            { text: '🏠 Menu Utama', callback_data: 'btn:start' },
          ],
        ],
      });
    } else {
      const draftSuccessText = `📝 <b>BERITA BERHASIL DISIMPAN KE DRAF!</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📰 <b>${newArticle.title}</b>

┌── 📋 <b>Detail Publikasi</b>
│ 📂 Kategori : <b>${newArticle.category}${cleanRegion ? ` (${cleanRegion})` : ''}</b>
│ 🌐 Riset    : <b>${enableWebSearch ? (isRegional ? 'Google News Daerah (100% ID)' : 'Google News Global Aktif') : 'Murni Analisis AI'}</b>
│ ⏱️ Durasi   : <b>${(durationMs / 1000).toFixed(1)}s</b> (via <i>${draftArticle.modelUsed || providerLabel}</i>)
│ 🏷️ Tag      : ${tagsFormatted || '<code>#draf</code>'}
└──${sourcesSection}${similarityNote}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 <i>Artikel siap ditinjau di Dasbor Redaksi sebelum diterbitkan. Silakan tambahkan foto sampul lewat editor web:</i>`;

      await updateOrSendMessage(chatId, activeMessageId, draftSuccessText, {
        inlineKeyboard: [
          [{ text: '✏️ Buka Editor & Tambah Sampul', url: editUrl }],
          [
            { text: '⚙️ Dasbor Admin Web', url: `${siteUrl}/admin` },
            { text: '🏠 Menu Utama', callback_data: 'btn:start' },
          ],
          [{ text: '✍️ Buat Berita Baru', callback_data: 'btn:menu' }],
        ],
      });
    }
  } catch (err: any) {
    console.error('Telegram generation error:', err);
    await updateOrSendMessage(
      chatId,
      activeMessageId,
      `❌ <b>Gagal Menyusun Berita</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nTerjadi kesalahan saat memproses AI:\n<code>${
        err?.message || 'Error tidak dikenal'
      }</code>`
    );
  }
}

// Fitur B: Revisi / Edit Artikel via Telegram
async function runArticleRevision({
  chatId,
  articleId,
  instruction,
  siteUrl,
}: {
  chatId: number | string;
  articleId: number;
  instruction: string;
  siteUrl: string;
}) {
  let activeMsgId: number | undefined;
  try {
    const [existing] = await db.select().from(articles).where(eq(articles.id, articleId)).limit(1);
    if (!existing) {
      await sendTelegramMessage(
        chatId,
        `❌ <b>Artikel Tidak Ditemukan</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nArtikel dengan ID <code>#${articleId}</code> tidak ditemukan di database Neon DB.`
      );
      return;
    }

    const initText = `⏳ <b>PROSES REVISI ARTIKEL BERJALAN</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📰 <b>Judul</b>     : <b>${existing.title}</b>
📂 <b>Kategori</b>  : <code>${existing.category}</code>
✍️ <b>Instruksi</b> : <i>"${instruction}"</i>

<code>[▰▰▰▰▰▰▱▱▱▱] 60% • Analisis & Revisi</code>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏱️ <i>AI sedang membaca naskah lama di database dan meracik perbaikan...</i>`;

    const initRes = await sendTelegramMessage(chatId, initText);
    activeMsgId = initRes.data?.result?.message_id;

    const startTime = performance.now();

    const revisionSystemPrompt = `Anda adalah editor senior portal berita Naratif.
Tugas Anda adalah merevisi artikel berita yang sudah ada sesuai dengan instruksi yang diberikan redaksi.

ATURAN REVISI:
1. Pertahankan format Markdown profesional (heading ##, ###, bullet points, penekanan bold, kutipan analitis >).
2. Pertahankan akurasi fakta, nama narasumber, dan jangan hilangkan bagian referensi berita di akhir jika ada.
3. JANGAN mengulang judul berita sebagai heading di baris pertama konten.
4. Output WAJIB HANYA berupa objek JSON murni:
{
  "title": "Judul baru atau judul tetap jika tidak perlu diubah",
  "excerpt": "Ringkasan tajam maksimal 250 karakter",
  "content": "Isi lengkap artikel hasil revisi dalam format Markdown...",
  "changelog": "Poin singkat 1-2 kalimat tentang apa saja yang telah disempurnakan"
}`;

    const userPrompt = `ARTIKEL SAAT INI:
Judul: ${existing.title}
Kategori: ${existing.category}
Ringkasan: ${existing.excerpt || '-'}
Isi Konten:
${existing.content}

INSTRUKSI REVISI DARI REDAKSI:
"${instruction}"

Silakan hasilkan objek JSON revisi sesuai aturan di atas.`;

    let revisedData: { title: string; excerpt: string; content: string; changelog?: string } | null = null;

    if (process.env.GEMINI_API_KEY) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: revisionSystemPrompt }] },
          contents: [{ parts: [{ text: userPrompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.3 },
        }),
      });
      const data = await res.json();
      const rawJson = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawJson) {
        revisedData = JSON.parse(rawJson);
      }
    } else if (process.env.GROQ_API_KEY) {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: revisionSystemPrompt },
            { role: 'user', content: userPrompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.3,
        }),
      });
      const data = await res.json();
      const rawJson = data?.choices?.[0]?.message?.content;
      if (rawJson) {
        revisedData = JSON.parse(rawJson);
      }
    }

    if (!revisedData || !revisedData.content) {
      throw new Error('AI tidak berhasil meracik JSON revisi yang valid.');
    }

    const now = new Date();
    const [updated] = await db
      .update(articles)
      .set({
        title: revisedData.title || existing.title,
        excerpt: revisedData.excerpt || existing.excerpt,
        content: revisedData.content,
        updatedAt: now,
      })
      .where(eq(articles.id, existing.id))
      .returning();

    const durationMs = Math.round(performance.now() - startTime);

    revalidatePath('/', 'layout');
    revalidatePath('/admin');
    revalidatePath(`/admin/edit/${existing.id}`);

    const articleUrl = `${siteUrl}/berita-teknologi/${updated.category.toLowerCase()}/${updated.id}/${updated.slug}`;
    const editUrl = `${siteUrl}/admin/edit/${updated.id}`;

    const successText = `✅ <b>ARTIKEL #${updated.id} BERHASIL DIREVISI!</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📰 <b>${updated.title}</b>

┌── 📋 <b>Detail Pembaruan</b>
│ 📂 Kategori : <b>${updated.category}</b>
│ ⏱️ Durasi   : <b>${(durationMs / 1000).toFixed(1)}s</b>
│ 📝 Catatan  : <i>${revisedData.changelog || 'Naskah berita telah disempurnakan sesuai instruksi redaksi.'}</i>
└──
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ <i>Perubahan naskah sudah langsung aktif di portal Naratif.</i>`;

    await updateOrSendMessage(chatId, activeMsgId, successText, {
      inlineKeyboard: [
        [{ text: '📖 Baca Hasil di Website', url: articleUrl }],
        [{ text: '✏️ Buka di Editor Web', url: editUrl }],
        [
          { text: '✍️ Buat Berita Baru', callback_data: 'btn:menu' },
          { text: '🏠 Menu Utama', callback_data: 'btn:start' },
        ],
      ],
    });
  } catch (err: any) {
    console.error('Error during article revision via Telegram:', err);
    await updateOrSendMessage(
      chatId,
      activeMsgId,
      `❌ <b>Gagal Merevisi Artikel</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nKendala: <code>${err?.message || 'Error tidak dikenal'}</code>`
    );
  }
}

async function runSadurArticleGeneration({
  chatId,
  targetUrl,
  siteUrl,
}: {
  chatId: number | string;
  targetUrl: string;
  siteUrl: string;
}) {
  let activeMsgId: number | undefined;
  try {
    const initText = `⏳ <b>PROSES SADUR BERITA BERJALAN</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔗 <b>Link Sumber:</b>
<code>${targetUrl}</code>

<code>[▰▰▰▱▱▱▱▱▱▱] 30% • Ekstraksi Berita</code>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏱️ <i>Sedang membaca isi artikel dan mengekstrak fakta penting...</i>`;

    const initRes = await sendTelegramMessage(chatId, initText);
    activeMsgId = initRes.data?.result?.message_id;

    const [sourceData, urlHistory] = await Promise.all([
      scrapeArticleFromUrl(targetUrl),
      checkSourceUrlHistory(targetUrl),
    ]);

    const historyNotice = urlHistory.isAlreadyScraped
      ? `\n\n⚠️ <b>Peringatan Duplikasi URL:</b>\n<code>Link ini tercatat pernah disadur sebelumnya ("${urlHistory.matchedTitle}"). Sistem memproses sudut pandang orisinal baru.</code>`
      : '';

    if (activeMsgId) {
      const fase2Text = `⏳ <b>PROSES SADUR BERITA BERJALAN</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📰 <b>Judul Asli</b> : <b>${sourceData.title}</b>
🌐 <b>Media Asal</b> : <code>${sourceData.domain}</code> (~${sourceData.wordCount} kata)${historyNotice}

<code>[▰▰▰▰▰▰▰▱▱▱] 70% • Menyusun Naskah Orisinal</code>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏱️ <i>Sedang meracik ulang naskah Bahasa Indonesia via Groq Cloud...</i>`;
      editTelegramMessage(chatId, activeMsgId, fase2Text).catch(() => {});
    }

    const startTime = performance.now();
    const result = await requestSadurArticleFromSource({
      sourceUrl: sourceData.sourceUrl,
      sourceTitle: sourceData.title,
      sourceContent: sourceData.content,
      domain: sourceData.domain,
      provider: 'groq',
      length: 'standar',
    });

    const now = new Date();
    const [newArticle] = await db
      .insert(articles)
      .values({
        title: result.title,
        slug: result.slug,
        excerpt: result.excerpt,
        content: result.content,
        category: result.category,
        author: 'Redaksi Naratif (Saduran AI)',
        tags: result.tags,
        coverUrl: null,
        coverCaption: result.coverCaption,
        status: 'published',
        publishedAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    const durationMs = Math.round(performance.now() - startTime);

    await db.insert(aiGenerationLogs).values({
      prompt: `[Sadur Telegram] ${targetUrl}`,
      articleId: newArticle.id,
      articleTitle: newArticle.title,
      category: newArticle.category,
      status: newArticle.status,
      model: result.modelUsed || 'groq',
      durationMs,
      errorMessage: null,
      createdAt: now,
    });

    // Pengecekan kemiripan artikel arsip (Advisory)
    const similarityInfo = await findSimilarArticles(newArticle.title, newArticle.excerpt || undefined, 0.55);
    const similarityNote =
      similarityInfo.hasSimilar && similarityInfo.matchedArticle
        ? `\n⚠️ <b>Catatan Kemiripan Arsip:</b>\n<code>Mirip ~${Math.round(
            similarityInfo.highestScore * 100
          )}% dengan: "${similarityInfo.matchedArticle.title}"</code>\n`
        : '';

    revalidatePath('/', 'layout');
    revalidatePath('/admin');
    revalidatePath('/admin/sadur');

    const articleUrl = `${siteUrl}/berita-teknologi/${newArticle.category.toLowerCase()}/${newArticle.id}/${newArticle.slug}`;
    const editUrl = `${siteUrl}/admin/edit/${newArticle.id}`;
    const tagsFormatted = (newArticle.tags || []).map((t: string) => `<code>#${t}</code>`).join(' ');

    const successMessage = `🎉 <b>BERITA SADURAN BERHASIL DITERBITKAN!</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📰 <b>${newArticle.title}</b>

┌── 📋 <b>Detail Publikasi</b>
│ 📂 Kategori : <b>${newArticle.category}</b>
│ 🌐 Sumber   : <b>${sourceData.domain}</b>
│ ⏱️ Durasi   : <b>${(durationMs / 1000).toFixed(1)}s</b> • ⚡ <b>Groq AI</b>
│ 🏷️ Topik    : ${tagsFormatted || '<code>#saduran</code>'}
└──${similarityNote}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ <i>Naskah telah terbit di portal Naratif lengkap dengan atribusi sumber berita.</i>`;

    await updateOrSendMessage(chatId, activeMsgId, successMessage, {
      inlineKeyboard: [
        [{ text: '📖 Baca di Website', url: articleUrl }],
        [{ text: '✏️ Tambah Sampul di Web', url: editUrl }],
        [
          { text: '🔗 Sadur Link Lain', callback_data: 'btn:sadur_help' },
          { text: '🏠 Menu Utama', callback_data: 'btn:start' },
        ],
      ],
    });
  } catch (err: any) {
    console.error('Error during article saduran via Telegram:', err);
    await updateOrSendMessage(
      chatId,
      activeMsgId,
      `❌ <b>Gagal Menyadur Berita</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nKendala: <code>${err?.message || 'Error tidak dikenal'}</code>`
    );
  }
}

// ==========================================
// FITUR: TULIS BERITA MANUAL VIA TELEGRAM
// ==========================================

function parseManualArticleText(rawText: string): {
  success: boolean;
  data?: {
    title: string;
    category: string;
    authorName?: string;
    coverUrl?: string;
    coverCaption?: string;
    tags: string[];
    isDraft: boolean;
    content: string;
  };
  error?: string;
} {
  // Bersihkan command /manual atau /post di awal teks
  const cleaned = rawText
    .replace(/^\/(?:manual|post)(?:@\w+)?[\r\n\s]*/i, '')
    .trim();

  if (!cleaned) {
    return { success: false, error: 'Teks naskah masih kosong.' };
  }

  const lines = cleaned.split(/\r?\n/);
  let title = '';
  let category = 'Software';
  let authorName = '';
  let coverUrl = '';
  let coverCaption = '';
  let tags: string[] = [];
  let isDraft = false;
  let contentStartIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Deteksi kata kunci naskah utama: Isi: / Content: / Naskah:
    const contentMatch = line.match(/^(?:isi|content|naskah)\s*:\s*(.*)$/i);
    if (contentMatch) {
      const firstLineContent = contentMatch[1].trim();
      const remainingLines = lines.slice(i + 1);
      const fullContent = [firstLineContent, ...remainingLines].filter(Boolean).join('\n').trim();
      return finalizeParse(fullContent);
    }

    if (/^(?:judul|title)\s*:\s*(.+)$/i.test(line)) {
      title = line.replace(/^(?:judul|title)\s*:\s*/i, '').trim();
    } else if (/^(?:kategori|category)\s*:\s*(.+)$/i.test(line)) {
      category = line.replace(/^(?:kategori|category)\s*:\s*/i, '').trim();
    } else if (/^(?:penulis|author)\s*:\s*(.+)$/i.test(line)) {
      authorName = line.replace(/^(?:penulis|author)\s*:\s*/i, '').trim();
    } else if (/^(?:cover|sampul|gambar)\s*:\s*(.+)$/i.test(line)) {
      coverUrl = line.replace(/^(?:cover|sampul|gambar)\s*:\s*/i, '').trim();
    } else if (/^(?:caption|keterangan)\s*:\s*(.+)$/i.test(line)) {
      coverCaption = line.replace(/^(?:caption|keterangan)\s*:\s*/i, '').trim();
    } else if (/^(?:tags?|tagar)\s*:\s*(.+)$/i.test(line)) {
      const tagStr = line.replace(/^(?:tags?|tagar)\s*:\s*/i, '').trim();
      tags = tagStr.split(/[,#\s]+/).map(t => t.trim().replace(/^#/, '')).filter(Boolean);
    } else if (/^(?:status|draf|draft)\s*:\s*(.+)$/i.test(line)) {
      const statusVal = line.replace(/^(?:status|draf|draft)\s*:\s*/i, '').toLowerCase();
      if (statusVal.includes('draf') || statusVal.includes('draft') || statusVal.includes('ya') || statusVal.includes('true')) {
        isDraft = true;
      }
    } else if (line === '' && title && contentStartIndex === -1) {
      // Baris kosong setelah field header, sisa baris di bawahnya adalah naskah
      contentStartIndex = i + 1;
      break;
    }
  }

  // Jika user tidak menulis "Isi:", ambil sisa baris setelah metadata
  if (contentStartIndex !== -1) {
    const fullContent = lines.slice(contentStartIndex).join('\n').trim();
    return finalizeParse(fullContent);
  }

  function finalizeParse(content: string) {
    if (!title) {
      return {
        success: false,
        error: 'Judul artikel wajib diisi. Gunakan format:\n<code>Judul: [Ketik Judul Berita]</code>',
      };
    }
    if (!content || content.length < 30) {
      return {
        success: false,
        error: 'Isi naskah berita terlalu pendek atau belum diisi. Sertakan minimal 1-2 paragraf naskah artikel.',
      };
    }

    // Normalisasi Kategori
    const catLower = category.toLowerCase();
    let normalizedCategory = 'Software';
    if (catLower.includes('hard') || catLower.includes('perangkat keras')) normalizedCategory = 'Hardware';
    else if (catLower.includes('ai') || catLower.includes('kecerdasan') || catLower.includes('intel')) normalizedCategory = 'AI';
    else if (catLower.includes('infra') || catLower.includes('cloud') || catLower.includes('data center')) normalizedCategory = 'Infrastruktur';
    else if (catLower.includes('gadget') || catLower.includes('hp') || catLower.includes('smartphone')) normalizedCategory = 'Gadget';
    else if (catLower.includes('reg') || catLower.includes('daerah') || catLower.includes('wilayah') || catLower.includes('pemda')) normalizedCategory = 'Regional';
    else if (catLower.includes('soft') || catLower.includes('aplikasi') || catLower.includes('web')) normalizedCategory = 'Software';

    return {
      success: true,
      data: {
        title,
        category: normalizedCategory,
        authorName: authorName || undefined,
        coverUrl: coverUrl || undefined,
        coverCaption: coverCaption || undefined,
        tags,
        isDraft,
        content,
      },
    };
  }

  return {
    success: false,
    error: 'Format belum lengkap. Pastikan mencantumkan <code>Judul: ...</code> dan <code>Isi: ...</code>.',
  };
}

async function runManualArticlePublication({
  chatId,
  messageId,
  rawText,
  hasPhoto,
  photoFileId,
  siteUrl,
}: {
  chatId: number | string;
  messageId?: number;
  rawText: string;
  hasPhoto: boolean;
  photoFileId?: string;
  siteUrl: string;
}) {
  const parseResult = parseManualArticleText(rawText);
  if (!parseResult.success || !parseResult.data) {
    const errorMsg = `❌ <b>Format Naskah Belum Sesuai</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${parseResult.error || 'Pastikan mengisi Judul dan Isi naskah.'}\n\nKetik <code>/manual</code> untuk panduan lengkap & templat siap salin.`;
    await sendTelegramMessage(chatId, errorMsg, {
      inlineKeyboard: [
        [{ text: '📋 Dapatkan Templat Kosong', callback_data: 'manual:template' }],
        [{ text: '🏠 Menu Utama', callback_data: 'btn:start' }],
      ],
    });
    return;
  }

  const data = parseResult.data;

  // Indikator proses simpan
  const waitMsg = await sendTelegramMessage(
    chatId,
    `⏳ <b>MENYIMPAN ARTIKEL MANUAL...</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📰 <i>"${data.title}"</i>\n⏱️ <i>Memvalidasi sampul dan data penulis...</i>`
  );
  const activeMsgId = waitMsg.data?.result?.message_id;

  // 1. Tangani Foto Sampul jika dikirim via Telegram photo
  let finalCoverUrl = data.coverUrl || null;
  if (hasPhoto && photoFileId) {
    try {
      const tgFileUrl = await getTelegramFileUrl(photoFileId);
      if (tgFileUrl) {
        const fd = new FormData();
        fd.append('imageUrl', tgFileUrl);
        fd.append('name', `tg-manual-${Date.now()}`);
        const upRes = await uploadImageToImgbb(fd);
        if (upRes.success && upRes.url) {
          finalCoverUrl = upRes.url;
        } else {
          finalCoverUrl = tgFileUrl;
        }
      }
    } catch (photoErr) {
      console.warn('Gagal memproses foto Telegram ke ImgBB:', photoErr);
    }
  }

  // 2. Cocokkan Profil Penulis dengan database authors
  let resolvedAuthor = 'Redaksi';
  let resolvedAuthorId: number | null = null;

  try {
    const allAuthors = await db.select().from(authors);
    if (data.authorName) {
      const match = allAuthors.find(
        (a) => a.name.toLowerCase().trim() === data.authorName!.toLowerCase().trim() ||
               a.name.toLowerCase().includes(data.authorName!.toLowerCase().trim())
      );
      if (match) {
        resolvedAuthor = match.name;
        resolvedAuthorId = match.id;
      } else {
        resolvedAuthor = data.authorName;
      }
    } else if (allAuthors.length > 0) {
      resolvedAuthor = allAuthors[0].name;
      resolvedAuthorId = allAuthors[0].id;
    }
  } catch (authErr) {
    console.warn('Gagal memuat profil penulis:', authErr);
  }

  // 3. Generate Slug & Excerpt
  let slug = data.title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!slug) slug = `berita-${Date.now()}`;

  const existing = await db.select({ id: articles.id }).from(articles).where(eq(articles.slug, slug)).limit(1);
  if (existing.length > 0) {
    slug = `${slug}-${Date.now().toString().slice(-4)}`;
  }

  let excerpt = data.content
    .replace(/#+\s+/g, '')
    .replace(/[*_`\[\]()]/g, '')
    .substring(0, 160)
    .trim();
  if (excerpt.length >= 150) excerpt += '...';

  const isPublish = !data.isDraft;
  const status = isPublish ? 'published' : 'draft';
  const now = new Date();
  const publishedAt = isPublish ? now : null;

  // 4. Simpan ke database Neon
  const [newArticle] = await db
    .insert(articles)
    .values({
      title: data.title,
      slug,
      excerpt,
      content: data.content,
      category: data.category,
      coverUrl: finalCoverUrl,
      coverCaption: data.coverCaption || null,
      author: resolvedAuthor,
      authorId: resolvedAuthorId,
      tags: data.tags,
      status,
      publishAt: now,
      publishedAt,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  // 5. Revalidate cache halaman
  revalidatePath('/', 'layout');
  revalidatePath('/admin');
  revalidatePath(`/berita-teknologi/${data.category.toLowerCase()}`);

  // 6. Instant Indexing jika langsung diterbitkan
  if (isPublish) {
    const articleUrl = `${siteUrl}/berita-teknologi/${newArticle.category.toLowerCase()}/${newArticle.id}/${newArticle.slug}`;
    notifySearchEngines(articleUrl).catch((err) => console.warn('Manual Indexing Error:', err));
  }

  const wordCount = data.content.trim().split(/\s+/).filter(Boolean).length;
  const articleUrl = `${siteUrl}/berita-teknologi/${newArticle.category.toLowerCase()}/${newArticle.id}/${newArticle.slug}`;
  const editUrl = `${siteUrl}/admin/edit/${newArticle.id}`;

  const statusLabel = isPublish ? '🟢 <b>Tayang Publik (Published)</b>' : '🟡 <b>Draf Review (Draft)</b>';
  const headerIcon = isPublish ? '🎉 <b>BERITA MANUAL BERHASIL DITERBITKAN!</b>' : '📝 <b>BERITA MANUAL TERSIMPAN SEBAGAI DRAF!</b>';

  const successText = `${headerIcon}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📰 <b>${newArticle.title}</b>

┌── 📋 <b>Detail Artikel</b>
│ 📂 Kategori : <b>${newArticle.category}</b>
│ ✍️ Penulis  : <b>${newArticle.author}</b>
│ 📷 Sampul   : ${newArticle.coverUrl ? '<b>Terpasang (CDN ImgBB)</b>' : '<i>Tanpa Sampul</i>'}
│ 🏷️ Tagar    : ${newArticle.tags && newArticle.tags.length > 0 ? newArticle.tags.map(t => `#${t}`).join(', ') : '-'}
│ 📊 Panjang  : <b>${wordCount} kata</b>
│ 🚦 Status   : ${statusLabel}
└──
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ <i>Naskah langsung tersimpan di database tanpa modifikasi AI.</i>`;

  const inlineKeyboard: any[] = [];
  if (isPublish) {
    inlineKeyboard.push([{ text: '📖 Baca di Website', url: articleUrl }]);
  }
  inlineKeyboard.push([{ text: '✏️ Buka di Editor Web Admin', url: editUrl }]);
  inlineKeyboard.push([
    { text: '✍️ Tulis Berita Lain', callback_data: 'btn:manual' },
    { text: '🏠 Menu Utama', callback_data: 'btn:start' },
  ]);

  if (activeMsgId) {
    await updateOrSendMessage(chatId, activeMsgId, successText, { inlineKeyboard });
  } else {
    await sendTelegramMessage(chatId, successText, { inlineKeyboard });
  }
}

async function sendManualHelpMessage(chatId: number | string, messageId?: number, siteUrl?: string) {
  const helpText = `✍️ <b>PANDUAN TULIS BERITA MANUAL (NON-AI)</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tulis dan terbitkan liputan Anda sendiri langsung ke web tanpa sentuhan atau kurasi AI.

┌── 📌 <b>Format Pesan (Salin & Isi):</b>
<code>/manual
Judul: Peluncuran Chipset AI Generasi Baru Resmi Masuk Indonesia
Kategori: Hardware
Penulis: Indra Hakim Lesmana
Tags: hardware, ai, semikonduktor

Isi:
Pemerintah dan pelaku industri teknologi resmi mengumumkan fasilitas pengujian chipset generasi terbaru di Indonesia.

Langkah ini memperkuat kemandirian infrastruktur komputasi awan nasional.</code>
└──

💡 <b>Tips Foto dari Galeri HP:</b>
Kirim foto langsung ke bot Telegram ini, lalu tempelkan teks format di atas pada kolom <b>Caption</b> foto. Bot akan otomatis mengunggahnya ke CDN ImgBB!`;

  await updateOrSendMessage(chatId, messageId, helpText, {
    inlineKeyboard: [
      [{ text: '📋 Dapatkan Templat Kosong', callback_data: 'manual:template' }],
      [{ text: '👤 Lihat Daftar Penulis', callback_data: 'manual:authors' }],
      [
        { text: '🏠 Menu Utama', callback_data: 'btn:start' },
        { text: '❌ Tutup Layar', callback_data: 'btn:close' },
      ],
    ],
  });
}

async function sendManualTemplateMessage(chatId: number | string, messageId?: number) {
  const templateText = `📋 <b>TEMPLAT SIAP SALIN (KLIK UNTUK COPY):</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
<code>/manual
Judul: 
Kategori: Software
Penulis: Redaksi
Tags: teknologi, update

Isi:
[Tulis paragraf 1 di sini...]

[Tulis paragraf 2 di sini...]</code>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
<i>Silakan salin teks di atas, lengkapi Judul dan Isi, lalu kirim kembali ke bot ini.</i>`;

  await sendTelegramMessage(chatId, templateText, {
    inlineKeyboard: [
      [{ text: '👤 Lihat Daftar Penulis', callback_data: 'manual:authors' }],
      [{ text: '🏠 Menu Utama', callback_data: 'btn:start' }],
    ],
  });
}

async function sendManualAuthorsList(chatId: number | string, messageId?: number) {
  let listText = '';
  try {
    const list = await db.select().from(authors);
    if (list.length > 0) {
      listText = list.map((a, i) => `│ ${i + 1}. <b>${a.name}</b> (${a.role})`).join('\n');
    }
  } catch {}

  const text = `👤 <b>DAFTAR PROFIL PENULIS TERSEDIA:</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┌── 📋 <b>Pilihan Profil</b>
${listText || '│ • Redaksi (Tim Redaksi)'}
└──

💡 <i>Tip: Cantumkan salah satu nama di atas pada baris <code>Penulis: [Nama]</code> pada pesan <code>/manual</code> Anda.</i>`;

  await sendTelegramMessage(chatId, text, {
    inlineKeyboard: [
      [{ text: '📋 Dapatkan Templat Kosong', callback_data: 'manual:template' }],
      [{ text: '🏠 Menu Utama', callback_data: 'btn:start' }],
    ],
  });
}

// Tampilan Menu Sambutan Klasik Berbingkai (/start)
async function sendWelcomeMessage(
  chatId: number | string,
  messageId: number | undefined,
  firstName: string,
  userId: number | string,
  siteUrl: string
) {
  let total = 0;
  let published = 0;
  let draft = 0;

  try {
    const allArticles = await db.select({ status: articles.status }).from(articles);
    total = allArticles.length;
    published = allArticles.filter((a) => a.status === 'published').length;
    draft = allArticles.filter((a) => a.status === 'draft').length;
  } catch {
    // fallback jika gagal select db
  }

  let autopilotBox = '';
  try {
    const auto = await getAutopilotScheduleInfo();
    autopilotBox = `\n\n┌── 🤖 <b>Autopilot Redaksi AI</b>\n│ Status : ${auto.isEnabled ? '🟢 <b>Aktif</b>' : '🔴 <b>Nonaktif</b>'}\n│ Jadwal : <b>${auto.nextRunLabel}</b>\n│ Hitung Mundur : ⏳ <b>${auto.countdown}</b>\n└──`;
  } catch {}

  const welcomeText = `✨━━━━━━━━━━━━━━━━━━━━━━━━━━━━✨
Halo <b>${firstName}</b> 👋
Selamat datang di <b>Naratif Redaksi Bot</b>
✨━━━━━━━━━━━━━━━━━━━━━━━━━━━━✨

┌── 👤 <b>Profil Editor</b>
│ 📛 Nama: <b>${firstName}</b>
│ 🆔 ID: <code>${userId}</code>
│ 🏷️ Akses: 🛡️ <b>Redaksi Inti</b>
└──

┌── 📊 <b>Status Portal Naratif</b>
│ 📁 Total Arsip : <b>${total} artikel</b>
│ 🚀 Tayang Web  : <b>${published} artikel</b>
│ 📝 Draf Review : <b>${draft} artikel</b>
└──${autopilotBox}

👇 <i>Pilih aksi cepat di bawah untuk mulai bekerja:</i>`;

  const inlineKeyboard = [
    [
      { text: '✍️ Tulis Berita Manual', callback_data: 'btn:manual' },
      { text: '🤖 Buat Berita AI', callback_data: 'btn:menu' },
    ],
    [
      { text: '🤖 Jadwal Autopilot', callback_data: 'btn:autopilot' },
      { text: '📊 Cek Statistik', callback_data: 'btn:stats' },
    ],
    [
      { text: '🏛️ Liputan Regional', callback_data: 'cat:Regional' },
      { text: '🔗 Sadur Berita', callback_data: 'btn:sadur_help' },
    ],
    [
      { text: '🌐 Buka Website', url: siteUrl },
      { text: '⚙️ Dasbor Admin', url: `${siteUrl}/admin` },
    ],
    [{ text: '❌ Tutup Layar', callback_data: 'btn:close' }],
  ];

  // Pastikan menu command bot di Telegram selalu sinkron
  setTelegramCommands(BOT_COMMANDS).catch(() => {});

  await updateOrSendMessage(chatId, messageId, welcomeText, { inlineKeyboard });
}

async function sendStatsMessage(chatId: number | string, messageId: number | undefined, siteUrl: string) {
  const allArticles = await db.select({ status: articles.status }).from(articles);
  const total = allArticles.length;
  const published = allArticles.filter((a) => a.status === 'published').length;
  const scheduled = allArticles.filter((a) => a.status === 'scheduled').length;
  const draft = allArticles.filter((a) => a.status === 'draft').length;

  let autopilotBox = '';
  try {
    const auto = await getAutopilotScheduleInfo();
    autopilotBox = `\n\n┌── 🤖 <b>Jadwal Autopublish AI</b>\n│ Status : ${auto.isEnabled ? '🟢 <b>Aktif</b>' : '🔴 <b>Nonaktif</b>'}\n│ Berikutnya : <b>${auto.nextRunLabel}</b>\n│ Hitung Mundur : ⏳ <b>${auto.countdown}</b> (Kategori: <b>${auto.nextCategory}</b>)\n└──`;
  } catch {}

  const statsText = `📊 <b>STATISTIK PORTAL NARATIF</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Laporan performa publikasi & infrastruktur server

┌── 📰 <b>Status Publikasi Berita</b>
│ 📁 Total Arsip : <b>${total} artikel</b>
│ 🚀 Tayang Web  : <b>${published}</b>
│ ⏳ Terjadwal   : <b>${scheduled}</b>
│ 📝 Draf Review : <b>${draft}</b>
└──${autopilotBox}

┌── ⚡ <b>Infrastruktur Redaksi</b>
│ 💾 Database  : 🟢 <code>Neon PostgreSQL (Normal)</code>
│ 🤖 AI Engine : 🟢 <code>Gemini 2.5 Flash & Groq (Siap)</code>
└──
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 <a href="${siteUrl}/admin">Buka Dasbor Redaksi Lengkap</a>`;

  await updateOrSendMessage(chatId, messageId, statsText, {
    inlineKeyboard: [
      [
        { text: '🤖 Status Autopilot', callback_data: 'btn:autopilot' },
        { text: '✍️ Buat Berita', callback_data: 'btn:menu' },
      ],
      [
        { text: '🏠 Menu Utama', callback_data: 'btn:start' },
        { text: '❌ Tutup Layar', callback_data: 'btn:close' },
      ],
    ],
  });
}

async function sendAutopilotMessage(
  chatId: number | string,
  messageId: number | undefined,
  siteUrl: string
) {
  let scheduleInfo;
  try {
    scheduleInfo = await getAutopilotScheduleInfo();
  } catch (err: any) {
    await updateOrSendMessage(
      chatId,
      messageId,
      `❌ <b>Gagal Memuat Status Autopilot</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nKendala: <code>${err?.message || 'Error koneksi database/konfigurasi'}</code>`
    );
    return;
  }

  const statusBadge = scheduleInfo.isEnabled
    ? '🟢 <b>AKTIF (Berjalan Otomatis)</b>'
    : '🔴 <b>NONAKTIF (Dijeda Redaktur)</b>';

  const modeBadge =
    scheduleInfo.statusMode === 'published'
      ? '🚀 Langsung Terbit (Published)'
      : '📝 Simpan Draf (Review)';

  const autopilotText = `🤖 <b>STATUS & JADWAL AUTOPILOT REDAKSI</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Pusat kendali autopublish berita otomatis AI Naratif

┌── ⚙️ <b>Konfigurasi Sistem</b>
│ • Status Sistem : ${statusBadge}
│ • Target Mode   : <b>${modeBadge}</b>
│ • AI Engine     : ⚡ <b>${scheduleInfo.provider.toUpperCase()}</b>
│ • Kategori Giliran : 📂 <b>${scheduleInfo.nextCategory}</b>
└──

┌── ⏰ <b>Jadwal Publikasi Berikutnya</b>
│ • Waktu Eksekusi : <b>${scheduleInfo.nextRunLabel}</b>
│ • Hitung Mundur  : ⏳ <b>${scheduleInfo.countdown}</b>
│ • Siklus Rutin   : <code>07:00 • 13:00 • 19:00 WIB</code>
└──
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 <i>Artikel diriset otomatis dari Google News Indonesia terkini dan dianalisis sesuai kaidah jurnalistik Naratif.</i>`;

  const inlineKeyboard = [
    [
      { text: '⚙️ Dasbor Cron Web', url: `${siteUrl}/admin/cron` },
      { text: '📊 Cek Statistik', callback_data: 'btn:stats' },
    ],
    [
      { text: '✍️ Mulai Buat Berita', callback_data: 'btn:menu' },
      { text: '🏠 Menu Utama', callback_data: 'btn:start' },
    ],
    [{ text: '❌ Tutup Layar', callback_data: 'btn:close' }],
  ];

  await updateOrSendMessage(chatId, messageId, autopilotText, { inlineKeyboard });
}

export async function POST(req: NextRequest) {
  try {
    const update = await req.json();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.naratif.web.id';
    const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID?.trim();

    // ==========================================
    // 1. PENANGANAN CALLBACK QUERY (KLIK TOMBOL INTERAKTIF)
    // ==========================================
    if (update?.callback_query) {
      const cb = update.callback_query;
      const callbackQueryId = cb.id;
      const chatId = cb.message?.chat?.id;
      const messageId = cb.message?.message_id;
      const userId = cb.from?.id;
      const firstName = cb.from?.first_name || 'Redaksi';
      const data: string = cb.data || '';

      await answerCallbackQuery(callbackQueryId);

      // Cek otorisasi admin jika TELEGRAM_ADMIN_CHAT_ID disetel
      if (adminChatId && String(userId) !== adminChatId && String(chatId) !== adminChatId) {
        await updateOrSendMessage(
          chatId,
          messageId,
          `⛔ <b>Akses Terbatas</b>\n\nMaaf <b>${firstName}</b>, bot ini dikunci khusus untuk Redaksi Naratif.\nID Telegram Anda: <code>${userId}</code>`
        );
        return NextResponse.json({ ok: true });
      }

      // Tombol Tutup / Bersihkan Pesan
      if (data === 'btn:close') {
        if (messageId) {
          await deleteTelegramMessage(chatId, messageId);
        }
        return NextResponse.json({ ok: true });
      }

      // Tombol Kembali ke Menu Utama
      if (data === 'btn:start') {
        await sendWelcomeMessage(chatId, messageId, firstName, userId, siteUrl);
        return NextResponse.json({ ok: true });
      }

      // Panduan Sadur Berita
      if (data === 'btn:sadur_help') {
        const text = `🔗 <b>PANDUAN SADUR BERITA DARI LINK</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Fitur ini membaca berita dari URL media luar (The Verge, Reuters, Kompas, dll), mengekstrak fakta penting, dan menulis ulang naskah orisinal dalam Bahasa Indonesia.

┌── 📌 <b>Cara Penggunaan</b>
│ 1. Salin link berita dari website/portal luar
│ 2. Ketik perintah: <code>/sadur [link_url]</code>
│    <i>atau tempelkan langsung link URL ke chat</i>
└──

💡 <i>Contoh:</i>
<code>/sadur https://www.theverge.com/2026/openai-model-release</code>`;

        await updateOrSendMessage(chatId, messageId, text, {
          inlineKeyboard: [
            [{ text: '✍️ Mulai Buat Berita', callback_data: 'btn:menu' }],
            [
              { text: '🏠 Menu Utama', callback_data: 'btn:start' },
              { text: '❌ Tutup Layar', callback_data: 'btn:close' },
            ],
          ],
        });
        return NextResponse.json({ ok: true });
      }

      // Panduan Revisi Artikel
      if (data === 'btn:revisi_help') {
        const text = `✏️ <b>PANDUAN REVISI / EDIT ARTIKEL</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Anda bisa merevisi artikel yang sudah ada di database melalui perintah AI:

┌── 📌 <b>Format Perintah</b>
│ <code>/revisi [ID_ARTIKEL] [instruksi perbaikan]</code>
└──

💡 <b>Contoh:</b>
<code>/revisi 42 perbaiki kalimat pembuka dan tambahkan kutipan narasumber dinas terkait</code>

<i>Tip: ID Artikel dapat dilihat di Dasbor Admin atau pada URL berita di website.</i>`;

        await updateOrSendMessage(chatId, messageId, text, {
          inlineKeyboard: [
            [{ text: '⚙️ Dasbor Admin Web', url: `${siteUrl}/admin` }],
            [
              { text: '🏠 Menu Utama', callback_data: 'btn:start' },
              { text: '❌ Tutup Layar', callback_data: 'btn:close' },
            ],
          ],
        });
        return NextResponse.json({ ok: true });
      }

      // Tombol Menu / Buat Berita (Langkah 1: Kategori)
      if (data === 'btn:menu') {
        const step1Text = `📝 <b>LANGKAH 1 DARI 5: PILIH KATEGORI BERITA</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Pilih salah satu bidang liputan redaksi:

┌── 📂 <b>Pilihan Kategori</b>
│ • AI & Software : Tren teknologi & rekayasa modern
│ • Hardware & Infra : Semikonduktor, chip & data center
│ • Gadget : Konsumen & smartphone flagship terkini
│ • Regional : Dinamika kebijakan publik daerah
└──`;

        await updateOrSendMessage(chatId, messageId, step1Text, {
          inlineKeyboard: [
            [
              { text: '🤖 Tren AI', callback_data: 'cat:AI' },
              { text: '💻 Software', callback_data: 'cat:Software' },
            ],
            [
              { text: '⚙️ Hardware', callback_data: 'cat:Hardware' },
              { text: '☁️ Infrastruktur', callback_data: 'cat:Infrastruktur' },
            ],
            [
              { text: '📱 Inovasi Gadget', callback_data: 'cat:Gadget' },
              { text: '🏛️ Berita Daerah', callback_data: 'cat:Regional' },
            ],
            [{ text: '✍️ Ketik Topik Sendiri...', callback_data: 'cat:CUSTOM' }],
            [
              { text: '🏠 Menu Utama', callback_data: 'btn:start' },
              { text: '❌ Tutup Layar', callback_data: 'btn:close' },
            ],
          ],
        });
        return NextResponse.json({ ok: true });
      }

      // Tombol Statistik
      if (data === 'btn:stats') {
        await sendStatsMessage(chatId, messageId, siteUrl);
        return NextResponse.json({ ok: true });
      }

      // Tombol Status & Jadwal Autopilot
      if (data === 'btn:autopilot') {
        await sendAutopilotMessage(chatId, messageId, siteUrl);
        return NextResponse.json({ ok: true });
      }

      // Tombol Tulis Berita Manual (Non-AI)
      if (data === 'btn:manual') {
        await sendManualHelpMessage(chatId, messageId, siteUrl);
        return NextResponse.json({ ok: true });
      }

      // Tombol Templat Siap Pakai Manual
      if (data === 'manual:template') {
        await sendManualTemplateMessage(chatId, messageId);
        return NextResponse.json({ ok: true });
      }

      // Tombol Daftar Profil Penulis Manual
      if (data === 'manual:authors') {
        await sendManualAuthorsList(chatId, messageId);
        return NextResponse.json({ ok: true });
      }

      // Langkah 1: Kategori Terpilih
      if (data.startsWith('cat:')) {
        const category = data.slice('cat:'.length);

        if (category === 'CUSTOM') {
          const customPrompt = `✍️ <b>Ketik Topik Berita Anda Sendiri:</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Silakan kirim chat dengan salah satu perintah:

┌── ⚡ <b>Pilihan Perintah Cepat</b>
│ 👉 <code>/tulis [topik berita]</code> <i>(Terbit Langsung + Riset)</i>
│ 👉 <code>/regional [daerah] : [topik]</code> <i>(Berita Khusus Daerah)</i>
│ 👉 <code>/draft [topik berita]</code> <i>(Simpan Draf Review)</i>
│ 👉 <code>/panjang [topik berita]</code> <i>(Artikel Mendalam ~1200 kata)</i>
│ 👉 <code>/ringkas [topik berita]</code> <i>(Format Ringkas ~400 kata)</i>
│ 👉 <code>/opini [topik berita]</code> <i>(Murni Analisis AI)</i>
└──

💡 <i>Contoh:</i>
<code>/tulis Inovasi Chipset 2nm TSMC dan Dampaknya bagi Industri AI</code>`;

          await updateOrSendMessage(chatId, messageId, customPrompt, {
            inlineKeyboard: [
              [
                { text: '⬅️ Kembali ke Kategori', callback_data: 'btn:menu' },
                { text: '🏠 Menu Utama', callback_data: 'btn:start' },
              ],
            ],
          });
          return NextResponse.json({ ok: true });
        }

        // FITUR A: JIKA KATEGORI REGIONAL -> MASUK KE LANGKAH 1B (PILIH WILAYAH DENGAN PAGINASI)
        if (category === 'Regional') {
          const { keyboard, safePage, totalPages } = buildRegionalKeyboard(1);
          const stepRegionText = getRegionalStepText(safePage, totalPages);

          await updateOrSendMessage(chatId, messageId, stepRegionText, {
            inlineKeyboard: keyboard,
          });
          return NextResponse.json({ ok: true });
        }

        // Untuk kategori teknologi selain regional: Lanjut ke Langkah 2 (Riset)
        const preset = PRESET_TOPICS[category] || { label: category, prompt: category };
        const step2Text = `🔍 <b>LANGKAH 2 DARI 5: RISET GOOGLE NEWS</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Kategori: <b>${preset.label}</b>

┌── 🌐 <b>Mode Liputan Berita</b>
│ • <b>Aktif</b>: Melacak fakta terbaru Google News Indonesia
│ • <b>Nonaktif</b>: Analisis murni AI berbasis opini redaksi
└──`;

        await updateOrSendMessage(chatId, messageId, step2Text, {
          inlineKeyboard: [
            [{ text: '🌐 Aktifkan Riset Google News (Rekomendasi)', callback_data: `rs:1:${category}:-` }],
            [{ text: '⚡ Murni Analisis AI (Tanpa Riset Web)', callback_data: `rs:0:${category}:-` }],
            [
              { text: '⬅️ Kembali ke Kategori', callback_data: 'btn:menu' },
              { text: '🏠 Menu Utama', callback_data: 'btn:start' },
            ],
          ],
        });
        return NextResponse.json({ ok: true });
      }

      // Paginasi Wilayah Regional (regpage:N)
      if (data.startsWith('regpage:')) {
        const pageNum = parseInt(data.slice('regpage:'.length), 10) || 1;
        const { keyboard, safePage, totalPages } = buildRegionalKeyboard(pageNum);
        const stepRegionText = getRegionalStepText(safePage, totalPages);

        await updateOrSendMessage(chatId, messageId, stepRegionText, {
          inlineKeyboard: keyboard,
        });
        return NextResponse.json({ ok: true });
      }

      // Langkah 1b: Wilayah Regional Terpilih -> Pindah ke Langkah 2 (Riset)
      if (data.startsWith('reg:')) {
        const region = data.slice('reg:'.length);
        const step2Text = `🔍 <b>LANGKAH 2 DARI 5: RISET BERITA DAERAH</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Kategori : <b>Regional</b>
Wilayah  : <b>📍 ${region}</b>

┌── 🌐 <b>Mode Liputan Daerah</b>
│ • <b>Aktif</b>: Riset Google News lokal isu Pemda & warga ${region}
│ • <b>Nonaktif</b>: Analisis murni AI berbasis pengetahuan umum
└──`;

        await updateOrSendMessage(chatId, messageId, step2Text, {
          inlineKeyboard: [
            [{ text: `🌐 Riset Google News ${region}: AKTIF`, callback_data: `rs:1:Regional:${region}` }],
            [{ text: '⚡ Murni Analisis AI (Tanpa Riset Web)', callback_data: `rs:0:Regional:${region}` }],
            [
              { text: '⬅️ Ganti Wilayah', callback_data: 'cat:Regional' },
              { text: '🏠 Menu Utama', callback_data: 'btn:start' },
            ],
          ],
        });
        return NextResponse.json({ ok: true });
      }

      // Langkah 2: Riset Google News Terpilih -> Pindah ke Langkah 3 (Panjang Artikel)
      if (data.startsWith('rs:')) {
        const [, isResearch, category, region] = data.split(':');
        const isReg = category === 'Regional';
        const cleanRegion = (region && region !== '-' && region !== 'Umum') ? region : '';
        const preset = PRESET_TOPICS[category] || { label: category, prompt: category };
        const researchLabel = isResearch === '1' ? '🌐 Google News Aktif' : '⚡ Murni Analisis AI';

        const step3Text = `📏 <b>LANGKAH 3 DARI 5: PANJANG NASKAH</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Kategori : <b>${preset.label}${cleanRegion ? ` (${cleanRegion})` : ''}</b>
Riset    : <b>${researchLabel}</b>

┌── 📄 <b>Format Tulisan</b>
│ • Ringkas  : ~400 kata (Kabar kilat & breaking)
│ • Standar  : ~700 kata (Struktur berita lengkap)
│ • Mendalam : ~1200 kata (Investigasi & komprehensif)
└──`;

        await updateOrSendMessage(chatId, messageId, step3Text, {
          inlineKeyboard: [
            [{ text: '📄 Format Ringkas (~400 kata)', callback_data: `len:ringkas:${isResearch}:${category}:${region || '-'}` }],
            [{ text: '📑 Format Standar (~700 kata)', callback_data: `len:standar:${isResearch}:${category}:${region || '-'}` }],
            [{ text: '📚 Format Mendalam (~1200 kata)', callback_data: `len:mendalam:${isResearch}:${category}:${region || '-'}` }],
            [
              { text: '⬅️ Kembali ke Riset', callback_data: isReg ? `reg:${region}` : `cat:${category}` },
              { text: '🏠 Menu Utama', callback_data: 'btn:start' },
            ],
          ],
        });
        return NextResponse.json({ ok: true });
      }

      // Langkah 3: Panjang Terpilih -> Pindah ke Langkah 4 (Pilih AI Engine)
      if (data.startsWith('len:')) {
        const [, length, isResearch, category, region] = data.split(':');
        const cleanRegion = (region && region !== '-' && region !== 'Umum') ? region : '';
        const preset = PRESET_TOPICS[category] || { label: category, prompt: category };
        const researchLabel = isResearch === '1' ? 'Aktif' : 'Nonaktif';
        const lengthLabel =
          length === 'ringkas' ? 'Ringkas (~400 kata)' : length === 'mendalam' ? 'Mendalam (~1200 kata)' : 'Standar (~700 kata)';

        const step4Text = `🤖 <b>LANGKAH 4 DARI 5: PILIH AI ENGINE</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Kategori : <b>${preset.label}${cleanRegion ? ` (${cleanRegion})` : ''}</b>
Riset    : <b>${researchLabel}</b>
Format   : <b>${lengthLabel}</b>

┌── ⚡ <b>Mesin Kecerdasan Buatan</b>
│ • Gemini Flash : Penalaran akurat & gaya jurnalistik halus
│ • Groq Cloud   : Kecepatan super kilat (~5 detik)
│ • 9Router Gate : Arsitektur custom / multi-model
└──`;

        await updateOrSendMessage(chatId, messageId, step4Text, {
          inlineKeyboard: [
            [{ text: '⚡ Google Gemini 2.5 Flash (Rekomendasi)', callback_data: `eng:gemini:${length}:${isResearch}:${category}:${region || '-'}` }],
            [{ text: '🚀 Groq Cloud (Super Cepat ~5s)', callback_data: `eng:groq:${length}:${isResearch}:${category}:${region || '-'}` }],
            [{ text: '🌐 9Router Gateway (Custom)', callback_data: `eng:9router:${length}:${isResearch}:${category}:${region || '-'}` }],
            [
              { text: '⬅️ Ganti Panjang', callback_data: `rs:${isResearch}:${category}:${region || '-'}` },
              { text: '🏠 Menu Utama', callback_data: 'btn:start' },
            ],
          ],
        });
        return NextResponse.json({ ok: true });
      }

      // Langkah 4: AI Engine Terpilih -> Pindah ke Langkah 5 (Status Publikasi)
      if (data.startsWith('eng:')) {
        const [, provider, length, isResearch, category, region] = data.split(':');
        const cleanRegion = (region && region !== '-' && region !== 'Umum') ? region : '';
        const preset = PRESET_TOPICS[category] || { label: category, prompt: category };
        const lengthLabel =
          length === 'ringkas' ? 'Ringkas (~400 kata)' : length === 'mendalam' ? 'Mendalam (~1200 kata)' : 'Standar (~700 kata)';
        const providerLabel =
          provider === 'groq'
            ? '🚀 Groq Cloud'
            : provider === '9router'
            ? '🌐 9Router Gateway'
            : '⚡ Google Gemini';

        const step5Text = `🎯 <b>LANGKAH 5 DARI 5: STATUS PUBLIKASI</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Kategori  : <b>${preset.label}${cleanRegion ? ` (${cleanRegion})` : ''}</b>
AI Engine : <b>${providerLabel}</b>
Format    : <b>${lengthLabel}</b>

┌── 🚀 <b>Tindakan Akhir</b>
│ • <b>Langsung Terbit</b>: Artikel langsung tayang di portal
│ • <b>Simpan Draf</b>: Siap ditinjau & kurasi redaktur
└──`;

        await updateOrSendMessage(chatId, messageId, step5Text, {
          inlineKeyboard: [
            [{ text: '🚀 Langsung Terbitkan ke Web', callback_data: `gen:pub:${provider}:${length}:${isResearch}:${category}:${region || '-'}` }],
            [{ text: '📝 Simpan Sebagai Draf (Review)', callback_data: `gen:drf:${provider}:${length}:${isResearch}:${category}:${region || '-'}` }],
            [
              { text: '⬅️ Ganti AI Engine', callback_data: `len:${length}:${isResearch}:${category}:${region || '-'}` },
              { text: '🏠 Menu Utama', callback_data: 'btn:start' },
            ],
          ],
        });
        return NextResponse.json({ ok: true });
      }

      // Langkah 5: Eksekusi Generator Berita
      if (data.startsWith('gen:')) {
        const parts = data.split(':');
        let statusStr = 'pub';
        let provider: 'gemini' | 'groq' | '9router' = 'gemini';
        let lengthStr = 'standar';
        let isResearchStr = '1';
        let category = 'AI';
        let region = '-';

        if (parts.length >= 7) {
          [, statusStr, provider, lengthStr, isResearchStr, category, region] = parts as any;
        } else if (parts.length >= 6) {
          [, statusStr, provider, lengthStr, isResearchStr, category] = parts as any;
        }

        const preset = PRESET_TOPICS[category] || { label: category, prompt: category };
        const isPublish = statusStr === 'pub';
        const enableWebSearch = isResearchStr === '1';
        const length = (lengthStr as 'ringkas' | 'standar' | 'mendalam') || 'standar';

        await runArticleGeneration({
          chatId,
          topic: preset.prompt,
          category,
          region: region !== '-' ? region : undefined,
          length,
          provider,
          enableWebSearch,
          isPublish,
          siteUrl,
          messageId,
        });

        return NextResponse.json({ ok: true });
      }

      return NextResponse.json({ ok: true });
    }

    // ==========================================
    // 2. PENANGANAN PESAN TEKS BIASA / PERINTAH
    // ==========================================
    const message = update?.message;
    if (!message || (!message.text && !message.caption)) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id;
    const messageId = message.message_id;
    const userId = message.from?.id;
    const firstName = message.from?.first_name || 'Redaksi';
    const rawText = (message.text || message.caption || '').trim();
    const hasPhoto = Array.isArray(message.photo) && message.photo.length > 0;
    const photoFileId = hasPhoto ? message.photo[message.photo.length - 1].file_id : undefined;

    // 1. COMMAND: /start, /help, /bantuan
    if (
      rawText === '/start' ||
      rawText.startsWith('/start ') ||
      rawText === '/help' ||
      rawText === '/bantuan'
    ) {
      await sendWelcomeMessage(chatId, undefined, firstName, userId, siteUrl);
      return NextResponse.json({ ok: true });
    }

    // Verifikasi Otorisasi Admin
    if (adminChatId && String(userId) !== adminChatId && String(chatId) !== adminChatId) {
      await sendTelegramMessage(
        chatId,
        `⛔ <b>Akses Terbatas</b>\n\nMaaf <b>${firstName}</b>, bot ini dikunci khusus untuk Redaksi Naratif.\nID Telegram Anda: <code>${userId}</code>`
      );
      return NextResponse.json({ ok: true });
    }

    // FITUR: TULIS BERITA MANUAL NON-AI (/manual atau /post)
    const isManualCmd = rawText.startsWith('/manual') || rawText.startsWith('/post');
    if (isManualCmd) {
      const cleanedAfterCmd = rawText.replace(/^\/(?:manual|post)(?:@\w+)?[\s\r\n]*/i, '').trim();
      if (!cleanedAfterCmd) {
        await sendManualHelpMessage(chatId, undefined, siteUrl);
        return NextResponse.json({ ok: true });
      }

      await runManualArticlePublication({
        chatId,
        messageId,
        rawText,
        hasPhoto,
        photoFileId,
        siteUrl,
      });
      return NextResponse.json({ ok: true });
    }

    // 2. COMMAND BERSIHKAN LAYAR: /clear, /bersihkan
    if (rawText === '/clear' || rawText === '/bersihkan') {
      const currentId = Number(messageId);
      if (currentId && !isNaN(currentId)) {
        // Kumpulkan ID pesan mundur hingga 60 pesan ke belakang
        const idsToDelete: number[] = [];
        for (let i = currentId; i >= Math.max(1, currentId - 60); i--) {
          idsToDelete.push(i);
        }
        await deleteTelegramMessages(chatId, idsToDelete);
      } else if (messageId) {
        await deleteTelegramMessage(chatId, messageId).catch(() => {});
      }

      const clearText = `✨━━━━━━━━━━━━━━━━━━━━━━━━━━━━✨
<b>NARATIF REDAKSI BOT</b>
Layar obrolan berhasil dirapikan.
✨━━━━━━━━━━━━━━━━━━━━━━━━━━━━✨

Ketik <code>/start</code> atau pilih aksi cepat:`;

      await sendTelegramMessage(chatId, clearText, {
        inlineKeyboard: [
          [{ text: '✍️ Mulai Buat Berita', callback_data: 'btn:menu' }],
          [
            { text: '🏠 Menu Utama', callback_data: 'btn:start' },
            { text: '❌ Tutup Layar', callback_data: 'btn:close' },
          ],
        ],
      });
      return NextResponse.json({ ok: true });
    }

    // 3. COMMAND: /menu, /buat
    if (rawText === '/menu' || rawText === '/buat') {
      const step1Text = `📝 <b>LANGKAH 1 DARI 5: PILIH KATEGORI BERITA</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Pilih salah satu bidang liputan redaksi:

┌── 📂 <b>Pilihan Kategori</b>
│ • AI & Software : Tren teknologi & rekayasa modern
│ • Hardware & Infra : Semikonduktor, chip & data center
│ • Gadget : Konsumen & smartphone flagship terkini
│ • Regional : Dinamika kebijakan publik daerah
└──`;

      await sendTelegramMessage(chatId, step1Text, {
        inlineKeyboard: [
          [
            { text: '🤖 Tren AI', callback_data: 'cat:AI' },
            { text: '💻 Software', callback_data: 'cat:Software' },
          ],
          [
            { text: '⚙️ Hardware', callback_data: 'cat:Hardware' },
            { text: '☁️ Infrastruktur', callback_data: 'cat:Infrastruktur' },
          ],
          [
            { text: '📱 Inovasi Gadget', callback_data: 'cat:Gadget' },
            { text: '🏛️ Berita Daerah', callback_data: 'cat:Regional' },
          ],
          [{ text: '✍️ Ketik Topik Sendiri...', callback_data: 'cat:CUSTOM' }],
          [
            { text: '🏠 Menu Utama', callback_data: 'btn:start' },
            { text: '❌ Tutup Layar', callback_data: 'btn:close' },
          ],
        ],
      });
      return NextResponse.json({ ok: true });
    }

    // 4. COMMAND: /stats
    if (rawText === '/stats') {
      await sendStatsMessage(chatId, undefined, siteUrl);
      return NextResponse.json({ ok: true });
    }

    // 4b. COMMAND: /autopilot, /jadwal
    if (rawText === '/autopilot' || rawText === '/jadwal') {
      await sendAutopilotMessage(chatId, undefined, siteUrl);
      return NextResponse.json({ ok: true });
    }

    // 5. FITUR B: COMMAND REVISI ARTIKEL (/revisi [id] [instruksi])
    const matchRevisi = rawText.match(/^\/revisi(?:@\w+)?(?:\s+(\d+)\s+([\s\S]+))?$/i);
    if (rawText === '/revisi' || (matchRevisi && !matchRevisi[1])) {
      const revisiHelp = `✏️ <b>PANDUAN REVISI / EDIT ARTIKEL</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Perbaiki naskah artikel yang sudah tersimpan dengan instruksi AI:

┌── 📌 <b>Format Perintah</b>
│ <code>/revisi [ID_ARTIKEL] [instruksi perbaikan]</code>
└──

💡 <b>Contoh:</b>
<code>/revisi 42 perbaiki kalimat pembuka dan tambahkan kutipan narasumber dinas terkait</code>

<i>Tip: ID Artikel dapat dilihat di Dasbor Admin atau URL berita.</i>`;

      await sendTelegramMessage(chatId, revisiHelp, {
        inlineKeyboard: [
          [{ text: '⚙️ Dasbor Admin Web', url: `${siteUrl}/admin` }],
          [
            { text: '🏠 Menu Utama', callback_data: 'btn:start' },
            { text: '❌ Tutup Layar', callback_data: 'btn:close' },
          ],
        ],
      });
      return NextResponse.json({ ok: true });
    }

    if (matchRevisi && matchRevisi[1] && matchRevisi[2]) {
      const targetId = parseInt(matchRevisi[1], 10);
      const instruction = matchRevisi[2].trim();
      await runArticleRevision({
        chatId,
        articleId: targetId,
        instruction,
        siteUrl,
      });
      return NextResponse.json({ ok: true });
    }

    // 6. FITUR A: COMMAND KHUSUS REGIONAL (/regional [wilayah] [topik] atau /daerah)
    const matchRegional = rawText.match(/^\/(?:regional|daerah)(?:@\w+)?(?:\s+([A-Za-z\s]+?)\s*:\s*([\s\S]+)|\s+([\s\S]+))?$/i);
    if (rawText === '/regional' || rawText === '/daerah' || (matchRegional && !matchRegional[2] && !matchRegional[3])) {
      const regionalHelp = `🏛️ <b>PANDUAN BERITA REGIONAL & DAERAH</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Susun liputan berbasis isu kebijakan publik provinsi atau daerah di Indonesia:

┌── 📌 <b>Format Perintah</b>
│ <code>/regional [Provinsi] : [Topik Berita]</code>
│ <i>atau langsung:</i> <code>/regional [Topik Berita]</code>
└──

💡 <b>Contoh:</b>
<code>/regional Kalimantan Timur : Kebijakan subsidi transportasi publik dan fasilitas IKN</code>

👇 <i>Atau pilih langsung provinsi lewat menu interaktif:</i>`;

      await sendTelegramMessage(chatId, regionalHelp, {
        inlineKeyboard: [
          [{ text: '🏛️ Buka Pilihan Daerah', callback_data: 'cat:Regional' }],
          [
            { text: '🏠 Menu Utama', callback_data: 'btn:start' },
            { text: '❌ Tutup Layar', callback_data: 'btn:close' },
          ],
        ],
      });
      return NextResponse.json({ ok: true });
    }

    if (matchRegional && (matchRegional[2] || matchRegional[3])) {
      let regionTarget = 'Umum';
      let regionalTopic = '';

      if (matchRegional[2]) {
        regionTarget = matchRegional[1]?.trim() || 'Umum';
        regionalTopic = matchRegional[2]?.trim() || '';
      } else {
        regionalTopic = matchRegional[3]?.trim() || '';
        // Coba deteksi jika nama wilayah disebutkan di awal (misal: /regional Jawa Barat Dampak ...)
        for (const prov of REGIONAL_PROVINCES) {
          if (regionalTopic.toLowerCase().startsWith(prov.toLowerCase())) {
            regionTarget = prov;
            regionalTopic = regionalTopic.slice(prov.length).replace(/^[-:\s]+/, '').trim();
            break;
          }
        }
      }

      await runArticleGeneration({
        chatId,
        topic: regionalTopic || `Dinamika kebijakan publik dan pelayanan masyarakat ${regionTarget}`,
        category: 'Regional',
        region: regionTarget,
        length: 'standar',
        provider: 'gemini',
        enableWebSearch: true,
        isPublish: true,
        siteUrl,
      });
      return NextResponse.json({ ok: true });
    }

    // 7. COMMAND SADUR BERITA DARI URL (/sadur, /rewrite, atau tempel link langsung)
    const matchSadur = rawText.match(/^\/(?:sadur|rewrite|url)(?:@\w+)?\s*(https?:\/\/[^\s]+)/i);
    const matchDirectUrl = rawText.match(/^(https?:\/\/[^\s]+)$/i);

    if (matchSadur || matchDirectUrl) {
      const targetUrl = (matchSadur ? matchSadur[1] : matchDirectUrl ? matchDirectUrl[1] : '').trim();
      if (targetUrl) {
        await runSadurArticleGeneration({
          chatId,
          targetUrl,
          siteUrl,
        });
        return NextResponse.json({ ok: true });
      }
    }

    if (rawText === '/sadur' || rawText === '/rewrite') {
      const sadurHelp = `🔗 <b>PANDUAN SADUR BERITA DARI LINK</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Fitur ini membaca berita dari URL media luar, mengekstrak fakta penting, dan menyusun ulang naskah orisinal berbobot.

┌── 📌 <b>Cara Penggunaan</b>
│ Ketik <code>/sadur [link_url]</code> atau cukup tempelkan link URL langsung ke chat.
└──

💡 <b>Contoh:</b>
<code>/sadur https://www.theverge.com/2026/openai-model-release</code>`;

      await sendTelegramMessage(chatId, sadurHelp, {
        inlineKeyboard: [
          [{ text: '✍️ Mulai Buat Berita', callback_data: 'btn:menu' }],
          [
            { text: '🏠 Menu Utama', callback_data: 'btn:start' },
            { text: '❌ Tutup Layar', callback_data: 'btn:close' },
          ],
        ],
      });
      return NextResponse.json({ ok: true });
    }

    // 8. COMMAND SHORTCUTS UMUM (/tulis, /draft, /panjang, /ringkas, /opini, /groq, /9router, /gemini)
    const matchTulis = rawText.match(/^\/tulis(@\w+)?\s*([\s\S]*)$/i);
    const matchDraft = rawText.match(/^\/draft(@\w+)?\s*([\s\S]*)$/i);
    const matchPanjang = rawText.match(/^\/panjang(@\w+)?\s*([\s\S]*)$/i);
    const matchDraftPanjang = rawText.match(/^\/draft-panjang(@\w+)?\s*([\s\S]*)$/i);
    const matchRingkas = rawText.match(/^\/ringkas(@\w+)?\s*([\s\S]*)$/i);
    const matchDraftRingkas = rawText.match(/^\/draft-ringkas(@\w+)?\s*([\s\S]*)$/i);
    const matchOpini = rawText.match(/^\/(?:opini|cepat)(?:@\w+)?\s*([\s\S]*)$/i);
    const matchDraftOpini = rawText.match(/^\/draft-opini(@\w+)?\s*([\s\S]*)$/i);
    const matchGroq = rawText.match(/^\/groq(?:-draft)?(@\w+)?\s*([\s\S]*)$/i);
    const match9Router = rawText.match(/^\/(?:9router|router)(?:-draft)?(@\w+)?\s*([\s\S]*)$/i);
    const matchGemini = rawText.match(/^\/gemini(?:-draft)?(@\w+)?\s*([\s\S]*)$/i);

    if (
      matchTulis ||
      matchDraft ||
      matchPanjang ||
      matchDraftPanjang ||
      matchRingkas ||
      matchDraftRingkas ||
      matchOpini ||
      matchDraftOpini ||
      matchGroq ||
      match9Router ||
      matchGemini
    ) {
      let topic = '';
      let length: 'ringkas' | 'standar' | 'mendalam' = 'standar';
      let provider: 'gemini' | 'groq' | '9router' = 'gemini';
      let enableWebSearch = true;
      let isPublish = true;

      if (matchGroq) {
        topic = matchGroq[2]?.trim() || '';
        length = 'standar';
        provider = 'groq';
        enableWebSearch = true;
        isPublish = !rawText.toLowerCase().includes('draft');
      } else if (match9Router) {
        topic = match9Router[2]?.trim() || '';
        length = 'standar';
        provider = '9router';
        enableWebSearch = true;
        isPublish = !rawText.toLowerCase().includes('draft');
      } else if (matchGemini) {
        topic = matchGemini[2]?.trim() || '';
        length = 'standar';
        provider = 'gemini';
        enableWebSearch = true;
        isPublish = !rawText.toLowerCase().includes('draft');
      } else if (matchTulis) {
        topic = matchTulis[2]?.trim() || '';
        length = 'standar';
        provider = 'gemini';
        enableWebSearch = true;
        isPublish = true;
      } else if (matchDraft) {
        topic = matchDraft[2]?.trim() || '';
        length = 'standar';
        provider = 'gemini';
        enableWebSearch = true;
        isPublish = false;
      } else if (matchPanjang) {
        topic = matchPanjang[2]?.trim() || '';
        length = 'mendalam';
        provider = 'gemini';
        enableWebSearch = true;
        isPublish = true;
      } else if (matchDraftPanjang) {
        topic = matchDraftPanjang[2]?.trim() || '';
        length = 'mendalam';
        provider = 'gemini';
        enableWebSearch = true;
        isPublish = false;
      } else if (matchRingkas) {
        topic = matchRingkas[2]?.trim() || '';
        length = 'ringkas';
        provider = 'gemini';
        enableWebSearch = true;
        isPublish = true;
      } else if (matchDraftRingkas) {
        topic = matchDraftRingkas[2]?.trim() || '';
        length = 'ringkas';
        provider = 'gemini';
        enableWebSearch = true;
        isPublish = false;
      } else if (matchOpini) {
        topic = matchOpini[1]?.trim() || '';
        length = 'standar';
        provider = 'gemini';
        enableWebSearch = false;
        isPublish = true;
      } else if (matchDraftOpini) {
        topic = matchDraftOpini[1]?.trim() || '';
        length = 'standar';
        provider = 'gemini';
        enableWebSearch = false;
        isPublish = false;
      }

      if (!topic) {
        await sendTelegramMessage(
          chatId,
          `⚠️ <b>Topik Berita Belum Ditulis!</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nSilakan sertakan topik liputan setelah perintah.\n\n💡 <b>Contoh:</b>\n<code>${rawText} Peluncuran Chipset AI Generasi Terbaru</code>`,
          {
            inlineKeyboard: [
              [{ text: '✍️ Buka Menu Bertahap', callback_data: 'btn:menu' }],
              [
                { text: '🏠 Menu Utama', callback_data: 'btn:start' },
                { text: '❌ Tutup Layar', callback_data: 'btn:close' },
              ],
            ],
          }
        );
        return NextResponse.json({ ok: true });
      }

      await runArticleGeneration({
        chatId,
        topic,
        length,
        provider,
        enableWebSearch,
        isPublish,
        siteUrl,
      });

      return NextResponse.json({ ok: true });
    }

    // 9. COMMAND: /help, /bantuan
    if (rawText === '/help' || rawText === '/bantuan') {
      const helpText = `❓ <b>PANDUAN LENGKAP NARATIF BOT</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Pusat kendali otomatisasi berita AI Naratif

┌── ✍️ <b>Pembuatan Berita Bertahap</b>
│ • <code>/menu</code> — Wizard interaktif 5 langkah
│ • <code>/start</code> — Dasbor utama & ringkasan portal
└──

┌── ⚡ <b>Perintah Kilat (Satu Baris)</b>
│ • <code>/tulis [topik]</code> — Terbit langsung + Google News
│ • <code>/regional [daerah] : [topik]</code> — Berita daerah
│ • <code>/draft [topik]</code> — Simpan sebagai draf review
│ • <code>/panjang [topik]</code> — Artikel mendalam (~1200 kata)
│ • <code>/ringkas [topik]</code> — Format ringkas (~400 kata)
│ • <code>/opini [topik]</code> — Analisis opini murni AI
└──

┌── 🔗 <b>Sadur Berita & Perbaikan</b>
│ • <code>/sadur [url]</code> — Sadur berita dari URL eksternal
│ • <code>/revisi [id] [instruksi]</code> — Edit artikel yang terbit
└──

┌── 🧹 <b>Alat & Sistem</b>
│ • <code>/autopilot</code> — Jadwal & hitung mundur autopublish
│ • <code>/jadwal</code> — Alias cek slot penerbitan AI
│ • <code>/stats</code> — Cek statistik artikel & status server
│ • <code>/clear</code> — Bersihkan riwayat chat bot
└──`;

      await sendTelegramMessage(chatId, helpText, {
        inlineKeyboard: [
          [{ text: '✍️ Mulai Buat Berita', callback_data: 'btn:menu' }],
          [
            { text: '📊 Cek Statistik', callback_data: 'btn:stats' },
            { text: '🏠 Menu Utama', callback_data: 'btn:start' },
          ],
        ],
      });
      return NextResponse.json({ ok: true });
    }

    // 10. PESAN TEKS BIASA (Bukan perintah '/')
    const helpPromptText = `Halo <b>${firstName}</b>! Apakah Anda ingin menyusun berita?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Pilih salah satu metode kerja yang Anda inginkan:

┌── ⚡ <b>Pilihan Jalur Cepat</b>
│ • <code>/tulis ${rawText}</code> <i>(Terbit Langsung + Riset)</i>
│ • <code>/regional Kalimantan Timur : ${rawText}</code>
│ • <code>/draft ${rawText}</code> <i>(Simpan Draf Review)</i>
│ • <code>/opini ${rawText}</code> <i>(Murni Analisis AI)</i>
└──`;

    await sendTelegramMessage(chatId, helpPromptText, {
      inlineKeyboard: [
        [
          { text: '✍️ Mulai Buat Berita', callback_data: 'btn:menu' },
          { text: '🏛️ Berita Regional', callback_data: 'cat:Regional' },
        ],
        [
          { text: '📊 Cek Statistik', callback_data: 'btn:stats' },
          { text: '🏠 Menu Utama', callback_data: 'btn:start' },
        ],
        [{ text: '❌ Tutup Layar', callback_data: 'btn:close' }],
      ],
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Telegram Webhook error:', error);
    return NextResponse.json({ ok: true, error: error.message });
  }
}
