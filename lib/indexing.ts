import { SignJWT, importPKCS8 } from 'jose';

export interface IndexingResult {
  indexNow: {
    success: boolean;
    statusCode: number;
    message: string;
  };
  google: {
    success: boolean;
    statusCode: number;
    message: string;
    details?: any;
  };
}

/**
 * 1. Kirim notifikasi pengindeksan instan ke Microsoft Bing & mitra via protokol IndexNow
 */
export async function submitToIndexNow(urls: string[]) {
  const indexNowKey = process.env.INDEXNOW_KEY || 'e89f7a42b1094d45a98715ecb916f183';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.naratif.web.id';
  const host = new URL(siteUrl).host;

  // Filter dan pastikan URL valid dan unik
  const uniqueUrls = Array.from(new Set(urls.filter((u) => u && u.startsWith('http'))));
  if (uniqueUrls.length === 0) {
    return { success: false, statusCode: 400, message: 'Tidak ada URL valid untuk dikirim ke IndexNow' };
  }

  const payload = {
    host,
    key: indexNowKey,
    keyLocation: `${siteUrl}/${indexNowKey}.txt`,
    urlList: uniqueUrls,
  };

  try {
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    // IndexNow merespon dengan 200 OK atau 202 Accepted jika berhasil
    const isSuccess = res.status === 200 || res.status === 202;
    return {
      success: isSuccess,
      statusCode: res.status,
      message: isSuccess
        ? `IndexNow: Berhasil mengirim ${uniqueUrls.length} URL ke Bing/Search Engines (HTTP ${res.status})`
        : `IndexNow gagal merespon: HTTP ${res.status}`,
    };
  } catch (err: any) {
    console.warn('IndexNow submission error:', err);
    return {
      success: false,
      statusCode: 500,
      message: err.message || 'Gagal menghubungi server IndexNow',
    };
  }
}

/**
 * 2. Dapatkan Google OAuth2 Access Token menggunakan Google Service Account JWT
 */
async function getGoogleAccessToken(clientEmail: string, privateKeyPem: string): Promise<string> {
  const formattedKey = privateKeyPem.replace(/\\n/g, '\n');
  const privateKey = await importPKCS8(formattedKey, 'RS256');

  const now = Math.floor(Date.now() / 1000);
  const jwt = await new SignJWT({
    scope: 'https://www.googleapis.com/auth/indexing',
  })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(clientEmail)
    .setSubject(clientEmail)
    .setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey);

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
    cache: 'no-store',
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`Google OAuth2 Error (HTTP ${tokenRes.status}): ${errText}`);
  }

  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

/**
 * 3. Kirim notifikasi publikasi artikel ke Google Web Search Indexing API
 */
export async function submitToGoogleIndexing(
  url: string,
  type: 'URL_UPDATED' | 'URL_DELETED' = 'URL_UPDATED'
) {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim();

  if (!email || !rawKey) {
    return {
      success: false,
      statusCode: 400,
      message: 'Kredensial Google Service Account belum disetel di environment.',
    };
  }

  try {
    const accessToken = await getGoogleAccessToken(email, rawKey);

    const res = await fetch('https://indexing.googleapis.com/v3/urlNotifications:publish', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        url,
        type,
      }),
      cache: 'no-store',
    });

    const data = await res.json();
    const isSuccess = res.ok;

    return {
      success: isSuccess,
      statusCode: res.status,
      message: isSuccess
        ? `Google Indexing API: Sinyal ${type} berhasil dikirim ke Googlebot (HTTP 200 OK)`
        : `Google Indexing API Error: ${data.error?.message || 'Gagal memproses URL'}`,
      details: data,
    };
  } catch (err: any) {
    console.warn('Google Indexing API error:', err);
    return {
      success: false,
      statusCode: 500,
      message: err.message || 'Gagal otentikasi atau memanggil Google Indexing API',
    };
  }
}

/**
 * 4. Fungsi Utama Pengindeksan Otomatis (Mengirim ke IndexNow & Google secara Paralel)
 * Berjalan aman di latar belakang tanpa memblokir proses website (Non-blocking).
 */
export async function notifySearchEngines(urlOrUrls: string | string[]): Promise<IndexingResult> {
  const urls = Array.isArray(urlOrUrls) ? urlOrUrls : [urlOrUrls];
  const primaryUrl = urls[0];

  const [indexNowRes, googleRes] = await Promise.allSettled([
    submitToIndexNow(urls),
    primaryUrl ? submitToGoogleIndexing(primaryUrl, 'URL_UPDATED') : Promise.resolve({
      success: false,
      statusCode: 400,
      message: 'Tidak ada URL utama untuk Google Indexing',
    }),
  ]);

  const result: IndexingResult = {
    indexNow:
      indexNowRes.status === 'fulfilled'
        ? indexNowRes.value
        : { success: false, statusCode: 500, message: 'IndexNow Promise rejected' },
    google:
      googleRes.status === 'fulfilled'
        ? googleRes.value
        : { success: false, statusCode: 500, message: 'Google Indexing Promise rejected' },
  };

  console.log('📡 Search Engine Indexing Result:', JSON.stringify(result, null, 2));
  return result;
}
