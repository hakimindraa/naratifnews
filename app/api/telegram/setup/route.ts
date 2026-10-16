import { NextRequest, NextResponse } from 'next/server';
import { setTelegramWebhook, getTelegramWebhookInfo, setTelegramCommands } from '@/lib/telegram';

export const BOT_COMMANDS = [
  { command: 'start', description: '🚀 Buka Menu Utama Redaksi' },
  { command: 'menu', description: '✍️ Mulai Buat Berita Interaktif' },
  { command: 'regional', description: '🏛️ Berita Daerah / Wilayah' },
  { command: 'autopilot', description: '🤖 Jadwal Autopublish & Status' },
  { command: 'jadwal', description: '⏰ Cek Slot Publikasi Berikutnya' },
  { command: 'sadur', description: '🔗 Sadur Berita dari Link' },
  { command: 'revisi', description: '✏️ Revisi Artikel Terbit' },
  { command: 'stats', description: '📊 Statistik Portal Web' },
  { command: 'clear', description: '🧹 Bersihkan Chat / Layar' },
  { command: 'help', description: '❓ Panduan Lengkap' },
];

export async function GET(req: NextRequest) {
  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.naratif.web.id';
    const webhookUrl = `${siteUrl}/api/telegram/webhook`;

    // Daftarkan webhook dan daftar menu perintah ke server Telegram
    const setResult = await setTelegramWebhook(webhookUrl);
    const infoResult = await getTelegramWebhookInfo();
    const cmdResult = await setTelegramCommands(BOT_COMMANDS).catch((err) => ({ ok: false, error: err.message }));

    return NextResponse.json({
      success: setResult?.ok ?? false,
      message: setResult?.description || 'Webhook & Bot Commands setup executed',
      registeredWebhookUrl: webhookUrl,
      telegramResponse: setResult,
      webhookInfo: infoResult,
      commandsResponse: cmdResult,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Gagal mengatur webhook Telegram.',
      },
      { status: 500 }
    );
  }
}
