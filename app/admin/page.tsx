import { FileText, Clock, Settings, Trash2, CheckCircle2, Layers, PenSquare, Sparkles } from "lucide-react";
import Link from "next/link";
import UploadButton from "./UploadButton";
import DeleteButton from "./DeleteButton";
import CopyTemplateButton from "./CopyTemplateButton";
import { db } from "@/db";
import { articles } from "@/db/schema";
import { desc } from "drizzle-orm";

export const instant = false;

export default async function AdminDashboard() {
  const dbArticles = await db.select().from(articles).orderBy(desc(articles.createdAt));

  // Metrik Statistik
  const totalArticles = dbArticles.length;
  const publishedArticles = dbArticles.filter(a => a.status === 'published').length;
  const scheduledArticles = dbArticles.filter(a => a.status === 'scheduled').length;

  // Hitung Kategori Terbanyak
  const categoryCounts: Record<string, number> = {};
  dbArticles.forEach(a => {
    const cat = a.category || 'Lainnya';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  let topCategoryName = '-';
  let topCategoryCount = 0;
  for (const [cat, count] of Object.entries(categoryCounts)) {
    if (count > topCategoryCount) {
      topCategoryName = cat;
      topCategoryCount = count;
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 font-heading">Dashboard Redaksi</h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-1">Kelola dan terbitkan artikel Naratif secara langsung atau terjadwal.</p>
        </div>

        {/* Action Buttons: Tulis Manual, AI Studio & Upload Bulk */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
          <Link
            href="/admin/generator"
            className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-4 py-2.5 rounded-lg font-bold hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-sm text-sm"
          >
            <Sparkles className="w-4 h-4 shrink-0 text-indigo-200" />
            <span>AI Studio</span>
          </Link>
          <Link
            href="/admin/tulis"
            className="inline-flex items-center justify-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-lg font-bold hover:bg-black transition-all shadow-sm text-sm"
          >
            <PenSquare className="w-4 h-4 shrink-0" />
            <span>+ Tulis Berita</span>
          </Link>
          <UploadButton />
        </div>
      </div>

      {/* 4 KARTU STATISTIK & RINGKASAN KONTEN */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
        {/* Total Artikel */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Total Artikel</div>
            <div className="text-2xl sm:text-3xl font-black font-heading text-gray-900">{totalArticles}</div>
            <div className="text-[11px] text-gray-400 mt-0.5">Semua arsip berita</div>
          </div>
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gray-100 text-gray-800 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* Sudah Terbit */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-green-600 mb-1">Sudah Terbit</div>
            <div className="text-2xl sm:text-3xl font-black font-heading text-gray-900">{publishedArticles}</div>
            <div className="text-[11px] text-gray-400 mt-0.5">Tayang di website</div>
          </div>
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-green-50 text-green-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* Terjadwal */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-orange-600 mb-1">Terjadwal</div>
            <div className="text-2xl sm:text-3xl font-black font-heading text-gray-900">{scheduledArticles}</div>
            <div className="text-[11px] text-gray-400 mt-0.5">Menunggu jam tayang</div>
          </div>
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* Kategori Utama */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">Kategori Utama</div>
            <div className="text-xl sm:text-2xl font-black font-heading text-gray-900 truncate max-w-[100px] sm:max-w-none">
              {topCategoryName}
            </div>
            <div className="text-[11px] text-gray-400 mt-0.5">{topCategoryCount} artikel terdaftar</div>
          </div>
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gray-900 text-white flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>
      </div>

      {/* PANDUAN FORMAT BULK UPLOAD & TAGS */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div>
            <h2 className="text-base sm:text-lg text-gray-900 font-bold flex items-center gap-2 font-heading">
              <FileText className="w-5 h-5 text-indigo-600 shrink-0" />
              Panduan Format Markdown (.md), Cuplikan & Tag Berita
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              Template resmi untuk unggah artikel tunggal atau puluhan artikel sekaligus (Bulk Upload).
            </p>
          </div>
          <div className="shrink-0">
            <CopyTemplateButton
              content={`---
title: "Judul Berita Pertama Anda"
slug: "judul-berita-pertama-anda"
category: "Software"
cover: "https://images.unsplash.com/photo-1555066931-4365d14bab8c"
cover_caption: "Ilustrasi penulisan kode software modern. (Dok. Unsplash)"
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
cover_caption: "Ilustrasi chipset dan sirkuit komputasi. (Dok. Unsplash)"
publish_at: "2026-10-13 14:00"
excerpt: "Ulasan arsitektur semikonduktor generasi terbaru yang memecahkan rekor efisiensi daya..."
tags: ["Hardware", "Semikonduktor", "Samsung", "Chipset"]
---
Konten lengkap berita kedua Anda di sini...`}
            />
          </div>
        </div>

        {/* Code Block Box */}
        <div className="relative">
          <pre className="bg-[#0f172a] text-gray-100 p-4 sm:p-5 rounded-xl text-xs sm:text-sm overflow-x-auto font-mono scrollbar-hide border border-slate-800 leading-relaxed">
{`---
title: "Judul Berita Pertama Anda"
slug: "judul-berita-pertama-anda"
category: "Software"
cover: "https://images.unsplash.com/photo-1555066931-4365d14bab8c"
cover_caption: "Ilustrasi penulisan kode software modern. (Dok. Unsplash)"
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
cover_caption: "Ilustrasi chipset dan sirkuit komputasi. (Dok. Unsplash)"
publish_at: "2026-10-13 14:00"
excerpt: "Ulasan arsitektur semikonduktor generasi terbaru yang memecahkan rekor efisiensi daya..."
tags: ["Hardware", "Semikonduktor", "Samsung", "Chipset"]
---
Konten lengkap berita kedua Anda di sini...`}
          </pre>
        </div>

        {/* Field Cheat Sheet / Legend */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
          <div className="bg-gray-50 p-3 sm:p-3.5 rounded-xl border border-gray-100">
            <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              tags (Topik & Trending)
            </span>
            <p className="text-[11px] text-gray-600 leading-relaxed">
              Bisa format array <code className="bg-white px-1 py-0.5 rounded border border-gray-200">["Next.js", "React"]</code> atau teks <code className="bg-white px-1 py-0.5 rounded border border-gray-200">Next.js, React</code>. Otomatis masuk ke bar Trending & tombol #Tag di bawah berita.
            </p>
          </div>

          <div className="bg-gray-50 p-3 sm:p-3.5 rounded-xl border border-gray-100">
            <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              excerpt (Cuplikan / Deskripsi)
            </span>
            <p className="text-[11px] text-gray-600 leading-relaxed">
              Ringkasan tajam 1-2 kalimat untuk cuplikan kartu depan & saat share ke WhatsApp/Medsos. (Jika dikosongkan, sistem otomatis membuatkan).
            </p>
          </div>

          <div className="bg-gray-50 p-3 sm:p-3.5 rounded-xl border border-gray-100">
            <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              category (Kategori Resmi)
            </span>
            <p className="text-[11px] text-gray-600 leading-relaxed">
              Wajib salah satu dari: <strong className="text-gray-800">Software, Hardware, AI, Gadget, Infrastruktur</strong>.
            </p>
          </div>

          <div className="bg-gray-50 p-3 sm:p-3.5 rounded-xl border border-gray-100">
            <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              publish_at (Waktu Tayang WIB)
            </span>
            <p className="text-[11px] text-gray-600 leading-relaxed">
              Format: <code className="bg-white px-1 py-0.5 rounded border border-gray-200">YYYY-MM-DD HH:mm</code>. Jika diatur masa depan, otomatis menjadi Terjadwal (Scheduled).
            </p>
          </div>

          <div className="bg-gray-50 p-3 sm:p-3.5 rounded-xl border border-gray-100">
            <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
              cover & cover_caption
            </span>
            <p className="text-[11px] text-gray-600 leading-relaxed">
              Link gambar (wajib diawali http/https). <code className="bg-white px-1 py-0.5 rounded border border-gray-200">cover_caption</code> opsional untuk keterangan foto/dok.
            </p>
          </div>

          <div className="bg-gray-50 p-3 sm:p-3.5 rounded-xl border border-gray-100">
            <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              ---SPLIT--- (Pemisah Artikel)
            </span>
            <p className="text-[11px] text-gray-600 leading-relaxed">
              Tulis <strong className="text-gray-800">---SPLIT---</strong> di baris baru sebagai pembatas jika mengunggah banyak artikel dalam 1 file .md.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-base sm:text-lg font-bold text-gray-900">Daftar Artikel ({dbArticles.length})</h2>
        </div>

        {/* TAMPILAN MOBILE (Card List Responsif) */}
        <div className="md:hidden divide-y divide-gray-100">
          {dbArticles.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-sm">
              Belum ada artikel yang diunggah. Silakan upload file .md Anda.
            </div>
          ) : (
            dbArticles.map((article) => (
              <div key={article.id} className="p-4 space-y-3 hover:bg-gray-50/50 transition-colors">
                {/* Judul & Ikon */}
                <div className="flex items-start gap-2.5">
                  <FileText className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  <span className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">
                    {article.title}
                  </span>
                </div>

                {/* Badges: Kategori & Status */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="bg-gray-100 text-gray-700 font-medium px-2 py-0.5 rounded text-xs">
                    {article.category}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    article.status === 'published' ? 'bg-green-100 text-green-700' :
                    article.status === 'scheduled' ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {article.status}
                  </span>
                </div>

                {/* Footer Baris Bawah: Waktu Terbit & Aksi */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs text-gray-500">
                  <div className="flex items-center gap-1.5 truncate pr-2">
                    <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="truncate">
                      {article.publishAt ? new Date(article.publishAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta'}) + ' WIB' : '-'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <a 
                      href={`/admin/edit/${article.id}`} 
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-xs transition-colors"
                      title="Edit Artikel"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </a>
                    <DeleteButton 
                      id={article.id} 
                      title={article.title} 
                      showText={true}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-medium text-xs transition-colors disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* TAMPILAN DESKTOP & TABLET (Tabel Penuh) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 min-w-[680px]">
            <thead className="bg-gray-50 text-gray-700 text-xs uppercase font-bold border-b border-gray-200">
              <tr>
                <th className="px-6 py-4">Judul Artikel</th>
                <th className="px-6 py-4">Kategori</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Waktu Terbit</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {dbArticles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    Belum ada artikel yang diunggah. Silakan upload file .md Anda.
                  </td>
                </tr>
              ) : (
                dbArticles.map((article) => (
                  <tr key={article.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-3">
                      <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="line-clamp-1">{article.title}</span>
                    </td>
                    <td className="px-6 py-4">
                      {article.category}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                        article.status === 'published' ? 'bg-green-100 text-green-700' :
                        article.status === 'scheduled' ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {article.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      {article.publishAt ? new Date(article.publishAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta'}) + ' WIB' : '-'}
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end items-center gap-1">
                      <a href={`/admin/edit/${article.id}`} className="text-gray-400 hover:text-gray-900 p-2 transition-colors" title="Edit Artikel">
                        <Settings className="w-4 h-4" />
                      </a>
                      <DeleteButton id={article.id} title={article.title} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
