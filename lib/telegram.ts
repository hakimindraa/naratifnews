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

export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string
): Promise<any> {
  const token = getTelegramToken();
  if (!token) return { success: false, error: 'TELEGRAM_BOT_TOKEN belum disetel.' };

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text,
      }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function editTelegramMessage(
  chatId: number | string,
  messageId: number,
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
      message_id: messageId,
      text: text,
      parse_mode: options.parseMode || 'HTML',
      disable_web_page_preview: options.disableWebPagePreview ?? false,
    };

    if (options.inlineKeyboard) {
      payload.reply_markup = {
        inline_keyboard: options.inlineKeyboard,
      };
    }

    const res = await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!data.ok) {
      // Jika pesan sama persis, Telegram mengembalikan error "message is not modified"
      if (data.description && data.description.includes('message is not modified')) {
        return { success: true, data };
      }
      return { success: false, error: data.description || 'Gagal mengubah pesan Telegram.' };
    }

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Kesalahan jaringan saat mengubah pesan Telegram.' };
  }
}

export async function deleteTelegramMessage(
  chatId: number | string,
  messageId: number
): Promise<{ success: boolean; data?: any; error?: string }> {
  const token = getTelegramToken();
  if (!token) return { success: false, error: 'TELEGRAM_BOT_TOKEN belum disetel.' };

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/deleteMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
      }),
    });
    const data = await res.json();
    return { success: data.ok, data, error: data.ok ? undefined : data.description };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteTelegramMessages(
  chatId: number | string,
  messageIds: number[]
): Promise<{ success: boolean; data?: any; error?: string }> {
  const token = getTelegramToken();
  if (!token) return { success: false, error: 'TELEGRAM_BOT_TOKEN belum disetel.' };
  if (!messageIds || messageIds.length === 0) return { success: true };

  const uniqueIds = Array.from(new Set(messageIds)).filter((id) => id > 0);

  try {
    // 1. Coba batch delete resmi Telegram API 7.0+ (deleteMessages)
    const res = await fetch(`https://api.telegram.org/bot${token}/deleteMessages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_ids: uniqueIds.slice(0, 100),
      }),
    });
    const data = await res.json();
    if (data.ok) return { success: true, data };

    // 2. Fallback: Jika batch ditolak karena sebagian ID tidak ada atau >48 jam, hapus secara paralel via deleteMessage
    const deletePromises = uniqueIds.slice(0, 60).map((id) =>
      fetch(`https://api.telegram.org/bot${token}/deleteMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, message_id: id }),
      })
        .then((r) => r.json())
        .catch(() => null)
    );
    await Promise.allSettled(deletePromises);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function setTelegramCommands(
  commands: { command: string; description: string }[]
): Promise<any> {
  const token = getTelegramToken();
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN belum disetel.');

  const res = await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ commands }),
  });
  return await res.json();
}

/**
 * Mengambil direct link download file / foto dari server Telegram
 */
export async function getTelegramFileUrl(fileId: string): Promise<string | null> {
  const token = getTelegramToken();
  if (!token) return null;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`);
    const data = await res.json();
    if (data.ok && data.result?.file_path) {
      return `https://api.telegram.org/file/bot${token}/${data.result.file_path}`;
    }
  } catch (err) {
    console.error('Error fetching Telegram file path:', err);
  }
  return null;
}

export interface SendPhotoOptions {
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  inlineKeyboard?: InlineKeyboardButton[][];
  hasSpoiler?: boolean;
}

/**
 * Mengirim foto/banner resmi ke Telegram dengan format caption kaya (HTML/Blockquote)
 */
export async function sendTelegramPhoto(
  chatId: number | string,
  photo: string,
  caption?: string,
  options: SendPhotoOptions = {}
): Promise<{ success: boolean; data?: any; error?: string }> {
  const token = getTelegramToken();
  if (!token) {
    return { success: false, error: 'TELEGRAM_BOT_TOKEN belum disetel.' };
  }

  try {
    const payload: any = {
      chat_id: chatId,
      photo: photo,
      parse_mode: options.parseMode || 'HTML',
      has_spoiler: options.hasSpoiler ?? false,
    };

    if (caption) {
      payload.caption = caption;
    }

    if (options.inlineKeyboard && options.inlineKeyboard.length > 0) {
      payload.reply_markup = {
        inline_keyboard: options.inlineKeyboard,
      };
    }

    const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!data.ok) {
      console.error('Telegram sendPhoto error:', data);
      return { success: false, error: data.description || 'Gagal mengirim foto Telegram.' };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error('Telegram sendPhoto API error:', err);
    return { success: false, error: err.message || 'Kesalahan jaringan saat mengirim foto Telegram.' };
  }
}



