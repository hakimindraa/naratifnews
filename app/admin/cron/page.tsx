'use client';

import { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import {
  Timer,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Play,
  Copy,
  Check,
  ExternalLink,
  FileText,
  Sparkles,
  Clock,
  Key,
  Globe,
  ShieldCheck,
  Eye,
  EyeOff,
  Zap,
  ArrowRight,
  Send,
  Calendar,
  Layers,
} from 'lucide-react';
import {
  getCronHubData,
  triggerAutopilotAction,
  triggerPublishCheckAction,
  saveCronJobApiKeyAction,
  testIndexingPingAction,
  CronHubData,
  CronLogItem,
} from './actions';

function formatNextExecution(isoDate: string | null) {
  if (!isoDate) return 'Tidak dijadwalkan';
  const target = new Date(isoDate);
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();

  const timeStr = target.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
  const isToday = target.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = target.toDateString() === tomorrow.toDateString();

  const dayPrefix = isToday ? 'Hari ini' : isTomorrow ? 'Besok' : target.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

  if (diffMs <= 0) return `${dayPrefix}, ${timeStr} (segera berjalan)`;

  const totalMin = Math.round(diffMs / (1000 * 60));
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  const countdown = hours > 0 ? `${hours} jam ${mins} mnt lagi` : `${mins} menit lagi`;

  return `${dayPrefix}, ${timeStr} (${countdown})`;
}

function formatLastExecution(isoDate: string | null, durationMs?: number) {
  if (!isoDate) return 'Belum pernah jalan';
  const d = new Date(isoDate);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const dayStr = isToday ? 'Hari ini' : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  const timeStr = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
  const durStr = durationMs ? ` • ${(durationMs / 1000).toFixed(1)}s` : '';
  return `${dayStr}, ${timeStr}${durStr}`;
}

export default function CronHubPage() {
  const [data, setData] = useState<CronHubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Action states
  const [runningAutopilot, setRunningAutopilot] = useState(false);
  const [checkingPublish, setCheckingPublish] = useState(false);
  const [savingApiKey, setSavingApiKey] = useState(false);
  const [testingIndexing, setTestingIndexing] = useState(false);

  // UI toggles
  const [showSecret, setShowSecret] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [logFilter, setLogFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  const copyToClipboard = (text: string, key: string) => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast('info', 'Teks berhasil disalin ke clipboard!');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Muat data awal (On-Demand saat halaman dibuka)
  const loadData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      const hubData = await getCronHubData();
      setData(hubData);
      setApiKeyInput(hubData.config.cronjobApiKey || '');
      setLastRefreshedAt(new Date());
      if (isManualRefresh) {
        showToast('success', 'Data log & status cron berhasil disegarkan.');
      }
    } catch (err: any) {
      showToast('error', 'Gagal memuat data cron: ' + (err.message || 'Error server'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handler: Trigger Autopilot AI
  const handleTriggerAutopilot = async () => {
    if (runningAutopilot) return;
    setRunningAutopilot(true);
    showToast('info', 'Sedang menjalankan riset & pembuatan berita otomatis via AI...');

    try {
      const res = await triggerAutopilotAction();
      if (res.success) {
        showToast('success', `Autopilot Sukses! Berita baru "${res.title || 'Artikel'}" berhasil dibuat.`);
        await loadData();
      } else {
        showToast('error', res.message || 'Gagal menjalankan Autopilot AI.');
      }
    } catch (err: any) {
      showToast('error', 'Terjadi kesalahan: ' + (err.message || 'Unknown error'));
    } finally {
      setRunningAutopilot(false);
    }
  };

  // Handler: Trigger Publish Scheduled Articles
  const handleTriggerPublish = async () => {
    if (checkingPublish) return;
    setCheckingPublish(true);

    try {
      const res = await triggerPublishCheckAction();
      if (res.success) {
        showToast('success', res.message);
        await loadData();
      } else {
        showToast('error', res.message || 'Gagal memeriksa jadwal draf.');
      }
    } catch (err: any) {
      showToast('error', 'Terjadi kesalahan: ' + (err.message || 'Unknown error'));
    } finally {
      setCheckingPublish(false);
    }
  };

  // Handler: Save cron-job.org API Key
  const handleSaveApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingApiKey(true);
    try {
      const res = await saveCronJobApiKeyAction(apiKeyInput);
      if (res.success) {
        showToast('success', res.message);
        await loadData();
      } else {
        showToast('error', res.message);
      }
    } catch (err: any) {
      showToast('error', 'Gagal menyimpan API Key');
    } finally {
      setSavingApiKey(false);
    }
  };

  // Handler: Test Indexing Ping (Google & IndexNow)
  const handleTestIndexingPing = async () => {
    if (testingIndexing) return;
    setTestingIndexing(true);
    showToast('info', 'Sedang mengirim sinyal ping ke Google Indexing API & IndexNow...');

    try {
      const res = await testIndexingPingAction();
      if (res.success && res.result) {
        const gOk = res.result.google?.success;
        const iOk = res.result.indexNow?.success;
        const gStatus = res.result.google?.statusCode;
        const iStatus = res.result.indexNow?.statusCode;

        if (gOk && iOk) {
          showToast('success', `Luar biasa! Google (HTTP ${gStatus}) & IndexNow (HTTP ${iStatus}) sukses menerima sinyal!`);
        } else if (gOk) {
          showToast('success', `Google Indexing Sukses (HTTP ${gStatus}), IndexNow: HTTP ${iStatus}`);
        } else {
          showToast('error', `Google Error: ${res.result.google?.message}`);
        }
      } else {
        showToast('error', res.message || 'Gagal mengirim sinyal pengindeksan.');
      }
    } catch (err: any) {
      showToast('error', 'Terjadi kendala: ' + (err.message || 'Error'));
    } finally {
      setTestingIndexing(false);
    }
  };

  // Filter logs
  const filteredLogs = (data?.logs || []).filter((item) => {
    if (logFilter === 'success') return item.status !== 'failed';
    if (logFilter === 'failed') return item.status === 'failed';
    return true;
  });

  const successLogsCount = (data?.logs || []).filter((l) => l.status !== 'failed').length;
  const failedLogsCount = (data?.logs || []).filter((l) => l.status === 'failed').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 text-sm font-medium transition-all transform animate-in slide-in-from-bottom-5 ${
            toast.type === 'success'
              ? 'bg-emerald-600 text-white shadow-emerald-200/50'
              : toast.type === 'error'
              ? 'bg-rose-600 text-white shadow-rose-200/50'
              : 'bg-indigo-600 text-white shadow-indigo-200/50'
          }`}
        >
          {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 flex-shrink-0" />}
          {toast.type === 'error' && <XCircle className="w-5 h-5 flex-shrink-0" />}
          {toast.type === 'info' && <RefreshCw className="w-5 h-5 animate-spin flex-shrink-0" />}
          <p>{toast.message}</p>
        </div>
      )}

      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
              <Timer className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                Cron Job & Otomasi Redaksi
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                Pusat monitoring jadwal publikasi, riset autopilot AI, dan log eksekusi realtime.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {lastRefreshedAt && (
            <span className="text-xs text-gray-400 hidden lg:inline">
              Diperbarui: {lastRefreshedAt.toLocaleTimeString('id-ID')}
            </span>
          )}
          <button
            onClick={() => loadData(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 hover:text-gray-900 transition-colors disabled:opacity-50"
            title="Segarkan data log dan status"
          >
            <RefreshCw className={`w-4 h-4 text-gray-500 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
            <span>{refreshing ? 'Menyegarkan...' : 'Segarkan Log'}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-sm text-gray-500 font-medium">Memuat data pusat cron...</p>
        </div>
      ) : !data ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-gray-200">
          <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-gray-800">Gagal memuat status cron</p>
          <button
            onClick={() => loadData(true)}
            className="mt-3 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg"
          >
            Coba Lagi
          </button>
        </div>
      ) : (
        <>
          {/* Baris 1: 4 Kartu KPI Metrik Utama */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Status Autopilot */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Mode Autopilot
                </span>
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    data.config.autopilotEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'
                  }`}
                />
              </div>
              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-xl font-bold ${
                      data.config.autopilotEnabled ? 'text-emerald-700' : 'text-gray-600'
                    }`}
                  >
                    {data.config.autopilotEnabled ? 'Aktif Berjalan' : 'Nonaktif'}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Model AI:</span>
                  <span className="font-semibold uppercase text-gray-700">
                    {data.config.autopilotProvider}
                  </span>
                </div>
              </div>
            </div>

            {/* KPI 2: Berita AI Hari Ini */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Autopilot Hari Ini
                </span>
                <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-gray-900">
                    {data.metrics.todayAutopilotCount}
                  </span>
                  <span className="text-xs text-gray-500">artikel terbit</span>
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500 truncate">
                  <span>Giliran:</span>
                  <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-medium">
                    {data.config.nextCategory}
                  </span>
                </div>
              </div>
            </div>

            {/* KPI 3: Antrean Terjadwal */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Antrean Draf
                </span>
                <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-gray-900">
                    {data.metrics.scheduledCount}
                  </span>
                  <span className="text-xs text-gray-500">menunggu tayang</span>
                </div>
                <p className="mt-1 text-xs text-gray-500 truncate">
                  {data.metrics.nextScheduledTime
                    ? `Terdekat: ${new Date(data.metrics.nextScheduledTime).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })} WIB`
                    : 'Tidak ada jadwal terdekat'}
                </p>
              </div>
            </div>

            {/* KPI 4: Kesehatan Eksekusi */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Eksekusi Terakhir
                </span>
                <div
                  className={`p-1.5 rounded-lg ${
                    data.metrics.lastAutopilotStatus === 'success'
                      ? 'bg-emerald-50 text-emerald-600'
                      : data.metrics.lastAutopilotStatus === 'failed'
                      ? 'bg-rose-50 text-rose-600'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-xl font-bold ${
                      data.metrics.lastAutopilotStatus === 'success'
                        ? 'text-emerald-700'
                        : data.metrics.lastAutopilotStatus === 'failed'
                        ? 'text-rose-700'
                        : 'text-gray-600'
                    }`}
                  >
                    {data.metrics.lastAutopilotStatus === 'success'
                      ? '200 OK (Sukses)'
                      : data.metrics.lastAutopilotStatus === 'failed'
                      ? 'Ada Error'
                      : 'Belum Ada Run'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500 truncate">
                  {data.metrics.lastAutopilotTime
                    ? new Date(data.metrics.lastAutopilotTime).toLocaleString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Menunggu trigger pertama'}
                </p>
              </div>
            </div>
          </div>

          {/* Baris 2: Dua Kartu Kontrol Worker Utama */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Card 1: Autopilot Redaksi */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col justify-between">
              <div className="p-5 sm:p-6 border-b border-gray-100">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold border border-purple-100">
                      🤖
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-gray-900">
                        Naratif Autopilot AI
                      </h2>
                      <p className="text-xs text-gray-500">
                        Endpoint: <code className="text-purple-700 font-mono">/api/cron/autopilot</code>
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                      data.config.autopilotEnabled
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-gray-100 text-gray-600 border border-gray-200'
                    }`}
                  >
                    {data.config.autopilotEnabled ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>

                <p className="mt-4 text-xs sm:text-sm text-gray-600 leading-relaxed">
                  Secara otomatis meriset berita teknologi terkini dari Google News RSS, memverifikasi kemiripan dengan artikel sebelumnya (anti-duplikasi), menyusun artikel orisinal lengkap dengan tagar dan slug, lalu mengirim laporan ke Telegram Anda.
                </p>

                <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-gray-400 block">Status Hasil Berita:</span>
                    <span className="font-semibold text-gray-800 capitalize">
                      {data.config.autopilotStatus === 'published' ? '🚀 Langsung Tayang' : '📝 Masuk ke Draf'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Kategori Berikutnya:</span>
                    <span className="font-semibold text-purple-700">
                      📂 {data.config.nextCategory}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-5 bg-gray-50/70 border-t border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <Link
                  href="/admin/pengaturan"
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-1 justify-center sm:justify-start"
                >
                  <span>Atur Model & Kategori AI</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                <button
                  type="button"
                  onClick={handleTriggerAutopilot}
                  disabled={runningAutopilot}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-sm transition-all disabled:opacity-50"
                >
                  {runningAutopilot ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Memproses AI...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      <span>Uji Jalankan Sekarang</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Card 2: Scheduled Articles Publisher */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col justify-between">
              <div className="p-5 sm:p-6 border-b border-gray-100">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold border border-blue-100">
                      🚀
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-gray-900">
                        Penerbit Berita Terjadwal
                      </h2>
                      <p className="text-xs text-gray-500">
                        Endpoint: <code className="text-blue-700 font-mono">/api/cron/publish</code>
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    Standby (5m)
                  </span>
                </div>

                <p className="mt-4 text-xs sm:text-sm text-gray-600 leading-relaxed">
                  Memeriksa draf artikel yang telah Anda jadwalkan tayang di masa depan (<code className="text-xs font-mono text-gray-700">status = &apos;scheduled&apos;</code>). Saat waktu tayang tercapai, worker ini langsung menerbitkannya dan merevalidasi cache web Naratif secara instan.
                </p>

                <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-gray-400 block">Draf Menunggu:</span>
                    <span className="font-semibold text-gray-800">
                      {data.metrics.scheduledCount} Berita
                    </span>
                  </div>
                  <div className="truncate">
                    <span className="text-gray-400 block">Draf Terdekat:</span>
                    <span className="font-semibold text-blue-700 truncate block">
                      {data.metrics.nextScheduledTitle || 'Belum ada antrean'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-5 bg-gray-50/70 border-t border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <Link
                  href="/admin"
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-1 justify-center sm:justify-start"
                >
                  <span>Lihat Semua Draf di Dasbor</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                <button
                  type="button"
                  onClick={handleTriggerPublish}
                  disabled={checkingPublish}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-sm transition-all disabled:opacity-50"
                >
                  {checkingPublish ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Memeriksa...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      <span>Cek Antrean Sekarang</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Baris 3: Kredensial URL & Integrasi cron-job.org */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Kredensial Quick Copy */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-gray-900">
                  URL Endpoint & Header Otorisasi
                </h3>
              </div>
              <p className="text-xs text-gray-500">
                Gunakan kredensial berikut saat membuat jadwal baru di dashboard eksternal seperti cron-job.org atau serverless timer lainnya.
              </p>

              {/* URL 1: Autopilot */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600">URL Cron Autopilot AI:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={data.config.autopilotUrl}
                    className="flex-1 px-3 py-2 text-xs font-mono bg-gray-50 border border-gray-200 rounded-lg text-gray-700 select-all"
                  />
                  <button
                    onClick={() => copyToClipboard(data.config.autopilotUrl, 'autopilot_url')}
                    className="p-2 border border-gray-200 rounded-lg hover:bg-gray-100 text-gray-600"
                    title="Salin URL Autopilot"
                  >
                    {copiedKey === 'autopilot_url' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* URL 2: Publish */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600">URL Cron Penerbit Jadwal:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={data.config.publishUrl}
                    className="flex-1 px-3 py-2 text-xs font-mono bg-gray-50 border border-gray-200 rounded-lg text-gray-700 select-all"
                  />
                  <button
                    onClick={() => copyToClipboard(data.config.publishUrl, 'publish_url')}
                    className="p-2 border border-gray-200 rounded-lg hover:bg-gray-100 text-gray-600"
                    title="Salin URL Publish"
                  >
                    {copiedKey === 'publish_url' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Secret Header */}
              <div className="space-y-1 pt-1">
                <label className="text-xs font-semibold text-gray-600">
                  Header Otorisasi (Wajib):
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showSecret ? 'text' : 'password'}
                      readOnly
                      value={`Bearer ${data.config.cronSecret}`}
                      className="w-full px-3 py-2 text-xs font-mono bg-gray-50 border border-gray-200 rounded-lg text-gray-700 pr-10 select-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <button
                    onClick={() =>
                      copyToClipboard(`Bearer ${data.config.cronSecret}`, 'auth_header')
                    }
                    className="p-2 border border-gray-200 rounded-lg hover:bg-gray-100 text-gray-600"
                    title="Salin Header"
                  >
                    {copiedKey === 'auth_header' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-gray-400">
                  Header key: <code className="font-mono text-gray-600">Authorization</code> | Value: <code className="font-mono text-gray-600">Bearer &lt;CRON_SECRET&gt;</code>
                </p>
              </div>
            </div>

            {/* cron-job.org REST API Integration */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-sm font-bold text-gray-900">
                      Integrasi API cron-job.org
                    </h3>
                  </div>
                  <span
                    className={`px-2 py-0.5 text-[11px] font-semibold rounded-md ${
                      data.cronJobOrgStatus?.connected
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {data.cronJobOrgStatus?.connected ? 'Terhubung' : 'Opsional'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Masukkan API Key dari akun cron-job.org Anda (di menu <i>Account Settings → API Keys</i>) untuk memantau status ping dan waktu eksekusi berikutnya langsung dari halaman ini.
                </p>

                <form onSubmit={handleSaveApiKey} className="mt-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="password"
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      placeholder="Masukkan cron-job.org API Key..."
                      className="flex-1 px-3 py-2 text-xs font-mono bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800"
                    />
                    <button
                      type="submit"
                      disabled={savingApiKey}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all disabled:opacity-50"
                    >
                      {savingApiKey ? 'Menyimpan...' : 'Simpan'}
                    </button>
                  </div>
                </form>

                {/* Status Ping Luar & Jadwal cron-job.org Jika Terhubung */}
                {data.cronJobOrgStatus?.connected && data.cronJobOrgStatus.jobs.length > 0 && (
                  <div className="mt-4 p-3.5 bg-emerald-50/60 border border-emerald-100 rounded-xl space-y-3">
                    <div className="flex items-center justify-between text-xs text-emerald-900 font-bold">
                      <span className="flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Pekerjaan Aktif di cron-job.org:</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-semibold">
                        {data.cronJobOrgStatus.jobs.length} Job Terdaftar
                      </span>
                    </div>

                    <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                      {data.cronJobOrgStatus.jobs.map((j) => {
                        const isOk = j.lastStatus === 1 || j.lastStatus === 200;
                        const isHttpError = j.lastStatus === 4;

                        return (
                          <div
                            key={j.jobId}
                            className="p-3 bg-white rounded-xl border border-emerald-100/80 shadow-xs space-y-2 text-xs"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="truncate flex-1">
                                <span className="font-bold text-gray-900 block truncate text-xs sm:text-sm">
                                  {j.title || `Job #${j.jobId}`}
                                </span>
                                <span className="text-[10px] text-gray-400 block truncate font-mono">
                                  {j.url}
                                </span>
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex-shrink-0 border ${
                                  isOk
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : isHttpError
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-rose-50 text-rose-700 border-rose-200'
                                }`}
                              >
                                {isOk
                                  ? '🟢 200 OK'
                                  : isHttpError
                                  ? '🟠 HTTP Error (500 Terakhir)'
                                  : `Code: ${j.lastStatus}`}
                              </span>
                            </div>

                            {/* Detail Jadwal & Riwayat (Full-width tanpa kepotong) */}
                            <div className="space-y-1.5 pt-2 border-t border-gray-100 text-xs">
                              {/* Next Run Banner */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 bg-indigo-50/60 p-2 rounded-lg">
                                <div className="flex items-center gap-1.5 text-gray-700 font-medium">
                                  <Clock className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                                  <span>Jadwal Berikutnya:</span>
                                </div>
                                <span className="font-bold text-indigo-700 text-xs">
                                  {formatNextExecution(j.nextExecution)}
                                </span>
                              </div>

                              {/* Eksekusi Terakhir & Frekuensi */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 px-1 pt-0.5 text-[11px] text-gray-600">
                                <div className="flex items-center gap-1.5">
                                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                                  <span className="text-gray-400">Terakhir:</span>
                                  <span className="font-semibold text-gray-800">
                                    {formatLastExecution(j.lastExecution, j.lastDuration)}
                                  </span>
                                </div>

                                {j.scheduleSummary && (
                                  <span className="text-[10px] text-gray-500 font-medium bg-gray-100 px-2 py-0.5 rounded-md self-start sm:self-auto">
                                    {j.scheduleSummary}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {data.cronJobOrgStatus && !data.cronJobOrgStatus.connected && data.cronJobOrgStatus.error && (
                  <div className="mt-3 p-2.5 bg-rose-50 border border-rose-100 rounded-lg text-xs text-rose-700">
                    {data.cronJobOrgStatus.error}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-gray-100 text-[11px] text-gray-400 flex items-center justify-between">
                <span>Belum punya akun cron eksternal?</span>
                <a
                  href="https://cron-job.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:underline inline-flex items-center gap-1 font-medium"
                >
                  <span>Buka cron-job.org</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          {/* Baris Tambahan: Integrasi SEO Kilat (Instant Indexing & Google Indexing API) */}
          <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 rounded-2xl p-5 sm:p-6 text-white shadow-md relative overflow-hidden">
            <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-400/20">
                    <Zap className="w-5 h-5" />
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    Sistem Instant Indexing (SEO Kilat)
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Aktif Otomatis
                  </span>
                </div>
                <p className="text-xs text-indigo-200/80 max-w-2xl leading-relaxed">
                  Setiap kali ada artikel terbit (Autopilot, Draf Terjadwal, Sadur URL, atau Manual), sistem otomatis mengirim sinyal perayapan kilat secara paralel ke <b>Google Indexing API</b> dan protokol <b>IndexNow (Bing &amp; Partner)</b>.
                </p>
              </div>

              <button
                type="button"
                onClick={handleTestIndexingPing}
                disabled={testingIndexing}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-lg shadow-indigo-950/50 transition-all self-start lg:self-auto disabled:opacity-50 shrink-0"
              >
                {testingIndexing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Mengirim Sinyal...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Uji Ping Google &amp; IndexNow</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 pt-4 border-t border-indigo-800/50 relative z-10 text-xs">
              {/* 1. Google Indexing */}
              <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-indigo-200 font-semibold">Google Indexing API</span>
                  <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Terhubung
                  </span>
                </div>
                <p className="text-[11px] text-gray-300 truncate font-mono">
                  {data.indexingStatus?.googleEmail || 'naratifnews@bottele-508619.iam.gserviceaccount.com'}
                </p>
              </div>

              {/* 2. IndexNow Bing */}
              <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-indigo-200 font-semibold">Protokol IndexNow</span>
                  <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Bing &amp; Partner
                  </span>
                </div>
                <p className="text-[11px] text-gray-300 truncate">
                  Key: <code className="font-mono text-indigo-300">e89f7a42b109...</code> (Aktif)
                </p>
              </div>

              {/* 3. NewsArticle JSON-LD & RSS */}
              <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-indigo-200 font-semibold">NewsArticle &amp; RSS</span>
                  <a
                    href="/rss.xml"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-indigo-300 hover:text-white underline flex items-center gap-0.5"
                  >
                    <span>/rss.xml</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <p className="text-[11px] text-gray-300">
                  Schema.org JSON-LD aktif di seluruh detail artikel
                </p>
              </div>
            </div>
          </div>

          {/* Baris 4: Tabel Riwayat Log Eksekusi */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header & Tabs */}
            <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <span>📡 Riwayat Eksekusi Log</span>
                  <span className="px-2 py-0.5 text-xs font-semibold bg-gray-100 text-gray-700 rounded-full">
                    {data.logs.length} Log
                  </span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Mekanisme On-Demand: database hanya dibaca saat dibuka, otomatis membersihkan riwayat lama (&gt;30 hari).
                </p>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl self-start sm:self-auto text-xs">
                <button
                  type="button"
                  onClick={() => setLogFilter('all')}
                  className={`px-3 py-1.5 font-medium rounded-lg transition-all ${
                    logFilter === 'all'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Semua ({data.logs.length})
                </button>
                <button
                  type="button"
                  onClick={() => setLogFilter('success')}
                  className={`px-3 py-1.5 font-medium rounded-lg transition-all ${
                    logFilter === 'success'
                      ? 'bg-white text-emerald-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Berhasil ({successLogsCount})
                </button>
                <button
                  type="button"
                  onClick={() => setLogFilter('failed')}
                  className={`px-3 py-1.5 font-medium rounded-lg transition-all ${
                    logFilter === 'failed'
                      ? 'bg-white text-rose-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Error ({failedLogsCount})
                </button>
              </div>
            </div>

            {/* Table Content */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-gray-50/80 text-gray-500 uppercase tracking-wider text-[11px] border-b border-gray-100 font-semibold">
                  <tr>
                    <th className="py-3 px-4 sm:px-6">Waktu Eksekusi</th>
                    <th className="py-3 px-4">Tipe Worker</th>
                    <th className="py-3 px-4">Status HTTP</th>
                    <th className="py-3 px-4">Durasi</th>
                    <th className="py-3 px-4 sm:px-6">Hasil / Dampak Berita</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-gray-400">
                        <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="font-medium text-xs sm:text-sm">
                          {logFilter === 'failed'
                            ? 'Luar biasa! Tidak ada catatan error.'
                            : 'Belum ada catatan riwayat eksekusi cron.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => {
                      const isAutopilot = log.prompt.includes('[Autopilot');
                      const isPublish = log.prompt.includes('[Publish');
                      const isFailed = log.status === 'failed';
                      const dateObj = new Date(log.createdAt);

                      return (
                        <tr key={log.id} className="hover:bg-gray-50/60 transition-colors">
                          {/* Waktu */}
                          <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap">
                            <span className="font-semibold text-gray-900 block">
                              {dateObj.toLocaleTimeString('id-ID', {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })}{' '}
                              WIB
                            </span>
                            <span className="text-[11px] text-gray-400">
                              {dateObj.toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                          </td>

                          {/* Tipe Worker */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {isAutopilot ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-100">
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Autopilot AI</span>
                              </span>
                            ) : isPublish ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                                <Clock className="w-3.5 h-3.5" />
                                <span>Publish Scheduled</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-700">
                                <span>Cron System</span>
                              </span>
                            )}
                          </td>

                          {/* Status HTTP */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {isFailed ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Error / Gagal</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>200 OK</span>
                              </span>
                            )}
                          </td>

                          {/* Durasi */}
                          <td className="py-3.5 px-4 whitespace-nowrap text-xs text-gray-500 font-mono">
                            {log.durationMs ? `${(log.durationMs / 1000).toFixed(1)}s` : '-'}
                          </td>

                          {/* Hasil / Judul Berita */}
                          <td className="py-3.5 px-4 sm:px-6">
                            {isFailed ? (
                              <span className="text-xs text-rose-600 font-medium">
                                {log.errorMessage || 'Kegagalan eksekusi tanpa pesan error.'}
                              </span>
                            ) : (
                              <div className="flex items-center justify-between gap-3">
                                <div className="truncate max-w-md">
                                  <span className="font-medium text-gray-900 block truncate">
                                    {log.articleTitle || log.prompt.replace(/^\[(Autopilot|Publish Scheduled)\]\s*/, '')}
                                  </span>
                                  {log.category && (
                                    <span className="text-[11px] text-gray-400">
                                      Kategori: {log.category} {log.model ? `• Model: ${log.model}` : ''}
                                    </span>
                                  )}
                                </div>

                                {log.articleId && (
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <Link
                                      href={`/admin/edit/${log.articleId}`}
                                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium underline"
                                    >
                                      Edit
                                    </Link>
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
