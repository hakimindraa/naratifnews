'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  FileText,
  Clock,
  Settings,
  CheckCircle2,
  ExternalLink,
  Search,
  Sparkles,
  Link2,
  Bot,
  Smartphone,
  PenSquare,
  Rocket,
  LayoutGrid,
  List,
  Calendar,
  Tag,
  AlertCircle,
  RefreshCw,
  CheckCircle,
  X,
  Trash2,
} from 'lucide-react';
import DeleteButton from './DeleteButton';
import {
  quickPublishArticleAction,
  bulkPublishArticlesAction,
  bulkDeleteArticlesAction,
  bulkDraftArticlesAction,
} from './actions';

export interface ArticleItem {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  coverUrl: string | null;
  coverCaption: string | null;
  category: string;
  author: string;
  tags: string[] | null;
  status: string; // 'published' | 'draft' | 'scheduled'
  publishAt: Date | string | null;
  publishedAt: Date | string | null;
  createdAt: Date | string;
  source: 'studio' | 'sadur' | 'autopilot' | 'telegram' | 'manual';
}

interface ArticleManagerClientProps {
  initialArticles: ArticleItem[];
}

export default function ArticleManagerClient({ initialArticles }: ArticleManagerClientProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'draft' | 'scheduled' | 'published'>('all');
  const [activeSource, setActiveSource] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const [publishingId, setPublishingId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  // State Aksi Massal (Bulk Actions)
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkLoadingAction, setBulkLoadingAction] = useState<'publish' | 'delete' | 'draft' | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleQuickPublish = (id: number) => {
    if (!confirm('Publikasikan artikel ini sekarang ke website?')) return;
    setPublishingId(id);
    startTransition(async () => {
      await quickPublishArticleAction(id);
      setPublishingId(null);
    });
  };

  // Hitung jumlah tiap status
  const countAll = initialArticles.length;
  const countDraft = initialArticles.filter((a) => a.status === 'draft').length;
  const countScheduled = initialArticles.filter((a) => a.status === 'scheduled').length;
  const countPublished = initialArticles.filter((a) => a.status === 'published').length;

  // Filter daftar artikel
  const filteredArticles = initialArticles.filter((article) => {
    // 1. Filter Status Tab
    if (activeTab === 'draft' && article.status !== 'draft') return false;
    if (activeTab === 'scheduled' && article.status !== 'scheduled') return false;
    if (activeTab === 'published' && article.status !== 'published') return false;

    // 2. Filter Sumber
    if (activeSource !== 'all' && article.source !== activeSource) return false;

    // 3. Filter Kategori
    if (selectedCategory !== 'all' && article.category.toLowerCase() !== selectedCategory.toLowerCase()) {
      return false;
    }

    // 4. Pencarian teks
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = article.title.toLowerCase().includes(q);
      const matchExcerpt = (article.excerpt || '').toLowerCase().includes(q);
      const matchTags = (article.tags || []).some((t) => t.toLowerCase().includes(q));
      if (!matchTitle && !matchExcerpt && !matchTags) return false;
    }

    return true;
  });

  // Logika Seleksi Massal
  const isAllFilteredSelected =
    filteredArticles.length > 0 &&
    filteredArticles.every((art) => selectedIds.includes(art.id));

  const isSomeFilteredSelected =
    filteredArticles.some((art) => selectedIds.includes(art.id)) && !isAllFilteredSelected;

  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const handleSelectAllFiltered = () => {
    if (isAllFilteredSelected) {
      const filteredIdSet = new Set(filteredArticles.map((a) => a.id));
      setSelectedIds((prev) => prev.filter((id) => !filteredIdSet.has(id)));
    } else {
      const filteredIds = filteredArticles.map((a) => a.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  // Handler Aksi Massal
  const handleBulkPublish = () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`🚀 Publikasikan ${selectedIds.length} artikel terpilih sekarang ke website?`)) return;

    setBulkLoadingAction('publish');
    startTransition(async () => {
      const res = await bulkPublishArticlesAction(selectedIds);
      setBulkLoadingAction(null);
      if (res.success) {
        setFeedback({
          type: 'success',
          message: `🎉 Berhasil mempublikasikan ${res.count || selectedIds.length} artikel ke website!`,
        });
        setSelectedIds([]);
      } else {
        setFeedback({ type: 'error', message: res.error || 'Gagal mempublikasikan artikel secara massal.' });
      }
    });
  };

  const handleBulkDraft = () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`📝 Ubah status ${selectedIds.length} artikel terpilih menjadi Draf (Draft)?`)) return;

    setBulkLoadingAction('draft');
    startTransition(async () => {
      const res = await bulkDraftArticlesAction(selectedIds);
      setBulkLoadingAction(null);
      if (res.success) {
        setFeedback({
          type: 'success',
          message: `📝 Berhasil mengubah ${res.count || selectedIds.length} artikel menjadi Draf!`,
        });
        setSelectedIds([]);
      } else {
        setFeedback({ type: 'error', message: res.error || 'Gagal mengubah status artikel.' });
      }
    });
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    if (
      !confirm(
        `⚠️ PERINGATAN HAPUS MASSAL:\nApakah Anda yakin ingin menghapus permanen ${selectedIds.length} artikel terpilih dari database?\n\nTindakan ini TIDAK DAPAT DIBATALKAN!`
      )
    )
      return;

    setBulkLoadingAction('delete');
    startTransition(async () => {
      const res = await bulkDeleteArticlesAction(selectedIds);
      setBulkLoadingAction(null);
      if (res.success) {
        setFeedback({
          type: 'success',
          message: `🗑️ Berhasil menghapus ${res.count || selectedIds.length} artikel dari database.`,
        });
        setSelectedIds([]);
      } else {
        setFeedback({ type: 'error', message: res.error || 'Gagal menghapus artikel secara massal.' });
      }
    });
  };

  const getSourceBadge = (source: ArticleItem['source']) => {
    switch (source) {
      case 'studio':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
            <Sparkles className="w-3 h-3 text-indigo-500" />
            <span>AI Studio</span>
          </span>
        );
      case 'sadur':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-cyan-50 text-cyan-800 border border-cyan-200/80">
            <Link2 className="w-3 h-3 text-cyan-600" />
            <span>Sadur URL</span>
          </span>
        );
      case 'autopilot':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200/80">
            <Bot className="w-3 h-3 text-amber-600" />
            <span>Autopilot</span>
          </span>
        );
      case 'telegram':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-sky-50 text-sky-800 border border-sky-200/80">
            <Smartphone className="w-3 h-3 text-sky-600" />
            <span>Telegram</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-gray-100 text-gray-700 border border-gray-200">
            <PenSquare className="w-3 h-3 text-gray-500" />
            <span>Manual / .MD</span>
          </span>
        );
    }
  };

  const getCategoryColor = (category: string) => {
    const cat = category.toLowerCase();
    switch (cat) {
      case 'nasional':
        return 'bg-red-100/90 text-red-800 border-red-200';
      case 'internasional':
        return 'bg-sky-100/90 text-sky-800 border-sky-200';
      case 'sport':
        return 'bg-amber-100/90 text-amber-800 border-amber-200';
      case 'regional':
        return 'bg-emerald-100/90 text-emerald-800 border-emerald-200';
      case 'ai':
        return 'bg-indigo-100/90 text-indigo-800 border-indigo-200';
      case 'software':
        return 'bg-blue-100/90 text-blue-800 border-blue-200';
      case 'hardware':
        return 'bg-orange-100/90 text-orange-800 border-orange-200';
      case 'gadget':
        return 'bg-purple-100/90 text-purple-800 border-purple-200';
      case 'infrastruktur':
        return 'bg-cyan-100/90 text-cyan-800 border-cyan-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return '-';
    try {
      const d = new Date(date);
      return (
        d.toLocaleString('id-ID', {
          dateStyle: 'medium',
          timeStyle: 'short',
          timeZone: 'Asia/Jakarta',
        }) + ' WIB'
      );
    } catch {
      return '-';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* 1. TABS KARTU STATUS (Draf, Terbit, Terjadwal) */}
      <div className="p-4 sm:p-5 border-b border-gray-100 bg-gray-50/50">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-gray-900 text-white shadow-sm ring-1 ring-gray-900'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <span>Semua Artikel</span>
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'all' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'
              }`}>
                {countAll}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('draft')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'draft'
                  ? 'bg-amber-600 text-white shadow-sm ring-1 ring-amber-600'
                  : 'bg-white text-amber-800 hover:bg-amber-50 border border-amber-300'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${countDraft > 0 ? 'bg-amber-400 animate-pulse' : 'bg-amber-300'}`} />
                <span>Draf Review</span>
              </span>
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'draft' ? 'bg-white/25 text-white' : 'bg-amber-100 text-amber-900'
              }`}>
                {countDraft}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('published')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'published'
                  ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-600'
                  : 'bg-white text-emerald-800 hover:bg-emerald-50 border border-emerald-300'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Sudah Terbit</span>
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'published' ? 'bg-white/25 text-white' : 'bg-emerald-100 text-emerald-900'
              }`}>
                {countPublished}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('scheduled')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'scheduled'
                  ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-600'
                  : 'bg-white text-blue-800 hover:bg-blue-50 border border-blue-300'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Terjadwal</span>
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'scheduled' ? 'bg-white/25 text-white' : 'bg-blue-100 text-blue-900'
              }`}>
                {countScheduled}
              </span>
            </button>
          </div>

          {/* View Mode Toggle (Tabel / Grid) */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200 self-start sm:self-auto shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              title="Tampilan Tabel Rapi"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'list' ? 'bg-gray-900 text-white shadow-2xs' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              title="Tampilan Kartu Visual"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'grid' ? 'bg-gray-900 text-white shadow-2xs' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. FILTER SEARCH & DROPDOWNS BAR */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 mt-4 pt-3 border-t border-gray-200/80">
          {/* Search Input */}
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari judul berita, cuplikan, atau tags..."
              className="w-full bg-white rounded-xl border border-gray-200 pl-9 pr-3.5 py-2 text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 outline-none transition-all shadow-2xs"
            />
          </div>

          {/* Category Dropdown */}
          <div className="sm:col-span-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-white rounded-xl border border-gray-200 px-3 py-2 text-xs sm:text-sm font-semibold text-gray-800 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 outline-none transition-all shadow-2xs cursor-pointer"
            >
              <option value="all">Semua Kategori</option>
              <option value="Nasional">Nasional</option>
              <option value="Internasional">Internasional</option>
              <option value="Regional">Regional</option>
              <option value="Sport">Sport</option>
              <option value="AI">AI</option>
              <option value="Gadget">Gadget</option>
              <option value="Software">Software</option>
              <option value="Hardware">Hardware</option>
              <option value="Infrastruktur">Infrastruktur</option>
            </select>
          </div>

          {/* Source Dropdown */}
          <div className="sm:col-span-4">
            <select
              value={activeSource}
              onChange={(e) => setActiveSource(e.target.value)}
              className="w-full bg-white rounded-xl border border-gray-200 px-3 py-2 text-xs sm:text-sm font-semibold text-gray-800 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 outline-none transition-all shadow-2xs cursor-pointer"
            >
              <option value="all">Semua Asal Sumber</option>
              <option value="studio">🤖 AI Studio Generator</option>
              <option value="sadur">🔗 Sadur Berita URL</option>
              <option value="autopilot">⚡ Autopilot AI Cron</option>
              <option value="telegram">📱 Telegram Bot AI</option>
              <option value="manual">✍️ Manual & File .MD</option>
            </select>
          </div>
        </div>

        {/* FEEDBACK NOTIFICATION BANNER */}
        {feedback && (
          <div
            className={`mt-3 p-3.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 shadow-2xs border animate-in fade-in duration-200 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-red-50 text-red-800 border-red-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-md cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* BARIS PILIH SEMUA / SELECTION HEADER */}
        {filteredArticles.length > 0 && (
          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-100 text-xs text-gray-600">
            <label className="inline-flex items-center gap-2 font-semibold text-gray-800 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isAllFilteredSelected}
                ref={(input) => {
                  if (input) input.indeterminate = isSomeFilteredSelected;
                }}
                onChange={handleSelectAllFiltered}
                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span>
                {isAllFilteredSelected
                  ? `Semua terpilih (${filteredArticles.length} artikel)`
                  : selectedIds.length > 0
                  ? `${selectedIds.length} dari ${filteredArticles.length} terpilih`
                  : `Pilih Semua (${filteredArticles.length} artikel)`}
              </span>
            </label>

            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={handleClearSelection}
                className="text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
              >
                Batalkan Pilihan ({selectedIds.length})
              </button>
            )}
          </div>
        )}
      </div>

      {/* 3. KONTEN DAFTAR ARTIKEL (EMPTY STATE ATAU LIST/GRID) */}
      {filteredArticles.length === 0 ? (
        <div className="p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-900">Tidak ada artikel yang cocok</h4>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              Tidak ditemukan artikel untuk filter yang Anda pilih. Coba bersihkan kata pencarian atau pilih tab status lain.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setActiveTab('all');
              setActiveSource('all');
              setSelectedCategory('all');
              setSearchQuery('');
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold hover:bg-indigo-100 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reset Semua Filter</span>
          </button>
        </div>
      ) : viewMode === 'list' ? (
        /* ========================================================
           MODE 1: TABEL RAPI & TERSTRUKTUR (DESKTOP + RESPONSIVE ROW)
           ======================================================== */
        <div className="divide-y divide-gray-100">
          {filteredArticles.map((article) => {
            const isDraft = article.status === 'draft';
            const isPublished = article.status === 'published';
            const isScheduled = article.status === 'scheduled';
            const isCurrentlyPublishing = publishingId === article.id && isPending;
            const isSelected = selectedIds.includes(article.id);

            return (
              <div
                key={article.id}
                className={`p-4 sm:p-5 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isSelected ? 'bg-indigo-50/60 ring-1 ring-inset ring-indigo-200' : 'hover:bg-gray-50/70'
                }`}
              >
                {/* Kolom Kiri: Checkbox + Judul, Cuplikan, Kategori, Sumber */}
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <div className="pt-0.5 shrink-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelect(article.id)}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer mt-0.5"
                    />
                  </div>
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                    {/* Badge Status */}
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                        isPublished
                          ? 'bg-emerald-100 text-emerald-800'
                          : isScheduled
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {article.status}
                    </span>

                    {/* Badge Kategori */}
                    <span
                      className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${getCategoryColor(
                        article.category
                      )}`}
                    >
                      {article.category}
                    </span>

                    {/* Badge Sumber */}
                    {getSourceBadge(article.source)}

                    {/* Penulis */}
                    <span className="text-[11px] text-gray-500 font-medium">
                      Oleh: <b>{article.author}</b>
                    </span>
                  </div>

                  {/* Judul Artikel */}
                  <h3 className="text-sm sm:text-base font-bold text-gray-900 leading-snug line-clamp-2">
                    <Link
                      href={`/admin/edit/${article.id}`}
                      className="hover:text-indigo-600 transition-colors"
                      title="Klik untuk mengedit artikel ini"
                    >
                      {article.title}
                    </Link>
                  </h3>

                  {/* Cuplikan & Waktu */}
                  <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      <span>{formatDate(article.publishAt || article.publishedAt || article.createdAt)}</span>
                    </div>

                    {article.tags && article.tags.length > 0 && (
                      <div className="flex items-center gap-1 truncate max-w-xs">
                        <Tag className="w-3 h-3 text-gray-400 shrink-0" />
                        <span className="truncate text-gray-400">
                          {article.tags.slice(0, 3).map((t) => `#${t}`).join(' ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

                {/* Kolom Kanan: Tombol Aksi Cepat */}
                <div className="flex items-center gap-2 self-start md:self-center shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-gray-100 w-full md:w-auto justify-end">
                  {/* Quick Publish Button (Khusus Draf) */}
                  {isDraft && (
                    <button
                      type="button"
                      onClick={() => handleQuickPublish(article.id)}
                      disabled={isCurrentlyPublishing}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition-all active:scale-98 cursor-pointer disabled:opacity-50"
                      title="Publikasikan artikel ini sekarang ke website"
                    >
                      {isCurrentlyPublishing ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Menerbitkan...</span>
                        </>
                      ) : (
                        <>
                          <Rocket className="w-3.5 h-3.5" />
                          <span>Terbitkan</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* Buka di Web (Khusus Published) */}
                  {isPublished && (
                    <a
                      href={`/berita/${article.category.toLowerCase().replace(/\s+/g, '-')}/${article.id}/${article.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold text-xs shadow-2xs transition-colors"
                      title="Lihat artikel di web publik"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-gray-500" />
                      <span>Web</span>
                    </a>
                  )}

                  {/* Edit Button */}
                  <Link
                    href={`/admin/edit/${article.id}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-900 hover:bg-black text-white font-semibold text-xs shadow-2xs transition-colors"
                    title="Edit isi artikel dan foto sampul"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </Link>

                  {/* Delete Button */}
                  <DeleteButton
                    id={article.id}
                    title={article.title}
                    showText={false}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ========================================================
           MODE 2: GRID KARTU VISUAL (MODERN CARD VIEW)
           ======================================================== */
        <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredArticles.map((article) => {
            const isDraft = article.status === 'draft';
            const isPublished = article.status === 'published';
            const isScheduled = article.status === 'scheduled';
            const isCurrentlyPublishing = publishingId === article.id && isPending;
            const isSelected = selectedIds.includes(article.id);

            return (
              <div
                key={article.id}
                className={`rounded-xl border p-4 hover:shadow-md transition-all flex flex-col justify-between space-y-3 group ${
                  isSelected
                    ? 'bg-indigo-50/40 border-indigo-300 ring-2 ring-indigo-500/30'
                    : 'bg-white border-gray-200'
                }`}
              >
                <div className="space-y-2.5">
                  {/* Header Kartu: Checkbox + Status & Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(article.id)}
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          isPublished
                            ? 'bg-emerald-100 text-emerald-800'
                            : isScheduled
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {article.status}
                      </span>
                    </div>
                    {getSourceBadge(article.source)}
                  </div>

                  {/* Judul Artikel */}
                  <h3 className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug">
                    <Link href={`/admin/edit/${article.id}`}>{article.title}</Link>
                  </h3>

                  {/* Cuplikan */}
                  <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                    {article.excerpt || 'Tidak ada cuplikan teks.'}
                  </p>
                </div>

                {/* Footer Kartu */}
                <div className="pt-3 border-t border-gray-100 space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] text-gray-400">
                    <span className={`px-2 py-0.5 rounded font-bold border ${getCategoryColor(article.category)}`}>
                      {article.category}
                    </span>
                    <span className="truncate max-w-[130px]">
                      {formatDate(article.publishAt || article.publishedAt || article.createdAt)}
                    </span>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    {isDraft ? (
                      <button
                        type="button"
                        onClick={() => handleQuickPublish(article.id)}
                        disabled={isCurrentlyPublishing}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition-all cursor-pointer flex-1 justify-center disabled:opacity-50"
                      >
                        {isCurrentlyPublishing ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <Rocket className="w-3 h-3" />
                        )}
                        <span>Terbitkan</span>
                      </button>
                    ) : (
                      <a
                        href={`/berita/${article.category.toLowerCase().replace(/\s+/g, '-')}/${article.id}/${article.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors flex-1 justify-center"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Lihat Web</span>
                      </a>
                    )}

                    <Link
                      href={`/admin/edit/${article.id}`}
                      className="p-1.5 rounded-lg bg-gray-900 hover:bg-black text-white font-semibold text-xs shadow-2xs transition-colors"
                      title="Edit Artikel"
                    >
                      <Settings className="w-3.5 h-3.5" />
                    </Link>

                    <DeleteButton
                      id={article.id}
                      title={article.title}
                      showText={false}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. BILAH AKSI MENGAMBANG (FLOATING ACTION TOOLBAR) */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-5 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-2xl animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className="bg-gray-900/95 backdrop-blur-md text-white p-2.5 sm:p-3 rounded-2xl shadow-2xl border border-gray-700/80 flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
            {/* Counter Badge */}
            <div className="flex items-center gap-2 pl-2">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              <span className="text-xs sm:text-sm font-bold text-gray-100">
                <b>{selectedIds.length}</b> dipilih
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Terbitkan Semua */}
              <button
                type="button"
                onClick={handleBulkPublish}
                disabled={bulkLoadingAction !== null}
                className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                title="Terbitkan semua artikel yang dipilih ke website"
              >
                {bulkLoadingAction === 'publish' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Rocket className="w-3.5 h-3.5" />
                )}
                <span>Terbitkan ({selectedIds.length})</span>
              </button>

              {/* Jadikan Draf */}
              <button
                type="button"
                onClick={handleBulkDraft}
                disabled={bulkLoadingAction !== null}
                className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                title="Ubah semua artikel yang dipilih menjadi draf"
              >
                {bulkLoadingAction === 'draft' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <PenSquare className="w-3.5 h-3.5" />
                )}
                <span className="hidden sm:inline">Set Draf</span>
              </button>

              {/* Hapus Semua */}
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={bulkLoadingAction !== null}
                className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                title="Hapus permanen semua artikel terpilih"
              >
                {bulkLoadingAction === 'delete' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Hapus</span>
              </button>

              {/* Batal */}
              <button
                type="button"
                onClick={handleClearSelection}
                title="Batalkan pilihan"
                className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
