'use client';

import { Trash2 } from 'lucide-react';
import { deleteArticle } from './actions';
import { useTransition } from 'react';

export default function DeleteButton({ 
  id, 
  title,
  className,
  showText = false
}: { 
  id: number; 
  title: string;
  className?: string;
  showText?: boolean;
}) {
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
      className={className || "text-gray-400 hover:text-red-600 p-2 transition-colors disabled:opacity-50"}
      title="Hapus Artikel"
    >
      <Trash2 className="w-4 h-4 shrink-0" />
      {showText && <span>{isPending ? 'Menghapus...' : 'Hapus'}</span>}
    </button>
  );
}
