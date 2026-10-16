'use server';

import { db } from '@/db';
import { articles, aiGenerationLogs, systemSettings } from '@/db/schema';
import { eq, desc, sql, and, lte, asc, or, like } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getAutopilotScheduleInfo } from '@/lib/autopilot-schedule';

export interface CronLogItem {
  id: number;
  prompt: string;
  articleId: number | null;
  articleTitle: string | null;
  category: string;
  status: string;
  model: string | null;
  durationMs: number | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface CronHubData {
  config: {
    siteUrl: string;
    autopilotUrl: string;
    publishUrl: string;
    cronSecret: string;
    autopilotEnabled: boolean;
    autopilotProvider: string;
    autopilotStatus: string;
    nextCategory: string;
    allCategories: string[];
    cronjobApiKey: string;
  };
  metrics: {
    todayAutopilotCount: number;
    scheduledCount: number;
    nextScheduledTime: string | null;
    nextScheduledTitle: string | null;
    lastAutopilotTime: string | null;
    lastAutopilotStatus: 'success' | 'failed' | 'idle';
    nextAutopilotTime?: string | null;
    nextAutopilotLabel?: string;
    nextAutopilotCountdown?: string;
  };
  logs: CronLogItem[];
  cronJobOrgStatus?: {
    connected: boolean;
    jobs: Array<{
      jobId: number;
      title: string;
      url: string;
      enabled: boolean;
      lastStatus: number;
      lastDuration: number;
      lastExecution: string | null;
      nextExecution: string | null;
      scheduleSummary?: string;
    }>;
    error?: string;
  };
  indexingStatus: {
    googleConfigured: boolean;
    googleEmail: string;
    indexNowConfigured: boolean;
  };
}

/**
 * Auto-Prune: Bersihkan log otomatis agar database Neon selalu ramping & hemat.
 * Menghapus log > 30 hari dan menjaga maksimal 100 baris riwayat terakhir.
 */
export async function pruneOldLogs() {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 1. Hapus log yang usianya lebih dari 30 hari
    await db.delete(aiGenerationLogs).where(lte(aiGenerationLogs.createdAt, thirtyDaysAgo));

    // 2. Batasi maksimal 100 baris terbaru
    await db.execute(sql`
      DELETE FROM ai_generation_logs 
      WHERE id NOT IN (
        SELECT id FROM ai_generation_logs 
        ORDER BY created_at DESC 
        LIMIT 100
      )
    `);
  } catch (err) {
    console.warn('Auto-prune logs warning:', err);
  }
}

/**
 * Mengambil data lengkap untuk Dashboard Cron Hub
 */
