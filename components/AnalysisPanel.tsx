import React from 'react';
import type { 
    ComprehensiveAnalysisData, VFXSuggestions, PoseAdaptationData, ShadowCastingData, 
    PerspectiveAnalysisData, RegeneratableModule, SecondaryAnalysisModuleState, PhotometricAnalysisData, 
    SceneSource, AnalysisModelsState, AnalysisModelSelection
} from '../types';
import { Card } from './common/Card';
import { Tooltip } from './common/Tooltip';
import { ModelToggleSwitch } from './common/ModelToggleSwitch';
// FIX: Corrected import to point to the new centralized Icons.tsx file.
import { 
    LayersIcon, CheckCircleIcon, XCircleIcon, RefreshIcon,
    MagicWandIcon, PersonPoseIcon, SunIcon, BlueprintIcon,
    PaletteIcon,
    InfoCircleIcon
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
  onModelChange: (module: keyof AnalysisModelsState, value: AnalysisModelSelection) => void;
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
    modelValue?: AnalysisModelSelection; // NEW: For visual verification
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

// NEW: Component for the model configuration section
const ModelConfiguration: React.FC<{
    analysisModels: AnalysisModelsState;
    onModelChange: (module: keyof AnalysisModelsState, value: AnalysisModelSelection) => void;
    isDisabled: boolean;
}> = ({ analysisModels, onModelChange, isDisabled }) => {
    const modules: { key: keyof AnalysisModelsState; label: string }[] = [
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
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2">
                {modules.map(({ key, label }) => (
                    <div key={key} className="flex justify-between items-center">
                        <label className="text-xs text-slate-300">{label}</label>
                        <div className="w-20">
                            <ModelToggleSwitch
                                value={analysisModels[key]}
                                onChange={(val) => onModelChange(key, val)}
                                disabled={isDisabled}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};


export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ 
    analysisData, isLoading, error, isCached,
    vfxData, poseData, shadowData, perspectiveData, photometricData,
    secondaryAnalysisState, onRegenerate,
    sceneSource, analysisModels, onModelChange
}) => {
  
  const showSecondaryControls = sceneSource === 'upload' || sceneSource === 'reference';

  const renderPrimaryAnalysis = () => {
    if (isLoading) return <div className="space-y-2"><Shimmer /><Shimmer /><Shimmer /></div>;
    if (error) return <p className="text-sm text-red-400">Terjadi kesalahan analisis: {error}</p>;
    if (!analysisData) {
      return (
        <div className="text-center py-8 text-slate-500">
            <LayersIcon className="w-12 h-12 mx-auto opacity-30" />
            <p className="mt-2 font-semibold">Menunggu Analisis AI</p>
            <p className="text-xs mt-1">Lengkapi input dan klik "Verifikasi Input" untuk memulai.</p>
        </div>
      );
    }
    return (
        <div className="p-3 bg-slate-900/50 rounded-md border border-slate-700/50">
             <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                    <LayersIcon className="w-4 h-4"/> Analisis Primer
                </h3>
                 {isCached && <Tooltip text="Data ini dimuat dari cache sesi."><span className="text-xs text-teal-400 font-semibold">Cached</span></Tooltip>}
            </div>
            <p className="text-xs text-slate-400">
                Analisis fundamental dari scene dan subjek telah berhasil diselesaikan. Data ini akan menjadi dasar untuk semua modul analisis sekunder.
            </p>
             <details className="mt-2 text-xs">
                <summary className="cursor-pointer text-amber-400 hover:underline">Tampilkan Detail Analisis Primer</summary>
                <div className="mt-2 space-y-1 p-2 bg-slate-950/50 rounded">
                    <p><strong>Lighting:</strong> {analysisData.lighting}</p>
                    <p><strong>Pose:</strong> {analysisData.subjectPose}</p>
                    <p><strong>Komposisi:</strong> {analysisData.sceneComposition}</p>
                    <p className="font-mono text-slate-500 text-[10px] leading-relaxed"><strong>Identity Lock:</strong> "{analysisData.identityLock}"</p>
                </div>
            </details>
        </div>
    );
  };
  
  return (
    <Card 
      title="AI ANALYSIS ENGINE" 
      titleIcon={<CheckCircleIcon className="w-4 h-4"/>}
      tooltip="Mesin analisis multi-tahap VHMS. Setiap modul menganalisis aspek yang berbeda secara independen. Anda dapat membuat ulang analisis untuk setiap modul jika hasilnya tidak memuaskan."
      className="flex-grow"
    >
      <div className="space-y-3 max-h-[calc(100vh-300px)] min-h-[400px] overflow-y-auto pr-2">
        
        {/* CORRECTED LOGIC: Show configuration BEFORE analysis runs */}
        {showSecondaryControls && (
            <ModelConfiguration 
                analysisModels={analysisModels}
                onModelChange={onModelChange}
                isDisabled={isLoading || !!analysisData} // Disable after analysis starts
            />
        )}

        {/* Show primary analysis placeholder/results */}
        {!analysisData && !isLoading && !error && (
            <div className="text-center py-8 text-slate-500">
                <LayersIcon className="w-12 h-12 mx-auto opacity-30" />
                <p className="mt-2 font-semibold">Menunggu Analisis AI</p>
                <p className="text-xs mt-1">Lengkapi input dan klik "Verifikasi Input" untuk memulai.</p>
            </div>
        )}
        
        {isLoading && <div className="space-y-2 p-3"><Shimmer /><Shimmer /><Shimmer /></div>}
        {error && !isLoading && <p className="text-sm text-red-400 p-3">Terjadi kesalahan analisis: {error}</p>}
        
        {/* Show results AFTER analysis is complete */}
        {analysisData && (
          <div className="space-y-3 pt-3 border-t border-slate-700">
                <div className="p-3 bg-slate-900/50 rounded-md border border-slate-700/50">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                            <LayersIcon className="w-4 h-4"/> Analisis Primer
                        </h3>
                        {isCached && <Tooltip text="Data ini dimuat dari cache sesi."><span className="text-xs text-teal-400 font-semibold">Cached</span></Tooltip>}
                    </div>
                    <p className="text-xs text-slate-400">
                        Analisis fundamental dari scene dan subjek telah berhasil diselesaikan.
                    </p>
                </div>

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
                    isDisabled={!vfxData?.smartInteraction || !showSecondaryControls}
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
                    isDisabled={!poseData || !showSecondaryControls}
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
                    isDisabled={!showSecondaryControls}
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
                    isDisabled={!showSecondaryControls}
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
            </div>
        )}
      </div>
    </Card>
  );
};
