import React, { useRef, useEffect, useState, useCallback } from 'react';
// FIX: Corrected import to point to the new centralized Icons.tsx file.
import { BrushIcon, TrashIcon, MagicWandIcon, InfoCircleIcon, EraserIcon } from './icons/Icons';
import { generateObjectMask } from '../services/geminiService';
import type { FileWithPreview } from '../types';
import { Tooltip } from './common/Tooltip';


type Tool = 'brush' | 'eraser';

interface Transform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

interface MaskEditorProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  onApply: (maskDataUrl: string) => void;
  occlusionSuggestion: string;
  sceneImage: FileWithPreview;
}

const HISTORY_LIMIT = 30;

// RE-ENGINEERED: A more stable and reliable Mask Editor component.
export const MaskEditor: React.FC<MaskEditorProps> = ({ 
  isOpen, 
  onClose, 
  imageSrc, 
  onApply,
  occlusionSuggestion,
  sceneImage,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null); // Hidden canvas for B&W mask data
  const imageRef = useRef<HTMLImageElement | null>(null);
  
  const [tool, setTool] = useState<Tool>('brush');
  const [brushSize, setBrushSize] = useState(40);
  const [feather, setFeather] = useState(25); // NEW: State for feathering/softness
  const [transform, setTransform] = useState<Transform>({ scale: 1, offsetX: 0, offsetY: 0 });
  const [cursorStyle, setCursorStyle] = useState('crosshair');
  const [isAutoMasking, setIsAutoMasking] = useState<boolean>(false);
  const [autoMaskMessage, setAutoMaskMessage] = useState<{ text: string; type: 'info' | 'error' | 'success' } | null>(null);
  
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const isDrawingRef = useRef(false);
  const isPanningRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // --- Core Drawing and Rendering ---

  const redrawDisplay = useCallback(() => {
    const displayCanvas = displayCanvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    const image = imageRef.current;
    if (!displayCanvas || !maskCanvas || !image) return;

    const ctx = displayCanvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
    
    ctx.translate(transform.offsetX, transform.offsetY);
    ctx.scale(transform.scale, transform.scale);

    ctx.drawImage(image, 0, 0);

    ctx.globalAlpha = 0.5;
    ctx.globalCompositeOperation = 'source-atop';
    ctx.drawImage(maskCanvas, 0, 0);
    ctx.fillStyle = '#f59e0b'; // Amber color
    ctx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
    
    ctx.restore();
  }, [transform]);

  useEffect(() => {
    const size = brushSize * transform.scale;
    const cursorSvg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><circle cx="${size/2}" cy="${size/2}" r="${size/2 - 1}" fill="none" stroke="${tool === 'brush' ? '#f59e0b' : 'red'}" stroke-width="2"/></svg>`;
    const newCursor = `url('data:image/svg+xml;base64,${btoa(cursorSvg)}') ${size/2} ${size/2}, crosshair`;
    setCursorStyle(newCursor);
  }, [tool, brushSize, transform.scale]);

  // --- History Management ---

  const pushHistory = useCallback(() => {
    const maskCanvas = maskCanvasRef.current;
    const maskCtx = maskCanvas?.getContext('2d');
    if (!maskCanvas || !maskCtx) return;

    // Use functional updates to prevent stale state issues in callbacks
    setHistory(prevHistory => {
        const newHistory = prevHistory.slice(0, historyIndex + 1);
        const currentImageData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
        newHistory.push(currentImageData);

        if (newHistory.length > HISTORY_LIMIT) {
          newHistory.shift();
        }
        setHistoryIndex(newHistory.length - 1);
        return newHistory;
    });
  }, [historyIndex]);

  const applyHistoryState = useCallback((index: number) => {
    const maskCanvas = maskCanvasRef.current;
    const maskCtx = maskCanvas?.getContext('2d');
    if (!maskCanvas || !maskCtx || !history[index]) return;
    
    maskCtx.putImageData(history[index], 0, 0);
    redrawDisplay();
  }, [history, redrawDisplay]);
  
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      applyHistoryState(newIndex);
    }
  }, [historyIndex, applyHistoryState]);
  
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      applyHistoryState(newIndex);
    }
  }, [historyIndex, history.length, applyHistoryState]);

  // --- Initialization and Reset ---

  useEffect(() => {
    // FIX: This effect now correctly handles the entire setup process when the editor is opened.
    if (!isOpen) {
      imageRef.current = null; // Clear image ref when closed
      setAutoMaskMessage(null); // Clear messages when closed
      return;
    }
    
    const displayCanvas = displayCanvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    const container = containerRef.current;
    if (!imageSrc || !displayCanvas || !maskCanvas || !container) return;

    const img = new Image();
    // FIX: Removed `crossOrigin` attribute which fails for data: URLs.
    img.src = imageSrc;
    img.onload = () => {
      imageRef.current = img;
      
      displayCanvas.width = img.naturalWidth;
      displayCanvas.height = img.naturalHeight;
      maskCanvas.width = img.naturalWidth;
      maskCanvas.height = img.naturalHeight;
      
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      const scale = Math.min(containerWidth / img.naturalWidth, containerHeight / img.naturalHeight, 1);
      const offsetX = (containerWidth - img.naturalWidth * scale) / 2;
      const offsetY = (containerHeight - img.naturalHeight * scale) / 2;

      setTransform({ scale, offsetX, offsetY });
      
      const maskCtx = maskCanvas.getContext('2d');
      if (maskCtx) {
        maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
        // Set the initial state for undo history
        const initialImageData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
        setHistory([initialImageData]);
        setHistoryIndex(0);
      }
    };
    img.onerror = () => {
        console.error("[EDITOR MASK]: Gagal memuat gambar scene di dalam editor. Pastikan URL gambar valid.");
    }
  }, [isOpen, imageSrc]); // Dependencies are now minimal and correct.

  useEffect(() => {
    if (isOpen && imageRef.current) {
        redrawDisplay();
    }
  }, [transform, redrawDisplay, isOpen]);
  
  // --- Event Handlers ---

  const handleAutoMask = useCallback(async () => {
    if (!occlusionSuggestion) return;
    
    setIsAutoMasking(true);
    setAutoMaskMessage({ text: `Meminta AI untuk membuat mask dari deskripsi: "${occlusionSuggestion}"... Ini mungkin butuh beberapa detik.`, type: 'info' });

    try {
      const maskDataUrl = await generateObjectMask(sceneImage, occlusionSuggestion);
      
      const maskImage = new Image();
      maskImage.src = maskDataUrl;
      maskImage.onload = () => {
        const maskCanvas = maskCanvasRef.current;
        const maskCtx = maskCanvas?.getContext('2d');
        if (maskCanvas && maskCtx) {
          maskCtx.globalCompositeOperation = 'source-over';
          maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
          maskCtx.drawImage(maskImage, 0, 0, maskCanvas.width, maskCanvas.height);
          redrawDisplay();
          pushHistory();
          setAutoMaskMessage({ text: "Auto-Mask berhasil diterapkan!", type: 'success' });
          setTimeout(() => setAutoMaskMessage(null), 4000);
          console.log("[EDITOR MASK]: Masker yang dihasilkan AI berhasil diterapkan ke kanvas.");
        }
      };
      maskImage.onerror = () => {
        throw new Error("Gagal memuat gambar masker yang dihasilkan AI.");
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan tidak diketahui.';
      console.error("[EDITOR MASK]: Gagal membuat masker otomatis:", error);
      setAutoMaskMessage({ text: `Gagal membuat masker: ${errorMessage}`, type: 'error' });
    } finally {
      setIsAutoMasking(false);
    }
  }, [sceneImage, occlusionSuggestion, redrawDisplay, pushHistory]);

  const getCanvasCoords = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const canvas = displayCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - transform.offsetX) / transform.scale,
      y: (e.clientY - rect.top - transform.offsetY) / transform.scale,
    };
  }, [transform]);

  // UPGRADED: drawOnMask now supports feathering
  const drawOnMask = useCallback((startPos: { x: number; y: number }, endPos: { x: number; y: number }) => {
    const maskCtx = maskCanvasRef.current?.getContext('2d');
    if (!maskCtx) return;
    
    maskCtx.globalCompositeOperation = tool === 'brush' ? 'source-over' : 'destination-out';

    if (feather === 0) {
      // --- HARD BRUSH LOGIC (Efficient) ---
      maskCtx.strokeStyle = 'white';
      maskCtx.fillStyle = 'white';
      maskCtx.lineWidth = brushSize;
      maskCtx.lineCap = 'round';
      maskCtx.lineJoin = 'round';
      
      if (startPos.x === endPos.x && startPos.y === endPos.y) {
         maskCtx.beginPath();
         maskCtx.arc(startPos.x, startPos.y, brushSize / 2, 0, Math.PI * 2);
         maskCtx.fill();
      } else {
          maskCtx.beginPath();
          maskCtx.moveTo(startPos.x, startPos.y);
          maskCtx.lineTo(endPos.x, endPos.y);
          maskCtx.stroke();
      }
    } else {
      // --- FEATHERED BRUSH LOGIC (Stamping) ---
      const dist = Math.hypot(endPos.x - startPos.x, endPos.y - startPos.y);
      const angle = Math.atan2(endPos.y - startPos.y, endPos.x - startPos.x);
      
      const step = Math.max(1, brushSize / 8); // Smaller step for smoother feathering

      for (let i = 0; i < dist; i += step) {
          const x = startPos.x + (Math.cos(angle) * i);
          const y = startPos.y + (Math.sin(angle) * i);
          
          const gradient = maskCtx.createRadialGradient(x, y, 0, x, y, brushSize / 2);
          const featherStop = Math.max(0.01, 1 - feather / 100);
          gradient.addColorStop(featherStop, 'white');
          gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
          
          maskCtx.fillStyle = gradient;
          maskCtx.beginPath();
          maskCtx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
          maskCtx.fill();
      }
      
      // Stamp at the very end position to ensure completeness
      const x = endPos.x;
      const y = endPos.y;
      const gradient = maskCtx.createRadialGradient(x, y, 0, x, y, brushSize / 2);
      const featherStop = Math.max(0.01, 1 - feather / 100); // Using 0.01 to avoid potential rendering glitches with 0
      gradient.addColorStop(featherStop, 'white');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      maskCtx.fillStyle = gradient;
      maskCtx.beginPath();
      maskCtx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      maskCtx.fill();
    }
  }, [tool, brushSize, feather]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.pointerType === 'mouse' && (e.button === 1 || e.altKey || e.metaKey || e.ctrlKey)) {
      isPanningRef.current = true;
    } else {
      isDrawingRef.current = true;
    }
    const coords = getCanvasCoords(e);
    lastPosRef.current = coords;
    drawOnMask(coords, coords);
    redrawDisplay();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (isPanningRef.current) {
        const currentCoords = getCanvasCoords(e);
        const dx = (e.clientX - lastPosRef.current.x);
        const dy = (e.clientY - lastPosRef.current.y);
        setTransform(t => ({ ...t, offsetX: t.offsetX + dx, offsetY: t.offsetY + dy }));
        lastPosRef.current = {x: e.clientX, y: e.clientY}; // For panning, use client coords
    } else if (isDrawingRef.current) {
      const start = lastPosRef.current;
      const end = getCanvasCoords(e);
      drawOnMask(start, end);
      redrawDisplay();
      lastPosRef.current = end;
    }
  };

  const handlePointerUp = () => {
    if (isDrawingRef.current) {
        pushHistory();
    }
    isDrawingRef.current = false;
    isPanningRef.current = false;
  };
  
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const canvas = displayCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const scaleAmount = 1.1;
    const newScale = e.deltaY < 0 ? transform.scale * scaleAmount : transform.scale / scaleAmount;
    
    const newOffsetX = mouseX - (mouseX - transform.offsetX) * (newScale / transform.scale);
    const newOffsetY = mouseY - (mouseY - transform.offsetY) * (newScale / transform.scale);

    setTransform({ scale: newScale, offsetX: newOffsetX, offsetY: newOffsetY });
  };
  
  const handleClear = () => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    const maskCtx = maskCanvas.getContext('2d');
    if (maskCtx) {
      maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
      redrawDisplay();
      pushHistory();
    }
     console.log("[EDITOR MASK]: Masker telah dibersihkan.");
  };

  const handleApply = () => {
    const maskCanvas = maskCanvasRef.current;
    if (maskCanvas) {
      const maskDataUrl = maskCanvas.toDataURL('image/png');
      console.log("[EDITOR MASK]: Masker berhasil dibuat dan diekspor. Mengirim data URL ke aplikasi utama...");
      onApply(maskDataUrl);
    } else {
      console.error("[EDITOR MASK]: Referensi kanvas masker tidak ditemukan. Gagal menyimpan masker.");
    }
  };


  if (!isOpen) return null;

  const autoMaskTooltip = !occlusionSuggestion 
    ? "Jalankan 'Analisis AI' di panel utama untuk mengaktifkan fitur ini. Auto-Mask memerlukan 'Saran Penempatan Oklusi'." 
    : `Buat mask otomatis untuk: "${occlusionSuggestion}"`;

  return (
    <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-50 p-2 sm:p-4 animate-fade-in-fast" onMouseDown={onClose}>
      <div className="bg-slate-800 border border-slate-700 p-3 rounded-lg shadow-xl w-full h-full flex flex-col" onMouseDown={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex justify-between items-center mb-3 text-white flex-wrap gap-2">
          <h3 className="text-lg font-semibold">Editor Interaction Mask</h3>
          <p className="text-sm text-slate-400 hidden md:block">Lukis area interaksi | Scroll: Zoom, Tahan Alt/Ctrl: Pan</p>
        </div>
        
        {/* UPGRADED: Toolbar now includes Feathering controls */}
        <div className="bg-slate-900/50 p-2 rounded-md flex items-center justify-between flex-wrap gap-3 mb-3 border border-slate-700">
            <div className="flex items-center gap-2 flex-wrap">
                <button onClick={() => setTool('brush')} className={`p-2 rounded-md ${tool === 'brush' ? 'bg-amber-500 text-slate-900' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`} title="Brush Tool"><BrushIcon className="w-5 h-5"/></button>
                <button onClick={() => setTool('eraser')} className={`p-2 rounded-md ${tool === 'eraser' ? 'bg-amber-500 text-slate-900' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`} title="Eraser Tool"><EraserIcon className="w-5 h-5"/></button>
                <div className="h-6 w-px bg-slate-600 mx-2"></div>
                <button onClick={handleUndo} disabled={historyIndex <= 0} className="p-2 rounded-md bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-50" title="Undo">↶</button>
                <button onClick={handleRedo} disabled={historyIndex >= history.length - 1} className="p-2 rounded-md bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-50" title="Redo">↷</button>
                 <div className="h-6 w-px bg-slate-600 mx-2"></div>
                <button onClick={handleClear} className="p-2 rounded-md bg-slate-700 text-slate-300 hover:bg-slate-600" title="Clear Mask"><TrashIcon className="w-5 h-5"/></button>
                 <div className="h-6 w-px bg-slate-600 mx-2"></div>
                <Tooltip text={autoMaskTooltip}>
                  {/* The div wrapper is necessary for the tooltip to work on a disabled button */}
                  <div>
                    <button onClick={handleAutoMask} disabled={isAutoMasking || !occlusionSuggestion} className="p-2 rounded-md bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2" >
                        <MagicWandIcon className="w-5 h-5"/>
                        {isAutoMasking ? 'Memproses...' : 'Auto-Mask'}
                    </button>
                  </div>
                </Tooltip>
            </div>
             <div className="flex items-center gap-x-4 gap-y-2 flex-wrap justify-end">
                <div className="flex items-center gap-2 text-white text-sm">
                    <label htmlFor="brushSize">Ukuran:</label>
                    <input type="range" id="brushSize" min="2" max="200" value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} className="w-24 sm:w-32"/>
                </div>
                <div className="flex items-center gap-2 text-white text-sm">
                    <label htmlFor="feather">Kelembutan:</label>
                    <input type="range" id="feather" min="0" max="100" value={feather} onChange={(e) => setFeather(Number(e.target.value))} className="w-24 sm:w-32"/>
                </div>
             </div>
        </div>
        
        {/* Real-time Feedback Message Area */}
        {autoMaskMessage && (
          <div 
            className={`p-2 mb-3 rounded-md text-sm border flex items-start gap-2.5 transition-opacity duration-300 ${
              autoMaskMessage.type === 'error' ? 'bg-red-900/40 border-red-700 text-red-200' :
              autoMaskMessage.type === 'success' ? 'bg-green-900/40 border-green-700 text-green-200' :
              'bg-blue-900/40 border-blue-700 text-blue-200'
            }`}
          >
            <InfoCircleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span className="flex-1">{autoMaskMessage.text}</span>
          </div>
        )}

        {/* Canvas Area */}
        <div 
          ref={containerRef}
          className="flex-grow w-full min-h-0 flex items-center justify-center bg-black/50 rounded relative overflow-hidden touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onWheel={handleWheel}
          style={{ cursor: isPanningRef.current ? 'grabbing' : cursorStyle }}
        >
          <canvas ref={displayCanvasRef} className="absolute top-0 left-0" />
          <canvas ref={maskCanvasRef} style={{ display: 'none' }} />
        </div>
        
        {/* Footer */}
        <div className="mt-3 pt-3 border-t border-slate-700 flex justify-end items-center">
            <button onClick={onClose} className="text-slate-300 px-4 py-2 rounded-md hover:bg-slate-700 mr-2 font-semibold">
              Batal
            </button>
            <button onClick={handleApply} className="bg-amber-500 text-slate-900 px-6 py-2 rounded-md hover:bg-amber-600 font-semibold">
              Simpan Masker
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
