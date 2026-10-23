'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Newspaper,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  Trash2,
  FileEdit,
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  X,
  Radio,
  BookOpen,
  AlertTriangle,
  CheckSquare,
  Square,
  Image as ImageIcon,
  CalendarClock,
  Send,
  ArrowUpRight,
} from 'lucide-react';
import {
  deleteDraftAction,
  deleteMultipleDraftsAction,
  deleteAllDraftsAction,
  convertDraftToArticleAction,
  attachPhotoToDraftAction,
  removePhotoFromDraftAction,
  instantPublishDraftAction,
  updateJurnalisPublishIntervalAction,
} from './actions';
import DraftPhotoModal from './DraftPhotoModal';

export interface JurnalisDraftItem {
  id: number;
  title: string;
  source: string;
  original_url: string;
  published_at: string | null;
  summary: string;
  status: string; // 'draft' | 'generated' | 'ready_to_publish' | 'published' | 'archived'
  generated_title: string | null;
  generated_article: string | null;
  category?: string | null;
  tags?: string[];
  cover_url?: string | null;
  cover_caption?: string | null;
  publish_at?: string | null;
  created_at: string;
}

function formatRelativeSchedule(publishAtStr: string | null | undefined): { label: string; isPast: boolean } {
  if (!publishAtStr) return { label: 'Menunggu giliran cron', isPast: false };
  const target = new Date(publishAtStr).getTime();
  const now = Date.now();
  const diffMs = target - now;

  if (diffMs <= 0) {
    return { label: '⚡ Siap Tayang (Jatuh Tempo)', isPast: true };
  }

  const diffMinutes = Math.round(diffMs / (60 * 1000));
  if (diffMinutes < 60) {
    return { label: `dalam ${diffMinutes} mnt`, isPast: false };
  }
  const hours = Math.floor(diffMinutes / 60);
  const mins = diffMinutes % 60;
  if (mins === 0) {
    return { label: `dalam ${hours} jam`, isPast: false };
  }
  return { label: `dalam ${hours}j ${mins}m`, isPast: false };
}

interface JurnalisClientViewProps {
  initialDrafts: JurnalisDraftItem[];
  initialIntervalMinutes?: number;
}

