import React, { useState, useCallback, useMemo, useEffect } from 'react';
import type { 
    FileWithPreview, SceneSource, StylePreset, Resolution, AppStatus, VerificationResult,
    ComprehensiveAnalysisData, VFXSuggestions, PoseAdaptationData, ShadowCastingData, 
    PerspectiveAnalysisData, PhotometricAnalysisData, SecondaryAnalysisModuleState, RegeneratableModule, HistoryItem, AnalysisModelsState, AnalysisModelSelection
} from '../types';

import { InputPanel } from '../components/InputPanel';
import { VerificationModal } from '../components/VerificationModal';
import { CropModal } from '../components/CropModal';
import { MaskEditor } from '../components/MaskEditor';
import { InpaintEditor } from '../components/InpaintEditor';
import { ApiKeyProvider } from './ApiKeyContext';
import ControlDeck, { type ActivePanel } from '../components/ControlDeck';
import { OutputPanel } from '../components/OutputPanel';


import * as geminiService from '../services/geminiService';
import { constructFinalPrompt } from './utils/promptUtils';
import { useFacialVectorAnalysis } from '../hooks/useFacialVectorAnalysis';

const initialSecondaryAnalysisState: Record<RegeneratableModule, SecondaryAnalysisModuleState> = {
    vfx: { loading: false, error: null, cached: false },
    pose: { loading: false, error: null, cached: false },
    shadow: { loading: false, error: null, cached: false },
    perspective: { loading: false, error: null, cached: false },
    photometric: { loading: false, error: null, cached: false },
};

