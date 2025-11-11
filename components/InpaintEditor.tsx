import React, { useRef, useEffect, useState, useCallback } from 'react';
// FIX: Corrected import to point to the new centralized Icons.tsx file.
import { BrushIcon, TrashIcon, EraserIcon, GenerateIcon } from './icons/Icons';
import { performInpainting } from '../services/geminiService';

type Tool = 'brush' | 'eraser';

interface Transform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

interface InpaintEditorProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string; // This will be the outputImage
  onApply: (newImageDataUrl: string) => void;
}

const HISTORY_LIMIT = 30;

export const InpaintEditor: React.FC<InpaintEditorProps> = ({ 
  isOpen, 
  onClose, 
  imageSrc, 
  onApply,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  
  const [tool, setTool] = useState<Tool>('brush');
  const [brushSize, setBrushSize] = useState(40);
  const [feather, setFeather] = useState(25);
  const [transform, setTransform] = useState<Transform>({ scale: 1, offsetX: 0, offsetY: 0 });
  const [cursorStyle, setCursorStyle] = useState('crosshair');
  
  const [inpaintPrompt, setInpaintPrompt] = useState<string>('');
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);

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
    if (!isOpen) {
      imageRef.current = null;
      return;
    }
    
    const displayCanvas = displayCanvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    const container = containerRef.current;
    if (!imageSrc || !displayCanvas || !maskCanvas || !container) return;

    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      imageRef.current = img;
      
      const naturalWidth = img.naturalWidth;
      const naturalHeight = img.naturalHeight;
      
      displayCanvas.width = naturalWidth;
      displayCanvas.height = naturalHeight;
      maskCanvas.width = naturalWidth;
      maskCanvas.height = naturalHeight;
      
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      const scale = Math.min(containerWidth / naturalWidth, containerHeight / naturalHeight, 1);
      const offsetX = (containerWidth - naturalWidth * scale) / 2;
      const offsetY = (containerHeight - naturalHeight * scale) / 2;

      setTransform({ scale, offsetX, offsetY });
      
      const maskCtx = maskCanvas.getContext('2d');
      if (maskCtx) {
        maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
        const initialImageData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
        setHistory([initialImageData]);
        setHistoryIndex(0);
      }
    };
  }, [isOpen, imageSrc]);

  useEffect(() => {
    if (isOpen && imageRef.current) {
        redrawDisplay();
    }
  }, [transform, redrawDisplay, isOpen]);
  
  // --- Event Handlers ---

  const getCanvasCoords = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const canvas = displayCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - transform.offsetX) / transform.scale,
      y: (e.clientY - rect.top - transform.offsetY) / transform.scale,
    };
  }, [transform]);

  const drawOnMask = useCallback((startPos: { x: number; y: number }, endPos: { x: number; y: number }) => {
    const maskCtx = maskCanvasRef.current?.getContext('2d');
    if (!maskCtx) return;
    
    maskCtx.globalCompositeOperation = tool === 'brush' ? 'source-over' : 'destination-out';

    if (feather === 0) {
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
      const dist = Math.hypot(endPos.x - startPos.x, endPos.y - startPos.y);
      const angle = Math.atan2(endPos.y - startPos.y, endPos.x - startPos.x);
      const step = Math.max(1, brushSize / 8);

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
        const dx = e.movementX;
        const dy = e.movementY;
        setTransform(t => ({ ...t, offsetX: t.offsetX + dx, offsetY: t.offsetY + dy }));
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
    const maskCtx = maskCanvas?.getContext('2d');
    if (maskCtx) {
      maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
      redrawDisplay();
      pushHistory();
    }
  };

  const handleApply = async () => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas || !inpaintPrompt.trim()) {
        alert("Harap berikan prompt perbaikan dan lukis masker.");
        return;
    }

    setIsRegenerating(true);
    try {
        const maskDataUrl = maskCanvas.toDataURL('image/png');
        console.log("[INPAINT EDITOR]: Mengirim permintaan in-painting...");
        const newImageDataUrl = await performInpainting(imageSrc, maskDataUrl, inpaintPrompt);
        onApply(newImageDataUrl);
    } catch(error) {
        console.error("[INPAINT EDITOR]: Gagal melakukan in-painting:", error);
        alert(`Gagal melakukan in-painting: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
        setIsRegenerating(false);
    }
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-50 p-2 sm:p-4 animate-fade-in-fast" onMouseDown={onClose}>
      <div className="bg-slate-800 border border-slate-700 p-3 rounded-lg shadow-xl w-full h-full flex flex-col" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-3 text-white flex-wrap gap-2">
          <h3 className="text-lg font-semibold">Editor In-Painting & Retouching</h3>
        </div>
        
        <div className="bg-slate-900/50 p-2 rounded-md flex flex-col lg:flex-row items-center justify-between flex-wrap gap-3 mb-3 border border-slate-700">
            <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto">
                <button onClick={() => setTool('brush')} className={`p-2 rounded-md ${tool === 'brush' ? 'bg-amber-500 text-slate-900' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`} title="Brush Tool"><BrushIcon className="w-5 h-5"/></button>
                <button onClick={() => setTool('eraser')} className={`p-2 rounded-md ${tool === 'eraser' ? 'bg-amber-500 text-slate-900' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`} title="Eraser Tool"><EraserIcon className="w-5 h-5"/></button>
                <div className="h-6 w-px bg-slate-600 mx-2"></div>
                <button onClick={handleUndo} disabled={historyIndex <= 0} className="p-2 rounded-md bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-50" title="Undo">↶</button>
                <button onClick={handleRedo} disabled={historyIndex >= history.length - 1} className="p-2 rounded-md bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-50" title="Redo">↷</button>
                <div className="h-6 w-px bg-slate-600 mx-2"></div>
                <button onClick={handleClear} className="p-2 rounded-md bg-slate-700 text-slate-300 hover:bg-slate-600" title="Clear Mask"><TrashIcon className="w-5 h-5"/></button>
            </div>
            <div className="flex items-center gap-x-4 gap-y-2 flex-wrap justify-end w-full lg:w-auto">
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
        
        <div className="mb-3">
            <textarea
                placeholder="Jelaskan perubahan yang Anda inginkan (misalnya: 'ubah kemeja menjadi merah', 'hapus mobil ini')..."
                value={inpaintPrompt}
                onChange={(e) => setInpaintPrompt(e.target.value)}
                rows={2}
                className="w-full p-2 border border-slate-600 bg-slate-900 rounded-md focus:ring-amber-500 focus:border-amber-500 text-sm placeholder:text-slate-500"
            />
        </div>

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
        
        <div className="mt-3 pt-3 border-t border-slate-700 flex justify-end items-center">
            <button onClick={onClose} className="text-slate-300 px-4 py-2 rounded-md hover:bg-slate-700 mr-2 font-semibold">
              Batal
            </button>
            <button 
              onClick={handleApply} 
              disabled={isRegenerating}
              className="bg-amber-500 text-slate-900 px-6 py-2 rounded-md hover:bg-amber-600 font-semibold flex items-center gap-2 disabled:bg-slate-600 disabled:cursor-not-allowed"
            >
              <GenerateIcon className="w-5 h-5" />
              {isRegenerating ? 'Memproses...' : 'Terapkan Perubahan'}
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
