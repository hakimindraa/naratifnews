'use client';

import { useState } from 'react';
import { MessageCircle, Link2, Check } from 'lucide-react';

export default function ShareButtons({ title, url }: { title: string; url: string }) {
  const [copied, setCopied] = useState(false);

  const fbShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  const twitterShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;
  const waShareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(title + '\n\n' + url)}`;

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      } else {
        // Fallback
        const textArea = document.createElement('textarea');
        textArea.value = url;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 relative">
      {/* Facebook */}
      <a
        href={fbShareUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Bagikan ke Facebook"
        title="Bagikan ke Facebook"
        className="flex items-center justify-center w-8.5 h-8.5 sm:w-9 sm:h-9 bg-[#1877F2] text-white rounded-full hover:scale-105 hover:opacity-90 transition-all shadow-xs"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      </a>

      {/* Twitter / X */}
      <a
        href={twitterShareUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Bagikan ke Twitter / X"
        title="Bagikan ke X"
        className="flex items-center justify-center w-8.5 h-8.5 sm:w-9 sm:h-9 bg-[#111] text-white rounded-full hover:scale-105 hover:opacity-90 transition-all shadow-xs"
      >
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      </a>

      {/* WhatsApp */}
      <a
        href={waShareUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Bagikan ke WhatsApp"
        title="Bagikan ke WhatsApp"
        className="flex items-center justify-center w-8.5 h-8.5 sm:w-9 sm:h-9 bg-[#25D366] text-white rounded-full hover:scale-105 hover:opacity-90 transition-all shadow-xs"
      >
        <MessageCircle className="w-4 h-4" />
      </a>

      {/* Salin Tautan (Copy Link) */}
      <div className="relative">
        <button
          onClick={handleCopyLink}
          aria-label="Salin Tautan Artikel"
          title="Salin Tautan"
          className={`flex items-center justify-center w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-full transition-all shadow-xs cursor-pointer ${
            copied
              ? 'bg-emerald-600 text-white scale-105'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700 hover:scale-105'
          }`}
        >
          {copied ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
        </button>

        {/* Tooltip feedback */}
        {copied && (
          <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[11px] font-bold px-2 py-1 rounded shadow-md whitespace-nowrap animate-fade-in pointer-events-none">
            Tersalin!
          </div>
        )}
      </div>
    </div>
  );
}