const App: React.FC = () => {
    // --- State Management ---

    // 1. Input State
    const [subjectImage, setSubjectImage] = useState<FileWithPreview | null>(null);
    const [sceneImage, setSceneImage] = useState<FileWithPreview | null>(null);
    const [referenceImage, setReferenceImage] = useState<FileWithPreview | null>(null);
    const [outfitImage, setOutfitImage] = useState<FileWithPreview | null>(null);
    const [prompt, setPrompt] = useState<string>('');
    const [sceneSource, setSceneSource] = useState<SceneSource>('generate');
    
    // 2. Output & Generation Settings State
    const [stylePreset, setStylePreset] = useState<StylePreset>('Cinematic');
    const [resolution, setResolution] = useState<Resolution>('HD');
    const [outputImage, setOutputImage] = useState<string | null>(null);
    const [isHarmonizationEnabled, setIsHarmonizationEnabled] = useState<boolean>(true);
    
    // 3. Application Status & State Machine
    const [appStatus, setAppStatus] = useState<AppStatus>('IDLE');
    const [statusMessage, setStatusMessage] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [consistencyWarning, setConsistencyWarning] = useState<string | null>(null);
    
    // 4. Analysis Data State
    const [analysisData, setAnalysisData] = useState<ComprehensiveAnalysisData | null>(null);
    const [vfxData, setVfxData] = useState<VFXSuggestions | null>(null);
    const [poseData, setPoseData] = useState<PoseAdaptationData | null>(null);
    const [shadowData, setShadowData] = useState<ShadowCastingData | null>(null);
    const [perspectiveData, setPerspectiveData] = useState<PerspectiveAnalysisData | null>(null);
    const [photometricData, setPhotometricData] = useState<PhotometricAnalysisData | null>(null);
    const [secondaryAnalysisState, setSecondaryAnalysisState] = useState(initialSecondaryAnalysisState);
    const [analysisModels, setAnalysisModels] = useState<AnalysisModelsState>({
        subject: 'Pro', scene: 'Pro', vfx: 'Pro', pose: 'Fast', 
        shadow: 'Fast', perspective: 'Fast', photometric: 'Fast'
    });
    
    // 5. UI Modals & Interaction State
    const [isVerificationModalOpen, setVerificationModalOpen] = useState<boolean>(false);
    const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
    const [finalPrompt, setFinalPrompt] = useState<string | null>(null);
    const [isCropModalOpen, setCropModalOpen] = useState(false);
    const [imageToCrop, setImageToCrop] = useState<string | null>(null);
    const [isMaskEditorOpen, setMaskEditorOpen] = useState<boolean>(false);
    const [interactionMask, setInteractionMask] = useState<string | null>(null);
    const [isInpaintEditorOpen, setInpaintEditorOpen] = useState<boolean>(false);

    // 6. History
    const [history, setHistory] = useState<HistoryItem[]>([]);

    // 7. Custom Hooks
    const { state: facialVectorState, handlers: facialVectorHandlers } = useFacialVectorAnalysis();
    
    // 8. NEW: Control Deck State
    const [isControlDeckCollapsed, setIsControlDeckCollapsed] = useState(false);
    // FIX: Allow null to represent a closed state
    const [activeDeckPanel, setActiveDeckPanel] = useState<ActivePanel | null>('analysis');


    // --- Memos and Derived State ---
    const isAnalyzing = useMemo(() => appStatus.startsWith('ANALYZING'), [appStatus]);
    const canGenerate = useMemo(() => finalPrompt !== null && !isAnalyzing && appStatus !== 'GENERATING_IMAGE', [finalPrompt, isAnalyzing, appStatus]);
    
    // FIX: Stabilize the toggle function with useCallback to prevent stale references in child components.
    const handleToggleControlDeck = useCallback(() => {
        setIsControlDeckCollapsed(prev => !prev);
    }, []);

    // --- Core Application Logic ---

    // NEW: Smart clear logic for switching modes
    useEffect(() => {
        setPrompt('');
        setSceneImage(null);
        setReferenceImage(null);
    }, [sceneSource]);

    const resetState = (clearImages = false) => {
        setAppStatus('IDLE');
        setError(null);
        setAnalysisData(null);
        setVfxData(null);
        setPoseData(null);
        setShadowData(null);
        setPerspectiveData(null);
        setPhotometricData(null);
        setFinalPrompt(null);
        setOutputImage(null);
        setInteractionMask(null);
        setSecondaryAnalysisState(initialSecondaryAnalysisState);
        facialVectorHandlers.reset();

        if (clearImages) {
            setSubjectImage(null);
            setSceneImage(null);
            setReferenceImage(null);
            setOutfitImage(null);
            setPrompt('');
        }
    };
    
    useEffect(() => {
        setAnalysisData(null);
        setVfxData(null);
        setPoseData(null);
        setShadowData(null);
        setPerspectiveData(null);
        setPhotometricData(null);
        setFinalPrompt(null);
        setOutputImage(null);
        setInteractionMask(null);
        setSecondaryAnalysisState(initialSecondaryAnalysisState);
        facialVectorHandlers.reset();
        setActiveDeckPanel('analysis');
    }, [subjectImage, sceneImage, referenceImage, outfitImage, sceneSource, prompt, facialVectorHandlers]);


    const handleVerify = () => {
        const subject = { valid: !!subjectImage, message: subjectImage ? "Gambar subjek ditemukan." : "Kesalahan: Gambar subjek diperlukan." };
        let sceneType: 'info' | 'success' = 'success';
        let sceneMsg = "";
        let sceneValid = true;
        
        switch (sceneSource) {
            case 'upload':
                sceneValid = !!sceneImage;
                sceneMsg = sceneImage ? "Gambar latar belakang ditemukan." : "Kesalahan: Gambar latar belakang diperlukan untuk mode ini.";
                break;
            case 'reference':
                sceneValid = !!referenceImage;
                sceneMsg = referenceImage ? "Gambar referensi ditemukan." : "Kesalahan: Gambar referensi diperlukan untuk mode ini.";
                break;
            case 'generate':
                sceneType = 'info';
                sceneMsg = "Info: Scene akan dibuat dari prompt.";
                break;
        }

        const scene = { valid: sceneValid, message: sceneMsg, type: sceneType };
        const outfit = { valid: true, message: outfitImage ? "Info: Gambar outfit akan digunakan." : "Info: Tidak ada gambar outfit yang disediakan.", type: 'info' as 'info' };
        const promptResult = { valid: prompt.trim().length > 0, message: prompt.trim().length > 0 ? "Prompt deskriptif ditemukan." : "Kesalahan: Prompt tidak boleh kosong." };

        const overallValid = subject.valid && scene.valid && promptResult.valid;
        const result: VerificationResult = {
            subject, scene, outfit, prompt: promptResult,
            overall: {
                valid: overallValid,
                message: overallValid ? "Semua input valid. Siap untuk analisis AI." : "Harap perbaiki kesalahan input sebelum melanjutkan."
            },
            promptSnippet: prompt || "Tidak ada prompt yang disediakan."
        };
        
        setVerificationResult(result);
        setVerificationModalOpen(true);
        
        if (overallValid) {
            resetState();
            runPrimaryAnalysis();
        }
    };
    
    const runPrimaryAnalysis = async () => {
        if (!subjectImage) return;

        setAppStatus('ANALYZING_PRIMARY');
        setStatusMessage('Menganalisis Subjek & Scene...');
        facialVectorHandlers.handleAnalysisStart();
        setActiveDeckPanel('analysis');
        setIsControlDeckCollapsed(false);

        try {
            const { data, isCached } = await geminiService.performComprehensiveAnalysis(
                subjectImage, sceneImage, referenceImage, outfitImage, sceneSource, prompt,
                analysisModels.subject, analysisModels.scene
            );
            setAnalysisData(data);
            facialVectorHandlers.handleAnalysisSuccess(data, isCached);
            
            if (sceneSource === 'upload' || sceneSource === 'reference') {
                runAllSecondaryAnalyses(data);
            } else {
                setAppStatus('IDLE');
                setActiveDeckPanel('prompt');
            }
            
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : String(e);
            setError(errorMsg);
            setAppStatus('ERROR');
            facialVectorHandlers.handleAnalysisError(errorMsg);
        }
    };
    
    const runAllSecondaryAnalyses = async (primaryData: ComprehensiveAnalysisData) => {
        setAppStatus('ANALYZING_SECONDARY');

        // Helper function to add a delay
        const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
        
        const imageForSecondary = sceneSource === 'upload' ? sceneImage : referenceImage;
        if (!imageForSecondary) {
            console.error("No image available for secondary analysis.");
            setAppStatus('IDLE');
            setActiveDeckPanel('prompt');
            return;
        }
        
        // This function now runs sequentially with delays to prevent rate-limiting
        const runAnalysesWithStaggering = async () => {
            try {
                // --- Chain 1: Dependent Analyses ---
                setStatusMessage('Menganalisis: VFX & Interaksi...');
                setSecondaryAnalysisState(s => ({ ...s, vfx: { ...s.vfx, loading: true } }));
                const { data: vfxRes, isCached: vfxCached } = await geminiService.getVFXSuggestions(imageForSecondary, primaryData, analysisModels.vfx);
                setVfxData(vfxRes);
                setSecondaryAnalysisState(s => ({ ...s, vfx: { loading: false, error: null, cached: vfxCached } }));

                await sleep(250); // Stagger before next call

                if (vfxRes.smartInteraction) {
                    setStatusMessage('Menganalisis: Adaptasi Pose...');
                    setSecondaryAnalysisState(s => ({ ...s, pose: { ...s.pose, loading: true } }));
                    const { data: poseRes, isCached: poseCached } = await geminiService.adaptPoseForInteraction(subjectImage!, primaryData.subjectPose, vfxRes.smartInteraction.placementSuggestion, analysisModels.pose);
                    setPoseData(poseRes);
                    setSecondaryAnalysisState(s => ({ ...s, pose: { loading: false, error: null, cached: poseCached } }));
                    
                    await sleep(250); // Stagger before next call

                    setStatusMessage('Menganalisis: Bayangan...');
                    setSecondaryAnalysisState(s => ({ ...s, shadow: { ...s.shadow, loading: true } }));
                    const { data: shadowRes, isCached: shadowCached } = await geminiService.generateShadowDescription(poseRes.adaptedPoseDescription, vfxRes.smartInteraction.placementSuggestion, primaryData.lighting, analysisModels.shadow);
                    setShadowData(shadowRes);
                    setSecondaryAnalysisState(s => ({ ...s, shadow: { loading: false, error: null, cached: shadowCached } }));

                } else {
                    setSecondaryAnalysisState(s => ({ ...s, pose: { loading: false, error: null, cached: false } }));
                    setStatusMessage('Menganalisis: Bayangan...');
                    setSecondaryAnalysisState(s => ({ ...s, shadow: { ...s.shadow, loading: true } }));
                    const { data: shadowRes, isCached: shadowCached } = await geminiService.generateShadowDescription(primaryData.subjectPose, "No specific interaction", primaryData.lighting, analysisModels.shadow);
                    setShadowData(shadowRes);
                    setSecondaryAnalysisState(s => ({ ...s, shadow: { loading: false, error: null, cached: shadowCached } }));
                }
                
                await sleep(250); // Stagger before next chain

                // --- Chain 2: Independent Analyses ---
                setStatusMessage('Menganalisis: Perspektif...');
                setSecondaryAnalysisState(s => ({ ...s, perspective: { ...s.perspective, loading: true } }));
                const { data: perspRes, isCached: perspCached } = await geminiService.analyzeScenePerspective(imageForSecondary, analysisModels.perspective);
                setPerspectiveData(perspRes);
                setSecondaryAnalysisState(s => ({ ...s, perspective: { loading: false, error: null, cached: perspCached } }));

                await sleep(250); // Stagger before next call

                setStatusMessage('Menganalisis: Fotometrik...');
                setSecondaryAnalysisState(s => ({ ...s, photometric: { ...s.photometric, loading: true } }));
                const { data: photoRes, isCached: photoCached } = await geminiService.performPhotometricAnalysis(imageForSecondary, primaryData.lighting, analysisModels.photometric);
                setPhotometricData(photoRes);
                setSecondaryAnalysisState(s => ({ ...s, photometric: { loading: false, error: null, cached: photoCached } }));

            } catch(e) {
                const errorMsg = e instanceof Error ? e.message : String(e);
                console.error("Error during staggered secondary analysis chain:", e);
                setError(errorMsg);
                setAppStatus('ERROR');
            }
        };
        
        await runAnalysesWithStaggering();
        
        setAppStatus('IDLE');
        setStatusMessage('');
        setActiveDeckPanel('prompt');
    };

    const runVFXAnalysis = useCallback(async (sceneImage: FileWithPreview, primaryData: ComprehensiveAnalysisData) => {
        setStatusMessage('Menganalisis: VFX & Interaksi...');
        setSecondaryAnalysisState(s => ({ ...s, vfx: { ...s.vfx, loading: true, error: null } }));
        try {
            const { data: vfxRes, isCached: vfxCached } = await geminiService.getVFXSuggestions(sceneImage, primaryData, analysisModels.vfx);
            setVfxData(vfxRes);
            setSecondaryAnalysisState(s => ({ ...s, vfx: { loading: false, error: null, cached: vfxCached } }));
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : String(e);
            setSecondaryAnalysisState(s => ({ ...s, vfx: { loading: false, error: errorMsg, cached: false } }));
            setError(errorMsg);
        }
    }, [analysisModels.vfx]);

    const runPoseAnalysis = useCallback(async (originalPose: string, interactionDescription: string) => {
        if (!subjectImage) return;
        setStatusMessage('Menganalisis: Adaptasi Pose...');
        setSecondaryAnalysisState(s => ({ ...s, pose: { ...s.pose, loading: true, error: null } }));
        try {
            const { data: poseRes, isCached: poseCached } = await geminiService.adaptPoseForInteraction(subjectImage, originalPose, interactionDescription, analysisModels.pose);
            setPoseData(poseRes);
            setSecondaryAnalysisState(s => ({ ...s, pose: { loading: false, error: null, cached: poseCached } }));
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : String(e);
            setSecondaryAnalysisState(s => ({ ...s, pose: { loading: false, error: errorMsg, cached: false } }));
            setError(errorMsg);
        }
    }, [subjectImage, analysisModels.pose]);
    
    const runShadowAnalysis = useCallback(async (adaptedPose: string, interaction: string, lighting: string) => {
        setStatusMessage('Menganalisis: Bayangan...');
        setSecondaryAnalysisState(s => ({ ...s, shadow: { ...s.shadow, loading: true, error: null } }));
        try {
            const { data: shadowRes, isCached: shadowCached } = await geminiService.generateShadowDescription(adaptedPose, interaction, lighting, analysisModels.shadow);
            setShadowData(shadowRes);
            setSecondaryAnalysisState(s => ({ ...s, shadow: { loading: false, error: null, cached: shadowCached } }));
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : String(e);
            setSecondaryAnalysisState(s => ({ ...s, shadow: { loading: false, error: errorMsg, cached: false } }));
            setError(errorMsg);
        }
    }, [analysisModels.shadow]);

    const runPerspectiveAnalysis = useCallback(async (sceneImage: FileWithPreview) => {
        setStatusMessage('Menganalisis: Perspektif...');
        setSecondaryAnalysisState(s => ({ ...s, perspective: { ...s.perspective, loading: true, error: null } }));
        try {
            const { data: perspRes, isCached: perspCached } = await geminiService.analyzeScenePerspective(sceneImage, analysisModels.perspective);
            setPerspectiveData(perspRes);
            setSecondaryAnalysisState(s => ({ ...s, perspective: { loading: false, error: null, cached: perspCached } }));
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : String(e);
            setSecondaryAnalysisState(s => ({ ...s, perspective: { loading: false, error: errorMsg, cached: false } }));
            setError(errorMsg);
        }
    }, [analysisModels.perspective]);

    const runPhotometricAnalysis = useCallback(async (sceneImage: FileWithPreview, primaryLightingDescription: string) => {
        setStatusMessage('Menganalisis: Fotometrik...');
        setSecondaryAnalysisState(s => ({ ...s, photometric: { ...s.photometric, loading: true, error: null } }));
        try {
            const { data: photoRes, isCached: photoCached } = await geminiService.performPhotometricAnalysis(sceneImage, primaryLightingDescription, analysisModels.photometric);
            setPhotometricData(photoRes);
            setSecondaryAnalysisState(s => ({ ...s, photometric: { loading: false, error: null, cached: photoCached } }));
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : String(e);
            setSecondaryAnalysisState(s => ({ ...s, photometric: { loading: false, error: errorMsg, cached: false } }));
            setError(errorMsg);
        }
    }, [analysisModels.photometric]);

    const handleRegenerateModule = useCallback(async (module: RegeneratableModule) => {
        if (!analysisData) return;
        const imageForSecondary = sceneSource === 'upload' ? sceneImage : referenceImage;
        if (!imageForSecondary) return;
        
        setAppStatus('ANALYZING_SECONDARY');

        try {
            switch (module) {
                case 'vfx':
                    await runVFXAnalysis(imageForSecondary, analysisData);
                    break;
                case 'pose':
                    if(vfxData?.smartInteraction) await runPoseAnalysis(analysisData.subjectPose, vfxData.smartInteraction.placementSuggestion);
                    break;
                case 'shadow':
                    const pose = poseData?.adaptedPoseDescription || analysisData.subjectPose;
                    const interaction = vfxData?.smartInteraction?.placementSuggestion || "No specific interaction";
                    await runShadowAnalysis(pose, interaction, analysisData.lighting);
                    break;
                case 'perspective':
                    await runPerspectiveAnalysis(imageForSecondary);
                    break;
                case 'photometric':
                    await runPhotometricAnalysis(imageForSecondary, analysisData.lighting);
                    break;
            }
        } finally {
            setAppStatus('IDLE');
            setStatusMessage('');
        }
    }, [analysisData, sceneSource, sceneImage, referenceImage, vfxData, poseData, runVFXAnalysis, runPoseAnalysis, runShadowAnalysis, runPerspectiveAnalysis, runPhotometricAnalysis]);
    
    useEffect(() => {
        if (analysisData) {
            const newPrompt = constructFinalPrompt(
                prompt, sceneSource, analysisData, vfxData, poseData, 
                shadowData, perspectiveData, photometricData, stylePreset, resolution
            );
            setFinalPrompt(newPrompt);
        } else {
            setFinalPrompt(null);
        }
    }, [analysisData, vfxData, poseData, shadowData, perspectiveData, photometricData, prompt, sceneSource, stylePreset, resolution]);

    const handleGenerate = async () => {
        if (!finalPrompt || !subjectImage) return;

        setAppStatus('GENERATING_IMAGE');
        setStatusMessage('Menghasilkan Gambar Komposit...');
        setError(null);

        try {
            let generatedImage = await geminiService.generateFinalImage(
                finalPrompt, sceneSource, subjectImage, sceneImage, referenceImage, interactionMask
            );

            if (isHarmonizationEnabled) {
                setAppStatus('HARMONIZING');
                setStatusMessage('Menjalankan Harmonisasi Akhir...');
                generatedImage = await geminiService.performHarmonization(generatedImage, analysisData!);
            }
            
            setOutputImage(generatedImage);
            setAppStatus('DONE');
            
            const historyItem: HistoryItem = {
                id: `hist-${Date.now()}`,
                timestamp: Date.now(),
                outputImage: generatedImage,
                inputs: {
                    subjectImage, sceneImage, referenceImage, outfitImage, prompt,
                    sceneSource, stylePreset, resolution
                }
            };
            setHistory(h => [historyItem, ...h]);

        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : String(e);
            setError(errorMsg);
            setAppStatus('ERROR');
        }
    };
    
    const handleOpenCropModal = useCallback((file: FileWithPreview) => {
        setImageToCrop(file.preview);
        setCropModalOpen(true);
    }, []);

    const handleApplyCrop = useCallback((croppedDataUrl: string) => {
        fetch(croppedDataUrl)
            .then(res => res.blob())
            .then(blob => {
                const file = new File([blob], "cropped_outfit.png", { type: "image/png" });
                const fileWithPreview = Object.assign(file, { preview: croppedDataUrl });
                setOutfitImage(fileWithPreview);
                setCropModalOpen(false);
            });
    }, []);

    const handleModelChange = (module: keyof AnalysisModelsState, value: AnalysisModelSelection) => {
        setAnalysisModels(prev => ({...prev, [module]: value}));
    };

    const onClearMask = useCallback(() => {
        setInteractionMask(null);
        console.log("[VHMS]: Masker interaksi telah dihapus.");
    }, []);
    
    // FIX: Memoize complex prop objects passed to ControlDeck to prevent unnecessary re-renders.
    const analysisProps = useMemo(() => ({
        analysisData,
        isLoading: appStatus === 'ANALYZING_PRIMARY',
        error: error && appStatus === 'ERROR' ? error : null,
        isCached: false, // This needs a more sophisticated logic if we want to show primary cache status
        vfxData,
        poseData,
        shadowData,
        perspectiveData,
        photometricData,
        secondaryAnalysisState,
        onRegenerate: handleRegenerateModule,
        sceneSource,
        analysisModels,
        interactionMask,
        onOpenMaskEditor: () => setMaskEditorOpen(true),
        onClearMask,
    }), [analysisData, appStatus, error, vfxData, poseData, shadowData, perspectiveData, photometricData, secondaryAnalysisState, handleRegenerateModule, sceneSource, analysisModels, interactionMask, onClearMask]);

    const promptProps = useMemo(() => ({
        finalPrompt,
        isAnalyzing,
        onRegenerate: () => { /* TODO: Regenerate final prompt logic */ },
        onPromptChange: setFinalPrompt,
    }), [finalPrompt, isAnalyzing]);
    
    const historyProps = useMemo(() => ({
        history,
        onReload: () => {}, // TODO
    }), [history]);

    const vectorProps = useMemo(() => ({
        vectorData: facialVectorState.vectorData,
        isLoading: facialVectorState.isLoading,
        error: facialVectorState.error,
        isCached: facialVectorState.isCached,
        hasSubject: !!subjectImage,
    }), [facialVectorState, subjectImage]);
    
    // FIX: Implement the correct accordion toggle logic.
    const handlePanelChange = useCallback((panel: ActivePanel) => {
        setActiveDeckPanel(prev => (prev === panel ? null : panel));
    }, []);

    const sceneImageForEditor = useMemo(() => {
        return sceneSource === 'upload' ? sceneImage : referenceImage;
    }, [sceneSource, sceneImage, referenceImage]);

    return (
        <ApiKeyProvider>
            <div className="bg-slate-900 text-slate-100 min-h-screen flex flex-col font-sans">
                <header className="bg-slate-950/70 backdrop-blur-sm p-3 border-b border-slate-700 sticky top-0 z-40">
                    <h1 className="text-xl font-bold text-center">
                        <span className="text-amber-400">VHMS</span> - Visual Harmony & Merge System
                    </h1>
                </header>
                
                <main className={`flex-grow p-4 grid grid-cols-12 gap-4 transition-all duration-300 ease-in-out`}>
                    
                    <div className={`transition-all duration-300 ease-in-out ${isControlDeckCollapsed ? 'col-span-12 lg:col-span-11' : 'col-span-12 lg:col-span-7'} space-y-4 flex flex-col`}>
                        <OutputPanel
                            outputImage={outputImage}
                            appStatus={appStatus}
                            statusMessage={statusMessage}
                            onGenerate={handleGenerate}
                            onVerify={handleVerify}
                            canGenerate={canGenerate}
                            error={error}
                            onStartEditing={() => setInpaintEditorOpen(true)}
                            consistencyWarning={consistencyWarning}
                            sceneSource={sceneSource}
                            analysisModels={analysisModels}
                            onModelChange={handleModelChange}
                            analysisData={analysisData}
                        />
                        <InputPanel
                            subjectImage={subjectImage}
                            setSubjectImage={setSubjectImage}
                            sceneImage={sceneImage}
                            setSceneImage={setSceneImage}
                            referenceImage={referenceImage}
                            setReferenceImage={setReferenceImage}
                            outfitImage={outfitImage}
                            onOpenCropModal={handleOpenCropModal}
                            prompt={prompt}
                            setPrompt={setPrompt}
                            sceneSource={sceneSource}
                            setSceneSource={setSceneSource}
                            stylePreset={stylePreset}
                            setStylePreset={setStylePreset}
                            resolution={resolution}
                            setResolution={setResolution}
                            isHarmonizationEnabled={isHarmonizationEnabled}
                            setIsHarmonizationEnabled={setIsHarmonizationEnabled}
                        />
                    </div>

                    <div className={`transition-all duration-300 ease-in-out ${isControlDeckCollapsed ? 'col-span-12 lg:col-span-1' : 'col-span-12 lg:col-span-5'}`}>
                       <ControlDeck
                           isCollapsed={isControlDeckCollapsed}
                           onToggle={handleToggleControlDeck}
                           activePanel={activeDeckPanel}
                           onPanelChange={handlePanelChange}
                           analysisProps={analysisProps}
                           promptProps={promptProps}
                           historyProps={historyProps}
                           vectorProps={vectorProps}
                       />
                    </div>
                </main>

                {verificationResult && (
                    <VerificationModal 
                        isOpen={isVerificationModalOpen}
                        onClose={() => setVerificationModalOpen(false)}
                        result={verificationResult}
                    />
                )}
                {isCropModalOpen && imageToCrop && (
                    <CropModal
                        isOpen={isCropModalOpen}
                        onClose={() => setCropModalOpen(false)}
                        imageSrc={imageToCrop}
                        onApply={handleApplyCrop}
                    />
                )}
                {isMaskEditorOpen && sceneImageForEditor && analysisData?.depthAnalysis.occlusionSuggestion && (
                    <MaskEditor 
                        isOpen={isMaskEditorOpen}
                        onClose={() => setMaskEditorOpen(false)}
                        imageSrc={sceneImageForEditor.preview}
                        onApply={(maskDataUrl) => {
                           setInteractionMask(maskDataUrl);
                           setMaskEditorOpen(false);
                        }}
                        occlusionSuggestion={analysisData.depthAnalysis.occlusionSuggestion}
                        sceneImage={sceneImageForEditor}
                    />
                )}
                {isInpaintEditorOpen && outputImage && (
                    <InpaintEditor
                        isOpen={isInpaintEditorOpen}
                        onClose={() => setInpaintEditorOpen(false)}
                        imageSrc={outputImage}
                        onApply={(newImage) => {
                            setOutputImage(newImage);
                            setInpaintEditorOpen(false);
                        }}
                    />
                )}
            </div>
        </ApiKeyProvider>
    );
}

export default App;