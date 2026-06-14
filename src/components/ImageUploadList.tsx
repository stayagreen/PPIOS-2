import React, { useState, useRef } from 'react';
import { X, Plus, Loader2, GripVertical } from 'lucide-react';
import { uploadImage } from '../lib/api';

interface ImageUploadListProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxCount?: number;
  label?: string;
  thumbnailSize?: 'sm' | 'md' | 'lg';
}

export default function ImageUploadList({ 
  images, 
  onChange, 
  maxCount, 
  label,
  thumbnailSize = 'md' 
}: ImageUploadListProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
  };
  const sizeClass = sizeClasses[thumbnailSize];

  const handleUpload = async (files: FileList) => {
    setUploading(true);
    setProgress(0);
    try {
      const fileArray = Array.from(files);
      const newUrls: string[] = [];
      for (let i = 0; i < fileArray.length; i++) {
        if (maxCount && images.length + newUrls.length >= maxCount) {
          alert(`最多只能添加${maxCount}张图片`);
          break;
        }
        const url = await uploadImage(fileArray[i], (p) => {
          const totalProgress = Math.round(((i + p / 100) / fileArray.length) * 100);
          setProgress(totalProgress);
        });
        newUrls.push(url);
      }
      if (newUrls.length > 0) {
        onChange([...images, ...newUrls]);
      }
    } catch (err) {
      alert('上传失败');
    } finally {
      setUploading(false);
      setProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleUpload(files);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) {
      e.preventDefault();
      const dt = new DataTransfer();
      files.forEach(f => dt.items.add(f));
      handleUpload(dt.files);
    }
  };

  return (
    <div>
      {label && (
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-slate-700">{label}</span>
          {maxCount && (
            <span className="text-xs text-slate-400">{images.length}/{maxCount}</span>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        {images.map((img, index) => (
          <div
            key={index}
            draggable
            onDragStart={() => setDragIndex(index)}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverIndex(index);
            }}
            onDragEnd={() => {
              if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
                const newImages = [...images];
                const [removed] = newImages.splice(dragIndex, 1);
                newImages.splice(dragOverIndex, 0, removed);
                onChange(newImages);
              }
              setDragIndex(null);
              setDragOverIndex(null);
            }}
            className={`relative group ${sizeClass} rounded-lg overflow-hidden border-2 cursor-move ${
              dragOverIndex === index ? 'border-blue-500' : 'border-slate-200'
            } ${dragIndex === index ? 'opacity-50' : ''}`}
          >
            <img
              src={img}
              alt=""
              className="w-full h-full object-cover"
              onClick={() => setPreviewImage(img)}
            />
            <div className="absolute top-1 left-1 bg-black/50 rounded p-0.5 cursor-grab active:cursor-grabbing">
              <GripVertical className="w-3 h-3 text-white" />
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRemove(index);
              }}
              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        {(!maxCount || images.length < maxCount) && (
          <div
            onClick={() => fileInputRef.current?.click()}
            onPaste={handlePaste}
            tabIndex={0}
            className={`${sizeClass} border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-slate-400 hover:border-blue-500 hover:text-blue-500 cursor-pointer transition-colors bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-blue-50/30 relative`}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-1">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-[10px]">{progress}%</span>
              </div>
            ) : (
              <>
                <Plus className="w-5 h-5 pointer-events-none" />
                <span className="text-[10px] mt-1 pointer-events-none">添加图片</span>
              </>
            )}
          </div>
        )}
      </div>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        multiple
        onChange={handleFileChange}
      />
      {previewImage && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm"
          onClick={() => setPreviewImage(null)}
        >
          <img src={previewImage} alt="" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
          <button className="absolute top-4 right-4 text-white hover:text-slate-300 p-2">
            <X className="w-8 h-8" />
          </button>
        </div>
      )}
    </div>
  );
}
