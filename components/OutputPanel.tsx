import React from 'react';
import type { StylePreset, Resolution, SceneSource, AppStatus } from '../types';
import { Card } from './common/Card';
import { Tooltip } from './common/Tooltip';
// FIX: Corrected import to point to the new centralized Icons.tsx file.
import { GenerateIcon, DownloadIcon, ShieldCheckIcon, EditIcon, InfoCircleIcon, LayersIcon } from './icons/Icons';

interface OutputPanelProps {
  outputImage: string | null;
  appStatus: AppStatus;
  statusMessage: string;
  onGenerate: () => void;
  onVerify: () => void;
  canGenerate: boolean;
  error: string | null;
  onStartEditing: () => void;
  consistencyWarning: string | null;
  sceneSource: SceneSource;
}

export const OutputPanel: React.FC<OutputPanelProps> = ({
  outputImage,
  appStatus,
  statusMessage,
  onGenerate,
  onVerify,
  canGenerate,
  error,
  onStartEditing,
  consistencyWarning,
  sceneSource,
}) => {
  const isAnalyzing = appStatus.startsWith('ANALYZING');
  const isGenerating = appStatus === 'GENERATING_IMAGE' || appStatus === 'HARMONIZING';
  const isBusy = !['IDLE', 'DONE', 'ERROR'].includes(appStatus);

  const getButtonText = () => {
    if (appStatus === 'VERIFYING') return 'Memverifikasi...';
    if (isAnalyzing) return 'Menganalisis...';
    if (isGenerating) return 'Memproses...';
    return 'Mulai Generasi';
  }

  return (
    <Card 
      title="OUTPUT & GENERATION" 
      titleIcon={<GenerateIcon className="w-4 h-4"/>}
      tooltip="Ini adalah panggung utama! Gambar komposit final Anda akan muncul di sini setelah proses generasi selesai. Anda juga dapat menemukan kontrol utama untuk memulai generasi dan mengunduh hasil di sini."
    >
      <div className="space-y-4">
        <div className="aspect-video bg-slate-900 rounded-md flex items-center justify-center border border-slate-700 overflow-hidden relative">
          {isAnalyzing || isGenerating ? (
            <div className="text-center p-4 flex flex-col items-center justify-center">
              <div className="relative w-20 h-20 mb-4">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <circle
                    className="text-slate-700"
                    strokeWidth="8" stroke="currentColor" fill="transparent"
                    r="45" cx="50" cy="50"
                  />
                  <circle
                    className="text-amber-500 progress-ring__circle"
                    strokeWidth="8" strokeLinecap="round" stroke="currentColor" fill="transparent"
                    r="45" cx="50" cy="50"
                  />
                </svg>
                {isAnalyzing ? (
                    <LayersIcon className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-amber-500/80" />
                ) : (
                    <GenerateIcon className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-amber-500/80" />
                )}
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-300 transition-opacity duration-500">
                {statusMessage}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {isAnalyzing ? "AI sedang menganalisis gambar Anda..." : "Proses ini mungkin memakan waktu sejenak."}
              </p>
              <style>{`
                .progress-ring__circle {
                  stroke-dasharray: ${2 * Math.PI * 45};
                  stroke-dashoffset: ${2 * Math.PI * 45};
                  transform-origin: 50% 50%;
                  transform: rotate(-90deg);
                  animation: progress 15s linear infinite;
                }
                @keyframes progress {
                  0% { stroke-dashoffset: ${2 * Math.PI * 45}; }
                  100% { stroke-dashoffset: 0; }
                }
              `}</style>
            </div>
          ) : error ? (
            <div className="p-4 text-center text-red-400">
              <p className="font-semibold text-lg">Terjadi Kesalahan</p>
              <p className="text-sm mt-1 max-w-sm">{error}</p>
            </div>
          ) : outputImage ? (
            <img src={outputImage} alt="Generated output" className="w-full h-full object-contain" />
          ) : (
            <div className="text-center text-slate-500 p-4">
              <GenerateIcon className="w-12 h-12 mx-auto opacity-30" />
              <p className="mt-2 font-semibold">Hasil Gambar Komposit</p>
              <p className="text-xs mt-1">Jalankan Analisis dan Prompt Engine, lalu klik "Mulai Generasi".</p>
            </div>
          )}
          {outputImage && !isGenerating && !isAnalyzing && !error && (
            <div className="absolute top-2 right-2 flex gap-2">
              <button
                onClick={onStartEditing}
                className="bg-slate-900/60 text-white hover:bg-slate-900/80 p-2 rounded-md transition-colors"
                title="Edit Gambar (In-painting)"
              >
                <EditIcon className="w-5 h-5" />
              </button>
              <a 
                  href={outputImage} 
                  download="vhms_composite.png"
                  className="bg-slate-900/60 text-white hover:bg-slate-900/80 p-2 rounded-md transition-colors"
                  title="Unduh Gambar"
                >
                <DownloadIcon className="w-5 h-5" />
              </a>
            </div>
          )}
        </div>
        
        {consistencyWarning && (
          <div className="p-2.5 bg-amber-900/50 border border-amber-700/60 rounded-md flex items-start gap-2">
            <InfoCircleIcon className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-200">
              <span className="font-semibold">Peringatan Konsistensi:</span> {consistencyWarning}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={onVerify}
            disabled={isBusy}
            className="w-full bg-slate-700 border border-slate-600 text-slate-200 font-semibold py-2 px-4 rounded-md hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            <ShieldCheckIcon className="w-5 h-5" />
            Verifikasi Input
          </button>
          <button
            onClick={onGenerate}
            disabled={!canGenerate || isBusy}
            className="w-full bg-amber-500 text-slate-900 font-semibold py-2 px-4 rounded-md hover:bg-amber-600 disabled:bg-slate-600 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            <GenerateIcon className="w-5 h-5" />
            {getButtonText()}
          </button>
        </div>
      </div>
    </Card>
  );
};