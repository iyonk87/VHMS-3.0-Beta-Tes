import React from 'react';
import type { AnalysisModelSelection } from '../../types';

interface ModelToggleSwitchProps {
  value: AnalysisModelSelection;
  onChange: (newValue: AnalysisModelSelection) => void;
  disabled?: boolean;
}

export const ModelToggleSwitch: React.FC<ModelToggleSwitchProps> = ({ value, onChange, disabled = false }) => {
  return (
    <div className={`flex bg-slate-800 p-0.5 rounded-md border border-slate-700 ${disabled ? 'opacity-50' : ''}`}>
      <button
        onClick={() => onChange('Pro')}
        disabled={disabled}
        className={`w-1/2 py-0.5 px-1 text-[10px] font-bold rounded-sm transition-colors text-center ${
          value === 'Pro' 
          ? 'bg-slate-600 text-amber-300' 
          : 'text-slate-400 hover:bg-slate-700/50'
        }`}
      >
        Pro
      </button>
      <button
        onClick={() => onChange('Fast')}
        disabled={disabled}
        className={`w-1/2 py-0.5 px-1 text-[10px] font-bold rounded-sm transition-colors text-center ${
          value === 'Fast' 
          ? 'bg-slate-600 text-teal-300' 
          : 'text-slate-400 hover:bg-slate-700/50'
        }`}
      >
        Fast
      </button>
    </div>
  );
};