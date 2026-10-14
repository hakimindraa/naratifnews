'use server';

import { db } from '@/db';
import { systemSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export interface AISettingsData {
  baseUrl: string;
  apiKey: string;
  model: string;
  defaultProvider: 'gemini' | 'groq' | '9router';
}

// Pastikan tabel system_settings sudah ada (Self-healing migration)
async function ensureSettingsTableExists() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS system_settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `);
  } catch (err) {
    console.warn('Ensure settings table check:', err);
  }
}

export async function getAISettings(): Promise<AISettingsData> {
  await ensureSettingsTableExists();

  try {
    const rows = await db.select().from(systemSettings);
    const map = new Map<string, string>();
    for (const r of rows) {
      map.set(r.key, r.value);
    }

    const baseUrl = map.get('ai_9router_base_url') || process.env.LOCAL_9ROUTER_BASE_URL || 'http://localhost:20128/v1';
    const apiKey = map.get('ai_9router_api_key') ?? process.env.LOCAL_9ROUTER_KEY ?? '';
    const model = map.get('ai_9router_model') || process.env.LOCAL_9ROUTER_MODEL || 'oc/muse-spark-1.3-contributor-free';
    const defaultProvider = (map.get('ai_default_provider') as any) || 'gemini';

    return {
      baseUrl,
      apiKey,
      model,
      defaultProvider,
    };
  } catch (error) {
    console.error('Failed to get AI settings:', error);
    return {
      baseUrl: process.env.LOCAL_9ROUTER_BASE_URL || 'http://localhost:20128/v1',
      apiKey: process.env.LOCAL_9ROUTER_KEY || '',
      model: process.env.LOCAL_9ROUTER_MODEL || 'oc/muse-spark-1.3-contributor-free',
      defaultProvider: 'gemini',
    };
  }
}

export async function saveAISettings(data: {
  baseUrl: string;
  apiKey: string;
  model: string;
  defaultProvider?: 'gemini' | 'groq' | '9router';
}) {
  await ensureSettingsTableExists();

  const entries: [string, string][] = [
    ['ai_9router_base_url', data.baseUrl.trim().replace(/\/+$/, '')],
    ['ai_9router_api_key', data.apiKey.trim()],
    ['ai_9router_model', data.model.trim()],
  ];

  if (data.defaultProvider) {
    entries.push(['ai_default_provider', data.defaultProvider]);
  }

  for (const [key, value] of entries) {
    await db
      .insert(systemSettings)
      .values({ key, value, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: { value, updatedAt: new Date() },
      });
  }

  revalidatePath('/admin');
  revalidatePath('/admin/generator');
  revalidatePath('/admin/pengaturan');

  return { success: true, message: 'Pengaturan AI berhasil disimpan!' };
}

export async function test9RouterConnection(baseUrl: string, apiKey: string) {
  try {
    const cleanUrl = baseUrl.trim().replace(/\/+$/, '');
    const endpoint = `${cleanUrl}/models`;

    const headers: Record<string, string> = {};
    if (apiKey.trim()) {
      headers['Authorization'] = `Bearer ${apiKey.trim()}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(endpoint, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json().catch(() => null);
      let modelList: string[] = [];
      if (Array.isArray(data?.data)) {
        modelList = data.data.map((m: any) => m.id || m.name).filter(Boolean);
      }
      return {
        success: true,
        message: `Koneksi Berhasil! 9Router merespons status ${res.status} OK.`,
        models: modelList,
      };
    } else {
      const errText = await res.text().catch(() => '');
      return {
        success: false,
        message: `9Router merespons status ${res.status}: ${errText.slice(0, 150) || res.statusText}`,
      };
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return {
        success: false,
        message: 'Koneksi Timeout (lebih dari 8 detik). Pastikan server 9Router Anda aktif dan port dapat diakses publik.',
      };
    }
    return {
      success: false,
      message: `Gagal terhubung: ${err.message || 'Cek kembali URL dan IP/port 9Router Anda.'}`,
    };
  }
}

export async function fetch9RouterModels(baseUrl: string, apiKey: string) {
  try {
    const cleanUrl = baseUrl.trim().replace(/\/+$/, '');
    const endpoint = `${cleanUrl}/models`;

    const headers: Record<string, string> = {};
    if (apiKey.trim()) {
      headers['Authorization'] = `Bearer ${apiKey.trim()}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(endpoint, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return { success: false, message: `Gagal mengambil daftar model (${res.status})`, models: [] };
    }

    const data = await res.json();
    let models: string[] = [];
    if (Array.isArray(data?.data)) {
      models = data.data.map((m: any) => String(m.id || m.name)).filter(Boolean);
    }

    return { success: true, models };
  } catch (err: any) {
    return { success: false, message: err.message, models: [] };
  }
}

export interface AutopilotSettingsData {
  enabled: boolean;
  provider: 'gemini' | 'groq' | '9router';
  status: 'published' | 'draft';
  length: 'ringkas' | 'standar' | 'mendalam';
  categories: string[];
  telegramNotify: boolean;
}

export async function getAutopilotSettings(): Promise<AutopilotSettingsData> {
  await ensureSettingsTableExists();

  try {
    const rows = await db.select().from(systemSettings);
    const map = new Map<string, string>();
    for (const r of rows) {
      map.set(r.key, r.value);
    }

    const enabled = map.get('autopilot_enabled') === 'true';
    const provider = (map.get('autopilot_provider') as any) || 'groq';
    const status = (map.get('autopilot_status') as any) || 'published';
    const length = (map.get('autopilot_length') as any) || 'standar';
    const telegramNotify = map.get('autopilot_telegram_notify') !== 'false';

    let categories = ['AI', 'Software', 'Hardware', 'Gadget', 'Infrastruktur'];
    try {
      const parsed = JSON.parse(map.get('autopilot_categories') || '[]');
      if (Array.isArray(parsed) && parsed.length > 0) {
        categories = parsed;
      }
    } catch {
      // default
    }

    return {
      enabled,
      provider,
      status,
      length,
      categories,
      telegramNotify,
    };
  } catch (error) {
    console.error('Failed to get autopilot settings:', error);
    return {
      enabled: false,
      provider: 'groq',
      status: 'published',
      length: 'standar',
      categories: ['AI', 'Software', 'Hardware', 'Gadget', 'Infrastruktur'],
      telegramNotify: true,
    };
  }
}

export async function saveAutopilotSettings(data: AutopilotSettingsData) {
  await ensureSettingsTableExists();

  const entries: [string, string][] = [
    ['autopilot_enabled', String(data.enabled)],
    ['autopilot_provider', data.provider],
    ['autopilot_status', data.status],
    ['autopilot_length', data.length],
    ['autopilot_categories', JSON.stringify(data.categories)],
    ['autopilot_telegram_notify', String(data.telegramNotify)],
  ];

  for (const [key, value] of entries) {
    await db
      .insert(systemSettings)
      .values({ key, value, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: { value, updatedAt: new Date() },
      });
  }

  revalidatePath('/admin/pengaturan');

  return { success: true, message: 'Pengaturan Autopilot berhasil disimpan!' };
}

export async function triggerAutopilotNowAction() {
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
    revalidatePath('/admin/generator');

    return { success: response.ok, ...data };
  } catch (error: any) {
    return { success: false, message: error.message || 'Gagal menjalankan Autopilot' };
  }
}

export async function getCronConfigInfo() {
  const secret = process.env.CRON_SECRET || '';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.naratif.web.id';
  return {
    cronUrl: `${siteUrl}/api/cron/autopilot`,
    cronSecret: secret,
    siteUrl,
  };
}

