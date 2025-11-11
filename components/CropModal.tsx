import React, { useState, useRef, useEffect, useCallback } from 'react';
// FIX: Corrected import to point to the new centralized Icons.tsx file.
import { CropIcon } from './icons/Icons';

interface CropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  onApply: (croppedDataUrl: string) => void;
}

interface Point { x: number; y: number; }
interface Rect { x: number; y: number; width: number; height: number; }

const HANDLE_SIZE = 12;
const MIN_CROP_SIZE = 1; // Allows for very small, flexible crops.

type Handle = 'topLeft' | 'top' | 'topRight' | 'left' | 'right' | 'bottomLeft' | 'bottom' | 'bottomRight' | 'move';

/**
 * RE-ENGINEERED v8: Refactored core logic for maximum stability and clarity.
 * Addresses bugs related to axis-specific resizing failures by using a more robust state management flow.
 * FEATURE: Hold Shift to lock aspect ratio.
 */
export const CropModal: React.FC<CropModalProps> = ({ isOpen, onClose, imageSrc, onApply }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [crop, setCrop] = useState<Rect>({ x: 20, y: 20, width: 150, height: 150 });
  const activeHandleRef = useRef<Handle | null>(null);
  const dragStartRef = useRef<{ pointer: Point, crop: Rect, aspect: number } | null>(null);

  // --- Drawing Logic ---
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image || !image.complete) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.beginPath();
    ctx.rect(0, 0, canvas.width, canvas.height);
    ctx.rect(crop.x, crop.y, crop.width, crop.height);
    ctx.fill('evenodd');
    
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.strokeRect(crop.x, crop.y, crop.width, crop.height);
    
    ctx.fillStyle = '#f59e0b';
    const half = HANDLE_SIZE / 2;
    const handles = {
      topLeft:     { x: crop.x - half, y: crop.y - half },
      top:         { x: crop.x + crop.width / 2 - half, y: crop.y - half },
      topRight:    { x: crop.x + crop.width - half, y: crop.y - half },
      left:        { x: crop.x - half, y: crop.y + crop.height / 2 - half },
      right:       { x: crop.x + crop.width - half, y: crop.y + crop.height / 2 - half },
      bottomLeft:  { x: crop.x - half, y: crop.y + crop.height - half },
      bottom:      { x: crop.x + crop.width / 2 - half, y: crop.y + crop.height - half },
      bottomRight: { x: crop.x + crop.width - half, y: crop.y + crop.height - half },
    };
    Object.values(handles).forEach(handle => {
      ctx.fillRect(handle.x, handle.y, HANDLE_SIZE, HANDLE_SIZE);
    });
  }, [crop]);
  
  // --- Initialization ---
  useEffect(() => {
    if (!isOpen) return;
    const image = new Image();
    image.src = imageSrc;
    imageRef.current = image;

    image.onload = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const contW = container.clientWidth;
      const contH = container.clientHeight;
      const imgRatio = image.naturalWidth / image.naturalHeight;
      const contRatio = contW / contH;
      
      let canvasWidth, canvasHeight;
      if (imgRatio > contRatio) {
        canvasWidth = contW;
        canvasHeight = contW / imgRatio;
      } else {
        canvasHeight = contH;
        canvasWidth = contH * imgRatio;
      }
      
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      
      const initialSize = Math.min(canvasWidth, canvasHeight) * 0.75;
      setCrop({
        x: (canvasWidth - initialSize) / 2,
        y: (canvasHeight - initialSize) / 2,
        width: initialSize,
        height: initialSize
      });
    };
  }, [isOpen, imageSrc]);

  useEffect(() => {
    requestAnimationFrame(draw);
  }, [crop, draw]);

  // --- Interaction Logic (RE-ENGINEERED) ---

  const getPointerPos = (e: React.PointerEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };
  
  const getHandleAtPosition = (pos: Point): Handle | null => {
      const half = HANDLE_SIZE / 2;
      const handles = {
          topLeft:     { x: crop.x - half, y: crop.y - half },
          top:         { x: crop.x + crop.width / 2 - half, y: crop.y - half },
          topRight:    { x: crop.x + crop.width - half, y: crop.y - half },
          left:        { x: crop.x - half, y: crop.y + crop.height / 2 - half },
          right:       { x: crop.x + crop.width - half, y: crop.y + crop.height / 2 - half },
          bottomLeft:  { x: crop.x - half, y: crop.y + crop.height - half },
          bottom:      { x: crop.x + crop.width / 2 - half, y: crop.y + crop.height - half },
          bottomRight: { x: crop.x + crop.width - half, y: crop.y + crop.height - half },
      };

      for (const [name, rectPos] of Object.entries(handles)) {
          if (pos.x >= rectPos.x && pos.x <= rectPos.x + HANDLE_SIZE && pos.y >= rectPos.y && pos.y <= rectPos.y + HANDLE_SIZE) {
              return name as Handle;
          }
      }
      if (pos.x >= crop.x && pos.x <= crop.x + crop.width && pos.y >= crop.y && pos.y <= crop.y + crop.height) {
          return 'move';
      }
      return null;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    const pos = getPointerPos(e);
    const handle = getHandleAtPosition(pos);
    if (handle) {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      activeHandleRef.current = handle;
      dragStartRef.current = { pointer: pos, crop, aspect: crop.width / crop.height };
    }
  };
  
  const handlePointerMove = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const pos = getPointerPos(e);
    const activeHandle = activeHandleRef.current;

    // Update cursor style on hover when not dragging
    if (!activeHandle) {
      const handle = getHandleAtPosition(pos);
      if (!handle) canvas.style.cursor = 'default';
      else if (handle === 'move') canvas.style.cursor = 'move';
      else if (handle === 'topLeft' || handle === 'bottomRight') canvas.style.cursor = 'nwse-resize';
      else if (handle === 'topRight' || handle === 'bottomLeft') canvas.style.cursor = 'nesw-resize';
      else if (handle === 'top' || handle === 'bottom') canvas.style.cursor = 'ns-resize';
      else if (handle === 'left' || handle === 'right') canvas.style.cursor = 'ew-resize';
      return;
    }

    // Perform drag/resize logic
    if (dragStartRef.current) {
      const { pointer: startPointer, crop: startCrop, aspect } = dragStartRef.current;
      const dx = pos.x - startPointer.x;
      const dy = pos.y - startPointer.y;
      
      let newCrop = { ...startCrop };

      // 1. Direct Manipulation using a clear switch statement
      switch(activeHandle) {
        case 'topLeft':     newCrop = { x: startCrop.x + dx, y: startCrop.y + dy, width: startCrop.width - dx, height: startCrop.height - dy }; break;
        case 'top':         newCrop = { ...startCrop, y: startCrop.y + dy, height: startCrop.height - dy }; break;
        case 'topRight':    newCrop = { ...startCrop, y: startCrop.y + dy, width: startCrop.width + dx, height: startCrop.height - dy }; break;
        case 'left':        newCrop = { ...startCrop, x: startCrop.x + dx, width: startCrop.width - dx }; break;
        case 'right':       newCrop = { ...startCrop, width: startCrop.width + dx }; break;
        case 'bottomLeft':  newCrop = { ...startCrop, x: startCrop.x + dx, width: startCrop.width - dx, height: startCrop.height + dy }; break;
        case 'bottom':      newCrop = { ...startCrop, height: startCrop.height + dy }; break;
        case 'bottomRight': newCrop = { ...startCrop, width: startCrop.width + dx, height: startCrop.height + dy }; break;
        case 'move':        newCrop = { ...startCrop, x: startCrop.x + dx, y: startCrop.y + dy }; break;
      }
      
      // 2. Aspect Ratio Lock (if shift is held)
      if (e.shiftKey && activeHandle !== 'move') {
        if (activeHandle.includes('Left') || activeHandle.includes('Right')) {
            const newHeight = newCrop.width / aspect;
            if(activeHandle.includes('Top')) newCrop.y += newCrop.height - newHeight;
            newCrop.height = newHeight;
        } else {
            const newWidth = newCrop.height * aspect;
            if(activeHandle.includes('Left')) newCrop.x += newCrop.width - newWidth;
            newCrop.width = newWidth;
        }
      }

      // 3. Sequential Correction
      // Correct for inversion (dragging a side past its opposite)
      if (newCrop.width < 0) {
        newCrop.x = newCrop.x + newCrop.width;
        newCrop.width = Math.abs(newCrop.width);
      }
      if (newCrop.height < 0) {
        newCrop.y = newCrop.y + newCrop.height;
        newCrop.height = Math.abs(newCrop.height);
      }
      
      // Correct for min size
      if (newCrop.width < MIN_CROP_SIZE) newCrop.width = MIN_CROP_SIZE;
      if (newCrop.height < MIN_CROP_SIZE) newCrop.height = MIN_CROP_SIZE;

      // Correct for canvas boundaries
      newCrop.x = Math.max(0, newCrop.x);
      newCrop.y = Math.max(0, newCrop.y);
      if(newCrop.x + newCrop.width > canvas.width) newCrop.width = canvas.width - newCrop.x;
      if(newCrop.y + newCrop.height > canvas.height) newCrop.height = canvas.height - newCrop.y;

      setCrop(newCrop);
    }
  };
  
  const handlePointerUp = (e: React.PointerEvent) => {
    if(activeHandleRef.current){
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      activeHandleRef.current = null;
    }
  };
  
  const handleApplyCrop = () => {
    const image = imageRef.current;
    const canvas = canvasRef.current;
    if (!image || !canvas) return;

    const scaleX = image.naturalWidth / canvas.width;
    const scaleY = image.naturalHeight / canvas.height;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = crop.width * scaleX;
    tempCanvas.height = crop.height * scaleY;
    const tempCtx = tempCanvas.getContext('2d');
    
    if (tempCtx) {
      tempCtx.imageSmoothingEnabled = true;
      tempCtx.imageSmoothingQuality = 'high';
      tempCtx.drawImage(
        image,
        crop.x * scaleX, crop.y * scaleY,
        crop.width * scaleX, crop.height * scaleY,
        0, 0,
        tempCanvas.width, tempCanvas.height
      );
      onApply(tempCanvas.toDataURL('image/png'));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-50 p-2 sm:p-4 animate-fade-in-fast" onPointerDown={onClose}>
      <div className="bg-slate-800 border border-slate-700 p-3 rounded-lg shadow-xl w-full max-w-4xl h-full max-h-[90vh] flex flex-col" onPointerDown={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-3 text-white">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <CropIcon className="w-5 h-5 text-amber-400" />
            Krop Gambar Outfit
          </h3>
          <p className="text-sm text-slate-400 hidden md:block">Tahan <kbd className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500">Shift</kbd> untuk mengunci aspek rasio</p>
        </div>
        
        <div ref={containerRef} className="flex-grow w-full min-h-0 flex items-center justify-center bg-black/50 rounded overflow-hidden touch-none">
          <canvas 
            ref={canvasRef}
            className="touch-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />
        </div>

        <div className="mt-3 pt-3 border-t border-slate-700 flex justify-end items-center">
          <button onClick={onClose} className="text-slate-300 px-4 py-2 rounded-md hover:bg-slate-700 mr-2 font-semibold">
            Batal
          </button>
          <button onClick={handleApplyCrop} className="bg-amber-500 text-slate-900 px-6 py-2 rounded-md hover:bg-amber-600 font-semibold">
            Terapkan Krop
          </button>
        </div>
      </div>
      <style>{`
        @keyframes fadeInFast { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in-fast { animation: fadeInFast 0.2s ease-out forwards; }
        .touch-none { touch-action: none; }
      `}</style>
    </div>
  );
};
