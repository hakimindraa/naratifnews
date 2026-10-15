import { NextRequest, NextResponse } from 'next/server';
import {
  sendTelegramMessage,
  editTelegramMessage,
  deleteTelegramMessage,
  answerCallbackQuery,
  setTelegramCommands,
  SendMessageOptions,
} from '@/lib/telegram';
import { requestArticleFromModelRouter, requestSadurArticleFromSource } from '@/lib/ai-generator';
import { scrapeArticleFromUrl } from '@/lib/url-scraper';
import { findSimilarArticles, checkSourceUrlHistory } from '@/lib/duplicate-detector';
import { db } from '@/db';
import { articles, aiGenerationLogs } from '@/db/schema';
import { revalidatePath } from 'next/cache';
import { eq, desc } from 'drizzle-orm';
import { BOT_COMMANDS } from '../setup/route';

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
  'Jawa Barat',
  'DKI Jakarta',
  'Jawa Tengah',
  'Jawa Timur',
  'Banten',
  'Bali',
  'Sumatera Utara',
  'Sumatera Barat',
  'Kalimantan Timur',
  'Sulawesi Selatan',
  'Papua',
  'Umum',
];

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
}: ArticleRunParams) {
  const isRegional = category?.toLowerCase() === 'regional';
  const cleanRegion = (region && region !== '-' && region !== 'Umum') ? region : '';

  const lengthLabel =
    length === 'ringkas' ? 'Ringkas (~400 kata)' : length === 'mendalam' ? 'Mendalam (~1200 kata)' : 'Standar (~700 kata)';
  const statusLabel = isPublish ? '🚀 Terbit Langsung (Published)' : '📝 Simpan Draf (Draft)';
  const researchLabel = enableWebSearch
    ? (isRegional ? `🌐 Berita Daerah ${cleanRegion || 'Lokal'} (100% ID)` : '🌐 Faktual Google News (Lokal & Global)')
    : '⚡ Nonaktif (Murni Analisis AI)';
  const providerLabel =
    provider === 'groq'
      ? '🚀 Groq Cloud (GPT-OSS 120B)'
      : provider === '9router'
      ? '🌐 9Router Gateway (Custom)'
      : '⚡ Google Gemini 3.8 Flash';

  // Kirim feedback awal ke Telegram
  await sendTelegramMessage(
    chatId,
    `⏳ <b>Memulai Liputan AI...</b>\n\nSedang ${
      enableWebSearch ? (isRegional ? `melacak berita daerah ${cleanRegion || 'lokal'} serta ` : 'melacak fakta Google News serta ') : ''
    }meracik naskah jurnalistik untuk topik:\n<i>"${topic}"</i>\n\n🎯 Target: <b>${statusLabel}</b>\n📂 Kategori: <b>${category || 'AI'}${cleanRegion ? ` (${cleanRegion})` : ''}</b>\n🤖 AI Engine: <b>${providerLabel}</b>\n📏 Panjang: <b>${lengthLabel}</b>\n🔍 Riset: <b>${researchLabel}</b>\n\n<i>Mohon tunggu sekitar ${
      provider === 'groq' ? '5–10' : enableWebSearch ? '15–30' : '10–20'
    } detik...</i>`
  );

  const startTime = performance.now();

  try {
    const draftArticle = await requestArticleFromModelRouter({
      prompt: topic,
      category,
      region: isRegional ? (cleanRegion || 'Umum') : undefined,
      length,
      provider: provider || 'gemini',
      enableWebSearch,
    });

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
        ? `\n⚠️ <i>Catatan Kemiripan: Mirip ~${Math.round(
            similarityInfo.highestScore * 100
          )}% dengan arsip: "${similarityInfo.matchedArticle.title}"</i>\n`
        : '';

    // Revalidasi cache web
    revalidatePath('/', 'layout');

    const articleUrl = `${siteUrl}/berita-teknologi/${newArticle.category.toLowerCase()}/${newArticle.id}/${newArticle.slug}`;
    const editUrl = `${siteUrl}/admin/edit/${newArticle.id}`;

    if (isPublish) {
      const successText = `🎉 <b>BERITA BERHASIL TERBIT!</b>
━━━━━━━━━━━━━━━━━━━━
📰 <b>${newArticle.title}</b>
📂 Kategori: <b>${newArticle.category}${cleanRegion ? ` (${cleanRegion})` : ''}</b>
🏷️ Tags: <i>${(newArticle.tags || []).map((t: string) => '#' + t).join(' ')}</i>
🌐 Riset Berita: <b>${enableWebSearch ? (isRegional ? 'Google News Lokal' : 'Google News Aktif') : 'Murni AI'}</b>
⏱️ Waktu Proses: <b>${(durationMs / 1000).toFixed(1)}s</b>${similarityNote}
━━━━━━━━━━━━━━━━━━━━
Artikel sudah langsung tayang di portal Naratif! Anda bisa menambahkan foto sampul lewat editor web di bawah.`;

      await sendTelegramMessage(chatId, successText, {
        inlineKeyboard: [
          [{ text: '✏️ Tambah Sampul & Edit di Web', url: editUrl }],
          [{ text: '📖 Baca di Website', url: articleUrl }],
        ],
      });
    } else {
      const draftSuccessText = `📝 <b>BERITA BERHASIL DISIMPAN KE DRAF!</b>
━━━━━━━━━━━━━━━━━━━━
📰 <b>${newArticle.title}</b>
📂 Kategori: <b>${newArticle.category}${cleanRegion ? ` (${cleanRegion})` : ''}</b>
🌐 Riset Berita: <b>${enableWebSearch ? (isRegional ? 'Google News Lokal' : 'Google News Aktif') : 'Murni AI'}</b>
⏱️ Waktu Proses: <b>${(durationMs / 1000).toFixed(1)}s</b>${similarityNote}
━━━━━━━━━━━━━━━━━━━━
Artikel siap ditinjau di Dasbor Redaksi sebelum diterbitkan. Silakan tambahkan foto sampul lewat tombol di bawah.`;

      await sendTelegramMessage(chatId, draftSuccessText, {
        inlineKeyboard: [
          [{ text: '✏️ Tambah Sampul & Edit di Web', url: editUrl }],
          [{ text: '⚙️ Dasbor Redaksi', url: `${siteUrl}/admin` }],
        ],
      });
    }
  } catch (err: any) {
    console.error('Telegram generation error:', err);
    await sendTelegramMessage(
      chatId,
      `❌ <b>Gagal Menyusun Berita</b>\n\nTerjadi kesalahan saat memproses AI:\n<code>${
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
  try {
    const [existing] = await db.select().from(articles).where(eq(articles.id, articleId)).limit(1);
    if (!existing) {
      await sendTelegramMessage(
        chatId,
        `❌ <b>Artikel Tidak Ditemukan</b>\n\nArtikel dengan ID <code>#${articleId}</code> tidak ditemukan di database Neon DB.`
      );
      return;
    }

    await sendTelegramMessage(
      chatId,
      `⏳ <b>Sedang Merevisi Artikel #${existing.id}...</b>\n\n📰 Judul: <b>${existing.title}</b>\n📂 Kategori: <b>${existing.category}</b>\n✍️ Instruksi: <i>"${instruction}"</i>\n\n<i>AI sedang membaca naskah lama dan menyusun perbaikan...</i>`
    );

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
━━━━━━━━━━━━━━━━━━━━
📰 <b>${updated.title}</b>
📂 Kategori: <b>${updated.category}</b>
📝 <b>Rangkuman Perubahan:</b>
<i>${revisedData.changelog || 'Naskah berita telah diperbarui sesuai instruksi Anda.'}</i>
⏱️ Waktu Proses: <b>${(durationMs / 1000).toFixed(1)}s</b>
━━━━━━━━━━━━━━━━━━━━
<i>Perubahan sudah langsung tayang di portal Naratif.</i>`;

    await sendTelegramMessage(chatId, successText, {
      inlineKeyboard: [
        [{ text: '📖 Baca Hasil di Website', url: articleUrl }],
        [{ text: '✏️ Buka di Editor Web', url: editUrl }],
      ],
    });
  } catch (err: any) {
    console.error('Error during article revision via Telegram:', err);
    await sendTelegramMessage(
      chatId,
      `❌ <b>Gagal Merevisi Artikel</b>\n\nKendala: <code>${err?.message || 'Error tidak dikenal'}</code>`
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
  try {
    await sendTelegramMessage(
      chatId,
      `🔍 <b>Membaca Berita Sumber...</b>\n\nSedang mengekstrak teks berita dari:\n<code>${targetUrl}</code>\n\n<i>Mohon tunggu sebentar...</i>`
    );

    const [sourceData, urlHistory] = await Promise.all([
      scrapeArticleFromUrl(targetUrl),
      checkSourceUrlHistory(targetUrl),
    ]);

    const historyNotice = urlHistory.isAlreadyScraped
      ? `\n\n⚠️ <i>Perhatian: Link ini tercatat pernah disadur sebelumnya ("${urlHistory.matchedTitle}"). Sistem tetap memproses saduran baru dengan sudut pandang segar...</i>`
      : '';

    await sendTelegramMessage(
      chatId,
      `✨ <b>Sumber Ditemukan!</b>\n\n📰 <b>${sourceData.title}</b>\n🌐 Media: <b>${sourceData.domain}</b> (~${sourceData.wordCount} kata)${historyNotice}\n\n<i>Sedang meracik ulang menjadi naskah orisinal Naratif dalam Bahasa Indonesia via Groq Cloud...</i>`
    );

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
        ? `\n⚠️ <i>Catatan Kemiripan: Mirip ~${Math.round(
            similarityInfo.highestScore * 100
          )}% dengan arsip: "${similarityInfo.matchedArticle.title}"</i>\n`
        : '';

    revalidatePath('/', 'layout');
    revalidatePath('/admin');
    revalidatePath('/admin/sadur');

    const articleUrl = `${siteUrl}/berita-teknologi/${newArticle.category.toLowerCase()}/${newArticle.id}/${newArticle.slug}`;
    const editUrl = `${siteUrl}/admin/edit/${newArticle.id}`;

    const successMessage = `✅ <b>BERITA BERHASIL DISADUR!</b>
━━━━━━━━━━━━━━━━━━━━
📰 <b>${newArticle.title}</b>
📂 Kategori: <b>${newArticle.category}</b>
🌐 Sumber: <b>${sourceData.domain}</b>
⏱️ Waktu: <b>${(durationMs / 1000).toFixed(1)}s</b>
🚀 Status: <b>Langsung Terbit (Published)</b>${similarityNote}
━━━━━━━━━━━━━━━━━━━━
<i>Artikel orisinal telah tayang di portal Naratif dengan atribusi etis.</i>`;

    await sendTelegramMessage(chatId, successMessage, {
      inlineKeyboard: [
        [
          { text: '🌐 Baca di Web', url: articleUrl },
          { text: '✏️ Edit di Admin', url: editUrl },
        ],
      ],
    });
  } catch (err: any) {
    console.error('Error saat menyadur berita via Telegram:', err);
    await sendTelegramMessage(
      chatId,
      `❌ <b>Gagal Menyadur Berita</b>\n\nKendala: <code>${err.message || 'Gagal membaca URL'}</code>\n\nPastikan link dapat diakses publik.`
    );
  }
}

// Tampilan Boxed Layout Sambutan (/start) seperti format screenshot yang diinginkan user
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

  const welcomeText = `✨━━━━━━━━━━━━━━━━━━━━✨
Halo <b>${firstName}</b> 👋
Selamat datang di <b>Naratif Redaksi Bot</b>
✨━━━━━━━━━━━━━━━━━━━━✨

┌── 👤 <b>Profil Editor</b>
│ 📛 ${firstName}
│ 🆔 <code>${userId}</code>
│ 🏷️ Role: Redaksi Naratif
└──

┌── 🤖 <b>Status Portal Naratif</b>
│ 📁 Total Artikel : <b>${total} artikel</b>
│ ✅ Sudah Terbit  : <b>${published}</b>
│ 📝 Draf Review   : <b>${draft}</b>
└──

Gunakan tombol <b>[Menu]</b> di kiri bawah atau pilih aksi cepat:`;

  const inlineKeyboard = [
    [{ text: '✍️ Mulai Buat Berita', callback_data: 'btn:menu' }],
    [
      { text: '🏛️ Liputan Regional', callback_data: 'cat:Regional' },
      { text: '🔗 Sadur Berita', callback_data: 'btn:sadur_help' },
    ],
    [
      { text: '✏️ Panduan Revisi', callback_data: 'btn:revisi_help' },
      { text: '📊 Cek Statistik', callback_data: 'btn:stats' },
    ],
    [
      { text: '🌐 Kunjungi Website', url: siteUrl },
      { text: '⚙️ Dasbor Admin', url: `${siteUrl}/admin` },
    ],
    [{ text: '❌ Tutup / Hapus Menu', callback_data: 'btn:close' }],
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

  const statsText = `📊 <b>STATISTIK REDAKSI NARATIF</b>
━━━━━━━━━━━━━━━━━━━━
📁 Total Arsip: <b>${total} artikel</b>
✅ Sudah Terbit: <b>${published}</b>
⏳ Menunggu Tayang: <b>${scheduled}</b>
📝 Draf Siap Review: <b>${draft}</b>
━━━━━━━━━━━━━━━━━━━━
🌐 <a href="${siteUrl}/admin">Buka Dasbor Redaksi Lengkap</a>`;

  await updateOrSendMessage(chatId, messageId, statsText, {
    inlineKeyboard: [
      [{ text: '✍️ Buat Berita Baru', callback_data: 'btn:menu' }],
      [
        { text: '🏠 Menu Utama', callback_data: 'btn:start' },
        { text: '❌ Tutup', callback_data: 'btn:close' },
      ],
    ],
  });
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
━━━━━━━━━━━━━━━━━━━━
Untuk menyadur berita dari media luar (The Verge, Reuters, Kompas, dsb.):

Cukup kirimkan link beritanya langsung ke chat bot ini, atau ketik:
<code>/sadur [link_url]</code>

💡 <i>Contoh:</i>
<code>/sadur https://www.theverge.com/2026/openai-model-release</code>

AI akan membaca isi artikel, mengekstrak fakta penting, dan menulis ulang naskah orisinal dalam Bahasa Indonesia.`;

        await updateOrSendMessage(chatId, messageId, text, {
          inlineKeyboard: [
            [{ text: '🏠 Menu Utama', callback_data: 'btn:start' }],
            [{ text: '❌ Tutup', callback_data: 'btn:close' }],
          ],
        });
        return NextResponse.json({ ok: true });
      }

      // Panduan Revisi Artikel
      if (data === 'btn:revisi_help') {
        const text = `✏️ <b>PANDUAN REVISI / EDIT ARTIKEL</b>
━━━━━━━━━━━━━━━━━━━━
Anda bisa merevisi artikel yang sudah ada di database melalui perintah:

<code>/revisi [ID_ARTIKEL] [instruksi perbaikan]</code>

💡 <i>Contoh:</i>
<code>/revisi 42 perbaiki kalimat pembuka dan tambahkan kutipan narasumber dinas terkait</code>

AI akan membaca naskah lama di database, menyempurnakan bagian yang diminta, dan langsung mengupdate artikel di website!`;

        await updateOrSendMessage(chatId, messageId, text, {
          inlineKeyboard: [
            [{ text: '🏠 Menu Utama', callback_data: 'btn:start' }],
            [{ text: '❌ Tutup', callback_data: 'btn:close' }],
          ],
        });
        return NextResponse.json({ ok: true });
      }

      // Tombol Menu / Buat Berita (Langkah 1: Kategori)
      if (data === 'btn:menu') {
        const step1Text = `📝 <b>LANGKAH 1 DARI 5: PILIH KATEGORI BERITA</b>
━━━━━━━━━━━━━━━━━━━━
Pilih salah satu kategori liputan cepat di bawah ini (atau ketik topik sendiri):`;

        await updateOrSendMessage(chatId, messageId, step1Text, {
          inlineKeyboard: [
            [{ text: '🤖 Tren & Inovasi AI Terkini', callback_data: 'cat:AI' }],
            [{ text: '💻 Ekosistem & Tren Software', callback_data: 'cat:Software' }],
            [{ text: '⚙️ Dinamika Semikonduktor & Hardware', callback_data: 'cat:Hardware' }],
            [{ text: '☁️ Infrastruktur Cloud & Keamanan', callback_data: 'cat:Infrastruktur' }],
            [{ text: '📱 Inovasi Gadget & Konsumen', callback_data: 'cat:Gadget' }],
            [{ text: '🏛️ Berita Regional & Daerah', callback_data: 'cat:Regional' }],
            [{ text: '✍️ Ketik Topik Sendiri...', callback_data: 'cat:CUSTOM' }],
            [
              { text: '🏠 Menu Utama', callback_data: 'btn:start' },
              { text: '❌ Tutup', callback_data: 'btn:close' },
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

      // Langkah 1: Kategori Terpilih
      if (data.startsWith('cat:')) {
        const category = data.slice('cat:'.length);

        if (category === 'CUSTOM') {
          const customPrompt = `✍️ <b>Ketik Topik Berita Anda Sendiri:</b>
━━━━━━━━━━━━━━━━━━━━
Silakan kirim chat dengan salah satu perintah:

👉 <code>/tulis [topik berita]</code> <i>(Terbit Langsung, Riset Aktif)</i>
👉 <code>/regional [daerah] [topik]</code> <i>(Berita Khusus Daerah)</i>
👉 <code>/draft [topik berita]</code> <i>(Simpan Draf, Riset Aktif)</i>
👉 <code>/panjang [topik berita]</code> <i>(Artikel Mendalam ~1200 kata)</i>
👉 <code>/ringkas [topik berita]</code> <i>(Ringkas ~400 kata)</i>
👉 <code>/opini [topik berita]</code> <i>(Murni Analisis AI)</i>

💡 <i>Contoh:</i>
<code>/tulis Inovasi Chipset 2nm TSMC dan Dampaknya bagi Industri AI</code>`;

          await updateOrSendMessage(chatId, messageId, customPrompt, {
            inlineKeyboard: [
              [{ text: '⬅️ Kembali ke Kategori', callback_data: 'btn:menu' }],
              [{ text: '❌ Tutup', callback_data: 'btn:close' }],
            ],
          });
          return NextResponse.json({ ok: true });
        }

        // FITUR A: JIKA KATEGORI REGIONAL -> MASUK KE LANGKAH 1B (PILIH WILAYAH)
        if (category === 'Regional') {
          const stepRegionText = `🏛️ <b>PILIH WILAYAH / DAERAH LIPUTAN:</b>
━━━━━━━━━━━━━━━━━━━━
Pilih provinsi / wilayah liputan agar pencarian Google News 100% fokus pada media daerah setempat:`;

          const provinceButtons = [];
          for (let i = 0; i < REGIONAL_PROVINCES.length; i += 2) {
            const row = [
              { text: `📍 ${REGIONAL_PROVINCES[i]}`, callback_data: `reg:${REGIONAL_PROVINCES[i]}` },
            ];
            if (REGIONAL_PROVINCES[i + 1]) {
              row.push({ text: `📍 ${REGIONAL_PROVINCES[i + 1]}`, callback_data: `reg:${REGIONAL_PROVINCES[i + 1]}` });
            }
            provinceButtons.push(row);
          }

          provinceButtons.push([
            { text: '⬅️ Kembali ke Kategori', callback_data: 'btn:menu' },
            { text: '🏠 Menu Utama', callback_data: 'btn:start' },
          ]);

          await updateOrSendMessage(chatId, messageId, stepRegionText, {
            inlineKeyboard: provinceButtons,
          });
          return NextResponse.json({ ok: true });
        }

        // Untuk kategori teknologi selain regional: Lanjut ke Langkah 2 (Riset)
        const preset = PRESET_TOPICS[category] || { label: category, prompt: category };
        const step2Text = `🌐 <b>LANGKAH 2 DARI 5: RISET GOOGLE NEWS</b>
━━━━━━━━━━━━━━━━━━━━
Kategori: <b>${preset.label}</b>

Apakah Anda ingin AI melacak fakta berita terkini hari ini dari Google News?`;

        await updateOrSendMessage(chatId, messageId, step2Text, {
          inlineKeyboard: [
            [{ text: '🌐 Riset Google News: AKTIF (Faktual)', callback_data: `rs:1:${category}:-` }],
            [{ text: '⚡ Riset Google News: NONAKTIF (Murni AI)', callback_data: `rs:0:${category}:-` }],
            [
              { text: '⬅️ Kembali ke Kategori', callback_data: 'btn:menu' },
              { text: '🏠 Menu Utama', callback_data: 'btn:start' },
            ],
          ],
        });
        return NextResponse.json({ ok: true });
      }

      // Langkah 1b: Wilayah Regional Terpilih -> Pindah ke Langkah 2 (Riset)
      if (data.startsWith('reg:')) {
        const region = data.slice('reg:'.length);
        const step2Text = `🌐 <b>LANGKAH 2 DARI 5: RISET BERITA DAERAH</b>
━━━━━━━━━━━━━━━━━━━━
Kategori: <b>Regional</b>
Wilayah: <b>📍 ${region}</b>

Aktifkan riset Google News lokal untuk melacak isu Pemda & peristiwa warga di wilayah <b>${region}</b> dalam 24 jam terakhir?`;

        await updateOrSendMessage(chatId, messageId, step2Text, {
          inlineKeyboard: [
            [{ text: `🌐 Riset Google News ${region}: AKTIF`, callback_data: `rs:1:Regional:${region}` }],
            [{ text: '⚡ Riset Google News: NONAKTIF (Murni AI)', callback_data: `rs:0:Regional:${region}` }],
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
        const researchLabel = isResearch === '1' ? 'Aktif (Faktual Real-time)' : 'Nonaktif (Murni AI)';

        const step3Text = `📏 <b>LANGKAH 3 DARI 5: PANJANG ARTIKEL</b>
━━━━━━━━━━━━━━━━━━━━
Kategori: <b>${preset.label}${cleanRegion ? ` (${cleanRegion})` : ''}</b>
Riset Google News: <b>${researchLabel}</b>

Pilih target panjang naskah artikel berita:`;

        await updateOrSendMessage(chatId, messageId, step3Text, {
          inlineKeyboard: [
            [{ text: '📄 Ringkas (~400 kata)', callback_data: `len:ringkas:${isResearch}:${category}:${region || '-'}` }],
            [{ text: '📰 Standar (~700 kata)', callback_data: `len:standar:${isResearch}:${category}:${region || '-'}` }],
            [{ text: '📚 Mendalam (~1200 kata)', callback_data: `len:mendalam:${isResearch}:${category}:${region || '-'}` }],
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
━━━━━━━━━━━━━━━━━━━━
Kategori: <b>${preset.label}${cleanRegion ? ` (${cleanRegion})` : ''}</b>
Riset: <b>${researchLabel}</b>
Panjang: <b>${lengthLabel}</b>

Pilih model kecerdasan buatan untuk meracik berita:`;

        await updateOrSendMessage(chatId, messageId, step4Text, {
          inlineKeyboard: [
            [{ text: '⚡ Google Gemini 3.8 Flash (Rekomendasi)', callback_data: `eng:gemini:${length}:${isResearch}:${category}:${region || '-'}` }],
            [{ text: '🚀 Groq Cloud (Super Cepat ~5s)', callback_data: `eng:groq:${length}:${isResearch}:${category}:${region || '-'}` }],
            [{ text: '🌐 9Router Gateway (DeepSeek/Custom)', callback_data: `eng:9router:${length}:${isResearch}:${category}:${region || '-'}` }],
            [
              { text: '⬅️ Kembali ke Panjang', callback_data: `rs:${isResearch}:${category}:${region || '-'}` },
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
        const researchLabel = isResearch === '1' ? 'Aktif' : 'Nonaktif';
        const lengthLabel =
          length === 'ringkas' ? 'Ringkas (~400 kata)' : length === 'mendalam' ? 'Mendalam (~1200 kata)' : 'Standar (~700 kata)';
        const providerLabel =
          provider === 'groq'
            ? '🚀 Groq Cloud'
            : provider === '9router'
            ? '🌐 9Router Gateway'
            : '⚡ Google Gemini';

        const step5Text = `🎯 <b>LANGKAH 5 DARI 5: STATUS PUBLIKASI</b>
━━━━━━━━━━━━━━━━━━━━
Kategori: <b>${preset.label}${cleanRegion ? ` (${cleanRegion})` : ''}</b>
AI Engine: <b>${providerLabel}</b>
Riset: <b>${researchLabel}</b>
Panjang: <b>${lengthLabel}</b>

Pilih tindakan akhir publikasi artikel ke website:`;

        await updateOrSendMessage(chatId, messageId, step5Text, {
          inlineKeyboard: [
            [{ text: '🚀 Langsung Terbitkan ke Web', callback_data: `gen:pub:${provider}:${length}:${isResearch}:${category}:${region || '-'}` }],
            [{ text: '📝 Simpan Sebagai Draf (Review)', callback_data: `gen:drf:${provider}:${length}:${isResearch}:${category}:${region || '-'}` }],
            [
              { text: '⬅️ Kembali ke AI Engine', callback_data: `len:${length}:${isResearch}:${category}:${region || '-'}` },
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

        // Bersihkan balon wizard agar chat rapi
        if (messageId) {
          await deleteTelegramMessage(chatId, messageId).catch(() => {});
        }

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
        });

        return NextResponse.json({ ok: true });
      }

      return NextResponse.json({ ok: true });
    }

    // ==========================================
    // 2. PENANGANAN PESAN TEKS BIASA / PERINTAH
    // ==========================================
    const message = update?.message;
    if (!message || !message.text) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id;
    const messageId = message.message_id;
    const userId = message.from?.id;
    const firstName = message.from?.first_name || 'Redaksi';
    const rawText = message.text.trim();

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

    // 2. COMMAND BERSIHKAN LAYAR: /clear, /bersihkan
    if (rawText === '/clear' || rawText === '/bersihkan') {
      await deleteTelegramMessage(chatId, messageId).catch(() => {});
      const clearText = `🧹 <b>Layar Chat Dibersihkan</b>\n\nRuang pesan Anda telah dirapikan. Ketik <code>/start</code> atau tekan tombol <b>[Menu]</b> di kiri bawah untuk memulai kembali.`;
      await sendTelegramMessage(chatId, clearText, {
        inlineKeyboard: [
          [{ text: '✍️ Mulai Buat Berita', callback_data: 'btn:menu' }],
          [{ text: '❌ Hapus Pesan Ini', callback_data: 'btn:close' }],
        ],
      });
      return NextResponse.json({ ok: true });
    }

    // 3. COMMAND: /menu, /buat
    if (rawText === '/menu' || rawText === '/buat') {
      const step1Text = `📝 <b>LANGKAH 1 DARI 5: PILIH KATEGORI BERITA</b>
━━━━━━━━━━━━━━━━━━━━
Pilih salah satu kategori liputan cepat di bawah ini (atau ketik topik sendiri):`;

      await sendTelegramMessage(chatId, step1Text, {
        inlineKeyboard: [
          [{ text: '🤖 Tren & Inovasi AI Terkini', callback_data: 'cat:AI' }],
          [{ text: '💻 Ekosistem & Tren Software', callback_data: 'cat:Software' }],
          [{ text: '⚙️ Dinamika Semikonduktor & Hardware', callback_data: 'cat:Hardware' }],
          [{ text: '☁️ Infrastruktur Cloud & Keamanan', callback_data: 'cat:Infrastruktur' }],
          [{ text: '📱 Inovasi Gadget & Konsumen', callback_data: 'cat:Gadget' }],
          [{ text: '🏛️ Berita Regional & Daerah', callback_data: 'cat:Regional' }],
          [{ text: '✍️ Ketik Topik Sendiri...', callback_data: 'cat:CUSTOM' }],
          [
            { text: '🏠 Menu Utama', callback_data: 'btn:start' },
            { text: '❌ Tutup', callback_data: 'btn:close' },
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

    // 5. FITUR B: COMMAND REVISI ARTIKEL (/revisi [id] [instruksi])
    const matchRevisi = rawText.match(/^\/revisi(?:@\w+)?(?:\s+(\d+)\s+([\s\S]+))?$/i);
    if (rawText === '/revisi' || (matchRevisi && !matchRevisi[1])) {
      await sendTelegramMessage(
        chatId,
        `✏️ <b>Format Perintah Revisi Artikel:</b>\n\nKetik: <code>/revisi [ID_ARTIKEL] [instruksi perbaikan]</code>\n\n💡 <i>Contoh:</i>\n<code>/revisi 42 perbaiki paragraf 2 dengan menambahkan data kutipan dinas terkait dan rapikan gaya bahasanya</code>\n\n<i>Tip: ID Artikel bisa dilihat di Dasbor Admin atau di bagian URL berita.</i>`,
        {
          inlineKeyboard: [
            [{ text: '⚙️ Buka Dasbor Admin', url: `${siteUrl}/admin` }],
            [{ text: '❌ Tutup', callback_data: 'btn:close' }],
          ],
        }
      );
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
      await sendTelegramMessage(
        chatId,
        `🏛️ <b>Format Perintah Berita Regional:</b>\n\nKetik: <code>/regional [Wilayah] : [Topik Berita]</code>\nAtau: <code>/regional [Topik Berita]</code>\n\n💡 <i>Contoh:</i>\n<code>/regional Jawa Barat : Kebijakan subsidi transportasi massal dan penataan fasilitas publik pemprov</code>\n\nAtau gunakan menu interaktif di bawah:`,
        {
          inlineKeyboard: [
            [{ text: '🏛️ Pilih dari Menu Wilayah', callback_data: 'cat:Regional' }],
            [{ text: '❌ Tutup', callback_data: 'btn:close' }],
          ],
        }
      );
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
      await sendTelegramMessage(
        chatId,
        `🔗 <b>Format Perintah Sadur Berita:</b>\n\nKetik <code>/sadur [link_url]</code> atau cukup kirimkan link beritanya langsung ke bot ini.\n\n💡 <i>Contoh:</i>\n<code>/sadur https://www.theverge.com/...</code>`,
        {
          inlineKeyboard: [[{ text: '❌ Tutup', callback_data: 'btn:close' }]],
        }
      );
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
          `⚠️ <b>Topik berita belum ditulis!</b>\n\nSilakan sertakan topik setelah perintah.\n\n💡 Contoh:\n<code>${rawText} Peluncuran Chipset AI Generasi Terbaru</code>`,
          {
            inlineKeyboard: [[{ text: '❌ Tutup', callback_data: 'btn:close' }]],
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

    // 9. PESAN TEKS BIASA (Bukan perintah '/')
    const helpPromptText = `Halo <b>${firstName}</b>! Apakah Anda ingin membuat artikel berita?

Silakan pilih metode berikut:
1️⃣ Tekan tombol <b>"✍️ Mulai Buat Berita"</b> di bawah untuk panduan bertahap.
2️⃣ Atau gunakan perintah cepat:
👉 <code>/tulis ${rawText}</code> <i>(Terbit Langsung, Riset Aktif)</i>
👉 <code>/regional Jawa Barat : ${rawText}</code> <i>(Berita Daerah)</i>
👉 <code>/draft ${rawText}</code> <i>(Simpan Draf)</i>
👉 <code>/opini ${rawText}</code> <i>(Murni AI)</i>

Atau tekan tombol <b>[Menu]</b> di kiri bawah chat.`;

    await sendTelegramMessage(chatId, helpPromptText, {
      inlineKeyboard: [
        [{ text: '✍️ Mulai Buat Berita', callback_data: 'btn:menu' }],
        [
          { text: '🏛️ Berita Regional', callback_data: 'cat:Regional' },
          { text: '📊 Cek Statistik', callback_data: 'btn:stats' },
        ],
        [{ text: '❌ Tutup', callback_data: 'btn:close' }],
      ],
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Telegram Webhook error:', error);
    return NextResponse.json({ ok: true, error: error.message });
  }
}
