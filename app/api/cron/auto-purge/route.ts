import { NextResponse } from 'next/server';
import { executePurgeAction } from '@/app/admin/maintenance/actions';
import { sendTelegramMessage } from '@/lib/telegram';

export const maxDuration = 45;

export async function GET(request: Request) {
  try {
    // 1. Verifikasi header otorisasi Cron Secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.adafakta.web.id';
    const now = new Date();

    // 2. Jalankan pembersihan sampah database
    const purgeResult = await executePurgeAction('all');

    if (!purgeResult.success) {
      return NextResponse.json(
        { error: 'Gagal mengeksekusi auto-purge', details: purgeResult.error },
        { status: 500 }
      );
    }

    // 3. Kirim Laporan ke Telegram Admin jika ada data yang dibersihkan (atau ringkasan bersih)
    const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID?.trim();
    if (adminChatId) {
      const tgMessage = `🧹 <b>LAPORAN AUTO-PURGE DATABASE</b>
<i>Pembersihan Otomatis Sampah & Log Berkala</i>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🗑️ <b>Total Dibersihkan:</b> <code>${purgeResult.totalDeleted} baris data</code>

┌── 📋 <b>Rincian Data Dihapus</b>
│ 📝 Draf Mentah Usang  : <b>${purgeResult.deletedRawDrafts} baris</b>
│ 📦 Draf Terbit Lama   : <b>${purgeResult.deletedPublishedDrafts} baris</b>
│ 📑 Log Riwayat AI     : <b>${purgeResult.deletedAiLogs} baris</b>
└──
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛡️ <i>Artikel tayang di web publik 100% aman dan terlindungi.</i>`;

      sendTelegramMessage(adminChatId, tgMessage, {
        inlineKeyboard: [
          [{ text: '🧹 Buka Panel Pembersihan DB', url: `${siteUrl}/admin/maintenance` }],
          [{ text: '⚙️ Buka Dasbor Admin', url: `${siteUrl}/admin` }],
        ],
      }).catch((tgErr) => console.warn('Telegram notify error on purge:', tgErr));
    }

    return NextResponse.json({
      success: true,
      message: `Auto-purge selesai. Berhasil membersihkan ${purgeResult.totalDeleted} baris data sampah.`,
      result: purgeResult,
      timestamp: now.toISOString(),
    });
  } catch (error: any) {
    if (error?.digest?.startsWith('NEXT_')) {
      throw error;
    }
    console.error('Auto-Purge Cron Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}
