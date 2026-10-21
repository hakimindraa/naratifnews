'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Server,
  Key,
  Cpu,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Save,
  Zap,
  Eye,
  EyeOff,
  Radio,
  ExternalLink,
  ShieldCheck,
  Bot,
  Play,
  Check,
  Copy,
  Sparkles,
  Clock,
  Sliders,
  Send,
  Layers,
  Globe,
  HelpCircle,
  Info,
  Calendar,
  FileText,
  Flame,
  ArrowRight,
} from 'lucide-react';
import {
  getAISettings,
  saveAISettings,
  test9RouterConnection,
  fetch9RouterModels,
  AISettingsData,
  getAutopilotSettings,
  saveAutopilotSettings,
  triggerAutopilotNowAction,
  getCronConfigInfo,
  AutopilotSettingsData,
} from './actions';

const ALL_CATEGORIES = ['AI', 'Nasional', 'Internasional', 'Regional', 'Sport', 'Software', 'Hardware', 'Gadget', 'Infrastruktur'];

export default function PengaturanPage() {
  const [activeTab, setActiveTab] = useState<'gateway' | 'autopilot'>('autopilot');
  const [loading, setLoading] = useState(true);

  // State: AI Gateway
  const [savingGateway, setSavingGateway] = useState(false);
  const [testing, setTesting] = useState(false);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [defaultProvider, setDefaultProvider] = useState<'gemini' | 'groq' | '9router'>('gemini');
  const [showKey, setShowKey] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  // State: Autopilot
  const [savingAutopilot, setSavingAutopilot] = useState(false);
  const [runningAutopilot, setRunningAutopilot] = useState(false);
  const [autopilotEnabled, setAutopilotEnabled] = useState(false);
  const [autopilotProvider, setAutopilotProvider] = useState<'gemini' | 'groq' | '9router'>('groq');
  const [autopilotStatus, setAutopilotStatus] = useState<'published' | 'draft'>('published');
  const [autopilotLength, setAutopilotLength] = useState<'ringkas' | 'standar' | 'mendalam'>('standar');
  const [autopilotCategories, setAutopilotCategories] = useState<string[]>(ALL_CATEGORIES);
  const [autopilotTelegramNotify, setAutopilotTelegramNotify] = useState(true);
  const [autopilotTestResult, setAutopilotTestResult] = useState<{
    success: boolean;
    message: string;
    title?: string;
    category?: string;
    status?: string;
    article_id?: number;
    duration_ms?: number;
  } | null>(null);

  // State: Cron Config Info
  const [cronInfo, setCronInfo] = useState<{
    cronUrl: string;
    cronSecret: string;
    siteUrl: string;
  }>({
    cronUrl: 'https://www.adafakta.web.id/api/cron/autopilot',
    cronSecret: '',
    siteUrl: 'https://www.adafakta.web.id',
  });
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Global Notification
  const [toastMessage, setToastMessage] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [aiData, autoData, cronData] = await Promise.all([
        getAISettings(),
        getAutopilotSettings(),
        getCronConfigInfo(),
      ]);

      setBaseUrl(aiData.baseUrl || '');
      setApiKey(aiData.apiKey || '');
      setModel(aiData.model || '');
      setDefaultProvider(aiData.defaultProvider || 'gemini');

      setAutopilotEnabled(autoData.enabled);
      setAutopilotProvider(autoData.provider || 'groq');
      setAutopilotStatus(autoData.status || 'published');
      setAutopilotLength(autoData.length || 'standar');
      setAutopilotCategories(autoData.categories && autoData.categories.length > 0 ? autoData.categories : ALL_CATEGORIES);
      setAutopilotTelegramNotify(autoData.telegramNotify);

      setCronInfo(cronData);
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (success: boolean, message: string) => {
    setToastMessage({ success, message });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => {
      setCopiedField(null);
    }, 2500);
  };

  // Handler: Test 9Router Connection
  const handleTestConnection = async () => {
    if (!baseUrl.trim()) {
      setTestResult({ success: false, message: 'Harap isi Base URL terlebih dahulu.' });
      return;
    }

    setTesting(true);
    setTestResult(null);

    const res = await test9RouterConnection(baseUrl, apiKey);
    setTesting(false);
    setTestResult(res);

    if (res.models && res.models.length > 0) {
      setAvailableModels(res.models);
    }
  };

  // Handler: Fetch Models from 9Router
  const handleFetchModels = async () => {
    if (!baseUrl.trim()) {
      setTestResult({ success: false, message: 'Harap isi Base URL terlebih dahulu.' });
      return;
    }

    setFetchingModels(true);
    const res = await fetch9RouterModels(baseUrl, apiKey);
    setFetchingModels(false);

    if (res.success && res.models.length > 0) {
      setAvailableModels(res.models);
      setTestResult({
        success: true,
        message: `Berhasil menemukan ${res.models.length} model aktif dari 9Router!`,
      });
    } else {
      setTestResult({
        success: false,
        message: res.message || 'Gagal menarik model dari 9Router.',
      });
    }
  };

  // Handler: Save Gateway Settings
  const handleSaveGateway = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingGateway(true);

    const res = await saveAISettings({
      baseUrl,
      apiKey,
      model,
      defaultProvider,
    });

    setSavingGateway(false);
    showToast(res.success, res.message);
  };

  // Handler: Toggle Autopilot Category
  const handleToggleCategory = (cat: string) => {
    if (autopilotCategories.includes(cat)) {
      if (autopilotCategories.length === 1) {
        showToast(false, 'Minimal harus memilih satu kategori untuk Autopilot.');
        return;
      }
      setAutopilotCategories(autopilotCategories.filter((c) => c !== cat));
    } else {
      setAutopilotCategories([...autopilotCategories, cat]);
    }
  };

  // Handler: Save Autopilot Settings
  const handleSaveAutopilot = async () => {
    setSavingAutopilot(true);

    const res = await saveAutopilotSettings({
      enabled: autopilotEnabled,
      provider: autopilotProvider,
      status: autopilotStatus,
      length: autopilotLength,
      categories: autopilotCategories,
      telegramNotify: autopilotTelegramNotify,
    });

    setSavingAutopilot(false);
    showToast(res.success, res.message);
  };

  // Handler: Trigger Autopilot Now (Test Run)
  const handleRunAutopilotNow = async () => {
    setRunningAutopilot(true);
    setAutopilotTestResult(null);

    const res = await triggerAutopilotNowAction();
    setRunningAutopilot(false);
    setAutopilotTestResult(res);

    if (res.success) {
      showToast(true, 'Uji coba Autopilot berhasil! Berita baru telah dibuat.');
    } else {
      showToast(false, res.message || 'Gagal menjalankan Autopilot.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-500">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
        <p className="text-sm font-medium">Memuat konfigurasi Ada Fakta...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-7 pb-16">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 font-heading">Pengaturan Redaksi & AI</h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200/60">
              Live DB Config
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            Konfigurasi model AI, proxy 9Router, dan Mode Autopilot Redaksi otomatis tanpa redeploy di Vercel.
          </p>
        </div>

        {/* Tab Switcher Pills */}
        <div className="w-full sm:w-auto grid grid-cols-2 sm:flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200">
          <button
            type="button"
            onClick={() => setActiveTab('autopilot')}
            className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'autopilot'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="truncate">Autopilot</span>
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                autopilotEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'
              }`}
            />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('gateway')}
            className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'gateway'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Server className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="truncate">9Router</span>
          </button>
        </div>
      </div>

      {/* Floating / Inline Toast Notification */}
      {toastMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 transition-all shadow-sm ${
            toastMessage.success
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {toastMessage.success ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span className="text-sm font-semibold">{toastMessage.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-xs opacity-60 hover:opacity-100 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* TAB 1: MODE AUTOPILOT REDAKSI */}
      {activeTab === 'autopilot' && (
        <div className="space-y-6">
          {/* Card: Sakelar Status Autopilot */}
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-6 bg-gradient-to-r from-gray-900 via-indigo-950 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-5">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-indigo-500/20 flex items-center justify-center border border-indigo-400/30 shrink-0">
                  <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-300" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base sm:text-lg font-bold font-heading text-white">Mode Autopilot Redaksi</h2>
                    <span
                      className={`px-2 py-0.5 text-[10px] sm:text-[11px] font-bold rounded-full uppercase tracking-wider ${
                        autopilotEnabled
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                          : 'bg-gray-700/50 text-gray-300 border border-gray-600'
                      }`}
                    >
                      {autopilotEnabled ? '● Aktif Berjalan' : '○ Dinonaktifkan'}
                    </span>
                  </div>
                  <p className="text-xs text-indigo-200/90 mt-1">
                    Redaksi otomatis meriset berita terkini Google News, membuat naskah via AI, dan menerbitkannya secara berkala.
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-white/10">
                <span className="text-xs font-semibold text-gray-300">
                  {autopilotEnabled ? 'Autopilot ON' : 'Autopilot OFF'}
                </span>
                <button
                  type="button"
                  onClick={() => setAutopilotEnabled(!autopilotEnabled)}
                  className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    autopilotEnabled ? 'bg-emerald-500' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      autopilotEnabled ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Pengaturan Konfigurasi Autopilot */}
            <div className="p-5 sm:p-6 space-y-6">
              {/* 1. Pemilihan AI Engine Autopilot */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  1. AI Engine Pembuat Berita Autopilot
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Groq Cloud */}
                  <label
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      autopilotProvider === 'groq'
                        ? 'bg-indigo-50/60 border-indigo-600 ring-2 ring-indigo-600/20 shadow-2xs'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-amber-500" />
                        Groq Cloud
                      </span>
                      <input
                        type="radio"
                        name="autopilotProvider"
                        value="groq"
                        checked={autopilotProvider === 'groq'}
                        onChange={() => setAutopilotProvider('groq')}
                        className="text-indigo-600"
                      />
                    </div>
                    <span className="text-[11px] text-gray-500">
                      Rekomendasi Utama: Super cepat (&lt;15 detik), kuota gratis melimpah, stabil.
                    </span>
                  </label>

                  {/* Gemini 3.8 Flash */}
                  <label
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      autopilotProvider === 'gemini'
                        ? 'bg-indigo-50/60 border-indigo-600 ring-2 ring-indigo-600/20 shadow-2xs'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-indigo-500" />
                        Gemini 3.8 Flash
                      </span>
                      <input
                        type="radio"
                        name="autopilotProvider"
                        value="gemini"
                        checked={autopilotProvider === 'gemini'}
                        onChange={() => setAutopilotProvider('gemini')}
                        className="text-indigo-600"
                      />
                    </div>
                    <span className="text-[11px] text-gray-500">
                      Bahasa sangat alami, riset analitis mendalam dari Google AI Studio.
                    </span>
                  </label>

                  {/* 9Router */}
                  <label
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      autopilotProvider === '9router'
                        ? 'bg-indigo-50/60 border-indigo-600 ring-2 ring-indigo-600/20 shadow-2xs'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                        <Server className="w-4 h-4 text-emerald-500" />
                        9Router Gateway
                      </span>
                      <input
                        type="radio"
                        name="autopilotProvider"
                        value="9router"
                        checked={autopilotProvider === '9router'}
                        onChange={() => setAutopilotProvider('9router')}
                        className="text-indigo-600"
                      />
                    </div>
                    <span className="text-[11px] text-gray-500">
                      Model kustom Anda ({model || 'ELF / OpenAI'}).
                    </span>
                  </label>
                </div>
              </div>

              {/* 2. Status Publikasi & Panjang Artikel */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Status Publikasi */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    2. Status Hasil Berita
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setAutopilotStatus('published')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        autopilotStatus === 'published'
                          ? 'bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/20 font-bold text-emerald-950'
                          : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100/50'
                      }`}
                    >
                      <div className="text-xs font-bold flex items-center gap-1.5">
                        <span>🚀 Langsung Terbit</span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1">
                        Otomatis tayang di portal adafakta.web.id
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAutopilotStatus('draft')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        autopilotStatus === 'draft'
                          ? 'bg-amber-50/70 border-amber-500 ring-2 ring-amber-500/20 font-bold text-amber-950'
                          : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100/50'
                      }`}
                    >
                      <div className="text-xs font-bold flex items-center gap-1.5">
                        <span>📝 Simpan Draf</span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1">
                        Tersimpan di Dasbor untuk ditinjau editor
                      </p>
                    </button>
                  </div>
                </div>

                {/* Panjang Artikel */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    3. Format Panjang Naskah
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setAutopilotLength('standar')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        autopilotLength === 'standar'
                          ? 'bg-indigo-50/70 border-indigo-500 ring-2 ring-indigo-500/20 font-bold text-indigo-950'
                          : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100/50'
                      }`}
                    >
                      <div className="text-xs font-bold flex items-center gap-1.5">
                        <span>⚡ Standar (~700 kata)</span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1">
                        Berita cepat, to the point, hemat kuota AI
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAutopilotLength('mendalam')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        autopilotLength === 'mendalam'
                          ? 'bg-indigo-50/70 border-indigo-500 ring-2 ring-indigo-500/20 font-bold text-indigo-950'
                          : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100/50'
                      }`}
                    >
                      <div className="text-xs font-bold flex items-center gap-1.5">
                        <span>📖 Mendalam (~1200 kata)</span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1">
                        Liputan komprehensif, multi-perspektif
                      </p>
                    </button>
                  </div>
                </div>
              </div>

              {/* 3. Rotasi Kategori Berita */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                    4. Rotasi Kategori Berita (Pilih minimal 1)
                  </label>
                  <span className="text-xs text-gray-500">
                    Sistem bergantian meriset tiap kategori di setiap jadwal
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {ALL_CATEGORIES.map((cat) => {
                    const isChecked = autopilotCategories.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => handleToggleCategory(cat)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
                          isChecked
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs font-bold'
                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5" />}
                        <span>{cat}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Notifikasi Telegram */}
              <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600/10 flex items-center justify-center text-indigo-600 shrink-0">
                    <Send className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900">
                      Notifikasi Laporan ke Bot Telegram Admin
                    </h4>
                    <p className="text-[11px] text-gray-600 mt-0.5">
                      Kirimkan judul berita, kategori, durasi, dan tautan baca langsung ke HP Anda setiap kali artikel autopilot terbit.
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={autopilotTelegramNotify}
                  onChange={(e) => setAutopilotTelegramNotify(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer"
                />
              </div>

              {/* Tombol Simpan & Uji Coba */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleRunAutopilotNow}
                  disabled={runningAutopilot}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-center"
                >
                  {runningAutopilot ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4 text-white" />
                  )}
                  <span>{runningAutopilot ? 'Sedang Meriset & Membuat Berita...' : '⚡ Uji Jalankan Autopilot Sekarang'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveAutopilot}
                  disabled={savingAutopilot}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-center"
                >
                  {savingAutopilot ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{savingAutopilot ? 'Menyimpan...' : 'Simpan Pengaturan Autopilot'}</span>
                </button>
              </div>

              {/* Hasil Uji Coba Autopilot Langsung */}
              {autopilotTestResult && (
                <div
                  className={`p-4 rounded-xl border transition-all ${
                    autopilotTestResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {autopilotTestResult.success ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1.5 flex-1">
                      <div className="font-bold text-sm">
                        {autopilotTestResult.success ? 'Berhasil Membuat Berita Autopilot!' : 'Uji Coba Gagal'}
                      </div>
                      <p className="text-xs opacity-90">{autopilotTestResult.message}</p>

                      {autopilotTestResult.title && (
                        <div className="mt-2.5 p-3 bg-white/80 rounded-lg border border-emerald-200/80 space-y-1.5">
                          <div className="text-xs font-bold text-gray-900">
                            📰 {autopilotTestResult.title}
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-600">
                            <span>📂 Kategori: <b>{autopilotTestResult.category}</b></span>
                            <span>⏱️ Durasi: <b>{((autopilotTestResult.duration_ms || 0) / 1000).toFixed(1)}s</b></span>
                            <span>🌐 Status: <b>{autopilotTestResult.status}</b></span>
                          </div>
                          <div className="pt-2 flex items-center gap-3">
                            <Link
                              href="/admin"
                              className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"
                            >
                              <span>Buka di Dasbor Admin</span>
                              <ArrowRight className="w-3 h-3" />
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card: Panduan Konfigurasi cron-job.org */}
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2.5 border-b border-gray-100 pb-3">
              <Calendar className="w-5 h-5 text-indigo-600" />
              <div>
                <h3 className="text-base font-bold text-gray-900 font-heading">
                  Panduan Menghubungkan ke cron-job.org
                </h3>
                <p className="text-xs text-gray-500">
                  Jadwalkan pemanggilan otomatis agar artikel dibuat setiap hari tanpa perlu membuka browser.
                </p>
              </div>
            </div>

            <div className="space-y-3.5 text-xs text-gray-700">
              {/* Step 1 */}
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  <p className="font-semibold text-gray-900">
                    Buka Dashboard <a href="https://cron-job.org" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline font-bold inline-flex items-center gap-0.5">cron-job.org <ExternalLink className="w-3 h-3" /></a> dan klik <b>Create Cronjob</b>.
                  </p>
                  <p className="text-gray-500 mt-0.5">
                    Beri nama cron job, misal: <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-gray-800">Ada Fakta Autopilot Redaksi</code>.
                  </p>
                </div>
              </div>

              {/* Step 2: URL */}
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">Masukkan URL Endpoint Autopilot:</p>
                  <div className="mt-1.5 flex flex-col sm:flex-row sm:items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={cronInfo.cronUrl}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 font-mono text-xs text-gray-800 break-all"
                    />
                    <button
                      type="button"
                      onClick={() => copyToClipboard(cronInfo.cronUrl, 'url')}
                      className="w-full sm:w-auto px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold flex items-center justify-center gap-1 cursor-pointer shrink-0 transition-colors text-center"
                    >
                      {copiedField === 'url' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedField === 'url' ? 'Tersalin' : 'Salin URL'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Step 3: Jadwal */}
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  <p className="font-semibold text-gray-900">Tentukan Jadwal Eksekusi:</p>
                  <p className="text-gray-600 mt-0.5">
                    Pilih <b>User-defined schedule</b> atau <b>Every X hours</b>. Rekomendasi: <b>3 kali sehari</b> (misal jam <b>07:00</b> pagi, <b>12:00</b> siang, dan <b>19:00</b> malam WIB).
                  </p>
                </div>
              </div>

              {/* Step 4: Headers */}
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 mt-0.5">
                  4
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">
                    Di bagian <b>Advanced / Request Headers</b>, tambahkan Header Otorisasi:
                  </p>
                  <div className="mt-1.5 bg-gray-900 text-gray-200 p-3 sm:p-3.5 rounded-xl font-mono text-xs space-y-1.5">
                    <div className="text-gray-400">Header Key:</div>
                    <div className="text-emerald-400 font-bold">Authorization</div>
                    <div className="text-gray-400 pt-1">Header Value:</div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
                      <span className="text-amber-300 break-all text-[11px] sm:text-xs">
                        Bearer {cronInfo.cronSecret ? `${cronInfo.cronSecret.slice(0, 8)}••••••••${cronInfo.cronSecret.slice(-6)}` : '[CRON_SECRET_ANDA]'}
                      </span>
                      {cronInfo.cronSecret && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(`Bearer ${cronInfo.cronSecret}`, 'header')}
                          className="w-full sm:w-auto px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[11px] font-sans font-bold flex items-center justify-center gap-1.5 cursor-pointer shrink-0 transition-colors"
                        >
                          {copiedField === 'header' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedField === 'header' ? 'Tersalin' : 'Salin Lengkap'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 5: Jaminan Aman */}
              <div className="mt-4 p-3.5 bg-emerald-50 rounded-xl border border-emerald-200/80 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-emerald-900 text-[11px] leading-relaxed">
                  <b>Jaminan Sistem Terisolasi:</b> Cron job penerbitan artikel draf terjadwal Anda yang lama (<code className="font-mono text-emerald-800">/api/cron/publish</code>) <b>100% aman dan tidak tersentuh</b>. Cron Autopilot bekerja pada endpoint terpisah secara independen.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AI GATEWAY & DEFAULT PROVIDER */}
      {activeTab === 'gateway' && (
        <form onSubmit={handleSaveGateway} className="space-y-6">
          {/* Kartu Utama: 9Router AI Gateway */}
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
            <div className="p-5 sm:p-6 bg-gradient-to-r from-gray-900 to-indigo-950 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/10">
                  <Server className="w-5 h-5 text-indigo-300" />
                </div>
                <div>
                  <h2 className="text-lg font-bold font-heading text-white">9Router Gateway (Cloud & Lokal)</h2>
                  <p className="text-xs text-indigo-200">
                    Hubungkan proxy 9Router Anda (ELF Router, DeepSeek, OpenAI, Claude, dll).
                  </p>
                </div>
              </div>
              <div className="w-full sm:w-auto flex items-center justify-start sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/10">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testing}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 text-center"
                >
                  {testing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 text-amber-300" />}
                  <span>{testing ? 'Menguji...' : 'Tes Koneksi'}</span>
                </button>
              </div>
            </div>

            <div className="p-5 sm:p-6 space-y-5">
              {/* Hasil Uji Koneksi */}
              {testResult && (
                <div
                  className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs sm:text-sm ${
                    testResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="font-semibold">{testResult.success ? 'Koneksi Berhasil!' : 'Koneksi Gagal'}</div>
                    <div className="text-xs opacity-90 mt-0.5">{testResult.message}</div>
                  </div>
                </div>
              )}

              {/* Field: Base URL */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Base URL 9Router <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="Contoh: http://node7.botkeep.cloud:40022/v1"
                    className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1.5">
                  Pastikan menyertakan port dan akhiran <code className="text-indigo-600 font-semibold font-mono">/v1</code> di belakang URL publik 9Router Anda.
                </p>
              </div>

              {/* Field: API Key */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  API Key 9Router
                </label>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-xxxx... (kosongkan jika 9Router Anda tanpa autentikasi)"
                    className="w-full pl-3.5 pr-10 py-2.5 text-sm bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1.5">
                  Ambil API Key dari menu <b>Endpoint & Key</b> di dashboard 9Router Anda.
                </p>
              </div>

              {/* Field: Model ID + Tombol Tarik Model */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 mb-1.5">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Nama Model AI Aktif <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleFetchModels}
                    disabled={fetchingModels || !baseUrl.trim()}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50 self-start sm:self-auto"
                  >
                    <RefreshCw className={`w-3 h-3 ${fetchingModels ? 'animate-spin' : ''}`} />
                    <span>{fetchingModels ? 'Menarik...' : '🔄 Tarik Model Otomatis dari 9Router'}</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="Contoh: elfgw/elf/deepseek-v4-flash atau gpt-4o"
                    className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono font-semibold text-gray-900"
                    required
                  />
                </div>

                {/* Rekomendasi / Pilihan Model Cepat dari 9Router */}
                {availableModels.length > 0 && (
                  <div className="mt-3 p-3 bg-indigo-50/60 rounded-xl border border-indigo-100">
                    <span className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider block mb-2">
                      Pilih Model Tersedia di 9Router Anda (Klik untuk gunakan):
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {availableModels.map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setModel(m)}
                          className={`text-xs px-2.5 py-1 rounded-lg border font-mono transition-all cursor-pointer ${
                            model === m
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs font-bold'
                              : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-xs text-gray-500 mt-1.5">
                  ID model yang sudah Anda daftarkan di 9Router (misal: <code className="text-indigo-600 font-mono font-semibold">elfgw/elf/deepseek-v4-flash</code>).
                </p>
              </div>
            </div>
          </div>

          {/* Kartu: AI Provider Default */}
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <Bot className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base font-bold text-gray-900 font-heading">AI Engine Default</h3>
            </div>
            <p className="text-xs sm:text-sm text-gray-600">
              Tentukan AI mana yang otomatis terpilih saat Anda pertama kali membuka halaman <b>AI Studio</b>.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {/* Gemini */}
              <label
                className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                  defaultProvider === 'gemini'
                    ? 'bg-indigo-50/60 border-indigo-600 ring-2 ring-indigo-600/20 shadow-2xs'
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100/60'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm text-gray-900">Google Gemini</span>
                  <input
                    type="radio"
                    name="defaultProvider"
                    value="gemini"
                    checked={defaultProvider === 'gemini'}
                    onChange={() => setDefaultProvider('gemini')}
                    className="text-indigo-600"
                  />
                </div>
                <span className="text-xs text-gray-500">Model Gemini 3.8 Flash resmi via Google AI Studio.</span>
              </label>

              {/* Groq */}
              <label
                className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                  defaultProvider === 'groq'
                    ? 'bg-indigo-50/60 border-indigo-600 ring-2 ring-indigo-600/20 shadow-2xs'
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100/60'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm text-gray-900">Groq Cloud</span>
                  <input
                    type="radio"
                    name="defaultProvider"
                    value="groq"
                    checked={defaultProvider === 'groq'}
                    onChange={() => setDefaultProvider('groq')}
                    className="text-indigo-600"
                  />
                </div>
                <span className="text-xs text-gray-500">Super cepat, model open-source GPT-OSS 120B.</span>
              </label>

              {/* 9Router */}
              <label
                className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                  defaultProvider === '9router'
                    ? 'bg-indigo-50/60 border-indigo-600 ring-2 ring-indigo-600/20 shadow-2xs'
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100/60'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm text-gray-900">9Router Gateway</span>
                  <input
                    type="radio"
                    name="defaultProvider"
                    value="9router"
                    checked={defaultProvider === '9router'}
                    onChange={() => setDefaultProvider('9router')}
                    className="text-indigo-600"
                  />
                </div>
                <span className="text-xs text-gray-500">
                  Gateway kustom Anda ({model || 'Belum disetel'}).
                </span>
              </label>
            </div>
          </div>

          {/* Tombol Simpan Utama Gateway */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={savingGateway}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-center"
            >
              {savingGateway ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{savingGateway ? 'Menyimpan...' : 'Simpan Pengaturan 9Router'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
