import Link from "next/link";
import { MessageCircle } from "lucide-react";
import CurrentDate from "./CurrentDate";

export default function TopUtilityBar() {
  return (
    <div className="hidden lg:block bg-gray-50/90 border-b border-gray-100 text-xs py-1.5 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Kiri: Tanggal WIB & Live Indicator */}
        <div className="flex items-center space-x-3">
          <CurrentDate />
          <span className="text-gray-300">|</span>
          <div className="flex items-center space-x-1.5 text-emerald-700 font-semibold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Live Update</span>
          </div>
        </div>

        {/* Kanan: Tautan Legal/Info & WhatsApp Saluran */}
        <div className="flex items-center space-x-5 text-gray-500 font-medium">
          <Link href="/tentang" className="hover:text-gray-900 transition-colors">
            Tentang
          </Link>
          <Link href="/redaksi" className="hover:text-gray-900 transition-colors">
            Redaksi
          </Link>
          <Link href="/pedoman" className="hover:text-gray-900 transition-colors">
            Pedoman
          </Link>
          <Link href="/kontak" className="hover:text-gray-900 transition-colors">
            Kontak
          </Link>
          <span className="text-gray-200">|</span>
          <a
            href="https://whatsapp.com/channel/0029VbDdM7DFSAszJWyjca01"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1.5 text-emerald-700 hover:text-emerald-800 font-semibold transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>Saluran WA Redaksi</span>
          </a>
        </div>
      </div>
    </div>
  );
}
