'use server';

import {
  getInstaboxConfig,
  updateInstaboxConfig,
  getInstaboxMachine,
  listInstaboxMachines,
  wakeInstaboxMachine,
  pauseInstaboxMachine,
  createInstaboxSshToken,
  execInstaboxCommand,
  runInstaboxKeepAlive,
  fetchInstaboxApi,
  getHermesUsageStats,
  checkHermesServiceHealth,
  InstaboxMachine,
  SshTokenResponse,
  ExecResult,
  HermesUsageStats,
  HermesServiceHealth,
} from '@/lib/instabox';
import { db } from '@/db';
import { systemSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { sendTelegramMessage } from '@/lib/telegram';

export interface DashboardData {
  config: {
    apiKeyConfigured: boolean;
    maskedApiKey: string;
    apiUrl: string;
    machineId: string;
    autoKeepaliveEnabled: boolean;
    notifyOnWake: boolean;
    cronUrl: string;
    cronSecret: string;
    telegramConfigured: boolean;
    telegramAdminChatId: string;
  };
  machine: InstaboxMachine | null;
  allMachines: InstaboxMachine[];
  usageStats: HermesUsageStats;
  lastKeepalive: {
    timestamp: string;
    machineId: string;
    status: string;
    isSuspended: boolean;
  } | null;
  error?: string;
}

/**
 * Mengambil seluruh data yang dibutuhkan untuk dashboard Instabox
 */
export async function getInstaboxDashboardData(): Promise<DashboardData> {
  const config = await getInstaboxConfig();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.adafakta.web.id';
  const cronSecret = process.env.CRON_SECRET || '';
  const cronUrl = `${siteUrl}/api/cron/instabox-keepalive${cronSecret ? `?secret=${cronSecret}` : ''}`;

  const telegramToken = process.env.TELEGRAM_BOT_TOKEN || '';
  const telegramAdminChatId =
    process.env.TELEGRAM_ADMIN_CHAT_ID ||
    process.env.TELEGRAM_ALLOWED_CHAT_ID ||
    '';

  let maskedApiKey = '';
  if (config.apiKey) {
    maskedApiKey =
      config.apiKey.length > 12
        ? `${config.apiKey.slice(0, 7)}...${config.apiKey.slice(-4)}`
        : '••••••••••••';
  }

  // Ambil log keepalive terakhir dari database
  let lastKeepalive = null;
  try {
    const row = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, 'instabox_last_keepalive'))
      .limit(1);
    if (row.length > 0 && row[0].value) {
      lastKeepalive = JSON.parse(row[0].value);
    }
  } catch (e) {
    // Non-fatal
  }

  // Jika belum ada API key, kembalikan data minimal tanpa error crash
  if (!config.apiKey) {
    return {
      config: {
        apiKeyConfigured: false,
        maskedApiKey: '',
        apiUrl: config.apiUrl,
        machineId: config.machineId,
        autoKeepaliveEnabled: config.autoKeepaliveEnabled,
        notifyOnWake: config.notifyOnWake,
        cronUrl,
        cronSecret,
        telegramConfigured: Boolean(telegramToken),
        telegramAdminChatId,
      },
      machine: null,
      allMachines: [],
      usageStats: {
        usedHours: 0,
        maxHours: 8.0,
        remainingHours: 8.0,
        percentage: 0,
        statusLevel: 'safe',
        continuousRunMinutes: 0,
        continuousRunFormatted: '0 menit',
      },
      lastKeepalive,
      error: 'INSTABOX_API_KEY belum dikonfigurasi. Silakan masukkan API Key di panel pengaturan bawah atau di file .env.local',
    };
  }

  // Ambil list mesin dan detail mesin
  let machine: InstaboxMachine | null = null;
  let allMachines: InstaboxMachine[] = [];
  let error: string | undefined = undefined;

  const [machineRes, listRes] = await Promise.all([
    getInstaboxMachine(config.machineId),
    listInstaboxMachines(),
  ]);

  if (machineRes.success && machineRes.machine) {
    machine = machineRes.machine;
  } else {
    error = machineRes.error;
  }

  if (listRes.success && listRes.machines) {
    allMachines = listRes.machines;
  }

  const usageStats = await getHermesUsageStats(machine);

  return {
    config: {
      apiKeyConfigured: true,
      maskedApiKey,
      apiUrl: config.apiUrl,
      machineId: config.machineId || machine?.id || '',
      autoKeepaliveEnabled: config.autoKeepaliveEnabled,
      notifyOnWake: config.notifyOnWake,
      cronUrl,
      cronSecret,
      telegramConfigured: Boolean(telegramToken),
      telegramAdminChatId,
    },
    machine,
    allMachines,
    usageStats,
    lastKeepalive,
    error,
  };
}

