"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface ContactCopyButtonProps {
  textToCopy: string;
  label?: string;
  className?: string;
}

export function ContactCopyButton({
  textToCopy,
  label = "Salin",
  className = "",
}: ContactCopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        // Fallback untuk environment tanpa clipboard API
        const textArea = document.createElement("textarea");
        textArea.value = textToCopy;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        textArea.remove();
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Gagal menyalin teks:", err);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={`Salin ${textToCopy}`}
      className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl transition-all duration-200 border cursor-pointer select-none active:scale-95 ${
        copied
          ? "bg-emerald-50 text-emerald-700 border-emerald-300 shadow-xs"
          : "bg-white text-gray-700 border-gray-200 hover:bg-gray-100 hover:text-gray-900 hover:border-gray-300 shadow-2xs"
      } ${className}`}
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-emerald-600" />
          <span className="font-bold">Tersalin!</span>
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5 text-gray-500" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}
