'use client';

import { useState, useEffect, useTransition } from 'react';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  User,
  Newspaper,
  Briefcase,
  AlertCircle,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { AuthorItem, getAuthorsWithStatsAction, deleteAuthorAction } from './actions';
import AuthorModal from './AuthorModal';

export default function PenulisAdminPage() {
  const [authors, setAuthors] = useState<AuthorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAuthor, setEditingAuthor] = useState<AuthorItem | null>(null);
  const [error, setError] = useState('');

  const loadAuthors = async () => {
    setLoading(true);
    setError('');
    const res = await getAuthorsWithStatsAction();
    if (res.success) {
      setAuthors(res.authors);
    } else {
      setError(res.error || 'Gagal memuat data penulis.');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAuthors();
  }, []);

  const handleEdit = (author: AuthorItem) => {
    setEditingAuthor(author);
    setModalOpen(true);
  };

  const handleCreate = () => {
    setEditingAuthor(null);
    setModalOpen(true);
  };

  const handleDelete = (author: AuthorItem) => {
    if (!confirm(`Hapus penulis "${author.name}"? Artikel yang pernah ditulis tidak akan terhapus.`)) {
      return;
    }

    startDeleteTransition(async () => {
      const res = await deleteAuthorAction(author.id);
      if (res.success) {
        setAuthors((prev) => prev.filter((a) => a.id !== author.id));
      } else {
        alert(res.error || 'Gagal menghapus penulis.');
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-heading text-gray-900 leading-tight">
              Tim Penulis &amp; Wartawan
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              Kelola nama, jabatan resmi, dan foto avatar jurnalis untuk identitas dan kredibilitas redaksi
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadAuthors}
            disabled={loading}
            className="p-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors cursor-pointer"
            title="Segarkan data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Penulis</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {/* Grid Kartu Penulis */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-gray-200/80 p-5 space-y-4 animate-pulse"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-full bg-gray-200 shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
              <div className="h-10 bg-gray-100 rounded-xl" />
            </div>
          ))}
        </div>
      ) : authors.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200/80 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-gray-900">Belum Ada Penulis Terdaftar</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Daftarkan profil jurnalis atau reporter untuk mulai menghubungkannya dengan artikel berita.
          </p>
          <button
            type="button"
            onClick={handleCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Penulis Pertama</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {authors.map((author) => (
            <div
              key={author.id}
              className="bg-white rounded-2xl border border-gray-200/80 p-5 flex flex-col justify-between shadow-2xs hover:border-indigo-300 transition-all hover:shadow-sm"
            >
              <div className="space-y-3.5">
                {/* Avatar & Identitas */}
                <div className="flex items-start gap-3.5">
                  <div className="relative w-14 h-14 rounded-full overflow-hidden bg-gray-100 border-2 border-indigo-600/30 shrink-0 shadow-xs flex items-center justify-center">
                    {author.avatarUrl ? (
                      <img
                        src={author.avatarUrl}
                        alt={author.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            author.name
                          )}&background=4f46e5&color=fff`;
                        }}
                      />
                    ) : (
                      <User className="w-6 h-6 text-gray-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-gray-900 truncate" title={author.name}>
                      {author.name}
                    </h3>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[11px] font-semibold mt-1">
                      <Briefcase className="w-3 h-3" />
                      <span>{author.role || 'Redaksi'}</span>
                    </span>
                  </div>
                </div>

                {/* Bio Singkat */}
                <p className="text-xs text-gray-600 line-clamp-3 leading-relaxed min-h-[3rem] bg-gray-50/70 p-2.5 rounded-xl border border-gray-100">
                  {author.bio || 'Belum ada deskripsi profil redaksi.'}
                </p>

                {/* Statistik Artikel */}
                <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Newspaper className="w-3.5 h-3.5 text-gray-400" />
                    <span>{author.articleCount || 0} Artikel Ditulis</span>
                  </span>

                  <span className="text-[10px] text-gray-400">ID #{author.id}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => handleEdit(author)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                  <span>Edit Profil</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDelete(author)}
                  disabled={isDeleting}
                  className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50"
                  title="Hapus Penulis"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Tambah / Edit */}
      <AuthorModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        authorToEdit={editingAuthor}
        onSuccess={loadAuthors}
      />
    </div>
  );
}
