import React, { useState, useCallback, useMemo, useEffect } from 'react';
import type { 
    FileWithPreview, SceneSource, StylePreset, Resolution, AppStatus, VerificationResult,
    ComprehensiveAnalysisData, VFXSuggestions, PoseAdaptationData, ShadowCastingData, 
    PerspectiveAnalysisData, PhotometricAnalysisData, SecondaryAnalysisModuleState, RegeneratableModule, HistoryItem, AnalysisModelsState, AnalysisModelSelection,
    ProxyStatus
} from '../types';

import { InputPanel } from '../components/InputPanel';
import { VerificationModal } from '../components/VerificationModal';
import { CropModal } from '../components/CropModal';
import { MaskEditor } from '../components/MaskEditor';
import { InpaintEditor } from '../components/InpaintEditor';
import { ApiKeyProvider } from './ApiKeyContext';
import { OutputPanel } from '../components/OutputPanel';
import { PromptEnginePanel } from '../components/PromptEnginePanel';
import { ProxyStatusIndicator } from '../components/common/ProxyStatusIndicator';


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
    const [proxyStatus, setProxyStatus] = useState<ProxyStatus>('IDLE');
    
    // 4. Analysis Data State
    const [analysisData, setAnalysisData] = useState<ComprehensiveAnalysisData | null>(null);
    const [isPrimaryAnalysisCached, setIsPrimaryAnalysisCached] = useState<boolean>(false);
    const [vfxData, setVfxData] = useState<VFXSuggestions | null>(null);
    const [poseData, setPoseData] = useState<PoseAdaptationData | null>(null);
    const [shadowData, setShadowData] = useState<ShadowCastingData | null>(null);
    const [perspectiveData, setPerspectiveData] = useState<PerspectiveAnalysisData | null>(null);
    const [photometricData, setPhotometricData] = useState<PhotometricAnalysisData | null>(null);
    const [secondaryAnalysisState, setSecondaryAnalysisState] = useState(initialSecondaryAnalysisState);
    const [analysisModels, setAnalysisModels] = useState<AnalysisModelsState>({
        subject: 'Fast', scene: 'Fast', vfx: 'Fast', pose: 'Fast', 
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
    const { handlers: facialVectorHandlers } = useFacialVectorAnalysis();
    
    // --- Memos and Derived State ---
    const isAnalyzing = useMemo(() => appStatus.startsWith('ANALYZING'), [appStatus]);
    const isBusy = useMemo(() => !['IDLE', 'DONE', 'ERROR'].includes(appStatus), [appStatus]);

    // --- Core Application Logic ---

    // NEW: Smart clear logic for switching modes
    useEffect(() => {
        setPrompt('');
        setSceneImage(null);
        setReferenceImage(null);
    }, [sceneSource]);

    const resetState = useCallback((clearImages = false) => {
        setAppStatus('IDLE');
        setError(null);
        setAnalysisData(null);
        setIsPrimaryAnalysisCached(false);
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
    }, [facialVectorHandlers]);
    
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
    }, [subjectImage, sceneImage, referenceImage, outfitImage, sceneSource, prompt, facialVectorHandlers]);

    const performValidation = useCallback((): VerificationResult => {
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

        const errorParts = [];
        if (!subject.valid) errorParts.push("gambar subjek");
        if (!scene.valid) errorParts.push("gambar scene/referensi");
        if (!promptResult.valid) errorParts.push("prompt");

        const overallValid = subject.valid && scene.valid && promptResult.valid;
        const result: VerificationResult = {
            subject, scene, outfit, prompt: promptResult,
            overall: {
                valid: overallValid,
                message: overallValid 
                    ? "Semua input valid. Siap untuk analisis AI." 
                    : `Harap perbaiki input yang kurang: ${errorParts.join(', ')}.`
            },
            promptSnippet: prompt || "Tidak ada prompt yang disediakan."
        };
        
        return result;
    }, [subjectImage, sceneImage, referenceImage, outfitImage, sceneSource, prompt]);
    
    const runAllSecondaryAnalysesAndGetData = useCallback(async (primaryData: ComprehensiveAnalysisData) => {
        setAppStatus('ANALYZING_SECONDARY');

        const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
        
        const imageForSecondary = sceneSource === 'upload' ? sceneImage : referenceImage;
        if (!imageForSecondary) {
            console.error("No image available for secondary analysis.");
            setAppStatus('IDLE');
            return { vfx: null, pose: null, shadow: null, perspective: null, photometric: null };
        }
        
        let vfxRes: VFXSuggestions | null = null;
        let poseRes: PoseAdaptationData | null = null;
        let shadowRes: ShadowCastingData | null = null;
        let perspRes: PerspectiveAnalysisData | null = null;
        let photoRes: PhotometricAnalysisData | null = null;
        
        try {
            setStatusMessage('Menganalisis: VFX & Interaksi...');
            setSecondaryAnalysisState(s => ({ ...s, vfx: { ...s.vfx, loading: true } }));
            setProxyStatus('PENDING');
            const { data: vfxData, isCached: vfxCached } = await geminiService.getVFXSuggestions(imageForSecondary, primaryData, analysisModels.vfx);
            vfxRes = vfxData;
            setVfxData(vfxRes);
            setSecondaryAnalysisState(s => ({ ...s, vfx: { loading: false, error: null, cached: vfxCached } }));
            setProxyStatus('SUCCESS');
            await sleep(250);

            if (vfxRes.smartInteraction) {
                setStatusMessage('Menganalisis: Adaptasi Pose...');
                setSecondaryAnalysisState(s => ({ ...s, pose: { ...s.pose, loading: true } }));
                setProxyStatus('PENDING');
                const { data: poseData, isCached: poseCached } = await geminiService.adaptPoseForInteraction(subjectImage!, primaryData.subjectPose, vfxRes.smartInteraction.placementSuggestion, analysisModels.pose);
                poseRes = poseData;
                setPoseData(poseRes);
                setSecondaryAnalysisState(s => ({ ...s, pose: { loading: false, error: null, cached: poseCached } }));
                setProxyStatus('SUCCESS');
                await sleep(250);

                setStatusMessage('Menganalisis: Bayangan...');
                setSecondaryAnalysisState(s => ({ ...s, shadow: { ...s.shadow, loading: true } }));
                setProxyStatus('PENDING');
                const { data: shadowData, isCached: shadowCached } = await geminiService.generateShadowDescription(poseRes.adaptedPoseDescription, vfxRes.smartInteraction.placementSuggestion, primaryData.lighting, analysisModels.shadow);
                shadowRes = shadowData;
                setShadowData(shadowRes);
                setSecondaryAnalysisState(s => ({ ...s, shadow: { loading: false, error: null, cached: shadowCached } }));
                setProxyStatus('SUCCESS');
            } else {
                setSecondaryAnalysisState(s => ({ ...s, pose: { loading: false, error: null, cached: false } }));
                setStatusMessage('Menganalisis: Bayangan...');
                setSecondaryAnalysisState(s => ({ ...s, shadow: { ...s.shadow, loading: true } }));
                setProxyStatus('PENDING');
                const { data: shadowData, isCached: shadowCached } = await geminiService.generateShadowDescription(primaryData.subjectPose, "No specific interaction", primaryData.lighting, analysisModels.shadow);
                shadowRes = shadowData;
                setShadowData(shadowRes);
                setSecondaryAnalysisState(s => ({ ...s, shadow: { loading: false, error: null, cached: shadowCached } }));
                setProxyStatus('SUCCESS');
            }
            await sleep(250);

            setStatusMessage('Menganalisis: Perspektif...');
            setSecondaryAnalysisState(s => ({ ...s, perspective: { ...s.perspective, loading: true } }));
            setProxyStatus('PENDING');
            const { data: perspData, isCached: perspCached } = await geminiService.analyzeScenePerspective(imageForSecondary, analysisModels.perspective);
            perspRes = perspData;
            setPerspectiveData(perspRes);
            setSecondaryAnalysisState(s => ({ ...s, perspective: { loading: false, error: null, cached: perspCached } }));
            setProxyStatus('SUCCESS');
            await sleep(250);

            setStatusMessage('Menganalisis: Fotometrik...');
            setSecondaryAnalysisState(s => ({ ...s, photometric: { ...s.photometric, loading: true } }));
            setProxyStatus('PENDING');
            const { data: photoData, isCached: photoCached } = await geminiService.performPhotometricAnalysis(imageForSecondary, primaryData.lighting, analysisModels.photometric);
            photoRes = photoData;
            setPhotometricData(photoRes);
            setSecondaryAnalysisState(s => ({ ...s, photometric: { loading: false, error: null, cached: photoCached } }));
            setProxyStatus('SUCCESS');

        } catch(e) {
            setProxyStatus('ERROR');
            throw e; // Re-throw to be caught by the main handler
        }

        return { vfx: vfxRes, pose: poseRes, shadow: shadowRes, perspective: perspRes, photometric: photoRes };
    }, [sceneSource, sceneImage, referenceImage, subjectImage, analysisModels]);

    const handleStartGenerationProcess = useCallback(async () => {
        const validationResult = performValidation();
        if (!validationResult.overall.valid) {
            setError(validationResult.overall.message);
            setAppStatus('ERROR');
            return;
        }

        resetState();
        
        try {
            setAppStatus('ANALYZING_PRIMARY');
            setStatusMessage('Menganalisis Subjek & Scene...');
            facialVectorHandlers.handleAnalysisStart();
            setProxyStatus('PENDING');

            const { data: primaryData, isCached } = await geminiService.performComprehensiveAnalysis(
                subjectImage!, sceneImage, referenceImage, outfitImage, sceneSource, prompt,
                analysisModels.subject, analysisModels.scene
            );
            setProxyStatus('SUCCESS');
            console.log('[VHMS LOG] Primary Analysis Complete:', primaryData);
            setAnalysisData(primaryData);
            setIsPrimaryAnalysisCached(isCached);
            facialVectorHandlers.handleAnalysisSuccess(primaryData, isCached);

            let vfxResult: VFXSuggestions | null = null;
            let poseResult: PoseAdaptationData | null = null;
            let shadowResult: ShadowCastingData | null = null;
            let perspectiveResult: PerspectiveAnalysisData | null = null;
            let photometricResult: PhotometricAnalysisData | null = null;

            if (sceneSource === 'upload' || sceneSource === 'reference') {
                const secondaryData = await runAllSecondaryAnalysesAndGetData(primaryData);
                console.log('[VHMS LOG] Secondary Analysis Complete:', secondaryData);
                vfxResult = secondaryData.vfx;
                poseResult = secondaryData.pose;
                shadowResult = secondaryData.shadow;
                perspectiveResult = secondaryData.perspective;
                photometricResult = secondaryData.photometric;
            }

            setStatusMessage('Membangun Prompt Final...');
            const constructedPrompt = constructFinalPrompt(
                prompt, sceneSource, primaryData, vfxResult, poseResult, shadowResult, perspectiveResult, photometricResult, stylePreset, resolution
            );
            console.log('[VHMS LOG] Final Prompt Constructed:', constructedPrompt);
            setFinalPrompt(constructedPrompt);
            
            setAppStatus('GENERATING_IMAGE');
            setStatusMessage('Menghasilkan Gambar Komposit...');
            setProxyStatus('PENDING');
            let generatedImage = await geminiService.generateFinalImage(
                // Use the state for finalPrompt here to allow for user edits
                finalPrompt || constructedPrompt, sceneSource, subjectImage!, sceneImage, referenceImage, interactionMask
            );
            setProxyStatus('SUCCESS');

            if (isHarmonizationEnabled) {
                setAppStatus('HARMONIZING');
                setStatusMessage('Menjalankan Harmonisasi Akhir...');
                setProxyStatus('PENDING');
                generatedImage = await geminiService.performHarmonization(generatedImage, primaryData);
                setProxyStatus('SUCCESS');
            }

            setOutputImage(generatedImage);
            setAppStatus('DONE');
            setStatusMessage('');

            const historyItem: HistoryItem = {
                id: `hist-${Date.now()}`,
                timestamp: Date.now(),
                outputImage: generatedImage,
                inputs: {
                    subjectImage: subjectImage!, sceneImage, referenceImage, outfitImage, prompt,
                    sceneSource, stylePreset, resolution
                }
            };
            setHistory(h => [historyItem, ...h]);

        } catch (e) {
            setProxyStatus('ERROR');
            const errorMsg = e instanceof Error ? e.message : String(e);
            setError(errorMsg);
            setAppStatus('ERROR');
            facialVectorHandlers.handleAnalysisError(errorMsg);
        }
    }, [
        performValidation, resetState, facialVectorHandlers, subjectImage, sceneImage, 
        referenceImage, outfitImage, sceneSource, prompt, analysisModels, 
        runAllSecondaryAnalysesAndGetData, stylePreset, resolution, interactionMask, 
        isHarmonizationEnabled, finalPrompt // Add finalPrompt as dependency
    ]);

    const handleRegeneratePrompt = useCallback(() => {
        if (!analysisData) {
            setConsistencyWarning("Analisis primer harus dijalankan terlebih dahulu sebelum membuat ulang prompt.");
            setTimeout(() => setConsistencyWarning(null), 5000);
            return;
        }
        console.log("[VHMS LOG] Regenerating prompt from existing analysis data...");
        const constructedPrompt = constructFinalPrompt(
            prompt, sceneSource, analysisData, vfxData, poseData, shadowData, perspectiveData, photometricData, stylePreset, resolution
        );
        setFinalPrompt(constructedPrompt);
    }, [analysisData, prompt, sceneSource, vfxData, poseData, shadowData, perspectiveData, photometricData, stylePreset, resolution]);
    
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
    
    const sceneImageForEditor = useMemo(() => {
        return sceneSource === 'upload' ? sceneImage : referenceImage;
    }, [sceneSource, sceneImage, referenceImage]);

    return (
        <ApiKeyProvider>
            <div className="bg-slate-900 text-slate-100 min-h-screen flex flex-col font-sans">
                <header className="bg-slate-950/70 backdrop-blur-sm p-3 border-b border-slate-700 sticky top-0 z-40 flex justify-center items-center">
                    <h1 className="text-xl font-bold text-center flex-grow">
                        <span className="text-amber-400">VHMS</span> - Visual Harmony & Merge System
                    </h1>
                    <div className="absolute right-4">
                        <ProxyStatusIndicator status={proxyStatus} />
                    </div>
                </header>
                
                <main className="flex-grow p-4 w-full max-w-screen-2xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full">
                        {/* Kolom Kiri untuk Input */}
                        <div className="lg:col-span-6 flex flex-col space-y-4">
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
                        
                        {/* Kolom Kanan untuk Output & Prompt Engine */}
                        <div className="lg:col-span-6 flex flex-col space-y-4">
                            <OutputPanel
                                outputImage={outputImage}
                                appStatus={appStatus}
                                statusMessage={statusMessage}
                                onStartGeneration={handleStartGenerationProcess}
                                isBusy={isBusy}
                                error={error}
                                onStartEditing={() => setInpaintEditorOpen(true)}
                                consistencyWarning={consistencyWarning}
                                sceneSource={sceneSource}
                                analysisModels={analysisModels}
                                onModelChange={handleModelChange}
                                analysisData={analysisData}
                            />
                            <PromptEnginePanel
                                finalPrompt={finalPrompt}
                                isAnalyzing={isAnalyzing}
                                onRegenerate={handleRegeneratePrompt}
                                onPromptChange={setFinalPrompt}
                            />
                        </div>
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
                        setProxyStatus={setProxyStatus}
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
                        setProxyStatus={setProxyStatus}
                    />
                )}
            </div>
        </ApiKeyProvider>
    );
}

export default App;