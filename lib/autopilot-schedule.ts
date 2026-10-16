import { db } from '@/db';
import { systemSettings } from '@/db/schema';

export interface AutopilotScheduleInfo {
  isEnabled: boolean;
  statusMode: string;
  provider: string;
  nextCategory: string;
  nextRunTime: string;
  nextRunLabel: string;
  countdown: string;
}

/**
 * Menghitung jadwal eksekusi autopilot berikutnya secara cerdas
 * Menggunakan sinkronisasi cron-job.org jika tersedia, atau fallback ke slot rilis redaksi (07:00, 13:00, 19:00 WIB)
 */
export async function getAutopilotScheduleInfo(): Promise<AutopilotScheduleInfo> {
  const settingsRows = await db.select().from(systemSettings);
  const settingsMap = new Map<string, string>();
  for (const r of settingsRows) {
    settingsMap.set(r.key, r.value);
  }

  const isEnabled = settingsMap.get('autopilot_enabled') === 'true';
  const provider = settingsMap.get('autopilot_provider') || '9router';
  const statusMode = settingsMap.get('autopilot_status') || 'draft';
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

  let nextRunTime = '';
  let nextRunLabel = '';
  let countdown = '';

  const now = new Date();

  // 1. Cek API cron-job.org jika API Key tersedia
  let jobNextExecution: string | null = null;
  if (cronjobApiKey.trim()) {
    try {
      const res = await fetch('https://api.cron-job.org/jobs', {
        headers: { Authorization: `Bearer ${cronjobApiKey.trim()}` },
        cache: 'no-store',
      });
      if (res.ok) {
        const json = await res.json();
        const autopilotJob = (json.jobs || []).find((j: any) => j.url?.includes('/api/cron/autopilot'));
        if (autopilotJob && autopilotJob.nextExecution) {
          jobNextExecution = new Date(autopilotJob.nextExecution * 1000).toISOString();
        }
      }
    } catch {}
  }

  if (jobNextExecution) {
    const target = new Date(jobNextExecution);
    nextRunTime = target.toISOString();
    const diffMs = target.getTime() - now.getTime();
    const timeStr = target.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }) + ' WIB';
    const isToday = target.toDateString() === now.toDateString();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = target.toDateString() === tomorrow.toDateString();
    const dayPrefix = isToday ? 'Hari ini' : isTomorrow ? 'Besok' : target.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

    nextRunLabel = `${dayPrefix}, ${timeStr}`;
    if (diffMs <= 0) {
      countdown = 'Sedang berjalan';
    } else {
      const totalMin = Math.round(diffMs / (1000 * 60));
      const hours = Math.floor(totalMin / 60);
      const mins = totalMin % 60;
      countdown = hours > 0 ? `${hours} jam ${mins} mnt lagi` : `${mins} mnt lagi`;
    }
  } else {
    // 2. Fallback cerdas ke slot jadwal rilis redaksi Ada Fakta (07:00, 13:00, 19:00 WIB)
    const nowWib = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    const currentHour = nowWib.getHours();
    const currentMinute = nowWib.getMinutes();
    const currentDecimalTime = currentHour + currentMinute / 60;

    const slots = [7, 13, 19];
    let targetHour = slots[0];
    let isTomorrow = false;

    if (currentDecimalTime < 7) {
      targetHour = 7;
    } else if (currentDecimalTime < 13) {
      targetHour = 13;
    } else if (currentDecimalTime < 19) {
      targetHour = 19;
    } else {
      targetHour = 7;
      isTomorrow = true;
    }

    const targetDateWib = new Date(nowWib);
    if (isTomorrow) {
      targetDateWib.setDate(targetDateWib.getDate() + 1);
    }
    targetDateWib.setHours(targetHour, 0, 0, 0);

    nextRunTime = targetDateWib.toISOString();
    const diffMs = targetDateWib.getTime() - nowWib.getTime();
    const totalMin = Math.max(0, Math.round(diffMs / (1000 * 60)));
    const hours = Math.floor(totalMin / 60);
    const mins = totalMin % 60;

    nextRunLabel = `${isTomorrow ? 'Besok' : 'Hari ini'}, ${String(targetHour).padStart(2, '0')}:00 WIB`;
    countdown = hours > 0 ? `${hours} jam ${mins} mnt lagi` : mins > 0 ? `${mins} mnt lagi` : 'Segera berjalan';
  }

  return {
    isEnabled,
    statusMode,
    provider,
    nextCategory,
    nextRunTime,
    nextRunLabel,
    countdown,
  };
}
