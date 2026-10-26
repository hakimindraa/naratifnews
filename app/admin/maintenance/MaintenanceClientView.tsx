'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Trash2,
  Database,
  ShieldCheck,
  Clock,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Loader2,
  Layers,
  FileText,
  FileCode2,
  Calendar,
  ExternalLink,
  Copy,
  Check,
  Info,
  Search,
  ChevronLeft,
  ChevronRight,
  Newspaper,
  Bot,
  CalendarClock,
} from 'lucide-react';
import {
  MaintenanceMetrics,
  MaintenanceSettings,
  PurgeCandidateItem,
  updateMaintenanceSettingsAction,
  executePurgeAction,
  deleteIndividualPurgeItemAction,
} from './actions';

interface MaintenanceClientViewProps {
  initialMetrics: MaintenanceMetrics;
  initialCandidates: PurgeCandidateItem[];
}

export default function MaintenanceClientView({
  initialMetrics,
  initialCandidates,
}: MaintenanceClientViewProps) {
  const router = useRouter();
  const [metrics, setMetrics] = useState<MaintenanceMetrics>(initialMetrics);
  const [settings, setSettings] = useState<MaintenanceSettings>(initialMetrics.settings);
  const [candidates, setCandidates] = useState<PurgeCandidateItem[]>(initialCandidates);

  const [isSaving, setIsSaving] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [purgeScope, setPurgeScope] = useState<'all' | 'raw_drafts' | 'published_drafts' | 'ai_logs'>('all');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [lastPurgeResult, setLastPurgeResult] = useState<{
    totalDeleted: number;
    rawDrafts: number;
    publishedDrafts: number;
    aiLogs: number;
  } | null>(null);

  // State Pratinjau Antrean & Paginasi
  const [candidateFilter, setCandidateFilter] = useState<'all' | 'published_draft' | 'raw_draft' | 'ai_log'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // State Hapus Satuan
  const [itemToDelete, setItemToDelete] = useState<PurgeCandidateItem | null>(null);
  const [isDeletingItem, setIsDeletingItem] = useState(false);

  const [copiedUrl, setCopiedUrl] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Simpan pengaturan retensi
  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const res = await updateMaintenanceSettingsAction(settings);
      if (res.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        router.refresh();
      } else {
        alert(res.error || 'Gagal menyimpan pengaturan');
      }
    } catch {
      alert('Terjadi kesalahan jaringan saat menyimpan pengaturan');
    } finally {
      setIsSaving(false);
    }
  }

  // Eksekusi pembersihan massal
  async function handleExecutePurge() {
    setIsPurging(true);
    try {
      const res = await executePurgeAction(purgeScope);
      if (res.success) {
        setLastPurgeResult({
          totalDeleted: res.totalDeleted,
          rawDrafts: res.deletedRawDrafts,
          publishedDrafts: res.deletedPublishedDrafts,
          aiLogs: res.deletedAiLogs,
        });
        setCandidates((prev) => {
          if (purgeScope === 'all') return prev.filter((c) => !c.isExpired);
          if (purgeScope === 'raw_drafts') return prev.filter((c) => c.itemType !== 'raw_draft' || !c.isExpired);
          if (purgeScope === 'published_drafts') return prev.filter((c) => c.itemType !== 'published_draft' || !c.isExpired);
          if (purgeScope === 'ai_logs') return prev.filter((c) => c.itemType !== 'ai_log' || !c.isExpired);
          return prev;
        });
        setShowConfirmModal(false);
        router.refresh();
      } else {
        alert(res.error || 'Gagal membersihkan database');
      }
    } catch {
      alert('Terjadi kesalahan jaringan saat membersihkan database');
    } finally {
      setIsPurging(false);
    }
  }

  // Eksekusi hapus satuan manual
  async function handleConfirmDeleteIndividual() {
    if (!itemToDelete) return;
    setIsDeletingItem(true);
    try {
      const res = await deleteIndividualPurgeItemAction(itemToDelete.itemType, itemToDelete.id);
      if (res.success) {
        setCandidates((prev) =>
          prev.filter((c) => !(c.itemType === itemToDelete.itemType && c.id === itemToDelete.id))
        );
        setItemToDelete(null);
        router.refresh();
      } else {
        alert(res.error || 'Gagal menghapus data');
      }
    } catch {
      alert('Terjadi kesalahan jaringan saat menghapus data');
    } finally {
      setIsDeletingItem(false);
    }
  }

  function handleCopyCronUrl() {
    const url = 'https://www.adafakta.web.id/api/cron/auto-purge';
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  }

  const formatLastRun = (isoStr: string | null) => {
    if (!isoStr) return 'Belum pernah dijalankan';
    try {
      return (
        new Date(isoStr).toLocaleString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Asia/Jakarta',
        }) + ' WIB'
      );
    } catch {
      return isoStr;
    }
  };

  // Filter & Search Candidates List
  const filteredCandidates = candidates.filter((item) => {
    const matchesFilter = candidateFilter === 'all' || item.itemType === candidateFilter;
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      query === '' ||
      item.title.toLowerCase().includes(query) ||
      (item.categoryOrSource && item.categoryOrSource.toLowerCase().includes(query)) ||
      item.sourceLabel.toLowerCase().includes(query) ||
      item.sourceSubLabel.toLowerCase().includes(query);

    return matchesFilter && matchesSearch;
  });

  const totalPages = Math.ceil(filteredCandidates.length / pageSize) || 1;
  const paginatedCandidates = filteredCandidates.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const countAll = candidates.length;
  const countPublished = candidates.filter((c) => c.itemType === 'published_draft').length;
  const countRaw = candidates.filter((c) => c.itemType === 'raw_draft').length;
  const countLogs = candidates.filter((c) => c.itemType === 'ai_log').length;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200/80 p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-purple-600/10 text-purple-600 flex items-center justify-center shrink-0">
              <Database className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900 tracking-tight font-heading">
                  Pembersihan Database & Auto-Purge
                </h1>
                <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-semibold border border-purple-200">
                  Storage Health
                </span>
              </div>
              <p className="text-[11px] sm:text-sm text-gray-500 mt-1 max-w-2xl leading-relaxed">
                Kelola retensi data berkala agar database Neon PostgreSQL tetap ramping, bebas dari penumpukan draf bot kedaluwarsa dan riwayat log AI.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center">
            <button
              type="button"
              onClick={() => router.refresh()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg sm:rounded-xl transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Segarkan Metrik</span>
            </button>
          </div>
        </div>

        {/* Garansi Keamanan SEO Badge */}
        <div className="mt-4 p-3 sm:p-4 rounded-xl bg-emerald-50/80 border border-emerald-200 text-emerald-900 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm leading-relaxed">
            <span className="font-bold block text-emerald-950">
              🛡️ Proteksi Penuh Artikel Web Publik (Tabel articles: {metrics.totalPublicArticles} Berita)
            </span>
            <span className="text-emerald-800 text-[11px] sm:text-xs block mt-0.5">
              Fitur pembersihan ini <b>TIDAK AKAN PERNAH MENYENTUH ATAU MENGHAPUS ARTIKEL TAYANG</b>. Berita Anda di Google Search, Google News, dan indeks SEO dijamin tetap aman selamanya tanpa resiko broken link (404).
            </span>
          </div>
        </div>
      </div>

      {/* 2. Kartu Kondisi Penyimpanan Saat Ini */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Card 1: Draf Mentah Bot */}
        <div className="bg-white border border-gray-200/80 rounded-xl sm:rounded-2xl p-3.5 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Draf Mentah Usang
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-bold text-gray-900 font-heading">
              {metrics.expiredRawDrafts}
            </span>
            <span className="text-[11px] text-gray-500">baris</span>
          </div>
          <p className="text-[10px] sm:text-xs text-gray-400 mt-1 line-clamp-1">
            Usulan bot mentah &gt; {settings.draftsRetentionDays} hari
          </p>
        </div>

        {/* Card 2: Salinan Draf Terbit */}
        <div className="bg-white border border-gray-200/80 rounded-xl sm:rounded-2xl p-3.5 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Salinan Draf Terbit
            </span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-bold text-gray-900 font-heading">
              {metrics.expiredPublishedDrafts}
            </span>
            <span className="text-[11px] text-gray-500">baris</span>
          </div>
          <p className="text-[10px] sm:text-xs text-gray-400 mt-1 line-clamp-1">
            Salinan draf lama &gt; {settings.publishedDraftsRetentionDays} hari
          </p>
        </div>

        {/* Card 3: Log Riwayat AI */}
        <div className="bg-white border border-gray-200/80 rounded-xl sm:rounded-2xl p-3.5 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Log Riwayat AI
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileCode2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-bold text-gray-900 font-heading">
              {metrics.expiredAiLogs}
            </span>
            <span className="text-[11px] text-gray-500">baris</span>
          </div>
          <p className="text-[10px] sm:text-xs text-gray-400 mt-1 line-clamp-1">
            Catatan prompt &gt; {settings.aiLogsRetentionDays} hari
          </p>
        </div>

        {/* Card 4: Total Siap Bersih */}
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50/50 border border-purple-200 rounded-xl sm:rounded-2xl p-3.5 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-xs font-bold text-purple-700 uppercase tracking-wider">
              Total Siap Dihapus
            </span>
            <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center">
              <Trash2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-purple-900 font-heading">
              {metrics.totalPurgeable}
            </span>
            <span className="text-[11px] font-semibold text-purple-700">baris sampah</span>
          </div>
          <p className="text-[10px] sm:text-xs text-purple-600 mt-1 line-clamp-1">
            Telah jatuh tempo sesuai retensi
          </p>
        </div>
      </div>

      {/* Notifikasi Hasil Pembersihan Terakhir */}
      {lastPurgeResult && (
        <div className="p-3.5 sm:p-4 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 flex items-center justify-between gap-3 animate-in fade-in duration-300">
          <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
            <CheckCircle2 className="w-5 h-5 text-purple-600 shrink-0" />
            <span>
              <b>Pembersihan Berhasil!</b> Sebanyak <b>{lastPurgeResult.totalDeleted} baris data sampah</b> telah dibersihkan dari database ({lastPurgeResult.rawDrafts} draf mentah, {lastPurgeResult.publishedDrafts} draf terbit, {lastPurgeResult.aiLogs} log AI).
            </span>
          </div>
          <button
            type="button"
            onClick={() => setLastPurgeResult(null)}
            className="text-xs text-purple-600 hover:text-purple-800 font-semibold cursor-pointer shrink-0"
          >
            Tutup
          </button>
        </div>
      )}

      {/* 3. Pengaturan Batas Waktu Retensi (Retention Controls) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl sm:rounded-2xl border border-gray-200/80 p-4 sm:p-6 shadow-xs space-y-4">
          <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-gray-900 font-heading">
                Pengaturan Retensi Data (Batas Umur)
              </h2>
              <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">
                Pilih berapa lama data sampah disimpan sebelum otomatis dianggap kedaluwarsa.
              </p>
            </div>
            <Clock className="w-5 h-5 text-gray-400" />
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4 sm:space-y-5">
            {/* Field 1: Draf Mentah */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs sm:text-sm font-bold text-gray-800">
                  1. Usulan Draf Mentah Bot Jurnalis
                </label>
                <span className="text-[10px] sm:text-xs text-amber-600 font-medium">status: draft</span>
              </div>
              <p className="text-[11px] sm:text-xs text-gray-500">
                Berita intelijen yang belum dibuatkan artikel AI atau belum Anda pasangi foto sampul.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 sm:gap-2 pt-1">
                {[
                  { label: '3 Hari', val: 3 },
                  { label: '5 Hari', val: 5 },
                  { label: '7 Hari (Default)', val: 7 },
                  { label: '14 Hari', val: 14 },
                  { label: 'Nonaktif', val: 0 },
                ].map((opt) => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => setSettings((s) => ({ ...s, draftsRetentionDays: opt.val }))}
                    className={`py-2 px-2 rounded-lg text-xs font-semibold text-center transition-all cursor-pointer ${
                      settings.draftsRetentionDays === opt.val
                        ? 'bg-indigo-600 text-white shadow-xs font-bold'
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Field 2: Draf Published */}
            <div className="space-y-1.5 pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <label className="text-xs sm:text-sm font-bold text-gray-800">
                  2. Salinan Draf yang Sudah Terbit
                </label>
                <span className="text-[10px] sm:text-xs text-emerald-600 font-medium">status: published</span>
              </div>
              <p className="text-[11px] sm:text-xs text-gray-500">
                Salinan draf di meja jurnalis yang artikel aslinya sudah aman tayang di tabel <code>articles</code>.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 sm:gap-2 pt-1">
                {[
                  { label: '3 Hari', val: 3 },
                  { label: '7 Hari (Default)', val: 7 },
                  { label: '14 Hari', val: 14 },
                  { label: '30 Hari', val: 30 },
                  { label: 'Nonaktif', val: 0 },
                ].map((opt) => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => setSettings((s) => ({ ...s, publishedDraftsRetentionDays: opt.val }))}
                    className={`py-2 px-2 rounded-lg text-xs font-semibold text-center transition-all cursor-pointer ${
                      settings.publishedDraftsRetentionDays === opt.val
                        ? 'bg-indigo-600 text-white shadow-xs font-bold'
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Field 3: Log Riwayat AI */}
            <div className="space-y-1.5 pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <label className="text-xs sm:text-sm font-bold text-gray-800">
                  3. Riwayat Log Panggilan AI
                </label>
                <span className="text-[10px] sm:text-xs text-blue-600 font-medium">tabel: ai_generation_logs</span>
              </div>
              <p className="text-[11px] sm:text-xs text-gray-500">
                Catatan riwayat prompt dan durasi pengerjaan AI yang disimpan untuk audit.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 pt-1">
                {[
                  { label: '7 Hari', val: 7 },
                  { label: '14 Hari (Default)', val: 14 },
                  { label: '30 Hari', val: 30 },
                  { label: 'Nonaktif', val: 0 },
                ].map((opt) => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => setSettings((s) => ({ ...s, aiLogsRetentionDays: opt.val }))}
                    className={`py-2 px-2 rounded-lg text-xs font-semibold text-center transition-all cursor-pointer ${
                      settings.aiLogsRetentionDays === opt.val
                        ? 'bg-indigo-600 text-white shadow-xs font-bold'
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
              {saveSuccess ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                  <Check className="w-4 h-4" /> Pengaturan Tersimpan!
                </span>
              ) : (
                <span className="text-[11px] text-gray-400">
                  Perubahan akan diterapkan pada pembersihan berikutnya.
                </span>
              )}
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <span>Simpan Pengaturan Retensi</span>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* 4. Panel Aksi Pembersihan Manual & Info Cron */}
        <div className="space-y-4">
          {/* Box Eksekusi Manual */}
          <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200/80 p-4 sm:p-5 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-gray-900 font-heading flex items-center gap-1.5">
              <Trash2 className="w-4 h-4 text-purple-600" />
              <span>Eksekusi Pembersihan Manual</span>
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Ingin langsung mengosongkan sampah database sekarang tanpa menunggu cron? Tekan tombol di bawah untuk membersihkan <b>{metrics.totalPurgeable} baris</b> data kedaluwarsa.
            </p>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                disabled={isPurging || metrics.totalPurgeable === 0}
                onClick={() => {
                  setPurgeScope('all');
                  setShowConfirmModal(true);
                }}
                className="w-full py-2.5 px-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>🧹 Bersihkan Semua ({metrics.totalPurgeable})</span>
              </button>

              <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px]">
                <button
                  type="button"
                  disabled={isPurging || metrics.expiredRawDrafts === 0}
                  onClick={() => {
                    setPurgeScope('raw_drafts');
                    setShowConfirmModal(true);
                  }}
                  className="py-1.5 px-2 bg-gray-50 hover:bg-gray-100 disabled:opacity-40 border border-gray-200 rounded-lg text-gray-700 font-semibold cursor-pointer truncate"
                  title="Hanya bersihkan draf mentah usang"
                >
                  Hanya Draf ({metrics.expiredRawDrafts})
                </button>
                <button
                  type="button"
                  disabled={isPurging || metrics.expiredAiLogs === 0}
                  onClick={() => {
                    setPurgeScope('ai_logs');
                    setShowConfirmModal(true);
                  }}
                  className="py-1.5 px-2 bg-gray-50 hover:bg-gray-100 disabled:opacity-40 border border-gray-200 rounded-lg text-gray-700 font-semibold cursor-pointer truncate"
                  title="Hanya bersihkan riwayat log AI"
                >
                  Hanya Log AI ({metrics.expiredAiLogs})
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100 text-[10px] text-gray-400">
              Terakhir dibersihkan: <span className="font-semibold text-gray-600">{formatLastRun(settings.lastPurgedAt)}</span>
            </div>
          </div>

          {/* Box Setup Cron Otomatis */}
          <div className="bg-gradient-to-br from-indigo-50/70 to-purple-50/70 rounded-xl sm:rounded-2xl border border-indigo-100 p-4 sm:p-5 shadow-xs space-y-2.5">
            <h3 className="text-sm font-bold text-gray-900 font-heading flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-indigo-600" />
              <span>Otomasi Jadwal Cron (Gratis)</span>
            </h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Pasang URL endpoint ini di <b>cron-job.org</b> agar pembersihan berjalan otomatis setiap minggu atau tiap malam:
            </p>

            <div className="flex items-center gap-1 bg-white border border-indigo-200 rounded-lg p-1.5">
              <code className="text-[10px] sm:text-xs text-indigo-700 font-mono truncate flex-1 px-1">
                /api/cron/auto-purge
              </code>
              <button
                type="button"
                onClick={handleCopyCronUrl}
                className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                title="Salin URL lengkap"
              >
                {copiedUrl ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedUrl ? 'Tersalin' : 'Salin'}</span>
              </button>
            </div>

            <div className="text-[10px] sm:text-[11px] text-gray-500 space-y-1 pt-1">
              <div className="flex items-center gap-1">
                <span>⏱️ Rekomendasi Jadwal:</span>
                <b className="text-gray-700">1x Seminggu (Minggu 02:00 WIB)</b>
              </div>
              <div className="flex items-center gap-1">
                <span>🤖 Laporan Telegram:</span>
                <b className="text-emerald-700">Otomatis dikirim setelah purge</b>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Tabel Pratinjau Antrean Data Calon Purge */}
      <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200/80 p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-gray-900 font-heading">
                Pratinjau Antrean Data Calon Pembersihan
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                {countAll} Data
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">
              Daftar seluruh data non-publik yang sedang berjalan dalam siklus retensi. Pantau judul berita, asal halaman, dan tanggal otomatis dibersihkan.
            </p>
          </div>
        </div>

        {/* Filter Tab & Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          <div className="flex items-center gap-1 sm:gap-1.5 bg-gray-100 p-1 rounded-xl overflow-x-auto no-scrollbar scroll-smooth">
            <button
              type="button"
              onClick={() => {
                setCandidateFilter('all');
                setCurrentPage(1);
              }}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                candidateFilter === 'all'
                  ? 'bg-white text-gray-900 shadow-xs font-bold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Semua Data ({countAll})
            </button>
            <button
              type="button"
              onClick={() => {
                setCandidateFilter('published_draft');
                setCurrentPage(1);
              }}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
                candidateFilter === 'published_draft'
                  ? 'bg-white text-emerald-700 shadow-xs font-bold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>Draf Live ({countPublished})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setCandidateFilter('raw_draft');
                setCurrentPage(1);
              }}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
                candidateFilter === 'raw_draft'
                  ? 'bg-white text-amber-700 shadow-xs font-bold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              <span>Draf Mentah ({countRaw})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setCandidateFilter('ai_log');
                setCurrentPage(1);
              }}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
                candidateFilter === 'ai_log'
                  ? 'bg-white text-blue-700 shadow-xs font-bold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              <span>Log AI ({countLogs})</span>
            </button>
          </div>

          <div className="relative min-w-[200px] sm:min-w-[260px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari judul, kategori, atau prompt..."
              className="w-full pl-8.5 pr-3 py-1.5 sm:py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-gray-800"
            />
          </div>
        </div>

        {/* Tabel Desktop & Mobile Cards */}
        {paginatedCandidates.length === 0 ? (
          <div className="text-center py-10 bg-gray-50/60 rounded-xl border border-dashed border-gray-200 p-6">
            <Info className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-xs sm:text-sm font-semibold text-gray-700">Tidak ada data yang cocok</p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {searchQuery
                ? 'Coba ganti kata kunci pencarian Anda.'
                : 'Belum ada data draf atau log dalam kategori ini.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200/80 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50">
                    <th className="py-2.5 px-3">Item / Judul Berita</th>
                    <th className="py-2.5 px-3">Asal Halaman (Sumber)</th>
                    <th className="py-2.5 px-3">Tanggal Dibuat</th>
                    <th className="py-2.5 px-3">Jadwal Pembersihan</th>
                    <th className="py-2.5 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedCandidates.map((item) => (
                    <tr key={`${item.itemType}-${item.id}`} className="hover:bg-gray-50/80 transition-colors">
                      {/* Judul & Detail */}
                      <td className="py-3 px-3 max-w-sm">
                        <div className="font-bold text-gray-900 line-clamp-2 leading-snug" title={item.title}>
                          {item.title}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mt-1">
                          <span>ID #{item.id}</span>
                          <span>•</span>
                          <span className="truncate max-w-[150px]">{item.categoryOrSource}</span>
                        </div>
                      </td>

                      {/* Asal Halaman */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex flex-col items-start gap-0.5">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              item.itemType === 'published_draft'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : item.itemType === 'raw_draft'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-blue-50 text-blue-800 border-blue-200'
                            }`}
                          >
                            {item.itemType === 'published_draft' ? (
                              <Newspaper className="w-3 h-3 text-emerald-600" />
                            ) : item.itemType === 'raw_draft' ? (
                              <Bot className="w-3 h-3 text-amber-600" />
                            ) : (
                              <FileCode2 className="w-3 h-3 text-blue-600" />
                            )}
                            <span>{item.sourceLabel}</span>
                          </span>
                          <span className="text-[10px] text-gray-500 font-medium pl-1">
                            └─ {item.sourceSubLabel}
                          </span>
                        </div>
                      </td>

                      {/* Tanggal Masuk */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-medium text-gray-800">
                          {new Date(item.createdAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          {item.ageDays === 0 ? 'Hari ini' : `${item.ageDays} hari lalu`}
                        </div>
                      </td>

                      {/* Status & Jadwal Hapus */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {item.isExpired ? (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[10px] animate-pulse">
                            <AlertTriangle className="w-3 h-3 text-amber-700" />
                            <span>⚡ Siap Dihapus (Jatuh Tempo)</span>
                          </div>
                        ) : (
                          <div>
                            <div className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-700">
                              <CalendarClock className="w-3 h-3 text-indigo-600" />
                              <span>
                                {new Date(item.scheduledPurgeAt).toLocaleDateString('id-ID', {
                                  day: 'numeric',
                                  month: 'short',
                                })}
                              </span>
                            </div>
                            <div className="text-[10px] text-gray-400 pl-4">
                              (dalam {item.daysRemaining} hari)
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Aksi Hapus Satuan */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setItemToDelete(item)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Hapus item ini sekarang"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="grid grid-cols-1 gap-2.5 md:hidden">
              {paginatedCandidates.map((item) => (
                <div
                  key={`mobile-${item.itemType}-${item.id}`}
                  className="bg-gray-50/70 border border-gray-200/90 rounded-xl p-3 space-y-2 shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                        item.itemType === 'published_draft'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : item.itemType === 'raw_draft'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-blue-50 text-blue-800 border-blue-200'
                      }`}
                    >
                      <span>{item.sourceLabel}</span>
                      <span>•</span>
                      <span>{item.sourceSubLabel}</span>
                    </span>

                    <button
                      type="button"
                      onClick={() => setItemToDelete(item)}
                      className="text-gray-400 hover:text-red-600 p-1 rounded cursor-pointer"
                      title="Hapus item ini sekarang"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h4 className="text-xs font-bold text-gray-900 line-clamp-2 leading-snug">
                    {item.title}
                  </h4>

                  <div className="flex items-center justify-between text-[10px] text-gray-500 pt-1.5 border-t border-gray-200/70">
                    <div>
                      📅 {new Date(item.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}{' '}
                      ({item.ageDays}h lalu)
                    </div>

                    <div>
                      {item.isExpired ? (
                        <span className="font-bold text-amber-700">⚡ Siap Dihapus</span>
                      ) : (
                        <span className="font-medium text-gray-600">⏳ Hapus dlm {item.daysRemaining} hari</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Paginasi Kontrol */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs text-gray-500">
                <span>
                  Halaman <b>{currentPage}</b> dari <b>{totalPages}</b>
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Konfirmasi Eksekusi Purge Massal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 font-heading">
                Konfirmasi Pembersihan Database
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
                Apakah Anda yakin ingin menghapus data sampah yang sudah melewati batas retensi?
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 text-xs space-y-1 text-gray-700">
              <div className="font-semibold text-gray-900 pb-1 border-b border-gray-200">
                Lingkup Pembersihan ({purgeScope === 'all' ? 'Semua' : purgeScope}):
              </div>
              <div>• Draf mentah usang: <b>{metrics.expiredRawDrafts} baris</b></div>
              <div>• Draf terbit lama: <b>{metrics.expiredPublishedDrafts} baris</b></div>
              <div>• Riwayat log AI: <b>{metrics.expiredAiLogs} baris</b></div>
              <div className="text-emerald-700 font-bold pt-1 border-t border-gray-200">
                ✅ {metrics.totalPublicArticles} artikel tayang di web publik tetap aman 100%.
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                disabled={isPurging}
                onClick={() => setShowConfirmModal(false)}
                className="w-1/2 py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isPurging}
                onClick={handleExecutePurge}
                className="w-1/2 py-2 px-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isPurging ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <span>Ya, Bersihkan</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Satuan */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl space-y-3.5">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-sm sm:text-base font-bold text-gray-900 font-heading">
                Hapus Item Ini Sekarang?
              </h3>
              <p className="text-xs text-gray-500 line-clamp-2 px-2">
                &ldquo;{itemToDelete.title}&rdquo;
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-2.5 border border-gray-200 text-[11px] text-gray-600 space-y-1">
              <div>
                Asal: <b>{itemToDelete.sourceLabel} ({itemToDelete.sourceSubLabel})</b>
              </div>
              <div className="text-emerald-700 font-medium">
                ✅ Berita di web publik tetap aman dan tidak akan terhapus.
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                disabled={isDeletingItem}
                onClick={() => setItemToDelete(null)}
                className="w-1/2 py-1.5 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeletingItem}
                onClick={handleConfirmDeleteIndividual}
                className="w-1/2 py-1.5 px-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                {isDeletingItem ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <span>Hapus</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
