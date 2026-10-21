'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search, MessageCircle } from "lucide-react";

interface CategoryItem {
  name: string;
  slug: string;
  href: string;
}

interface MainNavbarProps {
  categories: CategoryItem[];
  onOpenDrawer: () => void;
}

export default function MainNavbar({ categories, onOpenDrawer }: MainNavbarProps) {
  const pathname = usePathname();

  return (
    <div className="w-full bg-white/95 backdrop-blur-md border-b border-gray-100 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ================= DESKTOP VIEW (lg:flex) ================= */}
        <div className="hidden lg:flex items-center justify-between h-16">
          {/* Logo Brand */}
          <div className="shrink-0 mr-6">
            <Link
              href="/"
              className="text-2xl lg:text-3xl font-black font-heading tracking-tighter group flex items-center"
            >
              <span className="text-gray-900 group-hover:text-black transition-colors">ada</span>
              <span className="text-gray-400 group-hover:text-red-600 transition-colors">fakta</span>
            </Link>
          </div>

          {/* Navigasi Kategori Tengah dengan Indikator Aktif */}
          <nav className="flex items-center space-x-6 xl:space-x-8">
            {categories.map((cat) => {
              const isActive =
                cat.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(cat.href);

              return (
                <Link
                  key={cat.name}
                  href={cat.href}
                  className={`text-sm tracking-tight transition-all pb-1 border-b-2 ${isActive
                      ? "text-red-600 font-bold border-red-600"
                      : "text-gray-700 hover:text-red-600 font-semibold border-transparent"
                    }`}
                >
                  {cat.name}
                </Link>
              );
            })}
          </nav>

          {/* Area Kanan: Pencarian & Tombol Saluran WhatsApp */}
          <div className="flex items-center space-x-3 shrink-0 ml-4">
            <Link
              href="/cari"
              className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200/80 text-gray-600 hover:text-gray-900 text-xs font-semibold px-3.5 py-1.5 rounded-full transition-colors"
              aria-label="Pencarian berita"
            >
              <Search className="w-3.5 h-3.5 text-gray-500" />
              <span>Cari...</span>
            </Link>

            <a
              href="https://whatsapp.com/channel/0029VbDdM7DFSAszJWyjca01"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-full shadow-xs transition-colors shrink-0"
              title="Gabung Saluran WhatsApp Resmi Ada Fakta"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Saluran Redaksi</span>
            </a>
          </div>
        </div>

        {/* ================= MOBILE VIEW (lg:hidden) ================= */}
        <div className="flex lg:hidden items-center justify-between h-14">
          {/* Tombol Hamburger Menu */}
          <button
            onClick={onOpenDrawer}
            className="p-2 -ml-2 text-gray-700 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Buka menu navigasi"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Logo Tengah */}
          <div className="flex-1 flex justify-center">
            <Link
              href="/"
              className="text-2xl font-black font-heading tracking-tighter"
            >
              <span className="text-gray-900">ada</span>
              <span className="text-gray-400">fakta</span>
            </Link>
          </div>

          {/* Tombol Cari */}
          <Link
            href="/cari"
            className="p-2 -mr-2 text-gray-700 hover:text-gray-900 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Cari artikel"
          >
            <Search className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
