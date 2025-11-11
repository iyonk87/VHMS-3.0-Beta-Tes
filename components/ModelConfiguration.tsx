import React from 'react';
import type { 
    AnalysisModelsState, AnalysisModelSelection, SceneSource
} from '../types';
import { ModelToggleSwitch } from './common/ModelToggleSwitch';
import { InfoCircleIcon } from './icons/Icons';

interface ModelConfigurationProps {
    analysisModels: AnalysisModelsState;
    onModelChange: (module: keyof AnalysisModelsState, value: AnalysisModelSelection) => void;
    isDisabled: boolean;
    sceneSource: SceneSource;
}

export const ModelConfiguration: React.FC<ModelConfigurationProps> = ({ analysisModels, onModelChange, isDisabled, sceneSource }) => {
    const allModules: { key: keyof AnalysisModelsState; label: string }[] = [
        { key: 'subject', label: 'Analisis Subjek' },
        { key: 'scene', label: 'Analisis Scene' },
        { key: 'vfx', label: 'VFX & Interaction' },
        { key: 'pose', label: 'Adaptasi Pose' },
        { key: 'shadow', label: 'Analisis Bayangan' },
        { key: 'perspective', label: 'Perspektif & Skala' },
        { key: 'photometric', label: 'Analisis Fotometrik' },
    ];

    return (
        <div className="p-3 bg-slate-900/50 rounded-md border border-slate-700/50 space-y-2">
             <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <InfoCircleIcon className="w-4 h-4"/> Konfigurasi Model Analisis
            </h3>
            <p className="text-xs text-slate-400">Pilih model untuk setiap modul analisis. 'Pro' lebih akurat, 'Fast' lebih cepat.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 pt-2">
                {allModules.map(({ key, label }) => {
                    const isSecondary = !['subject', 'scene'].includes(key);
                    const isDisabledForMode = isSecondary && sceneSource === 'generate';
                    
                    return (
                        <div key={key} className={`flex justify-between items-center transition-opacity ${isDisabledForMode ? 'opacity-50' : 'opacity-100'}`}>
                            <label className="text-xs text-slate-300">{label}</label>
                            <div className="w-20">
                                <ModelToggleSwitch
                                    value={analysisModels[key]}
                                    onChange={(val) => onModelChange(key, val)}
                                    disabled={isDisabled || isDisabledForMode}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
            {sceneSource === 'generate' && (
                <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-700/50 mt-2">
                    Modul sekunder (VFX, Pose, dll.) dinonaktifkan karena Mode Sumber Scene adalah 'Dari Prompt'.
                </p>
            )}
        </div>
    );
};