import Link from "next/link";
import { Sparkles, Newspaper } from "lucide-react";
import { logoutAdmin } from "./auth-actions";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="bg-gray-900 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="font-bold text-xl font-heading tracking-wide hover:text-gray-200 transition-colors">
              Naratif Admin
            </Link>
            <nav className="hidden sm:flex items-center gap-1 text-sm font-medium">
              <Link
                href="/admin"
                className="px-3 py-1.5 rounded-lg hover:bg-gray-800 text-gray-300 hover:text-white transition-colors"
              >
                Dasbor Redaksi
              </Link>
              <Link
                href="/admin/generator"
                className="px-3 py-1.5 rounded-lg bg-indigo-600/30 text-indigo-300 hover:bg-indigo-600/40 hover:text-indigo-200 border border-indigo-500/30 transition-all flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>AI Studio</span>
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3 sm:gap-4 text-sm">
            <Link href="/admin/generator" className="sm:hidden text-xs px-2.5 py-1.5 rounded-lg bg-indigo-600/40 text-indigo-200 border border-indigo-500/30 flex items-center gap-1 font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
              <span>AI Studio</span>
            </Link>
            <a href="/" target="_blank" className="hover:text-gray-300 transition-colors">Lihat Web</a>
            <form action={logoutAdmin}>
              <button type="submit" className="text-gray-300 hover:text-white font-bold transition-colors">
                Logout
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8">
        {children}
      </main>
      <footer className="bg-white border-t border-gray-200 mt-auto py-6 text-center text-sm text-gray-500">
        &copy; 2026 Naratif. Dasbor Redaksi.
      </footer>
    </div>
  );
}
