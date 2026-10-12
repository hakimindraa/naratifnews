import { NextRequest, NextResponse } from 'next/server';
import { sendTelegramMessage } from '@/lib/telegram';
import { requestArticleFromModelRouter } from '@/lib/ai-generator';
import { db } from '@/db';
import { articles, aiGenerationLogs } from '@/db/schema';
import { revalidatePath } from 'next/cache';

export const maxDuration = 60; // Timeout 60 detik untuk operasi AI
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const update = await req.json();

    const message = update?.message;
    if (!message || !message.text) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id;
    const userId = message.from?.id;
    const firstName = message.from?.first_name || 'Redaksi';
    const rawText = message.text.trim();

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.naratif.web.id';

    // 1. COMMAND: /start, /help, /bantuan
    if (
      rawText === '/start' ||
      rawText.startsWith('/start ') ||
      rawText === '/help' ||
      rawText === '/bantuan'
    ) {
      const welcomeText = `🤖 <b>Selamat Datang di Naratif Redaksi Bot!</b>

Halo, <b>${firstName}</b>! Saya adalah asisten AI resmi portal media teknologi <b>Naratif</b> (<a href="${siteUrl}">naratif.web.id</a>).

Saya siap membantu Anda melacak berita teknologi terkini di internet dan langsung menerbitkannya ke website hanya lewat chat Telegram ini.

📋 <b>DAFTAR PERINTAH UTAMA:</b>

🚀 <code>/tulis [topik berita]</code>
<i>Riset Google News (Lokal + Global), tulis naskah AI mendalam, dan langsung tayangkan ke website.</i>
👉 Contoh: <code>/tulis Perkembangan Semikonduktor 2nm Terbaru</code>

📝 <code>/draft [topik berita]</code>
<i>Buat naskah berita dan simpan sebagai Draf di admin untuk ditinjau.</i>
👉 Contoh: <code>/draft Tren AI Agent Open Source Eropa</code>

📊 <code>/stats</code>
<i>Melihat total artikel terbit, draf, dan arsip di database saat ini.</i>

ℹ️ <code>/help</code> atau <code>/bantuan</code>
<i>Membuka kembali panduan perintah ini kapan saja.</i>
━━━━━━━━━━━━━━━━━━━━
👤 <b>ID Telegram Anda:</b> <code>${userId}</code> <i>(Aman)</i>`;

      await sendTelegramMessage(chatId, welcomeText, {
        inlineKeyboard: [
          [
            { text: '🌐 Kunjungi Website', url: siteUrl },
            { text: '⚙️ Dasbor Admin', url: `${siteUrl}/admin` },
          ],
        ],
      });

      return NextResponse.json({ ok: true });
    }

    // Verifikasi Otorisasi Admin jika TELEGRAM_ADMIN_CHAT_ID sudah disetel
    const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID?.trim();
    if (adminChatId && String(userId) !== adminChatId && String(chatId) !== adminChatId) {
      await sendTelegramMessage(
        chatId,
        `⛔ <b>Akses Terbatas</b>\n\nMaaf <b>${firstName}</b>, bot ini dikunci khusus untuk Pemimpin Redaksi Naratif.\nID Telegram Anda: <code>${userId}</code>`
      );
      return NextResponse.json({ ok: true });
    }

    // 2. COMMAND: /stats
    if (rawText === '/stats') {
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
        inlineKeyboard: [[{ text: '⚙️ Kelola di Admin', url: `${siteUrl}/admin` }]],
      });

      return NextResponse.json({ ok: true });
    }

    // 3. COMMAND: /tulis (Publish Langsung) & /draft (Simpan Draf)
    const isPublish = rawText.startsWith('/tulis');
    const isDraft = rawText.startsWith('/draft');

    if (isPublish || isDraft) {
      const commandPrefix = isPublish ? /^\/tulis(@\w+)?\s*/i : /^\/draft(@\w+)?\s*/i;
      const topic = rawText.replace(commandPrefix, '').trim();

      if (!topic) {
        await sendTelegramMessage(
          chatId,
          `⚠️ <b>Topik berita belum ditulis!</b>\n\nSilakan ketik dengan format:\n<code>${
            isPublish ? '/tulis' : '/draft'
          } [Topik berita Anda]</code>\n\nContoh:\n<code>${
            isPublish ? '/tulis' : '/draft'
          } Inovasi Chipset Flagship 2026 dan Kemajuan Semikonduktor</code>`
        );
        return NextResponse.json({ ok: true });
      }

      // Beri feedback awal bahwa proses sudah dimulai
      await sendTelegramMessage(
        chatId,
        `⏳ <b>Memulai Liputan AI...</b>\n\nSedang melacak fakta Google News (Lokal & Global) serta meracik naskah jurnalistik untuk topik:\n<i>"${topic}"</i>\n\nStatus Target: <b>${
          isPublish ? 'Terbit Langsung (Published)' : 'Simpan Draf (Draft)'
        }</b>\n<i>Mohon tunggu sekitar 15–25 detik...</i>`
      );

      const startTime = performance.now();

      try {
        // Panggil generator AI
        const draftArticle = await requestArticleFromModelRouter({
          prompt: topic,
          length: 'standar',
          provider: 'gemini',
          enableWebSearch: true,
        });

        // Simpan ke database Neon
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
            coverUrl: null, // Opsional / bisa diedit di admin
            coverCaption: draftArticle.coverCaption,
            status,
            publishedAt,
          })
          .returning();

        const durationMs = Math.round(performance.now() - startTime);

        // Catat log AI
        await db.insert(aiGenerationLogs).values({
          prompt: topic,
          articleId: newArticle.id,
          articleTitle: newArticle.title,
          category: newArticle.category,
          status: newArticle.status,
          model: draftArticle.modelUsed || 'Gemini Flash',
          durationMs,
          errorMessage: null,
        });

        // Revalidate cache Next.js
        revalidatePath('/', 'layout');

        const articleUrl = `${siteUrl}/berita-teknologi/${newArticle.category.toLowerCase()}/${newArticle.id}/${newArticle.slug}`;

        if (isPublish) {
          const successText = `🎉 <b>BERITA BERHASIL TERBIT!</b>
━━━━━━━━━━━━━━━━━━━━
📰 <b>${newArticle.title}</b>
📂 Kategori: <b>${newArticle.category}</b>
🏷️ Tags: <i>${(newArticle.tags || []).map((t: string) => '#' + t).join(' ')}</i>
⏱️ Waktu Proses: <b>${(durationMs / 1000).toFixed(1)}s</b>
━━━━━━━━━━━━━━━━━━━━
Artikel sudah langsung tayang di halaman depan Naratif!`;

          await sendTelegramMessage(chatId, successText, {
            inlineKeyboard: [
              [
                { text: '📖 Baca di Website', url: articleUrl },
                { text: '⚙️ Edit di Admin', url: `${siteUrl}/admin/edit/${newArticle.id}` },
              ],
            ],
          });
        } else {
          const draftSuccessText = `📝 <b>BERITA BERHASIL DISIMPAN KE DRAF!</b>
━━━━━━━━━━━━━━━━━━━━
📰 <b>${newArticle.title}</b>
📂 Kategori: <b>${newArticle.category}</b>
⏱️ Waktu Proses: <b>${(durationMs / 1000).toFixed(1)}s</b>
━━━━━━━━━━━━━━━━━━━━
Artikel siap ditinjau di Dasbor Redaksi sebelum diterbitkan.`;

          await sendTelegramMessage(chatId, draftSuccessText, {
            inlineKeyboard: [
              [{ text: '✏️ Buka di Editor Admin', url: `${siteUrl}/admin/edit/${newArticle.id}` }],
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

      return NextResponse.json({ ok: true });
    }

    // 4. PESAN TEKS BIASA TANPA PERINTAH
    const helpPromptText = `Halo <b>${firstName}</b>! Apakah Anda ingin membuat berita?

Silakan gunakan perintah berikut:
👉 <code>/tulis ${rawText}</code> <i>(untuk terbit langsung)</i>
👉 <code>/draft ${rawText}</code> <i>(untuk simpan ke draf)</i>

Atau ketik <code>/start</code> untuk melihat menu bantuan lengkap.`;

    await sendTelegramMessage(chatId, helpPromptText);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Telegram Webhook error:', error);
    return NextResponse.json({ ok: true, error: error.message });
  }
}
