import { db } from '@/db';
import { systemSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

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
    // Jika 409 operation_conflict, bisa jadi sedang proses waking
    if (res.status === 409) {
      return {
        success: true,
        message: 'Mesin sedang dalam proses dibangunkan / operasi lain berjalan.',
        data: res.data,
      };
    }
    return {
      success: false,
      message: res.error || 'Gagal membangunkan mesin Instabox.',
      error: res.error,
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
 * Logika Inti Keep-Alive:
 * Dipanggil berkala oleh Cron Job untuk memastikan mesin tidak ter-pause 30 menit.
 */
export async function runInstaboxKeepAlive(): Promise<{
  success: boolean;
  actionTaken: 'woken' | 'pinged' | 'skipped_disabled' | 'error';
  machineId: string;
  previousStatus?: string;
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
          }),
          updatedAt: new Date(),
        },
      });
  } catch (e) {
    // Non-critical
  }

  // 2. Jika mesin sedang tertidur (idle pause), bangunkan!
  if (isSuspendedOrPaused) {
    const wakeRes = await wakeInstaboxMachine(machine.id);
    return {
      success: wakeRes.success,
      actionTaken: 'woken',
      machineId: machine.id,
      previousStatus: currentStatus,
      message: `Mesin sempat tertidur (${currentStatus}). Berhasil memicu Wake Up.`,
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

