import { NextRequest, NextResponse } from 'next/server';
import { sendTelegramMessage, answerCallbackQuery } from '@/lib/telegram';
import { requestArticleFromModelRouter, requestSadurArticleFromSource } from '@/lib/ai-generator';
import { scrapeArticleFromUrl } from '@/lib/url-scraper';
import { db } from '@/db';
import { articles, aiGenerationLogs } from '@/db/schema';
import { revalidatePath } from 'next/cache';

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
};

interface ArticleRunParams {
  chatId: number | string;
  topic: string;
  category?: string;
  length: 'ringkas' | 'standar' | 'mendalam';
  provider?: 'gemini' | 'groq' | '9router';
  enableWebSearch: boolean;
  isPublish: boolean;
  siteUrl: string;
}

async function runArticleGeneration({
  chatId,
  topic,
  category,
  length,
  provider = 'gemini',
  enableWebSearch,
  isPublish,
  siteUrl,
}: ArticleRunParams) {
  const lengthLabel =
    length === 'ringkas' ? 'Ringkas (~400 kata)' : length === 'mendalam' ? 'Mendalam (~1200 kata)' : 'Standar (~700 kata)';
  const statusLabel = isPublish ? '🚀 Terbit Langsung (Published)' : '📝 Simpan Draf (Draft)';
  const researchLabel = enableWebSearch ? '🌐 Aktif (Faktual Real-time)' : '⚡ Nonaktif (Murni Analisis AI)';
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
      enableWebSearch ? 'melacak fakta Google News (Lokal & Global) serta ' : ''
    }meracik naskah jurnalistik untuk topik:\n<i>"${topic}"</i>\n\n🎯 Target: <b>${statusLabel}</b>\n🤖 AI Engine: <b>${providerLabel}</b>\n📏 Panjang: <b>${lengthLabel}</b>\n🔍 Riset Google News: <b>${researchLabel}</b>\n\n<i>Mohon tunggu sekitar ${
      provider === 'groq' ? '5–10' : enableWebSearch ? '15–30' : '10–20'
    } detik...</i>`
  );

  const startTime = performance.now();

  try {
    const draftArticle = await requestArticleFromModelRouter({
      prompt: topic,
      category,
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

    // Revalidasi cache web
    revalidatePath('/', 'layout');

    const articleUrl = `${siteUrl}/berita-teknologi/${newArticle.category.toLowerCase()}/${newArticle.id}/${newArticle.slug}`;
    const editUrl = `${siteUrl}/admin/edit/${newArticle.id}`;

    if (isPublish) {
      const successText = `🎉 <b>BERITA BERHASIL TERBIT!</b>
