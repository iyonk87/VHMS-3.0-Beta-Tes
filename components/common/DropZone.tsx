import React, { useCallback, useState, useRef } from 'react';
import type { FileWithPreview } from '../../types';
// FIX: Corrected import to point to the new centralized Icons.tsx file.
import { UploadIcon } from '../icons/Icons';

interface DropZoneProps {
  file: FileWithPreview | null;
  onDrop: (file: FileWithPreview) => void;
  title: string;
  description: string;
  children?: React.ReactNode;
  previewHeightClass?: string;
}

export const DropZone: React.FC<DropZoneProps> = ({ file, onDrop, title, description, children, previewHeightClass = 'h-24' }) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((selectedFile: File) => {
    if (selectedFile && selectedFile.type.startsWith('image/')) {
      const fileWithPreview = Object.assign(selectedFile, {
        preview: URL.createObjectURL(selectedFile),
      });
      onDrop(fileWithPreview);
    }
  }, [onDrop]);

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const onButtonClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // If the click is on a button (like the mask editor button), let that button handle its own event.
    // Otherwise, trigger the file input.
    const target = e.target as HTMLElement;
    if (target.closest('button')) {
      return;
    }
    inputRef.current?.click();
  };

  return (
    <div
      className={`relative p-2 border border-solid rounded-md cursor-pointer transition-colors h-full flex flex-col justify-center
        ${isDragActive ? 'border-amber-500 bg-amber-900/20' : 'border-slate-600 hover:border-slate-500'}`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={onButtonClick}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept="image/*"
        onChange={handleChange}
      />
      
      {file ? (
        <div className={`relative group w-full h-full`}>
            <img src={file.preview} alt={file.name} className="w-full h-full object-cover rounded" />
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded">
                <p className="text-white text-xs font-semibold">Ganti Gambar</p>
            </div>
        </div>
      ) : (
        <div className="text-center flex flex-col items-center justify-center h-full p-1">
          <UploadIcon className="mx-auto h-6 w-6 text-slate-500" />
          <p className="mt-1 text-xs text-slate-400">
            <span className="font-semibold text-amber-400">Klik</span> atau seret
          </p>
        </div>
      )}
      
      <div className="absolute top-1.5 left-1.5 text-left z-10">
        <div className="inline-block">
            <h4 className="text-xs font-semibold text-slate-100 bg-slate-900/70 px-2 py-0.5 rounded backdrop-blur-sm">{title}</h4>
            <p className="text-[10px] text-slate-300 bg-slate-900/70 px-2 py-0.5 mt-1 rounded backdrop-blur-sm">{description}</p>
        </div>
      </div>
      
      <div className="absolute top-2 right-2 z-10">
        {children}
      </div>

    </div>
  );
};
