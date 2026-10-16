'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateArticle } from '../../actions';
import { Link2, Eye, Edit3, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import BacaJugaPickerModal from '../../BacaJugaPickerModal';
import CoverImagePicker from '../../CoverImagePicker';
import AuthorSelector from '../../AuthorSelector';

export default function EditForm({ article }: { article: any }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [content, setContent] = useState(article.content || '');
  const [coverUrl, setCoverUrl] = useState(article.coverUrl || '');
  const [coverCaption, setCoverCaption] = useState(article.coverCaption || '');
  const [author, setAuthor] = useState(article.author || 'Redaksi');
  const [authorId, setAuthorId] = useState<number | undefined>(article.authorId || undefined);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [showBacaJugaModal, setShowBacaJugaModal] = useState(false);

  // Format date for datetime-local input (YYYY-MM-DDTHH:mm) in Local Time
  const formatForInput = (dateString: string | Date | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    const formData = new FormData(e.currentTarget);
    formData.set('content', content);
    formData.set('coverUrl', coverUrl);
    formData.set('coverCaption', coverCaption);
    formData.set('author', author);
    if (authorId) {
      formData.set('authorId', String(authorId));
    } else {
      formData.delete('authorId');
    }
    
    startTransition(async () => {
      const result = await updateArticle(article.id, formData);
      if (result.error) {
        setError(result.error);
      } else {
        router.push('/admin');
        router.refresh();
      }
    });
  };

  const initialTags = Array.isArray(article.tags) 
    ? article.tags.join(', ') 
    : (article.tags || '');

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}
      
      {/* Grid Utama (Judul, Slug, Kategori, Waktu, Penulis) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
        <div className="space-y-2 md:col-span-2">
          <label className="block text-sm font-bold text-gray-900">
            Judul Artikel <span className="text-red-500">*</span>
          </label>
          <input 
            type="text" 
            name="title" 
            defaultValue={article.title} 
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
            name="slug" 
            defaultValue={article.slug} 
            required 
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-sm font-mono"
          />
          <p className="text-xs text-gray-500">
            URL: /berita/{(article.category || 'software').toLowerCase()}/{article.id}/[slug]
          </p>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-bold text-gray-900">
            Kategori Berita <span className="text-red-500">*</span>
          </label>
          <select 
            name="category" 
            defaultValue={article.category}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-sm bg-white font-medium"
          >
            {['Software', 'Hardware', 'AI', 'Infrastruktur', 'Gadget', 'Regional'].map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-bold text-gray-900">
            Waktu Tayang (Local Time) <span className="text-red-500">*</span>
          </label>
          <input 
            type="datetime-local" 
            name="publishAt" 
            defaultValue={formatForInput(article.publishAt)}
            required
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-sm"
          />
          <p className="text-xs text-gray-500">
            Atur ke waktu masa depan jika ingin menjadwalkan (Scheduled).
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

      {/* Cover Image & Live Preview */}
      <CoverImagePicker
        coverUrl={coverUrl}
        onCoverChange={setCoverUrl}
        coverCaption={coverCaption}
        onCaptionChange={setCoverCaption}
        articleTitle={article.title}
        name="coverUrl"
        required
      />

      {/* Cover Caption */}
      <div className="space-y-2">
        <label className="block text-sm font-bold text-gray-900">
          Keterangan Gambar Cover (Opsional)
        </label>
        <input 
          type="text" 
          name="coverCaption" 
          value={coverCaption} 
          onChange={(e) => setCoverCaption(e.target.value)}
          placeholder="Contoh: Ilustrasi server AI dan komputasi awan. (Dok. Unsplash)" 
          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-sm"
        />
      </div>

      {/* Cuplikan (Excerpt) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-bold text-gray-900">
            Ringkasan Berita (Excerpt)
          </label>
          <span className="text-xs text-gray-400">Otomatis diambil dari konten jika dikosongkan</span>
        </div>
        <textarea 
          name="excerpt" 
          defaultValue={article.excerpt || ''} 
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
          name="tags" 
          defaultValue={initialTags} 
          placeholder="AI, Software, Machine Learning (pisahkan dengan koma)" 
          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-sm"
        />
      </div>

      {/* Konten Markdown dengan Tab Pratinjau */}
      <div className="space-y-2">
        <div className="flex items-center justify-between pb-1">
          <label className="block text-sm font-bold text-gray-900">
            Konten Berita (Markdown) <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowBacaJugaModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-all shadow-2xs active:scale-95"
              title="Pilih dan sisipkan tautan artikel lain ke berita ini"
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>🔗 Sisipkan "Baca Juga"</span>
            </button>

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
        </div>

        {activeTab === 'edit' ? (
          <textarea 
            name="content" 
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required 
            rows={16}
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
          className="w-full sm:w-auto px-6 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-black font-bold text-sm shadow-sm transition-all disabled:opacity-50"
        >
          {isPending ? 'Menyimpan Perubahan...' : 'Simpan Perubahan'}
        </button>
      </div>

      <BacaJugaPickerModal
        isOpen={showBacaJugaModal}
        onClose={() => setShowBacaJugaModal(false)}
        onInsert={(snippet) => {
          setContent((prev: string) => (prev ? `${prev.trimEnd()}${snippet}` : snippet.trim()));
        }}
      />
    </form>
  );
}
