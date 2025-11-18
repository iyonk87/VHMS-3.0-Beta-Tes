import React from 'react';
import type { 
    RegeneratableModule, SecondaryAnalysisModuleState, 
    SceneSource, AnalysisModelsState, AnalysisModelSelection,
    UnifiedAnalysisData, DependentAdaptationData
} from '../types';
import { Card } from './common/Card';
import { Tooltip } from './common/Tooltip';
import { 
    LayersIcon, CheckCircleIcon, RefreshIcon,
    MagicWandIcon, PersonPoseIcon, SunIcon, BlueprintIcon,
    PaletteIcon, EditIcon, TrashIcon
} from './icons/Icons';

interface AnalysisPanelProps {
  unifiedData: UnifiedAnalysisData | null;
  dependentData: DependentAdaptationData | null;
  isLoading: boolean;
  error: string | null;
  isUnifiedCached: boolean;
  isDependentCached: boolean;
  secondaryAnalysisState: Record<RegeneratableModule, SecondaryAnalysisModuleState>; // Kept for future individual regeneration
  onRegenerate: (module: RegeneratableModule) => void;
  sceneSource: SceneSource;
  analysisModels: AnalysisModelsState;
  interactionMask: string | null;
  onOpenMaskEditor: () => void;
  onClearMask: () => void;
}

const Shimmer: React.FC = () => <div className="w-full h-4 bg-slate-700 rounded animate-pulse"></div>;

