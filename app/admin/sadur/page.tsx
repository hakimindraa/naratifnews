'use client';

// Halaman Sadur Berita URL (Ada Fakta)
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Link2,
  Globe,
  Sparkles,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileText,
  ExternalLink,
  Zap,
  Bot,
  Server,
  Layers,
  Clock,
  BookOpen,
  Send,
  Eye,
  Check,
  AlertTriangle,
} from 'lucide-react';
import {
  previewSourceUrlAction,
  generateSadurArticleAction,
  getSadurInitialSettings,
} from './actions';
import { ScrapedSourceData } from '@/lib/url-scraper';

const CATEGORIES = ['AI', 'Nasional', 'Internasional', 'Regional', 'Sport', 'Software', 'Hardware', 'Gadget', 'Infrastruktur'];

const SAMPLE_URLS = [
  { label: 'The Verge', url: 'https://www.theverge.com' },
  { label: 'TechCrunch', url: 'https://techcrunch.com' },
  { label: 'Reuters Tech', url: 'https://www.reuters.com/technology' },
];

export default function SadurPage() {
  const [urlInput, setUrlInput] = useState('');
  const [fetchingSource, setFetchingSource] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Data sumber yang berhasil ditarik
  const [sourceData, setSourceData] = useState<ScrapedSourceData | null>(null);
  const [urlHistory, setUrlHistory] = useState<{
    isAlreadyScraped: boolean;
    matchedTitle?: string;
    matchedArticleId?: number;
    matchedDate?: Date;
  } | null>(null);
  const [similarInitial, setSimilarInitial] = useState<any | null>(null);

  // Opsi redaksi
  const [provider, setProvider] = useState<'gemini' | 'groq' | '9router'>('groq');
  const [category, setCategory] = useState('AI');
  const [length, setLength] = useState<'ringkas' | 'standar' | 'mendalam'>('standar');
  const [status, setStatus] = useState<'published' | 'draft'>('published');
  const [active9RouterModel, setActive9RouterModel] = useState('');

  // Hasil Sadur
  const [sadurResult, setSadurResult] = useState<{
    success: boolean;
    articleId: number;
    title: string;
    slug: string;
    category: string;
    status: string;
    durationMs: number;
    similarityInfo?: any | null;
  } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const cfg = await getSadurInitialSettings();
      if (cfg.defaultProvider) {
        setProvider(cfg.defaultProvider);
      }
      if (cfg.model) {
        setActive9RouterModel(cfg.model);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Handler: Tarik Konten Sumber
  const handleFetchSource = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!urlInput.trim()) {
      setErrorMsg('Harap masukkan link URL berita sumber.');
      return;
    }

    setFetchingSource(true);
    setErrorMsg(null);
    setSourceData(null);
    setSadurResult(null);

    const res = await previewSourceUrlAction(urlInput.trim());
    setFetchingSource(false);

    if (res.success && res.data) {
      setSourceData(res.data);
      setUrlHistory(res.urlHistory || null);
      setSimilarInitial(res.similarInitial || null);
      // Auto-tebak kategori dari judul jika memungkinkan
      const lowerTitle = res.data.title.toLowerCase();
      if (lowerTitle.includes('ai') || lowerTitle.includes('model') || lowerTitle.includes('gpt') || lowerTitle.includes('intelligence')) {
        setCategory('AI');
      } else if (lowerTitle.includes('phone') || lowerTitle.includes('iphone') || lowerTitle.includes('samsung') || lowerTitle.includes('camera') || lowerTitle.includes('watch')) {
        setCategory('Gadget');
      } else if (lowerTitle.includes('chip') || lowerTitle.includes('gpu') || lowerTitle.includes('nvidia') || lowerTitle.includes('processor') || lowerTitle.includes('intel')) {
        setCategory('Hardware');
      } else if (lowerTitle.includes('app') || lowerTitle.includes('os') || lowerTitle.includes('android') || lowerTitle.includes('windows') || lowerTitle.includes('code')) {
        setCategory('Software');
      } else if (lowerTitle.includes('cloud') || lowerTitle.includes('server') || lowerTitle.includes('data center') || lowerTitle.includes('network') || lowerTitle.includes('satellite')) {
        setCategory('Infrastruktur');
      }
    } else {
      setErrorMsg(res.message || 'Gagal membaca isi URL sumber.');
    }
  };

  // Handler: Mulai Sadur Naskah
  const handleExecuteSadur = async () => {
    if (!sourceData) return;

    setGenerating(true);
    setErrorMsg(null);
    setSadurResult(null);

    const res = await generateSadurArticleAction({
      sourceUrl: sourceData.sourceUrl,
      sourceTitle: sourceData.title,
      sourceContent: sourceData.content,
      domain: sourceData.domain,
      category,
      length,
      provider,
      status,
    });

    setGenerating(false);

    if (res.success && res.articleId) {
      setSadurResult({
        success: true,
        articleId: res.articleId,
        title: res.title || '',
        slug: res.slug || '',
        category: res.category || category,
        status: res.status || status,
        durationMs: res.durationMs || 0,
        similarityInfo: res.similarityInfo || null,
      });
    } else {
      setErrorMsg(res.message || 'Terjadi kesalahan saat menyadur artikel.');
    }
  };

  // Reset untuk sadur berita baru
  const handleReset = () => {
    setUrlInput('');
    setSourceData(null);
    setUrlHistory(null);
    setSimilarInitial(null);
    setSadurResult(null);
    setErrorMsg(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-7 pb-16">
      {/* Header Halaman */}
      <div className="border-b border-gray-200 pb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/10 flex items-center justify-center text-indigo-600 border border-indigo-200/50">
            <Link2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900 font-heading">
                Sadur Berita URL (Smart Scraper)
              </h1>
              <span className="px-2.5 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                100% Gratis
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Ubah tautan berita internasional atau nasional menjadi naskah berita orisinal berbahasa Indonesia dengan fakta akurat & anti-plagiarisme.
            </p>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm font-medium">{errorMsg}</div>
        </div>
      )}

      {/* TAHAP 1: FORM INPUT URL */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">
            1
          </span>
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
            Masukkan Tautan Berita Sumber
          </h2>
        </div>

        <form onSubmit={handleFetchSource} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Globe className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Tempelkan URL berita (Contoh: https://www.theverge.com/...)"
                className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
                required
              />
            </div>
            <button
              type="submit"
              disabled={fetchingSource || !urlInput.trim()}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
            >
              {fetchingSource ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>{fetchingSource ? 'Membaca Sumber...' : 'Tarik & Analisis'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500 pt-1">
            <span className="font-semibold">Media Populer:</span>
            <div className="flex flex-wrap gap-1.5">
              {SAMPLE_URLS.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => setUrlInput(s.url)}
                  className="px-2 py-0.5 bg-gray-100 hover:bg-indigo-50 hover:text-indigo-600 rounded text-[11px] font-medium transition-colors cursor-pointer"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </form>
      </div>

      {/* TAHAP 2: PRATINJAU SUMBER ASLI (Muncul jika berhasil ditarik) */}
      {sourceData && (
        <div className="bg-white rounded-2xl border border-indigo-100 shadow-xs overflow-hidden animate-in fade-in duration-300">
          <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-50/80 to-blue-50/50 border-b border-indigo-100/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                2
              </span>
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  Pratinjau Berita Sumber Ditemukan
                </h3>
                <span className="text-xs text-gray-500">
                  Konten teks berhasil diekstrak dan dibersihkan dari iklan
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-white border border-indigo-200 text-indigo-700 text-xs font-bold flex items-center gap-1.5 shadow-2xs font-mono">
                <Globe className="w-3.5 h-3.5" />
                {sourceData.domain}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-gray-700 text-xs font-medium shadow-2xs">
                ~{sourceData.wordCount} kata sumber
              </span>
            </div>
          </div>

          <div className="p-5 sm:p-6 space-y-4">
            {urlHistory?.isAlreadyScraped && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 flex items-start gap-2.5 text-xs sm:text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">⚠️ Perhatian Redaksi:</span> Tautan berita ini tercatat pernah disadur sebelumnya menjadi artikel{' '}
                  <b>&quot;{urlHistory.matchedTitle}&quot;</b>
                  {urlHistory.matchedArticleId && (
                    <Link
                      href={`/admin/edit/${urlHistory.matchedArticleId}`}
                      className="ml-1 text-indigo-600 underline font-semibold"
                      target="_blank"
                    >
                      (Buka Artikel Lama)
                    </Link>
                  )}
                  . Anda tetap dapat melanjutkan penyaduran jika ingin menulis sudut pandang baru.
                </div>
              </div>
            )}

            {similarInitial?.hasSimilar && similarInitial.matchedArticle && (
              <div className="p-3.5 bg-sky-50 border border-sky-200 rounded-xl text-sky-950 flex items-start gap-2.5 text-xs sm:text-sm">
                <Sparkles className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">💡 Deteksi Arsip Mirip:</span> Ditemukan artikel dengan kemiripan topik ~{Math.round(similarInitial.highestScore * 100)}%:{' '}
                  <b>&quot;{similarInitial.matchedArticle.title}&quot;</b>. Memori anti-duplikasi AI otomatis diaktifkan untuk menyadur sudut pandang kelanjutan/berbeda.
                </div>
              </div>
            )}

            <div>
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                Judul Asli Sumber:
              </span>
              <h4 className="text-base sm:text-lg font-bold text-gray-900 leading-snug">
                {sourceData.title}
              </h4>
            </div>

            <div>
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                Cuplikan Teks Sumber:
              </span>
              <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 text-xs sm:text-sm text-gray-700 leading-relaxed max-h-36 overflow-y-auto">
                {sourceData.excerpt}
              </div>
            </div>

            <div className="text-xs">
              <a
                href={sourceData.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1 hover:underline"
              >
                <span>Buka artikel asli di {sourceData.domain}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* TAHAP 3: PREFERENSI REDAKSI & EKSEKUSI SADURAN */}
      {sourceData && (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-5 sm:p-6 space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">
              3
            </span>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Preferensi Penulisan Ulang (Saduran Ada Fakta)
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* 1. AI Engine */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Pilih AI Engine
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => setProvider('groq')}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    provider === 'groq'
                      ? 'bg-indigo-50/70 border-indigo-600 ring-2 ring-indigo-600/20 font-bold text-indigo-950 shadow-2xs'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100/60'
                  }`}
                >
                  <div className="text-xs font-bold flex items-center justify-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>Groq Cloud</span>
                  </div>
                  <span className="text-[10px] text-gray-500 block mt-0.5">&lt;15 Detik • Cepat</span>
                </button>

                <button
                  type="button"
                  onClick={() => setProvider('gemini')}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    provider === 'gemini'
                      ? 'bg-indigo-50/70 border-indigo-600 ring-2 ring-indigo-600/20 font-bold text-indigo-950 shadow-2xs'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100/60'
                  }`}
                >
                  <div className="text-xs font-bold flex items-center justify-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>Gemini 3.8</span>
                  </div>
                  <span className="text-[10px] text-gray-500 block mt-0.5">Sangat Luwes</span>
                </button>

                <button
                  type="button"
                  onClick={() => setProvider('9router')}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    provider === '9router'
                      ? 'bg-indigo-50/70 border-indigo-600 ring-2 ring-indigo-600/20 font-bold text-indigo-950 shadow-2xs'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100/60'
                  }`}
                >
                  <div className="text-xs font-bold flex items-center justify-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>9Router</span>
                  </div>
                  <span className="text-[10px] text-gray-500 block mt-0.5 truncate">
                    {active9RouterModel || 'Kustom'}
                  </span>
                </button>
              </div>
            </div>

            {/* 2. Format Panjang Naskah */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Panjang Naskah Saduran
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setLength('standar')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    length === 'standar'
                      ? 'bg-indigo-50/70 border-indigo-600 ring-2 ring-indigo-600/20 font-bold text-indigo-950 shadow-2xs'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100/60'
                  }`}
                >
                  <span className="text-xs font-bold block">⚡ Standar (~700 kata)</span>
                  <span className="text-[10px] text-gray-500">Berita cepat & to the point</span>
                </button>

                <button
                  type="button"
                  onClick={() => setLength('mendalam')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    length === 'mendalam'
                      ? 'bg-indigo-50/70 border-indigo-600 ring-2 ring-indigo-600/20 font-bold text-indigo-950 shadow-2xs'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100/60'
                  }`}
                >
                  <span className="text-xs font-bold block">📖 Mendalam (~1200 kata)</span>
                  <span className="text-[10px] text-gray-500">Ulasan komprehensif</span>
                </button>
              </div>
            </div>
          </div>

          {/* 3. Kategori Berita & Status Terbit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1">
            {/* Kategori */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Kategori Berita
              </label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      category === cat
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {category === cat && <Check className="w-3 h-3 inline mr-1" />}
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Status Publikasi */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Status Publikasi
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setStatus('published')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    status === 'published'
                      ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20 font-bold text-emerald-950'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100/60'
                  }`}
                >
                  <span className="text-xs font-bold block">🚀 Langsung Terbit</span>
                  <span className="text-[10px] text-gray-500">Tayang di adafakta.web.id</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStatus('draft')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    status === 'draft'
                      ? 'bg-amber-50/80 border-amber-500 ring-2 ring-amber-500/20 font-bold text-amber-950'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100/60'
                  }`}
                >
                  <span className="text-xs font-bold block">📝 Simpan Draf</span>
                  <span className="text-[10px] text-gray-500">Untuk ditinjau editor</span>
                </button>
              </div>
            </div>
          </div>

          {/* Tombol Eksekusi Sadur */}
          <div className="pt-3 border-t border-gray-100 flex items-center justify-end">
            <button
              type="button"
              onClick={handleExecuteSadur}
              disabled={generating}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {generating ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 text-amber-300" />
              )}
              <span>{generating ? 'Menyadur & Meracik Naskah...' : '✨ Mulai Sadur Berita Ini'}</span>
            </button>
          </div>
        </div>
      )}

      {/* TAHAP 4: KARTU HASIL SUKSES */}
      {sadurResult && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4 animate-in fade-in duration-300">
          <div className="flex items-start gap-3.5">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-emerald-950">
                  Artikel Berhasil Disadur & Dibuat!
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-200 text-emerald-800 rounded uppercase">
                  {sadurResult.status}
                </span>
              </div>
              <p className="text-xs text-emerald-800">
                Selesai dalam <b>{(sadurResult.durationMs / 1000).toFixed(1)} detik</b> via AI Engine.
              </p>
            </div>
          </div>

          {/* Rincian Artikel */}
          <div className="bg-white/80 p-4 rounded-xl border border-emerald-200/60 space-y-2">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Judul Artikel Baru Ada Fakta:
            </div>
            <h4 className="text-base font-bold text-gray-900 leading-snug break-words">
              📰 {sadurResult.title}
            </h4>
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 pt-1">
              <span>📂 Kategori: <b>{sadurResult.category}</b></span>
              <span className="truncate max-w-full">🔗 Slug: <code className="font-mono text-gray-700">{sadurResult.slug}</code></span>
            </div>
          </div>

          {/* Advisory Kemiripan Topik */}
          {sadurResult.similarityInfo?.hasSimilar && sadurResult.similarityInfo.matchedArticle && (
            <div className="p-3.5 bg-amber-100/70 border border-amber-300 rounded-xl text-amber-950 flex items-start gap-2.5 text-xs sm:text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">⚠️ Catatan Kemiripan Topik:</span> Naskah ini terdeteksi memiliki kemiripan kata kunci{' '}
                <b>{Math.round(sadurResult.similarityInfo.highestScore * 100)}%</b> dengan arsip berita terdahulu{' '}
                <b>&quot;{sadurResult.similarityInfo.matchedArticle.title}&quot;</b>. Status publikasi tetap dipertahankan sesuai pilihan Anda (<b>{sadurResult.status}</b>).
              </div>
            </div>
          )}

          {/* Tombol Aksi */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 pt-1">
            <Link
              href={`/admin/edit/${sadurResult.articleId}`}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-2xs transition-all flex items-center justify-center gap-1.5 text-center"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Buka di Editor Dasbor</span>
            </Link>

            {sadurResult.status === 'published' && (
              <a
                href={`/berita/${sadurResult.category.toLowerCase()}/${sadurResult.articleId}/${sadurResult.slug}`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2.5 rounded-xl bg-white hover:bg-gray-50 text-gray-800 font-bold text-xs border border-gray-300 shadow-2xs transition-all flex items-center justify-center gap-1.5 text-center"
              >
                <Eye className="w-3.5 h-3.5 text-indigo-600" />
                <span>Lihat di Website</span>
                <ExternalLink className="w-3 h-3 text-gray-400" />
              </a>
            )}

            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2.5 rounded-xl bg-transparent hover:bg-emerald-100/60 text-emerald-900 font-bold text-xs transition-colors cursor-pointer text-center"
            >
              + Sadur Berita Lainnya
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
