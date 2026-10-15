'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
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
  Code,
  Check,
  TrendingUp,
  Image as ImageIcon,
  Trash2,
  Search,
  Globe,
  Wand2,
  Settings,
  Building2,
  MapPin,
  ArrowRight,
  Filter,
  X,
  FileText,
  Rocket,
  ShieldCheck,
} from 'lucide-react';
import {
  generateArticleAction,
  getGenerationDataAction,
  deleteGenerationLogAction,
  clearFailedLogsAction,
} from './actions';
import { getAISettings } from '../pengaturan/actions';

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
    label: 'Tren & Inovasi AI',
    category: 'AI',
    prompt:
      'Bahas perkembangan terkini teknologi kecerdasan buatan dan model generasi baru, bagaimana inovasi mutakhir ini mengubah industri, serta efisiensi dan dampaknya bagi masyarakat berdasarkan riset dan data faktual terkini.',
  },
  {
    icon: Building2,
    label: 'Kebijakan Pemda',
    category: 'Regional',
    prompt:
      'Bahas isu kebijakan pemerintah daerah, pelayanan fasilitas publik, atau dinamika sosial masyarakat terkini di daerah berdasarkan fakta dan laporan terkini.',
  },
  {
    icon: MapPin,
    label: 'Infrastruktur Daerah',
    category: 'Regional',
    prompt:
      'Ulas perkembangan proyek infrastruktur, konektivitas transportasi daerah, atau penataan ruang kota yang berdampak langsung bagi mobilitas masyarakat setempat.',
  },
  {
    icon: Code,
    label: 'Ekosistem Software',
    category: 'Software',
    prompt:
      'Ulas perkembangan mutakhir dunia rekayasa perangkat lunak, adopsi standar teknologi baru di kalangan developer, dan inovasi arsitektur aplikasi modern berdasarkan fakta industri terkini.',
  },
  {
    icon: Cpu,
    label: 'Semikonduktor & Chip',
    category: 'Hardware',
    prompt:
      'Sorot perkembangan industri semikonduktor, kemajuan arsitektur komputasi perangkat keras generasi terbaru, serta pengaruhnya terhadap pasar teknologi global berdasarkan rilis dan laporan terkini.',
  },
  {
    icon: Layers,
    label: 'Cloud & Keamanan Siber',
    category: 'Infrastruktur',
    prompt:
      'Bahas perkembangan infrastruktur data center modern, tren komputasi awan, dan lanskap keamanan siber terkini dalam menghadapi tantangan era digital berdasarkan fakta riset terbaru.',
  },
  {
    icon: Smartphone,
    label: 'Gadget & Konsumen',
    category: 'Gadget',
    prompt:
      'Analisis tren inovasi perangkat pintar generasi terbaru, fitur-fitur mutakhir yang mulai diadopsi massal, dan arah masa depan ekosistem teknologi konsumen berdasarkan pembaruan industri terkini.',
  },
];

const INDONESIA_REGIONS = [
  'Umum',
  'DKI Jakarta',
  'Jawa Barat',
  'Jawa Tengah',
  'DI Yogyakarta',
  'Jawa Timur',
  'Banten',
  'Bali',
  'Sumatera Utara',
  'Sumatera Barat',
  'Riau',
  'Kepulauan Riau',
  'Sumatera Selatan',
  'Lampung',
  'Aceh',
  'Kalimantan Timur',
  'Kalimantan Barat',
  'Kalimantan Selatan',
  'Sulawesi Selatan',
  'Sulawesi Utara',
  'Nusa Tenggara Barat',
  'Nusa Tenggara Timur',
  'Papua',
];

