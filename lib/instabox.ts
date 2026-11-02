import { db } from '@/db';
import { systemSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { sendTelegramMessage } from '@/lib/telegram';

export interface InstaboxMachine {
  id: string;
  name?: string;
  state?: 'running' | 'paused' | 'suspended' | 'stopped' | 'creating' | string;
  desiredState?: string;
  status?: string;
  autoSuspendedAt?: string | null;
  autoSuspendAfterSeconds?: number;
  maxRunMinutes?: number;
  cooldownUntil?: string | null;
  spec?: {
    vcpus?: number;
    memMiB?: number;
    persistentDiskGiB?: number;
    rootDiskGiB?: number;
  };
  storage?: {
    sizeGiB?: number;
    mountPath?: string;
    persistent?: boolean;
  };
  createdAt?: string;
  updatedAt?: string;
  ip?: string;
  templateId?: string;
  [key: string]: any;
}

export interface SshTokenResponse {
  id: string;
  name?: string;
  machineId: string;
  host: string;
  port: number;
  token: string;
  command: string;
  expiresAt: string;
  hostKeyFingerprint?: string;
}

export interface ExecResult {
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  error?: string;
}

export interface HermesUsageStats {
  usedHours: number;
  maxHours: number;
  remainingHours: number;
  percentage: number;
  statusLevel: 'safe' | 'warning' | 'critical';
  continuousRunMinutes: number;
  continuousRunFormatted: string;
}

export interface HermesServiceHealth {
  isHealthy: boolean;
  serviceState: 'active' | 'starting' | 'stopped' | 'unknown';
  processSummary: string;
  checkedAt: string;
}

/**
 * Format string tanggal UTC / Cooldown menjadi teks bahasa Indonesia WIB yang ramah
 */
export function formatCooldownTime(isoString?: string | null): {
  formatted: string;
  remainingText: string;
  isExpired: boolean;
} {
  if (!isoString) {
    return { formatted: '-', remainingText: '-', isExpired: true };
  }

  const targetDate = new Date(isoString);
  const now = new Date();
  const diffMs = targetDate.getTime() - now.getTime();

  if (diffMs <= 0 || isNaN(diffMs)) {
    return { formatted: '-', remainingText: 'Selesai', isExpired: true };
  }

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;

  const remainingText =
    hours > 0 ? `${hours} jam ${minutes} menit lagi` : `${minutes} menit lagi`;

  const formatted =
    targetDate.toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }) + ' WIB';

  return { formatted, remainingText, isExpired: false };
}

/**
 * Mengambil kredensial Instabox dari .env atau fallback ke systemSettings (database)
 */
export async function getInstaboxConfig(): Promise<{
  apiKey: string;
  apiUrl: string;
  machineId: string;
  autoKeepaliveEnabled: boolean;
  notifyOnWake: boolean;
}> {
  let apiKey = process.env.INSTABOX_API_KEY || '';
  let apiUrl = process.env.INSTABOX_API_URL || 'https://api.instabox.sh';
  let machineId = process.env.INSTABOX_MACHINE_ID || '';
  let autoKeepaliveEnabled = true;
  let notifyOnWake = true;

  try {
    const settings = await db.select().from(systemSettings);
    for (const item of settings) {
      if (item.key === 'instabox_api_key' && item.value && !apiKey) {
        apiKey = item.value;
      }
      if (item.key === 'instabox_api_url' && item.value) {
        apiUrl = item.value;
      }
      if (item.key === 'instabox_machine_id' && item.value && !machineId) {
        machineId = item.value;
      }
      if (item.key === 'instabox_auto_keepalive') {
        autoKeepaliveEnabled = item.value === 'true' || item.value === '1';
      }
      if (item.key === 'instabox_notify_on_wake') {
        notifyOnWake = item.value === 'true' || item.value === '1';
      }
    }
  } catch (err) {
    // Abaikan jika DB belum siap atau offline saat build
  }

  return { apiKey, apiUrl, machineId, autoKeepaliveEnabled, notifyOnWake };
}

