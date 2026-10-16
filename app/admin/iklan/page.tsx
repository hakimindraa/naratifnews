'use client';

import { useState, useEffect } from 'react';
import {
  Coins,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Save,
  FileText,
  Sliders,
  HelpCircle,
  Laptop,
  Smartphone,
  Eye,
  Layers,
  ArrowRight,
  ShieldCheck,
  Check,
  Copy,
} from 'lucide-react';
import {
  getAdSettingsAction,
  saveAdSettingsAction,
  checkAdsTxtAction,
  syncAdsTxtAction,
  AdsTxtStatus,
} from './actions';
import { AdSettingsData, AdSlotConfig, DEFAULT_ADS_SETTINGS } from '@/lib/ads';

export default function IklanPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State
  const [settings, setSettings] = useState<AdSettingsData>(DEFAULT_ADS_SETTINGS);

  // ads.txt state
  const [adsTxtStatus, setAdsTxtStatus] = useState<AdsTxtStatus | null>(null);
  const [checkingAdsTxt, setCheckingAdsTxt] = useState(false);
  const [syncingAdsTxt, setSyncingAdsTxt] = useState(false);
  const [copiedTxt, setCopiedTxt] = useState(false);

  // Active sub-tab for visual focus
  const [activeTab, setActiveTab] = useState<'overview' | 'slots'>('overview');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const data = await getAdSettingsAction();
      setSettings(data);
      if (data.clientId) {
        const txt = await checkAdsTxtAction(data.clientId);
        setAdsTxtStatus(txt);
      }
    } catch (err) {
      console.error('Error loading ad settings:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckAdsTxt() {
    setCheckingAdsTxt(true);
    try {
      const res = await checkAdsTxtAction(settings.clientId);
      setAdsTxtStatus(res);
    } catch (err) {
      console.error(err);
    } finally {
      setCheckingAdsTxt(false);
    }
  }

  async function handleSyncAdsTxt() {
    setSyncingAdsTxt(true);
    try {
      const res = await syncAdsTxtAction(settings.clientId);
      if (res.success) {
        await handleCheckAdsTxt();
        setSaveMessage({ type: 'success', text: res.message });
      } else {
        setSaveMessage({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      setSaveMessage({ type: 'error', text: err?.message || 'Gagal sinkron ads.txt' });
    } finally {
      setSyncingAdsTxt(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setSaveMessage(null);
    try {
      const res = await saveAdSettingsAction(settings);
      if (res.success) {
        setSaveMessage({ type: 'success', text: res.message });
        await handleCheckAdsTxt();
      } else {
        setSaveMessage({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      setSaveMessage({ type: 'error', text: err?.message || 'Gagal menyimpan setelan iklan.' });
    } finally {
      setSaving(false);
    }
  }

  const updateSlot = (slotKey: 'header' | 'inArticle' | 'sidebar' | 'footer', updates: Partial<AdSlotConfig>) => {
    setSettings(prev => ({
      ...prev,
      [slotKey]: {
        ...prev[slotKey],
        ...updates,
      },
    }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTxt(true);
    setTimeout(() => setCopiedTxt(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
        <p className="text-sm font-medium text-gray-500">Memuat konfigurasi monetisasi...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      {/* Header Page */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold font-heading text-gray-900 tracking-tight">
                Manajemen Iklan & Monetisasi
              </h1>
              <p className="text-xs sm:text-sm text-gray-500">
                Atur Google AdSense (Auto Ads & Slot Khusus) serta Banner Sponsor Lokal tanpa koding.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="https://adsense.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-2xs"
          >
            <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
            Google AdSense
          </a>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-xl transition-all shadow-sm active:scale-95"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </button>
        </div>
      </div>

      {/* Alert Notification */}
      {saveMessage && (
        <div
          className={`p-4 rounded-xl text-sm flex items-start gap-3 border ${
            saveMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {saveMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
          )}
          <div className="flex-1 font-medium">{saveMessage.text}</div>
          <button
            onClick={() => setSaveMessage(null)}
            className="text-xs opacity-70 hover:opacity-100"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Quick Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Google AdSense Status */}
        <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-2xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Google AdSense
            </span>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${settings.autoAdsEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`} />
              <span className="text-sm font-bold text-gray-900">
                {settings.autoAdsEnabled ? 'Auto Ads Aktif' : 'Auto Ads Nonaktif'}
              </span>
            </div>
            <div className="text-[11px] font-mono text-gray-500 truncate max-w-[200px]">
              {settings.clientId || 'Belum diisi'}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: ads.txt Status */}
        <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-2xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              File ads.txt Web
            </span>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${adsTxtStatus?.hasPublisherId ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              <span className="text-sm font-bold text-gray-900">
                {adsTxtStatus?.hasPublisherId ? 'Terverifikasi Sesuai' : 'Perlu Sinkronisasi'}
              </span>
            </div>
            <a
              href="/ads.txt"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-indigo-600 hover:underline flex items-center gap-1 font-medium"
            >
              Lihat adafakta.web.id/ads.txt
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Total Slot Aktif */}
        <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-2xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Slot Khusus Aktif
            </span>
            <div className="text-xl font-bold font-heading text-gray-900">
              {[settings.header.enabled, settings.inArticle.enabled, settings.sidebar.enabled, settings.footer.enabled].filter(Boolean).length} / 4 Slot
            </div>
            <span className="text-[11px] text-gray-500">
              Header, Tengah Bacaan, Sidebar, Footer
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Layers className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Section 1: AdSense Global & Verification */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-amber-500/5 via-white to-transparent flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              G
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 font-heading">
                1. Pengaturan Utama Google AdSense
              </h2>
              <p className="text-xs text-gray-500">
                Pengenal penayang (Publisher ID) dan kontrol AI Auto Ads.
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            Layout Head Aktif
          </span>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Publisher ID Field */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                AdSense Publisher ID (Client ID)
              </label>
              <input
                type="text"
                value={settings.clientId}
                onChange={e => setSettings(prev => ({ ...prev, clientId: e.target.value }))}
                placeholder="ca-pub-9829376296588403"
                className="w-full px-3.5 py-2.5 text-sm font-mono bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <p className="text-[11px] text-gray-500">
                ID penayang dari Google AdSense Anda. Pastikan diawali dengan <code className="bg-gray-100 px-1 py-0.5 rounded font-bold text-gray-700">ca-pub-</code>.
              </p>
            </div>

            {/* Auto Ads Switch */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
              <div className="space-y-1 pr-4">
                <span className="text-sm font-bold text-gray-900 block">
                  Google Auto Ads
                </span>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Izinkan Google menggunakan mesin AI untuk menampilkan iklan secara otomatis pada posisi paling optimal di situs web.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSettings(prev => ({ ...prev, autoAdsEnabled: !prev.autoAdsEnabled }))}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  settings.autoAdsEnabled ? 'bg-amber-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    settings.autoAdsEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* ads.txt Verification & Diagnostics */}
          <div className="p-4.5 rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 via-white to-gray-50 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-600" />
                <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                  Status File ads.txt Web Anda
                </span>
                {adsTxtStatus?.hasPublisherId ? (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                    Siap & Lolos AdSense
                  </span>
                ) : (
                  <span className="text-[10px] bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full font-bold">
                    Belum Sinkron
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCheckAdsTxt}
                  disabled={checkingAdsTxt}
                  className="px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${checkingAdsTxt ? 'animate-spin' : ''}`} />
                  Cek Ulang
                </button>
                <button
                  type="button"
                  onClick={handleSyncAdsTxt}
                  disabled={syncingAdsTxt}
                  className="px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors flex items-center gap-1.5"
                >
                  {syncingAdsTxt ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                  Sinkronkan ads.txt Otomatis
                </button>
              </div>
            </div>

            {adsTxtStatus?.content && (
              <div className="p-3 bg-gray-900 text-gray-200 rounded-lg font-mono text-xs flex items-center justify-between overflow-x-auto">
                <code>{adsTxtStatus.content.trim()}</code>
                <button
                  onClick={() => copyToClipboard(adsTxtStatus.content.trim())}
                  className="ml-3 p-1.5 text-gray-400 hover:text-white transition-colors"
                  title="Salin baris ads.txt"
                >
                  {copiedTxt ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            )}
            <p className="text-[11px] text-gray-500">
              Google AdSense membutuhkan file ini pada alamat publik: <a href="https://www.adafakta.web.id/ads.txt" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">https://www.adafakta.web.id/ads.txt</a>. File ini melindungi situs Anda dari penipuan inventaris iklan.
            </p>
          </div>
        </div>
      </div>

      {/* Section 2: Slot Iklan & Sponsor Mandiri */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-gray-900 font-heading">
              2. Slot Iklan Khusus & Banner Sponsor
            </h2>
            <p className="text-xs text-gray-500">
              Nyalakan atau matikan slot tertentu di artikel. Bisa diisi kode AdSense unit atau Banner Sponsor mandiri.
            </p>
          </div>
          <div className="text-xs text-gray-500 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Perubahan langsung aktif seketika setelah tombol Simpan diklik.
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Slot 1: Header Banner */}
          <SlotConfigCard
            title="Slot 1: Atas Halaman (Header Banner)"
            description="Tampil di bagian atas setiap halaman, tepat di bawah navigasi."
            slotKey="header"
            slot={settings.header}
            clientId={settings.clientId}
            onUpdate={(updates) => updateSlot('header', updates)}
          />

          {/* Slot 2: In-Article */}
          <SlotConfigCard
            title="Slot 2: Tengah Bacaan (In-Article)"
            description="Otomatis disisipkan rapi di sela paragraf ke-3 artikel berita."
            slotKey="inArticle"
            slot={settings.inArticle}
            clientId={settings.clientId}
            onUpdate={(updates) => updateSlot('inArticle', updates)}
          />

          {/* Slot 3: Sidebar Desktop */}
          <SlotConfigCard
            title="Slot 3: Samping Artikel (Sidebar Desktop)"
            description="Tampil di kolom kanan halaman baca berita pada perangkat laptop/desktop."
            slotKey="sidebar"
            slot={settings.sidebar}
            clientId={settings.clientId}
            onUpdate={(updates) => updateSlot('sidebar', updates)}
          />

          {/* Slot 4: Footer Article */}
          <SlotConfigCard
            title="Slot 4: Bawah Bacaan (After Article)"
            description="Tampil tepat di penutup artikel sebelum deretan berita terkait."
            slotKey="footer"
            slot={settings.footer}
            clientId={settings.clientId}
            onUpdate={(updates) => updateSlot('footer', updates)}
          />
        </div>
      </div>

      {/* Floating / Bottom Save Bar */}
      <div className="p-4 bg-gray-900 text-white rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold">Siap Mengaktifkan Perubahan?</div>
            <div className="text-xs text-gray-400">
              Pengaturan ini akan langsung berefek ke seluruh pengunjung situs adafakta.web.id.
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full sm:w-auto px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold text-sm rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin text-gray-900" /> : <Save className="w-4 h-4" />}
          {saving ? 'Sedang Menyimpan...' : 'Simpan Semua Pengaturan Iklan'}
        </button>
      </div>
    </div>
  );
}

// Sub-component: Slot Configuration Card
interface SlotConfigCardProps {
  title: string;
  description: string;
  slotKey: string;
  slot: AdSlotConfig;
  clientId: string;
  onUpdate: (updates: Partial<AdSlotConfig>) => void;
}

function SlotConfigCard({ title, description, slot, clientId, onUpdate }: SlotConfigCardProps) {
  return (
    <div className={`p-5 rounded-2xl border transition-all ${
      slot.enabled
        ? 'bg-white border-amber-300 shadow-sm ring-1 ring-amber-100'
        : 'bg-gray-50/70 border-gray-200 opacity-90'
    }`}>
      {/* Switch Header */}
      <div className="flex items-start justify-between gap-3 pb-4 border-b border-gray-100">
        <div>
          <h3 className="text-sm font-bold text-gray-900 font-heading flex items-center gap-2">
            {title}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        </div>

        <button
          type="button"
          onClick={() => onUpdate({ enabled: !slot.enabled })}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
            slot.enabled ? 'bg-amber-600' : 'bg-gray-300'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
              slot.enabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Config Form (Only when enabled) */}
      {slot.enabled ? (
        <div className="mt-4 space-y-4">
          {/* Ad Type Selector */}
          <div>
            <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-2">
              Tipe Konten Slot
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onUpdate({ type: 'adsense' })}
                className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1.5 ${
                  slot.type === 'adsense'
                    ? 'bg-amber-500/10 border-amber-500 text-amber-800 shadow-2xs'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span>Google AdSense</span>
              </button>

              <button
                type="button"
                onClick={() => onUpdate({ type: 'custom' })}
                className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1.5 ${
                  slot.type === 'custom'
                    ? 'bg-indigo-500/10 border-indigo-500 text-indigo-800 shadow-2xs'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span>Banner Sponsor</span>
              </button>
            </div>
          </div>

          {/* Option A: AdSense Form */}
          {slot.type === 'adsense' && (
            <div className="space-y-2 p-3 bg-amber-50/50 rounded-xl border border-amber-100">
              <label className="block text-xs font-bold text-gray-800">
                AdSense Ad Slot ID (Opsional)
              </label>
              <input
                type="text"
                value={slot.slotId || ''}
                onChange={e => onUpdate({ slotId: e.target.value })}
                placeholder="Contoh: 1234567890"
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <p className="text-[11px] text-gray-500">
                Didapat saat membuat Ad Unit di dashboard AdSense. Jika dikosongkan, Google Auto Ads yang akan mengisi secara dinamis.
              </p>
            </div>
          )}

          {/* Option B: Custom Sponsor Banner Form */}
          {slot.type === 'custom' && (
            <div className="space-y-3 p-3 bg-indigo-50/40 rounded-xl border border-indigo-100">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-800">
                  URL Gambar Banner Sponsor
                </label>
                <input
                  type="url"
                  value={slot.bannerImage || ''}
                  onChange={e => onUpdate({ bannerImage: e.target.value })}
                  placeholder="https://example.com/banner.jpg"
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-800">
                  Link Tujuan Klik (Redirect URL)
                </label>
                <input
                  type="url"
                  value={slot.bannerUrl || ''}
                  onChange={e => onUpdate({ bannerUrl: e.target.value })}
                  placeholder="https://sponsor-website.com"
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-800">
                  Nama Sponsor / Alt Text
                </label>
                <input
                  type="text"
                  value={slot.bannerAlt || ''}
                  onChange={e => onUpdate({ bannerAlt: e.target.value })}
                  placeholder="Contoh: Promo Diskon Hosting Cloud"
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Preview Thumbnail */}
              {slot.bannerImage && (
                <div className="pt-2 border-t border-indigo-100/70">
                  <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">
                    Pratinjau Banner:
                  </span>
                  <div className="rounded-lg overflow-hidden border border-gray-200 max-h-32 bg-gray-100">
                    <img
                      src={slot.bannerImage}
                      alt={slot.bannerAlt || 'Preview'}
                      className="w-full h-full object-cover"
                      onError={(e) => ((e.target as any).style.display = 'none')}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-3 text-center py-4 text-xs text-gray-400 border border-dashed border-gray-200 rounded-xl">
          Slot ini sedang dinonaktifkan (Mati). Klik tombol di atas untuk menyalakannya.
        </div>
      )}
    </div>
  );
}
