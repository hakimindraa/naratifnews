'use client';

import { useState, useRef, useEffect } from 'react';
import {
  X,
  User,
  UploadCloud,
  Loader2,
  Check,
  AlertCircle,
  Briefcase,
  FileText,
  Trash2,
} from 'lucide-react';
import { AuthorItem, createAuthorAction, updateAuthorAction } from './actions';
import { uploadImageToImgbb } from '../media-actions';
import { compressImageUnder100KB } from '../image-compressor';

interface AuthorModalProps {
  isOpen: boolean;
  onClose: () => void;
  authorToEdit?: AuthorItem | null;
  onSuccess: () => void;
}

const roleSuggestions = [
  'Pemimpin Redaksi',
  'Wakil Pemimpin Redaksi',
  'Jurnalis Teknologi',
  'Reporter Regional',
  'Editor Opini',
  'Desk Gadget',
  'Tim Redaksi',
];

export default function AuthorModal({
  isOpen,
  onClose,
  authorToEdit,
  onSuccess,
}: AuthorModalProps) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('Jurnalis Teknologi');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bio, setBio] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [compressionMsg, setCompressionMsg] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (authorToEdit) {
      setName(authorToEdit.name);
      setRole(authorToEdit.role || 'Redaksi');
      setAvatarUrl(authorToEdit.avatarUrl || '');
      setBio(authorToEdit.bio || '');
    } else {
      setName('');
      setRole('Jurnalis Teknologi');
      setAvatarUrl('');
      setBio('');
    }
    setError('');
    setCompressionMsg('');
  }, [authorToEdit, isOpen]);

  if (!isOpen) return null;

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError('');
    setCompressionMsg('Mengompresi avatar...');

    try {
      // Kompres avatar ke WebP max 500px, < 80 KB
      const comp = await compressImageUnder100KB(file, 500, 500, 75 * 1024);
      setCompressionMsg(`Dikompresi: ${comp.originalSizeKB} KB ➔ ${comp.compressedSizeKB} KB`);

      const fd = new FormData();
      fd.append('file', comp.file);
      fd.append('name', `avatar-${name ? name.slice(0, 20) : 'author'}`);

      const res = await uploadImageToImgbb(fd);
      if (res.success && res.url) {
        setAvatarUrl(res.url);
      } else {
        setError(res.error || 'Gagal mengunggah foto avatar.');
      }
    } catch (err: any) {
      setError(err.message || 'Gagal memproses gambar avatar.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Nama penulis wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    const fd = new FormData();
    fd.append('name', name);
    fd.append('role', role);
    fd.append('avatarUrl', avatarUrl);
    fd.append('bio', bio);

    let res;
    if (authorToEdit) {
      res = await updateAuthorAction(authorToEdit.id, fd);
    } else {
      res = await createAuthorAction(fd);
    }

    setIsSubmitting(false);

    if (res?.error) {
      setError(res.error);
    } else {
      onSuccess();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs">
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-gray-900 leading-tight">
                {authorToEdit ? 'Edit Profil Penulis' : 'Tambah Penulis Baru'}
              </h3>
              <p className="text-xs text-gray-500">
                Profil jurnalis untuk identitas dan kredibilitas berita Ada Fakta
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Section: Avatar / Foto Profil */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
              Foto Avatar Penulis
            </label>
            <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl border border-gray-200">
              {/* Avatar Preview */}
              <div className="relative w-16 h-16 rounded-full overflow-hidden bg-gray-200 border-2 border-indigo-500 shrink-0 shadow-xs flex items-center justify-center">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={name || 'Avatar'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        name || 'Redaksi'
                      )}&background=4f46e5&color=fff`;
                    }}
                  />
                ) : (
                  <User className="w-7 h-7 text-gray-400" />
                )}
              </div>

              {/* Upload Action */}
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
                  >
                    {isUploading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <UploadCloud className="w-3.5 h-3.5" />
                    )}
                    <span>{isUploading ? 'Mengunggah...' : 'Pilih Foto & Upload'}</span>
                  </button>

                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={() => setAvatarUrl('')}
                      className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Hapus Foto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleAvatarFile}
                />

                {compressionMsg ? (
                  <p className="text-[11px] text-emerald-600 font-medium">⚡ {compressionMsg}</p>
                ) : (
                  <p className="text-[11px] text-gray-500">
                    Format JPG, PNG, WEBP (Otomatis dikompresi ke WebP &lt; 80 KB).
                  </p>
                )}
              </div>
            </div>

            {/* Manual URL Input jika ada */}
            <input
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="Atau tempel link URL foto langsung (https://i.ibb.co/...)"
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-mono text-gray-700 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 bg-white"
            />
          </div>

          {/* Section: Nama Penulis */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
              Nama Lengkap Jurnalis / Penulis <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Indra Hakim Lesmana"
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 bg-white"
              />
            </div>
          </div>

          {/* Section: Jabatan / Role */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
              Jabatan / Posisi di Redaksi
            </label>
            <div className="relative">
              <Briefcase className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Contoh: Pemimpin Redaksi, Jurnalis Teknologi"
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-xl text-sm text-gray-800 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 bg-white"
              />
            </div>

            {/* Role suggestions */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[10px] text-gray-400 font-medium">Saran:</span>
              {roleSuggestions.map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => setRole(sug)}
                  className={`text-[10px] px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                    role === sug
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>

          {/* Section: Bio Singkat */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
              Bio Singkat (Deskripsi Peran)
            </label>
            <div className="relative">
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Contoh: Jurnalis yang fokus meliput perkembangan kecerdasan buatan, gadget, dan industri digital di Asia Tenggara."
                className="w-full p-3 border border-gray-300 rounded-xl text-xs sm:text-sm text-gray-800 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 bg-white"
              />
            </div>
            <p className="text-[11px] text-gray-400">
              Akan ditampilkan di kotak &quot;Tentang Penulis&quot; pada bagian akhir artikel berita.
            </p>
          </div>

          {/* Footer Submit Buttons */}
          <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-semibold text-xs hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>{authorToEdit ? 'Simpan Perubahan' : 'Tambahkan Penulis'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
