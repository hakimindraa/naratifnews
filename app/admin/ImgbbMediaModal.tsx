'use client';

import { useState, useEffect, useTransition } from 'react';
import {
  X,
  Search,
  UploadCloud,
  Check,
  Copy,
  ExternalLink,
  Loader2,
  AlertCircle,
  Sparkles,
  Image as ImageIcon,
  CheckCircle2,
} from 'lucide-react';
import {
  searchEditorialPhotos,
  uploadImageToImgbb,
  getImgbbConfigStatus,
  EditorialPhoto,
} from './media-actions';
import { compressImageUnder100KB } from './image-compressor';

interface ImgbbMediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUrl?: (url: string, caption?: string) => void;
  initialQuery?: string;
}

export default function ImgbbMediaModal({
  isOpen,
  onClose,
  onSelectUrl,
  initialQuery = '',
}: ImgbbMediaModalProps) {
  const [activeTab, setActiveTab] = useState<'search' | 'upload'>('search');
  const [isConfigured, setIsConfigured] = useState(true);

  // Search State
  const [query, setQuery] = useState(initialQuery);
  const [photos, setPhotos] = useState<EditorialPhoto[]>([]);
  const [isSearching, startSearchTransition] = useTransition();
  const [searchError, setSearchError] = useState('');

  // Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [compressionNote, setCompressionNote] = useState('');
  const [resultUrl, setResultUrl] = useState('');
  const [resultThumb, setResultThumb] = useState('');
  const [copied, setCopied] = useState(false);

  // Quick preset keywords
  const presetKeywords = ['Teknologi', 'AI', 'Smartphone', 'Indonesia', 'Regional', 'Ekonomi'];

  // Check config status on open
  useEffect(() => {
    if (isOpen) {
      getImgbbConfigStatus().then((res) => setIsConfigured(res.configured));
      if (initialQuery && initialQuery.trim().length > 0) {
        setQuery(initialQuery);
        handleSearch(initialQuery);
      }
    }
  }, [isOpen, initialQuery]);

  if (!isOpen) return null;

  const handleSearch = (searchKeyword: string) => {
    if (!searchKeyword.trim()) return;
    setSearchError('');
    startSearchTransition(async () => {
      const res = await searchEditorialPhotos(searchKeyword);
      if (res.success) {
        setPhotos(res.photos);
        if (res.photos.length === 0) {
          setSearchError('Tidak ditemukan foto untuk kata kunci tersebut. Coba kata kunci lain.');
        }
      } else {
        setSearchError(res.error || 'Gagal mencari foto.');
      }
    });
  };

  const handleRehostPhoto = async (photo: EditorialPhoto) => {
    setIsUploading(true);
    setUploadError('');
    setResultUrl('');
    setCompressionNote('Mengoptimasi resolusi ke 1000px (< 100 KB)...');

    const fd = new FormData();
    // Menggunakan photo.thumbUrl (versi renderan 1000px oleh Wikimedia sehingga < 100 KB)
    fd.append('imageUrl', photo.thumbUrl || photo.fullUrl);
    fd.append('name', photo.title.slice(0, 30));

    const res = await uploadImageToImgbb(fd);
    setIsUploading(false);

    if (res.success && res.url) {
      setResultUrl(res.url);
      setResultThumb(res.thumbUrl || res.url);
      setCompressionNote('Format WebP optimal 1000px (< 100 KB)');
      if (onSelectUrl) {
        const caption = `${photo.title}. (Dok. ${photo.author || 'Pexels/Wikimedia'})`;
        onSelectUrl(res.url, caption);
        onClose();
      }
    } else {
      setUploadError(res.error || 'Gagal mengunggah foto ke ImgBB.');
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setIsUploading(true);
    setUploadError('');
    setResultUrl('');
    setCompressionNote('Mengompresi ke WebP < 100 KB...');

    // Auto kompresi client-side garansi di bawah 100 KB
    const comp = await compressImageUnder100KB(file);
    setCompressionNote(
      `Ukuran: ${comp.originalSizeKB} KB ➔ ${comp.compressedSizeKB} KB (Hemat ${comp.savingsPercent}%)`
    );

    const fd = new FormData();
    fd.append('file', comp.file);
    fd.append('name', comp.file.name.replace(/\.[^/.]+$/, ''));

    const res = await uploadImageToImgbb(fd);
    setIsUploading(false);

    if (res.success && res.url) {
      setResultUrl(res.url);
      setResultThumb(res.thumbUrl || res.url);
      if (onSelectUrl) {
        onSelectUrl(res.url, `Dokumentasi Ada Fakta. (Foto: Dok. Redaksi)`);
        onClose();
      }
    } else {
      setUploadError(res.error || 'Gagal mengunggah berkas ke ImgBB.');
    }
  };

  const handleCopyLink = () => {
    if (!resultUrl) return;
    navigator.clipboard.writeText(resultUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60">
      <div
        className="relative w-full max-w-3xl bg-white rounded-2xl shadow-xl border border-gray-200 flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-gray-900 leading-tight">
                Pusat Media & Uploader ImgBB
              </h3>
              <p className="text-xs text-gray-500">
                Cari foto bebas royalti atau unggah langsung ke CDN ImgBB resmi
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* API Key Not Configured Alert */}
        {!isConfigured && (
          <div className="px-5 py-2.5 bg-amber-50 border-b border-amber-200 text-amber-800 text-xs flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>IMGBB_API_KEY</strong> belum disetel di <code>.env.local</code>. Fitur upload akan gagal sampai API key ditambahkan.
              </span>
            </div>
            <a
              href="https://api.imgbb.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-bold text-amber-900 hover:text-amber-950 shrink-0 ml-2"
            >
              Dapatkan Gratis ↗
            </a>
          </div>
        )}

        {/* Tabs Switcher */}
        <div className="flex border-b border-gray-200 px-5 pt-3 bg-white shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('search')}
            className={`pb-2.5 px-3.5 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'search'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>1. Cari Foto Otomatis</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`pb-2.5 px-3.5 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'upload'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>2. Unggah File Perangkat</span>
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* TAB 1: SEARCH & REHOST */}
          {activeTab === 'search' && (
            <div className="space-y-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSearch(query);
                }}
                className="flex gap-2"
              >
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ketik topik berita (misal: AI, Indonesia, Jawa Barat, Laptop)..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 bg-white"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSearching || !query.trim()}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-medium text-xs sm:text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  <span>Cari</span>
                </button>
              </form>

              {/* Quick Tags */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-gray-400 font-medium">Topik Cepat:</span>
                {presetKeywords.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      setQuery(tag);
                      handleSearch(tag);
                    }}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors cursor-pointer font-medium"
                  >
                    {tag}
                  </button>
                ))}
              </div>

              {searchError && (
                <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs border border-red-200">
                  {searchError}
                </div>
              )}

              {/* Photos Grid */}
              {photos.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 font-medium">
                    Pilih salah satu foto untuk otomatis di-rehost ke CDN ImgBB:
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {photos.map((photo) => (
                      <div
                        key={photo.id}
                        onClick={() => !isUploading && handleRehostPhoto(photo)}
                        className="group relative aspect-video rounded-xl overflow-hidden border border-gray-200 bg-gray-100 cursor-pointer hover:border-indigo-600 transition-all hover:shadow-md"
                      >
                        <img
                          src={photo.thumbUrl}
                          alt={photo.title}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2 text-white">
                          <p className="text-[10px] line-clamp-1 font-semibold leading-tight">
                            {photo.title}
                          </p>
                          <span className="text-[9px] text-gray-200 mt-0.5 flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                            Klik utk Upload ke ImgBB
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DIRECT FILE UPLOAD */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <label className="border-2 border-dashed border-gray-300 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:border-indigo-600 transition-colors bg-gray-50/50 cursor-pointer block">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileUpload(f);
                  }}
                />
                <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-gray-900">
                  Klik untuk pilih file atau seret gambar ke sini
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Mendukung JPG, PNG, WEBP, GIF (Maksimal 32MB)
                </p>
              </label>
            </div>
          )}

          {/* Uploading Status Banner */}
          {isUploading && (
            <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center gap-3 text-indigo-900 text-xs animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600 shrink-0" />
              <div>
                <p className="font-bold">Sedang mengunggah ke CDN ImgBB...</p>
                <p className="text-[11px] text-indigo-700">
                  {compressionNote || 'Gambar diproses dan disimpan di server ImgBB tanpa membebani hosting Vercel.'}
                </p>
              </div>
            </div>
          )}

          {uploadError && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Upload Gagal</p>
                <p>{uploadError}</p>
              </div>
            </div>
          )}

          {/* Success Result Box */}
          {resultUrl && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-emerald-800 text-xs font-bold">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Berhasil diunggah ke ImgBB CDN!</span>
                </div>
                {compressionNote && (
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-md border border-emerald-300/60">
                    ⚡ {compressionNote}
                  </span>
                )}
              </div>

              <div className="flex gap-3 items-center">
                <div className="w-16 h-12 rounded-lg overflow-hidden border border-emerald-300 shrink-0 bg-white">
                  <img src={resultThumb || resultUrl} alt="Hasil" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    readOnly
                    value={resultUrl}
                    className="w-full px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-mono text-gray-800 truncate select-all"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Tersalin ke Clipboard!' : 'Salin Link CDN'}</span>
                </button>

                <a
                  href={resultUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-gray-500" />
                  <span>Buka Gambar</span>
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/70 flex items-center justify-between text-xs text-gray-500 shrink-0">
          <span>Tersedia untuk artikel, cover, dan media redaksi Ada Fakta.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-white transition-colors cursor-pointer"
          >
            Selesai / Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
