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
} from 'lucide-react';
import { logoutAdmin } from './auth-actions';

interface AdminLayoutClientProps {
  children: React.ReactNode;
}

export default function AdminLayoutClient({ children }: AdminLayoutClientProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

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
              N
            </div>
            <div>
              <span className="font-bold text-base tracking-tight font-heading block leading-none">
                Naratif Admin
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

      {/* Top Bar Mobile */}
      <header className="md:hidden bg-gray-900 text-white px-4 h-15 flex items-center justify-between border-b border-gray-800 sticky top-0 z-20">
        <Link href="/admin" className="flex items-center gap-2 font-bold text-base font-heading">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-xs">
            N
          </div>
          <span>Naratif Admin</span>
        </Link>

        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg bg-gray-800 text-gray-300 hover:text-white"
          aria-label="Buka Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
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
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
        <footer className="py-4 text-center text-xs text-gray-500 border-t border-gray-200/80 bg-white/60">
          &copy; 2026 Naratif Media. Panel Redaksi Terintegrasi AI.
        </footer>
      </div>
    </div>
  );
}
