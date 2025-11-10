import React from 'react';
import type { FileWithPreview, SceneSource } from '../types';
import { Card } from './common/Card';
import { DropZone } from './common/DropZone';
import { InputIcon } from './icons/Icons';

interface InputPanelProps {
  subjectImage: FileWithPreview | null;
  setSubjectImage: (file: FileWithPreview) => void;
  sceneImage: FileWithPreview | null;
  setSceneImage: (file: FileWithPreview) => void;
  referenceImage: FileWithPreview | null;
  setReferenceImage: (file: FileWithPreview) => void;
  outfitImage: FileWithPreview | null;
  onOpenCropModal: (file: FileWithPreview) => void; // CHANGED: from setOutfitImage
  prompt: string;
  setPrompt: (prompt: string) => void;
  sceneSource: SceneSource;
  setSceneSource: (mode: SceneSource) => void;
}

const sceneOptions: { id: SceneSource; label: string }[] = [
    { id: 'upload', label: 'Latar Belakang' },
    { id: 'reference', label: 'Referensi Gaya' },
    { id: 'generate', label: 'Dari Prompt' },
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
}) => {
  const getPromptLabel = () => {
    switch(sceneSource) {
      case 'upload':
        return '4. DESKRIPSI PROMPT (AKSI SUBJEK)';
      case 'reference':
        return '4. DESKRIPSI PROMPT (AKSI SUBJEK DALAM SCENE REFERENSI)';
      case 'generate':
        return '4. DESKRIPSI PROMPT (SUBJEK & SCENE)';
      default:
        return '4. DESKRIPSI PROMPT';
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
  
  return (
    <Card 
      title="INPUT & DIRECTIVES" 
      titleIcon={<InputIcon className="w-4 h-4" />}
      tooltip="Di sinilah Anda memberikan semua bahan mentah. Unggah gambar subjek, dan pilih mode untuk scene: gunakan gambar sebagai latar belakang, buat scene baru dari gambar referensi, atau buat dari deskripsi prompt."
    >
      <div className="space-y-4">
        {/* Scene Mode Toggle */}
        <div className="mb-2">
          <label className="block text-xs font-medium text-slate-400 mb-2">2. MODE SUMBER SCENE</label>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <DropZone 
            file={subjectImage}
            onDrop={setSubjectImage}
            title="1. Gambar Subjek"
            description="(Wajah & Identitas)"
            previewHeightClass="h-32"
          />
          
          {sceneSource === 'upload' && (
            <DropZone 
              file={sceneImage}
              onDrop={setSceneImage}
              title="2. Gambar Latar"
              description="(Scene Aktual)"
              previewHeightClass="h-32"
            />
          )}

          {sceneSource === 'reference' && (
             <DropZone 
              file={referenceImage}
              onDrop={setReferenceImage}
              title="2. Gambar Referensi"
              description="(Gaya, Cahaya, Warna)"
              previewHeightClass="h-32"
            />
          )}

          {sceneSource === 'generate' && (
            <div className="relative p-3 border border-dashed rounded-md border-slate-600 flex flex-col items-center justify-center text-center bg-slate-900/50 h-full">
                {/* FIX: Corrected typo 'viewbox' to 'viewBox' and converted kebab-case SVG attributes to camelCase for React compatibility. */}
                <svg className="w-8 h-8 text-slate-500 mb-2" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z"></path><path d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12z"></path><path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"></path></svg>
                <h4 className="text-sm font-semibold text-slate-100">Scene Dibuat oleh AI</h4>
                <p className="text-xs text-slate-400 mt-1">Jelaskan scene di prompt di bawah.</p>
            </div>
          )}
        </div>
        <DropZone 
          file={outfitImage}
          onDrop={onOpenCropModal} // CHANGED
          title="3. Gambar Outfit"
          description="(Opsional)"
        />
        <div>
          <label htmlFor="prompt" className="block text-xs font-medium text-slate-400 mb-2">
            {getPromptLabel()}
          </label>
          <textarea
            id="prompt"
            rows={4}
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