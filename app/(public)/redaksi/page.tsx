import { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Award, Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "Susunan Redaksi",
  description: "Susunan tim dan dewan redaksi Ada Fakta - Portal Berita Faktual Terpercaya.",
  alternates: {
    canonical: '/redaksi',
  },
};

export default function RedaksiPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Breadcrumb */}
      <nav className="flex text-sm text-gray-500 mb-6 items-center">
        <Link href="/" className="hover:text-gray-900 transition-colors">Home</Link>
        <ChevronRight className="w-4 h-4 mx-2" />
        <span className="text-gray-900 font-medium">Susunan Redaksi</span>
      </nav>

      {/* Header */}
      <div className="border-b border-gray-200 pb-8 mb-8">
        <h1 className="text-3xl sm:text-4xl font-black font-heading text-gray-900 tracking-tight mb-3">
          Susunan <span className="text-gray-900">Redaksi</span>
        </h1>
        <p className="text-gray-600">
          Tim jurnalis, editor, dan analis di balik sajian berita serta ulasan Ada Fakta.
        </p>
      </div>

      {/* Struktur Grid */}
      <div className="space-y-8">
        {/* Pimpinan */}
        <section className="bg-gray-50 p-6 rounded-2xl border border-gray-200/80">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-900 mb-4 flex items-center gap-2">
            <Award className="w-4 h-4" />
            Pimpinan Redaksi & Manajemen
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <div className="text-xs text-gray-400 uppercase font-semibold">Penanggung Jawab / Pemimpin Umum</div>
              <div className="font-bold text-gray-900 text-lg mt-0.5">Indra Hakim Lesmana</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 uppercase font-semibold">Pemimpin Redaksi</div>
              <div className="font-bold text-gray-900 text-lg mt-0.5">Tim Redaksi Ada Fakta</div>
            </div>
          </div>
        </section>

        {/* Tim Editorial */}
        <section className="border border-gray-200 p-6 rounded-2xl space-y-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700">
            Tim Editorial & Desk Berita
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <div className="text-xs text-gray-400 uppercase font-semibold">Redaktur Pelaksana</div>
              <div className="font-bold text-gray-900 mt-0.5">Desk Teknologi</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 uppercase font-semibold">Editor AI & Software</div>
              <div className="font-bold text-gray-900 mt-0.5">Tim Software & AI</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 uppercase font-semibold">Editor Gadget & Hardware</div>
              <div className="font-bold text-gray-900 mt-0.5">Tim Gadget & Perangkat</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 uppercase font-semibold">Reporter & Analis</div>
              <div className="font-bold text-gray-900 mt-0.5">Staf Jurnalis Ada Fakta</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 uppercase font-semibold">Riset & Verifikasi Data</div>
              <div className="font-bold text-gray-900 mt-0.5">Tim Riset Ada Fakta</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 uppercase font-semibold">Desain & Visual</div>
              <div className="font-bold text-gray-900 mt-0.5">Tim Kreatif Ada Fakta</div>
            </div>
          </div>
        </section>

        {/* Kode Etik & Kontak Redaksi */}
        <div className="bg-gray-100 p-6 rounded-2xl border border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="font-bold text-gray-900">Kirim Siaran Pers / Hubungi Redaksi</h3>
            <p className="text-xs text-gray-600 mt-1">Punya rilis produk atau informasi teknologi terbaru? Kirimkan kepada kami.</p>
          </div>
          <a
            href="mailto:redaksi@adafakta.web.id"
            className="flex items-center gap-2 bg-gray-900 hover:bg-black text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-colors shrink-0"
          >
            <Mail className="w-4 h-4" />
            <span>redaksi@adafakta.web.id</span>
          </a>
        </div>
      </div>
    </div>
  );
}