/**
 * Menyimpan konfigurasi Instabox ke database
 */
export async function updateInstaboxConfig(updates: {
  apiKey?: string;
  machineId?: string;
  autoKeepaliveEnabled?: boolean;
  notifyOnWake?: boolean;
}): Promise<void> {
  const entries: { key: string; value: string }[] = [];

  if (updates.apiKey !== undefined) {
    entries.push({ key: 'instabox_api_key', value: updates.apiKey });
  }
  if (updates.machineId !== undefined) {
    entries.push({ key: 'instabox_machine_id', value: updates.machineId });
  }
  if (updates.autoKeepaliveEnabled !== undefined) {
    entries.push({ key: 'instabox_auto_keepalive', value: String(updates.autoKeepaliveEnabled) });
  }
  if (updates.notifyOnWake !== undefined) {
    entries.push({ key: 'instabox_notify_on_wake', value: String(updates.notifyOnWake) });
  }

  for (const entry of entries) {
    await db
      .insert(systemSettings)
      .values({ key: entry.key, value: entry.value, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: { value: entry.value, updatedAt: new Date() },
      });
  }
}

/**
 * Fetch wrapper untuk Instabox API dengan auto X-API-Key dan Idempotency-Key
 */
export async function fetchInstaboxApi<T = any>(
  endpoint: string,
  options: {
    method?: string;
    body?: any;
    overrideApiKey?: string;
    overrideApiUrl?: string;
    requiresIdempotency?: boolean;
    timeoutSeconds?: number;
  } = {}
): Promise<{ success: boolean; data?: T; status: number; error?: string }> {
  const { apiKey, apiUrl } = await getInstaboxConfig();
  const key = options.overrideApiKey || apiKey;
  const baseUrl = (options.overrideApiUrl || apiUrl).replace(/\/$/, '');

  if (!key) {
    return {
      success: false,
      status: 401,
      error: 'INSTABOX_API_KEY belum dikonfigurasi. Buat key di https://dashboard.instabox.sh/dashboard/api-keys',
    };
  }

  const method = (options.method || 'GET').toUpperCase();
  const headers: Record<string, string> = {
    'X-API-Key': key,
    'Accept': 'application/json',
  };

  if (options.body && method !== 'GET' && method !== 'HEAD') {
    headers['Content-Type'] = 'application/json';
  }

  // Idempotency-Key diperlukan untuk operasi lifecycle (POST, DELETE, PUT)
  if (options.requiresIdempotency || (method !== 'GET' && method !== 'HEAD' && !endpoint.includes('/exec'))) {
    headers['Idempotency-Key'] = crypto.randomUUID();
  }

  const url = `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), (options.timeoutSeconds || 30) * 1000);

    const response = await fetch(url, {
      method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
      cache: 'no-store',
    });

    clearTimeout(timeout);

    const status = response.status;
    const text = await response.text();
    let data: any = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!response.ok) {
      const errorMsg =
        data?.error?.message ||
        data?.message ||
        (typeof data === 'string' ? data : `Instabox API HTTP Error: ${status}`);
      return { success: false, status, error: errorMsg, data };
    }

    return { success: true, status, data: data as T };
  } catch (err: any) {
    const isTimeout = err?.name === 'AbortError';
    return {
      success: false,
      status: isTimeout ? 504 : 500,
      error: isTimeout ? 'Request timeout ke Instabox API' : err?.message || 'Gagal menghubungi Instabox API',
    };
  }
}

/**
 * Ambil daftar semua machine
 */
export async function listInstaboxMachines(): Promise<{
  success: boolean;
  machines: InstaboxMachine[];
  error?: string;
}> {
  const res = await fetchInstaboxApi<{ machines?: InstaboxMachine[] } | InstaboxMachine[]>('/v1/machines');
  if (!res.success) {
    return { success: false, machines: [], error: res.error };
  }

  let list: InstaboxMachine[] = [];
  if (Array.isArray(res.data)) {
    list = res.data;
  } else if (res.data && Array.isArray((res.data as any).machines)) {
    list = (res.data as any).machines;
  }

  return { success: true, machines: list };
}

/**
 * Mengambil detail machine tertentu
 */
export async function getInstaboxMachine(targetMachineId?: string): Promise<{
  success: boolean;
  machine?: InstaboxMachine;
  error?: string;
}> {
  const config = await getInstaboxConfig();
  let mId = targetMachineId || config.machineId;

  // Jika machineId belum disetel, coba ambil machine pertama dari list
  if (!mId) {
    const listRes = await listInstaboxMachines();
    if (listRes.success && listRes.machines.length > 0) {
      mId = listRes.machines[0].id;
    } else {
      return { success: false, error: 'Tidak ada INSTABOX_MACHINE_ID yang ditentukan atau ditemukan di akun Anda.' };
    }
  }

  const res = await fetchInstaboxApi<InstaboxMachine>(`/v1/machines/${encodeURIComponent(mId)}`);
  if (!res.success) {
    return { success: false, error: res.error };
  }

  return { success: true, machine: res.data };
}

/**
 * Bangunkan mesin Instabox (Wake / Resume)
 */
export async function wakeInstaboxMachine(targetMachineId?: string): Promise<{
  success: boolean;
  message: string;
  isCooldown?: boolean;
  operationId?: string;
  data?: any;
  error?: string;
}> {
  const config = await getInstaboxConfig();
  let mId = targetMachineId || config.machineId;

  if (!mId) {
    const listRes = await listInstaboxMachines();
    if (listRes.success && listRes.machines.length > 0) {
      mId = listRes.machines[0].id;
    } else {
      return { success: false, message: 'Machine ID tidak ditemukan', error: 'Machine ID tidak disetel.' };
    }
  }

  // Sesuai dokumentasi: POST /v1/machines/{id}/wake
  const res = await fetchInstaboxApi(`/v1/machines/${encodeURIComponent(mId)}/wake`, {
    method: 'POST',
    requiresIdempotency: true,
  });

  if (!res.success) {
    const errCode = res.data?.error?.code || '';
    if (errCode === 'machine_cooldown' || res.error?.includes('cooling down')) {
      return {
        success: false,
        isCooldown: true,
        message: res.data?.error?.message || res.error || 'Mesin sedang dalam masa istirahat (cooldown).',
        error: res.data?.error?.message || res.error,
        data: res.data,
      };
    }

    // Jika 409 operation_conflict, bisa jadi sedang proses waking
    if (res.status === 409 && (errCode === 'operation_conflict' || !errCode)) {
      return {
        success: true,
        message: 'Mesin sedang dalam proses dibangunkan / operasi lain berjalan.',
        data: res.data,
      };
    }
    return {
      success: false,
      isCooldown: false,
      message: res.error || 'Gagal membangunkan mesin Instabox.',
      error: res.error,
      data: res.data,
    };
  }

  return {
    success: true,
    message: 'Perintah wake up berhasil dikirim ke Instabox.',
    operationId: res.data?.id || res.data?.operationId,
    data: res.data,
  };
}

/**
 * Menjalankan perintah bash remote di mesin via API /exec
 */
export async function execInstaboxCommand(
  cmd: string,
  targetMachineId?: string,
  timeoutSeconds = 30
): Promise<ExecResult> {
  const config = await getInstaboxConfig();
  let mId = targetMachineId || config.machineId;

  if (!mId) {
    const listRes = await listInstaboxMachines();
    if (listRes.success && listRes.machines.length > 0) {
      mId = listRes.machines[0].id;
    } else {
      return { error: 'Machine ID belum disetel.' };
    }
  }

  const res = await fetchInstaboxApi<ExecResult>(`/v1/machines/${encodeURIComponent(mId)}/exec`, {
    method: 'POST',
    body: {
      cmd,
      timeoutSeconds: Math.min(timeoutSeconds, 300),
    },
    timeoutSeconds: timeoutSeconds + 5,
  });

  if (!res.success) {
    return {
      exitCode: -1,
      stderr: res.error || 'Gagal mengeksekusi perintah.',
      error: res.error,
    };
  }

  return res.data || { stdout: '', stderr: '', exitCode: 0 };
}

/**
 * Buat One-Click SSH Token untuk remote akses terminal instan
 */
export async function createInstaboxSshToken(
  name = 'admin-naratif',
  ttlSeconds = 3600 * 24, // 1 hari
  targetMachineId?: string
): Promise<{ success: boolean; tokenData?: SshTokenResponse; error?: string }> {
  const config = await getInstaboxConfig();
  let mId = targetMachineId || config.machineId;

  if (!mId) {
    const listRes = await listInstaboxMachines();
    if (listRes.success && listRes.machines.length > 0) {
      mId = listRes.machines[0].id;
    } else {
      return { success: false, error: 'Machine ID belum disetel.' };
    }
  }

  const res = await fetchInstaboxApi<SshTokenResponse>(
    `/v1/machines/${encodeURIComponent(mId)}/ssh-tokens`,
    {
      method: 'POST',
      body: { name, ttlSeconds },
      requiresIdempotency: false,
    }
  );

  if (!res.success) {
    return { success: false, error: res.error };
  }

  return { success: true, tokenData: res.data };
}

/**
 * Pause / Tidurkan mesin Instabox secara manual
 */
export async function pauseInstaboxMachine(targetMachineId?: string): Promise<{
  success: boolean;
  message: string;
  error?: string;
}> {
  const config = await getInstaboxConfig();
  const mId = targetMachineId || config.machineId;
  if (!mId) return { success: false, message: 'Machine ID tidak ditemukan', error: 'Machine ID belum disetel.' };

  const res = await fetchInstaboxApi(`/v1/machines/${encodeURIComponent(mId)}/pause`, {
    method: 'POST',
    requiresIdempotency: true,
  });

  return {
    success: res.success,
    message: res.success ? 'Mesin berhasil dipause/ditidurkan.' : res.error || 'Gagal mem-pause mesin.',
    error: res.error,
  };
}

/**
 * Hitung statistik penggunaan kuota jam harian (0 - 8 jam) dan durasi nonstop
 */
export async function getHermesUsageStats(machine?: InstaboxMachine | null): Promise<HermesUsageStats> {
  const maxHours = machine?.maxRunMinutes ? machine.maxRunMinutes / 60 : 8.0;

  let continuousRunMinutes = 0;
  if (machine?.runStartedAt && (machine.state === 'running' || machine.status === 'running')) {
    const started = new Date(machine.runStartedAt).getTime();
    const now = Date.now();
    if (now > started) {
      continuousRunMinutes = Math.floor((now - started) / (1000 * 60));
    }
  }

  const hoursRun = Math.floor(continuousRunMinutes / 60);
  const minsRun = continuousRunMinutes % 60;
  const continuousRunFormatted = hoursRun > 0 ? `${hoursRun} jam ${minsRun} menit` : `${minsRun} menit`;

  // Pemakaian berdasarkan durasi sesi berjalan saat ini
  const usedHours = Math.min(maxHours, Math.round((continuousRunMinutes / 60) * 10) / 10);
  const remainingHours = Math.max(0, Math.round((maxHours - usedHours) * 10) / 10);
  const percentage = Math.min(100, Math.round((usedHours / maxHours) * 100));

  let statusLevel: 'safe' | 'warning' | 'critical' = 'safe';
  if (percentage >= 80 || continuousRunMinutes >= 390) statusLevel = 'critical'; // >6.5 jam
  else if (percentage >= 50 || continuousRunMinutes >= 240) statusLevel = 'warning'; // >4 jam

  return {
    usedHours,
    maxHours,
    remainingHours,
    percentage,
    statusLevel,
    continuousRunMinutes,
    continuousRunFormatted,
  };
}

/**
 * Deep Probe: Cek kesehatan proses dan aplikasi Hermes di dalam VPS Linux
 */
export async function checkHermesServiceHealth(targetMachineId?: string): Promise<HermesServiceHealth> {
  const checkedAt = new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' }) + ' WIB';
  try {
    const execRes = await execInstaboxCommand(
      'pgrep -a -f -i hermes || pgrep -a python3 || pgrep -a node || ps aux | head -n 8',
      targetMachineId,
      10
    );

    if (execRes.error) {
      return {
        isHealthy: false,
        serviceState: 'unknown',
        processSummary: execRes.error,
        checkedAt,
      };
    }

    const output = (execRes.stdout || '').trim();
    const isHermesFound = /hermes/i.test(output);
    const isProcessAlive = output.length > 0;

    return {
      isHealthy: isProcessAlive,
      serviceState: isHermesFound ? 'active' : isProcessAlive ? 'starting' : 'stopped',
      processSummary: output.slice(0, 600) || 'Tidak ada proses terdeteksi',
      checkedAt,
    };
  } catch (err: any) {
    return {
      isHealthy: false,
      serviceState: 'unknown',
      processSummary: err?.message || 'Gagal menghubungi service Hermes',
      checkedAt,
    };
  }
}

/**
 * Logika Inti Keep-Alive:
 * Dipanggil berkala oleh Cron Job untuk memastikan mesin tidak ter-pause 30 menit.
 */
export async function runInstaboxKeepAlive(): Promise<{
  success: boolean;
  actionTaken: 'woken' | 'pinged' | 'skipped_disabled' | 'skipped_cooldown' | 'error';
  machineId: string;
  previousStatus?: string;
  cooldownUntil?: string | null;
  message: string;
  details?: any;
}> {
  const config = await getInstaboxConfig();

  if (!config.apiKey) {
    return {
      success: false,
      actionTaken: 'error',
      machineId: '',
      message: 'INSTABOX_API_KEY belum dikonfigurasi.',
    };
  }

  if (!config.autoKeepaliveEnabled) {
    return {
      success: true,
      actionTaken: 'skipped_disabled',
      machineId: config.machineId,
      message: 'Auto Keep-Alive sedang dinonaktifkan di pengaturan.',
    };
  }

  // 1. Dapatkan detail machine
  const machineRes = await getInstaboxMachine();
  if (!machineRes.success || !machineRes.machine) {
    return {
      success: false,
      actionTaken: 'error',
      machineId: config.machineId,
      message: machineRes.error || 'Gagal membaca status mesin Instabox.',
    };
  }

  const machine = machineRes.machine;
  const currentStatus = (machine.state || machine.status || '').toLowerCase();
  const isSuspendedOrPaused =
    currentStatus === 'paused' ||
    currentStatus === 'suspended' ||
    Boolean(machine.autoSuspendedAt);

  const nowIso = new Date().toISOString();

  // Catat riwayat keep-alive di systemSettings
  try {
    await db
      .insert(systemSettings)
      .values({
        key: 'instabox_last_keepalive',
        value: JSON.stringify({
          timestamp: nowIso,
          machineId: machine.id,
          status: currentStatus,
          isSuspended: isSuspendedOrPaused,
          cooldownUntil: machine.cooldownUntil || null,
        }),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: {
          value: JSON.stringify({
            timestamp: nowIso,
            machineId: machine.id,
            status: currentStatus,
            isSuspended: isSuspendedOrPaused,
            cooldownUntil: machine.cooldownUntil || null,
          }),
          updatedAt: new Date(),
        },
      });
  } catch (e) {
    // Non-critical
  }

  // 1b. Smart Guard: Jika mesin sedang dalam masa istirahat (cooldown), lewati wake
  if (machine.cooldownUntil && new Date(machine.cooldownUntil).getTime() > Date.now()) {
    const cooldownInfo = formatCooldownTime(machine.cooldownUntil);
    return {
      success: true,
      actionTaken: 'skipped_cooldown',
      machineId: machine.id,
      previousStatus: currentStatus,
      cooldownUntil: machine.cooldownUntil,
      message: `Mesin sedang masa cooldown hingga ${cooldownInfo.formatted} (${cooldownInfo.remainingText}). Auto-wake dilewati.`,
      details: { cooldownUntil: machine.cooldownUntil, cooldownInfo },
    };
  }

  // 1c. Continuous Run Guard: Peringatan jika mesin sudah berjalan nonstop >= 3 Jam (180 Menit)
  if (machine.runStartedAt && currentStatus === 'running') {
    const started = new Date(machine.runStartedAt).getTime();
    const runMinutes = Math.floor((Date.now() - started) / (1000 * 60));

    if (runMinutes >= 180) {
      try {
        const lastAlertRow = await db
          .select()
          .from(systemSettings)
          .where(eq(systemSettings.key, 'hermes_last_3h_alert_session'))
          .limit(1);

        const lastAlertSession = lastAlertRow[0]?.value;

        if (lastAlertSession !== machine.runStartedAt) {
          const adminChatId =
            process.env.TELEGRAM_ADMIN_CHAT_ID ||
            process.env.TELEGRAM_ALLOWED_CHAT_ID ||
            '';

          if (adminChatId) {
            const hours = Math.floor(runMinutes / 60);
            const mins = runMinutes % 60;
            const alertMsg = [
              `🔔 <b>PERINGATAN DURASI AKTIF HERMES VPS</b>`,
              `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
              `Mesin Hermes telah menyala nonstop selama:`,
              `⏱️ <b>${hours} Jam ${mins} Menit</b>`,
              ``,
              `⚠️ <i>Batas maksimal nonstop Free Tier adalah 8 jam. Setelah 8 jam, mesin akan otomatis dikunci cooldown 24 jam!</i>`,
              ``,
              `💡 Jika pekerjaan dengan Hermes sudah selesai, tekan tombol di bawah untuk menidurkan mesin agar kuota harian tetap hemat dan aman.`,
            ].join('\n');

            await sendTelegramMessage(adminChatId, alertMsg, {
              parseMode: 'HTML',
              inlineKeyboard: [
                [{ text: '⏸️ Pause / Tidurkan Mesin Sekarang', callback_data: 'vps:pause' }],
                [{ text: '🖥️ Buka Status VPS', callback_data: 'vps:status' }],
              ],
            }).catch(() => {});

            await db
              .insert(systemSettings)
              .values({
                key: 'hermes_last_3h_alert_session',
                value: machine.runStartedAt,
                updatedAt: new Date(),
              })
              .onConflictDoUpdate({
                target: systemSettings.key,
                set: { value: machine.runStartedAt, updatedAt: new Date() },
              });
          }
        }
      } catch (e) {
        // Non-critical
      }
    }
  }

  // 2. Jika mesin sedang tertidur (idle pause), bangunkan!
  if (isSuspendedOrPaused) {
    const wakeRes = await wakeInstaboxMachine(machine.id);
    if (!wakeRes.success && (wakeRes as any).isCooldown) {
      return {
        success: true,
        actionTaken: 'skipped_cooldown',
        machineId: machine.id,
        previousStatus: currentStatus,
        cooldownUntil: machine.cooldownUntil,
        message: wakeRes.message,
        details: wakeRes,
      };
    }
    return {
      success: wakeRes.success,
      actionTaken: wakeRes.success ? 'woken' : 'error',
      machineId: machine.id,
      previousStatus: currentStatus,
      message: wakeRes.success
        ? `Mesin sempat tertidur (${currentStatus}). Berhasil memicu Wake Up.`
        : `Gagal memicu Wake Up: ${wakeRes.message}`,
      details: wakeRes,
    };
  }

  // 3. Jika mesin sudah running, kirim ping exec ringan untuk reset timer idle 30 menit
  const execRes = await execInstaboxCommand('echo keepalive', machine.id, 10);
  return {
    success: !execRes.error,
    actionTaken: 'pinged',
    machineId: machine.id,
    previousStatus: currentStatus,
    message: 'Mesin aktif (running). Berhasil mengirim sinyal refresh aktivitas.',
    details: execRes,
  };
}

