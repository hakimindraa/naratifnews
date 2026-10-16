import { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Kebijakan Privasi",
  description: "Kebijakan privasi Ada Fakta mengenai pengumpulan, penggunaan, dan perlindungan data pengunjung situs.",
};

export default function PrivasiPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Breadcrumb */}
      <nav className="flex text-sm text-gray-500 mb-6 items-center">
        <Link href="/" className="hover:text-gray-900 transition-colors">Home</Link>
        <ChevronRight className="w-4 h-4 mx-2" />
        <span className="text-gray-900 font-medium">Kebijakan Privasi</span>
      </nav>

      {/* Header */}
      <div className="border-b border-gray-200 pb-8 mb-8">
        <div className="flex items-center gap-2 text-gray-900 font-bold text-xs uppercase tracking-wider mb-2">
          <ShieldCheck className="w-4 h-4" />
          Perlindungan Data & Privasi
        </div>
        <h1 className="text-3xl sm:text-4xl font-black font-heading text-gray-900 tracking-tight mb-3">
          Kebijakan Privasi
        </h1>
        <p className="text-gray-600 text-sm">
          Terakhir diperbarui: Oktober 2026 • Berlaku untuk seluruh pengunjung situs https://www.adafakta.web.id
        </p>
      </div>

      <div className="prose prose-lg max-w-none text-gray-800 space-y-6 text-sm sm:text-base leading-relaxed">
        <section className="space-y-3">
          <h2 className="text-xl font-bold font-heading text-gray-900">1. Pendahuluan</h2>
          <p>
            Privasi pengunjung situs <strong>Ada Fakta</strong> (selanjutnya disebut "kami") adalah prioritas utama kami. Dokumen Kebijakan Privasi ini menjelaskan jenis informasi pribadi yang dikumpulkan dan dicatat oleh situs kami serta bagaimana informasi tersebut digunakan.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold font-heading text-gray-900">2. Log Files (Berkas Catatan)</h2>
          <p>
            Seperti kebanyakan situs web standar, Ada Fakta menggunakan berkas log. Berkas-berkas ini mencatat pengunjung saat mereka mengunjungi situs web. Informasi yang dikumpulkan dalam berkas log mencakup alamat Protokol Internet (IP), jenis browser, Penyedia Layanan Internet (ISP), stempel tanggal/waktu, halaman rujukan/keluar, dan kemungkinan jumlah klik. Informasi ini tidak dikaitkan dengan informasi apa pun yang dapat diidentifikasi secara pribadi dan digunakan semata-mata untuk menganalisis tren, mengelola situs, serta mengumpulkan data demografis umum.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold font-heading text-gray-900">3. Cookie dan Web Beacon</h2>
          <p>
            Ada Fakta menggunakan "cookie" untuk menyimpan informasi tentang preferensi pengunjung dan halaman-halaman di situs web yang diakses atau dikunjungi. Informasi ini digunakan untuk mengoptimalkan pengalaman pengguna dengan menyesuaikan konten halaman web kami berdasarkan jenis browser pengunjung atau informasi lainnya.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold font-heading text-gray-900">4. Cookie Mitra Iklan (Google AdSense)</h2>
          <p>
            Google adalah salah satu vendor pihak ketiga di situs kami. Google juga menggunakan cookie, yang dikenal sebagai cookie DART, untuk menayangkan iklan kepada pengunjung situs kami berdasarkan kunjungan mereka ke situs kami dan situs lain di internet. Pengunjung dapat memilih untuk menolak penggunaan cookie DART dengan mengunjungi Kebijakan Privasi jaringan iklan dan konten Google di URL berikut: <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer" className="text-gray-900 underline hover:text-gray-600">https://policies.google.com/technologies/ads</a>.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold font-heading text-gray-900">5. Keamanan Data</h2>
          <p>
            Kami mengambil langkah-langkah keamanan yang wajar secara teknis dan organisasi untuk melindungi data pengunjung dari akses yang tidak sah, pengubahan, pengungkapan, atau perusakan.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold font-heading text-gray-900">6. Persetujuan</h2>
          <p>
            Dengan menggunakan situs web kami, Anda dengan ini menyetujui Kebijakan Privasi kami dan menyetujui syarat-syaratnya.
          </p>
        </section>
      </div>
    </div>
  );
}
