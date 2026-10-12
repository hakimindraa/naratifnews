import fs from 'fs';
import path from 'path';

function getTelegramToken(): string {
  if (process.env.TELEGRAM_BOT_TOKEN) {
    return process.env.TELEGRAM_BOT_TOKEN;
  }

  // Fallback membaca .env.local jika proses lokal dev
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (trimmed.startsWith('TELEGRAM_BOT_TOKEN=')) {
          let val = trimmed.slice('TELEGRAM_BOT_TOKEN='.length).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (val) return val;
        }
      }
    }
  } catch (e) {
    // ignore
  }

  return '';
}

export interface InlineKeyboardButton {
  text: string;
  url?: string;
  callback_data?: string;
}

export interface SendMessageOptions {
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  inlineKeyboard?: InlineKeyboardButton[][];
  disableWebPagePreview?: boolean;
}

export async function sendTelegramMessage(
  chatId: number | string,
  text: string,
  options: SendMessageOptions = {}
): Promise<{ success: boolean; data?: any; error?: string }> {
  const token = getTelegramToken();
  if (!token) {
    return { success: false, error: 'TELEGRAM_BOT_TOKEN belum disetel.' };
  }

  try {
    const payload: any = {
      chat_id: chatId,
      text: text,
      parse_mode: options.parseMode || 'HTML',
      disable_web_page_preview: options.disableWebPagePreview ?? false,
    };

    if (options.inlineKeyboard && options.inlineKeyboard.length > 0) {
      payload.reply_markup = {
        inline_keyboard: options.inlineKeyboard,
      };
    }

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!data.ok) {
      console.error('Telegram sendMessage error:', data);
      return { success: false, error: data.description || 'Gagal mengirim pesan Telegram.' };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error('Telegram API error:', err);
    return { success: false, error: err.message || 'Kesalahan jaringan saat menghubungi Telegram.' };
  }
}

export async function setTelegramWebhook(webhookUrl: string): Promise<any> {
  const token = getTelegramToken();
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN belum disetel.');

  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(webhookUrl)}`);
  return await res.json();
}

export async function getTelegramWebhookInfo(): Promise<any> {
  const token = getTelegramToken();
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN belum disetel.');

  const res = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
  return await res.json();
}
