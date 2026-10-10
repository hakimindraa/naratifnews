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
    <div className="flex flex-col items-end gap-2">
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
        className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-blue-700 transition-all shadow-sm disabled:opacity-50"
      >
        <Upload className="w-5 h-5" />
        {loading ? 'Mengunggah...' : 'Upload .MD File'}
      </button>
      
      {message && (
        <div className={`text-sm font-bold ${message.type === 'error' ? 'text-red-500' : 'text-green-600'}`}>
          {message.text}
        </div>
      )}
    </div>
  );
}
