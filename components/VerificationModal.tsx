import React from 'react';
import type { VerificationResult } from '../types';
// FIX: Corrected import to point to the new centralized Icons.tsx file.
import { ShieldCheckIcon, CheckCircleIcon, XCircleIcon, InfoCircleIcon } from './icons/Icons';

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: VerificationResult;
}

const VerificationItem: React.FC<{
  label: string;
  status: { valid: boolean; message: string; type?: 'info' | 'success' }
}> = ({ label, status }) => {
  const Icon = status.valid ? (status.type === 'info' ? InfoCircleIcon : CheckCircleIcon) : XCircleIcon;
  const color = status.valid ? (status.type === 'info' ? 'text-blue-400' : 'text-green-400') : 'text-red-400';
  
  return (
    <div className="flex items-start py-2">
      <Icon className={`${color} w-6 h-6 mr-3 flex-shrink-0`} />
      <div>
        <p className="font-semibold text-slate-200">{label}</p>
        <p className={`text-sm text-slate-400`}>{status.message}</p>
      </div>
    </div>
  );
};

export const VerificationModal: React.FC<VerificationModalProps> = ({ isOpen, onClose, result }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50 transition-opacity duration-300 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-slate-800 rounded-lg border border-slate-700 shadow-2xl w-full max-w-md mx-auto transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale"
        onClick={(e) => e.stopPropagation()}
        style={{ animationFillMode: 'forwards' }}
      >
        <div className="p-4 border-b border-slate-700 bg-slate-900/50 rounded-t-lg">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldCheckIcon className="w-5 h-5 text-amber-400"/>
            LAPORAN VERIFIKASI INPUT
          </h2>
        </div>
        
        <div className="p-4 space-y-2 divide-y divide-slate-700">
          <VerificationItem label="Gambar Subjek" status={result.subject} />
          <VerificationItem label="Gambar Scene" status={result.scene} />
          <VerificationItem label="Outfit" status={result.outfit} />
          <VerificationItem label="Prompt" status={result.prompt} />
        </div>

        <div className="p-4 bg-slate-800/50">
          <h3 className="text-xs font-semibold text-slate-400 mb-2">RINGKASAN PROMPT:</h3>
          <p className="text-xs font-mono bg-slate-900 p-2 rounded-md text-slate-400 break-words">
            {result.promptSnippet}
          </p>
        </div>
        
        <div className={`p-3 text-center font-semibold rounded-b-lg ${result.overall.valid ? 'bg-green-900/30 text-green-200' : 'bg-red-900/30 text-red-200'}`}>
          {result.overall.message}
        </div>
        
        <div className="p-3 border-t border-slate-700 text-right bg-slate-900/50 rounded-b-lg">
          <button 
            onClick={onClose}
            className="bg-amber-500 text-slate-900 font-semibold py-2 px-6 rounded-md hover:bg-amber-600 transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
      <style>{`
        @keyframes fadeInScale {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-fade-in-scale {
          animation: fadeInScale 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
};
