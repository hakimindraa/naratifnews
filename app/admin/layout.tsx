import { logoutAdmin } from "./auth-actions";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="bg-blue-900 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="font-bold text-xl font-heading tracking-wide">
            Naratif Admin
          </div>
          <div className="flex items-center gap-4 text-sm">
            <a href="/" target="_blank" className="hover:text-blue-200 transition-colors">Lihat Web</a>
            <form action={logoutAdmin}>
              <button type="submit" className="text-blue-200 hover:text-white font-bold transition-colors">
                Logout
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      <footer className="bg-white border-t border-gray-200 mt-auto py-6 text-center text-sm text-gray-500">
        &copy; 2026 Naratif. Dasbor Redaksi.
      </footer>
    </div>
  );
}
