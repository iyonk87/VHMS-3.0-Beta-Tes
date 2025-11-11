import React from 'react';
import type { 
    ComprehensiveAnalysisData, VFXSuggestions, PoseAdaptationData, ShadowCastingData, 
    PerspectiveAnalysisData, RegeneratableModule, SecondaryAnalysisModuleState, PhotometricAnalysisData, 
    SceneSource, AnalysisModelsState, AnalysisModelSelection
} from '../types';
import { Card } from './common/Card';
import { Tooltip } from './common/Tooltip';
import { 
    LayersIcon, CheckCircleIcon, XCircleIcon, RefreshIcon,
    MagicWandIcon, PersonPoseIcon, SunIcon, BlueprintIcon,
    PaletteIcon, EditIcon, TrashIcon
} from './icons/Icons';

interface AnalysisPanelProps {
  analysisData: ComprehensiveAnalysisData | null;
  isLoading: boolean;
  error: string | null;
  isCached: boolean;
  vfxData: VFXSuggestions | null;
  poseData: PoseAdaptationData | null;
  shadowData: ShadowCastingData | null;
  perspectiveData: PerspectiveAnalysisData | null;
  photometricData: PhotometricAnalysisData | null;
  secondaryAnalysisState: Record<RegeneratableModule, SecondaryAnalysisModuleState>;
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
    state: SecondaryAnalysisModuleState;
    onRegenerate: () => void;
    children: React.ReactNode;
    isDataAvailable: boolean;
    isDisabled?: boolean;
    tooltipText: string;
    modelValue?: AnalysisModelSelection;
}> = ({ 
    title, icon, state, onRegenerate, children, isDataAvailable, isDisabled = false, tooltipText, modelValue
}) => {
    return (
        <div className={`bg-slate-900/70 p-3 rounded-md border ${state.error ? 'border-red-700/50' : 'border-slate-700/50'}`}>
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                    {icon} {title}
                </h3>
                <div className="flex items-center gap-2">
                    {state.cached && !state.loading && <Tooltip text="Data ini dimuat dari cache sesi untuk mempercepat proses."><span className="text-xs text-teal-400 font-semibold">Cached</span></Tooltip>}
                    
                    <Tooltip text={isDisabled ? `Modul ini bergantung pada hasil dari modul sebelumnya.` : `Buat ulang analisis untuk modul ${title} saja.`}>
                       <div>
                         <button onClick={onRegenerate} disabled={state.loading || isDisabled} className="disabled:opacity-50 disabled:cursor-not-allowed">
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
                {!state.loading && !state.error && !isDataAvailable && !isDisabled && <p className="italic text-slate-500">Menunggu analisis primer...</p>}
                {!state.loading && !state.error && !isDataAvailable && isDisabled && <p className="italic text-slate-500">Menunggu modul sebelumnya...</p>}
            </div>
        </div>
    );
};

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ 
    analysisData, isLoading, error, isCached,
    vfxData, poseData, shadowData, perspectiveData, photometricData,
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
        
        {!isLoading && !error && !analysisData && (
            <div className="text-center py-8 text-slate-500">
                <LayersIcon className="w-12 h-12 mx-auto opacity-30" />
                <p className="mt-2 font-semibold">Menunggu Analisis AI</p>
                <p className="text-xs mt-1">Lengkapi input dan klik "Verifikasi Input" untuk memulai.</p>
            </div>
        )}
        
        {analysisData && (
          <div className="space-y-3">
                <div className="p-3 bg-slate-900/50 rounded-md border border-slate-700/50 text-xs text-slate-400 space-y-2">
                    <div className="flex justify-between items-center">
                        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                            <LayersIcon className="w-4 h-4"/> Rangkuman Analisis Primer
                        </h3>
                        {isCached && <Tooltip text="Data ini dimuat dari cache sesi."><span className="text-xs text-teal-400 font-semibold">Cached</span></Tooltip>}
                    </div>
                    <div className="space-y-1">
                        <p><strong>Komposisi:</strong> {analysisData.sceneComposition}</p>
                        <p><strong>Pencahayaan:</strong> {analysisData.lighting}</p>
                        <p><strong>Kamera:</strong> {analysisData.cameraDetails}</p>
                        {analysisData.depthAnalysis.occlusionSuggestion && (
                            <div className="pt-2 mt-2 border-t border-slate-700/50">
                                <p className="font-semibold text-slate-300">Saran Interaksi Kedalaman:</p>
                                <p>"{analysisData.depthAnalysis.occlusionSuggestion}"</p>
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
                            isDataAvailable={!!vfxData}
                            tooltipText="Menganalisis scene untuk menemukan titik interaksi terbaik bagi subjek dan memberikan saran pencahayaan yang disempurnakan."
                            modelValue={analysisModels.vfx}
                        >
                            {vfxData?.smartInteraction ? 
                                <p><strong>Interaksi Cerdas:</strong> {vfxData.smartInteraction.placementSuggestion}</p>
                                : <p className="italic">Tidak ada interaksi cerdas yang disarankan.</p>
                            }
                            {vfxData?.lightingSuggestion && <p><strong>Saran Pencahayaan:</strong> {vfxData.lightingSuggestion}</p>}
                        </ModuleCard>

                        <ModuleCard
                            title="Adaptasi Pose"
                            icon={<PersonPoseIcon className="w-4 h-4" />}
                            state={secondaryAnalysisState.pose}
                            onRegenerate={() => onRegenerate('pose')}
                            isDataAvailable={!!poseData}
                            isDisabled={!vfxData?.smartInteraction}
                            tooltipText="Menyesuaikan pose subjek asli agar sesuai secara logis dengan titik interaksi yang disarankan oleh modul VFX."
                            modelValue={analysisModels.pose}
                        >
                           {poseData && <p><strong>Pose Baru:</strong> {poseData.adaptedPoseDescription} (Confidence: {Math.round(poseData.confidenceScore * 100)}%)</p>}
                        </ModuleCard>

                        <ModuleCard
                            title="Analisis Bayangan"
                            icon={<SunIcon className="w-4 h-4" />}
                            state={secondaryAnalysisState.shadow}
                            onRegenerate={() => onRegenerate('shadow')}
                            isDataAvailable={!!shadowData}
                            isDisabled={!poseData}
                            tooltipText="Menghasilkan deskripsi bayangan yang realistis berdasarkan pose subjek yang telah diadaptasi, interaksi, dan pencahayaan scene."
                            modelValue={analysisModels.shadow}
                        >
                            {shadowData && <p><strong>Deskripsi Bayangan:</strong> {shadowData.shadowDescription} (Arah: {shadowData.direction}, Kelembutan: {shadowData.softness})</p>}
                        </ModuleCard>

                        <ModuleCard
                            title="Analisis Perspektif & Skala"
                            icon={<BlueprintIcon className="w-4 h-4" />}
                            state={secondaryAnalysisState.perspective}
                            onRegenerate={() => onRegenerate('perspective')}
                            isDataAvailable={!!perspectiveData}
                            tooltipText="Menganalisis garis perspektif scene untuk merekomendasikan skala proporsional yang benar bagi subjek."
                            modelValue={analysisModels.perspective}
                        >
                            {perspectiveData && <p><strong>Skala Direkomendasikan:</strong> {Math.round(perspectiveData.recommendedSubjectScale * 100)}% dari tinggi asli. ({perspectiveData.reasoning})</p>}
                        </ModuleCard>

                        <ModuleCard
                            title="Analisis Fotometrik"
                            icon={<PaletteIcon className="w-4 h-4" />}
                            state={secondaryAnalysisState.photometric}
                            onRegenerate={() => onRegenerate('photometric')}
                            isDataAvailable={!!photometricData}
                            tooltipText="Menganalisis pencahayaan scene secara mendalam untuk membuat rencana pencahayaan multi-titik yang teknis."
                            modelValue={analysisModels.photometric}
                        >
                            {photometricData && (
                                <>
                                    <p><strong>Lampu Kunci:</strong> {photometricData.keyLight.direction}, {photometricData.keyLight.intensity}</p>
                                    <p><strong>Lampu Pengisi:</strong> {photometricData.fillLight.direction}, {photometricData.fillLight.intensity}</p>
                                    {photometricData.rimLight && <p><strong>Lampu Rim:</strong> Hadir</p>}
                                    <p><strong>Mood Global:</strong> {photometricData.globalMood}</p>
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