import React, { useState, useCallback, useMemo, useEffect } from 'react';
// FIX: Imported RegeneratableModule to resolve type error.
import type { 
    FileWithPreview, SceneSource, StylePreset, Resolution, AppStatus, VerificationResult,
    HistoryItem, AnalysisModelsState, AnalysisModelSelection,
    ProxyStatus, ActivePanel, UnifiedAnalysisData, DependentAdaptationData, ComprehensiveAnalysisData, RegeneratableModule
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
import { UploadIcon, LayoutSidebarRight } from '../components/icons/Icons'; 
import ControlDeck from '../components/ControlDeck';


import * as geminiService from '../services/geminiService';
import { constructFinalPrompt } from './utils/promptUtils';
import { useFacialVectorAnalysis } from '../hooks/useFacialVectorAnalysis';

const IdentityLockModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onGenerate: (files: FileWithPreview[]) => Promise<void>;
    isGeneratingLock: boolean;
}> = ({ isOpen, onClose, onGenerate, isGeneratingLock }) => {
    const [files, setFiles] = useState<FileWithPreview[]>([]);
    const [dragActive, setDragActive] = useState(false);

    const handleFileChange = (selectedFiles: FileList | null) => {
        if (selectedFiles) {
            const newFiles = Array.from(selectedFiles)
                .filter(file => file.type.startsWith('image/'))
                .map(file => Object.assign(file, { preview: URL.createObjectURL(file) }));
            setFiles(prev => [...prev, ...newFiles].slice(0, 5)); // Limit to 5 files
        }
    };
    
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files) {
            handleFileChange(e.dataTransfer.files);
        }
    };
    
    const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
        else if (e.type === "dragleave") setDragActive(false);
    };
    
    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleGenerateClick = () => {
        if (files.length > 0 && !isGeneratingLock) {
            onGenerate(files);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg shadow-xl w-full max-w-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-semibold text-amber-400">Buat Identity Lock+ (SSEL-Lite)</h3>
                <p className="text-sm text-slate-400 mt-1 mb-4">Unggah 1-5 foto wajah subjek untuk membuat kunci identitas yang sangat akurat. Hasil terbaik didapat dari berbagai sudut dan pencahayaan.</p>

                <div 
                    onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                    className={`p-4 border-2 border-dashed rounded-md transition-colors h-48 flex flex-col items-center justify-center ${dragActive ? 'border-amber-500 bg-amber-900/20' : 'border-slate-600'}`}
                >
                    <UploadIcon className="w-8 h-8 text-slate-500 mb-2"/>
                    <p className="text-slate-400">Seret & lepas gambar, atau <label htmlFor="identity-upload" className="font-semibold text-amber-400 cursor-pointer hover:underline">klik untuk memilih</label>.</p>
                    <p className="text-xs text-slate-500 mt-1">Maksimal 5 gambar.</p>
                    <input type="file" id="identity-upload" multiple accept="image/*" className="hidden" onChange={e => handleFileChange(e.target.files)} />
                </div>

                <div className="grid grid-cols-5 gap-2 mt-4 min-h-[60px]">
                    {files.map((file, i) => (
                        <div key={i} className="relative aspect-square">
                            <img src={file.preview} alt={`preview ${i}`} className="w-full h-full object-cover rounded"/>
                            <button onClick={() => removeFile(i)} className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-5 h-5 text-xs font-bold">X</button>
                        </div>
                    ))}
                </div>

                <div className="mt-4 pt-4 border-t border-slate-700 flex justify-end gap-2">
                    <button onClick={onClose} className="text-slate-300 px-4 py-2 rounded-md hover:bg-slate-700 font-semibold">Batal</button>
                    <button 
                        onClick={handleGenerateClick} 
                        disabled={files.length === 0 || isGeneratingLock}
                        className="bg-amber-500 text-slate-900 px-6 py-2 rounded-md hover:bg-amber-600 font-semibold disabled:bg-slate-600 disabled:cursor-not-allowed"
                    >
                        {isGeneratingLock ? 'Memproses...' : `Buat Lock (${files.length} gambar)`}
                    </button>
                </div>
            </div>
        </div>
    );
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
    const [stylePreset, setStylePreset] = useState<StylePreset>('Natural');
    const [resolution, setResolution] = useState<Resolution>('HD');
    const [outputImage, setOutputImage] = useState<string | null>(null);
    const [isHarmonizationEnabled, setIsHarmonizationEnabled] = useState<boolean>(true);
    
    // 3. Application Status & State Machine
    const [appStatus, setAppStatus] = useState<AppStatus>('IDLE');
    const [statusMessage, setStatusMessage] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [consistencyWarning, setConsistencyWarning] = useState<string | null>(null);
    const [proxyStatus, setProxyStatus] = useState<ProxyStatus>('IDLE');
    
    // 4. Analysis Data State (REFACTORED for V3.1)
    const [unifiedData, setUnifiedData] = useState<UnifiedAnalysisData | null>(null);
    const [dependentData, setDependentData] = useState<DependentAdaptationData | null>(null);
    const [isUnifiedCached, setIsUnifiedCached] = useState<boolean>(false);
    const [isDependentCached, setIsDependentCached] = useState<boolean>(false);
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
    const [isIdentityModalOpen, setIdentityModalOpen] = useState(false);
    const [customIdentityLock, setCustomIdentityLock] = useState<string | null>(null);
    const [isGeneratingLock, setIsGeneratingLock] = useState(false);
    const [isDescribingSubject, setIsDescribingSubject] = useState(false);


    // 6. History
    const [history, setHistory] = useState<HistoryItem[]>([]);

    // 7. Custom Hooks & Control Deck State
    const { state: vectorState, handlers: facialVectorHandlers } = useFacialVectorAnalysis();
    const [isControlDeckCollapsed, setIsControlDeckCollapsed] = useState<boolean>(false);
    const [activePanel, setActivePanel] = useState<ActivePanel>('analysis');
    
    // --- Memos and Derived State ---
    const isAnalyzing = useMemo(() => appStatus.startsWith('ANALYZING'), [appStatus]);
    const isBusy = useMemo(() => !['IDLE', 'DONE', 'ERROR'].includes(appStatus), [appStatus]);
    const analysisDataForLegacy = useMemo(() => unifiedData ? { ...unifiedData } : null, [unifiedData]);


    // --- Core Application Logic ---

    const handleSetSubjectImage = useCallback((file: FileWithPreview) => {
        setSubjectImage(file);
        setCustomIdentityLock(null);
        console.log("[VHMS LOG] Subject image changed, Custom Identity Lock has been cleared.");
    }, []);

    useEffect(() => {
        setPrompt('');
        setSceneImage(null);
        setReferenceImage(null);
    }, [sceneSource]);

    const resetState = useCallback((clearImages = false) => {
        setAppStatus('IDLE');
        setError(null);
        setUnifiedData(null);
        setDependentData(null);
        setIsUnifiedCached(false);
        setIsDependentCached(false);
        setFinalPrompt(null);
        setOutputImage(null);
        setInteractionMask(null);
        facialVectorHandlers.reset();

        if (clearImages) {
            setSubjectImage(null);
            setSceneImage(null);
            setReferenceImage(null);
            setOutfitImage(null);
            setPrompt('');
            setCustomIdentityLock(null); 
        }
    }, [facialVectorHandlers]);
    
    // Effect to clear analysis data when inputs change
    useEffect(() => {
        setUnifiedData(null);
        setDependentData(null);
        setFinalPrompt(null);
        setOutputImage(null);
        setInteractionMask(null);
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
    
    
    // --- VHMS v3.1: "TWO-CALL" ARCHITECTURE WORKFLOW ---
    const handleStartGenerationProcess = useCallback(async () => {
        const validationResult = performValidation();
        if (!validationResult.overall.valid) {
            setError(validationResult.overall.message);
            setAppStatus('ERROR');
            return;
        }

        resetState();
        
        try {
            let finalImageResult: string;
            let finalConstructedPrompt: string;
            let currentUnifiedData: UnifiedAnalysisData | null = null;
            let currentDependentData: DependentAdaptationData | null = null;
            let analysisForHarmonization: ComprehensiveAnalysisData;
            
            // --- MODE: DARI PROMPT (Simplified Flow) ---
            if (sceneSource === 'generate') {
                setAppStatus('ANALYZING_PRIMARY');
                setStatusMessage('Mempersiapkan Aset Identitas...');
                setProxyStatus('PENDING');

                let finalIdentityLock: string;
                if (customIdentityLock) {
                    finalIdentityLock = customIdentityLock;
                } else {
                    finalIdentityLock = await geminiService.generateSingleImageIdentityLock(subjectImage!, analysisModels.subject);
                }
                
                // For this mode, we only need a partial analysis object for the prompt engine.
                analysisForHarmonization = { identityLock: finalIdentityLock } as ComprehensiveAnalysisData;
                setProxyStatus('SUCCESS');
                
            } 
            // --- MODE: LATAR BELAKANG / REFERENSI (Two-Call Pro Flow) ---
            else {
                const imageForAnalysis = sceneSource === 'upload' ? sceneImage! : referenceImage!;

                // CALL 1: UNIFIED ANALYSIS
                setAppStatus('ANALYZING_PRIMARY');
                setStatusMessage('Menjalankan Analisis Terpadu (1/2)...');
                facialVectorHandlers.handleAnalysisStart();
                setProxyStatus('PENDING');

                const { data, isCached: isUnifiedCached } = await geminiService.performUnifiedAnalysis(
                    subjectImage!, imageForAnalysis, outfitImage, prompt, analysisModels.scene
                );
                currentUnifiedData = data;
                setProxyStatus('SUCCESS');
                
                setUnifiedData(currentUnifiedData);
                setIsUnifiedCached(isUnifiedCached);
                facialVectorHandlers.handleAnalysisSuccess(currentUnifiedData, isUnifiedCached);


                // CALL 2: DEPENDENT ADAPTATIONS
                setAppStatus('ANALYZING_SECONDARY');
                setStatusMessage('Menjalankan Adaptasi Dependen (2/2)...');
                setProxyStatus('PENDING');

                const { data: dependent, isCached: isDependentCached } = await geminiService.performDependentAdaptations(
                    currentUnifiedData, subjectImage!, analysisModels.pose
                );
                currentDependentData = dependent;
                setProxyStatus('SUCCESS');

                setDependentData(currentDependentData);
                setIsDependentCached(isDependentCached);
                analysisForHarmonization = currentUnifiedData;
            }

            // --- PROMPT CONSTRUCTION & IMAGE GENERATION (Applies to all modes) ---
            setStatusMessage('Membangun Prompt Final...');
            finalConstructedPrompt = constructFinalPrompt(
                prompt, sceneSource, analysisForHarmonization, currentDependentData, stylePreset, resolution
            );
            setFinalPrompt(finalConstructedPrompt);
            
            setAppStatus('GENERATING_IMAGE');
            setStatusMessage('Menghasilkan Gambar Komposit...');
            setProxyStatus('PENDING');
            let tempGeneratedImage = await geminiService.generateFinalImage(finalConstructedPrompt, sceneSource, subjectImage!, sceneImage, referenceImage, interactionMask);
            setProxyStatus('SUCCESS');

            if (isHarmonizationEnabled && sceneSource !== 'generate') {
                setAppStatus('HARMONIZING');
                setStatusMessage('Menjalankan Harmonisasi Akhir...');
                setProxyStatus('PENDING');
                tempGeneratedImage = await geminiService.performHarmonization(tempGeneratedImage, analysisForHarmonization);
                setProxyStatus('SUCCESS');
            }
            finalImageResult = tempGeneratedImage;
            
            setOutputImage(finalImageResult);
            setAppStatus('DONE');
            setStatusMessage('');
            
            const historyItem: HistoryItem = {
                id: `hist-${Date.now()}`,
                timestamp: Date.now(),
                outputImage: finalImageResult,
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
        referenceImage, outfitImage, sceneSource, prompt, analysisModels, customIdentityLock,
        stylePreset, resolution, interactionMask, isHarmonizationEnabled
    ]);
    
    const handleGenerateCustomLock = useCallback(async (images: FileWithPreview[]) => {
        if (images.length === 0) return;
        setIsGeneratingLock(true);
        setProxyStatus('PENDING');
        try {
            const lock = await geminiService.generateIdentityLockFromImages(images, analysisModels.subject);
            setCustomIdentityLock(lock);
            setProxyStatus('SUCCESS');
            setIdentityModalOpen(false);
            console.log("[VHMS LOG] Custom Identity Lock+ successfully generated and applied.");
        } catch (e) {
            setProxyStatus('ERROR');
            const errorMsg = e instanceof Error ? e.message : "Gagal membuat Identity Lock.";
            alert(errorMsg);
        } finally {
            setIsGeneratingLock(false);
        }
    }, [analysisModels.subject]);
    
    const handleDescribeSubject = useCallback(async () => {
        if (!subjectImage) return;
        setIsDescribingSubject(true);
        setProxyStatus('PENDING');
        try {
            const description = await geminiService.describeSubjectImage(subjectImage, analysisModels.subject);
            const formattedDescription = `[DESKRIPSI SUBJEK: ${description}], `;
            setPrompt(prev => formattedDescription + prev);
            setProxyStatus('SUCCESS');
        } catch (e) {
            setProxyStatus('ERROR');
            const errorMsg = e instanceof Error ? e.message : "Gagal mendeskripsikan subjek.";
            setError(errorMsg);
        } finally {
            setIsDescribingSubject(false);
        }
    }, [subjectImage, analysisModels.subject]);


    const handleRegeneratePrompt = useCallback(() => {
        if (!unifiedData && sceneSource !== 'generate') {
            setConsistencyWarning("Analisis harus dijalankan terlebih dahulu sebelum membuat ulang prompt.");
            setTimeout(() => setConsistencyWarning(null), 5000);
            return;
        }
        console.log("[VHMS LOG] Regenerating prompt from existing analysis data...");
        const constructedPrompt = constructFinalPrompt(
            prompt, sceneSource, unifiedData || { identityLock: customIdentityLock } as ComprehensiveAnalysisData, dependentData, stylePreset, resolution
        );
        setFinalPrompt(constructedPrompt);
    }, [unifiedData, dependentData, customIdentityLock, prompt, sceneSource, stylePreset, resolution]);
    
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

    // HANDLER STUBS FOR CONTROL DECK
    const handleRegenerateModule = useCallback((module: RegeneratableModule) => {
        alert(`Fungsi regenerasi untuk modul '${module}' akan diimplementasikan pada versi berikutnya.`);
        console.log(`[STUB] Regenerate requested for module: ${module}`);
    }, []);

    const handleHistoryReload = useCallback((id: string) => {
         alert(`Fungsi memuat ulang dari riwayat (ID: ${id}) akan diimplementasikan pada versi berikutnya.`);
         console.log(`[STUB] History reload requested for ID: ${id}`);
    }, []);


    return (
        <ApiKeyProvider>
            <div className="bg-slate-900 text-slate-100 min-h-screen flex flex-col font-sans">
                <header className="bg-slate-950/70 backdrop-blur-sm p-3 border-b border-slate-700 sticky top-0 z-40 flex justify-between items-center">
                    <div className="w-16"></div> {/* Spacer */}
                    <h1 className="text-xl font-bold text-center flex-grow">
                        <span className="text-amber-400">VHMS</span> - Visual Harmony & Merge System
                    </h1>
                    <div className="w-16 flex justify-end items-center gap-4">
                        <ProxyStatusIndicator status={proxyStatus} />
                        <button onClick={() => setIsControlDeckCollapsed(!isControlDeckCollapsed)} className="text-slate-400 hover:text-amber-400 p-1" title="Toggle Control Deck">
                            <LayoutSidebarRight className="w-5 h-5" />
                        </button>
                    </div>
                </header>
                
                <main className="flex-grow p-4 w-full max-w-screen-2xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full">
                        <div className={`transition-all duration-300 ${isControlDeckCollapsed ? 'lg:col-span-5' : 'lg:col-span-4'} flex flex-col space-y-4`}>
                            <InputPanel
                                subjectImage={subjectImage}
                                setSubjectImage={handleSetSubjectImage}
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
                                onOpenIdentityModal={() => setIdentityModalOpen(true)}
                                customIdentityLock={customIdentityLock}
                                onDescribeSubject={handleDescribeSubject}
                                isDescribingSubject={isDescribingSubject}
                            />
                        </div>
                        
                        <div className={`transition-all duration-300 ${isControlDeckCollapsed ? 'lg:col-span-6' : 'lg:col-span-4'} flex flex-col space-y-4`}>
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
                                analysisData={analysisDataForLegacy}
                            />
                            <PromptEnginePanel
                                finalPrompt={finalPrompt}
                                isAnalyzing={isAnalyzing}
                                onRegenerate={handleRegeneratePrompt}
                                onPromptChange={(newPrompt) => setFinalPrompt(newPrompt)}
                            />
                        </div>

                        <div className={`transition-all duration-300 ${isControlDeckCollapsed ? 'lg:col-span-1' : 'lg:col-span-4'} flex flex-col`}>
                            <ControlDeck
                                isCollapsed={isControlDeckCollapsed}
                                onToggle={() => setIsControlDeckCollapsed(!isControlDeckCollapsed)}
                                activePanel={activePanel}
                                onPanelChange={setActivePanel}
                                analysisProps={{
                                    unifiedData: unifiedData,
                                    dependentData: dependentData,
                                    isLoading: isAnalyzing,
                                    error: error,
                                    isUnifiedCached: isUnifiedCached,
                                    isDependentCached: isDependentCached,
                                    secondaryAnalysisState: { // Simplified for now, can be expanded later
                                        vfx: { loading: appStatus === 'ANALYZING_PRIMARY', error: null, cached: isUnifiedCached },
                                        pose: { loading: appStatus === 'ANALYZING_SECONDARY', error: null, cached: isDependentCached },
                                        shadow: { loading: appStatus === 'ANALYZING_SECONDARY', error: null, cached: isDependentCached },
                                        perspective: { loading: appStatus === 'ANALYZING_PRIMARY', error: null, cached: isUnifiedCached },
                                        photometric: { loading: appStatus === 'ANALYZING_PRIMARY', error: null, cached: isUnifiedCached },
                                    },
                                    onRegenerate: handleRegenerateModule,
                                    sceneSource,
                                    analysisModels,
                                    interactionMask,
                                    onOpenMaskEditor: () => setMaskEditorOpen(true),
                                    onClearMask: () => setInteractionMask(null),
                                }}
                                historyProps={{
                                    history,
                                    onReload: handleHistoryReload,
                                }}
                                vectorProps={{
                                    vectorData: vectorState.vectorData,
                                    isLoading: vectorState.isLoading,
                                    error: vectorState.error,
                                    isCached: vectorState.isCached,
                                    hasSubject: !!subjectImage,
                                }}
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
                {isMaskEditorOpen && sceneImageForEditor && unifiedData?.depthAnalysis.occlusionSuggestion && (
                    <MaskEditor 
                        isOpen={isMaskEditorOpen}
                        onClose={() => setMaskEditorOpen(false)}
                        imageSrc={sceneImageForEditor.preview}
                        onApply={(maskDataUrl) => {
                           setInteractionMask(maskDataUrl);
                           setMaskEditorOpen(false);
                        }}
                        occlusionSuggestion={unifiedData.depthAnalysis.occlusionSuggestion}
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
                <IdentityLockModal
                    isOpen={isIdentityModalOpen}
                    onClose={() => setIdentityModalOpen(false)}
                    onGenerate={handleGenerateCustomLock}
                    isGeneratingLock={isGeneratingLock}
                />
            </div>
        </ApiKeyProvider>
    );
}

export default App;
