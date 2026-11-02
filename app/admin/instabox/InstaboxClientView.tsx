'use client';

import { useState, useTransition } from 'react';
import {
  Server,
  Power,
  Play,
  Pause,
  RefreshCw,
  Terminal,
  KeyRound,
  ShieldCheck,
  Send,
  Copy,
  Check,
  Clock,
  Activity,
  AlertTriangle,
  ExternalLink,
  Save,
  MessageSquare,
  Bot,
  Info,
} from 'lucide-react';
import {
  DashboardData,
  wakeMachineAction,
  pauseMachineAction,
  runCommandAction,
  generateSshTokenAction,
  triggerKeepaliveAction,
  saveInstaboxConfigAction,
  testTelegramNotificationAction,
} from './actions';
import { SshTokenResponse, formatCooldownTime } from '@/lib/instabox';

interface Props {
  initialData: DashboardData;
}

export default function InstaboxClientView({ initialData }: Props) {
  const [data, setData] = useState<DashboardData>(initialData);
  const [isPending, startTransition] = useTransition();

  // State untuk Mini Terminal
  const [cmdInput, setCmdInput] = useState('uname -a');
  const [terminalHistory, setTerminalHistory] = useState<
    Array<{ cmd: string; stdout?: string; stderr?: string; exitCode?: number; time: string }>
  >([]);
  const [isExecRunning, setIsExecRunning] = useState(false);

  // State untuk SSH Token
  const [sshToken, setSshToken] = useState<SshTokenResponse | null>(null);
  const [isGeneratingSsh, setIsGeneratingSsh] = useState(false);
  const [copiedSsh, setCopiedSsh] = useState(false);
  const [copiedCron, setCopiedCron] = useState(false);

  // State untuk Form Settings
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [machineIdInput, setMachineIdInput] = useState(data.config.machineId || '');
  const [autoKeepalive, setAutoKeepalive] = useState(data.config.autoKeepaliveEnabled);
  const [notifyOnWake, setNotifyOnWake] = useState(data.config.notifyOnWake);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Status visual mesin
  const machine = data.machine;
  const rawStatus = (machine?.state || machine?.status || '').toLowerCase();
  const cooldownInfo = formatCooldownTime(machine?.cooldownUntil);
  const isCooldownActive = !cooldownInfo.isExpired;

  const isSuspended =
    rawStatus === 'paused' || rawStatus === 'suspended' || Boolean(machine?.autoSuspendedAt);
  const isRunning = rawStatus === 'running';

  const showNotification = (type: 'success' | 'error', text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 5000);
  };

  // 1. Aksi Wake Up
  const handleWakeUp = () => {
    if (isCooldownActive) {
      if (
        !confirm(
          `Mesin sedang masa cooldown hingga ${cooldownInfo.formatted} (${cooldownInfo.remainingText}). Server Instabox kemungkinan besar akan menolak perintah bangunkan sekarang. Tetap coba kirim?`
        )
      ) {
        return;
      }
    }
    startTransition(async () => {
      const res = await wakeMachineAction(data.config.machineId);
      if (res.success) {
        showNotification('success', res.message || 'Perintah wake up berhasil dikirim!');
      } else {
        showNotification('error', res.error || res.message || 'Gagal membangunkan mesin.');
      }
    });
  };

  // 2. Aksi Pause
  const handlePause = () => {
    if (!confirm('Apakah Anda yakin ingin mem-pause mesin ini sekarang?')) return;
    startTransition(async () => {
      const res = await pauseMachineAction(data.config.machineId);
      if (res.success) {
        showNotification('success', res.message || 'Mesin berhasil dipause.');
      } else {
        showNotification('error', res.error || 'Gagal mem-pause mesin.');
      }
    });
  };

  // 3. Aksi Trigger Keep-Alive manual
  const handleManualKeepalive = () => {
    startTransition(async () => {
      const res = await triggerKeepaliveAction();
      if (res.success) {
        showNotification('success', `Keep-Alive sukses: ${res.message}`);
      } else {
        showNotification('error', res.message || 'Gagal menjalankan keep-alive.');
      }
    });
  };

  // 4. Aksi Generate SSH Token
  const handleGenerateSsh = async () => {
    setIsGeneratingSsh(true);
    try {
      const res = await generateSshTokenAction('naratif-admin-ui', data.config.machineId);
      if (res.success && res.tokenData) {
        setSshToken(res.tokenData);
        showNotification('success', 'SSH Token baru berhasil dibuat!');
      } else {
        showNotification('error', res.error || 'Gagal membuat SSH Token.');
      }
    } finally {
      setIsGeneratingSsh(false);
    }
  };

  // 5. Aksi Jalankan Terminal Exec
  const handleRunCommand = async (commandToRun = cmdInput) => {
    if (!commandToRun.trim() || isExecRunning) return;
    setIsExecRunning(true);
    const nowTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    try {
      const res = await runCommandAction(commandToRun.trim(), data.config.machineId);
      setTerminalHistory((prev) => [
        {
          cmd: commandToRun.trim(),
          stdout: res.stdout,
          stderr: res.stderr || res.error,
          exitCode: res.exitCode,
          time: nowTime,
        },
        ...prev.slice(0, 15),
      ]);
    } catch (e: any) {
      setTerminalHistory((prev) => [
        {
          cmd: commandToRun.trim(),
          stderr: e?.message || 'Gagal menghubungi mesin',
          exitCode: -1,
          time: nowTime,
        },
        ...prev.slice(0, 15),
      ]);
    } finally {
      setIsExecRunning(false);
    }
  };

  // 6. Simpan Pengaturan
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveInstaboxConfigAction({
        apiKey: apiKeyInput.trim() || undefined,
        machineId: machineIdInput.trim() || undefined,
        autoKeepaliveEnabled: autoKeepalive,
        notifyOnWake: notifyOnWake,
      });

      if (res.success) {
        showNotification('success', res.message || 'Pengaturan berhasil disimpan!');
        setApiKeyInput('');
      } else {
        showNotification('error', res.error || 'Gagal menyimpan pengaturan.');
      }
    });
  };

  // 7. Tes Notifikasi Telegram
  const handleTestTelegram = () => {
    startTransition(async () => {
      const res = await testTelegramNotificationAction();
      if (res.success) {
        showNotification('success', 'Pesan uji coba berhasil dikirim ke Telegram!');
      } else {
        showNotification('error', res.error || 'Gagal mengirim pesan Telegram.');
      }
    });
  };

  const copyToClipboard = (text: string, setCopied: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Toast Alert Feedback */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between shadow-xs transition-all ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2.5 text-sm font-medium">
            {feedbackMsg.type === 'success' ? (
              <Check className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMsg(null)}
            className="text-xs font-semibold px-2 py-1 rounded hover:bg-black/5"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Header Utama */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900 tracking-tight font-heading">
                  VPS Instabox & Hermes Hub
                </h1>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                    isRunning
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : isSuspended
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-gray-100 text-gray-600 border-gray-200'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isRunning
                        ? 'bg-emerald-500 animate-pulse'
                        : isSuspended
                        ? 'bg-amber-500'
                        : 'bg-gray-400'
                    }`}
                  />
                  {isRunning ? 'RUNNING' : isSuspended ? 'SUSPENDED' : rawStatus ? rawStatus.toUpperCase() : 'OFFLINE'}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Monitoring live, auto-wake 30m keep-alive, remote bash exec & kontrol Telegram Bot
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-2xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleWakeUp}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-500 transition-colors shadow-xs disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isPending ? 'Memproses...' : 'Wake Up Sekarang'}</span>
          </button>
        </div>
      </div>

      {/* Grid 4 Kartu Metrik Ringkas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Kartu 1: Status Mesin */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-gray-500">
            <span>Status Mesin</span>
            <Server className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-gray-900 font-heading">
              {isRunning ? 'Aktif (Running)' : isSuspended ? 'Tertidur (Suspended)' : rawStatus ? rawStatus.toUpperCase() : 'Tidak Dikenal'}
            </span>
          </div>
          <div className="text-[11px] text-gray-500 truncate" title={machine?.id || data.config.machineId}>
            {machine?.name ? (
              <span className="font-semibold text-gray-700">{machine.name} • </span>
            ) : null}
            ID: <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-800">{machine?.id || data.config.machineId || 'Belum disetel'}</code>
          </div>
          {machine?.spec && (
            <div className="text-[10px] text-gray-400 font-medium pt-1 border-t border-gray-100 flex items-center gap-1.5 truncate">
              <span>{machine.spec.vcpus} vCPU</span>
              <span>•</span>
              <span>{Math.round((machine.spec.memMiB || 0) / 1024)} GB RAM</span>
              <span>•</span>
              <span>{machine.storage?.sizeGiB || machine.spec.persistentDiskGiB || 20} GB Disk</span>
            </div>
          )}
        </div>

        {/* Kartu 2: Auto Keep-Alive Status */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-gray-500">
            <span>Auto Keep-Alive (Cron)</span>
            <Activity className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-lg font-bold font-heading ${
                data.config.autoKeepaliveEnabled ? 'text-emerald-600' : 'text-gray-400'
              }`}
            >
              {data.config.autoKeepaliveEnabled ? 'AKTIF (Tiap 15m)' : 'NONAKTIF'}
            </span>
          </div>
          <div className="text-[11px] text-gray-500 truncate">
            {data.lastKeepalive?.timestamp ? (
              <span>Last: {new Date(data.lastKeepalive.timestamp).toLocaleTimeString('id-ID')} WIB</span>
            ) : (
              <span>Belum ada riwayat ping</span>
            )}
          </div>
        </div>

        {/* Kartu 3: Runtime & Limit */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-gray-500">
            <span>Batas Uptime Free Tier</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-gray-900 font-heading">
              {machine?.maxRunMinutes ? `${machine.maxRunMinutes} Menit` : '480 Menit'}
            </span>
          </div>
          <div className="text-[11px] text-gray-500">
            {isCooldownActive ? (
              <span className="text-amber-700 font-semibold block leading-tight">
                ⏳ Cooldown: {cooldownInfo.remainingText}
              </span>
            ) : machine?.autoSuspendAfterSeconds ? (
              <span>Auto-Suspend: {Math.round(machine.autoSuspendAfterSeconds / 60)} Menit Idle</span>
            ) : (
              <span className="text-emerald-600 font-medium">Bebas Cooldown (Idle Awake)</span>
            )}
          </div>
        </div>

        {/* Kartu 4: Telegram Bot Control */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-gray-500">
            <span>Integrasi Telegram</span>
            <Bot className="w-4 h-4 text-purple-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-lg font-bold font-heading ${
                data.config.telegramConfigured ? 'text-purple-600' : 'text-gray-400'
              }`}
            >
              {data.config.telegramConfigured ? 'TERHUBUNG' : 'BELUM AKTIF'}
            </span>
          </div>
          <div className="text-[11px] text-gray-500 truncate">
            Admin Chat: <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-800">{data.config.telegramAdminChatId || 'Belum ada'}</code>
          </div>
        </div>
      </div>

      {/* Banner Cooldown Aktif */}
      {isCooldownActive && (
        <div className="bg-amber-500/10 border border-amber-300 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 shadow-2xs">
          <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0 mt-0.5">
            <Clock className="w-5 h-5 animate-pulse" />
          </div>
          <div className="space-y-1 text-xs text-amber-900 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm font-heading">
                Mesin Sedang Masa Istirahat (Cooldown 24 Jam)
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-200 text-amber-800">
                Sisa: {cooldownInfo.remainingText}
              </span>
            </div>
            <p className="text-amber-800/90 leading-relaxed">
              Mesin Hermes telah mencapai batas pemakaian nonstop harian (8 jam). Server Instabox mengunci sementara perintah <code>wake</code> hingga:
            </p>
            <div className="font-semibold text-amber-950 font-mono text-[11px] bg-white/70 px-3 py-1.5 rounded-lg border border-amber-200 inline-block mt-1">
              🗓️ {cooldownInfo.formatted}
            </div>
            <p className="text-[11px] text-amber-700 italic pt-1">
              💡 Tips: Saat cooldown selesai, gunakan Hermes secara on-demand via Telegram agar jatah 8 jam per hari awet dan tidak cepat habis.
            </p>
          </div>
        </div>
      )}

      {/* Konten Utama: 2 Kolom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom Kiri / Utama (2 Span) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Kontrol Cepat Mesin */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <Power className="w-4 h-4 text-indigo-600" />
                Kontrol Cepat Mesin Instabox
              </h2>
              {isPending && <span className="text-xs text-indigo-600 font-medium animate-pulse">Menghubungi API...</span>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={handleWakeUp}
                disabled={isPending}
                className="flex items-center justify-center gap-2 p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/60 hover:bg-indigo-50 text-indigo-700 font-semibold text-xs transition-colors disabled:opacity-50"
              >
                <Play className="w-4 h-4 fill-current text-indigo-600" />
                <span>Wake Up / Hidupkan</span>
              </button>

              <button
                type="button"
                onClick={handleManualKeepalive}
                disabled={isPending}
                className="flex items-center justify-center gap-2 p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-50 text-emerald-700 font-semibold text-xs transition-colors disabled:opacity-50"
              >
                <Activity className="w-4 h-4 text-emerald-600" />
                <span>Trigger Keep-Alive (Ping)</span>
              </button>

              <button
                type="button"
                onClick={handlePause}
                disabled={isPending}
                className="flex items-center justify-center gap-2 p-3.5 rounded-xl border border-amber-200 bg-amber-50/60 hover:bg-amber-50 text-amber-800 font-semibold text-xs transition-colors disabled:opacity-50"
              >
                <Pause className="w-4 h-4 text-amber-600" />
                <span>Pause / Tidurkan</span>
              </button>
            </div>

            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs text-gray-600 flex items-start gap-2">
              <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
              <span>
                <strong>Catatan Dokumentasi:</strong> Membangunkan mesin yang tertidur karena idle (auto-suspend)
                tidak memiliki cooldown. Mesin langsung siap melayani request Hermes dalam hitungan detik setelah di-wake.
              </span>
            </div>
          </div>

          {/* Card 2: One-Click SSH Login */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-amber-600" />
                  One-Click SSH Login
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Buat token SSH instan untuk login terminal tanpa perlu setup private/public key manual
                </p>
              </div>

              <button
                type="button"
                onClick={handleGenerateSsh}
                disabled={isGeneratingSsh}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors disabled:opacity-50"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>{isGeneratingSsh ? 'Membuat...' : 'Buat Token SSH'}</span>
              </button>
            </div>

            {sshToken ? (
              <div className="p-4 bg-gray-950 rounded-xl border border-gray-800 text-gray-200 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between text-gray-400 text-[11px] border-b border-gray-800 pb-2">
                  <span>Perintah Terminal Siap Pakai</span>
                  <span>Berlaku s/d: {new Date(sshToken.expiresAt).toLocaleTimeString('id-ID')} WIB</span>
                </div>
                <div className="flex items-center justify-between gap-3 bg-gray-900 p-2.5 rounded-lg border border-gray-800">
                  <code className="text-emerald-400 select-all overflow-x-auto whitespace-pre">{sshToken.command}</code>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(sshToken.command, setCopiedSsh)}
                    className="px-2.5 py-1 text-xs rounded bg-gray-800 hover:bg-gray-700 text-gray-200 flex items-center gap-1 shrink-0 font-sans font-medium"
                  >
                    {copiedSsh ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSsh ? 'Tersalin' : 'Salin'}</span>
                  </button>
                </div>
                <div className="text-[11px] text-gray-400">
                  Host: <span className="text-gray-200">{sshToken.host}</span> | Port: <span className="text-gray-200">{sshToken.port}</span>
                </div>
              </div>
            ) : (
              <div className="border border-dashed border-gray-200 rounded-xl p-5 text-center text-xs text-gray-500">
                Klik tombol <strong>&ldquo;Buat Token SSH&rdquo;</strong> di atas untuk mendapatkan perintah login terminal 1-klik yang bisa dijalankan di Command Prompt, PowerShell, atau Termius HP.
              </div>
            )}
          </div>

          {/* Card 3: Mini Terminal / Remote Exec */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-600" />
                  Mini Terminal & Remote Exec
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Jalankan perintah bash Linux langsung ke Hermes VPS via API <code>/exec</code>
                </p>
              </div>

              {/* Presets */}
              <div className="hidden sm:flex items-center gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => handleRunCommand('uname -a')}
                  className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 font-mono"
                >
                  uname -a
                </button>
                <button
                  type="button"
                  onClick={() => handleRunCommand('uptime')}
                  className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 font-mono"
                >
                  uptime
                </button>
                <button
                  type="button"
                  onClick={() => handleRunCommand('free -m')}
                  className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 font-mono"
                >
                  free -m
                </button>
                <button
                  type="button"
                  onClick={() => handleRunCommand('df -h')}
                  className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 font-mono"
                >
                  df -h
                </button>
              </div>
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleRunCommand();
              }}
              className="flex items-center gap-2"
            >
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none font-mono text-gray-400 text-xs font-bold">
                  $
                </span>
                <input
                  type="text"
                  value={cmdInput}
                  onChange={(e) => setCmdInput(e.target.value)}
                  placeholder="Ketik perintah linux (contoh: ps aux | grep hermes)"
                  className="w-full pl-7 pr-3 py-2 text-xs font-mono bg-gray-50 border border-gray-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>

              <button
                type="submit"
                disabled={isExecRunning || !cmdInput.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-gray-900 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isExecRunning ? 'Menjalankan...' : 'Eksekusi'}</span>
              </button>
            </form>

            {/* Terminal Window Box */}
            <div className="bg-gray-950 rounded-xl border border-gray-800 p-4 font-mono text-xs text-gray-200 h-64 overflow-y-auto space-y-3">
              {terminalHistory.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-600 text-center">
                  <p>
                    Belum ada riwayat perintah. Masukkan perintah di atas lalu tekan <strong>Enter</strong> atau klik tombol Eksekusi.
                  </p>
                </div>
              ) : (
                terminalHistory.map((item, idx) => (
                  <div key={idx} className="space-y-1 border-b border-gray-800/80 pb-2.5 last:border-0">
                    <div className="flex items-center justify-between text-gray-500 text-[10px]">
                      <span>[{item.time}]</span>
                      <span className={item.exitCode === 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        Exit: {item.exitCode ?? 0}
                      </span>
                    </div>
                    <div className="text-amber-400 font-semibold flex items-center gap-1.5">
                      <span>$</span>
                      <span>{item.cmd}</span>
                    </div>
                    {item.stdout && (
                      <pre className="text-gray-300 whitespace-pre-wrap leading-relaxed">{item.stdout.trim()}</pre>
                    )}
                    {item.stderr && (
                      <pre className="text-rose-400 whitespace-pre-wrap leading-relaxed">{item.stderr.trim()}</pre>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Kolom Kanan / Sidebar Halaman (1 Span) */}
        <div className="space-y-6">
          {/* Card: Setup Cron Auto-Wake */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5 space-y-4">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              Webhook Cron Auto-Wake
            </h2>

            <p className="text-xs text-gray-600 leading-relaxed">
              Pasang URL di bawah ini ke penyedia cron gratis (seperti <strong>cron-job.org</strong>) dengan interval <strong>15 atau 20 menit</strong> sekali untuk menjaga mesin Hermes tidak pernah ter-pause.
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-gray-600 block">URL Endpoint Cron:</label>
              <div className="flex items-center gap-1.5 bg-gray-50 p-2 rounded-xl border border-gray-200">
                <input
                  type="text"
                  readOnly
                  value={data.config.cronUrl}
                  className="w-full bg-transparent text-[11px] font-mono text-gray-700 outline-hidden select-all"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(data.config.cronUrl, setCopiedCron)}
                  className="p-1.5 rounded hover:bg-gray-200 text-gray-600 shrink-0"
                  title="Salin URL"
                >
                  {copiedCron ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="text-[11px] text-gray-500 space-y-1 border-t border-gray-100 pt-3">
              <div>Method: <strong>GET</strong> atau <strong>POST</strong></div>
              <div>Interval Rekomendasi: <strong>Setiap 15 Menit</strong></div>
            </div>
          </div>

          {/* Card: Telegram Bot Quick Guide */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <Bot className="w-4 h-4 text-purple-600" />
                Remote Control Telegram
              </h2>
              <button
                type="button"
                onClick={handleTestTelegram}
                disabled={isPending || !data.config.telegramConfigured}
                className="text-[11px] font-semibold text-purple-700 hover:text-purple-800 disabled:opacity-50"
              >
                Tes Kirim Pesan
              </button>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Anda dapat mengontrol mesin Instabox langsung dari chat bot Telegram Anda:
            </p>

            <div className="space-y-2 text-xs font-mono">
              <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
                <span className="font-bold text-indigo-600">/vps</span>
                <span className="text-gray-500 font-sans block text-[11px] mt-0.5">Lihat status live, uptime, dan tombol aksi</span>
              </div>

              <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
                <span className="font-bold text-emerald-600">/wake</span>
                <span className="text-gray-500 font-sans block text-[11px] mt-0.5">Bangunkan mesin secara instan</span>
              </div>

              <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
                <span className="font-bold text-amber-600">/ssh</span>
                <span className="text-gray-500 font-sans block text-[11px] mt-0.5">Dapatkan string login SSH 1-klik</span>
              </div>

              <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
                <span className="font-bold text-purple-600">/exec &lt;cmd&gt;</span>
                <span className="text-gray-500 font-sans block text-[11px] mt-0.5">Jalankan perintah linux dari HP</span>
              </div>
            </div>
          </div>

          {/* Card: Pengaturan API & Mesin */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5 space-y-4">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              Pengaturan API & Mesin
            </h2>

            <form onSubmit={handleSaveSettings} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Instabox API Key ({data.config.apiKeyConfigured ? 'Tersimpan' : 'Belum Ada'})
                </label>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder={data.config.maskedApiKey || 'ibk_...'}
                  className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 font-mono"
                />
                <span className="text-[10px] text-gray-400 mt-0.5 block">
                  Kosongkan jika tidak ingin mengubah API Key yang sudah ada.
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Machine ID Instabox (m_...)
                </label>
                <input
                  type="text"
                  value={machineIdInput}
                  onChange={(e) => setMachineIdInput(e.target.value)}
                  placeholder="m_agqteugyy5px6hzeadbh4ldjo4"
                  className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 font-mono"
                />
              </div>

              {/* Toggles */}
              <div className="space-y-2 pt-1 border-t border-gray-100">
                <label className="flex items-center gap-2.5 text-xs text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoKeepalive}
                    onChange={(e) => setAutoKeepalive(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                  />
                  <span>Aktifkan Auto Keep-Alive (Cron)</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyOnWake}
                    onChange={(e) => setNotifyOnWake(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                  />
                  <span>Beri notifikasi Telegram jika auto-wake dipicu</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-500 transition-colors shadow-xs disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Pengaturan</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

