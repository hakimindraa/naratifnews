'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateArticle } from '../../actions';

export default function EditForm({ article }: { article: any }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  // Format date for datetime-local input (YYYY-MM-DDTHH:mm)
  const formatForInput = (dateString: string | Date | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    // Adjust for local timezone offset
    const offset = date.getTimezoneOffset() * 60000;
    const localDate = new Date(date.getTime() - offset);
    return localDate.toISOString().slice(0, 16);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    const formData = new FormData(e.currentTarget);
    
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">{error}</div>}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Judul Artikel</label>
          <input 
            type="text" 
            name="title" 
            defaultValue={article.title} 
            required 
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Slug URL</label>
          <input 
            type="text" 
            name="slug" 
            defaultValue={article.slug} 
            required 
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Kategori</label>
          <select 
            name="category" 
            defaultValue={article.category}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            {['Terbaru', 'Nasional', 'Ekonomi', 'Teknologi', 'Olahraga', 'Hiburan', 'Gaya Hidup'].map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Waktu Terbit (Local Time)</label>
          <input 
            type="datetime-local" 
            name="publishAt" 
            defaultValue={formatForInput(article.publishAt)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Link Cover (Image URL)</label>
        <input 
          type="url" 
          name="coverUrl" 
          defaultValue={article.coverUrl} 
          required 
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Cuplikan (Excerpt)</label>
        <textarea 
          name="excerpt" 
          defaultValue={article.excerpt} 
          rows={2}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Konten Artikel (Markdown)</label>
        <textarea 
          name="content" 
          defaultValue={article.content} 
          required 
          rows={15}
          className="w-full px-4 py-2 border border-gray-300 rounded-md font-mono text-sm focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
        <button 
          type="button" 
          onClick={() => router.push('/admin')}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
        >
          Batal
        </button>
        <button 
          type="submit" 
          disabled={isPending}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
        </button>
      </div>
    </form>
  );
}
