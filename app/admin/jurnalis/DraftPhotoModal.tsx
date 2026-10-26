'use client';

import { useState, useEffect } from 'react';
import { X, Upload, Link2, Image as ImageIcon, Loader2, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { attachPhotoToDraftAction, getNextSuggestedPublishTimeAction } from './actions';

interface DraftPhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  draftId: number;
  draftTitle: string;
  initialCoverUrl?: string | null;
  initialCaption?: string | null;
  initialPublishAt?: string | null;
  onSuccess: (coverUrl: string, newStatus: string, publishAt?: string | null) => void;
}

function toDateTimeLocalString(date: Date) {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function DraftPhotoModal({
  isOpen,
  onClose,
  draftId,
  draftTitle,
  initialCoverUrl,
  initialCaption,
  initialPublishAt,
  onSuccess,
}: DraftPhotoModalProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [caption, setCaption] = useState(
    initialCaption || `Ilustrasi liputan: ${draftTitle.slice(0, 80)}`
  );
  const [publishAt, setPublishAt] = useState<string>(() => {
    if (initialPublishAt) {
      const d = new Date(initialPublishAt);
      if (!isNaN(d.getTime())) return toDateTimeLocalString(d);
    }
    return toDateTimeLocalString(new Date(Date.now() + 60 * 60 * 1000));
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialPublishAt) {
        const d = new Date(initialPublishAt);
        if (!isNaN(d.getTime())) {
          setPublishAt(toDateTimeLocalString(d));
          return;
        }
      }
      getNextSuggestedPublishTimeAction()
        .then((res) => {
          if (res?.success && res.iso) {
            const d = new Date(res.iso);
            if (!isNaN(d.getTime())) {
              setPublishAt(toDateTimeLocalString(d));
            }
          }
        })
        .catch(console.error);
    }
  }, [isOpen, initialPublishAt]);

  if (!isOpen) return null;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) {
      if (selected.size > 32 * 1024 * 1024) {
        setError('Ukuran file maksimal 32MB sesuai standar ImgBB.');
        return;
      }
      setFile(selected);
      setError(null);
      const url = URL.createObjectURL(selected);
      setFilePreview(url);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      if (activeTab === 'upload') {
        if (!file) {
          setError('Silakan pilih berkas gambar dari perangkat Anda.');
          setIsSubmitting(false);
          return;
        }
        formData.append('file', file);
      } else {
        if (!imageUrl.trim()) {
          setError('Silakan tempel URL gambar yang valid.');
          setIsSubmitting(false);
          return;
        }
        const cleanUrl = imageUrl.trim().replace(/https?:\/\/i\.ibb\.co\//g, 'https://i.ibb.co.com/');
        formData.append('imageUrl', cleanUrl);
      }

      if (caption.trim()) {
        formData.append('caption', caption.trim());
      }

      if (publishAt) {
        formData.append('publishAt', publishAt);
      }

      const res = await attachPhotoToDraftAction(draftId, formData);
      if (res.success && res.coverUrl) {
        onSuccess(res.coverUrl, res.status || 'ready_to_publish', res.publishAt);
        onClose();
      } else {
        setError(res.error || 'Gagal mengunggah foto ke ImgBB.');
      }
    } catch (err: any) {
      setError(err?.message || 'Terjadi kesalahan jaringan.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm sm:text-base">Pasang Foto Berita (ImgBB)</h3>
              <p className="text-[11px] text-gray-500 line-clamp-1 max-w-xs sm:max-w-sm">{draftTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Tab Selector */}
          <div className="grid grid-cols-2 gap-1.5 bg-gray-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setActiveTab('upload');
                setError(null);
              }}
              className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload dari Perangkat</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('url');
                setError(null);
              }}
              className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'url'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>Tempel Tautan / URL</span>
            </button>
          </div>

          {/* Upload Box */}
          {activeTab === 'upload' ? (
            <div className="space-y-2">
              <label
                htmlFor="draft-photo-upload"
                className={`border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  filePreview
                    ? 'border-indigo-400 bg-indigo-50/20'
                    : 'border-gray-300 hover:border-indigo-500 bg-gray-50/50 hover:bg-gray-50'
                }`}
              >
                {filePreview ? (
                  <div className="space-y-2">
                    <img
                      src={filePreview}
                      alt="Preview"
                      className="max-h-44 w-auto object-cover rounded-lg mx-auto shadow-xs border border-gray-200"
                    />
                    <p className="text-xs font-semibold text-indigo-700">{file?.name}</p>
                    <span className="text-[11px] text-gray-500 block">Klik untuk mengganti berkas</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-800">Pilih berkas foto dari HP/Laptop</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">JPG, PNG, WebP (Maks. 32MB)</p>
                    </div>
                  </div>
                )}
                <input
                  id="draft-photo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700">Tautan Gambar (URL Direct / ImgBB)</label>
              <div className="relative">
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => {
                    setImageUrl(e.target.value);
                    setError(null);
                  }}
                  placeholder="https://i.ibb.co.com/... atau URL gambar publik"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>
              <p className="text-[11px] text-gray-400">
                Jika link bukan dari ImgBB, sistem akan otomatis mengunggah dan menyimpannya ke CDN ImgBB.
              </p>
            </div>
          )}

          {/* Caption Input */}
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-bold text-gray-700">Keterangan / Caption Foto (Opsional)</label>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Contoh: Ilustrasi peluncuran inovasi AI..."
              className="w-full text-xs px-3.5 py-2 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            />
          </div>

          {/* Jadwal Jam Tayang (Auto-Slot 2 Jam) */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                <span>Jadwal Jam Tayang (WIB)</span>
              </label>
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                Rekomendasi Otomatis
              </span>
            </div>
            <input
              type="datetime-local"
              value={publishAt}
              onChange={(e) => setPublishAt(e.target.value)}
              className="w-full text-xs px-3.5 py-2 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none font-medium text-gray-800"
            />
            <p className="text-[11px] text-gray-500">
              Otomatis mengikuti jeda antrean dari berita sebelumnya (WIB). Anda bebas mengubah tanggal & jam ini sesuai keinginan.
            </p>
          </div>

          <div className="bg-indigo-50 border border-indigo-200/80 rounded-xl p-3 text-[11px] text-indigo-900 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>Sinkron ke Tab &quot;Terjadwal&quot; Dasbor Redaksi</span>
            </div>
            <p className="text-indigo-700 leading-relaxed">
              Setelah foto disimpan, draf resmi masuk antrean dan langsung tampil di tab <b>Terjadwal</b> pada Dasbor Redaksi serta terbit otomatis saat jamnya tiba.
            </p>
          </div>

          {/* Modal Footer */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-gray-100">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Mengunggah ke ImgBB...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Simpan Foto & Masuk Antrean</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
