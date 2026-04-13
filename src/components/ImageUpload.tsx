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
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    upload(file);
  };

  const upload = async (file: File) => {
    setLoading(true);
    setProgress(0);
    try {
      const url = await uploadImage(file, (p) => setProgress(p));
      onChange(url);
    } catch (err) {
      alert('上传失败');
    } finally {
      setLoading(false);
      setProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          upload(file);
          break;
        }
      }
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isMobile) {
      fileInputRef.current?.click();
    } else {
      // Focus the element on click to allow pasting immediately
      (e.currentTarget as HTMLElement).focus();
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
          onClick={handleClick}
          onDoubleClick={(e) => {
            if (!isMobile) {
              // Open file dialog on double click for desktop
              fileInputRef.current?.click();
            }
          }}
          onPaste={handlePaste}
          tabIndex={0}
          className="h-32 w-32 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-slate-500 hover:border-blue-500 hover:text-blue-500 cursor-pointer transition-colors bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-blue-50/30 relative"
        >
          {loading ? (
            <div className="w-full px-2">
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
              </div>
              <span className="text-[10px] text-center block mt-1">{progress}%</span>
            </div>
          ) : (
            <>
              <UploadCloud className="w-6 h-6 mb-2 pointer-events-none" />
              <span className="text-[10px] font-medium px-2 text-center pointer-events-none">
                {isMobile ? '点击上传图片' : <>单击后粘贴<br/>双击上传文件</>}
              </span>
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
