import { NextRequest, NextResponse } from 'next/server';
import { setTelegramWebhook, getTelegramWebhookInfo } from '@/lib/telegram';

export async function GET(req: NextRequest) {
  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.naratif.web.id';
    const webhookUrl = `${siteUrl}/api/telegram/webhook`;

    // Daftarkan webhook ke server Telegram
    const setResult = await setTelegramWebhook(webhookUrl);
    const infoResult = await getTelegramWebhookInfo();

    return NextResponse.json({
      success: setResult?.ok ?? false,
      message: setResult?.description || 'Webhook setup executed',
      registeredWebhookUrl: webhookUrl,
      telegramResponse: setResult,
      webhookInfo: infoResult,
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