export async function getCronHubData(): Promise<CronHubData> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.adafakta.web.id';
  const cronSecret = process.env.CRON_SECRET || '';

  // 1. Baca konfigurasi sistem
  const settingsRows = await db.select().from(systemSettings);
  const settingsMap = new Map<string, string>();
  for (const r of settingsRows) {
    settingsMap.set(r.key, r.value);
  }

  const autopilotEnabled = settingsMap.get('autopilot_enabled') === 'true';
  const autopilotProvider = settingsMap.get('autopilot_provider') || 'groq';
  const autopilotStatus = settingsMap.get('autopilot_status') || 'published';
  const cronjobApiKey = settingsMap.get('cronjob_api_key') || process.env.CRONJOB_API_KEY || '';

  let allCategories = ['AI', 'Software', 'Hardware', 'Gadget', 'Infrastruktur', 'Regional'];
  try {
    const parsed = JSON.parse(settingsMap.get('autopilot_categories') || '[]');
    if (Array.isArray(parsed) && parsed.length > 0) {
      allCategories = parsed;
    }
  } catch {}

  const lastCategoryIdx = parseInt(settingsMap.get('autopilot_last_category_idx') || '0', 10);
  const nextCategoryIdx = (lastCategoryIdx + 1) % allCategories.length;
  const nextCategory = allCategories[nextCategoryIdx] || 'AI';

  // 2. Hitung artikel autopilot hari ini (mulai jam 00:00 hari ini)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayAutopilotRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(aiGenerationLogs)
    .where(
      and(
        sql`${aiGenerationLogs.createdAt} >= ${todayStart}`,
        like(aiGenerationLogs.prompt, '[Autopilot]%'),
        sql`${aiGenerationLogs.status} != 'failed'`
      )
    );
  const todayAutopilotCount = todayAutopilotRows[0]?.count || 0;

  // 3. Hitung berita terjadwal & cari yang terdekat
  const scheduledCountRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(articles)
    .where(eq(articles.status, 'scheduled'));
  const scheduledCount = scheduledCountRows[0]?.count || 0;

  const nextScheduled = await db
    .select({
      id: articles.id,
      title: articles.title,
      publishAt: articles.publishAt,
    })
    .from(articles)
    .where(eq(articles.status, 'scheduled'))
    .orderBy(asc(articles.publishAt))
    .limit(1);

  // 4. Ambil 30 log riwayat eksekusi cron terbaru
  const rawLogs = await db
    .select()
    .from(aiGenerationLogs)
    .where(
      or(
        like(aiGenerationLogs.prompt, '[Autopilot%'),
        like(aiGenerationLogs.prompt, '[Publish%')
      )
    )
    .orderBy(desc(aiGenerationLogs.createdAt))
    .limit(30);

  const logs: CronLogItem[] = rawLogs.map((log) => ({
    id: log.id,
    prompt: log.prompt,
    articleId: log.articleId,
    articleTitle: log.articleTitle,
    category: log.category,
    status: log.status,
    model: log.model,
    durationMs: log.durationMs,
    errorMessage: log.errorMessage,
    createdAt: log.createdAt ? log.createdAt.toISOString() : new Date().toISOString(),
  }));

  // Status eksekusi autopilot terakhir
  const lastAutopilotLog = logs.find((l) => l.prompt.includes('[Autopilot'));
  const lastAutopilotTime = lastAutopilotLog ? lastAutopilotLog.createdAt : null;
  const lastAutopilotStatus = lastAutopilotLog
    ? lastAutopilotLog.status === 'failed'
      ? 'failed'
      : 'success'
    : 'idle';

  // 5. Query cron-job.org API jika ada API Key
  let cronJobOrgStatus: CronHubData['cronJobOrgStatus'] = undefined;
  if (cronjobApiKey.trim()) {
    try {
      const res = await fetch('https://api.cron-job.org/jobs', {
        headers: {
          Authorization: `Bearer ${cronjobApiKey.trim()}`,
        },
        cache: 'no-store',
      });
      if (res.ok) {
        const json = await res.json();
        const rawJobs = json.jobs || [];
        cronJobOrgStatus = {
          connected: true,
          jobs: rawJobs.map((j: any) => {
            let scheduleSummary = 'Jadwal kustom';
            if (j.schedule) {
              const hours = j.schedule.hours || [];
              const minutes = (j.schedule.minutes || [0])[0] || 0;
              const minPad = String(minutes).padStart(2, '0');
              if (hours.includes(-1)) {
                scheduleSummary = `Setiap jam (menit ke-${minPad})`;
              } else if (hours.length > 0) {
                scheduleSummary = `Jam ${hours.map((h: number) => String(h).padStart(2, '0') + ':' + minPad).join(', ')} WIB`;
              }
            }

            return {
              jobId: j.jobId,
              title: j.title,
              url: j.url,
              enabled: j.enabled,
              lastStatus: j.lastStatus,
              lastDuration: j.lastDuration,
              lastExecution: j.lastExecution ? new Date(j.lastExecution * 1000).toISOString() : null,
              nextExecution: j.nextExecution ? new Date(j.nextExecution * 1000).toISOString() : null,
              scheduleSummary,
            };
          }),
        };
      } else {
        cronJobOrgStatus = {
          connected: false,
          jobs: [],
          error: `HTTP ${res.status}: Gagal otentikasi API cron-job.org`,
        };
      }
    } catch (err: any) {
      cronJobOrgStatus = {
        connected: false,
        jobs: [],
        error: err.message || 'Koneksi ke cron-job.org gagal',
      };
    }
  }

  // 6. Hitung Jadwal Autopilot Berikutnya (Next Run Schedule) via helper terpusat
  const autopilotSchedule = await getAutopilotScheduleInfo();

  // 7. Jalankan auto-prune di latar belakang tanpa memblokir respon
  pruneOldLogs().catch(() => {});

  return {
    config: {
      siteUrl,
      autopilotUrl: `${siteUrl}/api/cron/autopilot`,
      publishUrl: `${siteUrl}/api/cron/publish`,
      cronSecret,
      autopilotEnabled,
      autopilotProvider,
      autopilotStatus,
      nextCategory,
      allCategories,
      cronjobApiKey,
    },
    metrics: {
      todayAutopilotCount,
      scheduledCount,
      nextScheduledTime: nextScheduled[0]?.publishAt ? nextScheduled[0].publishAt.toISOString() : null,
      nextScheduledTitle: nextScheduled[0]?.title || null,
      lastAutopilotTime,
      lastAutopilotStatus,
      nextAutopilotTime: autopilotSchedule.nextRunTime,
      nextAutopilotLabel: autopilotSchedule.nextRunLabel,
      nextAutopilotCountdown: autopilotSchedule.countdown,
    },
    logs,
    cronJobOrgStatus,
    indexingStatus: {
      googleConfigured: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && !!process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
      googleEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '',
      indexNowConfigured: true,
    },
  };
}

