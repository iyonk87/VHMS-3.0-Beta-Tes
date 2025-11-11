import React from 'react';
import type { FileWithPreview, SceneSource, StylePreset, Resolution } from '../types';
import { Card } from './common/Card';
import { DropZone } from './common/DropZone';
import { Tooltip } from './common/Tooltip';
// FIX: Corrected import to point to the new centralized Icons.tsx file.
import { InputIcon } from './icons/Icons';

interface InputPanelProps {
  subjectImage: FileWithPreview | null;
  setSubjectImage: (file: FileWithPreview) => void;
  sceneImage: FileWithPreview | null;
  setSceneImage: (file: FileWithPreview) => void;
  referenceImage: FileWithPreview | null;
  setReferenceImage: (file: FileWithPreview) => void;
  outfitImage: FileWithPreview | null;
  onOpenCropModal: (file: FileWithPreview) => void;
  prompt: string;
  setPrompt: (string) => void;
  sceneSource: SceneSource;
  setSceneSource: (mode: SceneSource) => void;
  stylePreset: StylePreset;
  setStylePreset: (preset: StylePreset) => void;
  resolution: Resolution;
  setResolution: (resolution: Resolution) => void;
  isHarmonizationEnabled: boolean;
  setIsHarmonizationEnabled: (enabled: boolean) => void;
}

const sceneOptions: { id: SceneSource; label: string }[] = [
    { id: 'generate', label: 'Dari Prompt' },
    { id: 'upload', label: 'Latar Belakang' },
    { id: 'reference', label: 'Referensi Gaya' },
];

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


export const InputPanel: React.FC<InputPanelProps> = ({
  subjectImage,
  setSubjectImage,
  sceneImage,
  setSceneImage,
  referenceImage,
  setReferenceImage,
  outfitImage,
  onOpenCropModal, // CHANGED
  prompt,
  setPrompt,
  sceneSource,
  setSceneSource,
  stylePreset,
  setStylePreset,
  resolution,
  setResolution,
  isHarmonizationEnabled,
  setIsHarmonizationEnabled,
}) => {
  const getPromptLabel = () => {
    switch(sceneSource) {
      case 'upload':
        return '7. DESKRIPSI PROMPT (AKSI SUBJEK)';
      case 'reference':
        return '7. DESKRIPSI PROMPT (AKSI SUBJEK DALAM SCENE REFERENSI)';
      case 'generate':
        return '7. DESKRIPSI PROMPT (SUBJEK & SCENE)';
      default:
        return '7. DESKRIPSI PROMPT';
    }
  };

  const getPromptPlaceholder = () => {
    switch(sceneSource) {
      case 'upload':
        return "Contoh: seorang wanita tersenyum dan melambaikan tangan";
      case 'reference':
        return "Contoh: pria itu berjalan santai di sepanjang jalan";
      case 'generate':
        return "Contoh: seorang wanita tersenyum duduk di sofa di sebuah perpustakaan megah saat malam hari";
      default:
        return "Jelaskan apa yang harus dilakukan subjek...";
    }
  };
  
  const isBackgroundMode = sceneSource === 'upload';
  
  return (
    <Card 
      title="INPUT & DIRECTIVES" 
      titleIcon={<InputIcon className="w-4 h-4" />}
      tooltip="Di sinilah Anda memberikan semua bahan mentah. Unggah gambar subjek, dan pilih mode untuk scene: gunakan gambar sebagai latar belakang, buat scene baru dari gambar referensi, atau buat dari deskripsi prompt."
    >
      <div className="space-y-4">
        {/* Scene Mode Toggle */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">1. MODE SUMBER SCENE</label>
          <div className="flex bg-slate-900 p-1 rounded-md border border-slate-700">
            {sceneOptions.map(option => (
                <button
                    key={option.id}
                    onClick={() => setSceneSource(option.id)}
                    className={`w-1/3 py-1 text-sm font-semibold rounded transition-colors text-center ${sceneSource === option.id ? 'bg-slate-700 text-amber-400' : 'text-slate-300 hover:bg-slate-700/50'}`}
                    >
                    {option.label}
                </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="aspect-square">
            <DropZone 
              file={subjectImage}
              onDrop={setSubjectImage}
              title="2. Subjek"
              description="Wajah & Identitas"
              previewHeightClass="h-full"
            />
          </div>
          
          <div className="aspect-square">
            {sceneSource === 'upload' && (
              <DropZone 
                file={sceneImage}
                onDrop={setSceneImage}
                title="3. Latar"
                description="Scene Aktual"
                previewHeightClass="h-full"
              />
            )}

            {sceneSource === 'reference' && (
              <DropZone 
                file={referenceImage}
                onDrop={setReferenceImage}
                title="3. Referensi"
                description="Gaya & Cahaya"
                previewHeightClass="h-full"
              />
            )}

            {sceneSource === 'generate' && (
              <div className="relative p-3 border border-dashed rounded-md border-slate-600 flex flex-col items-center justify-center text-center bg-slate-900/50 h-full">
                  <svg className="w-8 h-8 text-slate-500 mb-2" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z"></path><path d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12z"></path><path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"></path></svg>
                  <h4 className="text-xs font-semibold text-slate-100">Scene oleh AI</h4>
                  <p className="text-[10px] text-slate-400 mt-1">Jelaskan di prompt.</p>
              </div>
            )}
          </div>

          <div className="aspect-square">
            <DropZone 
              file={outfitImage}
              onDrop={onOpenCropModal}
              title="4. Outfit"
              description="Opsional"
              previewHeightClass="h-full"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">5. PENGATURAN OUTPUT</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-900 p-2 rounded-md border border-slate-700">
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
        </div>
        
        <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">6. PENGATURAN LANJUTAN</label>
             <div className="bg-slate-900 p-3 rounded-md border border-slate-700">
                <div className="flex justify-between items-center">
                    <Tooltip text="Saat diaktifkan, AI akan melakukan analisis pasca-proses untuk menyelaraskan color bleeding, grain, dan ketajaman antara subjek dan scene, menghasilkan integrasi yang lebih fotorealistis.">
                        <label htmlFor="harmonization-toggle" className="flex items-center gap-2 cursor-pointer">
                            <span className="text-xs font-medium text-slate-300">HARMONISASI AKHIR (REALISME+)</span>
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


        <div>
          <label htmlFor="prompt" className="block text-xs font-medium text-slate-400 mb-2">
            {getPromptLabel()}
          </label>
          <textarea
            id="prompt"
            rows={3}
            className="w-full p-2 border border-slate-600 bg-slate-900 rounded-md focus:ring-amber-500 focus:border-amber-500 text-sm placeholder:text-slate-500"
            placeholder={getPromptPlaceholder()}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>
      </div>
    </Card>
  );
};