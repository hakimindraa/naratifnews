import { Metadata } from "next";
import Link from "next/link";
import {
  ChevronRight,
  Mail,
  MessageSquare,
  Globe,
  ShieldCheck,
  FileText,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  Users,
  BookOpen,
} from "lucide-react";
import { ContactCopyButton } from "./ContactCopyButton";

export const metadata: Metadata = {
  title: "Kontak Redaksi & Kemitraan Media",
  description:
    "Hubungi redaksi Ada Fakta untuk kirim siaran pers, kemitraan media, konfirmasi cepat via WhatsApp, atau pengajuan hak jawab.",
  alternates: {
    canonical: "/kontak",
  },
};

export default function KontakPage() {
  const EMAIL_REDAKSI = "hakimindralesmana@gmail.com";
  const PHONE_WA = "083137412551";
  const FORMATTED_PHONE = "+62 831-3741-2551";
  const WA_CHAT_LINK = `https://wa.me/6283137412551?text=${encodeURIComponent(
    "Halo Redaksi Ada Fakta, saya ingin berkorespondensi mengenai siaran pers / kemitraan / informasi berita:"
  )}`;
  const WA_CHANNEL_LINK =
    "https://whatsapp.com/channel/0029VbDdM7DFSAszJWyjca01";

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex text-sm text-gray-500 mb-6 items-center">
        <Link href="/" className="hover:text-gray-900 transition-colors">
          Home
        </Link>
        <ChevronRight className="w-4 h-4 mx-2 text-gray-400" />
        <span className="text-gray-900 font-medium">Kontak Kami</span>
      </nav>

      {/* Header Utama */}
      <header className="border-b border-gray-200 pb-8 mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-semibold mb-4">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>Layanan Redaksi Aktif • Respon Rata-rata 1×24 Jam Kerja</span>
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black font-heading text-gray-900 tracking-tight mb-3">
          Kontak Redaksi & Kemitraan{" "}
          <span className="text-emerald-700">Ada Fakta</span>
        </h1>
        <p className="text-gray-600 text-base sm:text-lg max-w-3xl leading-relaxed">
          Kami terbuka untuk saran, kemitraan media, rilis produk teknologi,
          pengiriman siaran pers, serta hak koreksi dan klarifikasi berita.
        </p>
      </header>

      {/* Grid Kontak Utama (2 Kartu Prioritas) */}
      <section aria-labelledby="kontak-prioritas-heading" className="mb-8">
        <h2 id="kontak-prioritas-heading" className="sr-only">
          Narahubung Utama Redaksi
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Kartu 1: WhatsApp Redaksi Langsung */}
          <div className="relative overflow-hidden p-6 sm:p-7 rounded-2xl bg-linear-to-br from-emerald-50/70 via-white to-emerald-50/30 border border-emerald-200/80 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <Sparkles className="w-3 h-3" />
                  Chat Langsung
                </span>
              </div>

              <h3 className="font-heading font-black text-xl text-gray-900 mb-1">
                WhatsApp Redaksi & Kemitraan
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 mb-5 leading-relaxed">
                Saluran komunikasi dua arah untuk konfirmasi cepat siaran pers,
                undangan peliputan, kemitraan bisnis/iklan, atau konfirmasi berita.
              </p>

              <div className="bg-white/80 backdrop-blur-xs p-3.5 rounded-xl border border-emerald-200/60 mb-5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 block mb-0.5">
                  Nomor Telepon & WhatsApp:
                </span>
                <span className="font-mono font-bold text-lg text-gray-900 tracking-tight">
                  {FORMATTED_PHONE}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-emerald-100">
              <a
                href={WA_CHAT_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-xs active:scale-95"
              >
                <span>Chat WhatsApp</span>
                <ExternalLink className="w-4 h-4" />
              </a>
              <ContactCopyButton textToCopy={PHONE_WA} label="Salin Nomor" />
            </div>
          </div>

          {/* Kartu 2: Email Redaksi */}
          <div className="relative overflow-hidden p-6 sm:p-7 rounded-2xl bg-linear-to-br from-gray-50 via-white to-gray-100/50 border border-gray-200/90 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gray-900 text-white flex items-center justify-center shadow-xs">
                  <Mail className="w-6 h-6" />
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-800 border border-gray-200">
                  <Clock className="w-3 h-3" />
                  Korespondensi Resmi
                </span>
              </div>

              <h3 className="font-heading font-black text-xl text-gray-900 mb-1">
                Surel Redaksi & Korespondensi
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 mb-5 leading-relaxed">
                Kirim naskah siaran pers lengkap, lampiran foto resolusi tinggi,
                proposal kemitraan media, serta pengajuan hak jawab resmi.
              </p>

              <div className="bg-white/80 backdrop-blur-xs p-3.5 rounded-xl border border-gray-200 mb-5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 block mb-0.5">
                  Alamat Surel / Email:
                </span>
                <span className="font-mono font-bold text-base sm:text-lg text-gray-900 break-all">
                  {EMAIL_REDAKSI}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-gray-100">
              <a
                href={`mailto:${EMAIL_REDAKSI}?subject=${encodeURIComponent(
                  "[Siaran Pers / Kemitraan] Ada Fakta"
                )}`}
                className="inline-flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-xs active:scale-95"
              >
                <Mail className="w-4 h-4" />
                <span>Kirim Email</span>
              </a>
              <ContactCopyButton textToCopy={EMAIL_REDAKSI} label="Salin Email" />
            </div>
          </div>
        </div>
      </section>

      {/* Grid Kontak Sekunder (Saluran Komunitas & Info Redaksi) */}
      <section aria-labelledby="kanal-pendukung-heading" className="mb-12">
        <h2 id="kanal-pendukung-heading" className="sr-only">
          Kanal Pendukung & Legalitas Media
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Saluran WhatsApp */}
          <div className="flex items-start gap-4 p-5 rounded-2xl bg-white border border-gray-200/80 shadow-2xs">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 text-sm">Saluran WhatsApp Resmi</h3>
              <p className="text-xs text-gray-500 mt-0.5 mb-2.5">
                Ikuti kanal siaran Ada Fakta untuk mendapatkan kurasi kabar teknologi dan sains harian:
              </p>
              <a
                href={WA_CHANNEL_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
              >
                <span>Buka Saluran WhatsApp Ada Fakta</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Domain & Transparansi Media */}
          <div className="flex items-start gap-4 p-5 rounded-2xl bg-white border border-gray-200/80 shadow-2xs">
            <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-800 flex items-center justify-center shrink-0">
              <Globe className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 text-sm">Portal & Dewan Redaksi</h3>
              <p className="text-xs text-gray-500 mt-0.5 mb-2.5">
                Portal berita siber independen di bawah pengelolaan Ada Fakta:
              </p>
              <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-gray-700">
                <Link
                  href="/redaksi"
                  className="inline-flex items-center gap-1 hover:text-gray-950 hover:underline"
                >
                  <Users className="w-3.5 h-3.5 text-gray-500" />
                  <span>Susunan Redaksi</span>
                </Link>
                <span className="text-gray-300">•</span>
                <Link
                  href="/pedoman"
                  className="inline-flex items-center gap-1 hover:text-gray-950 hover:underline"
                >
                  <BookOpen className="w-3.5 h-3.5 text-gray-500" />
                  <span>Pedoman Media Siber</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Ketentuan Siaran Pers & Jalur Hak Jawab (Split Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        {/* Kolom Kiri: Panduan Siaran Pers */}
        <div className="bg-gray-50 p-6 sm:p-7 rounded-2xl border border-gray-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gray-900 text-white flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold font-heading text-gray-900">
                Ketentuan Pengiriman Siaran Pers
              </h2>
            </div>
            <p className="text-xs text-gray-500 mb-5">
              Mohon perhatikan panduan berikut agar materi rilis Anda dapat diverifikasi dan diproses cepat oleh tim editor:
            </p>

            <ul className="text-xs sm:text-sm text-gray-700 space-y-3.5 leading-relaxed">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Relevansi Bidang:</strong> Materi rilis harus berkaitan dengan bidang teknologi, gadget, kecerdasan buatan (AI), sains, software, startup, atau transformasi digital.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Kelengkapan Materi:</strong> Lampirkan naskah berita format narasi (5W+1H), foto/gambar pendukung beresolusi tinggi (min. 1200px lebar), serta kontak narasumber resmi untuk keperluan verifikasi.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Independensi Editorial:</strong> Redaksi Ada Fakta berhak menyunting judul dan naskah sesuai dengan kaidah tata bahasa (EYD) dan kode etik jurnalistik tanpa mengubah substansi fakta.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Bebas Biaya:</strong> Publikasi siaran pers untuk kepentingan pemberitaan publik dan jurnalistik tidak dipungut biaya apa pun.
                </span>
              </li>
            </ul>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200 text-xs text-gray-500 flex items-center justify-between">
            <span>Ditinjau oleh Tim Editor Ada Fakta</span>
            <span className="font-semibold text-gray-700">Waktu proses: 1×24 jam</span>
          </div>
        </div>

        {/* Kolom Kanan: Hak Jawab, Klarifikasi & Koreksi */}
        <div className="bg-amber-50/50 p-6 sm:p-7 rounded-2xl border border-amber-200/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold font-heading text-gray-900">
                Hak Jawab & Koreksi Berita
              </h2>
            </div>
            <p className="text-xs text-amber-900/80 mb-5 leading-relaxed">
              Sesuai dengan amanat <strong>UU No. 40 Tahun 1999 tentang Pers</strong> serta <strong>Pedoman Pemberitaan Media Siber Dewan Pers</strong>, Ada Fakta menjamin hak masyarakat untuk mendapatkan informasi yang akurat dan berimbang.
            </p>

            <div className="space-y-3.5 text-xs sm:text-sm text-gray-700">
              <div className="bg-white/80 p-4 rounded-xl border border-amber-200/60">
                <h4 className="font-bold text-gray-900 mb-1">Alur Pengajuan Koreksi:</h4>
                <ol className="list-decimal pl-4 space-y-1.5 text-xs text-gray-600">
                  <li>Sertakan tautan (URL) artikel yang dipersoalkan.</li>
                  <li>Jelaskan secara spesifik kalimat atau fakta yang dinilai tidak akurat.</li>
                  <li>Lampirkan bukti atau data pembanding resmi yang sah.</li>
                  <li>Kirim via email dengan subjek: <code className="bg-amber-100 text-amber-900 px-1 py-0.5 rounded font-mono text-[11px]">[HAK JAWAB] - Judul Berita</code>.</li>
                </ol>
              </div>

              <p className="text-xs text-gray-600 leading-relaxed">
                Redaksi akan segera memverifikasi laporan Anda dan menerbitkan ralat, koreksi, atau hak jawab secara proporsional dan transparan pada artikel yang bersangkutan.
              </p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-amber-200/70">
            <Link
              href="/pedoman"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-900 hover:text-amber-950 hover:underline"
            >
              <span>Pelajari Standar Pedoman Media Siber Ada Fakta</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Bagian Pertanyaan Umum (FAQ) */}
      <section aria-labelledby="faq-kontak-heading" className="border-t border-gray-200 pt-10">
        <div className="text-center max-w-xl mx-auto mb-8">
          <h2 id="faq-kontak-heading" className="text-2xl font-black font-heading text-gray-900">
            Pertanyaan yang Sering Diajukan (FAQ)
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            Informasi cepat seputar alur kerja sama, pengiriman rilis, dan korespondensi.
          </p>
        </div>

        <div className="space-y-3 max-w-3xl mx-auto">
          <details className="group border border-gray-200 rounded-xl bg-white p-4 open:bg-gray-50/70 transition-colors">
            <summary className="flex items-center justify-between cursor-pointer list-none font-bold text-sm text-gray-900 select-none">
              <span>Berapa lama waktu yang dibutuhkan hingga siaran pers tayang?</span>
              <ChevronRight className="w-4 h-4 text-gray-400 group-open:rotate-90 transition-transform duration-200 shrink-0 ml-2" />
            </summary>
            <p className="text-xs sm:text-sm text-gray-600 mt-3 pt-3 border-t border-gray-100 leading-relaxed">
              Tim redaksi meninjau rilis masuk setiap hari kerja. Materi yang memenuhi kriteria kelayakan berita dan kelengkapan dokumen umumnya diproses dan terbit dalam waktu 1×24 jam.
            </p>
          </details>

          <details className="group border border-gray-200 rounded-xl bg-white p-4 open:bg-gray-50/70 transition-colors">
            <summary className="flex items-center justify-between cursor-pointer list-none font-bold text-sm text-gray-900 select-none">
              <span>Apakah ada biaya untuk penayangan rilis berita di Ada Fakta?</span>
              <ChevronRight className="w-4 h-4 text-gray-400 group-open:rotate-90 transition-transform duration-200 shrink-0 ml-2" />
            </summary>
            <p className="text-xs sm:text-sm text-gray-600 mt-3 pt-3 border-t border-gray-100 leading-relaxed">
              Penerbitan siaran pers untuk kepentingan jurnalisme dan informasi publik sepenuhnya <strong>gratis</strong>. Namun, untuk konten promosi murni seperti advertorial berbayar, ulasan produk komersial bersponsor, atau penempatan banner iklan, silakan hubungi kontak kemitraan bisnis kami melalui WhatsApp.
            </p>
          </details>

          <details className="group border border-gray-200 rounded-xl bg-white p-4 open:bg-gray-50/70 transition-colors">
            <summary className="flex items-center justify-between cursor-pointer list-none font-bold text-sm text-gray-900 select-none">
              <span>Format dokumen apa yang direkomendasikan untuk naskah siaran pers?</span>
              <ChevronRight className="w-4 h-4 text-gray-400 group-open:rotate-90 transition-transform duration-200 shrink-0 ml-2" />
            </summary>
            <p className="text-xs sm:text-sm text-gray-600 mt-3 pt-3 border-t border-gray-100 leading-relaxed">
              Kami sangat menyarankan naskah dalam format teks Microsoft Word (.docx), tautan Google Docs dengan akses publik, atau teks langsung pada badan email, serta foto pendukung berkualitas tinggi (JPEG, PNG, atau WebP). Harap hindari mengirimkan naskah dalam bentuk scan gambar PDF yang tidak dapat disalin.
            </p>
          </details>

          <details className="group border border-gray-200 rounded-xl bg-white p-4 open:bg-gray-50/70 transition-colors">
            <summary className="flex items-center justify-between cursor-pointer list-none font-bold text-sm text-gray-900 select-none">
              <span>Bagaimana jika naskah siaran pers memiliki embargo waktu?</span>
              <ChevronRight className="w-4 h-4 text-gray-400 group-open:rotate-90 transition-transform duration-200 shrink-0 ml-2" />
            </summary>
            <p className="text-xs sm:text-sm text-gray-600 mt-3 pt-3 border-t border-gray-100 leading-relaxed">
              Pastikan mencantumkan tanggal dan jam embargo secara jelas pada subjek surel dan baris pertama naskah berita (contoh: <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-800">[EMBARGO HINGGA 28 OKTOBER 2026, 10.00 WIB]</code>). Redaksi kami menghormati batas waktu embargo yang telah disepakati.
            </p>
          </details>
        </div>
      </section>
    </div>
  );
}
