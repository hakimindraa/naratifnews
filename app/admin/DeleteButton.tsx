'use client';

import { Trash2 } from 'lucide-react';
import { deleteArticle } from './actions';
import { useTransition } from 'react';

export default function DeleteButton({ id, title }: { id: number, title: string }) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (window.confirm(`Yakin ingin menghapus artikel "${title}"?`)) {
      startTransition(async () => {
        await deleteArticle(id);
      });
    }
  };

  return (
    <button 
      onClick={handleDelete}
      disabled={isPending}
      className="text-gray-400 hover:text-red-600 p-2 transition-colors disabled:opacity-50"
      title="Hapus Artikel"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  );
}
