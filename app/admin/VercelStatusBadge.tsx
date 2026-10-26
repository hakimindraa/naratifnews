'use client';

import { useState, useEffect, useRef } from 'react';
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  GitCommit,
  GitBranch,
  Clock,
  Zap,
  Globe,
  X,
  ChevronDown,
} from 'lucide-react';
import { getVercelDeployStatusAction, triggerVercelRedeployAction } from './vercel-actions';
import { VercelDeployment, VercelStatusResponse } from '@/lib/vercel';

function formatTimeAgo(timestamp: number): string {
  try {
    const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
    if (diffSec < 60) return 'Baru saja';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} menit lalu`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour} jam lalu`;
    const diffDays = Math.floor(diffHour / 24);
    return `${diffDays} hari lalu`;
  } catch {
    return 'Beberapa waktu lalu';
  }
}

export default function VercelStatusBadge() {
  const [data, setData] = useState<VercelStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [redeploying, setRedeploying] = useState(false);
  const [redeployNotice, setRedeployNotice] = useState<string | null>(null);

  const popoverRef = useRef<HTMLDivElement>(null);

  // Fetch status deploy
  const fetchStatus = async (isManual = false) => {
    if (isManual) setLoading(true);
    try {
      const res = await getVercelDeployStatusAction();
      setData(res);
    } catch (e) {
      console.error('Error fetching Vercel status:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  // Click outside listener untuk menutup popup
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleTriggerRedeploy = async () => {
    if (!confirm('Deploy ulang build produksi Ada Fakta di Vercel sekarang?')) return;
    setRedeploying(true);
    setRedeployNotice(null);

    const res = await triggerVercelRedeployAction();
    setRedeploying(false);

    if (res.success) {
      setRedeployNotice('🚀 Build baru berhasil dipicu di Vercel!');
      setTimeout(() => fetchStatus(), 2000);
    } else {
      setRedeployNotice(`❌ Gagal: ${res.error || 'Terjadi kesalahan'}`);
    }
  };

  const latest = data?.latest;
  const isReady = latest?.state === 'READY';
  const isBuilding = latest?.state === 'BUILDING' || latest?.state === 'INITIALIZING' || latest?.state === 'QUEUED';
  const isError = latest?.state === 'ERROR' || latest?.state === 'CANCELED';

  // Jika belum dikonfigurasi
  if (data && !data.configured) {
    return null;
  }

  return (
    <div className="relative inline-block text-left" ref={popoverRef}>
      {/* BADGE TRIGGER BUTTON (Tinggi h-9, whitespace-nowrap, Anti-Patah) */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`h-9 flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 rounded-xl text-xs font-semibold transition-colors cursor-pointer border shadow-2xs whitespace-nowrap shrink-0 ${
          isReady
            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
            : isBuilding
            ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
            : isError
            ? 'bg-rose-500/10 text-rose-300 border-rose-500/30 hover:bg-rose-500/20'
            : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700'
        }`}
        title="Klik untuk melihat rincian deploy Vercel"
      >
        {/* State Indicator */}
        {loading && !latest ? (
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-gray-400 shrink-0" />
        ) : isReady ? (
          <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
        ) : isBuilding ? (
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400 shrink-0" />
        ) : isError ? (
          <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
        ) : (
          <span className="w-2 h-2 rounded-full bg-gray-400 shrink-0" />
        )}

        {/* Text Label (Anti Patah 2 Baris) */}
        <span className="font-mono text-[11px] sm:text-xs whitespace-nowrap">
          {loading && !latest ? (
            'Vercel...'
          ) : isReady ? (
            <>
              <span className="hidden sm:inline">Deploy: </span>
              <span>Ready</span>
            </>
          ) : isBuilding ? (
            'Building...'
          ) : isError ? (
            <>
              <span className="hidden sm:inline">Deploy: </span>
              <span>Failed</span>
            </>
          ) : (
            'Vercel'
          )}
        </span>

        <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* FLOATING POPOVER DROPDOWN */}
      {isOpen && (
        <>
          {/* Backdrop gelap di tampilan mobile */}
          <div
            className="fixed inset-0 bg-black/60 z-40 sm:hidden"
            onClick={() => setIsOpen(false)}
          />

          <div className="fixed inset-x-3.5 top-18 sm:top-full sm:mt-2 sm:absolute sm:inset-x-auto sm:right-0 w-auto sm:w-96 max-w-sm sm:max-w-none mx-auto sm:mx-0 rounded-2xl bg-gray-900 border border-gray-800 shadow-xl p-4 sm:p-5 z-50 text-white max-h-[85vh] overflow-y-auto">
            {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 fill-white" viewBox="0 0 76 65" height="16">
                <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" />
              </svg>
              <h3 className="text-sm font-bold tracking-tight">Status Vercel Production</h3>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => fetchStatus(true)}
                disabled={loading}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                title="Segarkan data sekarang"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Alert Error jika ada */}
          {data?.error && (
            <div className="my-3 p-2.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs">
              {data.error}
            </div>
          )}

          {redeployNotice && (
            <div className="my-3 p-2.5 rounded-xl bg-indigo-950/50 border border-indigo-700/60 text-indigo-200 text-xs">
              {redeployNotice}
            </div>
          )}

          {/* Kartu Status Deployment Terbaru */}
          {latest ? (
            <div className="mt-3.5 space-y-3.5">
              <div className="p-3.5 rounded-xl bg-gray-800/80 border border-gray-700/60 space-y-2.5">
                {/* Status & Time */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider ${
                        isReady
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : isBuilding
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : isError
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-gray-700 text-gray-300'
                      }`}
                    >
                      {isReady && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                      {isBuilding && <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />}
                      {isError && <AlertTriangle className="w-3 h-3 text-rose-400" />}
                      {latest.state}
                    </span>
                    <span className="text-[11px] text-gray-400 font-medium">Production</span>
                  </div>

                  <span className="text-[11px] text-gray-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTimeAgo(latest.createdAt)}
                  </span>
                </div>

                {/* Commit Message & Branch */}
                <div>
                  <p className="text-xs font-semibold text-gray-100 line-clamp-2">
                    {latest.commit?.message || 'Manual Deployment'}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-400 pt-1">
                    <span className="flex items-center gap-1 font-mono text-gray-300">
                      <GitCommit className="w-3 h-3 text-indigo-400" />
                      {latest.commit?.sha}
                    </span>
                    <span className="flex items-center gap-1">
                      <GitBranch className="w-3 h-3 text-gray-500" />
                      {latest.commit?.branch || 'main'}
                    </span>
                    <span>Oleh: <b>{latest.creator}</b></span>
                  </div>
                </div>

                {/* Quick Links */}
                <div className="pt-2 border-t border-gray-700/60 flex items-center justify-between text-xs">
                  <a
                    href={latest.inspectorUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-400 hover:text-indigo-300 font-semibold inline-flex items-center gap-1 hover:underline"
                  >
                    <span>Buka Log Build</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  <a
                    href="https://www.adafakta.web.id"
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-400 hover:text-emerald-300 font-semibold inline-flex items-center gap-1 hover:underline"
                  >
                    <span>Domain Publik</span>
                    <Globe className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Tombol Aksi: Deploy Ulang */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleTriggerRedeploy}
                  disabled={redeploying || isBuilding}
                  className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  <span>{redeploying ? 'Memicu Deploy Ulang...' : isBuilding ? 'Sedang Building...' : '⚡ Trigger Deploy Ulang'}</span>
                </button>
              </div>

              {/* Riwayat 3 Deploy Terakhir */}
              {data && data.deployments.length > 1 && (
                <div className="pt-2 border-t border-gray-800 space-y-1.5">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Riwayat Deploy Sebelumnya:
                  </div>
                  <div className="space-y-1.5">
                    {data.deployments.slice(1, 4).map((d) => (
                      <div
                        key={d.id}
                        className="flex items-center justify-between text-[11px] p-2 rounded-lg bg-gray-800/40 hover:bg-gray-800 transition-colors"
                      >
                        <div className="flex-1 min-w-0 truncate text-gray-300 mr-2">
                          <span className="font-mono text-gray-400 mr-1.5">[{d.commit?.sha}]</span>
                          <span>{d.commit?.message}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                              d.state === 'READY'
                                ? 'text-emerald-400 bg-emerald-950/40'
                                : d.state === 'ERROR'
                                ? 'text-rose-400 bg-rose-950/40'
                                : 'text-gray-400 bg-gray-800'
                            }`}
                          >
                            {d.state}
                          </span>
                          <span className="text-[10px] text-gray-500">{formatTimeAgo(d.createdAt)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-gray-400">
              {loading ? 'Memuat data dari Vercel...' : 'Belum ada data deployment.'}
            </div>
          )}
        </div>
      </>
    )}
  </div>
);
}
