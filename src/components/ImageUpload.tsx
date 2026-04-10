import React, { useState, useRef } from 'react';
import { UploadCloud, X, Loader2 } from 'lucide-react';
import { uploadImage } from '../lib/api';

interface ImageUploadProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
}

export default function ImageUpload({ label, value, onChange }: ImageUploadProps) {
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const url = await uploadImage(file);
      onChange(url);
    } catch (err) {
      alert('上传失败');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      {value ? (
        <div className="relative inline-block">
          <img src={value} alt={label} className="h-32 w-32 object-cover rounded-lg border border-slate-200 shadow-sm" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 hover:bg-red-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="h-32 w-32 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-slate-500 hover:border-blue-500 hover:text-blue-500 cursor-pointer transition-colors bg-slate-50"
        >
          {loading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <>
              <UploadCloud className="w-6 h-6 mb-2" />
              <span className="text-xs font-medium">点击上传</span>
            </>
          )}
        </div>
      )}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFileChange}
      />
    </div>
  );
}
