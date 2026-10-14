'use client';

import { useState, useEffect } from 'react';
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
  Bot
} from 'lucide-react';
import {
  getAISettings,
  saveAISettings,
  test9RouterConnection,
  fetch9RouterModels,
  AISettingsData,
} from './actions';

export default function PengaturanPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [fetchingModels, setFetchingModels] = useState(false);

  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [defaultProvider, setDefaultProvider] = useState<'gemini' | 'groq' | '9router'>('gemini');

  const [showKey, setShowKey] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saveMessage, setSaveMessage] = useState<{ success: boolean; message: string } | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data: AISettingsData = await getAISettings();
      setBaseUrl(data.baseUrl || '');
      setApiKey(data.apiKey || '');
      setModel(data.model || '');
      setDefaultProvider(data.defaultProvider || 'gemini');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveMessage(null);

    const res = await saveAISettings({
      baseUrl,
      apiKey,
      model,
      defaultProvider,
    });

    setSaving(false);
    setSaveMessage(res);

    setTimeout(() => {
      setSaveMessage(null);
    }, 4000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-500">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
        <p className="text-sm font-medium">Memuat konfigurasi AI...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-gray-900 font-heading">Pengaturan AI Gateway</h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200/60">
              Live DB Config
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Konfigurasi endpoint, API key, dan model AI (9Router, Gemini, Groq) secara terpusat tanpa perlu mengubah kode atau redeploy di Vercel.
          </p>
        </div>
      </div>

      {/* Notifikasi Simpan */}
      {saveMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 transition-all ${
            saveMessage.success
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {saveMessage.success ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span className="text-sm font-medium">{saveMessage.message}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
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
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Nama Model AI Aktif <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleFetchModels}
                  disabled={fetchingModels || !baseUrl.trim()}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
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
                  placeholder="Contoh: elf/deepseek-v4-flash atau gpt-4o"
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
                ID model yang sudah Anda daftarkan di 9Router (misal: <code className="text-indigo-600 font-mono font-semibold">elf/deepseek-v4-flash</code>).
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

        {/* Tombol Simpan Utama */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{saving ? 'Menyimpan...' : 'Simpan Semua Pengaturan'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
