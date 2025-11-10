import React from 'react';
import type { HistoryItem } from '../types';
import { Card } from './common/Card';
import { HistoryIcon, ReloadIcon } from './icons/Icons';

interface HistoryPanelProps {
  history: HistoryItem[];
  onReload: (id: string) => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ history, onReload }) => {
  return (
    <Card 
      title="SESSION HISTORY & GALLERY"
      titleIcon={<HistoryIcon className="w-4 h-4" />}
      tooltip="Setiap gambar yang Anda hasilkan disimpan di sini. Anda dapat memuat ulang sesi sebelumnya kapan saja untuk melanjutkan pekerjaan atau membuat variasi baru."
    >
      <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
        {history.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <HistoryIcon className="w-12 h-12 mx-auto opacity-30" />
            <p className="mt-2 text-sm">Belum ada riwayat.</p>
            <p className="text-xs">Gambar yang Anda hasilkan akan muncul di sini.</p>
          </div>
        ) : (
          history.map((item) => (
            <div key={item.id} className="flex items-center gap-3 p-2 bg-slate-800/50 rounded border border-slate-700 hover:bg-slate-700/50 transition-colors">
              <img src={item.outputImage} alt="History thumbnail" className="w-12 h-12 object-cover rounded flex-shrink-0" />
              <div className="flex-grow overflow-hidden">
                <p className="text-xs font-mono text-slate-400 truncate" title={item.inputs.prompt}>
                  {item.inputs.prompt || "[Prompt Kosong]"}
                </p>
                <button 
                  onClick={() => onReload(item.id)}
                  className="mt-1 text-sm font-semibold text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1"
                >
                  <ReloadIcon className="w-4 h-4" />
                  Muat Ulang
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
};