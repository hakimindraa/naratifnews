'use client';

import { useState, useRef } from 'react';
import {
  Search,
  UploadCloud,
  Image as ImageIcon,
  Loader2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import ImgbbMediaModal from './ImgbbMediaModal';
import { uploadImageToImgbb } from './media-actions';
import { compressImageUnder100KB } from './image-compressor';

interface CoverImagePickerProps {
  coverUrl: string;
  onCoverChange: (url: string) => void;
  coverCaption?: string;
  onCaptionChange?: (caption: string) => void;
  articleTitle?: string;
  name?: string;
  required?: boolean;
}

export default function CoverImagePicker({
  coverUrl,
  onCoverChange,
  coverCaption,
  onCaptionChange,
  articleTitle = '',
  name = 'coverUrl',
  required = true,
}: CoverImagePickerProps) {
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [compressionNote, setCompressionNote] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError('');
    setCompressionNote('Mengompresi ke WebP < 100 KB...');

    // Auto kompresi client-side garansi ukuran < 100 KB
    const comp = await compressImageUnder100KB(file);
    setCompressionNote(`Dikompresi: ${comp.originalSizeKB} KB ➔ ${comp.compressedSizeKB} KB (< 100 KB)`);

    const fd = new FormData();
    fd.append('file', comp.file);
    fd.append('name', articleTitle ? articleTitle.slice(0, 30) : comp.file.name.replace(/\.[^/.]+$/, ''));

    const res = await uploadImageToImgbb(fd);
    setIsUploading(false);

    // Reset input file value agar bisa pilih file yang sama jika perlu
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    if (res.success && res.url) {
      onCoverChange(res.url);
      if (onCaptionChange && !coverCaption) {
        onCaptionChange(`Ilustrasi sampul berita. (Dok. Naratif / ImgBB)`);
      }
    } else {
      setUploadError(res.error || 'Gagal mengunggah gambar ke ImgBB.');
    }
  };

  const handleSelectFromModal = (url: string, caption?: string) => {
    onCoverChange(url);
    if (caption && onCaptionChange) {
      onCaptionChange(caption);
    }
  };

  const isImgbbHost = coverUrl.includes('ibb.co');

  return (
    <div className="space-y-2.5">
      {/* Label & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <label className="block text-sm font-bold text-gray-900">
          Link Gambar Cover (URL) {required && <span className="text-red-500">*</span>}
        </label>

        {/* Action Buttons Toolbar */}
        <div className="flex items-center gap-2">
          {/* Tombol Cari Foto Otomatis */}
          <button
            type="button"
            onClick={() => setShowSearchModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50/80 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300 transition-colors cursor-pointer shadow-2xs"
            title="Cari foto bebas royalti sesuai judul dan upload otomatis ke ImgBB"
          >
            <Search className="w-3.5 h-3.5 text-indigo-600" />
            <span>Cari Foto Otomatis</span>
          </button>

          {/* Tombol Unggah File Lokal */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
            title="Unggah berkas dari laptop/HP ke CDN ImgBB"
          >
            {isUploading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-600" />
            ) : (
              <UploadCloud className="w-3.5 h-3.5 text-gray-600" />
            )}
            <span>{isUploading ? 'Mengunggah...' : 'Unggah File'}</span>
          </button>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>

      {/* Input URL Manual */}
      <div className="relative">
        <input
          type="url"
          name={name}
          value={coverUrl}
          onChange={(e) => onCoverChange(e.target.value)}
          placeholder="https://i.ibb.co/... atau link gambar web"
          required={required}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-sm font-mono text-gray-800 bg-white"
        />
      </div>

      {/* Uploading Status Banner */}
      {isUploading && (
        <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900 flex items-center gap-2 animate-pulse">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-600 shrink-0" />
          <span className="font-medium">{compressionNote || 'Mengompresi ke WebP < 100 KB dan mengunggah ke ImgBB...'}</span>
        </div>
      )}

      {/* Upload Error Banner */}
      {uploadError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Live Preview Box */}
      {coverUrl && (
        <div className="space-y-1.5">
          <div className="relative w-full max-w-md aspect-video rounded-xl overflow-hidden border border-gray-200 bg-gray-900/5 group">
            <img
              src={coverUrl}
              alt="Preview Cover"
              className="w-full h-full object-cover transition-opacity group-hover:opacity-95"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />

            {/* Top Badges & Actions */}
            <div className="absolute top-2 inset-x-2 flex items-center justify-between pointer-events-none">
              {isImgbbHost ? (
                <span className="pointer-events-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-600/90 text-white text-[10px] font-semibold backdrop-blur-xs shadow-xs">
                  <CheckCircle2 className="w-3 h-3" />
                  CDN ImgBB (&lt; 100 KB)
                </span>
              ) : (
                <span className="pointer-events-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-800/80 text-gray-200 text-[10px] font-medium backdrop-blur-xs">
                  <ImageIcon className="w-3 h-3" />
                  URL Eksternal
                </span>
              )}

            <div className="flex items-center gap-1.5 pointer-events-auto">
              <a
                href={coverUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white text-xs transition-colors backdrop-blur-xs"
                title="Buka gambar di tab baru"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                type="button"
                onClick={() => onCoverChange('')}
                className="p-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-700 text-white text-xs transition-colors backdrop-blur-xs cursor-pointer shadow-xs"
                title="Hapus Cover"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {compressionNote && (
          <p className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
            <span>⚡ {compressionNote}</span>
          </p>
        )}
      </div>
      )}

      {/* Global Search & Re-host Modal */}
      <ImgbbMediaModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        initialQuery={articleTitle}
        onSelectUrl={handleSelectFromModal}
      />
    </div>
  );
}
