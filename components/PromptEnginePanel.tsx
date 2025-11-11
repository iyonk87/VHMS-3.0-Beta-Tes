import React from 'react';
import { Card } from './common/Card';
// FIX: Corrected import to point to the new centralized Icons.tsx file.
import { PromptIcon, SparklesIcon, RefreshIcon } from './icons/Icons';

interface PromptEnginePanelProps {
  finalPrompt: string | null;
  isAnalyzing: boolean;
  onRegenerate: () => void;
  onPromptChange: (newPrompt: string) => void;
}

export const PromptEnginePanel: React.FC<PromptEnginePanelProps> = ({ finalPrompt, isAnalyzing, onRegenerate, onPromptChange }) => {
  return (
    <Card 
      title="PROMPT ENGINE" 
      titleIcon={<PromptIcon className="w-4 h-4" />}
      tooltip="Panel ini menunjukkan 'otak' dari operasi. Ini adalah prompt final yang digabungkan secara otomatis, yang menggabungkan input deskriptif Anda dengan data dari panel Analisis AI. Inilah yang sebenarnya dikirim ke VHMS untuk generasi gambar."
      className="flex flex-col flex-grow"
    >
      <div className="space-y-3 flex-grow flex flex-col">
        <div className="flex-grow flex flex-col min-h-0">
          <h3 className="text-xs font-medium text-slate-400">DIRECTOR'S BRIEFING:</h3>
          <div className="mt-1 p-3 flex-grow bg-slate-900 rounded-md border border-slate-700 overflow-y-auto">
            {isAnalyzing ? (
              <div className="space-y-2">
                <div className="w-full h-4 bg-slate-700 rounded animate-pulse"></div>
                <div className="w-5/6 h-4 bg-slate-700 rounded animate-pulse"></div>
                <div className="w-3/4 h-4 bg-slate-700 rounded animate-pulse"></div>
              </div>
            ) : (
              <textarea
                className="w-full h-full bg-transparent text-sm text-slate-300 whitespace-pre-wrap font-mono resize-none focus:ring-0 focus:outline-none border-none p-0"
                value={finalPrompt || ''}
                onChange={(e) => onPromptChange(e.target.value)}
                placeholder="Jalankan Analisis AI untuk membuat prompt."
              />
            )}
          </div>
        </div>
        <div className="flex items-center justify-end gap-4 pt-2 border-t border-slate-700">
            <button
              onClick={onRegenerate}
              className="text-sm text-amber-400 hover:underline flex items-center gap-1"
            >
                <RefreshIcon className="w-4 h-4" />
                Buat Ulang Prompt
            </button>
            <button
              className="text-sm text-slate-500 hover:underline flex items-center gap-1 cursor-not-allowed"
              disabled
            >
              <SparklesIcon className="w-4 h-4"/>
              Perluas Detail
            </button>
        </div>
      </div>
    </Card>
  );
};