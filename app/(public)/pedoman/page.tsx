import { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, BookOpen } from "lucide-react";

export const metadata: Metadata = {
  title: "Pedoman Pemberitaan Media Siber",
  description: "Pedoman pemberitaan media siber yang menjadi landasan etika dan standar jurnalisme Ada Fakta.",
  alternates: {
    canonical: '/pedoman',
  },
};

export default function PedomanPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Breadcrumb */}
      <nav className="flex text-sm text-gray-500 mb-6 items-center">
        <Link href="/" className="hover:text-gray-900 transition-colors">Home</Link>
        <ChevronRight className="w-4 h-4 mx-2" />
        <span className="text-gray-900 font-medium">Pedoman Media Siber</span>
      </nav>

      {/* Header */}
      <div className="border-b border-gray-200 pb-8 mb-8">
        <div className="flex items-center gap-2 text-gray-900 font-bold text-xs uppercase tracking-wider mb-2">
          <BookOpen className="w-4 h-4" />
          Standar Etika Jurnalistik
        </div>
        <h1 className="text-3xl sm:text-4xl font-black font-heading text-gray-900 tracking-tight mb-3">
          Pedoman Pemberitaan Media Siber
        </h1>
        <p className="text-gray-600 text-sm">
          Landasan operasional redaksi Ada Fakta sesuai dengan standar kemerdekaan pers dan etika jurnalistik digital.
        </p>
      </div>

      <div className="prose prose-lg max-w-none text-gray-800 space-y-6 text-sm sm:text-base leading-relaxed">
        <section className="space-y-3">
          <h2 className="text-xl font-bold font-heading text-gray-900">1. Ruang Lingkup</h2>
          <p>
            Media Siber adalah segala bentuk media yang menggunakan wahana internet dan melaksanakan kegiatan jurnalistik, serta memenuhi persyaratan Undang-Undang Pokok Pers dan Standar Perusahaan Pers. Pedoman ini berlaku bagi seluruh produk jurnalistik yang diterbitkan di situs web <strong>Ada Fakta</strong>.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold font-heading text-gray-900">2. Verifikasi dan Keberimbangan Berita</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>Setiap berita harus melalui proses verifikasi fakta dan konfirmasi kepada narasumber terkait.</li>
            <li>Berita yang berpotensi merugikan pihak lain harus memuat konfirmasi atau hak jawab dari pihak yang bersangkutan.</li>
            <li>Kutipan sumber luar, dokumen resmi, dan riset teknologi harus dicantumkan secara jelas dan dapat dipertanggungjawabkan.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold font-heading text-gray-900">3. Ralat, Koreksi, dan Hak Jawab</h2>
          <p>
            Redaksi Ada Fakta wajib melayani hak jawab dan hak koreksi yang diajukan oleh pembaca atau pihak yang merasa dirugikan oleh pemberitaan. Ralat dan koreksi akan ditautkan langsung pada artikel yang bersangkutan dengan keterangan pembaruan yang transparan.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold font-heading text-gray-900">4. Pencabutan Berita</h2>
          <p>
            Berita yang telah dipublikasikan tidak dapat dicabut kembali atas alasan sensor sepihak, kecuali terkait masalah SARA, kesusilaan anak, pertimbangan keselamatan masa depan korban, atau putusan hukum yang berkekuatan tetap.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold font-heading text-gray-900">5. Hak Cipta & Pengutipan</h2>
          <p>
            Seluruh konten artikel, analisis, dan visual Ada Fakta dilindungi oleh undang-undang hak cipta. Media lain diperkenankan mengutip konten Ada Fakta dengan kewajiban mencantumkan atribusi sumber yang jelas dan menyertakan tautan aktif (*dofollow link*) ke artikel asli Ada Fakta.
          </p>
        </section>
      </div>
    </div>
  );
}
