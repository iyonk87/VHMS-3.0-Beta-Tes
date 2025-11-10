import React, { useState, useEffect } from 'react';
import type { StylePreset, Resolution, SceneSource } from '../types';
import { Card } from './common/Card';
import { Tooltip } from './common/Tooltip';
import { GenerateIcon, DownloadIcon, ShieldCheckIcon, EditIcon, InfoCircleIcon } from './icons/Icons';

interface OutputPanelProps {
  outputImage: string | null;
  isGenerating: boolean;
  onGenerate: () => void;
  onVerify: () => void;
  canGenerate: boolean;
  stylePreset: StylePreset;
  setStylePreset: (preset: StylePreset) => void;
  resolution: Resolution;
  setResolution: (resolution: Resolution) => void;
  error: string | null;
  onStartEditing: () => void;
  consistencyWarning: string | null;
  sceneSource: SceneSource;
  isHarmonizationEnabled: boolean;
  setIsHarmonizationEnabled: (enabled: boolean) => void;
}

const stylePresets: { id: StylePreset; label: string }[] = [
  { id: 'Cinematic', label: 'Sinematik' },
  { id: 'Studio', label: 'Studio' },
  { id: 'Natural', label: 'Natural' },
];

const resolutions: { id: Resolution; label: string }[] = [
  { id: 'HD', label: 'HD' },
  { id: '2K', label: '2K' },
  { id: '4K', label: '4K' },
];

const loadingMessages = [
  "Menganalisis pencahayaan scene...",
  "Mengunci identitas subjek...",
  "Menyusun komposisi gambar...",
  "Merender detail akhir & tekstur...",
  "Hampir selesai, VHMS sedang memoles hasilnya...",
];

export const OutputPanel: React.FC<OutputPanelProps> = ({
  outputImage,
  isGenerating,
  onGenerate,
  onVerify,
  canGenerate,
  stylePreset,
  setStylePreset,
  resolution,
  setResolution,
  error,
  onStartEditing,
  consistencyWarning,
  sceneSource,
  isHarmonizationEnabled,
  setIsHarmonizationEnabled,
}) => {
  const [loadingMessage, setLoadingMessage] = useState<string>(loadingMessages[0]);
  const isBackgroundMode = sceneSource === 'upload'; // Helper variable

  useEffect(() => {
    // FIX: Replaced `NodeJS.Timeout` with `ReturnType<typeof setInterval>` for browser compatibility.
    let intervalId: ReturnType<typeof setInterval> | null = null;
    if (isGenerating) {
      let i = 0;
      setLoadingMessage(loadingMessages[0]);
      intervalId = setInterval(() => {
        i = (i + 1) % loadingMessages.length;
        setLoadingMessage(loadingMessages[i]);
      }, 2500);
    }
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isGenerating]);

  return (
    <Card 
      title="OUTPUT & GENERATION" 
      titleIcon={<GenerateIcon className="w-4 h-4"/>}
      tooltip="Ini adalah panggung utama! Gambar komposit final Anda akan muncul di sini setelah proses generasi selesai. Anda juga dapat menemukan kontrol utama untuk memulai generasi dan mengunduh hasil di sini."
    >
      <div className="space-y-4">
        <div className="aspect-video bg-slate-900 rounded-md flex items-center justify-center border border-slate-700 overflow-hidden relative">
          {isGenerating ? (
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
                <GenerateIcon className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-amber-500/80" />
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-300 transition-opacity duration-500">
                {loadingMessage}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Proses ini mungkin memakan waktu sejenak.
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
          {outputImage && !isGenerating && !error && (
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
            className="w-full bg-slate-700 border border-slate-600 text-slate-200 font-semibold py-2 px-4 rounded-md hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            <ShieldCheckIcon className="w-5 h-5" />
            Verifikasi Input
          </button>
          <button
            onClick={onGenerate}
            disabled={!canGenerate || isGenerating}
            className="w-full bg-amber-500 text-slate-900 font-semibold py-2 px-4 rounded-md hover:bg-amber-600 disabled:bg-slate-600 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            <GenerateIcon className="w-5 h-5" />
            {isGenerating ? 'Memproses...' : 'Mulai Generasi'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-700">
          <div className={isBackgroundMode ? 'opacity-50 cursor-not-allowed' : ''}>
            <Tooltip text={isBackgroundMode ? "Preset Gaya dinonaktifkan dalam mode Latar Belakang. Gaya ditentukan oleh gambar scene untuk memastikan realisme." : "Pilih gaya visual untuk gambar yang dihasilkan."}>
                <label className="block text-xs font-medium text-slate-400 mb-2">PRESET GAYA</label>
            </Tooltip>
            <div className="flex bg-slate-700/50 p-1 rounded-md border border-slate-700">
              {stylePresets.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => setStylePreset(preset.id)}
                  disabled={isBackgroundMode}
                  className={`w-1/3 py-1 text-xs rounded transition-colors ${stylePreset === preset.id && !isBackgroundMode ? 'bg-slate-600 text-amber-400 font-semibold' : 'text-slate-300'} ${!isBackgroundMode ? 'hover:bg-slate-700' : ''}`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">RESOLUSI OUTPUT</label>
            <div className="flex bg-slate-700/50 p-1 rounded-md border border-slate-700">
              {resolutions.map(res => (
                <button
                  key={res.id}
                  onClick={() => setResolution(res.id)}
                  className={`w-1/3 py-1 text-xs rounded transition-colors ${resolution === res.id ? 'bg-slate-600 text-amber-400 font-semibold' : 'text-slate-300 hover:bg-slate-700'}`}
                >
                  {res.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-700">
            <div className="flex justify-between items-center">
                <Tooltip text="Saat diaktifkan, AI akan melakukan analisis pasca-proses untuk menyelaraskan color bleeding, grain, dan ketajaman antara subjek dan scene, menghasilkan integrasi yang lebih fotorealistis.">
                    <label htmlFor="harmonization-toggle" className="flex items-center gap-2 cursor-pointer">
                        <span className="text-xs font-medium text-slate-400">HARMONISASI AKHIR (REALISME+)</span>
                    </label>
                </Tooltip>
                <button
                  id="harmonization-toggle"
                  type="button"
                  role="switch"
                  aria-checked={isHarmonizationEnabled}
                  onClick={() => setIsHarmonizationEnabled(!isHarmonizationEnabled)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-slate-800 ${isHarmonizationEnabled ? 'bg-amber-500' : 'bg-slate-600'}`}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isHarmonizationEnabled ? 'translate-x-5' : 'translate-x-0'}`}
                  />
                </button>
            </div>
        </div>
      </div>
    </Card>
  );
};
