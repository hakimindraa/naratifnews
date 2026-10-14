'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createArticle } from '../actions';
import { Eye, Edit3, Image as ImageIcon, Sparkles, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function TulisForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  // Form states
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [category, setCategory] = useState('Software');
  const [coverUrl, setCoverUrl] = useState('');
  const [coverCaption, setCoverCaption] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [author, setAuthor] = useState('Redaksi');
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
    formData.append('coverUrl', coverUrl);
    formData.append('coverCaption', coverCaption);
    formData.append('excerpt', excerpt);
    formData.append('content', content);
    formData.append('publishAt', publishAt);
    formData.append('tags', tags);
    formData.append('author', author);

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
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {/* Grid Utama (Judul, Slug, Kategori, Waktu) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
        <div className="space-y-2 md:col-span-2">
          <label className="block text-sm font-bold text-gray-900">
            Judul Artikel <span className="text-red-500">*</span>
          </label>
          <input 
            type="text" 
            value={title}
            onChange={handleTitleChange}
            placeholder="Contoh: OpenAI Resmi Rilis Model Terbaru dengan Kemampuan..." 
            required 
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-sm sm:text-base font-medium"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-bold text-gray-900">
            Slug URL <span className="text-red-500">*</span>
          </label>
          <input 
            type="text" 
            value={slug}
            onChange={handleSlugChange}
            placeholder="openai-resmi-rilis-model-terbaru" 
            required 
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-sm font-mono"
          />
          <p className="text-xs text-gray-500">
            URL: /berita-teknologi/{category.toLowerCase()}/[id]/{slug || 'judul-artikel'}
          </p>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-bold text-gray-900">
            Kategori Berita <span className="text-red-500">*</span>
          </label>
          <select 
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-sm bg-white font-medium"
          >
            {['Software', 'Hardware', 'AI', 'Infrastruktur', 'Gadget', 'Regional'].map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-bold text-gray-900">
            Waktu Tayang / Publikasi
          </label>
          <input 
            type="datetime-local" 
            value={publishAt}
            onChange={(e) => setPublishAt(e.target.value)}
            required
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-sm"
          />
          <p className="text-xs text-gray-500">
            Atur ke waktu masa depan jika ingin menjadwalkan (*Scheduled*).
          </p>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-bold text-gray-900">
            Penulis (Author)
          </label>
          <input 
            type="text" 
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Redaksi" 
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-sm"
          />
        </div>
      </div>

      {/* Cover Image */}
      <div className="space-y-2">
        <label className="block text-sm font-bold text-gray-900">
          Link Gambar Cover (URL) <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-2">
          <input 
            type="url" 
            value={coverUrl}
            onChange={(e) => setCoverUrl(e.target.value)}
            placeholder="https://images.unsplash.com/... atau link gambar web" 
            required 
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-sm"
          />
        </div>
        {coverUrl && (
          <div className="mt-2 relative w-full max-w-sm aspect-video rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
            <img 
              src={coverUrl} 
              alt="Preview" 
              className="w-full h-full object-cover" 
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
          </div>
        )}
      </div>

      {/* Cover Caption */}
      <div className="space-y-2">
        <label className="block text-sm font-bold text-gray-900">
          Keterangan Gambar Cover (Opsional)
        </label>
        <input 
          type="text" 
          value={coverCaption}
          onChange={(e) => setCoverCaption(e.target.value)}
          placeholder="Contoh: Ilustrasi server AI dan kecerdasan buatan. (Dok. Unsplash)" 
          className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-sm"
        />
      </div>

      {/* Excerpt */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-bold text-gray-900">
            Ringkasan Berita (Excerpt)
          </label>
          <span className="text-xs text-gray-400">Otomatis diambil jika dikosongkan</span>
        </div>
        <textarea 
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          rows={2}
          placeholder="Ringkasan singkat 1-2 kalimat untuk preview berita di kartu depan..."
          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-sm"
        />
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <label className="block text-sm font-bold text-gray-900">
          Tags / Topik Terkait (Opsional)
        </label>
        <input 
          type="text" 
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="AI, Software, Machine Learning (pisahkan dengan koma)" 
          className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-sm"
        />
      </div>

      {/* Konten Markdown dengan Tab Pratinjau */}
      <div className="space-y-2">
        <div className="flex items-center justify-between pb-1">
          <label className="block text-sm font-bold text-gray-900">
            Konten Berita (Markdown) <span className="text-red-500">*</span>
          </label>
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveTab('edit')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all ${
                activeTab === 'edit' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              Tulis
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all ${
                activeTab === 'preview' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Pratinjau
            </button>
          </div>
        </div>

        {activeTab === 'edit' ? (
          <textarea 
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required 
            rows={14}
            placeholder={`Tulis isi berita dalam format Markdown di sini...\n\nContoh:\n## Sub-judul Pembahasan\nParagraf penjelasan berita...\n\n> Kutipan penting narasumber...\n\n- Poin pertama\n- Poin kedua`}
            className="w-full p-4 border border-gray-300 rounded-xl font-mono text-sm focus:ring-2 focus:ring-gray-900 focus:border-gray-900 leading-relaxed"
          />
        ) : (
          <div className="w-full min-h-[350px] p-6 border border-gray-200 rounded-xl bg-gray-50 prose prose-sm max-w-none overflow-y-auto">
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

      {/* Tombol Aksi Bawah */}
      <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-6 border-t border-gray-200">
        <button 
          type="button" 
          onClick={() => router.push('/admin')}
          className="w-full sm:w-auto px-5 py-2.5 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-bold text-sm text-center transition-colors"
        >
          Batal
        </button>
        <button 
          type="submit" 
          disabled={isPending}
          className="w-full sm:w-auto px-6 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-black font-bold text-sm shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          {isPending ? 'Menyimpan Berita...' : 'Terbitkan Artikel'}
        </button>
      </div>
    </form>
  );
}
