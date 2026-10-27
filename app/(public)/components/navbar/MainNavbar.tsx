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
    <div className="w-full bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ================= DESKTOP & TABLET VIEW ================= */}
        <div className="hidden lg:flex items-center justify-between h-14">
          {/* Sisi Kiri: Menu Drawer Button + Brand Logo adafakta */}
          <div className="flex items-center space-x-4 shrink-0">
            <button
              onClick={onOpenDrawer}
              className="p-1.5 -ml-1 text-gray-800 hover:text-black hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
              aria-label="Buka navigasi penuh"
              title="Menu Lengkap"
            >
              <Menu className="w-5 h-5" />
            </button>

            <Link
              href="/"
              className="text-2xl font-black font-heading tracking-tighter group flex items-center select-none"
            >
              <span className="text-black">ada</span>
              <span className="text-gray-400 group-hover:text-black transition-colors">fakta</span>
            </Link>
          </div>

          {/* Tengah: Navigasi Kategori dengan Tipografi Tegas ala CNN */}
          <nav className="flex items-center space-x-5 xl:space-x-7">
            {categories.slice(0, 8).map((cat) => {
              const isActive =
                cat.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(cat.href);

              return (
                <Link
                  key={cat.name}
                  href={cat.href}
                  className={`text-[13px] tracking-tight font-heading transition-colors pb-0.5 border-b-2 ${
                    isActive
                      ? "text-black font-bold border-black"
                      : "text-gray-800 hover:text-black font-medium border-transparent"
                  }`}
                >
                  {cat.name}
                </Link>
              );
            })}
            {categories.length > 8 && (
              <button
                onClick={onOpenDrawer}
                className="text-[13px] font-semibold font-heading text-gray-500 hover:text-black transition-colors cursor-pointer"
              >
                Lainnya ▾
              </button>
            )}
          </nav>

          {/* Sisi Kanan: Search & Kontak WhatsApp */}
          <div className="flex items-center space-x-3.5 shrink-0">
            <Link
              href="/cari"
              className="flex items-center space-x-1.5 text-gray-700 hover:text-black text-xs font-semibold px-2.5 py-1.5 rounded-md hover:bg-gray-100 transition-colors"
              aria-label="Pencarian berita"
            >
              <Search className="w-4 h-4 text-gray-600" />
              <span>Cari</span>
            </Link>

            <a
              href="https://wa.me/6283137412551"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1.5 bg-black hover:bg-gray-800 text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-colors shrink-0"
              title="Hubungi WhatsApp Redaksi: 083137412551"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Kontak WA</span>
            </a>
          </div>
        </div>

        {/* ================= MOBILE VIEW (lg:hidden) ================= */}
        <div className="flex lg:hidden items-center justify-between h-14">
          <button
            onClick={onOpenDrawer}
            className="p-2 -ml-2 text-gray-800 hover:text-black rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Buka menu navigasi"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex-1 flex justify-center">
            <Link
              href="/"
              className="text-2xl font-black font-heading tracking-tighter"
            >
              <span className="text-black">ada</span>
              <span className="text-gray-400">fakta</span>
            </Link>
          </div>

          <div className="flex items-center space-x-1">
            <Link
              href="/cari"
              className="p-2 text-gray-700 hover:text-black rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Cari artikel"
            >
              <Search className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
