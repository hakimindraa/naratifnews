/**
 * Utilitas Webhook Notifier ke Website Kantor AI (Diorama 3D)
 * Menggunakan prinsip Fire-and-Forget non-blocking dengan timeout ketat 1.5 detik
 * dan silent error handling sehingga tidak akan pernah mengganggu jalannya AdaFakta.
 */

export interface KantorAIPayload {
  action:
    | 'draft_created'
    | 'cover_generated'
    | 'article_published'
    | 'article_rewritten'
    | 'ai_studio_generated'
    | 'author_created'
    | 'db_purged';
  title: string;
  category?: string;
  coverUrl?: string;
  articleUrl?: string;
  author?: string;
  excerpt?: string;
  source?: string;
  model?: string;
  metadata?: Record<string, any>;
}

export async function notifyKantorAI(payload: KantorAIPayload): Promise<void> {
  const endpoint = process.env.KANTORAI_URL?.trim();
  const secret = process.env.KANTORAI_WEBHOOK_SECRET?.trim();

  // Jika URL tujuan belum disetel di .env.local, abaikan secara senyap
  if (!endpoint) return;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);

    const cleanEndpoint = endpoint.replace(/\/+$/, '');

    fetch(`${cleanEndpoint}/api/incoming-news`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-token': secret || '',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
      .catch(() => {
        // Abaikan kesalahan koneksi agar tidak pernah mengganggu atau memblokir AdaFakta
      })
      .finally(() => clearTimeout(timeout));
  } catch {
    // Zero-crash guarantee
  }
}

