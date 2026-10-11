'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Zap,
  Bot,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  PenSquare,
  Flame,
  Smartphone,
  Cpu,
  Layers,
  Check,
  TrendingUp,
  Info,
  Image as ImageIcon,
  Trash2,
  Search,
  Globe
} from 'lucide-react';
import { generateArticleAction, getGenerationDataAction, deleteGenerationLogAction, clearFailedLogsAction } from './actions';

interface LogItem {
  id: number;
  prompt: string;
  articleId: number | null;
  articleTitle: string | null;
  category: string;
  status: string;
  model: string | null;
  durationMs: number | null;
  errorMessage: string | null;
  createdAt: Date | string;
}

interface StatsData {
  totalGenerated: number;
  publishedCount: number;
  draftCount: number;
  avgDuration: string;
  successRate: string;
}

const PRESET_TOPICS = [
  {
    icon: Flame,
    label: 'Tren Model AI Terbaru',
    category: 'AI',
    prompt: 'Bahas peluncuran model AI mutakhir terkini, peningkatan efisiensi komputasi, dan dampaknya bagi para pengembang perangkat lunak.',
  },
  {
    icon: Smartphone,
    label: 'Review Gadget & Chipset 2026',
    category: 'Gadget',
    prompt: 'Ulas inovasi arsitektur chipset flagship smartphone generasi baru dengan teknologi fabrikasi mutakhir dan fitur AI on-device.',
  },
  {
    icon: Cpu,
    label: 'Framework Web & Developer Tools',
    category: 'Software',
    prompt: 'Perkembangan Next.js dan ekosistem React Server Components serta bagaimana dampaknya terhadap performa aplikasi web modern.',
  },
  {
    icon: Layers,
    label: 'Infrastruktur Cloud & Keamanan',
    category: 'Infrastruktur',
    prompt: 'Tantangan keamanan siber di era arsitektur serverless dan strategi perlindungan data cloud modern bagi perusahaan teknologi.',
  },
];

