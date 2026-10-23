'use server';

import { db } from '@/db';
import { articles, jurnalisDrafts, aiGenerationLogs, systemSettings } from '@/db/schema';
import { eq, and, lt, sql, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export interface MaintenanceSettings {
  draftsRetentionDays: number; // 3, 5, 7, 14, 0 (0 = nonaktif)
  publishedDraftsRetentionDays: number; // 3, 7, 14, 30, 0
  aiLogsRetentionDays: number; // 7, 14, 30, 0
  lastPurgedAt: string | null;
}

export interface MaintenanceMetrics {
  expiredRawDrafts: number;
  expiredPublishedDrafts: number;
  expiredAiLogs: number;
  totalPurgeable: number;
  totalPublicArticles: number;
  settings: MaintenanceSettings;
}

const SETTING_KEYS = {
  drafts: 'purge_retention_drafts_days',
  publishedDrafts: 'purge_retention_published_drafts_days',
  aiLogs: 'purge_retention_ai_logs_days',
  lastPurged: 'purge_last_executed_at',
};

const DEFAULT_SETTINGS: MaintenanceSettings = {
  draftsRetentionDays: 7,
  publishedDraftsRetentionDays: 7,
  aiLogsRetentionDays: 14,
  lastPurgedAt: null,
};

/**
 * Mengambil preferensi retensi pembersihan database dari system_settings
 */
export async function getMaintenanceSettingsAction(): Promise<MaintenanceSettings> {
  try {
    const rows = await db.select().from(systemSettings);
    const map = new Map<string, string>();
    for (const r of rows) {
      map.set(r.key, r.value);
    }

    const parseNum = (val: string | undefined, def: number) => {
      if (!val) return def;
      const parsed = parseInt(val, 10);
      return isNaN(parsed) ? def : parsed;
    };

    return {
      draftsRetentionDays: parseNum(map.get(SETTING_KEYS.drafts), DEFAULT_SETTINGS.draftsRetentionDays),
      publishedDraftsRetentionDays: parseNum(map.get(SETTING_KEYS.publishedDrafts), DEFAULT_SETTINGS.publishedDraftsRetentionDays),
      aiLogsRetentionDays: parseNum(map.get(SETTING_KEYS.aiLogs), DEFAULT_SETTINGS.aiLogsRetentionDays),
      lastPurgedAt: map.get(SETTING_KEYS.lastPurged) || null,
    };
  } catch (err) {
    console.error('Gagal mengambil pengaturan maintenance:', err);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Menyimpan preferensi retensi pembersihan database ke system_settings
 */
export async function updateMaintenanceSettingsAction(newSettings: {
  draftsRetentionDays: number;
  publishedDraftsRetentionDays: number;
  aiLogsRetentionDays: number;
}) {
  try {
    const now = new Date();
    const upsertSetting = async (key: string, value: string) => {
      await db
        .insert(systemSettings)
        .values({ key, value, updatedAt: now })
        .onConflictDoUpdate({
          target: systemSettings.key,
          set: { value, updatedAt: now },
        });
    };

    await Promise.all([
      upsertSetting(SETTING_KEYS.drafts, String(newSettings.draftsRetentionDays)),
      upsertSetting(SETTING_KEYS.publishedDrafts, String(newSettings.publishedDraftsRetentionDays)),
      upsertSetting(SETTING_KEYS.aiLogs, String(newSettings.aiLogsRetentionDays)),
    ]);

    revalidatePath('/admin/maintenance');
    return { success: true };
  } catch (err: any) {
    console.error('Gagal menyimpan pengaturan maintenance:', err);
    return { success: false, error: err?.message || 'Gagal menyimpan pengaturan' };
  }
}

/**
 * Menghitung metrik sampah data yang telah jatuh tempo berdasarkan preferensi retensi
 */
export async function getMaintenanceMetricsAction(): Promise<MaintenanceMetrics> {
  const settings = await getMaintenanceSettingsAction();
  const now = Date.now();

  const getCutoff = (days: number) => (days > 0 ? new Date(now - days * 24 * 60 * 60 * 1000) : null);

  const cutoffDrafts = getCutoff(settings.draftsRetentionDays);
  const cutoffPublished = getCutoff(settings.publishedDraftsRetentionDays);
  const cutoffLogs = getCutoff(settings.aiLogsRetentionDays);

  const [
    [draftsCountRes],
    [publishedCountRes],
    [logsCountRes],
    [publicArticlesRes],
  ] = await Promise.all([
    cutoffDrafts
      ? db
          .select({ count: sql<number>`count(*)::int` })
          .from(jurnalisDrafts)
          .where(and(eq(jurnalisDrafts.status, 'draft'), lt(jurnalisDrafts.createdAt, cutoffDrafts)))
      : [{ count: 0 }],
    cutoffPublished
      ? db
          .select({ count: sql<number>`count(*)::int` })
          .from(jurnalisDrafts)
          .where(and(eq(jurnalisDrafts.status, 'published'), lt(jurnalisDrafts.createdAt, cutoffPublished)))
      : [{ count: 0 }],
    cutoffLogs
      ? db
          .select({ count: sql<number>`count(*)::int` })
          .from(aiGenerationLogs)
          .where(lt(aiGenerationLogs.createdAt, cutoffLogs))
      : [{ count: 0 }],
    db.select({ count: sql<number>`count(*)::int` }).from(articles),
  ]);

  const expiredRawDrafts = draftsCountRes?.count || 0;
  const expiredPublishedDrafts = publishedCountRes?.count || 0;
  const expiredAiLogs = logsCountRes?.count || 0;
  const totalPublicArticles = publicArticlesRes?.count || 0;

  return {
    expiredRawDrafts,
    expiredPublishedDrafts,
    expiredAiLogs,
    totalPurgeable: expiredRawDrafts + expiredPublishedDrafts + expiredAiLogs,
    totalPublicArticles,
    settings,
  };
}

/**
 * Menjalankan eksekusi pembersihan database secara aman (Tabel articles tidak akan pernah dihapus)
 */
export async function executePurgeAction(scope: 'all' | 'raw_drafts' | 'published_drafts' | 'ai_logs' = 'all') {
  try {
    const settings = await getMaintenanceSettingsAction();
    const now = Date.now();
    const getCutoff = (days: number) => (days > 0 ? new Date(now - days * 24 * 60 * 60 * 1000) : null);

    const cutoffDrafts = getCutoff(settings.draftsRetentionDays);
    const cutoffPublished = getCutoff(settings.publishedDraftsRetentionDays);
    const cutoffLogs = getCutoff(settings.aiLogsRetentionDays);

    let deletedRawDrafts = 0;
    let deletedPublishedDrafts = 0;
    let deletedAiLogs = 0;

    // 1. Purge Draf Mentah Usulan Bot
    if ((scope === 'all' || scope === 'raw_drafts') && cutoffDrafts) {
      const res = await db
        .delete(jurnalisDrafts)
        .where(and(eq(jurnalisDrafts.status, 'draft'), lt(jurnalisDrafts.createdAt, cutoffDrafts)))
        .returning({ id: jurnalisDrafts.id });
      deletedRawDrafts = res.length;
    }

    // 2. Purge Salinan Draf yang Sudah Berhasil Terbit ke Web
    if ((scope === 'all' || scope === 'published_drafts') && cutoffPublished) {
      const res = await db
        .delete(jurnalisDrafts)
        .where(and(eq(jurnalisDrafts.status, 'published'), lt(jurnalisDrafts.createdAt, cutoffPublished)))
        .returning({ id: jurnalisDrafts.id });
      deletedPublishedDrafts = res.length;
    }

    // 3. Purge Riwayat Log AI
    if ((scope === 'all' || scope === 'ai_logs') && cutoffLogs) {
      const res = await db
        .delete(aiGenerationLogs)
        .where(lt(aiGenerationLogs.createdAt, cutoffLogs))
        .returning({ id: aiGenerationLogs.id });
      deletedAiLogs = res.length;
    }

    // Catat waktu eksekusi terakhir
    const purgeTimeIso = new Date().toISOString();
    await db
      .insert(systemSettings)
      .values({ key: SETTING_KEYS.lastPurged, value: purgeTimeIso, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: { value: purgeTimeIso, updatedAt: new Date() },
      });

    revalidatePath('/admin/maintenance');
    revalidatePath('/admin/jurnalis');
    revalidatePath('/admin');

    const totalDeleted = deletedRawDrafts + deletedPublishedDrafts + deletedAiLogs;

    return {
      success: true,
      deletedRawDrafts,
      deletedPublishedDrafts,
      deletedAiLogs,
      totalDeleted,
      lastPurgedAt: purgeTimeIso,
    };
  } catch (err: any) {
    console.error('Gagal mengeksekusi purge database:', err);
    return {
      success: false,
      error: err?.message || 'Gagal membersihkan database',
      deletedRawDrafts: 0,
      deletedPublishedDrafts: 0,
      deletedAiLogs: 0,
      totalDeleted: 0,
    };
  }
}

export interface PurgeCandidateItem {
  id: number;
  itemType: 'published_draft' | 'raw_draft' | 'ai_log';
  sourceLabel: string;
  sourceSubLabel: string;
  badgeColor: 'emerald' | 'amber' | 'blue';
  title: string;
  categoryOrSource?: string;
  createdAt: string; // ISO
  ageDays: number;
  retentionDays: number;
  scheduledPurgeAt: string; // ISO
  daysRemaining: number;
  isExpired: boolean;
}

/**
 * Mengambil daftar pratinjau item non-publik yang sedang berada dalam siklus retensi pembersihan
 */
export async function getPurgeCandidateItemsAction(): Promise<PurgeCandidateItem[]> {
  try {
    const settings = await getMaintenanceSettingsAction();
    const now = Date.now();

    const [publishedDraftsList, rawDraftsList, aiLogsList] = await Promise.all([
      db
        .select({
          id: jurnalisDrafts.id,
          title: jurnalisDrafts.title,
          generatedTitle: jurnalisDrafts.generatedTitle,
          category: jurnalisDrafts.category,
          source: jurnalisDrafts.source,
          createdAt: jurnalisDrafts.createdAt,
        })
        .from(jurnalisDrafts)
        .where(eq(jurnalisDrafts.status, 'published'))
        .orderBy(desc(jurnalisDrafts.createdAt))
        .limit(100),
      db
        .select({
          id: jurnalisDrafts.id,
          title: jurnalisDrafts.title,
          generatedTitle: jurnalisDrafts.generatedTitle,
          category: jurnalisDrafts.category,
          source: jurnalisDrafts.source,
          createdAt: jurnalisDrafts.createdAt,
        })
        .from(jurnalisDrafts)
        .where(eq(jurnalisDrafts.status, 'draft'))
        .orderBy(desc(jurnalisDrafts.createdAt))
        .limit(100),
      db
        .select({
          id: aiGenerationLogs.id,
          prompt: aiGenerationLogs.prompt,
          articleTitle: aiGenerationLogs.articleTitle,
          category: aiGenerationLogs.category,
          createdAt: aiGenerationLogs.createdAt,
        })
        .from(aiGenerationLogs)
        .orderBy(desc(aiGenerationLogs.createdAt))
        .limit(100),
    ]);

    const items: PurgeCandidateItem[] = [];

    // 1. Salinan Draf Live yang sudah terbit di portal
    for (const d of publishedDraftsList) {
      const createdTime = d.createdAt.getTime();
      const ageDays = Math.floor((now - createdTime) / (24 * 60 * 60 * 1000));
      const retentionDays = settings.publishedDraftsRetentionDays;
      const targetTime = createdTime + retentionDays * 24 * 60 * 60 * 1000;
      const daysRemaining = Math.ceil((targetTime - now) / (24 * 60 * 60 * 1000));

      items.push({
        id: d.id,
        itemType: 'published_draft',
        sourceLabel: 'Meja Jurnalis AI',
        sourceSubLabel: 'Salinan Live Terbit',
        badgeColor: 'emerald',
        title: d.generatedTitle || d.title,
        categoryOrSource: d.category || d.source || 'Nasional',
        createdAt: d.createdAt.toISOString(),
        ageDays,
        retentionDays,
        scheduledPurgeAt: new Date(targetTime).toISOString(),
        daysRemaining,
        isExpired: daysRemaining <= 0,
      });
    }

    // 2. Usulan Draf Mentah Bot
    for (const d of rawDraftsList) {
      const createdTime = d.createdAt.getTime();
      const ageDays = Math.floor((now - createdTime) / (24 * 60 * 60 * 1000));
      const retentionDays = settings.draftsRetentionDays;
      const targetTime = createdTime + retentionDays * 24 * 60 * 60 * 1000;
      const daysRemaining = Math.ceil((targetTime - now) / (24 * 60 * 60 * 1000));

      items.push({
        id: d.id,
        itemType: 'raw_draft',
        sourceLabel: 'Meja Jurnalis AI',
        sourceSubLabel: 'Draf Mentah Bot',
        badgeColor: 'amber',
        title: d.title,
        categoryOrSource: d.source || 'Bot Intelijen',
        createdAt: d.createdAt.toISOString(),
        ageDays,
        retentionDays,
        scheduledPurgeAt: new Date(targetTime).toISOString(),
        daysRemaining,
        isExpired: daysRemaining <= 0,
      });
    }

    // 3. Log Riwayat AI Studio
    for (const l of aiLogsList) {
      const createdTime = l.createdAt.getTime();
      const ageDays = Math.floor((now - createdTime) / (24 * 60 * 60 * 1000));
      const retentionDays = settings.aiLogsRetentionDays;
      const targetTime = createdTime + retentionDays * 24 * 60 * 60 * 1000;
      const daysRemaining = Math.ceil((targetTime - now) / (24 * 60 * 60 * 1000));

      items.push({
        id: l.id,
        itemType: 'ai_log',
        sourceLabel: 'AI Studio Generator',
        sourceSubLabel: 'Log Prompt Riwayat',
        badgeColor: 'blue',
        title: l.articleTitle || l.prompt.slice(0, 80),
        categoryOrSource: l.category || 'AI Studio',
        createdAt: l.createdAt.toISOString(),
        ageDays,
        retentionDays,
        scheduledPurgeAt: new Date(targetTime).toISOString(),
        daysRemaining,
        isExpired: daysRemaining <= 0,
      });
    }

    // Urutkan berdasarkan waktu yang paling mendekati jatuh tempo (daysRemaining ASC)
    return items.sort((a, b) => a.daysRemaining - b.daysRemaining);
  } catch (err) {
    console.error('Gagal mengambil daftar kandidat purge:', err);
    return [];
  }
}

/**
 * Menghapus 1 item kandidat purge secara satuan/manual
 */
export async function deleteIndividualPurgeItemAction(
  itemType: 'published_draft' | 'raw_draft' | 'ai_log',
  id: number
) {
  try {
    if (itemType === 'published_draft' || itemType === 'raw_draft') {
      await db.delete(jurnalisDrafts).where(eq(jurnalisDrafts.id, id));
    } else if (itemType === 'ai_log') {
      await db.delete(aiGenerationLogs).where(eq(aiGenerationLogs.id, id));
    }

    revalidatePath('/admin/maintenance');
    revalidatePath('/admin/jurnalis');
    return { success: true };
  } catch (err: any) {
    console.error('Gagal menghapus item purge satuan:', err);
    return { success: false, error: err?.message || 'Gagal menghapus data' };
  }
}

