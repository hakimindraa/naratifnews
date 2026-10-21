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
} from 'lucide-react';
import {
  deleteDraftAction,
  deleteMultipleDraftsAction,
  deleteAllDraftsAction,
  convertDraftToArticleAction,
} from './actions';

export interface JurnalisDraftItem {
  id: number;
  title: string;
  source: string;
  original_url: string;
  published_at: string | null;
  summary: string;
  status: string;
  generated_title: string | null;
  generated_article: string | null;
  created_at: string;
}

interface JurnalisClientViewProps {
  initialDrafts: JurnalisDraftItem[];
}

export default function JurnalisClientView({ initialDrafts }: JurnalisClientViewProps) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<JurnalisDraftItem[]>(initialDrafts);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [convertingId, setConvertingId] = useState<number | null>(null);

  const [activeTab, setActiveTab] = useState<'all' | 'draft' | 'generated'>('all');
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
        setDrafts((prev) =>
          prev.map((d) =>
            d.id === draftId
              ? {
                  ...d,
                  status: 'generated',
                  generated_title: json.data.generatedTitle,
                  generated_article: json.data.generatedArticle,
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
    const matchesTab =
      activeTab === 'all'
        ? true
        : activeTab === 'draft'
        ? d.status === 'draft'
        : d.status === 'generated' || d.status === 'published';

    const matchesSearch =
      searchQuery.trim() === '' ||
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.summary.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesTab && matchesSearch;
  });

  const totalAll = drafts.length;
  const totalDraft = drafts.filter((d) => d.status === 'draft').length;
  const totalGenerated = drafts.filter(
    (d) => d.status === 'generated' || d.status === 'published'
  ).length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center shrink-0">
              <Newspaper className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight font-heading">
                  Meja Redaksi Jurnalis AI
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-semibold border border-indigo-200">
                  Bot Intel Live
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-2xl leading-relaxed">
                Pusat penerimaan intelijen berita otomatis dari Bot Jurnalis (<code className="text-xs bg-gray-100 px-1 py-0.5 rounded">berita-ai</code>). Redaktur cukup memilih bahan dan 1-klik generate untuk menyusun naskah berita 5W+1H siap terbit.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center">
            <a
              href="https://bottelejurnalis.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-xl shadow-xs transition-all"
              title="Buka web console bot jurnalis telegram"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Buka Bot Console ↗</span>
            </a>
            {totalAll > 0 && (
              <button
                type="button"
                onClick={() => setShowDeleteAllModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200/80 rounded-xl transition-all cursor-pointer shadow-xs"
                title="Hapus seluruh usulan draf jurnalis"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-600" />
                <span>Hapus Semua</span>
              </button>
            )}
            <button
              onClick={() => router.refresh()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Segarkan
            </button>
          </div>
        </div>

        {/* Statistik Kartu */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-6 pt-5 border-t border-gray-100">
          <div className="bg-gray-50/70 border border-gray-200/60 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                Total Usulan Masuk
              </span>
              <span className="text-2xl font-bold text-gray-900">{totalAll}</span>
            </div>
            <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <Radio className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-gray-50/70 border border-gray-200/60 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider block">
                Draf Mentah (Menunggu AI)
              </span>
              <span className="text-2xl font-bold text-amber-700">{totalDraft}</span>
            </div>
            <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-gray-50/70 border border-gray-200/60 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider block">
                Artikel Siap Terbit
              </span>
              <span className="text-2xl font-bold text-emerald-700">{totalGenerated}</span>
            </div>
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tab & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-gray-200/70 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-white text-gray-900 shadow-xs font-semibold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Semua ({totalAll})
          </button>
          <button
            onClick={() => setActiveTab('draft')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'draft'
                ? 'bg-white text-amber-700 shadow-xs font-semibold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Draf Mentah ({totalDraft})
          </button>
          <button
            onClick={() => setActiveTab('generated')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'generated'
                ? 'bg-white text-emerald-700 shadow-xs font-semibold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Siap Terbit ({totalGenerated})
          </button>
        </div>

        <div className="flex items-center gap-2">
          {filteredDrafts.length > 0 && (
            <button
              type="button"
              onClick={handleSelectAllFiltered}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
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
              <span>
                {filteredDrafts.length > 0 && filteredDrafts.every((d) => selectedIds.includes(d.id))
                  ? 'Batalkan Semua'
                  : 'Pilih Semua'}
              </span>
            </button>
          )}

          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari berita atau media..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Floating Bulk Action Bar (Muncul saat ada item dipilih) */}
      {selectedIds.length > 0 && (
        <div className="bg-[#0f172a] text-white p-3.5 sm:p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-xl border border-slate-700 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-full bg-indigo-500/30 border border-indigo-400/40 flex items-center justify-center text-xs font-bold text-indigo-200">
              {selectedIds.length}
            </span>
            <span className="text-xs sm:text-sm font-semibold">
              {selectedIds.length} usulan draf dipilih
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isDeletingBulk}
              onClick={handleDeleteSelected}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400 rounded-xl transition-all cursor-pointer shadow-xs"
            >
              {isDeletingBulk ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              <span>Hapus {selectedIds.length} Terpilih</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="px-3 py-2 text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              Batal Pilihan
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDrafts.map((draft) => {
            const isGenerated = draft.status === 'generated' || draft.status === 'published';
            const isGenerating = loadingId === draft.id;
            const isDeleting = deletingId === draft.id;
            const isConverting = convertingId === draft.id;

            return (
              <div
                key={draft.id}
                className="bg-white rounded-2xl border border-gray-200/90 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
              >
                <div className="p-5">
                  {/* Top Bar: Checkbox + Source + Status */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(draft.id)}
                        onChange={() => handleToggleSelect(draft.id)}
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                        title="Pilih draf ini"
                      />
                      <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-2.5 py-0.5 rounded-md truncate max-w-[130px]">
                        {draft.source}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${
                        isGenerated
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {isGenerated ? '✓ Siap Terbit' : '⏳ Draf Mentah'}
                    </span>
                  </div>

                  {/* Judul Berita */}
                  <h3 className="font-bold text-sm sm:text-base text-gray-900 line-clamp-2 leading-snug group-hover:text-indigo-600 transition-colors mb-2">
                    {draft.title}
                  </h3>

                  {/* Ringkasan Intelijen */}
                  <p className="text-xs text-gray-600 line-clamp-3 leading-relaxed mb-3">
                    {draft.summary || 'Tidak ada ringkasan teks dari sumber berita.'}
                  </p>

                  <div className="text-[11px] text-gray-400 flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    <span>
                      {draft.published_at
                        ? new Date(draft.published_at).toLocaleString('id-ID', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })
                        : new Date(draft.created_at).toLocaleDateString('id-ID')}
                    </span>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="px-5 py-3.5 bg-gray-50/70 border-t border-gray-100 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <a
                      href={draft.original_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-500 hover:text-indigo-600 inline-flex items-center gap-1 font-medium transition-colors"
                    >
                      <span>Sumber Asli</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>

                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={() => setConfirmSingleDelete({ id: draft.id, title: draft.title })}
                      className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                      title="Hapus Usulan Draf Ini"
                    >
                      {isDeleting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {isGenerated ? (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setActivePreview({
                            draftId: draft.id,
                            title: draft.generated_title || draft.title,
                            content: draft.generated_article || '',
                          })
                        }
                        className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Lihat Hasil AI</span>
                      </button>

                      <button
                        type="button"
                        disabled={isConverting}
                        onClick={() => handleConvertToArticle(draft.id)}
                        className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        {isConverting ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <FileEdit className="w-3.5 h-3.5" />
                        )}
                        <span>Ke Meja Tulis</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={isGenerating}
                      onClick={() => handleGenerate(draft.id)}
                      className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>AI Sedang Menulis 5W+1H...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>⚡ Generate Berita Lengkap</span>
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
    </div>
  );
}
