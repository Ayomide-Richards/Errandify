import React, { useRef, useState } from 'react';
import type { ProductImage } from '../../types/product';
import { UploadCloud, X, Star, ArrowLeft, ArrowRight, AlertCircle } from 'lucide-react';

interface ImageUploaderProps {
  images: ProductImage[];
  onChange: (images: ProductImage[]) => void;
  maxFiles?: number;
  maxSizeMb?: number;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  images,
  onChange,
  maxFiles = 8,
  maxSizeMb = 5,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

  const processFiles = (files: FileList | File[]) => {
    setErrorMessage(null);
    const validFiles: File[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!allowedTypes.includes(file.type)) {
        setErrorMessage(`"${file.name}" has an unsupported format. Please upload JPG, PNG, or WebP.`);
        return;
      }
      if (file.size > maxSizeMb * 1024 * 1024) {
        setErrorMessage(`"${file.name}" exceeds the maximum size of ${maxSizeMb}MB.`);
        return;
      }
      validFiles.push(file);
    }

    if (images.length + validFiles.length > maxFiles) {
      setErrorMessage(`You can upload a maximum of ${maxFiles} images per product.`);
      return;
    }

    if (validFiles.length === 0) return;

    // Simulate upload feedback with progress
    setIsUploading(true);
    setUploadProgress(20);

    const timer = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 95) {
          clearInterval(timer);
          return 95;
        }
        return prev + 25;
      });
    }, 100);

    setTimeout(() => {
      clearInterval(timer);
      const newImages: ProductImage[] = validFiles.map((file, idx) => ({
        id: `img-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        url: URL.createObjectURL(file),
        name: file.name,
        size: file.size,
        isPrimary: images.length === 0 && idx === 0,
      }));

      // Ensure at least one primary image
      let updated = [...images, ...newImages];
      if (!updated.some((img) => img.isPrimary) && updated.length > 0) {
        updated[0].isPrimary = true;
      }

      onChange(updated);
      setIsUploading(false);
      setUploadProgress(0);
    }, 600);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      // Reset input value so same file can be re-selected if deleted
      e.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleRemove = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = images.filter((img) => img.id !== id);
    // If we removed the primary image, make the first remaining image primary
    if (filtered.length > 0 && !filtered.some((img) => img.isPrimary)) {
      filtered[0].isPrimary = true;
    }
    onChange(filtered);
  };

  const handleSetPrimary = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = images.map((img) => ({
      ...img,
      isPrimary: img.id === id,
    }));
    onChange(updated);
  };

  const handleMove = (index: number, direction: 'left' | 'right', e: React.MouseEvent) => {
    e.stopPropagation();
    const newIndex = direction === 'left' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= images.length) return;

    const copy = [...images];
    const temp = copy[index];
    copy[index] = copy[newIndex];
    copy[newIndex] = temp;
    onChange(copy);
  };

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all duration-150 flex flex-col items-center justify-center ${
          isDragging
            ? 'border-[#5E17EB] bg-[#F5F2FE]'
            : 'border-slate-200 hover:border-[#5E17EB]/60 hover:bg-slate-50/50 bg-white'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp,image/jpg"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="w-14 h-14 rounded-full bg-[#F3EFFE] text-[#5E17EB] flex items-center justify-center mb-3.5 shadow-sm">
          <UploadCloud className="w-7 h-7" />
        </div>

        <p className="text-sm font-semibold text-slate-800">
          <span className="text-[#5E17EB] hover:underline">Click to upload</span> or drag and drop
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Supports PNG, JPG, JPEG, and WebP (Up to {maxSizeMb}MB each, max {maxFiles} images)
        </p>

        {isUploading && (
          <div className="w-full max-w-xs mt-4">
            <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
              <span>Uploading images...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-[#5E17EB] h-full transition-all duration-200"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Validation Alert */}
      {errorMessage && (
        <div className="flex items-center gap-2 p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Image Preview Grid */}
      {images.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              {images.length} of {maxFiles} uploaded • First image is primary storefront display
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {images.map((img, index) => (
              <div
                key={img.id}
                className={`group relative rounded-xl border-2 overflow-hidden bg-slate-100 aspect-square shadow-sm transition-all ${
                  img.isPrimary
                    ? 'border-[#5E17EB] ring-2 ring-[#5E17EB]/20'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <img
                  src={img.url}
                  alt={img.name || `Product image ${index + 1}`}
                  className="w-full h-full object-cover"
                />

                {/* Primary Badge */}
                {img.isPrimary ? (
                  <div className="absolute top-1.5 left-1.5 bg-[#5E17EB] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                    <Star className="w-2.5 h-2.5 fill-current" />
                    Primary
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => handleSetPrimary(img.id, e)}
                    className="absolute top-1.5 left-1.5 opacity-0 group-hover:opacity-100 bg-black/60 hover:bg-[#5E17EB] text-white text-[10px] font-medium px-1.5 py-0.5 rounded-md backdrop-blur-xs transition-opacity"
                    title="Set as primary thumbnail"
                  >
                    Set Primary
                  </button>
                )}

                {/* Top-Right Delete Action */}
                <button
                  type="button"
                  onClick={(e) => handleRemove(img.id, e)}
                  className="absolute top-1.5 right-1.5 p-1 bg-black/60 hover:bg-red-600 text-white rounded-full opacity-80 group-hover:opacity-100 transition-colors shadow-sm"
                  aria-label="Remove image"
                >
                  <X className="w-3.5 h-3.5" />
                </button>

                {/* Bottom Reorder Controls */}
                <div className="absolute bottom-1.5 inset-x-1.5 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={(e) => handleMove(index, 'left', e)}
                    className="p-1 bg-black/60 hover:bg-black/90 text-white rounded-md disabled:opacity-30 disabled:pointer-events-none"
                    title="Move left"
                  >
                    <ArrowLeft className="w-3 h-3" />
                  </button>
                  <span className="text-[10px] text-white bg-black/60 px-1.5 py-0.5 rounded-md font-mono">
                    #{index + 1}
                  </span>
                  <button
                    type="button"
                    disabled={index === images.length - 1}
                    onClick={(e) => handleMove(index, 'right', e)}
                    className="p-1 bg-black/60 hover:bg-black/90 text-white rounded-md disabled:opacity-30 disabled:pointer-events-none"
                    title="Move right"
                  >
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
