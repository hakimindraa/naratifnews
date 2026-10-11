import { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Target, ShieldCheck, Zap, Users } from "lucide-react";

export const metadata: Metadata = {
  title: "Tentang Kami",
  description: "Profil, visi, misi, dan komitmen Naratif dalam menghadirkan informasi dan berita teknologi terpercaya di Indonesia.",
};

export default function TentangPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Breadcrumb */}
      <nav className="flex text-sm text-gray-500 mb-6 items-center">
        <Link href="/" className="hover:text-gray-900 transition-colors">Home</Link>
        <ChevronRight className="w-4 h-4 mx-2" />
        <span className="text-gray-900 font-medium">Tentang Kami</span>
      </nav>

      {/* Header */}
      <div className="border-b border-gray-200 pb-8 mb-8">
        <h1 className="text-3xl sm:text-4xl font-black font-heading text-gray-900 tracking-tight mb-4">
          Tentang <span className="text-gray-900">Naratif</span>
        </h1>
        <p className="text-lg text-gray-600 leading-relaxed">
          Portal berita dan informasi terfokus seputar perkembangan teknologi, pemrograman, kecerdasan buatan (AI), hardware, dan inovasi digital setiap hari.
        </p>
      </div>

      {/* Story */}
      <div className="prose prose-lg max-w-none text-gray-800 space-y-6 mb-12 leading-relaxed">
        <p>
          <strong>Naratif</strong> hadir sebagai respon terhadap derasnya arus informasi teknologi yang sering kali rumit dan dipenuhi sensasionalisme. Kami percaya bahwa pemahaman tentang teknologi masa depan harus mudah diakses, akurat, dan dapat dipahami oleh semua kalangan, mulai dari antusias gadget, pengembang perangkat lunak, hingga masyarakat umum.
        </p>
        <p>
          Didirikan dengan komitmen menyajikan jurnalisme teknologi yang beretika, tim redaksi Naratif memverifikasi setiap kabar, mengulas gawai secara objektif, serta menyajikan panduan teknologi yang aplikatif.
        </p>
      </div>

      {/* Visi & Misi Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        <div className="bg-gray-900 text-white p-6 rounded-2xl shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center mb-4">
            <Target className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold font-heading text-white mb-2">Visi Kami</h2>
          <p className="text-sm text-gray-300 leading-relaxed">
            Menjadi rujukan media teknologi independen nomor satu di Indonesia yang mengedukasi, menginspirasi, dan memberdayakan masyarakat di era transformasi digital.
          </p>
        </div>

        <div className="bg-gray-50 border border-gray-200/80 p-6 rounded-2xl">
          <div className="w-10 h-10 rounded-xl bg-gray-900 text-white flex items-center justify-center mb-4 shadow-sm">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold font-heading text-gray-900 mb-2">Misi Kami</h2>
          <ul className="text-sm text-gray-600 space-y-2 list-disc pl-4">
            <li>Menyajikan berita teknologi yang cepat, faktual, dan berimbang.</li>
            <li>Mengulas produk secara independen tanpa bias komersial.</li>
            <li>Menyederhanakan konsep teknologi mutakhir agar ramah semua usia.</li>
          </ul>
        </div>
      </div>

      {/* Nilai Utama */}
      <div>
        <h2 className="text-2xl font-bold font-heading text-gray-900 mb-6">Prinsip & Nilai Kami</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="border border-gray-200 p-5 rounded-xl hover:shadow-sm transition-shadow">
            <Zap className="w-6 h-6 text-gray-900 mb-2" />
            <h3 className="font-bold text-gray-900 mb-1">Cepat & Relevan</h3>
            <p className="text-xs text-gray-500">Kabar tren teknologi global dan lokal dikurasi secara aktual setiap hari.</p>
          </div>
          <div className="border border-gray-200 p-5 rounded-xl hover:shadow-sm transition-shadow">
            <ShieldCheck className="w-6 h-6 text-gray-900 mb-2" />
            <h3 className="font-bold text-gray-900 mb-1">Akurasi & Integritas</h3>
            <p className="text-xs text-gray-500">Fakta diverifikasi berlapis untuk menangkal misinformasi teknologi.</p>
          </div>
          <div className="border border-gray-200 p-5 rounded-xl hover:shadow-sm transition-shadow">
            <Users className="w-6 h-6 text-gray-900 mb-2" />
            <h3 className="font-bold text-gray-900 mb-1">Ramah Pembaca</h3>
            <p className="text-xs text-gray-500">Bahasa yang jernih, tata letak yang bersih, dan bebas dari klikbait.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
