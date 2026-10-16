'use client';

import { useState, useEffect } from 'react';
import { User, Briefcase, ChevronDown, Check, ExternalLink } from 'lucide-react';
import { AuthorItem, getAuthorsWithStatsAction } from './penulis/actions';

interface AuthorSelectorProps {
  author: string;
  onAuthorChange: (name: string, authorId?: number) => void;
  selectedAuthorId?: number | null;
  name?: string; // form field name, default: 'author'
  idName?: string; // form field name for authorId, default: 'authorId'
}

export default function AuthorSelector({
  author,
  onAuthorChange,
  selectedAuthorId,
  name = 'author',
  idName = 'authorId',
}: AuthorSelectorProps) {
  const [authors, setAuthors] = useState<AuthorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCustom, setIsCustom] = useState(false);

  useEffect(() => {
    getAuthorsWithStatsAction().then((res) => {
      if (res.success && res.authors.length > 0) {
        setAuthors(res.authors);

        // Jika belum ada author yang dipilih, set default ke yang pertama
        if (!author && res.authors[0]) {
          onAuthorChange(res.authors[0].name, res.authors[0].id);
        } else if (author) {
          // Cari apakah nama yang ada cocok dengan daftar authors
          const found = res.authors.find(
            (a) =>
              (selectedAuthorId && a.id === selectedAuthorId) ||
              a.name.toLowerCase().trim() === author.toLowerCase().trim()
          );
          if (found) {
            onAuthorChange(found.name, found.id);
          }
        }
      }
      setLoading(false);
    });
  }, [selectedAuthorId]);

  // Temukan author yang sedang terpilih
  const currentSelected = authors.find(
    (a) =>
      (selectedAuthorId && a.id === selectedAuthorId) ||
      (author && a.name.toLowerCase().trim() === author.toLowerCase().trim())
  );

  const handleSelectAuthor = (selected: AuthorItem) => {
    setIsCustom(false);
    onAuthorChange(selected.name, selected.id);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-bold text-gray-900">
          Penulis (Author) <span className="text-red-500">*</span>
        </label>

        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setIsCustom(!isCustom)}
            className="text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
          >
            {isCustom ? '← Pilih dari Tim Penulis' : '+ Ketik Nama Lain'}
          </button>
          <span className="text-gray-300">|</span>
          <a
            href="/admin/penulis"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-500 hover:text-gray-700 font-medium inline-flex items-center gap-0.5"
          >
            <span>Kelola Profil</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {isCustom ? (
        /* Mode Ketik Nama Bebas */
        <div>
          <input
            type="text"
            name={name}
            value={author}
            onChange={(e) => onAuthorChange(e.target.value, undefined)}
            placeholder="Ketik nama penulis bebas (misal: Kontributor Tamu)"
            required
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-sm font-medium bg-white"
          />
          <input type="hidden" name={idName} value="" />
        </div>
      ) : (
        /* Dropdown Tim Penulis Beravatar */
        <div className="relative">
          <select
            value={currentSelected?.id ? String(currentSelected.id) : ''}
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'custom') {
                setIsCustom(true);
                return;
              }
              const found = authors.find((a) => a.id === Number(val));
              if (found) {
                handleSelectAuthor(found);
              }
            }}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-sm font-medium bg-white appearance-none cursor-pointer pr-10"
          >
            {!currentSelected && (
              <option value="">
                -- Pilih Penulis (Saat ini: {author || 'Belum dipilih'}) --
              </option>
            )}
            {authors.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} — {a.role || 'Redaksi'}
              </option>
            ))}
            <option value="custom">+ Ketik Nama Penulis Lain...</option>
          </select>

          <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />

          {/* Hidden inputs untuk native FormData form submit */}
          <input type="hidden" name={name} value={currentSelected?.name || author || 'Redaksi'} />
          <input type="hidden" name={idName} value={currentSelected?.id ? String(currentSelected.id) : ''} />

          {/* Kartu Profil Penulis yang Terpilih */}
          {currentSelected && (
            <div className="mt-2 p-2.5 bg-gray-50/80 rounded-xl border border-gray-200/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative w-9 h-9 rounded-full overflow-hidden bg-gray-200 border border-indigo-400 shrink-0">
                  {currentSelected.avatarUrl ? (
                    <img
                      src={currentSelected.avatarUrl}
                      alt={currentSelected.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          currentSelected.name
                        )}&background=4f46e5&color=fff`;
                      }}
                    />
                  ) : (
                    <User className="w-5 h-5 text-gray-400 m-auto mt-2" />
                  )}
                </div>

                <div>
                  <p className="text-xs font-bold text-gray-900 leading-tight">
                    {currentSelected.name}
                  </p>
                  <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                    <Briefcase className="w-3 h-3 text-indigo-500" />
                    <span>{currentSelected.role || 'Redaksi'}</span>
                  </p>
                </div>
              </div>

              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-md flex items-center gap-1">
                <Check className="w-3 h-3" />
                Profil Terhubung
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
