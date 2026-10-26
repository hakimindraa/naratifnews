'use client';

import { useState, useEffect } from 'react';
import {
  Link2,
  Search,
  Shuffle,
  X,
  FileText,
  RefreshCw,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { getInternalLinkArticles, InternalLinkItem } from './actions';

interface BacaJugaPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (snippet: string) => void;
}

export default function BacaJugaPickerModal({
  isOpen,
  onClose,
  onInsert,
}: BacaJugaPickerModalProps) {
  const [articles, setArticles] = useState<InternalLinkItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadArticles('');
    }
  }, [isOpen]);

  async function loadArticles(query: string) {
    setLoading(true);
    try {
      const data = await getInternalLinkArticles(query);
      setArticles(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setSearch(val);
    loadArticles(val);
  }

  function handleSelect(item: InternalLinkItem) {
    const snippet = `\n\n**Baca juga:** [${item.title}](${item.url})\n\n`;
    onInsert(snippet);
    onClose();
  }

  function handleRandomPick() {
    if (articles.length === 0) return;
    const randomIndex = Math.floor(Math.random() * articles.length);
    handleSelect(articles[randomIndex]);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
              <Link2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-gray-900 font-heading">
                Sisipkan Tautan "Baca Juga"
              </h3>
              <p className="text-[11px] sm:text-xs text-gray-500">
                Pilih artikel lama untuk meningkatkan SEO & durasi baca pengunjung.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Random Pick Bar */}
        <div className="p-4 border-b border-gray-100 bg-gray-50/60 flex items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={handleSearchChange}
              placeholder="Ketik kata kunci judul artikel..."
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
          </div>

          <button
            type="button"
            onClick={handleRandomPick}
            disabled={articles.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200/80 transition-all active:scale-95 shrink-0 disabled:opacity-50"
            title="Pilihkan artikel secara acak tanpa perlu mencari"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Pilih Acak</span>
          </button>
        </div>

        {/* Article List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-400">
              <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" />
              <span className="text-xs">Memuat daftar artikel...</span>
            </div>
          ) : articles.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-xs space-y-1">
              <FileText className="w-8 h-8 mx-auto text-gray-300 stroke-1" />
              <p>Tidak ada artikel yang cocok dengan kata kunci pencarian.</p>
            </div>
          ) : (
            articles.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item)}
                className="w-full text-left p-3 rounded-xl border border-gray-100 hover:border-indigo-300 hover:bg-indigo-50/40 transition-all flex items-start justify-between gap-3 group"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 group-hover:bg-indigo-100 group-hover:text-indigo-800 transition-colors">
                      {item.category}
                    </span>
                    {item.publishedAt && (
                      <span className="text-[10px] text-gray-400">
                        {new Date(item.publishedAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs sm:text-sm font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors line-clamp-2 leading-snug">
                    {item.title}
                  </h4>
                </div>

                <div className="shrink-0 text-gray-300 group-hover:text-indigo-600 pt-1">
                  <ExternalLink className="w-4 h-4" />
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 bg-gray-50 border-t border-gray-100 text-[11px] text-gray-500 text-center">
          Klik artikel mana saja untuk langsung menyisipkan format <code className="bg-white px-1.5 py-0.5 rounded border border-gray-200 font-mono text-gray-700 font-bold">&gt; **Baca Juga:** [Judul](link)</code> ke teks berita.
        </div>
      </div>
    </div>
  );
}