export default function GeneratorStudioPage() {
  const [prompt, setPrompt] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('AI');
  const [selectedRegion, setSelectedRegion] = useState('Umum');
  const [selectedProvider, setSelectedProvider] = useState<'gemini' | 'groq' | '9router'>('gemini');
  const [active9RouterModel, setActive9RouterModel] = useState<string>('');
  const [enableWebSearch, setEnableWebSearch] = useState(true);
  const [coverUrl, setCoverUrl] = useState('');
  const [publishStatus, setPublishStatus] = useState<'published' | 'draft'>('draft');
  const [articleLength, setArticleLength] = useState<'standar' | 'mendalam'>('standar');

  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [logs, setLogs] = useState<LogItem[]>([]);
  const [logFilterStatus, setLogFilterStatus] = useState<'all' | 'published' | 'draft' | 'failed'>('all');
  const [logSearchQuery, setLogSearchQuery] = useState('');

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
    researchSources?: { title: string; source: string; pubDate: string; region?: 'ID' | 'GLOBAL' }[];
    similarityInfo?: any;
  } | null>(null);

  const steps = enableWebSearch
    ? [
        selectedCategory === 'Regional'
          ? `Melakukan riset berita ${selectedRegion !== 'Umum' ? selectedRegion : 'daerah'} via Google News Indonesia (100% Berita Lokal)...`
          : 'Melakukan riset berita terkini via Google News (Dual Engine)...',
        'Menganalisis temuan fakta & merumuskan sudut pandang jurnalistik...',
        selectedCategory === 'Regional'
          ? 'Menghubungi AI Studio & menyusun naskah liputan daerah (Markdown)...'
          : 'Menghubungi AI Studio (Gemini) & menyusun naskah mendalam (Markdown)...',
        'Memformat metadata, tags, dan menyimpan otomatis ke Neon DB...',
      ]
    : [
        selectedCategory === 'Regional'
          ? 'Menganalisis instruksi topik & sudut pandang liputan daerah...'
          : 'Menganalisis instruksi topik & sudut pandang berita teknologi...',
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
    getAISettings()
      .then((cfg) => {
        if (cfg.model) setActive9RouterModel(cfg.model);
        if (cfg.defaultProvider) setSelectedProvider(cfg.defaultProvider);
      })
      .catch(() => {});
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
        region: selectedCategory === 'Regional' ? selectedRegion : undefined,
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
          similarityInfo: res.similarityInfo || null,
        });
        setPrompt('');
        setCoverUrl('');
      } else {
        setErrorMessage(res.error || 'Gagal membuat artikel.');
      }

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

  // Filter logs berdasarkan tab dan pencarian
  const filteredLogs = logs.filter((log) => {
    if (logFilterStatus === 'published' && log.status !== 'published') return false;
    if (logFilterStatus === 'draft' && log.status !== 'draft') return false;
    if (logFilterStatus === 'failed' && log.status !== 'failed') return false;

    if (logSearchQuery.trim()) {
      const q = logSearchQuery.toLowerCase();
      const matchPrompt = log.prompt.toLowerCase().includes(q);
      const matchTitle = (log.articleTitle || '').toLowerCase().includes(q);
      const matchCat = log.category.toLowerCase().includes(q);
      if (!matchPrompt && !matchTitle && !matchCat) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* 1. HEADER BANNER MEWAH */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-indigo-950 text-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-xl border border-gray-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-2.5 border border-indigo-500/30">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Naratif AI Studio</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight font-heading">
              Studio Generator Berita Otomatis
            </h1>
            <p className="text-gray-300 text-xs sm:text-sm mt-1.5 max-w-2xl leading-relaxed">
              Kendalikan AI untuk meriset fakta Google News, menyusun naskah jurnalistik mendalam, dan menerbitkan artikel ke Naratif dalam hitungan detik.
            </p>
          </div>

          {/* Quick Metrics & Link */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="flex items-center gap-3 bg-white/5 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-xs">
              <div>
                <div className="text-[10px] text-gray-400 font-medium">Model Aktif</div>
                <div className="font-bold text-white flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      selectedProvider === 'gemini'
                        ? 'bg-amber-400'
                        : selectedProvider === 'groq'
                        ? 'bg-cyan-400'
                        : 'bg-emerald-400'
                    } animate-pulse`}
                  />
                  <span>
                    {selectedProvider === 'gemini'
                      ? 'Gemini 3.8 Flash'
                      : selectedProvider === 'groq'
                      ? 'Groq Cloud'
                      : '9Router Gateway'}
                  </span>
                </div>
              </div>
              <div className="w-px h-6 bg-white/10" />
              <div>
                <div className="text-[10px] text-gray-400 font-medium">Sukses</div>
                <div className="font-bold text-emerald-400 mt-0.5">{stats.successRate}</div>
              </div>
            </div>

            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors border border-white/10"
            >
              <span>Dasbor Redaksi</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* 2. STAT CARDS (SELARAS DENGAN DASBOR REDAKSI) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Hasil AI */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
              Total Hasil AI
            </p>
            <h3 className="text-xl sm:text-2xl font-black text-gray-900 font-heading">
              {stats.totalGenerated}
            </h3>
            <span className="text-[11px] text-indigo-600 font-medium mt-0.5 block">
              Tercatat di Neon DB
            </span>
          </div>
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
            <Bot className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* Terbit Langsung */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">
              Terbit Langsung
            </p>
            <h3 className="text-xl sm:text-2xl font-black text-emerald-700 font-heading">
              {stats.publishedCount}
            </h3>
            <span className="text-[11px] text-emerald-600/80 mt-0.5 block">
              Status Published
            </span>
          </div>
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* Draft Siap Review */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-xs font-bold text-amber-600 uppercase tracking-wider mb-1 flex items-center gap-1">
              <span>Draf Siap Review</span>
              {stats.draftCount > 0 && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
            </p>
            <h3 className="text-xl sm:text-2xl font-black text-amber-700 font-heading">
              {stats.draftCount}
            </h3>
            <span className="text-[11px] text-amber-600/80 mt-0.5 block">
              Perlu pemeriksaan
            </span>
          </div>
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 shrink-0">
            <PenSquare className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* Rata-Rata Waktu */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
              Rata-rata Waktu
            </p>
            <h3 className="text-xl sm:text-2xl font-black text-gray-900 font-heading">
              {stats.avgDuration}
            </h3>
            <span className="text-[11px] text-gray-400 mt-0.5 block">
              Per artikel berita
            </span>
          </div>
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-xl flex items-center justify-center text-gray-700 shrink-0">
            <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>
      </div>

      {/* 3. MAIN GENERATOR CARD (REDESAIN RINGKAS & ERGONOMIS) */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 border border-gray-200 shadow-sm space-y-6">
        {/* 3.1 CHIP PILLS INSPIRASI TOPIK (TIDAK MEMAKAN RUANG VERTIKAL) */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Inspirasi Topik Cepat (Klik Sekali untuk Mengisi):</span>
            </label>
            <span className="text-[11px] text-gray-400">Pilih inspirasi atau ketik sendiri</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {PRESET_TOPICS.map((preset, idx) => {
              const Icon = preset.icon;
              const isSelected = prompt === preset.prompt;
              const isReg = preset.category === 'Regional';

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  disabled={isLoading}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-600/30'
                      : isReg
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                      : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : isReg ? 'text-emerald-600' : 'text-gray-500'}`} />
                  <span>{preset.label}</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-extrabold ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : isReg
                        ? 'bg-emerald-200/60 text-emerald-900'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {preset.category}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3.2 TEXTAREA INSTRUKSI TOPIK */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-gray-500" />
              <span>Instruksi / Topik Berita Anda:</span>
            </label>
            <div className="flex items-center gap-3">
              {prompt && (
                <button
                  type="button"
                  onClick={() => setPrompt('')}
                  className="text-xs text-red-500 hover:text-red-700 flex items-center gap-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                  <span>Kosongkan</span>
                </button>
              )}
              <span className="text-xs text-gray-400">{prompt.length} karakter</span>
            </div>
          </div>

          <div className="relative">
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isLoading}
              placeholder={
                selectedCategory === 'Regional'
                  ? `Contoh: Bahas kebijakan Pemda ${selectedRegion !== 'Umum' ? selectedRegion : 'terkait'} pelayanan publik, transportasi daerah, fasilitas warga, atau anggaran dinas berdasarkan fakta dan laporan terkini...`
                  : 'Contoh: Analisis perkembangan terbaru dan tren terhangat saat ini, sorot dampaknya bagi ekosistem industri dan masyarakat berdasarkan riset berita faktual terkini...'
              }
              className="w-full rounded-2xl border border-gray-300 p-3.5 sm:p-4 text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 outline-none transition-all resize-none shadow-2xs leading-relaxed"
            />
          </div>
        </div>

        {/* 3.3 COVER IMAGE LINK (OPSIONAL) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-gray-400" />
              Link Cover Image (ImgBB / URL Foto - Opsional):
            </label>
            <span className="text-[11px] text-gray-400">Kosongkan jika ingin input nanti di editor</span>
          </div>
          <input
            type="url"
            value={coverUrl}
            onChange={(e) => setCoverUrl(e.target.value)}
            disabled={isLoading}
            placeholder="Contoh: https://i.ibb.co/xxxxxx/sampul-berita.jpg"
            className="w-full rounded-xl sm:rounded-2xl border border-gray-300 px-3.5 sm:px-4 py-2.5 text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 outline-none transition-all shadow-2xs"
          />
        </div>

        {/* 3.4 GRID PENGATURAN PRODUKSI (LEGA, RAPI & TERSTRUKTUR) */}
        <div className="pt-2 border-t border-gray-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Box 1: AI Engine */}
            <div className="bg-indigo-50/70 p-3.5 rounded-xl border border-indigo-200 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-900 flex items-center gap-1">
                  <Bot className="w-3 h-3 text-indigo-600" />
                  AI Engine
                </span>
                <Link
                  href="/admin/pengaturan"
                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5"
                >
                  <Settings className="w-2.5 h-2.5" />
                  Atur
                </Link>
              </div>
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value as any)}
                disabled={isLoading}
                className="w-full bg-white rounded-lg border border-indigo-200 px-2.5 py-1.5 text-xs font-bold text-indigo-950 outline-none cursor-pointer truncate"
              >
                <option value="gemini">Google Gemini 3.8 Flash</option>
                <option value="groq">Groq Cloud (GPT-OSS 120B)</option>
                <option value="9router">
                  {active9RouterModel ? `9Router (${active9RouterModel})` : '9Router Gateway'}
                </option>
              </select>
            </div>

            {/* Box 2: Kategori & Wilayah */}
            <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-600 flex items-center gap-1">
                <Layers className="w-3 h-3 text-gray-500" />
                Kategori Berita
              </span>
              <div className="flex items-center gap-2">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  disabled={isLoading}
                  className="w-full bg-white rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-bold text-gray-800 outline-none cursor-pointer"
                >
                  <option value="AI">AI</option>
                  <option value="Regional">Regional</option>
                  <option value="Software">Software</option>
                  <option value="Hardware">Hardware</option>
                  <option value="Gadget">Gadget</option>
                  <option value="Infrastruktur">Infrastruktur</option>
                </select>

                {/* Sub-selector Wilayah (hanya jika Regional) */}
                {selectedCategory === 'Regional' && (
                  <select
                    value={selectedRegion}
                    onChange={(e) => setSelectedRegion(e.target.value)}
                    disabled={isLoading}
                    className="w-full bg-emerald-50 rounded-lg border border-emerald-300 px-2.5 py-1.5 text-xs font-bold text-emerald-950 outline-none cursor-pointer animate-in fade-in"
                  >
                    {INDONESIA_REGIONS.map((r) => (
                      <option key={r} value={r}>
                        {r === 'Umum' ? 'Semua Daerah' : r}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Box 3: Riset Google News */}
            <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-200 space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-900 flex items-center gap-1">
                <Search className="w-3 h-3 text-blue-600" />
                Riset Google News
              </span>
              <button
                type="button"
                onClick={() => setEnableWebSearch(!enableWebSearch)}
                disabled={isLoading}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                  enableWebSearch
                    ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                    : 'bg-white text-gray-500 border-gray-200'
                }`}
              >
                <span>{enableWebSearch ? 'Aktif (Riset Riil)' : 'Nonaktif (Murni AI)'}</span>
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold ${
                    enableWebSearch ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {selectedCategory === 'Regional' ? 'Lokal ID' : 'Dual Engine'}
                </span>
              </button>
            </div>

            {/* Box 4: Target Status */}
            <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-600 flex items-center gap-1">
                <Rocket className="w-3 h-3 text-gray-500" />
                Target Status
              </span>
              <div className="grid grid-cols-2 gap-1.5 bg-gray-200/80 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setPublishStatus('draft')}
                  disabled={isLoading}
                  className={`text-xs py-1 rounded-md font-bold transition-all cursor-pointer ${
                    publishStatus === 'draft'
                      ? 'bg-amber-500 text-white shadow-2xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Draft
                </button>
                <button
                  type="button"
                  onClick={() => setPublishStatus('published')}
                  disabled={isLoading}
                  className={`text-xs py-1 rounded-md font-bold transition-all cursor-pointer ${
                    publishStatus === 'published'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Publish
                </button>
              </div>
            </div>

            {/* Box 5: Target Panjang */}
            <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 space-y-1 sm:col-span-2 lg:col-span-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-600 flex items-center gap-1">
                <FileText className="w-3 h-3 text-gray-500" />
                Target Panjang Naskah
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setArticleLength('standar')}
                  disabled={isLoading}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                    articleLength === 'standar'
                      ? 'bg-gray-900 text-white border-gray-900 shadow-2xs'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  Standar (~700 kata)
                </button>
                <button
                  type="button"
                  onClick={() => setArticleLength('mendalam')}
                  disabled={isLoading}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                    articleLength === 'mendalam'
                      ? 'bg-gray-900 text-white border-gray-900 shadow-2xs'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  Mendalam (~1200 kata)
                </button>
              </div>
            </div>
          </div>

          {/* Action Trigger Button */}
          <div className="mt-5">
            <button
              type="button"
              onClick={handleStartGeneration}
              disabled={!prompt.trim() || isLoading}
              className={`w-full inline-flex items-center justify-center gap-2.5 py-4 px-6 rounded-2xl font-black text-sm sm:text-base shadow-md transition-all duration-200 cursor-pointer ${
                isLoading
                  ? 'bg-indigo-400 text-white cursor-not-allowed'
                  : !prompt.trim()
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 hover:from-indigo-700 hover:to-indigo-900 text-white shadow-indigo-500/25 active:scale-99'
              }`}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>AI Sedang Memproses Liputan & Menulis Naskah...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5" />
                  <span>Mulai Riset, Buat & Unggah Berita</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 3.5 REALTIME STEPPER PROGRESS */}
        {isLoading && (
          <div className="bg-indigo-50/90 rounded-2xl p-5 border border-indigo-200 space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">
                    Proses Eksekusi AI Berjalan di Cloud
                  </h4>
                  <p className="text-xs text-gray-600">
                    Sedang memadukan riset Google News dan LLM Gateway.
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold text-indigo-700 bg-indigo-100 px-3 py-1 rounded-full">
                Langkah {Math.min(currentStep + 1, steps.length)} dari {steps.length}
              </span>
            </div>

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

        {/* ERROR ALERT */}
        {errorMessage && (
          <div className="bg-red-50 text-red-800 p-4 rounded-2xl border border-red-200 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Gagal Membuat Artikel</p>
              <p className="text-xs mt-0.5 text-red-700">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* 3.6 SUCCESS CARD PREVIEW */}
        {lastGenerated && !isLoading && (
          <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-200 space-y-4 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                      Berita Berhasil Disimpan ke Neon DB!
                    </span>
                    <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                      Durasi: {(lastGenerated.durationMs / 1000).toFixed(1)}s
                    </span>
                    {lastGenerated.category === 'Regional' && (
                      <span className="text-[10px] font-semibold bg-emerald-600 text-white px-2 py-0.5 rounded flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span>{selectedRegion !== 'Umum' ? selectedRegion : 'Regional'}</span>
                      </span>
                    )}
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
                  <span>Dasbor Redaksi</span>
                </Link>
                <Link
                  href={`/admin/edit/${lastGenerated.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-bold hover:bg-black transition-colors shadow-2xs"
                >
                  <span>Edit Artikel</span>
                </Link>
                {lastGenerated.status === 'published' && (
                  <a
                    href={`/berita-teknologi/${lastGenerated.category.toLowerCase().replace(/\s+/g, '-')}/${lastGenerated.id}/${lastGenerated.slug}`}
                    target="_blank"
                    rel="noreferrer"
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
                  <span>
                    Riset Google News Berhasil ({lastGenerated.researchSources.length} Berita Referensi Terkini Terintegrasi):
                  </span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {lastGenerated.researchSources.map((item, idx) => (
                    <div
                      key={idx}
                      className="inline-flex items-center gap-1.5 bg-white/80 border border-emerald-200 px-2.5 py-1 rounded-md text-[11px] text-gray-700 max-w-sm"
                      title={item.title}
                    >
                      <span className="font-bold text-emerald-800">{item.source}</span>
                      <span className="text-gray-300">•</span>
                      <span className="truncate">{item.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. RIWAYAT HASIL GENERATE AI (DENGAN TABS FILTER, PENCARIAN & TABEL RAPI) */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Header & Filter Tabs */}
        <div className="p-4 sm:p-5 border-b border-gray-100 bg-gray-50/50 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-gray-900 font-heading">
                Riwayat Eksekusi AI ({logs.length})
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Daftar artikel yang telah digenerate oleh AI Studio di Naratif.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {logs.some((l) => l.status === 'failed') && (
                <button
                  type="button"
                  onClick={handleClearFailed}
                  disabled={isClearingFailed}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isClearingFailed ? 'Membersihkan...' : 'Hapus Semua Gagal'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Tabs Filter Status & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setLogFilterStatus('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  logFilterStatus === 'all'
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                Semua ({logs.length})
              </button>
              <button
                type="button"
                onClick={() => setLogFilterStatus('published')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  logFilterStatus === 'published'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-emerald-800 hover:bg-emerald-50 border border-emerald-300'
                }`}
              >
                Terbit ({logs.filter((l) => l.status === 'published').length})
              </button>
              <button
                type="button"
                onClick={() => setLogFilterStatus('draft')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  logFilterStatus === 'draft'
                    ? 'bg-amber-600 text-white'
                    : 'bg-white text-amber-800 hover:bg-amber-50 border border-amber-300'
                }`}
              >
                Draf ({logs.filter((l) => l.status === 'draft').length})
              </button>
              <button
                type="button"
                onClick={() => setLogFilterStatus('failed')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  logFilterStatus === 'failed'
                    ? 'bg-red-600 text-white'
                    : 'bg-white text-red-800 hover:bg-red-50 border border-red-300'
                }`}
              >
                Gagal ({logs.filter((l) => l.status === 'failed').length})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={logSearchQuery}
                onChange={(e) => setLogSearchQuery(e.target.value)}
                placeholder="Cari topik atau judul..."
                className="w-full bg-white rounded-lg border border-gray-200 pl-8 pr-3 py-1.5 text-xs text-gray-900 placeholder:text-gray-400 focus:border-indigo-600 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Table / List */}
        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-500">
            Tidak ada riwayat hasil AI untuk filter yang dipilih.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50/75 border-b border-gray-200 text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Waktu</th>
                  <th className="px-5 py-3">Topik / Prompt</th>
                  <th className="px-5 py-3">Judul Artikel Dihasilkan</th>
                  <th className="px-5 py-3">Kategori</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Durasi</th>
                  <th className="px-5 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLogs.map((log) => {
                  const isPub = log.status === 'published';
                  const isDrf = log.status === 'draft';
                  const isFail = log.status === 'failed';

                  return (
                    <tr key={log.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-5 py-3.5 whitespace-nowrap text-xs text-gray-500">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span>{formatLogDate(log.createdAt)}</span>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 text-xs font-medium text-gray-800 max-w-xs">
                        <span className="line-clamp-2">{log.prompt}</span>
                      </td>

                      <td className="px-5 py-3.5 text-xs font-bold text-gray-900 max-w-sm">
                        {log.articleId ? (
                          <Link
                            href={`/admin/edit/${log.articleId}`}
                            className="hover:text-indigo-600 transition-colors line-clamp-2"
                          >
                            {log.articleTitle || 'Tanpa Judul'}
                          </Link>
                        ) : (
                          <span className="line-clamp-2 text-red-600">
                            {log.errorMessage || 'Gagal'}
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="text-[10px] font-bold bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                          {log.category}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            isPub
                              ? 'bg-emerald-100 text-emerald-800'
                              : isDrf
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {isPub && <CheckCircle2 className="w-2.5 h-2.5" />}
                          {isDrf && <PenSquare className="w-2.5 h-2.5" />}
                          {isFail && <AlertCircle className="w-2.5 h-2.5" />}
                          <span>{log.status}</span>
                        </span>
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap text-xs text-gray-500">
                        {log.durationMs ? `${(log.durationMs / 1000).toFixed(1)}s` : '-'}
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          {log.articleId && (
                            <Link
                              href={`/admin/edit/${log.articleId}`}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                              title="Edit Artikel"
                            >
                              <Settings className="w-3.5 h-3.5" />
                            </Link>
                          )}
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
