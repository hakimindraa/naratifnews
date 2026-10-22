'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Bot,
  ExternalLink,
  Copy,
  Check,
  Radio,
  ArrowRight,
  Newspaper,
  Sparkles,
} from 'lucide-react';

const BOT_URL = 'https://bottelejurnalis.vercel.app/';

export default function BotJurnalisWidget() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(BOT_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Gagal menyalin URL:', err);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/90 via-purple-50/40 to-white p-3.5 sm:p-6 shadow-xs transition-all hover:shadow-sm">
      {/* Background Decorative Blobs */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-indigo-200/30 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-10 right-1/3 h-32 w-32 rounded-full bg-purple-200/20 blur-xl" />

      <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-5">
        {/* Sisi Kiri: Ikon & Informasi */}
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="relative flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/20">
            <Bot className="h-5 w-5 sm:h-6 sm:w-6" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3 sm:h-3.5 sm:w-3.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 sm:h-3.5 sm:w-3.5 rounded-full border-2 border-white bg-emerald-500" />
            </span>
          </div>

          <div className="space-y-1 sm:space-y-1.5 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-indigo-700 bg-indigo-100/90 border border-indigo-200/60 px-1.5 sm:px-2 py-0.5 rounded-md flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                Integrasi Eksternal
              </span>
              <span className="text-[9px] sm:text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-1.5 sm:px-2 py-0.5 rounded-md flex items-center gap-1">
                <Radio className="w-2.5 h-2.5 animate-pulse" />
                Live Service
              </span>
            </div>

            <h2 className="text-sm sm:text-lg font-extrabold text-gray-900 font-heading tracking-tight leading-tight">
              Portal Bot Jurnalis Telegram
            </h2>

            <p className="text-xs sm:text-sm text-gray-600 max-w-2xl leading-relaxed line-clamp-2 sm:line-clamp-none">
              Pusat otomasi intelijen berita dan monitoring liputan lapangan. Akses konsol bot untuk mengelola feed liputan dan pantau fakta berita.
            </p>

            {/* URL Display Pill & Tombol Salin */}
            <div className="pt-1 flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="text-[10px] sm:text-[11px] font-semibold text-gray-500">Tautan:</span>
              <a
                href={BOT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white border border-indigo-200/90 text-indigo-700 hover:text-indigo-900 text-[11px] sm:text-xs font-mono font-medium shadow-2xs transition-all truncate max-w-[190px] sm:max-w-none"
                title="Buka link di tab baru"
              >
                <span className="truncate">{BOT_URL}</span>
                <ExternalLink className="w-3 h-3 text-indigo-400 group-hover:text-indigo-600 shrink-0" />
              </a>

              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] sm:text-xs font-medium transition-colors cursor-pointer border border-gray-200"
                title="Salin tautan ke clipboard"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span className="text-emerald-700 font-bold">Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-gray-500" />
                    <span>Salin</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Sisi Kanan: Action Buttons (Grid 2 Kolom di Mobile) */}
        <div className="grid grid-cols-2 gap-2 w-full lg:flex lg:flex-col lg:w-auto lg:shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-indigo-100/80">
          <a
            href={BOT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xs sm:text-sm shadow-xs hover:shadow transition-all group text-center"
          >
            <span>Buka Bot</span>
            <ExternalLink className="w-3.5 h-3.5 text-white/80 shrink-0" />
          </a>

          <Link
            href="/admin/jurnalis"
            className="inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-2 sm:py-2.5 rounded-xl bg-white hover:bg-gray-50 text-gray-700 hover:text-gray-900 font-bold text-xs sm:text-sm border border-gray-200 shadow-2xs transition-all group text-center"
          >
            <Newspaper className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span>Meja Draf</span>
            <ArrowRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          </Link>
        </div>
      </div>
    </div>
  );
}
