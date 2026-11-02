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
  runStartedAt?: string | null;
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
 * Format string tanggal UTC / Cooldown menjadi teks bahasa Indonesia WIB yang ramah.
 * Fungsi ini murni beroperasi di browser/client tanpa dependency ke Node.js runtime.
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

