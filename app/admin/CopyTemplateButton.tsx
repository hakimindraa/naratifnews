'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyTemplateButtonProps {
  content: string;
}

export default function CopyTemplateButton({ content }: CopyTemplateButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy template:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      type="button"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold transition-all border border-gray-700 cursor-pointer"
      title="Salin template Markdown ke clipboard"
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-emerald-300">Tersalin!</span>
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5 text-gray-300" />
          <span>Salin Template</span>
        </>
      )}
    </button>
  );
}