━━━━━━━━━━━━━━━━━━━━
📰 <b>${newArticle.title}</b>
📂 Kategori: <b>${newArticle.category}</b>
🏷️ Tags: <i>${(newArticle.tags || []).map((t: string) => '#' + t).join(' ')}</i>
🌐 Riset Berita: <b>${enableWebSearch ? 'Google News Aktif' : 'Murni AI'}</b>
⏱️ Waktu Proses: <b>${(durationMs / 1000).toFixed(1)}s</b>
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
📂 Kategori: <b>${newArticle.category}</b>
🌐 Riset Berita: <b>${enableWebSearch ? 'Google News Aktif' : 'Murni AI'}</b>
⏱️ Waktu Proses: <b>${(durationMs / 1000).toFixed(1)}s</b>
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

    const sourceData = await scrapeArticleFromUrl(targetUrl);

    await sendTelegramMessage(
      chatId,
      `✨ <b>Sumber Ditemukan!</b>\n\n📰 <b>${sourceData.title}</b>\n🌐 Media: <b>${sourceData.domain}</b> (~${sourceData.wordCount} kata)\n\n<i>Sedang meracik ulang menjadi naskah orisinal Naratif dalam Bahasa Indonesia via Groq Cloud...</i>`
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
🚀 Status: <b>Langsung Terbit (Published)</b>
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

async function sendWelcomeMessage(chatId: number | string, firstName: string, userId: number | string, siteUrl: string) {
  const welcomeText = `🤖 <b>Selamat Datang di Naratif Redaksi Bot!</b>

Halo, <b>${firstName}</b>! Saya adalah asisten AI resmi redaksi portal media teknologi <b>Naratif</b> (<a href="${siteUrl}">naratif.web.id</a>).

Gunakan menu interaktif di bawah atau ketik perintah cepat:

📋 <b>PANDUAN PEMBUATAN BERITA:</b>
1️⃣ <b>Menu Bertahap:</b> Klik tombol <b>"✍️ Mulai Buat Berita"</b> di bawah untuk memilih topik, riset, panjang artikel, AI Engine (Gemini / Groq / 9Router), dan status publikasi.
2️⃣ <b>Perintah Cepat:</b>
   • <code>/sadur [url]</code> ➔ Sadur berita dari link media luar (atau cukup kirim link)
   • <code>/tulis [topik]</code> ➔ Gemini (Riset Aktif, Terbit)
   • <code>/groq [topik]</code> ➔ Groq Cloud Super Cepat (~5s)
   • <code>/9router [topik]</code> ➔ 9Router Gateway (Model Custom)
   • <code>/draft [topik]</code> ➔ Gemini Simpan Draf (~700 kata)
   • <code>/panjang [topik]</code> ➔ Artikel mendalam (~1200 kata)
   • <code>/ringkas [topik]</code> ➔ Artikel kilat (~400 kata)
   • <code>/opini [topik]</code> ➔ Murni Analisis AI (Riset Nonaktif)
━━━━━━━━━━━━━━━━━━━━
👤 <b>ID Telegram Anda:</b> <code>${userId}</code> <i>(Aman)</i>`;

  await sendTelegramMessage(chatId, welcomeText, {
    inlineKeyboard: [
      [{ text: '✍️ Mulai Buat Berita', callback_data: 'btn:menu' }],
      [{ text: '📊 Cek Statistik Web', callback_data: 'btn:stats' }],
      [
        { text: '🌐 Kunjungi Website', url: siteUrl },
        { text: '⚙️ Dasbor Admin', url: `${siteUrl}/admin` },
      ],
    ],
  });
}

async function sendStatsMessage(chatId: number | string, siteUrl: string) {
  const allArticles = await db.select({ status: articles.status }).from(articles);
  const total = allArticles.length;
  const published = allArticles.filter((a) => a.status === 'published').length;
  const scheduled = allArticles.filter((a) => a.status === 'scheduled').length;
  const draft = allArticles.filter((a) => a.status === 'draft').length;

  const statsText = `📊 <b>STATISTIK REDAKSI NARATIF TEKNO</b>
━━━━━━━━━━━━━━━━━━━━
📁 Total Arsip: <b>${total} artikel</b>
✅ Sudah Terbit: <b>${published}</b>
⏳ Menunggu Tayang: <b>${scheduled}</b>
📝 Draf Siap Review: <b>${draft}</b>
━━━━━━━━━━━━━━━━━━━━
🌐 <a href="${siteUrl}/admin">Buka Dasbor Redaksi Lengkap</a>`;

  await sendTelegramMessage(chatId, statsText, {
    inlineKeyboard: [
      [{ text: '✍️ Buat Berita Baru', callback_data: 'btn:menu' }],
      [{ text: '⚙️ Kelola di Admin', url: `${siteUrl}/admin` }],
    ],
  });
}

export async function POST(req: NextRequest) {
  try {
    const update = await req.json();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.naratif.web.id';
    const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID?.trim();

    // ==========================================
    // 1. PENANGANAN CALLBACK QUERY (KLIK TOMBOL)
    // ==========================================
    if (update?.callback_query) {
      const cb = update.callback_query;
      const callbackQueryId = cb.id;
      const chatId = cb.message?.chat?.id;
      const userId = cb.from?.id;
      const firstName = cb.from?.first_name || 'Redaksi';
      const data: string = cb.data || '';

      await answerCallbackQuery(callbackQueryId);

      // Cek otorisasi admin
      if (adminChatId && String(userId) !== adminChatId && String(chatId) !== adminChatId) {
        await sendTelegramMessage(
          chatId,
          `⛔ <b>Akses Terbatas</b>\n\nMaaf <b>${firstName}</b>, bot ini dikunci khusus untuk Redaksi Naratif.\nID Telegram Anda: <code>${userId}</code>`
        );
        return NextResponse.json({ ok: true });
      }

      // Tombol Menu / Buat Berita
      if (data === 'btn:menu') {
        const step1Text = `📝 <b>LANGKAH 1 DARI 4: PILIH TOPIK / KATEGORI BERITA</b>
━━━━━━━━━━━━━━━━━━━━
Pilih salah satu topik liputan cepat di bawah ini (atau ketik topik sendiri):`;

        await sendTelegramMessage(chatId, step1Text, {
          inlineKeyboard: [
            [{ text: '🤖 Tren & Inovasi AI Terkini', callback_data: 'cat:AI' }],
            [{ text: '💻 Ekosistem & Tren Software', callback_data: 'cat:Software' }],
            [{ text: '⚙️ Dinamika Semikonduktor & Hardware', callback_data: 'cat:Hardware' }],
            [{ text: '☁️ Infrastruktur Cloud & Keamanan', callback_data: 'cat:Infrastruktur' }],
            [{ text: '📱 Inovasi Gadget & Konsumen', callback_data: 'cat:Gadget' }],
            [{ text: '✍️ Ketik Topik Sendiri...', callback_data: 'cat:CUSTOM' }],
          ],
        });
        return NextResponse.json({ ok: true });
      }

      // Tombol Statistik
      if (data === 'btn:stats') {
        await sendStatsMessage(chatId, siteUrl);
        return NextResponse.json({ ok: true });
      }

      // Langkah 1: Pemilihan Kategori
      if (data.startsWith('cat:')) {
        const category = data.slice('cat:'.length);

        if (category === 'CUSTOM') {
          const customPrompt = `✍️ <b>Ketik Topik Berita Anda Sendiri:</b>
━━━━━━━━━━━━━━━━━━━━
Silakan ketik dan kirim chat dengan perintah berikut:

👉 <code>/tulis [topik berita]</code> <i>(Terbit Langsung, Riset Berita Aktif)</i>
👉 <code>/draft [topik berita]</code> <i>(Simpan Draf, Riset Berita Aktif)</i>
👉 <code>/panjang [topik berita]</code> <i>(Artikel Mendalam ~1200 kata)</i>
👉 <code>/ringkas [topik berita]</code> <i>(Ringkas ~400 kata)</i>
👉 <code>/opini [topik berita]</code> <i>(Murni Analisis AI, Tanpa Berita Luar)</i>

💡 <i>Contoh:</i>
<code>/tulis Inovasi Chipset 2nm TSMC dan Dampaknya bagi Industri AI</code>`;

          await sendTelegramMessage(chatId, customPrompt);
          return NextResponse.json({ ok: true });
        }

        const preset = PRESET_TOPICS[category] || { label: category, prompt: category };
        const step2Text = `🌐 <b>LANGKAH 2 DARI 4: RISET GOOGLE NEWS</b>
━━━━━━━━━━━━━━━━━━━━
Topik: <b>${preset.label}</b>

Apakah Anda ingin AI melacak fakta berita terkini hari ini dari Google News (Indonesia & Global)?`;

        await sendTelegramMessage(chatId, step2Text, {
          inlineKeyboard: [
            [{ text: '🌐 Riset Google News: AKTIF (Faktual)', callback_data: `rs:1:${category}` }],
            [{ text: '⚡ Riset Google News: NONAKTIF (Murni AI)', callback_data: `rs:0:${category}` }],
            [{ text: '⬅️ Ganti Topik', callback_data: 'btn:menu' }],
          ],
        });
        return NextResponse.json({ ok: true });
      }

      // Langkah 2: Pemilihan Riset
      if (data.startsWith('rs:')) {
        const [, isResearch, category] = data.split(':');
        const preset = PRESET_TOPICS[category] || { label: category, prompt: category };
        const researchLabel = isResearch === '1' ? 'Aktif (Faktual Real-time)' : 'Nonaktif (Murni AI)';

        const step3Text = `📏 <b>LANGKAH 3 DARI 4: PANJANG ARTIKEL</b>
━━━━━━━━━━━━━━━━━━━━
Topik: <b>${preset.label}</b>
Riset Google News: <b>${researchLabel}</b>

Pilih target panjang naskah artikel berita:`;

        await sendTelegramMessage(chatId, step3Text, {
          inlineKeyboard: [
            [{ text: '📄 Ringkas (~400 kata)', callback_data: `len:ringkas:${isResearch}:${category}` }],
            [{ text: '📰 Standar (~700 kata)', callback_data: `len:standar:${isResearch}:${category}` }],
            [{ text: '📚 Mendalam (~1200 kata)', callback_data: `len:mendalam:${isResearch}:${category}` }],
            [{ text: '⬅️ Kembali ke Riset', callback_data: `cat:${category}` }],
          ],
        });
        return NextResponse.json({ ok: true });
      }

      // Langkah 3: Pemilihan Panjang
      if (data.startsWith('len:')) {
        const [, length, isResearch, category] = data.split(':');
        const preset = PRESET_TOPICS[category] || { label: category, prompt: category };
        const researchLabel = isResearch === '1' ? 'Aktif' : 'Nonaktif';
        const lengthLabel =
          length === 'ringkas' ? 'Ringkas (~400 kata)' : length === 'mendalam' ? 'Mendalam (~1200 kata)' : 'Standar (~700 kata)';

        const step4Text = `🤖 <b>LANGKAH 4 DARI 5: PILIH AI ENGINE</b>
━━━━━━━━━━━━━━━━━━━━
Topik: <b>${preset.label}</b>
Riset Google News: <b>${researchLabel}</b>
Panjang: <b>${lengthLabel}</b>

Pilih model kecerdasan buatan untuk meracik berita:`;

        await sendTelegramMessage(chatId, step4Text, {
          inlineKeyboard: [
            [{ text: '⚡ Google Gemini 3.8 Flash (Rekomendasi)', callback_data: `eng:gemini:${length}:${isResearch}:${category}` }],
            [{ text: '🚀 Groq Cloud (Super Cepat ~5s)', callback_data: `eng:groq:${length}:${isResearch}:${category}` }],
            [{ text: '🌐 9Router Gateway (DeepSeek/Custom)', callback_data: `eng:9router:${length}:${isResearch}:${category}` }],
            [{ text: '⬅️ Kembali ke Panjang', callback_data: `rs:${isResearch}:${category}` }],
          ],
        });
        return NextResponse.json({ ok: true });
      }

      // Langkah 4: Pemilihan AI Engine -> Pindah ke Langkah 5: Status Publikasi
      if (data.startsWith('eng:')) {
        const [, provider, length, isResearch, category] = data.split(':');
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
Topik: <b>${preset.label}</b>
AI Engine: <b>${providerLabel}</b>
Riset Google News: <b>${researchLabel}</b>
Panjang: <b>${lengthLabel}</b>

Pilih tindakan akhir publikasi artikel ke website:`;

        await sendTelegramMessage(chatId, step5Text, {
          inlineKeyboard: [
            [{ text: '🚀 Langsung Terbitkan ke Web', callback_data: `gen:pub:${provider}:${length}:${isResearch}:${category}` }],
            [{ text: '📝 Simpan Sebagai Draf (Review)', callback_data: `gen:drf:${provider}:${length}:${isResearch}:${category}` }],
            [{ text: '⬅️ Kembali ke AI Engine', callback_data: `len:${length}:${isResearch}:${category}` }],
          ],
        });
        return NextResponse.json({ ok: true });
      }

      // Langkah 5: Eksekusi Generator AI
      if (data.startsWith('gen:')) {
        const parts = data.split(':');
        let statusStr = '';
        let provider: 'gemini' | 'groq' | '9router' = 'gemini';
        let lengthStr = 'standar';
        let isResearchStr = '1';
        let category = 'AI';

        if (parts.length >= 6) {
          [, statusStr, provider, lengthStr, isResearchStr, category] = parts as any;
        } else {
          [, statusStr, lengthStr, isResearchStr, category] = parts;
        }

        const preset = PRESET_TOPICS[category] || { label: category, prompt: category };
        const isPublish = statusStr === 'pub';
        const enableWebSearch = isResearchStr === '1';
        const length = (lengthStr as 'ringkas' | 'standar' | 'mendalam') || 'standar';

        await runArticleGeneration({
          chatId,
          topic: preset.prompt,
          category,
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
      await sendWelcomeMessage(chatId, firstName, userId, siteUrl);
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

    // 2. COMMAND: /menu, /buat
    if (rawText === '/menu' || rawText === '/buat') {
      const step1Text = `📝 <b>LANGKAH 1 DARI 4: PILIH TOPIK / KATEGORI BERITA</b>
━━━━━━━━━━━━━━━━━━━━
Pilih salah satu topik liputan cepat di bawah ini (atau balas chat ini dengan perintah langsung):`;

      await sendTelegramMessage(chatId, step1Text, {
        inlineKeyboard: [
          [{ text: '🤖 Tren & Inovasi AI Terkini', callback_data: 'cat:AI' }],
          [{ text: '💻 Ekosistem & Tren Software', callback_data: 'cat:Software' }],
          [{ text: '⚙️ Dinamika Semikonduktor & Hardware', callback_data: 'cat:Hardware' }],
          [{ text: '☁️ Infrastruktur Cloud & Keamanan', callback_data: 'cat:Infrastruktur' }],
          [{ text: '📱 Inovasi Gadget & Konsumen', callback_data: 'cat:Gadget' }],
          [{ text: '✍️ Ketik Topik Sendiri...', callback_data: 'cat:CUSTOM' }],
        ],
      });
      return NextResponse.json({ ok: true });
    }

    // 3. COMMAND: /stats
    if (rawText === '/stats') {
      await sendStatsMessage(chatId, siteUrl);
      return NextResponse.json({ ok: true });
    }

    // 3.1 COMMAND SADUR BERITA DARI URL (/sadur, /rewrite, atau tempel link langsung)
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
        `🔗 <b>Format Perintah Sadur Berita:</b>\n\nKetik <code>/sadur [link_url]</code> atau cukup kirimkan link beritanya langsung ke bot ini.\n\n💡 <i>Contoh:</i>\n<code>/sadur https://www.theverge.com/...</code>`
      );
      return NextResponse.json({ ok: true });
    }

    // 4. COMMAND PERINTAH CEPAT (SHORTCUTS)
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
          `⚠️ <b>Topik berita belum ditulis!</b>\n\nSilakan sertakan topik setelah perintah.\n\n💡 Contoh:\n<code>${rawText} Peluncuran Chipset AI Generasi Terbaru</code>`
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

    // 5. PESAN TEKS BIASA (Bukan perintah '/')
    const helpPromptText = `Halo <b>${firstName}</b>! Apakah Anda ingin membuat artikel berita?

Silakan pilih metode berikut:
1️⃣ Tekan tombol <b>"✍️ Mulai Buat Berita"</b> di bawah untuk panduan bertahap.
2️⃣ Atau gunakan perintah cepat:
👉 <code>/tulis ${rawText}</code> <i>(Terbit Langsung, Riset Aktif)</i>
👉 <code>/draft ${rawText}</code> <i>(Simpan Draf, Riset Aktif)</i>
👉 <code>/opini ${rawText}</code> <i>(Murni AI, Tanpa Riset Luar)</i>

Atau ketik <code>/start</code> untuk melihat menu bantuan utama.`;

    await sendTelegramMessage(chatId, helpPromptText, {
      inlineKeyboard: [
        [{ text: '✍️ Mulai Buat Berita', callback_data: 'btn:menu' }],
        [{ text: '📊 Cek Statistik Web', callback_data: 'btn:stats' }],
      ],
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Telegram Webhook error:', error);
    return NextResponse.json({ ok: true, error: error.message });
  }
}