const ModuleCard: React.FC<{
    title: string;
    icon: React.ReactNode;
    state: SecondaryAnalysisModuleState; // Keep for individual loading spinners later
    onRegenerate: () => void;
    children: React.ReactNode;
    isDataAvailable: boolean;
    isDisabled?: boolean;
    tooltipText: string;
    modelValue?: AnalysisModelSelection;
    isCached: boolean;
}> = ({ 
    title, icon, state, onRegenerate, children, isDataAvailable, isDisabled = false, tooltipText, modelValue, isCached
}) => {
    return (
        <div className={`bg-slate-900/70 p-3 rounded-md border ${state.error ? 'border-red-700/50' : 'border-slate-700/50'}`}>
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                    {icon} {title}
                </h3>
                <div className="flex items-center gap-2">
                    {isCached && !state.loading && <Tooltip text="Data ini dimuat dari cache sesi untuk mempercepat proses."><span className="text-xs text-teal-400 font-semibold">Cached</span></Tooltip>}
                    
                    <Tooltip text={isDisabled ? `Modul ini bergantung pada hasil dari modul sebelumnya.` : `(Segera Hadir) Buat ulang analisis untuk modul ${title} saja.`}>
                       <div>
                         <button onClick={onRegenerate} disabled={state.loading || isDisabled || true} className="disabled:opacity-50 disabled:cursor-not-allowed">
                             <RefreshIcon className={`w-4 h-4 ${state.loading ? 'animate-spin text-amber-400' : 'text-slate-400 hover:text-amber-400'}`} />
                         </button>
                       </div>
                    </Tooltip>
                </div>
            </div>
            <div className="text-xs text-slate-400 space-y-1">
                {state.loading && (
                    <div className="flex justify-between items-center gap-2">
                        <Shimmer />
                        {modelValue && (
                            <span className={`flex-shrink-0 text-xs font-bold animate-pulse ${modelValue === 'Pro' ? 'text-amber-300' : 'text-teal-300'}`}>
                                ({modelValue})
                            </span>
                        )}
                    </div>
                )}
                {state.error && <p className="text-red-400">Error: {state.error}</p>}
                {!state.loading && !state.error && isDataAvailable && children}
                {!state.loading && !state.error && !isDataAvailable && !isDisabled && <p className="italic text-slate-500">Menunggu analisis...</p>}
                {!state.loading && !state.error && !isDataAvailable && isDisabled && <p className="italic text-slate-500">Menunggu data terpadu...</p>}
            </div>
        </div>
    );
};

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ 
    unifiedData, dependentData, isLoading, error, isUnifiedCached, isDependentCached,
    secondaryAnalysisState, onRegenerate,
    sceneSource, analysisModels,
    interactionMask, onOpenMaskEditor, onClearMask,
}) => {
  
  const showSecondaryControls = sceneSource === 'upload' || sceneSource === 'reference';
  
  return (
    <Card 
      title="AI ANALYSIS ENGINE" 
      titleIcon={<CheckCircleIcon className="w-4 h-4"/>}
      tooltip="Mesin analisis multi-tahap VHMS. Setiap modul menganalisis aspek yang berbeda secara independen. Anda dapat membuat ulang analisis untuk setiap modul jika hasilnya tidak memuaskan."
      className="flex-grow"
    >
      <div className="space-y-3 max-h-[calc(100vh-300px)] min-h-[400px] overflow-y-auto pr-2">
        {isLoading && (
            <div className="space-y-2 p-3"><Shimmer /><Shimmer /><Shimmer /></div>
        )}

        {error && !isLoading && (
            <p className="text-sm text-red-400 p-3">Terjadi kesalahan analisis: {error}</p>
        )}
        
        {!isLoading && !error && !unifiedData && (
            <div className="text-center py-8 text-slate-500">
                <LayersIcon className="w-12 h-12 mx-auto opacity-30" />
                <p className="mt-2 font-semibold">Menunggu Analisis AI</p>
                <p className="text-xs mt-1">Lengkapi input dan klik "Mulai Generasi" untuk memulai.</p>
            </div>
        )}
        
        {unifiedData && (
          <div className="space-y-3">
                <div className="p-3 bg-slate-900/50 rounded-md border border-slate-700/50 text-xs text-slate-400 space-y-2">
                    <div className="flex justify-between items-center">
                        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                            <LayersIcon className="w-4 h-4"/> Rangkuman Analisis Primer
                        </h3>
                        {isUnifiedCached && <Tooltip text="Data ini dimuat dari cache sesi."><span className="text-xs text-teal-400 font-semibold">Cached</span></Tooltip>}
                    </div>
                    <div className="space-y-1">
                        <p><strong>Komposisi:</strong> {unifiedData.sceneComposition}</p>
                        <p><strong>Pencahayaan:</strong> {unifiedData.lighting}</p>
                        <p><strong>Kamera:</strong> {unifiedData.cameraDetails}</p>
                        {unifiedData.depthAnalysis.occlusionSuggestion && (
                            <div className="pt-2 mt-2 border-t border-slate-700/50">
                                <p className="font-semibold text-slate-300">Saran Interaksi Kedalaman:</p>
                                <p>"{unifiedData.depthAnalysis.occlusionSuggestion}"</p>
                                <div className="mt-2 flex items-center gap-3">
                                    <button
                                        onClick={onOpenMaskEditor}
                                        disabled={!showSecondaryControls}
                                        className="bg-amber-600/80 text-white text-xs font-semibold px-3 py-1 rounded-md hover:bg-amber-500 disabled:bg-slate-600 disabled:cursor-not-allowed flex items-center gap-1.5"
                                    >
                                        <EditIcon className="w-3 h-3"/>
                                        {interactionMask ? 'Edit Masker' : 'Buat Masker'}
                                    </button>
                                    {interactionMask && (
                                        <>
                                            <img src={interactionMask} alt="mask preview" className="w-8 h-8 rounded-sm border border-slate-600 object-contain bg-black" />
                                            <button onClick={onClearMask} title="Hapus Masker" className="text-red-400 hover:text-red-300">
                                                <TrashIcon className="w-4 h-4"/>
                                            </button>
                                        </>
                                    )}
                                </div>
                                {!showSecondaryControls && <p className="text-[11px] text-slate-500 mt-1">Buat Masker dinonaktifkan dalam mode 'Dari Prompt'.</p>}
                            </div>
                        )}
                    </div>
                </div>

                {showSecondaryControls && (
                    <>
                        <ModuleCard
                            title="VFX & Interaction"
                            icon={<MagicWandIcon className="w-4 h-4" />}
                            state={secondaryAnalysisState.vfx}
                            onRegenerate={() => onRegenerate('vfx')}
                            isDataAvailable={!!unifiedData.vfx}
                            isCached={isUnifiedCached}
                            tooltipText="Menganalisis scene untuk menemukan titik interaksi terbaik bagi subjek dan memberikan saran pencahayaan yang disempurnakan."
                            modelValue={analysisModels.vfx}
                        >
                            {unifiedData.vfx?.smartInteraction ? 
                                <p><strong>Interaksi Cerdas:</strong> {unifiedData.vfx.smartInteraction.placementSuggestion}</p>
                                : <p className="italic">Tidak ada interaksi cerdas yang disarankan.</p>
                            }
                            {unifiedData.vfx?.lightingSuggestion && <p><strong>Saran Pencahayaan:</strong> {unifiedData.vfx.lightingSuggestion}</p>}
                        </ModuleCard>

                        <ModuleCard
                            title="Adaptasi Pose"
                            icon={<PersonPoseIcon className="w-4 h-4" />}
                            state={secondaryAnalysisState.pose}
                            onRegenerate={() => onRegenerate('pose')}
                            isDataAvailable={!!dependentData?.pose}
                            isDisabled={!unifiedData.vfx?.smartInteraction}
                            isCached={isDependentCached}
                            tooltipText="Menyesuaikan pose subjek asli agar sesuai secara logis dengan titik interaksi yang disarankan oleh modul VFX."
                            modelValue={analysisModels.pose}
                        >
                           {dependentData?.pose && <p><strong>Pose Baru:</strong> {dependentData.pose.adaptedPoseDescription} (Confidence: {Math.round(dependentData.pose.confidenceScore * 100)}%)</p>}
                        </ModuleCard>

                        <ModuleCard
                            title="Analisis Bayangan"
                            icon={<SunIcon className="w-4 h-4" />}
                            state={secondaryAnalysisState.shadow}
                            onRegenerate={() => onRegenerate('shadow')}
                            isDataAvailable={!!dependentData?.shadow}
                            isDisabled={!dependentData?.pose}
                            isCached={isDependentCached}
                            tooltipText="Menghasilkan deskripsi bayangan yang realistis berdasarkan pose subjek yang telah diadaptasi, interaksi, dan pencahayaan scene."
                            modelValue={analysisModels.shadow}
                        >
                            {dependentData?.shadow && <p><strong>Deskripsi Bayangan:</strong> {dependentData.shadow.shadowDescription} (Arah: {dependentData.shadow.direction}, Kelembutan: {dependentData.shadow.softness})</p>}
                        </ModuleCard>

                        <ModuleCard
                            title="Analisis Perspektif & Skala"
                            icon={<BlueprintIcon className="w-4 h-4" />}
                            state={secondaryAnalysisState.perspective}
                            onRegenerate={() => onRegenerate('perspective')}
                            isDataAvailable={!!unifiedData.perspective}
                            isCached={isUnifiedCached}
                            tooltipText="Menganalisis garis perspektif scene untuk merekomendasikan skala proporsional yang benar bagi subjek."
                            modelValue={analysisModels.perspective}
                        >
                            {unifiedData.perspective && <p><strong>Skala Direkomendasikan:</strong> {Math.round(unifiedData.perspective.recommendedSubjectScale * 100)}% dari tinggi asli. ({unifiedData.perspective.reasoning})</p>}
                        </ModuleCard>

                        <ModuleCard
                            title="Analisis Fotometrik"
                            icon={<PaletteIcon className="w-4 h-4" />}
                            state={secondaryAnalysisState.photometric}
                            onRegenerate={() => onRegenerate('photometric')}
                            isDataAvailable={!!unifiedData.photometric}
                            isCached={isUnifiedCached}
                            tooltipText="Menganalisis pencahayaan scene secara mendalam untuk membuat rencana pencahayaan multi-titik yang teknis."
                            modelValue={analysisModels.photometric}
                        >
                            {unifiedData.photometric && (
                                <>
                                    <p><strong>Lampu Kunci:</strong> {unifiedData.photometric.keyLight.direction}, {unifiedData.photometric.keyLight.intensity}</p>
                                    <p><strong>Lampu Pengisi:</strong> {unifiedData.photometric.fillLight.direction}, {unifiedData.photometric.fillLight.intensity}</p>
                                    {unifiedData.photometric.rimLight && <p><strong>Lampu Rim:</strong> Hadir</p>}
                                    <p><strong>Mood Global:</strong> {unifiedData.photometric.globalMood}</p>
                                </>
                            )}
                        </ModuleCard>
                    </>
                )}
            </div>
        )}
      </div>
    </Card>
  );
};