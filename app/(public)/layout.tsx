export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex-shrink-0">
            <a href="/" className="text-2xl font-bold font-heading text-blue-700 tracking-tight">Naratif</a>
          </div>
          <nav className="hidden md:flex space-x-6 overflow-x-auto">
            {['Terbaru', 'Nasional', 'Ekonomi', 'Teknologi', 'Olahraga', 'Hiburan', 'Gaya Hidup'].map((cat) => (
              <a key={cat} href={`/${cat.toLowerCase().replace(' ', '-')}`} className="text-sm uppercase tracking-wider text-gray-600 hover:text-blue-700 font-bold whitespace-nowrap transition-colors">
                {cat}
              </a>
            ))}
          </nav>
          <div>
            <a href="/cari" className="text-gray-500 hover:text-blue-700 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </a>
          </div>
        </div>
        {/* Mobile Nav */}
        <div className="md:hidden border-t border-gray-100 bg-gray-50 px-4 py-3 flex space-x-4 overflow-x-auto scrollbar-hide">
            {['Terbaru', 'Nasional', 'Ekonomi', 'Teknologi', 'Olahraga', 'Hiburan', 'Gaya Hidup'].map((cat) => (
              <a key={cat} href={`/${cat.toLowerCase().replace(' ', '-')}`} className="text-xs uppercase tracking-wider text-gray-700 hover:text-blue-700 font-bold whitespace-nowrap">
                {cat}
              </a>
            ))}
        </div>
      </header>

      {children}

      <footer className="bg-gray-900 text-white mt-12 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center">
          <div className="mb-6 md:mb-0 text-center md:text-left">
            <a href="/" className="text-3xl font-bold font-heading text-white tracking-tight">Naratif</a>
            <p className="text-gray-400 mt-2 text-sm max-w-sm">Portal berita bersih, minimalis, dan terpercaya. Memberikan informasi aktual setiap hari.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-sm font-medium text-gray-300">
            <a href="/tentang" className="hover:text-white transition-colors">Tentang</a>
            <a href="/redaksi" className="hover:text-white transition-colors">Redaksi</a>
            <a href="/kontak" className="hover:text-white transition-colors">Kontak</a>
            <a href="/privasi" className="hover:text-white transition-colors">Kebijakan Privasi</a>
            <a href="/pedoman" className="hover:text-white transition-colors">Pedoman Media</a>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 pt-8 border-t border-gray-800 text-center text-gray-500 text-xs">
          &copy; 2026 Naratif. All rights reserved.
        </div>
      </footer>
    </>
  );
}
