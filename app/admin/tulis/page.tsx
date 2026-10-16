import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, PenSquare } from 'lucide-react';
import TulisForm from './TulisForm';

export const instant = false;

export const metadata: Metadata = {
  title: 'Tulis Artikel Baru - Ada Fakta Admin',
};

export default function TulisArtikelPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex items-center gap-3">
        <Link 
          href="/admin" 
          className="p-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors shadow-sm"
          title="Kembali ke Dashboard"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 font-heading">
              Tulis Artikel Baru
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Buat dan terbitkan berita teknologi langsung tanpa file .md.
          </p>
        </div>
      </div>

      {/* Form Container */}
      <div className="bg-white p-5 sm:p-8 rounded-2xl shadow-sm border border-gray-200">
        <TulisForm />
      </div>
    </div>
  );
}
