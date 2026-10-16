import { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Mail, MessageSquare, MapPin, Globe } from "lucide-react";

export const metadata: Metadata = {
  title: "Kontak Kami",
  description: "Hubungi redaksi Ada Fakta untuk siaran pers, kemitraan media, maupun pertanyaan seputar berita.",
};

export default function KontakPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Breadcrumb */}
      <nav className="flex text-sm text-gray-500 mb-6 items-center">
        <Link href="/" className="hover:text-gray-900 transition-colors">Home</Link>
        <ChevronRight className="w-4 h-4 mx-2" />
        <span className="text-gray-900 font-medium">Kontak Kami</span>
      </nav>

      {/* Header */}
      <div className="border-b border-gray-200 pb-8 mb-8">
        <h1 className="text-3xl sm:text-4xl font-black font-heading text-gray-900 tracking-tight mb-3">
          Kontak <span className="text-gray-900">Ada Fakta</span>
        </h1>
        <p className="text-gray-600">
          Kami terbuka untuk saran, kerja sama media, serta pengiriman siaran pers dan rilis produk.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        {/* Kolom Info Kontak */}
        <div className="space-y-6">
          <div className="flex items-start gap-4 p-5 rounded-2xl bg-gray-50 border border-gray-200/80">
            <div className="w-10 h-10 rounded-xl bg-gray-900 text-white flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-base">Surel Redaksi</h2>
              <p className="text-xs text-gray-500 mb-2">Kirim siaran pers, klarifikasi, atau hak jawab:</p>
              <a href="mailto:redaksi@adafakta.web.id" className="text-gray-900 hover:underline font-semibold text-sm">
                redaksi@adafakta.web.id
              </a>
            </div>
          </div>

          <div className="flex items-start gap-4 p-5 rounded-2xl bg-gray-50 border border-gray-200/80">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-base">Saluran Komunitas</h2>
              <p className="text-xs text-gray-500 mb-2">Ikuti kanal resmi WhatsApp kami:</p>
              <a 
                href="https://whatsapp.com/channel/0029VbDdM7DFSAszJWyjca01" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-emerald-700 hover:underline font-semibold text-sm"
              >
                Saluran WhatsApp Ada Fakta ↗
              </a>
            </div>
          </div>

          <div className="flex items-start gap-4 p-5 rounded-2xl bg-gray-50 border border-gray-200/80">
            <div className="w-10 h-10 rounded-xl bg-gray-900 text-white flex items-center justify-center shrink-0">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-base">Domain Resmi</h2>
              <p className="text-xs text-gray-500 mb-2">Website portal berita:</p>
              <span className="text-gray-900 font-semibold text-sm">https://www.adafakta.web.id</span>
            </div>
          </div>
        </div>

        {/* Kolom Informasi Layanan */}
        <div className="bg-gray-100 p-6 rounded-2xl border border-gray-200 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold font-heading text-gray-900 mb-3">Ketentuan Siaran Pers</h2>
            <ul className="text-sm text-gray-600 space-y-3 leading-relaxed list-disc pl-4">
              <li>Materi rilis harus berkaitan dengan bidang teknologi, gadget, sains, atau transformasi digital.</li>
              <li>Lampirkan narasi berita, gambar pendukung beresolusi tinggi, serta kontak narasumber untuk verifikasi.</li>
              <li>Redaksi Ada Fakta berhak menyunting materi sesuai dengan kaidah tata bahasa dan kode etik jurnalistik kami tanpa mengubah substansi fakta.</li>
            </ul>
          </div>
          <div className="mt-6 pt-4 border-t border-gray-200 text-xs text-gray-500">
            Semua pertanyaan dan korespondensi akan direspons dalam waktu 1×24 jam pada hari kerja.
          </div>
        </div>
      </div>
    </div>
  );
}
