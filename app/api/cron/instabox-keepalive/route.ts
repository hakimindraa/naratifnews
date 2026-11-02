import { NextRequest, NextResponse } from 'next/server';
import { runInstaboxKeepAlive, getInstaboxConfig } from '@/lib/instabox';
import { sendTelegramMessage } from '@/lib/telegram';

export const maxDuration = 30; // Max execution timeout

async function handleKeepAlive(request: Request) {
  try {
    const url = new URL(request.url);
    const secretQuery = url.searchParams.get('secret');
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // Verifikasi otorisasi jika CRON_SECRET terkonfigurasi
    if (cronSecret) {
      const isValidBearer = authHeader === `Bearer ${cronSecret}`;
      const isValidQuery = secretQuery === cronSecret;

      if (!isValidBearer && !isValidQuery) {
        return NextResponse.json({ error: 'Unauthorized: Kunci rahasia cron tidak valid' }, { status: 401 });
      }
    }

    // Jalankan logika Keep-Alive
    const result = await runInstaboxKeepAlive();
    const config = await getInstaboxConfig();

    // Jika mesin sempat tertidur dan berhasil dipicu bangun, beri notifikasi ke Telegram
    if (result.actionTaken === 'woken' && config.notifyOnWake) {
      const adminChatId =
        process.env.TELEGRAM_ADMIN_CHAT_ID ||
        process.env.TELEGRAM_ALLOWED_CHAT_ID ||
        '';

      if (adminChatId) {
        const timeStr = new Date().toLocaleTimeString('id-ID', {
          timeZone: 'Asia/Jakarta',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });

        const alertText = [
          `⚡ <b>Instabox Hermes Auto-Wake Alert</b>`,
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
          `Mesin sempat tertidur (idle pause) dan telah otomatis dibangunkan oleh Cron Job.`,
          ``,
          `🖥️ <b>Machine ID:</b> <code>${result.machineId}</code>`,
          `⏱️ <b>Waktu:</b> ${timeStr} WIB`,
          `🔄 <b>Status Sebelumnya:</b> ${result.previousStatus || 'paused'}`,
          `✅ <b>Status Sekarang:</b> Menghidupkan (Waking Up)`,
          ``,
          `<i>Hermes service kembali aktif dan dapat melayani request.</i>`,
        ].join('\n');

        await sendTelegramMessage(adminChatId, alertText, {
          parseMode: 'HTML',
          inlineKeyboard: [
            [
              { text: '🖥️ Buka Status VPS', callback_data: 'vps:status' },
              { text: '🔑 Ambil SSH Token', callback_data: 'vps:ssh' },
            ],
          ],
        }).catch((err) => console.error('Gagal mengirim Telegram alert wake:', err));
      }
    }

    return NextResponse.json({
      success: result.success,
      timestamp: new Date().toISOString(),
      action: result.actionTaken,
      machineId: result.machineId,
      message: result.message,
      details: result.details,
    });
  } catch (err: any) {
    console.error('Error in instabox-keepalive cron:', err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Terjadi kesalahan internal pada cron keep-alive',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return handleKeepAlive(request);
}

export async function POST(request: Request) {
  return handleKeepAlive(request);
}

