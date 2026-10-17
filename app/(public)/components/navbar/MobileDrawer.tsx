'use client';

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  X,
  Search,
  MessageCircle,
  Layers,
  Laptop,
  Cpu,
  Sparkles,
  Radio,
  Smartphone,
  MapPin,
  ChevronRight,
  ShieldCheck,
  FileText,
  Users,
  Info,
  Mail,
} from "lucide-react";

interface CategoryItem {
  name: string;
  slug: string;
  href: string;
}

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CategoryItem[];
}

export default function MobileDrawer({ isOpen, onClose, categories }: MobileDrawerProps) {
  const pathname = usePathname();

  // Kunci scroll body saat drawer terbuka & listener escape key
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = "";
        window.removeEventListener("keydown", handleKeyDown);
      };
    } else {
      document.body.style.overflow = "";
    }
  }, [isOpen, onClose]);

  // Ikon pendukung per kategori
  const getCategoryIcon = (slug: string) => {
    switch (slug) {
      case "":
        return <Layers className="w-4 h-4 text-gray-500" />;
      case "software":
        return <Laptop className="w-4 h-4 text-blue-500" />;
      case "hardware":
        return <Cpu className="w-4 h-4 text-amber-500" />;
      case "ai":
        return <Sparkles className="w-4 h-4 text-purple-500" />;
      case "infrastruktur":
        return <Radio className="w-4 h-4 text-emerald-500" />;
      case "gadget":
        return <Smartphone className="w-4 h-4 text-rose-500" />;
      case "regional":
        return <MapPin className="w-4 h-4 text-indigo-500" />;
      default:
        return <Layers className="w-4 h-4 text-gray-500" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop Gelap dengan Blur */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
        aria-hidden="true"
      />

      {/* Kontainer Drawer Menu */}
      <aside className="fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-white shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-left duration-300">
        <div>
          {/* Header Drawer: Logo & Tombol Tutup */}
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
            <Link
              href="/"
              onClick={onClose}
              className="text-2xl font-black font-heading tracking-tighter"
            >
              <span className="text-gray-900">ada</span>
              <span className="text-gray-400">fakta</span>
            </Link>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-200 transition-colors"
              aria-label="Tutup menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Pencarian Cepat di Drawer */}
          <div className="p-4 border-b border-gray-100">
            <form action="/cari" method="GET" onSubmit={onClose}>
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  name="q"
                  placeholder="Cari berita atau fakta..."
                  className="w-full bg-gray-100/80 hover:bg-gray-100 focus:bg-white text-xs pl-9 pr-4 py-2 rounded-lg border border-transparent focus:border-red-500 focus:outline-none transition-all"
                />
              </div>
            </form>
          </div>

          {/* Kategori Berita Utama */}
          <div className="py-3 px-3">
            <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">
              Kategori Berita
            </div>
            <nav className="space-y-1">
              {categories.map((cat) => {
                const isActive =
                  cat.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(cat.href);

                return (
                  <Link
                    key={cat.name}
                    href={cat.href}
                    onClick={onClose}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                      isActive
                        ? "bg-red-50 text-red-600 font-bold"
                        : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      {getCategoryIcon(cat.slug)}
                      <span>{cat.name}</span>
                    </div>
                    <ChevronRight
                      className={`w-4 h-4 ${
                        isActive ? "text-red-500" : "text-gray-300"
                      }`}
                    />
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Banner Saluran WhatsApp Redaksi */}
          <div className="px-4 py-2">
            <a
              href="https://whatsapp.com/channel/0029VbDdM7DFSAszJWyjca01"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-3 p-3 bg-emerald-50 hover:bg-emerald-100/80 rounded-xl border border-emerald-100 transition-colors group"
            >
              <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center text-white shrink-0 shadow-xs">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs font-bold text-emerald-900">
                    Saluran WhatsApp
                  </span>
                  <span className="text-[10px] bg-emerald-600 text-white font-extrabold px-1.5 py-0.2 rounded-full">
                    Resmi
                  </span>
                </div>
                <p className="text-[11px] text-emerald-700 truncate">
                  Dapatkan update berita terverifikasi
                </p>
              </div>
            </a>
          </div>

          {/* Tautan Redaksi & Legal */}
          <div className="py-3 px-3 border-t border-gray-100 mt-2">
            <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">
              Informasi & Kebijakan
            </div>
            <div className="grid grid-cols-1 gap-1 text-xs text-gray-600 font-medium">
              <Link
                href="/tentang"
                onClick={onClose}
                className="flex items-center space-x-2.5 px-3 py-2 rounded-md hover:bg-gray-100 hover:text-gray-900 transition-colors"
              >
                <Info className="w-4 h-4 text-gray-400" />
                <span>Tentang Kami</span>
              </Link>
              <Link
                href="/redaksi"
                onClick={onClose}
                className="flex items-center space-x-2.5 px-3 py-2 rounded-md hover:bg-gray-100 hover:text-gray-900 transition-colors"
              >
                <Users className="w-4 h-4 text-gray-400" />
                <span>Susunan Redaksi</span>
              </Link>
              <Link
                href="/pedoman"
                onClick={onClose}
                className="flex items-center space-x-2.5 px-3 py-2 rounded-md hover:bg-gray-100 hover:text-gray-900 transition-colors"
              >
                <FileText className="w-4 h-4 text-gray-400" />
                <span>Pedoman Media Siber</span>
              </Link>
              <Link
                href="/privasi"
                onClick={onClose}
                className="flex items-center space-x-2.5 px-3 py-2 rounded-md hover:bg-gray-100 hover:text-gray-900 transition-colors"
              >
                <ShieldCheck className="w-4 h-4 text-gray-400" />
                <span>Kebijakan Privasi</span>
              </Link>
              <Link
                href="/kontak"
                onClick={onClose}
                className="flex items-center space-x-2.5 px-3 py-2 rounded-md hover:bg-gray-100 hover:text-gray-900 transition-colors"
              >
                <Mail className="w-4 h-4 text-gray-400" />
                <span>Hubungi Redaksi</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Footer Drawer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50 text-center">
          <p className="text-[11px] text-gray-400">
            &copy; 2026 Ada Fakta. All rights reserved.
          </p>
        </div>
      </aside>
    </div>
  );
}
