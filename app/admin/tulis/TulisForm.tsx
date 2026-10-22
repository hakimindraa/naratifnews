'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createArticle } from '../actions';
import { Eye, Edit3, Image as ImageIcon, Sparkles, AlertCircle, Link2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import BacaJugaPickerModal from '../BacaJugaPickerModal';
import CoverImagePicker from '../CoverImagePicker';
import AuthorSelector from '../AuthorSelector';

const INDONESIA_REGIONS = [
  'Umum',
  'Kepulauan Riau',
  'Riau',
  'DKI Jakarta',
  'Jawa Barat',
  'Jawa Tengah',
  'DI Yogyakarta',
  'Jawa Timur',
  'Banten',
  'Bali',
  'Sumatera Utara',
  'Sumatera Barat',
  'Sumatera Selatan',
  'Aceh',
  'Lampung',
  'Jambi',
  'Bengkulu',
  'Bangka Belitung',
  'Kalimantan Barat',
  'Kalimantan Tengah',
  'Kalimantan Selatan',
  'Kalimantan Timur',
  'Kalimantan Utara',
  'Sulawesi Selatan',
  'Sulawesi Utara',
  'Sulawesi Tengah',
  'Sulawesi Tenggara',
  'Gorontalo',
  'Sulawesi Barat',
  'Nusa Tenggara Barat',
  'Nusa Tenggara Timur',
  'Maluku',
  'Maluku Utara',
  'Papua',
  'Papua Barat',
  'Papua Selatan',
  'Papua Tengah',
  'Papua Pegunungan',
  'Papua Barat Daya',
];

export default function TulisForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [showBacaJugaModal, setShowBacaJugaModal] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [category, setCategory] = useState('Software');
  const [selectedRegion, setSelectedRegion] = useState('Umum');
  const [coverUrl, setCoverUrl] = useState('');
  const [coverCaption, setCoverCaption] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [author, setAuthor] = useState('Redaksi');
  const [authorId, setAuthorId] = useState<number | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [publishAt, setPublishAt] = useState('');

  // Set default datetime di client (menghindari error SSR/prerender Next.js 16)
  useEffect(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    setPublishAt(`${yyyy}-${mm}-${dd}T${hh}:${min}`);
  }, []);

  // Auto slug generator
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    if (!slugManuallyEdited) {
      const generatedSlug = newTitle
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setSlug(generatedSlug);
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlug(e.target.value);
    setSlugManuallyEdited(true);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    const formData = new FormData();
    formData.append('title', title);
    formData.append('slug', slug);
    formData.append('category', category);
    if (category === 'Regional') {
      formData.append('region', selectedRegion);
    }
    formData.append('coverUrl', coverUrl);
    formData.append('coverCaption', coverCaption);
    formData.append('excerpt', excerpt);
    formData.append('content', content);
    formData.append('publishAt', publishAt);
    formData.append('tags', tags);
    formData.append('author', author);
    if (authorId) {
      formData.append('authorId', String(authorId));
    }

    startTransition(async () => {
      const result = await createArticle(formData);
      if (result.error) {
        setError(result.error);
      } else {
        router.push('/admin');
        router.refresh();
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {/* SEKSI 1: INFORMASI UTAMA & PUBLIKASI */}
      <div className="space-y-4 pt-1">
        <div className="border-b border-gray-100 pb-2">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-gray-500">
            1. Informasi Utama & Publikasi
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          <div className="space-y-1.5 md:col-span-2">
            <label className="block text-sm font-bold text-gray-900">
              Judul Artikel <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={handleTitleChange}
              placeholder="Contoh: OpenAI Resmi Rilis Model Terbaru dengan Kemampuan..."
              required
              className="w-full px-3.5 sm:px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-sm sm:text-base font-semibold text-gray-950 placeholder:text-gray-400 placeholder:font-normal"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-bold text-gray-900">
              Slug URL <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={slug}
              onChange={handleSlugChange}
              placeholder="openai-resmi-rilis-model-terbaru"
              required
              className="w-full px-3.5 sm:px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-xs sm:text-sm font-mono"
            />
            <p className="text-[11px] text-gray-500 truncate">
              URL: /berita/{category.toLowerCase()}/[id]/{slug || 'judul-artikel'}
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-bold text-gray-900">
              Kategori Berita <span className="text-red-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 sm:px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-sm bg-white font-medium cursor-pointer"
            >
              {['Nasional', 'Internasional', 'Regional', 'Sport', 'AI', 'Gadget', 'Software', 'Hardware', 'Infrastruktur'].map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            {/* Sub-selector Wilayah (Hanya tampil jika Kategori = Regional) */}
            {category === 'Regional' && (
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1.5 transition-all mt-2">
                <label className="block text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                  <span>📍</span> Wilayah / Provinsi Liputan <span className="text-red-500">*</span>
                </label>
                <select
                  name="region"
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  className="w-full px-3 py-2 border border-emerald-300 rounded-lg bg-white text-xs sm:text-sm font-semibold text-emerald-950 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 cursor-pointer"
                >
                  {INDONESIA_REGIONS.map((r) => (
                    <option key={r} value={r}>
                      {r === 'Umum' ? '🌐 Umum (Seluruh Daerah)' : `📍 ${r}`}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-emerald-700">
                  Pilih provinsi liputan berita ini agar terklasifikasi di badge daerah yang tepat.
                </p>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-bold text-gray-900">
              Waktu Tayang / Publikasi
            </label>
            <input
              type="datetime-local"
              value={publishAt}
              onChange={(e) => setPublishAt(e.target.value)}
              required
              className="w-full px-3.5 sm:px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-xs sm:text-sm"
            />
            <p className="text-[11px] text-gray-500">
              Atur waktu masa depan jika ingin menjadwalkan (*Scheduled*).
            </p>
          </div>

          <AuthorSelector
            author={author}
            selectedAuthorId={authorId}
            onAuthorChange={(name, id) => {
              setAuthor(name);
              setAuthorId(id);
            }}
          />
        </div>
      </div>

      {/* SEKSI 2: GAMBAR SAMPUL (COVER) */}
      <div className="space-y-4 pt-2 border-t border-gray-100">
        <div className="border-b border-gray-100 pb-2">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-gray-500">
            2. Gambar Sampul (Cover)
          </h2>
        </div>

        <CoverImagePicker
          coverUrl={coverUrl}
          onCoverChange={setCoverUrl}
          coverCaption={coverCaption}
          onCaptionChange={setCoverCaption}
          articleTitle={title}
          required
        />

        <div className="space-y-1.5">
          <label className="block text-sm font-bold text-gray-900">
            Keterangan Gambar Cover (Opsional)
          </label>
          <input
            type="text"
            value={coverCaption}
            onChange={(e) => setCoverCaption(e.target.value)}
            placeholder="Contoh: Ilustrasi server AI dan kecerdasan buatan. (Dok. Unsplash)"
            className="w-full px-3.5 sm:px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-xs sm:text-sm"
          />
        </div>
      </div>

      {/* SEKSI 3: RINGKASAN & TAKSONOMI */}
      <div className="space-y-4 pt-2 border-t border-gray-100">
        <div className="border-b border-gray-100 pb-2">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-gray-500">
            3. Ringkasan & Tag
          </h2>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-bold text-gray-900">
              Ringkasan Berita (Excerpt)
            </label>
            <span className="text-[11px] text-gray-400">Otomatis jika kosong</span>
          </div>
          <textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            rows={2}
            placeholder="Ringkasan singkat 1-2 kalimat untuk preview berita di kartu depan..."
            className="w-full px-3.5 sm:px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-xs sm:text-sm leading-relaxed"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-bold text-gray-900">
            Tags / Topik Terkait (Opsional)
          </label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="AI, Software, Machine Learning (pisahkan dengan koma)"
            className="w-full px-3.5 sm:px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-xs sm:text-sm"
          />
        </div>
      </div>

      {/* SEKSI 4: KONTEN BERITA (MARKDOWN EDITOR) */}
      <div className="space-y-3 pt-2 border-t border-gray-100">
        <div className="border-b border-gray-100 pb-2">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-gray-500">
            4. Lembar Konten Berita
          </h2>
        </div>

        {/* Header Toolbar Editor: 2 Tingkat di Layar HP agar Rapi dan Tidak Bertubrukan */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center justify-between sm:justify-start gap-2">
            <label className="block text-sm font-bold text-gray-900">
              Konten Berita (Markdown) <span className="text-red-500">*</span>
            </label>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 border border-gray-200">
              GFM Markdown
            </span>
          </div>

          {/* Action Toolbar: Sisipkan Baca Juga & Tabs Tulis/Pratinjau */}
          <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setShowBacaJugaModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-all shadow-2xs active:scale-95 cursor-pointer whitespace-nowrap"
              title="Pilih dan sisipkan tautan artikel lain ke berita ini"
            >
              <Link2 className="w-3.5 h-3.5 shrink-0" />
              <span>Sisipkan "Baca Juga"</span>
            </button>

            <div className="flex bg-gray-100 p-1 rounded-lg shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('edit')}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'edit' ? 'bg-white shadow-xs text-gray-900' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Tulis</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'preview' ? 'bg-white shadow-xs text-gray-900' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Pratinjau</span>
              </button>
            </div>
          </div>
        </div>

        {activeTab === 'edit' ? (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            rows={14}
            placeholder={`Tulis isi berita dalam format Markdown di sini...\n\nContoh:\n## Sub-judul Pembahasan\nParagraf penjelasan berita...\n\n> **Baca Juga:** [Judul Artikel Lain](/berita/...)\n\n> Kutipan penting narasumber...\n\n- Poin pertama\n- Poin kedua`}
            className="w-full p-3.5 sm:p-4 border border-gray-300 rounded-xl font-mono text-xs sm:text-sm focus:ring-2 focus:ring-gray-900 focus:border-gray-900 leading-relaxed shadow-2xs"
          />
        ) : (
          <div className="w-full min-h-[350px] p-4 sm:p-6 border border-gray-200 rounded-xl bg-gray-50 prose prose-sm max-w-none overflow-y-auto">
            {content ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
              </ReactMarkdown>
            ) : (
              <p className="text-gray-400 italic">Belum ada teks untuk ditampilkan.</p>
            )}
          </div>
        )}
      </div>

      {/* SEKSI 5: TOMBOL AKSI BAWAH */}
      <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={() => router.push('/admin')}
          className="w-full sm:w-auto px-5 py-2.5 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-bold text-xs sm:text-sm text-center transition-colors cursor-pointer"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="w-full sm:w-auto px-6 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-black font-bold text-xs sm:text-sm shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>{isPending ? 'Menyimpan Berita...' : 'Terbitkan Artikel'}</span>
        </button>
      </div>

      <BacaJugaPickerModal
        isOpen={showBacaJugaModal}
        onClose={() => setShowBacaJugaModal(false)}
        onInsert={(snippet) => {
          setContent((prev) => {
            if (!prev) return snippet.trim();
            return `${prev.trimEnd()}${snippet}`;
          });
        }}
      />
    </form>
  );
}
