'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  PenSquare,
  Sparkles,
  Settings,
  ExternalLink,
  LogOut,
  Menu,
  X,
  Radio,
  ChevronRight,
  Link2,
  Timer,
  Coins,
  Image as ImageIcon,
  Users,
  Newspaper,
  Bot,
} from 'lucide-react';
import { logoutAdmin } from './auth-actions';
import VercelStatusBadge from './VercelStatusBadge';
import ImgbbMediaModal from './ImgbbMediaModal';

interface AdminLayoutClientProps {
  children: React.ReactNode;
}

export default function AdminLayoutClient({ children }: AdminLayoutClientProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mediaModalOpen, setMediaModalOpen] = useState(false);

  // Jika di halaman login, tampilkan layar penuh tanpa sidebar
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  const navItems = [
    {
      label: 'Dasbor Redaksi',
      href: '/admin',
      icon: LayoutDashboard,
      exact: true,
    },
    {
      label: 'Jurnalis AI',
      href: '/admin/jurnalis',
      icon: Newspaper,
      badge: 'Bot Intel',
    },
    {
      label: 'Tulis Berita',
      href: '/admin/tulis',
      icon: PenSquare,
    },
    {
      label: 'AI Studio',
      href: '/admin/generator',
      icon: Sparkles,
      badge: 'Pro AI',
    },
    {
      label: 'Sadur Berita URL',
      href: '/admin/sadur',
      icon: Link2,
      badge: 'Baru',
    },
    {
      label: 'Tim Penulis',
      href: '/admin/penulis',
      icon: Users,
      badge: 'Profil',
    },
    {
      label: 'Cron Job',
      href: '/admin/cron',
      icon: Timer,
      badge: 'Live',
    },
    {
      label: 'Manajemen Iklan',
      href: '/admin/iklan',
      icon: Coins,
      badge: 'Cuan',
    },
    {
      label: 'Media ImgBB',
      href: '#media-imgbb',
      icon: ImageIcon,
      badge: 'CDN',
      isModalTrigger: true,
    },
    {
      label: 'Pengaturan AI',
      href: '/admin/pengaturan',
      icon: Settings,
    },
  ];

  const isLinkActive = (item: (typeof navItems)[0]) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname.startsWith(item.href);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans text-gray-900">
      {/* Sidebar Desktop (Fixed Left) */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-gray-900 border-r border-gray-800 text-white z-30">
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-gray-800 shrink-0">
          <Link href="/admin" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-xs group-hover:bg-indigo-500 transition-colors">
              A
            </div>
            <div>
              <span className="font-bold text-base tracking-tight font-heading block leading-none">
                Ada Fakta Admin
              </span>
              <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1.5 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Redaksi Aktif
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 overflow-y-auto px-3.5 py-5 space-y-6">
          <div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 mb-2">
              Menu Utama
            </div>
            <nav className="space-y-1" suppressHydrationWarning>
              {navItems.map((item) => {
                const active = isLinkActive(item);
                const Icon = item.icon;
                if ((item as any).isModalTrigger) {
                  return (
                    <button
                      key={item.href}
                      type="button"
                      onClick={() => setMediaModalOpen(true)}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all group text-gray-300 hover:bg-gray-800/80 hover:text-white cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 text-indigo-400 group-hover:text-indigo-300 transition-transform group-hover:scale-110" />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-900/60 text-indigo-300 border border-indigo-700/50">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                }
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all group ${
                      active
                        ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                        : 'text-gray-300 hover:bg-gray-800/80 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                          active ? 'text-white' : 'text-gray-400 group-hover:text-indigo-400'
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                          active
                            ? 'bg-white/20 text-white'
                            : 'bg-indigo-900/60 text-indigo-300 border border-indigo-700/50'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="p-3.5 border-t border-gray-800 bg-gray-950/40 space-y-1 shrink-0">
          <a
            href="https://bottelejurnalis.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-3 py-2 rounded-xl text-xs text-purple-300 hover:bg-purple-950/40 hover:text-purple-200 transition-colors"
            title="Buka konsol eksternal Bot Jurnalis Telegram"
          >
            <div className="flex items-center gap-2.5">
              <Bot className="w-4 h-4 text-purple-400" />
              <span>Konsol Bot Jurnalis</span>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-purple-400/80" />
          </a>

          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-3 py-2 rounded-xl text-xs text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <ExternalLink className="w-4 h-4 text-gray-400" />
              <span>Lihat Web Publik</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
          </a>

          <form action={logoutAdmin}>
            <button
              type="submit"
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-rose-300 hover:bg-rose-950/40 hover:text-rose-200 transition-colors cursor-pointer text-left font-medium"
            >
              <LogOut className="w-4 h-4 text-rose-400" />
              <span>Logout Redaksi</span>
            </button>
          </form>
        </div>
      </aside>

      {/* Top Bar Mobile (Rapi, 1 Baris Sejajar & Tombol Seragam h-9) */}
      <header className="md:hidden bg-gray-900/95 backdrop-blur-md text-white px-3 sm:px-4 h-14 flex items-center justify-between border-b border-gray-800/90 sticky top-0 z-30">
        {/* Brand Logo & Name (Anti-Patah) */}
        <Link href="/admin" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center font-black text-white text-xs shadow-xs shrink-0">
            A
          </div>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-extrabold text-sm tracking-tight text-white whitespace-nowrap">
              Ada Fakta
            </span>
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
              ADMIN
            </span>
          </div>
        </Link>

        {/* Right Controls (Tinggi Seragam h-9, Rapi & Seimbang) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setMediaModalOpen(true)}
            className="w-9 h-9 rounded-xl bg-gray-800/90 hover:bg-gray-700 text-indigo-300 hover:text-white border border-gray-700/80 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label="Buka Media ImgBB"
            title="Media ImgBB"
          >
            <ImageIcon className="w-4 h-4" />
          </button>
          <VercelStatusBadge />
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="w-9 h-9 rounded-xl bg-gray-800/90 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700/80 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label="Buka Menu"
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Mobile Drawer (Slide Over) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />

          {/* Drawer Content */}
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-gray-900 border-r border-gray-800 text-white">
            <div className="h-16 flex items-center justify-between px-5 border-b border-gray-800">
              <span className="font-bold text-base font-heading">Menu Redaksi</span>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" suppressHydrationWarning>
              {navItems.map((item) => {
                const active = isLinkActive(item);
                const Icon = item.icon;
                if ((item as any).isModalTrigger) {
                  return (
                    <button
                      key={item.href}
                      type="button"
                      onClick={() => {
                        setMobileOpen(false);
                        setMediaModalOpen(true);
                      }}
                      className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all text-gray-300 hover:bg-gray-800 hover:text-white cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4 text-indigo-400" />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="text-[10px] bg-indigo-900 text-indigo-200 px-1.5 py-0.5 rounded">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                }
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      active
                        ? 'bg-indigo-600 text-white font-semibold'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] bg-indigo-900 text-indigo-200 px-1.5 py-0.5 rounded">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t border-gray-800 space-y-2">
              <a
                href="https://bottelejurnalis.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 text-xs text-purple-300 hover:text-purple-200 py-1.5"
              >
                <Bot className="w-4 h-4 text-purple-400" />
                <span>Konsol Bot Jurnalis ↗</span>
              </a>
              <a
                href="/"
                target="_blank"
                className="flex items-center gap-2.5 text-xs text-gray-400 hover:text-white py-1.5"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Lihat Web Publik</span>
              </a>
              <form action={logoutAdmin}>
                <button
                  type="submit"
                  className="flex items-center gap-2.5 text-xs text-rose-400 hover:text-rose-300 py-1.5 w-full text-left"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area (Offset for Desktop Sidebar) */}
      <div className="flex-1 md:pl-64 flex flex-col min-w-0">
        {/* Desktop Sticky Header Bar */}
        <header className="hidden md:flex h-16 items-center justify-between px-6 lg:px-8 border-b border-gray-200/80 bg-white/95 backdrop-blur-sm sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Portal Redaksi Ada Fakta
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMediaModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50/80 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300 transition-colors shadow-2xs cursor-pointer"
              title="Buka Pusat Media & Uploader ImgBB"
            >
              <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
              <span>Media ImgBB</span>
            </button>

            <VercelStatusBadge />

            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-2xs"
            >
              <ExternalLink className="w-3.5 h-3.5 text-gray-500" />
              <span>Kunjungi Web</span>
            </a>
          </div>
        </header>

        <main className="flex-1 p-2.5 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
        <footer className="py-4 text-center text-xs text-gray-500 border-t border-gray-200/80 bg-white/60">
          &copy; 2026 Ada Fakta. Panel Redaksi Terintegrasi AI.
        </footer>
      </div>

      {/* Global ImgBB Media Center Modal */}
      <ImgbbMediaModal isOpen={mediaModalOpen} onClose={() => setMediaModalOpen(false)} />
    </div>
  );
}
