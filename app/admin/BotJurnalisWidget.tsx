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
    <div className="rounded-2xl border border-gray-200 bg-white p-3.5 sm:p-5 shadow-xs">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-5">
        {/* Sisi Kiri: Ikon & Informasi */}
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="relative flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-gray-900 text-white shadow-2xs">
            <Bot className="h-5 w-5 sm:h-5 sm:w-5" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
            </span>
          </div>

          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md">
                Otomasi Intelijen
              </span>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                Bot Aktif
              </span>
            </div>

            <h2 className="text-sm sm:text-base font-bold text-gray-900 font-heading tracking-tight leading-tight">
              Portal Bot Jurnalis Telegram
            </h2>

            <p className="text-xs text-gray-600 max-w-2xl leading-relaxed line-clamp-2 sm:line-clamp-none">
              Pusat otomasi intelijen berita dan monitoring liputan lapangan. Akses konsol bot untuk mengelola feed liputan dan pantau fakta berita.
            </p>

            {/* URL Display Pill & Tombol Salin */}
            <div className="pt-0.5 flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="text-[10px] sm:text-[11px] font-semibold text-gray-400">Tautan:</span>
              <a
                href={BOT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-700 hover:text-gray-900 text-[11px] sm:text-xs font-mono font-medium transition-colors truncate max-w-[190px] sm:max-w-none"
                title="Buka link di tab baru"
              >
                <span className="truncate">{BOT_URL}</span>
                <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-gray-600 shrink-0" />
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
                    <span className="text-emerald-700 font-bold">Tersalin</span>
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
        <div className="grid grid-cols-2 gap-2 w-full lg:flex lg:flex-col lg:w-auto lg:shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-gray-100">
          <a
            href={BOT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-gray-900 hover:bg-black text-white font-bold text-xs sm:text-sm shadow-2xs transition-colors text-center"
          >
            <span>Buka Bot</span>
            <ExternalLink className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          </a>

          <Link
            href="/admin/jurnalis"
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-gray-50 text-gray-700 hover:text-gray-900 font-bold text-xs sm:text-sm border border-gray-200 shadow-2xs transition-colors text-center"
          >
            <Newspaper className="w-3.5 h-3.5 text-gray-600 shrink-0" />
            <span>Meja Draf</span>
            <ArrowRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          </Link>
        </div>
      </div>
    </div>
  );
}
