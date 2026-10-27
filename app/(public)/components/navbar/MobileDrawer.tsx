'use client';

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop Gelap Tanpa Animasi / Blur Berat */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60"
        aria-hidden="true"
      />

      {/* Kontainer Drawer Menu Bersih & Monokrom Dewasa */}
      <aside className="fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-white shadow-xl flex flex-col justify-between overflow-y-auto">
        <div>
          {/* Header Drawer: Logo & Tombol Tutup */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <Link
              href="/"
              onClick={onClose}
              className="text-2xl font-black font-heading tracking-tighter"
            >
              <span className="text-black">ada</span>
              <span className="text-gray-400">fakta</span>
            </Link>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-gray-700 hover:text-black hover:bg-gray-100 cursor-pointer"
              aria-label="Tutup menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Pencarian Cepat (Tanpa Ikon & Tanpa Warna Mencolok) */}
          <div className="p-4 border-b border-gray-100">
            <form action="/cari" method="GET" onSubmit={onClose}>
              <input
                type="text"
                name="q"
                placeholder="Cari berita atau fakta..."
                className="w-full bg-gray-100 focus:bg-white text-xs px-3.5 py-2.5 rounded-lg border border-transparent focus:border-gray-900 focus:outline-none text-gray-900"
              />
            </form>
          </div>

          {/* Kategori Berita Utama (Monokrom, Bebas Ikon, Gaya Editorial) */}
          <div className="py-3 px-3">
            <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">
              Kategori Berita
            </div>
            <nav className="space-y-0.5">
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
                    className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive
                        ? "bg-gray-100 text-gray-950 font-bold"
                        : "text-gray-700 hover:bg-gray-50 hover:text-black font-medium"
                    }`}
                  >
                    {cat.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Kontak WhatsApp Redaksi */}
          <div className="px-4 py-2">
            <a
              href="https://wa.me/6283137412551"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-3.5 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-900">
                  Kontak WhatsApp
                </span>
                <span className="text-[10px] bg-gray-900 text-white font-semibold px-1.5 py-0.5 rounded">
                  0831-3741-2551
                </span>
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                Hubungi redaksi & konfirmasi siaran pers
              </p>
            </a>
          </div>

          {/* Tautan Redaksi & Legal (Teks Monokrom Bersih) */}
          <div className="py-3 px-3 border-t border-gray-100 mt-2">
            <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">
              Informasi & Kebijakan
            </div>
            <div className="grid grid-cols-1 gap-0.5 text-xs text-gray-600 font-medium">
              <Link
                href="/tentang"
                onClick={onClose}
                className="block px-3 py-2 rounded-md hover:bg-gray-100 hover:text-black transition-colors"
              >
                Tentang Kami
              </Link>
              <Link
                href="/redaksi"
                onClick={onClose}
                className="block px-3 py-2 rounded-md hover:bg-gray-100 hover:text-black transition-colors"
              >
                Susunan Redaksi
              </Link>
              <Link
                href="/pedoman"
                onClick={onClose}
                className="block px-3 py-2 rounded-md hover:bg-gray-100 hover:text-black transition-colors"
              >
                Pedoman Media Siber
              </Link>
              <Link
                href="/privasi"
                onClick={onClose}
                className="block px-3 py-2 rounded-md hover:bg-gray-100 hover:text-black transition-colors"
              >
                Kebijakan Privasi
              </Link>
              <Link
                href="/kontak"
                onClick={onClose}
                className="block px-3 py-2 rounded-md hover:bg-gray-100 hover:text-black transition-colors"
              >
                Hubungi Redaksi
              </Link>
            </div>
          </div>
        </div>

        {/* Footer Drawer */}
        <div className="p-4 border-t border-gray-100 text-center">
          <p className="text-[11px] text-gray-400">
            &copy; 2026 Ada Fakta. All rights reserved.
          </p>
        </div>
      </aside>
    </div>
  );
}