export default function GeneratorStudioPage() {
  const [prompt, setPrompt] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('AI');
  const [selectedProvider, setSelectedProvider] = useState<'gemini' | 'groq' | '9router'>('gemini');
  const [enableWebSearch, setEnableWebSearch] = useState(true);
  const [coverUrl, setCoverUrl] = useState('');
  const [publishStatus, setPublishStatus] = useState<'published' | 'draft'>('draft');
  const [articleLength, setArticleLength] = useState<'standar' | 'mendalam'>('standar');

  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [logs, setLogs] = useState<LogItem[]>([]);
  const [stats, setStats] = useState<StatsData>({
    totalGenerated: 0,
    publishedCount: 0,
    draftCount: 0,
    avgDuration: '-',
    successRate: '-',
  });

  const [lastGenerated, setLastGenerated] = useState<{
    id: number;
    title: string;
    slug: string;
    category: string;
    status: string;
    durationMs: number;
    researchSources?: { title: string; source: string; pubDate: string }[];
  } | null>(null);

  const steps = enableWebSearch
    ? [
        'Melakukan riset berita terkini via Google News Indonesia (100% Gratis)...',
        'Menganalisis temuan fakta & merumuskan sudut pandang jurnalistik...',
        'Menghubungi AI Studio (Gemini) & menyusun naskah mendalam (Markdown)...',
        'Memformat metadata, tags, dan menyimpan otomatis ke Neon DB...',
      ]
    : [
        'Menganalisis instruksi topik & sudut pandang berita teknologi...',
        'Menghubungi AI Studio (Gemini) & menyusun naskah mendalam (Markdown)...',
        'Memformat metadata, tags, dan keterangan gambar...',
        'Menyimpan otomatis ke database Neon DB Naratif...',
      ];

  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isClearingFailed, setIsClearingFailed] = useState(false);

  // Muat data riwayat awal dari database Neon DB
  const loadInitialData = async () => {
    const res = await getGenerationDataAction();
    if (res.success) {
      setLogs(res.logs as LogItem[]);
      setStats(res.stats);
    }
  };

  const handleDeleteLog = async (id: number) => {
    if (!confirm('Hapus catatan riwayat ini dari database?')) return;
    setDeletingId(id);
    await deleteGenerationLogAction(id);
    await loadInitialData();
    setDeletingId(null);
  };

  const handleClearFailed = async () => {
    if (!confirm('Hapus semua catatan riwayat yang berstatus gagal dari database?')) return;
    setIsClearingFailed(true);
    await clearFailedLogsAction();
    await loadInitialData();
    setIsClearingFailed(false);
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleSelectPreset = (preset: typeof PRESET_TOPICS[0]) => {
    setPrompt(preset.prompt);
    setSelectedCategory(preset.category);
  };

  const handleStartGeneration = async () => {
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);
    setErrorMessage(null);
    setLastGenerated(null);
    setCurrentStep(0);

    // Animasi stepper tahapan
    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < steps.length - 1) return prev + 1;
        return prev;
      });
    }, 2800);

    try {
      const res = await generateArticleAction({
        prompt,
        category: selectedCategory,
        coverUrl: coverUrl.trim() || undefined,
        status: publishStatus,
        length: articleLength,
        provider: selectedProvider,
        enableWebSearch,
      });

      clearInterval(stepInterval);
      setCurrentStep(steps.length);

      if (res.success && res.article) {
        setLastGenerated({
          id: res.article.id,
          title: res.article.title,
          slug: res.article.slug,
          category: res.article.category,
          status: res.article.status,
          durationMs: res.durationMs,
          researchSources: res.researchSources || [],
        });
        // Kosongkan prompt & cover setelah sukses
        setPrompt('');
        setCoverUrl('');
      } else {
        setErrorMessage(res.error || 'Gagal membuat artikel.');
      }

      // Refresh log dan statistik dari database
      await loadInitialData();
    } catch (err: any) {
      clearInterval(stepInterval);
      setErrorMessage(err?.message || 'Terjadi kesalahan sistem.');
      await loadInitialData();
    } finally {
      setIsLoading(false);
    }
  };

  const formatLogDate = (rawDate: Date | string) => {
    try {
      const d = new Date(rawDate);
      return d.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Baru saja';
    }
  };

  return (
    <div className="space-y-8">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-gray-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-3 border border-indigo-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Naratif AI Studio x Groq Cloud</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-heading">
              Studio Generator Berita Otomatis
            </h1>
            <p className="text-gray-300 text-sm sm:text-base mt-2 max-w-2xl leading-relaxed">
              Kendalikan AI untuk mencari, menyusun naskah, dan menerbitkan artikel berita teknologi ke Naratif hanya dengan sekali klik atau instruksi kustom Anda.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-4 bg-white/5 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10 shrink-0">
            <div className="text-center px-2">
              <div className="text-xs text-gray-400 font-medium">AI Engine Aktif</div>
              <div className="text-sm font-bold text-white flex items-center justify-center gap-1.5 mt-0.5">
                <span className={`w-2 h-2 rounded-full ${selectedProvider === 'gemini' ? 'bg-amber-400' : selectedProvider === 'groq' ? 'bg-cyan-400' : 'bg-emerald-400'} animate-pulse`} />
                {selectedProvider === 'gemini' ? 'Google Gemini 3.8 Flash' : selectedProvider === 'groq' ? 'Groq (GPT-OSS 120B)' : '9Router (Muse Spark)'}
              </div>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center px-2">
              <div className="text-xs text-gray-400 font-medium">Keberhasilan</div>
              <div className="text-sm font-bold text-emerald-400 mt-0.5">
                {stats.successRate}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* STAT CARDS (REAL DATA DARI NEON DB) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Hasil AI</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1 font-heading">
              {stats.totalGenerated}
            </h3>
            <span className="inline-flex items-center text-xs text-indigo-600 font-medium mt-1">
              <TrendingUp className="w-3.5 h-3.5 mr-1" />
              {stats.totalGenerated === 0 ? 'Belum ada artikel' : 'Tercatat di database'}
            </span>
          </div>
          <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
            <Bot className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Terbit Langsung</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1 font-heading">
              {stats.publishedCount}
            </h3>
            <span className="text-xs text-emerald-600 mt-1 font-medium">Status Published</span>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Draft Siap Review</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1 font-heading">
              {stats.draftCount}
            </h3>
            <span className="text-xs text-amber-600 font-medium mt-1">Perlu pengecekan</span>
          </div>
          <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
            <PenSquare className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Rata-Rata Waktu</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1 font-heading">
              {stats.avgDuration}
            </h3>
            <span className="text-xs text-gray-500 mt-1">
              {stats.avgDuration === '-' ? 'Belum ada riwayat' : 'Per artikel'}
            </span>
          </div>
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* MAIN COMMAND CENTER */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-5">
          <div>
            <h2 className="text-xl font-bold text-gray-900 font-heading flex items-center gap-2">
              <Zap className="w-5 h-5 text-indigo-600" />
              Perintahkan AI Membuat Berita
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Pilih topik cepat di bawah atau ketik instruksi spesifik Anda sendiri.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 self-start sm:self-auto">
            <Info className="w-3.5 h-3.5 text-gray-400" />
            <span>Format output otomatis tersimpan ke Neon Database</span>
          </div>
        </div>

        {/* 1. PRESET CHIPS */}
        <div className="space-y-2.5">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            Pilihan Cepat (Klik Sekali untuk Mengisi):
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {PRESET_TOPICS.map((preset, idx) => {
              const Icon = preset.icon;
              const isSelected = prompt === preset.prompt;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  disabled={isLoading}
                  className={`p-3.5 text-left rounded-2xl border transition-all duration-200 flex flex-col justify-between gap-2.5 group cursor-pointer ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/70 shadow-sm ring-1 ring-indigo-600'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="p-2 rounded-xl bg-white border border-gray-100 shadow-2xs text-indigo-600 group-hover:scale-110 transition-transform">
                      <Icon className="w-4 h-4" />
                    </span>
                    <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                      {preset.category}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                      {preset.label}
                    </h4>
                    <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                      {preset.prompt}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. CUSTOM PROMPT INPUT */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-700">
              Instruksi / Topik Berita Anda:
            </label>
            <span className="text-xs text-gray-400">
              {prompt.length} karakter
            </span>
          </div>
          <div className="relative">
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isLoading}
              placeholder="Contoh: Buatkan berita mendalam tentang peluncuran chip fabrikasi baru dan bagaimana para developer menyambutnya..."
              className="w-full rounded-2xl border border-gray-300 p-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 outline-none transition-all resize-none shadow-2xs"
            />
          </div>
        </div>

        {/* 2.5 COVER IMAGE LINK (IMGBB - OPSIONAL) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-gray-400" />
              Link Cover Image (ImgBB - Opsional):
            </label>
            <span className="text-[11px] text-gray-400">
              Kosongkan jika ingin input nanti di editor
            </span>
          </div>
          <input
            type="url"
            value={coverUrl}
            onChange={(e) => setCoverUrl(e.target.value)}
            disabled={isLoading}
            placeholder="Contoh: https://i.ibb.co/xxxxxx/sampul-berita.jpg"
            className="w-full rounded-2xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 outline-none transition-all shadow-2xs"
          />
        </div>

        {/* 3. SETTINGS & TRIGGER BAR */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-2">
          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* AI Engine Switcher */}
            <div className="flex items-center gap-2 bg-indigo-50/90 px-3.5 py-2 rounded-xl border border-indigo-200">
              <span className="text-xs font-semibold text-indigo-900 flex items-center gap-1">
                <Bot className="w-3.5 h-3.5 text-indigo-600" />
                AI Engine:
              </span>
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value as 'gemini' | 'groq' | '9router')}
                disabled={isLoading}
                className="bg-transparent text-sm font-bold text-indigo-950 outline-none cursor-pointer"
              >
                <option value="gemini">✨ Google Gemini 3.8 Flash (Rekomendasi)</option>
                <option value="groq">⚡ Groq Cloud (GPT-OSS 120B)</option>
                <option value="9router">🟢 9Router Lokal (Muse Spark)</option>
              </select>
            </div>

            {/* Google News Research Toggle */}
            <button
              type="button"
              onClick={() => setEnableWebSearch(!enableWebSearch)}
              disabled={isLoading}
              title="Cari berita & fakta terkini dari Google News Indonesia sebelum menulis artikel"
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all cursor-pointer ${
                enableWebSearch
                  ? 'bg-blue-50/90 border-blue-300 text-blue-900 shadow-2xs'
                  : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
              }`}
            >
              <Search className={`w-3.5 h-3.5 ${enableWebSearch ? 'text-blue-600' : 'text-gray-400'}`} />
              <span className="text-xs font-semibold">
                Riset Google News:
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                enableWebSearch ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                {enableWebSearch ? 'Aktif (100% Gratis)' : 'Nonaktif'}
              </span>
            </button>

            {/* Category */}
            <div className="flex items-center gap-2 bg-gray-50 px-3.5 py-2 rounded-xl border border-gray-200">
              <span className="text-xs font-medium text-gray-500">Kategori:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                disabled={isLoading}
                className="bg-transparent text-sm font-bold text-gray-800 outline-none cursor-pointer"
              >
                <option value="AI">AI</option>
                <option value="Software">Software</option>
                <option value="Hardware">Hardware</option>
                <option value="Gadget">Gadget</option>
                <option value="Infrastruktur">Infrastruktur</option>
              </select>
            </div>

            {/* Target Status */}
            <div className="flex items-center gap-2 bg-gray-50 px-3.5 py-2 rounded-xl border border-gray-200">
              <span className="text-xs font-medium text-gray-500">Hasil Simpan:</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPublishStatus('draft')}
                  disabled={isLoading}
                  className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    publishStatus === 'draft'
                      ? 'bg-amber-500 text-white shadow-2xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Draft (Review)
                </button>
                <button
                  type="button"
                  onClick={() => setPublishStatus('published')}
                  disabled={isLoading}
                  className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    publishStatus === 'published'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Langsung Publish
                </button>
              </div>
            </div>

            {/* Length */}
            <div className="flex items-center gap-2 bg-gray-50 px-3.5 py-2 rounded-xl border border-gray-200">
              <span className="text-xs font-medium text-gray-500">Panjang:</span>
              <select
                value={articleLength}
                onChange={(e) => setArticleLength(e.target.value as any)}
                disabled={isLoading}
                className="bg-transparent text-sm font-bold text-gray-800 outline-none cursor-pointer"
              >
                <option value="standar">Standar (~700 kata)</option>
                <option value="mendalam">Mendalam (~1200 kata)</option>
              </select>
            </div>
          </div>

          {/* Action Button */}
          <button
            type="button"
            onClick={handleStartGeneration}
            disabled={!prompt.trim() || isLoading}
            className={`inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-sm shadow-md transition-all duration-200 cursor-pointer ${
              isLoading
                ? 'bg-indigo-400 text-white cursor-not-allowed'
                : !prompt.trim()
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-indigo-500/25 active:scale-98'
            }`}
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>AI Sedang Bekerja...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                <span>⚡ Mulai Cari, Buat & Upload</span>
              </>
            )}
          </button>
        </div>

        {/* 4. REALTIME PROGRESS STEPPER */}
        {isLoading && (
          <div className="bg-indigo-50/80 rounded-2xl p-5 border border-indigo-200/80 space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">
                    Proses Eksekusi AI Sedang Berjalan di Cloud
                  </h4>
                  <p className="text-xs text-gray-600">
                    ModelRouter sedang memproses artikel berdasarkan instruksi Anda.
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold text-indigo-700 bg-indigo-100 px-3 py-1 rounded-full">
                Langkah {Math.min(currentStep + 1, steps.length)} dari {steps.length}
              </span>
            </div>

            {/* Stepper Dots */}
            <div className="space-y-2 pt-1">
              {steps.map((text, idx) => {
                const isPassed = currentStep > idx;
                const isCurrent = currentStep === idx;
                return (
                  <div key={idx} className="flex items-center gap-3 text-xs">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold transition-all ${
                        isPassed
                          ? 'bg-emerald-500 text-white'
                          : isCurrent
                          ? 'bg-indigo-600 text-white animate-pulse'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {isPassed ? <Check className="w-3 h-3" /> : idx + 1}
                    </div>
                    <span
                      className={`${
                        isCurrent
                          ? 'font-bold text-indigo-900'
                          : isPassed
                          ? 'text-gray-700'
                          : 'text-gray-400'
                      }`}
                    >
                      {text}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ERROR MESSAGE ALERT */}
        {errorMessage && (
          <div className="bg-red-50 text-red-800 p-4 rounded-2xl border border-red-200 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Gagal Membuat Artikel</p>
              <p className="text-xs mt-0.5 text-red-700">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* 5. SUCCESS CARD PREVIEW */}
        {lastGenerated && !isLoading && (
          <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-200 space-y-3 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                      Berita Berhasil Disimpan ke Neon DB!
                    </span>
                    <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                      Durasi: {(lastGenerated.durationMs / 1000).toFixed(1)}s
                    </span>
                  </div>
                  <h4 className="text-sm sm:text-base font-bold text-gray-900 mt-0.5 line-clamp-1">
                    {lastGenerated.title}
                  </h4>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href="/admin"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors shadow-2xs"
                >
                  <PenSquare className="w-3.5 h-3.5" />
                  <span>Lihat di Dasbor Redaksi</span>
                </Link>
                <Link
                  href={`/admin/edit/${lastGenerated.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-bold hover:bg-black transition-colors shadow-2xs"
                >
                  <span>Edit Artikel</span>
                </Link>
                {lastGenerated.status === 'published' && (
                  <a
                    href={`/berita-teknologi/${lastGenerated.category.toLowerCase()}/${lastGenerated.id}/${lastGenerated.slug}`}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-2xs"
                  >
                    <span>Lihat di Web</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>

            {/* Research Sources Preview */}
            {lastGenerated.researchSources && lastGenerated.researchSources.length > 0 && (
              <div className="pt-3 border-t border-emerald-200/80">
                <p className="text-xs font-bold text-emerald-950 flex items-center gap-1.5 mb-2">
                  <Globe className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Riset Google News Berhasil ({lastGenerated.researchSources.length} Berita Referensi Terkini Terintegrasi):</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {lastGenerated.researchSources.map((item, idx) => (
                    <div
                      key={idx}
                      className="inline-flex items-center gap-1.5 text-xs bg-white/90 border border-emerald-300 text-emerald-950 px-2.5 py-1 rounded-lg shadow-2xs font-medium"
                    >
                      <span className="font-bold text-emerald-700">[{item.source}]</span>
                      <span className="truncate max-w-[280px] sm:max-w-[420px]">{item.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MONITORING / REAL DATABASE HISTORY LOGS TABLE */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900 font-heading">
              Riwayat Perintah & Pemantau Kerja
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Catatan riil dari database Neon DB seluruh artikel yang pernah digenerate oleh AI.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {logs.some((l) => l.status === 'failed') && (
              <button
                type="button"
                onClick={handleClearFailed}
                disabled={isClearingFailed}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg border border-red-200 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isClearingFailed ? 'Menghapus...' : 'Bersihkan Log Gagal'}</span>
              </button>
            )}
            <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg">
              Total {logs.length} Catatan
            </span>
          </div>
        </div>

        {logs.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">
            Belum ada riwayat pembuatan berita. Coba perintahkan AI di atas untuk membuat berita pertama Anda!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50/75 border-b border-gray-200 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Waktu</th>
                  <th className="px-6 py-4">Topik / Instruksi</th>
                  <th className="px-6 py-4">Judul Artikel Dihasilkan</th>
                  <th className="px-6 py-4">Kategori</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Durasi</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        <span>{formatLogDate(log.createdAt)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-gray-800 max-w-xs">
                      <span className="line-clamp-2">{log.prompt}</span>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-gray-900 max-w-sm">
                      <span className="line-clamp-2">
                        {log.articleTitle || log.errorMessage || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-[11px] font-semibold bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md">
                        {log.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {log.status === 'published' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3" /> Published
                        </span>
                      ) : log.status === 'scheduled' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                          <Clock className="w-3 h-3" /> Terjadwal
                        </span>
                      ) : log.status === 'draft' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                          <PenSquare className="w-3 h-3" /> Draft
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">
                          <AlertCircle className="w-3 h-3" /> Gagal
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                      {log.durationMs ? `${(log.durationMs / 1000).toFixed(1)}s` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        {log.articleId ? (
                          <Link
                            href={`/admin/edit/${log.articleId}`}
                            className="text-xs font-semibold text-gray-700 hover:text-indigo-600 bg-gray-100 hover:bg-gray-200 px-2.5 py-1.5 rounded-lg transition-colors"
                          >
                            Edit
                          </Link>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => handleDeleteLog(log.id)}
                          disabled={deletingId === log.id}
                          title="Hapus riwayat ini"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
