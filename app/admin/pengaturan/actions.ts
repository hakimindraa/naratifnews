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
