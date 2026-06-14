import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface ImageGalleryProps {
  images: string[];
}

export default function ImageGallery({ images }: ImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  if (images.length === 0) {
    return (
      <div className="w-80 h-80 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 border border-slate-200">
        <span className="text-sm">暂无图片</span>
      </div>
    );
  }

  const goTo = (index: number) => {
    if (index < 0) index = images.length - 1;
    if (index >= images.length) index = 0;
    setActiveIndex(index);
  };

  return (
    <>
      <div className="space-y-3">
        <div 
          className="relative w-80 h-80 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 cursor-zoom-in group"
          onClick={() => setPreviewImage(images[activeIndex])}
        >
          <img 
            src={images[activeIndex]} 
            alt="" 
            className="w-full h-full object-cover"
          />
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); goTo(activeIndex - 1); }}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); goTo(activeIndex + 1); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
            {activeIndex + 1} / {images.length}
          </div>
        </div>
        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {images.map((img, index) => (
              <div
                key={index}
                onClick={() => setActiveIndex(index)}
                className={`w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer border-2 transition-colors ${
                  index === activeIndex ? 'border-blue-500' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}
      </div>

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
    </>
  );
}
