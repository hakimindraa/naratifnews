'use client';

import { useState } from 'react';
import { FileText, ChevronDown, ChevronUp } from 'lucide-react';
import CopyTemplateButton from './CopyTemplateButton';

const TEMPLATE_CONTENT = `---
title: "Judul Berita Pertama Anda"
slug: "judul-berita-pertama-anda"
category: "Software"
cover: "https://images.unsplash.com/photo-1555066931-4365d14bab8c"
cover_caption: "Aktivitas penulisan kode software modern. (Foto: Dok. Unsplash)"
publish_at: "2026-10-13 07:00"
excerpt: "Ringkasan tajam 1-2 kalimat untuk cuplikan berita di kartu depan dan pratinjau media sosial..."
tags: ["Next.js", "React", "Frontend", "JavaScript"]
---
Konten lengkap berita pertama Anda di sini dalam format Markdown...

## Subjudul Pembahasan
Tuliskan penjelasan mendalam di sini...

---SPLIT---

---
title: "Judul Berita Kedua Anda"
slug: "judul-berita-kedua-anda"
category: "Hardware"
cover: "https://images.unsplash.com/photo-1518770660439-4636190af475"
cover_caption: "Komponen chipset dan sirkuit komputasi modern. (Foto: Dok. Unsplash)"
publish_at: "2026-10-13 14:00"
excerpt: "Ulasan arsitektur semikonduktor generasi terbaru yang memecahkan rekor efisiensi daya..."
tags: ["Hardware", "Semikonduktor", "Samsung", "Chipset"]
---
Konten lengkap berita kedua Anda di sini...`;

export default function MarkdownGuideAccordion() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden transition-all">
      {/* Header Bar */}
      <div className="p-4 sm:p-5 flex items-center justify-between gap-3 bg-gray-50/60 hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-bold text-gray-900 font-heading truncate">
              Panduan Format Markdown (.md), Cuplikan & Tag Berita
            </h3>
            <p className="text-[11px] text-gray-500 truncate mt-0.5">
              Template resmi untuk unggah artikel tunggal atau massal (Bulk Upload).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <CopyTemplateButton content={TEMPLATE_CONTENT} />
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <span>{isOpen ? 'Tutup' : 'Lihat'}</span>
            {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Collapsible Content */}
      {isOpen && (
        <div className="p-4 sm:p-6 border-t border-gray-200 space-y-4">
          <div className="relative">
            <pre className="bg-[#0f172a] text-gray-100 p-4 sm:p-5 rounded-xl text-xs sm:text-sm overflow-x-auto font-mono scrollbar-hide border border-slate-800 leading-relaxed">
              {TEMPLATE_CONTENT}
            </pre>
          </div>

          {/* Cheat Sheet Legend */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            <div className="bg-gray-50 p-3 sm:p-3.5 rounded-xl border border-gray-100">
              <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5 mb-1">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                tags (Topik & Trending)
              </span>
              <p className="text-[11px] text-gray-600 leading-relaxed">
                Bisa format array <code className="bg-white px-1 py-0.5 rounded border border-gray-200">[&quot;Next.js&quot;, &quot;React&quot;]</code> atau dipisah koma. Otomatis masuk ke Trending & tombol #Tag.
              </p>
            </div>

            <div className="bg-gray-50 p-3 sm:p-3.5 rounded-xl border border-gray-100">
              <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5 mb-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                excerpt (Cuplikan / Deskripsi)
              </span>
              <p className="text-[11px] text-gray-600 leading-relaxed">
                Ringkasan tajam 1-2 kalimat untuk cuplikan kartu depan & saat share ke medsos. (Jika kosong, AI/sistem otomatis membuatkan).
              </p>
            </div>

            <div className="bg-gray-50 p-3 sm:p-3.5 rounded-xl border border-gray-100">
              <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5 mb-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                category (Kategori Resmi)
              </span>
              <p className="text-[11px] text-gray-600 leading-relaxed">
                Wajib salah satu dari: <strong className="text-gray-800">Nasional, Internasional, Regional, Sport, AI, Gadget, Software, Hardware, Infrastruktur</strong>.
              </p>
            </div>

            <div className="bg-gray-50 p-3 sm:p-3.5 rounded-xl border border-gray-100">
              <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5 mb-1">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                publish_at (Waktu Tayang WIB)
              </span>
              <p className="text-[11px] text-gray-600 leading-relaxed">
                Format: <code className="bg-white px-1 py-0.5 rounded border border-gray-200">YYYY-MM-DD HH:mm</code>. Jika masa depan, otomatis menjadi Terjadwal (Scheduled).
              </p>
            </div>

            <div className="bg-gray-50 p-3 sm:p-3.5 rounded-xl border border-gray-100">
              <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5 mb-1">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                cover & cover_caption
              </span>
              <p className="text-[11px] text-gray-600 leading-relaxed">
                Link gambar (http/https). <code className="bg-white px-1 py-0.5 rounded border border-gray-200">cover_caption</code> opsional untuk keterangan foto / dokumentasi.
              </p>
            </div>

            <div className="bg-gray-50 p-3 sm:p-3.5 rounded-xl border border-gray-100">
              <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5 mb-1">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                ---SPLIT--- (Pemisah Artikel)
              </span>
              <p className="text-[11px] text-gray-600 leading-relaxed">
                Tulis <strong className="text-gray-800">---SPLIT---</strong> di baris baru sebagai pembatas jika mengunggah banyak artikel dalam 1 file .md.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
