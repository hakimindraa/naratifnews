'use client';

import { Upload } from "lucide-react";
import { useRef, useState } from "react";
import { uploadMarkdownFile } from "./actions";

export default function UploadButton() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.md')) {
      setMessage({ text: 'Hanya menerima file berformat .md', type: 'error' });
      return;
    }

    setLoading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append('file', file);

    const result = await uploadMarkdownFile(formData);
    
    if (result.error) {
      setMessage({ text: result.error, type: 'error' });
    } else if (result.success) {
      setMessage({ text: result.message || 'Sukses!', type: 'success' });
    }

    setLoading(false);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col items-stretch w-full sm:w-auto">
      <input 
        type="file" 
        accept=".md" 
        ref={fileInputRef} 
        onChange={handleUpload} 
        className="hidden" 
      />
      <button 
        onClick={() => fileInputRef.current?.click()}
        disabled={loading}
        className="inline-flex items-center justify-center gap-1.5 bg-gray-800 hover:bg-black text-white px-3.5 py-2.5 rounded-xl font-bold shadow-xs transition-all disabled:opacity-50 w-full text-xs sm:text-sm cursor-pointer"
      >
        <Upload className="w-4 h-4 shrink-0" />
        <span>{loading ? 'Mengunggah...' : 'Upload .MD File'}</span>
      </button>
      
      {message && (
        <div className={`text-sm font-bold ${message.type === 'error' ? 'text-red-500' : 'text-green-600'}`}>
          {message.text}
        </div>
      )}
    </div>
  );
}
