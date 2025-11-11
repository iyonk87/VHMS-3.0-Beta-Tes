import React, { useState } from 'react';
// FIX: Corrected import to point to the new centralized Icons.tsx file.
import { KeyIcon } from '../../components/icons/Icons';

interface ApiKeyModalProps {
  isOpen: boolean;
  onSave: (key: string) => void;
  isLoading: boolean;
  error: string | null;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onSave, isLoading, error }) => {
  const [key, setKey] = useState('');

  const handleSave = () => {
    if (key.trim() && !isLoading) {
      onSave(key.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center p-4 z-50 backdrop-blur-sm"
    >
      <div 
        className="bg-slate-800 rounded-lg border border-slate-700 shadow-2xl w-full max-w-md mx-auto"
      >
        <div className="p-4 border-b border-slate-700 bg-slate-900/50 rounded-t-lg">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <KeyIcon className="w-5 h-5 text-amber-400"/>
            Memerlukan Kunci API Google Gemini
          </h2>
        </div>
        
        <div className="p-6 space-y-4">
            <p className="text-sm text-slate-300">
                Untuk menggunakan VHMS, Anda perlu menyediakan Kunci API Google Gemini Anda sendiri. Kunci Anda disimpan dengan aman di browser Anda untuk sesi ini saja.
            </p>
            <div>
                <label htmlFor="api-key-input" className="block text-xs font-medium text-slate-400 mb-1">
                    Kunci API Anda
                </label>
                <input 
                    id="api-key-input"
                    type="password"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isLoading}
                    className="w-full p-2 border border-slate-600 bg-slate-900 rounded-md focus:ring-amber-500 focus:border-amber-500 text-sm placeholder:text-slate-500 disabled:opacity-50"
                    placeholder="Masukkan Kunci API Anda di sini"
                />
            </div>
            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}
             <p className="text-xs text-slate-400">
                Anda bisa mendapatkan kunci gratis dari{' '}
                <a 
                    href="https://aistudio.google.com/app/apikey" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-amber-400 hover:underline"
                >
                    Google AI Studio
                </a>.
            </p>
        </div>
        
        <div className="p-3 border-t border-slate-700 text-right bg-slate-900/50 rounded-b-lg">
          <button 
            onClick={handleSave}
            disabled={!key.trim() || isLoading}
            className="bg-amber-500 text-slate-900 font-semibold py-2 px-6 rounded-md hover:bg-amber-600 transition-colors disabled:bg-slate-600 disabled:text-slate-400 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Memverifikasi...' : 'Simpan & Lanjutkan'}
          </button>
        </div>
      </div>
    </div>
  );
};