/**
 * Trigger manual: Jalankan Autopilot AI sekarang juga
 */
export async function triggerAutopilotAction() {
  try {
    const cronSecret = process.env.CRON_SECRET || '';
    const req = new Request('http://localhost/api/cron/autopilot', {
      headers: {
        authorization: `Bearer ${cronSecret}`,
        'x-manual-trigger': 'true',
      },
    });

    const routeModule = await import('@/app/api/cron/autopilot/route');
    const response = await routeModule.GET(req);
    const data = await response.json();

    revalidatePath('/');
    revalidatePath('/admin');
    revalidatePath('/admin/cron');

    return { success: response.ok, ...data };
  } catch (error: any) {
    return { success: false, message: error.message || 'Gagal menjalankan Autopilot' };
  }
}

/**
 * Trigger manual: Periksa & terbitkan draf terjadwal sekarang juga
 */
export async function triggerPublishCheckAction() {
  try {
    const now = new Date();

    const updatedArticles = await db
      .update(articles)
      .set({
        status: 'published',
        publishedAt: now,
        updatedAt: now,
      })
      .where(and(eq(articles.status, 'scheduled'), lte(articles.publishAt, now)))
      .returning({ id: articles.id, title: articles.title });

    if (updatedArticles.length > 0) {
      // Catat log penerbitan
      await db.insert(aiGenerationLogs).values({
        prompt: `[Publish Scheduled] ${updatedArticles.length} artikel diterbitkan secara manual/sistem`,
        articleId: updatedArticles[0]?.id || null,
        articleTitle: `${updatedArticles.length} artikel terjadwal terbit`,
        category: 'Scheduler',
        status: 'published',
        model: 'system-scheduler',
        durationMs: 50,
        createdAt: now,
      });

      revalidatePath('/', 'layout');
    }

    revalidatePath('/admin');
    revalidatePath('/admin/cron');

    return {
      success: true,
      publishedCount: updatedArticles.length,
      articles: updatedArticles,
      message:
        updatedArticles.length > 0
          ? `Sukses menerbitkan ${updatedArticles.length} artikel terjadwal!`
          : 'Tidak ada artikel terjadwal yang telah melewati waktu tayang saat ini.',
    };
  } catch (error: any) {
    return { success: false, message: error.message || 'Gagal mengecek jadwal artikel' };
  }
}

/**
 * Simpan API Key cron-job.org untuk pemantauan live dari luar
 */
export async function saveCronJobApiKeyAction(apiKey: string) {
  try {
    await db
      .insert(systemSettings)
      .values({
        key: 'cronjob_api_key',
        value: apiKey.trim(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: { value: apiKey.trim(), updatedAt: new Date() },
      });

    revalidatePath('/admin/cron');
    return { success: true, message: 'API Key cron-job.org berhasil disimpan!' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Gagal menyimpan API Key' };
  }
}

/**
 * Uji coba kirim sinyal indexing manual ke Google & IndexNow
 */
export async function testIndexingPingAction(targetUrl?: string) {
  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.adafakta.web.id';
    const url = targetUrl || siteUrl;
    const { notifySearchEngines } = await import('@/lib/indexing');
    const result = await notifySearchEngines(url);
    return { success: true, result, url };
  } catch (err: any) {
    return { success: false, message: err.message || 'Gagal mengirim sinyal pengindeksan' };
  }
}