export default function JurnalisClientView({
  initialDrafts,
  initialIntervalMinutes = 60,
}: JurnalisClientViewProps) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<JurnalisDraftItem[]>(initialDrafts);
  const [intervalMinutes, setIntervalMinutes] = useState<number>(initialIntervalMinutes);
  const [isSavingInterval, setIsSavingInterval] = useState(false);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [convertingId, setConvertingId] = useState<number | null>(null);
  const [instantPublishingId, setInstantPublishingId] = useState<number | null>(null);
  const [removingPhotoId, setRemovingPhotoId] = useState<number | null>(null);
  const [photoModalDraft, setPhotoModalDraft] = useState<{
    draftId: number;
    title: string;
    currentCoverUrl?: string | null;
    currentCaption?: string | null;
    currentPublishAt?: string | null;
  } | null>(null);

  const [activeTab, setActiveTab] = useState<'all' | 'draft' | 'need_photo' | 'ready_to_publish' | 'published'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Seleksi Massal & Hapus Semua
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [deleteAllScope, setDeleteAllScope] = useState<'all' | 'draft' | 'generated'>('all');
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [confirmSingleDelete, setConfirmSingleDelete] = useState<{ id: number; title: string } | null>(null);

  const [activePreview, setActivePreview] = useState<{
    draftId: number;
    title: string;
    content: string;
    category?: string;
    tags?: string[];
  } | null>(null);

  const [copied, setCopied] = useState(false);

  // Generate artikel lewat endpoint AI
  async function handleGenerate(draftId: number) {
    setLoadingId(draftId);
    try {
      const res = await fetch('/api/admin/jurnalis/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId }),
      });

      const json = await res.json();
      if (json.success) {
        const nextStatus = json.data.status || 'generated';
        setDrafts((prev) =>
          prev.map((d) =>
            d.id === draftId
              ? {
                  ...d,
                  status: nextStatus,
                  generated_title: json.data.generatedTitle,
                  generated_article: json.data.generatedArticle,
                  category: json.data.category,
                  tags: json.data.tags,
                }
              : d
          )
        );
        setActivePreview({
          draftId,
          title: json.data.generatedTitle,
          content: json.data.generatedArticle,
          category: json.data.category,
          tags: json.data.tags,
        });
      } else {
        alert(json.details ? `${json.error}: ${json.details}` : json.error || 'Gagal membuat artikel AI');
      }
    } catch (err: any) {
      alert('Terjadi kesalahan jaringan saat memanggil generator AI');
    } finally {
      setLoadingId(null);
    }
  }

  // Simpan pengaturan interval antrean baru
  async function handleSaveInterval(newInterval: number) {
    if (isSavingInterval || intervalMinutes === newInterval) return;
    setIsSavingInterval(true);
    try {
      const res = await updateJurnalisPublishIntervalAction(newInterval);
      if (res.success && res.intervalMinutes) {
        setIntervalMinutes(res.intervalMinutes);
      } else {
        alert(res.error || 'Gagal menyimpan interval');
      }
    } catch {
      alert('Terjadi kesalahan jaringan saat menyimpan interval');
    } finally {
      setIsSavingInterval(false);
    }
  }

  // Sukses pasang foto ImgBB dari modal
  function handlePhotoSuccess(draftId: number, coverUrl: string, status: string, publishAt?: string | null) {
    setDrafts((prev) =>
      prev.map((d) =>
        d.id === draftId
          ? {
              ...d,
              cover_url: coverUrl,
              status: status || 'ready_to_publish',
              publish_at: publishAt || d.publish_at,
            }
          : d
      )
    );
  }

  // Hapus foto draf
  async function handleRemovePhoto(draftId: number) {
    if (!confirm('Hapus foto dari draf ini? Draf akan dikeluarkan dari antrean publikasi berkala.')) {
      return;
    }

    setRemovingPhotoId(draftId);
    try {
      const res = await removePhotoFromDraftAction(draftId);
      if (res.success) {
        setDrafts((prev) =>
          prev.map((d) =>
            d.id === draftId
              ? {
                  ...d,
                  cover_url: null,
                  cover_caption: null,
                  status: res.status || 'generated',
                }
              : d
          )
        );
      } else {
        alert(res.error || 'Gagal menghapus foto.');
      }
    } catch {
      alert('Terjadi gangguan jaringan saat menghapus foto.');
    } finally {
      setRemovingPhotoId(null);
    }
  }

  // Publikasi instan (bypass antrean cron)
  async function handleInstantPublish(draftId: number) {
    const draft = drafts.find((d) => d.id === draftId);
    if (!draft) return;

    if (!draft.cover_url) {
      alert('Foto cover ImgBB wajib diisi sebelum menerbitkan berita!');
      return;
    }

    if (!confirm(`Terbitkan berita "${draft.generated_title || draft.title}" sekarang ke portal?`)) {
      return;
    }

    setInstantPublishingId(draftId);
    try {
      const res = await instantPublishDraftAction(draftId);
      if (res.success) {
        setDrafts((prev) =>
          prev.map((d) => (d.id === draftId ? { ...d, status: 'published' } : d))
        );
        alert(res.message || 'Berita berhasil tayang di portal AdaFakta!');
      } else {
        alert(res.error || 'Gagal menerbitkan artikel.');
      }
    } catch {
      alert('Terjadi kesalahan jaringan saat memproses publikasi.');
    } finally {
      setInstantPublishingId(null);
    }
  }

  // Eksekusi Hapus 1 Draf
  async function executeSingleDelete(draftId: number) {
    setDeletingId(draftId);
    try {
      const res = await deleteDraftAction(draftId);
      if (res.success) {
        setDrafts((prev) => prev.filter((d) => d.id !== draftId));
        setSelectedIds((prev) => prev.filter((id) => id !== draftId));
        if (activePreview?.draftId === draftId) {
          setActivePreview(null);
        }
        setConfirmSingleDelete(null);
      } else {
        alert(res.error || 'Gagal menghapus draf');
      }
    } catch {
      alert('Terjadi kesalahan jaringan saat menghapus draf');
    } finally {
      setDeletingId(null);
    }
  }

  // Toggle Checkbox Seleksi Draf
  function handleToggleSelect(draftId: number) {
    setSelectedIds((prev) =>
      prev.includes(draftId) ? prev.filter((id) => id !== draftId) : [...prev, draftId]
    );
  }

  // Pilih Semua yang Tampil Sesuai Filter
  function handleSelectAllFiltered() {
    const allFilteredIds = filteredDrafts.map((d) => d.id);
    const isAllSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedIds.includes(id));
    if (isAllSelected) {
      setSelectedIds((prev) => prev.filter((id) => !allFilteredIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  }

  // Eksekusi Hapus Draf Terpilih (Bulk Delete)
  async function handleDeleteSelected() {
    if (selectedIds.length === 0) return;
    if (!confirm(`Hapus ${selectedIds.length} usulan draf berita jurnalis yang dipilih?`)) return;

    setIsDeletingBulk(true);
    try {
      const res = await deleteMultipleDraftsAction(selectedIds);
      if (res.success) {
        setDrafts((prev) => prev.filter((d) => !selectedIds.includes(d.id)));
        setSelectedIds([]);
        if (activePreview && selectedIds.includes(activePreview.draftId)) {
          setActivePreview(null);
        }
      } else {
        alert(res.error || 'Gagal menghapus draf terpilih');
      }
    } catch {
      alert('Terjadi kesalahan jaringan saat menghapus draf terpilih');
    } finally {
      setIsDeletingBulk(false);
    }
  }

  // Eksekusi Hapus Semua Draf (Berdasarkan Scope)
  async function handleExecuteDeleteAll() {
    setIsDeletingAll(true);
    try {
      const res = await deleteAllDraftsAction(deleteAllScope);
      if (res.success) {
        if (deleteAllScope === 'draft') {
          setDrafts((prev) => prev.filter((d) => d.status !== 'draft'));
        } else if (deleteAllScope === 'generated') {
          setDrafts((prev) => prev.filter((d) => d.status !== 'generated' && d.status !== 'published'));
        } else {
          setDrafts([]);
        }
        setSelectedIds([]);
        setActivePreview(null);
        setShowDeleteAllModal(false);
      } else {
        alert(res.error || 'Gagal menghapus draf');
      }
    } catch {
      alert('Terjadi kesalahan jaringan saat menghapus draf');
    } finally {
      setIsDeletingAll(false);
    }
  }

  // Pindahkan ke meja tulis / artikel utama
  async function handleConvertToArticle(draftId: number) {
    setConvertingId(draftId);
    try {
      const res = await convertDraftToArticleAction(draftId);
      if (res.success && res.articleId) {
        setDrafts((prev) =>
          prev.map((d) => (d.id === draftId ? { ...d, status: 'published' } : d))
        );
        router.push(`/admin/edit/${res.articleId}`);
      } else {
        alert(res.error || 'Gagal memindahkan ke draf artikel');
      }
    } catch {
      alert('Terjadi kesalahan jaringan saat memproses artikel');
    } finally {
      setConvertingId(null);
    }
  }

  // Salin artikel ke clipboard
  function handleCopy() {
    if (!activePreview) return;
    const textToCopy = `${activePreview.title}\n\n${activePreview.content}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Filter usulan berita
  const filteredDrafts = drafts.filter((d) => {
    let matchesTab = true;
    if (activeTab === 'draft') {
      matchesTab = d.status === 'draft';
    } else if (activeTab === 'need_photo') {
      matchesTab =
        (d.status === 'generated' || !!d.generated_article) &&
        (!d.cover_url || d.cover_url.trim() === '') &&
        d.status !== 'published';
    } else if (activeTab === 'ready_to_publish') {
      matchesTab = d.status === 'ready_to_publish';
    } else if (activeTab === 'published') {
      matchesTab = d.status === 'published';
    }

    const matchesSearch =
      searchQuery.trim() === '' ||
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.category && d.category.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesTab && matchesSearch;
  });

  const totalAll = drafts.length;
  const totalDraft = drafts.filter((d) => d.status === 'draft').length;
  const totalNeedPhoto = drafts.filter(
    (d) =>
      (d.status === 'generated' || !!d.generated_article) &&
      (!d.cover_url || d.cover_url.trim() === '') &&
      d.status !== 'published'
  ).length;
  const totalQueued = drafts.filter((d) => d.status === 'ready_to_publish').length;
  const totalPublished = drafts.filter((d) => d.status === 'published').length;
  const totalGenerated = drafts.filter((d) => d.status !== 'draft').length;

  // Draf dalam antrean diurutkan berdasarkan publish_at ASC untuk nomor urut
  const queuedDrafts = [...drafts]
    .filter((d) => d.status === 'ready_to_publish')
    .sort((a, b) => {
      const timeA = a.publish_at ? new Date(a.publish_at).getTime() : 0;
      const timeB = b.publish_at ? new Date(b.publish_at).getTime() : 0;
      return timeA - timeB;
    });

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200/80 p-3.5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center shrink-0">
              <Newspaper className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900 tracking-tight font-heading">
                  Meja Redaksi Jurnalis AI
                </h1>
                <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-semibold border border-indigo-200">
                  Antrean Publikasi Aktif
                </span>
              </div>
              <p className="text-[11px] sm:text-sm text-gray-500 mt-1 max-w-2xl leading-relaxed">
                Pusat kurasi berita otomatis. Berita hanya akan masuk antrean tayang berkala (cron) setelah naskah AI siap dan foto ImgBB terisi.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 self-start md:self-center">
            <a
              href="https://bottelejurnalis.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-lg sm:rounded-xl shadow-xs transition-all"
              title="Buka web console bot jurnalis telegram"
            >
              <ExternalLink className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>Bot Console ↗</span>
            </a>
            {totalAll > 0 && (
              <button
                type="button"
                onClick={() => setShowDeleteAllModal(true)}
                className="inline-flex items-center gap-1 px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200/80 rounded-lg sm:rounded-xl transition-all cursor-pointer shadow-xs"
                title="Hapus seluruh usulan draf jurnalis"
              >
                <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-red-600" />
                <span>Hapus Semua</span>
              </button>
            )}
            <button
              onClick={() => router.refresh()}
              className="inline-flex items-center gap-1 px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-[11px] sm:text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg sm:rounded-xl transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>Segarkan</span>
            </button>
          </div>
        </div>

        {/* Statistik Kartu Antrean 5 Kolom */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 mt-4 sm:mt-6 pt-3.5 sm:pt-5 border-t border-gray-100">
          <div className="bg-gray-50/70 border border-gray-200/60 rounded-xl p-2.5 sm:p-3 flex items-center justify-between">
            <div>
              <span className="text-[9px] sm:text-[10px] font-semibold text-gray-500 uppercase tracking-wider block">
                Total Usulan
              </span>
              <span className="text-lg sm:text-xl font-bold text-gray-900">{totalAll}</span>
            </div>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <Radio className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>

          <div className="bg-gray-50/70 border border-gray-200/60 rounded-xl p-2.5 sm:p-3 flex items-center justify-between">
            <div>
              <span className="text-[9px] sm:text-[10px] font-semibold text-amber-600 uppercase tracking-wider block">
                Draf Mentah
              </span>
              <span className="text-lg sm:text-xl font-bold text-amber-700">{totalDraft}</span>
            </div>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>

          <div className="bg-amber-50/50 border border-amber-200/60 rounded-xl p-2.5 sm:p-3 flex items-center justify-between">
            <div>
              <span className="text-[9px] sm:text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
                ⚠️ Butuh Foto
              </span>
              <span className="text-lg sm:text-xl font-bold text-amber-800">{totalNeedPhoto}</span>
            </div>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <ImageIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>

          <div className="bg-indigo-50/50 border border-indigo-200/60 rounded-xl p-2.5 sm:p-3 flex items-center justify-between">
            <div>
              <span className="text-[9px] sm:text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">
                ⏳ Antrean
              </span>
              <span className="text-lg sm:text-xl font-bold text-indigo-800">{totalQueued}</span>
            </div>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <CalendarClock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>

          <div className="bg-emerald-50/50 border border-emerald-200/60 rounded-xl p-2.5 sm:p-3 flex items-center justify-between col-span-2 sm:col-span-1">
            <div>
              <span className="text-[9px] sm:text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                🚀 Sudah Tayang
              </span>
              <span className="text-lg sm:text-xl font-bold text-emerald-800">{totalPublished}</span>
            </div>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Waterfall Queue Interval Control Card */}
      <div className="bg-gradient-to-r from-indigo-50/90 via-white to-purple-50/90 border border-indigo-200/80 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Clock className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="text-xs sm:text-sm font-bold text-gray-900 font-heading">
                  Jeda Antrean Publikasi (Waterfall Queue)
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                  ⚡ Berjadwal Runtun
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">
                Setiap berita berfoto otomatis dijadwalkan berjarak <b>{intervalMinutes >= 60 ? `${intervalMinutes / 60} jam` : `${intervalMinutes} menit`}</b> dari berita sebelumnya.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 self-start md:self-center shrink-0">
            <span className="text-[10px] sm:text-xs text-gray-400 font-medium hidden sm:inline">
              Pilih Jeda:
            </span>
            {[
              { label: '30 Menit', val: 30 },
              { label: '1 Jam (Default)', val: 60 },
              { label: '2 Jam', val: 120 },
              { label: '3 Jam', val: 180 },
            ].map((opt) => (
              <button
                key={opt.val}
                type="button"
                disabled={isSavingInterval}
                onClick={() => handleSaveInterval(opt.val)}
                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold transition-all cursor-pointer ${
                  intervalMinutes === opt.val
                    ? 'bg-indigo-600 text-white shadow-xs font-bold'
                    : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-300/80'
                }`}
              >
                {opt.label}
              </button>
            ))}
            {isSavingInterval && (
              <Loader2 className="w-3.5 h-3.5 text-indigo-600 animate-spin shrink-0 ml-1" />
            )}
          </div>
        </div>
      </div>

      {/* Filter Tab & Search Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5 sm:gap-3">
        <div className="flex items-center gap-1 sm:gap-1.5 bg-gray-200/70 p-1 rounded-xl overflow-x-auto no-scrollbar scroll-smooth">
          <button
            onClick={() => setActiveTab('all')}
            className={`shrink-0 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-white text-gray-900 shadow-xs font-bold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Semua ({totalAll})
          </button>
          <button
            onClick={() => setActiveTab('draft')}
            className={`shrink-0 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'draft'
                ? 'bg-white text-amber-700 shadow-xs font-bold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Mentah ({totalDraft})
          </button>
          <button
            onClick={() => setActiveTab('need_photo')}
            className={`shrink-0 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'need_photo'
                ? 'bg-white text-amber-800 shadow-xs font-bold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            ⚠️ Butuh Foto ({totalNeedPhoto})
          </button>
          <button
            onClick={() => setActiveTab('ready_to_publish')}
            className={`shrink-0 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'ready_to_publish'
                ? 'bg-white text-indigo-700 shadow-xs font-bold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            ⏳ Antrean ({totalQueued})
          </button>
          <button
            onClick={() => setActiveTab('published')}
            className={`shrink-0 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'published'
                ? 'bg-white text-emerald-700 shadow-xs font-bold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            🚀 Sudah Tayang ({totalPublished})
          </button>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {filteredDrafts.length > 0 && (
            <button
              type="button"
              onClick={handleSelectAllFiltered}
              className={`inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold border transition-all cursor-pointer shrink-0 ${
                filteredDrafts.length > 0 && filteredDrafts.every((d) => selectedIds.includes(d.id))
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-bold'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {filteredDrafts.length > 0 && filteredDrafts.every((d) => selectedIds.includes(d.id)) ? (
                <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
              ) : (
                <Square className="w-3.5 h-3.5 text-gray-400" />
              )}
              <span className="hidden xs:inline">
                {filteredDrafts.length > 0 && filteredDrafts.every((d) => selectedIds.includes(d.id))
                  ? 'Batal'
                  : 'Pilih Semua'}
              </span>
            </button>
          )}

          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari berita..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 sm:pl-9 pr-3 py-1.5 text-[11px] sm:text-xs bg-white border border-gray-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Floating Bulk Action Bar (Muncul saat ada item dipilih) */}
      {selectedIds.length > 0 && (
        <div className="bg-[#0f172a] text-white p-3 sm:p-4 rounded-xl sm:rounded-2xl flex flex-wrap items-center justify-between gap-2.5 shadow-xl border border-slate-700 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-indigo-500/30 border border-indigo-400/40 flex items-center justify-center text-[10px] sm:text-xs font-bold text-indigo-200">
              {selectedIds.length}
            </span>
            <span className="text-[11px] sm:text-sm font-semibold">
              {selectedIds.length} draf dipilih
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              disabled={isDeletingBulk}
              onClick={handleDeleteSelected}
              className="inline-flex items-center gap-1 px-3 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400 rounded-lg sm:rounded-xl transition-all cursor-pointer shadow-xs"
            >
              {isDeletingBulk ? (
                <Loader2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              )}
              <span>Hapus ({selectedIds.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="px-2.5 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Grid Usulan Berita */}
      {filteredDrafts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200/80 p-12 text-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-3">
            <Newspaper className="w-7 h-7" />
          </div>
          <h3 className="text-base font-semibold text-gray-900">Belum Ada Usulan Berita</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
            {searchQuery
              ? 'Tidak ada usulan berita yang cocok dengan kata kunci pencarian Anda.'
              : 'Bot Jurnalis belum menyetorkan draf berita baru. Jalankan bot berita-ai untuk mulai mengalirkan usulan intelijen.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4 lg:gap-5">
          {filteredDrafts.map((draft) => {
            const hasArticle = !!draft.generated_article;
            const hasPhoto = !!(draft.cover_url && draft.cover_url.trim().length > 0);
            const isQueued = draft.status === 'ready_to_publish';
            const isPublished = draft.status === 'published';
            const isNeedPhoto = hasArticle && !hasPhoto && !isPublished;
            const queueRank = isQueued ? queuedDrafts.findIndex((q) => q.id === draft.id) + 1 : 0;

            const isGenerating = loadingId === draft.id;
            const isDeleting = deletingId === draft.id;
            const isConverting = convertingId === draft.id;
            const isInstantPublishing = instantPublishingId === draft.id;
            const isRemovingPhoto = removingPhotoId === draft.id;

            return (
              <div
                key={draft.id}
                className={`bg-white rounded-xl sm:rounded-2xl border shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group ${
                  isQueued
                    ? 'border-indigo-300 ring-1 ring-indigo-200/50'
                    : isPublished
                    ? 'border-emerald-300 bg-emerald-50/10'
                    : isNeedPhoto
                    ? 'border-amber-300'
                    : 'border-gray-200/90'
                }`}
              >
                <div className="p-2 sm:p-4 flex-1 flex flex-col">
                  {/* Top Bar: Checkbox + Source + Category + Queue Status */}
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(draft.id)}
                        onChange={() => handleToggleSelect(draft.id)}
                        className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                        title="Pilih draf ini"
                      />
                      <span className="text-[10px] sm:text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-1.5 py-0.5 rounded truncate max-w-[55px] xs:max-w-[80px] sm:max-w-[110px]">
                        {draft.source}
                      </span>
                      {draft.category && (
                        <span className="hidden sm:inline-block text-[10px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded shrink-0 truncate max-w-[80px]">
                          {draft.category}
                        </span>
                      )}
                    </div>

                    {isPublished ? (
                      <span className="text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0 flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-600" />
                        <span className="hidden xs:inline">Tayang</span>
                        <span className="xs:hidden">Live</span>
                      </span>
                    ) : isQueued ? (
                      <span className="text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-300 shrink-0 flex items-center gap-1">
                        <CalendarClock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-indigo-600" />
                        <span className="hidden xs:inline">Antrean #{queueRank > 0 ? queueRank : 1}</span>
                        <span className="xs:hidden">#{queueRank > 0 ? queueRank : 1}</span>
                      </span>
                    ) : isNeedPhoto ? (
                      <span className="text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 shrink-0 flex items-center gap-1">
                        <AlertCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-600" />
                        <span className="hidden xs:inline">Butuh Foto</span>
                        <span className="xs:hidden">Foto</span>
                      </span>
                    ) : (
                      <span className="text-[9px] sm:text-[10px] font-semibold px-1.5 sm:px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200 shrink-0">
                        <span className="hidden sm:inline">⏳ Draf Mentah</span>
                        <span className="sm:hidden">Mentah</span>
                      </span>
                    )}
                  </div>

                  {/* Visual Anchor: Slot Foto ImgBB atau Status Cover */}
                  {draft.cover_url ? (
                    <div className="space-y-1 mb-2">
                      <div className="relative rounded-lg sm:rounded-xl overflow-hidden border border-gray-200 bg-gray-100 aspect-video group/img">
                        <img
                          src={draft.cover_url}
                          alt={draft.title}
                          className="w-full h-full object-cover transition-transform group-hover/img:scale-105 duration-300"
                        />
                        <div className="absolute top-1 left-1 bg-black/60 backdrop-blur-xs text-white text-[8px] sm:text-[10px] font-semibold px-1.5 py-0.5 rounded flex items-center gap-1">
                          <ImageIcon className="w-2.5 h-2.5 text-emerald-400" />
                          <span className="hidden sm:inline">ImgBB</span>
                        </div>
                        <div className="absolute bottom-1 right-1 flex items-center gap-0.5 sm:gap-1 bg-black/60 backdrop-blur-xs p-0.5 sm:p-1 rounded-md">
                          <button
                            type="button"
                            onClick={() =>
                              setPhotoModalDraft({
                                draftId: draft.id,
                                title: draft.generated_title || draft.title,
                                currentCoverUrl: draft.cover_url,
                                currentCaption: draft.cover_caption,
                                currentPublishAt: draft.publish_at,
                              })
                            }
                            className="px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded transition-colors cursor-pointer"
                            title="Ganti Foto / Atur Jam"
                          >
                            Ganti
                          </button>
                          <button
                            type="button"
                            disabled={isRemovingPhoto}
                            onClick={() => handleRemovePhoto(draft.id)}
                            className="px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold text-white bg-red-600 hover:bg-red-700 rounded transition-colors cursor-pointer"
                            title="Hapus Foto"
                          >
                            {isRemovingPhoto ? (
                              <Loader2 className="w-2.5 h-2.5 animate-spin" />
                            ) : (
                              'Hapus'
                            )}
                          </button>
                        </div>
                      </div>
                      {draft.cover_caption && (
                        <p className="text-[9px] sm:text-[10px] text-gray-500 truncate" title={draft.cover_caption}>
                          {draft.cover_caption}
                        </p>
                      )}
                      {isQueued && (
                        <div className="space-y-1 mt-1.5">
                          <div className="flex items-center justify-between gap-1 text-[9px] sm:text-[10px]">
                            <span className="inline-flex items-center gap-1 font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 rounded px-1.5 py-0.5 shadow-2xs">
                              ⏳ Urutan #{queueRank > 0 ? queueRank : 1}
                            </span>
                            {draft.publish_at && (
                              <span
                                className={`font-semibold px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] ${
                                  formatRelativeSchedule(draft.publish_at).isPast
                                    ? 'bg-amber-100 text-amber-800 font-bold animate-pulse border border-amber-300'
                                    : 'bg-gray-100 text-gray-600 border border-gray-200'
                                }`}
                              >
                                {formatRelativeSchedule(draft.publish_at).label}
                              </span>
                            )}
                          </div>
                          {draft.publish_at && (
                            <div className="flex items-center gap-1 text-[9px] sm:text-[10px] font-medium text-gray-700 bg-gray-50 border border-gray-200/70 rounded-md px-1.5 py-0.5">
                              <CalendarClock className="w-3 h-3 text-indigo-600 shrink-0" />
                              <span className="truncate">
                                Tayang: {new Date(draft.publish_at).toLocaleDateString('id-ID', {
                                  day: 'numeric',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })} WIB
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : isPublished ? (
                    <div className="rounded-lg sm:rounded-xl bg-emerald-50/80 border border-emerald-200/80 p-2 sm:p-2.5 text-center mb-2">
                      <div className="flex items-center justify-center gap-1 text-[10px] sm:text-xs font-bold text-emerald-800">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span className="truncate">Tayang di Portal</span>
                      </div>
                      <p className="text-[9px] sm:text-[10px] text-emerald-600 mt-0.5 line-clamp-1">
                        Artikel sudah live di website
                      </p>
                    </div>
                  ) : isNeedPhoto ? (
                    <div className="rounded-lg sm:rounded-xl border border-dashed border-amber-300 bg-amber-50/40 p-2 sm:p-2.5 text-center mb-2">
                      <div className="flex items-center justify-center gap-1 text-[10px] sm:text-xs font-semibold text-amber-900">
                        <ImageIcon className="w-3 h-3 text-amber-600 shrink-0" />
                        <span className="truncate">Foto Belum Diisi</span>
                      </div>
                      <p className="text-[9px] sm:text-[10px] text-amber-700/80 mt-0.5 line-clamp-1">
                        Isi foto agar antre terbit
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          setPhotoModalDraft({
                            draftId: draft.id,
                            title: draft.generated_title || draft.title,
                            currentCoverUrl: null,
                            currentCaption: null,
                          })
                        }
                        className="mt-1.5 inline-flex items-center justify-center gap-1 w-full py-1 px-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-md text-[10px] sm:text-xs font-bold transition-all shadow-2xs cursor-pointer"
                      >
                        <ImageIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        <span>+ Pasang Foto</span>
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-lg sm:rounded-xl border border-dashed border-gray-200 bg-gray-50/60 p-2 sm:p-2.5 text-center mb-2">
                      <div className="flex items-center justify-center gap-1 text-[10px] sm:text-xs text-gray-500 font-medium">
                        <Sparkles className="w-3 h-3 text-indigo-400 shrink-0" />
                        <span className="truncate">Draf Mentah</span>
                      </div>
                      <p className="text-[9px] sm:text-[10px] text-gray-400 mt-0.5 line-clamp-1">
                        Klik Generate AI di bawah
                      </p>
                    </div>
                  )}

                  {/* Judul Berita */}
                  <h3
                    className="font-bold text-xs sm:text-sm lg:text-base text-gray-900 line-clamp-2 leading-tight sm:leading-snug group-hover:text-indigo-600 transition-colors mb-1"
                    title={draft.generated_title || draft.title}
                  >
                    {draft.generated_title || draft.title}
                  </h3>

                  {/* Ringkasan Berita */}
                  <p className="text-[10px] sm:text-xs text-gray-600 line-clamp-2 leading-relaxed mb-2 flex-1">
                    {draft.summary || 'Tidak ada ringkasan teks dari sumber berita.'}
                  </p>

                  {/* Meta Bar: Jam, Link Sumber, Tombol Hapus */}
                  <div className="flex items-center justify-between text-[9px] sm:text-[11px] text-gray-400 pt-1.5 border-t border-gray-100 mt-auto">
                    <div className="flex items-center gap-1 truncate max-w-[95px] xs:max-w-[120px] sm:max-w-none">
                      <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />
                      <span className="truncate">
                        {draft.published_at
                          ? new Date(draft.published_at).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                            })
                          : new Date(draft.created_at).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                            })}
                      </span>
                    </div>

                    <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                      <a
                        href={draft.original_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-indigo-600 p-1 rounded transition-colors"
                        title="Buka Sumber Asli"
                      >
                        <ExternalLink className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      </a>

                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={() => setConfirmSingleDelete({ id: draft.id, title: draft.title })}
                        className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-1 rounded transition-colors cursor-pointer"
                        title="Hapus Usulan Draf Ini"
                      >
                        {isDeleting ? (
                          <Loader2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 animate-spin" />
                        ) : (
                          <Trash2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions Footer */}
                <div className="p-2 sm:p-3 bg-gray-50/70 border-t border-gray-100 space-y-1.5 sm:space-y-2">
                  {hasArticle ? (
                    <div className="space-y-1.5 sm:space-y-2">
                      <div className="grid grid-cols-2 gap-1 sm:gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setActivePreview({
                              draftId: draft.id,
                              title: draft.generated_title || draft.title,
                              content: draft.generated_article || '',
                              category: draft.category || undefined,
                              tags: draft.tags || undefined,
                            })
                          }
                          className="w-full py-1.5 sm:py-2 px-1 sm:px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                          title="Lihat Hasil Naskah AI"
                        >
                          <BookOpen className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                          <span className="truncate">Naskah</span>
                        </button>

                        <button
                          type="button"
                          disabled={isConverting}
                          onClick={() => handleConvertToArticle(draft.id)}
                          className="w-full py-1.5 sm:py-2 px-1 sm:px-2 bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                          title="Buka Editor Lengkap"
                        >
                          {isConverting ? (
                            <Loader2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-spin" />
                          ) : (
                            <FileEdit className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                          )}
                          <span className="truncate">Editor</span>
                        </button>
                      </div>

                      {/* Tombol Publikasi Instan (Bypass Cron) jika draf sudah siap di antrean */}
                      {isQueued && (
                        <button
                          type="button"
                          disabled={isInstantPublishing}
                          onClick={() => handleInstantPublish(draft.id)}
                          className="w-full py-1.5 sm:py-2 px-1.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50 text-white rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                          title="Terbitkan detik ini juga tanpa menunggu jadwal cron berkala"
                        >
                          {isInstantPublishing ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                              <span className="truncate">Menerbitkan...</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-3 h-3 shrink-0" />
                              <span className="truncate">🚀 Terbitkan (Bypass)</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={isGenerating}
                      onClick={() => handleGenerate(draft.id)}
                      className="w-full py-1.5 sm:py-2.5 px-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                      title="Generate Berita AI (5W+1H)"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                          <span className="truncate">Menulis...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3 text-indigo-200 shrink-0" />
                          <span className="truncate">⚡ Generate AI</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Preview Artikel Lengkap AI */}
      {activePreview && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[88vh] flex flex-col overflow-hidden shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-gray-900 leading-none">
                    Hasil Naskah Jurnalis AI
                  </h3>
                  <span className="text-[11px] text-gray-500 mt-0.5 block">
                    Kaidah 5W+1H, gaya jurnalistik objektif & mendalam
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActivePreview(null)}
                className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-7 overflow-y-auto space-y-4">
              {activePreview.category && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Kategori: {activePreview.category}
                  </span>
                </div>
              )}

              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight font-heading">
                {activePreview.title}
              </h1>

              <div className="prose prose-sm sm:prose-base max-w-none whitespace-pre-line text-gray-700 leading-relaxed font-sans pt-2 border-t border-gray-100">
                {activePreview.content}
              </div>

              {activePreview.tags && activePreview.tags.length > 0 && (
                <div className="pt-4 border-t border-gray-100 flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-semibold text-gray-400 mr-1">Tags:</span>
                  {activePreview.tags.map((t, idx) => (
                    <span
                      key={idx}
                      className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleCopy}
                className="px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 rounded-xl text-xs font-medium text-gray-700 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-semibold">Tersalin ke Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-gray-500" />
                    <span>Salin Judul & Isi</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={convertingId === activePreview.draftId}
                  onClick={() => handleConvertToArticle(activePreview.draftId)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {convertingId === activePreview.draftId ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FileEdit className="w-3.5 h-3.5" />
                  )}
                  <span>Pindahkan ke Meja Tulis / Terbitkan</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActivePreview(null)}
                  className="px-4 py-2 text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus 1 Draf */}
      {confirmSingleDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-base text-gray-900 font-heading">
                  Hapus Usulan Draf Ini?
                </h3>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2 font-medium">
                  &ldquo;{confirmSingleDelete.title}&rdquo;
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-100">
              Draf berita intelijen ini akan dihapus permanen dari antrean redaksi AdaFakta.
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setConfirmSingleDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deletingId === confirmSingleDelete.id}
                onClick={() => executeSingleDelete(confirmSingleDelete.id)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400 rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                {deletingId === confirmSingleDelete.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Ya, Hapus Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Semua Draf */}
      {showDeleteAllModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 animate-in zoom-in-95 duration-150 space-y-5">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-900 font-heading">
                  Hapus Semua Usulan Draf Jurnalis?
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  Pilih cakupan draf berita yang ingin dibersihkan dari antrean redaksi:
                </p>
              </div>
            </div>

            {/* Pilihan Scope */}
            <div className="space-y-2">
              <label
                onClick={() => setDeleteAllScope('all')}
                className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                  deleteAllScope === 'all'
                    ? 'bg-red-50/70 border-red-300 text-red-950 font-bold'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 font-medium'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="scope"
                    checked={deleteAllScope === 'all'}
                    onChange={() => setDeleteAllScope('all')}
                    className="text-red-600 focus:ring-red-500"
                  />
                  <span className="text-xs sm:text-sm">Hapus Seluruh Usulan Berita</span>
                </div>
                <span className="text-xs bg-white px-2 py-0.5 rounded-md border border-gray-200 font-bold">
                  {totalAll} Draf
                </span>
              </label>

              <label
                onClick={() => setDeleteAllScope('draft')}
                className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                  deleteAllScope === 'draft'
                    ? 'bg-amber-50/70 border-amber-300 text-amber-950 font-bold'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 font-medium'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="scope"
                    checked={deleteAllScope === 'draft'}
                    onChange={() => setDeleteAllScope('draft')}
                    className="text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-xs sm:text-sm">Hapus Draf Mentah Saja (Belum AI)</span>
                </div>
                <span className="text-xs bg-white px-2 py-0.5 rounded-md border border-gray-200 font-bold">
                  {totalDraft} Draf
                </span>
              </label>

              <label
                onClick={() => setDeleteAllScope('generated')}
                className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                  deleteAllScope === 'generated'
                    ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 font-bold'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 font-medium'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="scope"
                    checked={deleteAllScope === 'generated'}
                    onChange={() => setDeleteAllScope('generated')}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-xs sm:text-sm">Hapus Naskah Siap Terbit Saja</span>
                </div>
                <span className="text-xs bg-white px-2 py-0.5 rounded-md border border-gray-200 font-bold">
                  {totalGenerated} Draf
                </span>
              </label>
            </div>

            <div className="p-3 bg-red-50 border border-red-200/80 rounded-xl text-xs text-red-800 leading-relaxed">
              ⚠️ <b>Peringatan:</b> Tindakan ini akan mengosongkan antrean terpilih secara permanen dari database.
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeletingAll}
                onClick={() => setShowDeleteAllModal(false)}
                className="px-4 py-2.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
              >
                Batalkan
              </button>
              <button
                type="button"
                disabled={isDeletingAll || totalAll === 0}
                onClick={handleExecuteDeleteAll}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400 rounded-xl transition-all cursor-pointer shadow-xs"
              >
                {isDeletingAll ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sedang Membersihkan...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Ya, Hapus Sekarang</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Upload / Tempel Foto ImgBB */}
      {photoModalDraft && (
        <DraftPhotoModal
          isOpen={!!photoModalDraft}
          onClose={() => setPhotoModalDraft(null)}
          draftId={photoModalDraft.draftId}
          draftTitle={photoModalDraft.title}
          initialCoverUrl={photoModalDraft.currentCoverUrl}
          initialCaption={photoModalDraft.currentCaption}
          initialPublishAt={photoModalDraft.currentPublishAt}
          onSuccess={(coverUrl, status, publishAt) =>
            handlePhotoSuccess(photoModalDraft.draftId, coverUrl, status, publishAt)
          }
        />
      )}
    </div>
  );
}