/**
 * Server action: Wake Up mesin
 */
export async function wakeMachineAction(targetMachineId?: string) {
  try {
    const res = await wakeInstaboxMachine(targetMachineId);
    revalidatePath('/admin/instabox');
    return res;
  } catch (err: any) {
    return { success: false, message: err?.message || 'Gagal menjalankan wake up', error: err?.message };
  }
}

/**
 * Server action: Pause mesin manual
 */
export async function pauseMachineAction(targetMachineId?: string) {
  try {
    const res = await pauseInstaboxMachine(targetMachineId);
    revalidatePath('/admin/instabox');
    return res;
  } catch (err: any) {
    return { success: false, error: err?.message, message: 'Gagal mem-pause mesin' };
  }
}

/**
 * Server action: Deep Health Check untuk proses Hermes
 */
export async function checkHermesHealthAction(targetMachineId?: string): Promise<HermesServiceHealth> {
  return await checkHermesServiceHealth(targetMachineId);
}

/**
 * Server action: Eksekusi perintah bash (Mini Terminal)
 */
export async function runCommandAction(cmd: string, targetMachineId?: string): Promise<ExecResult> {
  try {
    return await execInstaboxCommand(cmd, targetMachineId, 30);
  } catch (err: any) {
    return { exitCode: -1, stderr: err?.message || 'Gagal menjalankan perintah terminal' };
  }
}

/**
 * Server action: Buat SSH token sekali klik
 */
export async function generateSshTokenAction(
  name = 'admin-naratif-console',
  targetMachineId?: string
): Promise<{ success: boolean; tokenData?: SshTokenResponse; error?: string }> {
  try {
    return await createInstaboxSshToken(name, 3600 * 24, targetMachineId);
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

/**
 * Server action: Trigger Keepalive sekarang (manual test)
 */
export async function triggerKeepaliveAction() {
  try {
    const res = await runInstaboxKeepAlive();
    revalidatePath('/admin/instabox');
    return res;
  } catch (err: any) {
    return { success: false, message: err?.message, actionTaken: 'error' as const, machineId: '' };
  }
}

/**
 * Server action: Simpan konfigurasi
 */
export async function saveInstaboxConfigAction(formData: {
  apiKey?: string;
  machineId?: string;
  autoKeepaliveEnabled?: boolean;
  notifyOnWake?: boolean;
}) {
  try {
    await updateInstaboxConfig(formData);
    revalidatePath('/admin/instabox');
    return { success: true, message: 'Pengaturan Instabox berhasil disimpan!' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Gagal menyimpan pengaturan' };
  }
}

/**
 * Server action: Uji coba kirim notifikasi Telegram
 */
export async function testTelegramNotificationAction() {
  const adminChatId =
    process.env.TELEGRAM_ADMIN_CHAT_ID ||
    process.env.TELEGRAM_ALLOWED_CHAT_ID ||
    '';

  if (!adminChatId) {
    return { success: false, error: 'TELEGRAM_ADMIN_CHAT_ID belum disetel di .env.local' };
  }

  const timeStr = new Date().toLocaleTimeString('id-ID', {
    timeZone: 'Asia/Jakarta',
  });

  const msg = [
    `🔔 <b>UJI COBA NOTIFIKASI INSTABOX</b>`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `Halo! Koneksi antara Dasbor Admin Naratif dan Telegram Bot berhasil terhubung dengan sempurna.`,
    ``,
    `⏱️ <b>Waktu Uji:</b> ${timeStr} WIB`,
    `🤖 <b>Status Bot:</b> Siap menerima perintah <code>/vps</code>, <code>/wake</code>, dan <code>/ssh</code>.`,
  ].join('\n');

  const res = await sendTelegramMessage(adminChatId, msg, {
    parseMode: 'HTML',
    inlineKeyboard: [[{ text: '🖥️ Cek Status VPS', callback_data: 'vps:status' }]],
  });

  return res;
}

