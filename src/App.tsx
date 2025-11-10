import React from 'react';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { InputPanel } from '../components/InputPanel';
import { AnalysisPanel } from '../components/AnalysisPanel';
import { PromptEnginePanel } from '../components/PromptEnginePanel';
import { OutputPanel } from '../components/OutputPanel';
import { HistoryPanel } from '../components/HistoryPanel';
import { VerificationModal } from '../components/VerificationModal';
import { MaskEditor } from '../components/MaskEditor';
import { InpaintEditor } from '../components/InpaintEditor';
import { CropModal } from '../components/CropModal';
import { FacialVectorPanel } from '../components/FacialVectorPanel';
import { useFacialVectorAnalysis } from '../hooks/useFacialVectorAnalysis';

import * as geminiService from '../services/geminiService';
import { constructFinalPrompt } from './utils/promptUtils';
import { cacheService } from '../services/cacheService';

import type {
  FileWithPreview, SceneSource, StylePreset, Resolution, HistoryItem, VerificationResult,
  ComprehensiveAnalysisData, VFXSuggestions, PoseAdaptationData, ShadowCastingData, PerspectiveAnalysisData,
  RegeneratableModule, SecondaryAnalysisModuleState, PhotometricAnalysisData
} from '../types';

// Initial state for secondary analysis modules
const initialSecondaryAnalysisState = {
    vfx: { loading: false, error: null, cached: false },
    pose: { loading: false, error: null, cached: false },
    shadow: { loading: false, error: null, cached: false },
    perspective: { loading: false, error: null, cached: false },
    photometric: { loading: false, error: null, cached: false },
};

function App() {
  // --- Input State ---
  const [subjectImage, setSubjectImage] = useState<FileWithPreview | null>(null);
  const [sceneImage, setSceneImage] = useState<FileWithPreview | null>(null);
  const [referenceImage, setReferenceImage] = useState<FileWithPreview | null>(null);
  const [outfitImage, setOutfitImage] = useState<FileWithPreview | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [sceneSource, setSceneSource] = useState<SceneSource>('upload');

  // --- Output & Generation State ---
  const [stylePreset, setStylePreset] = useState<StylePreset>('Cinematic');
  const [resolution, setResolution] = useState<Resolution>('HD');
  const [outputImage, setOutputImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [consistencyWarning, setConsistencyWarning] = useState<string | null>(null);
  const [isHarmonizationEnabled, setIsHarmonizationEnabled] = useState<boolean>(true);
  
  // --- Analysis State ---
  const [isPrimaryAnalyzing, setIsPrimaryAnalyzing] = useState<boolean>(false);
  const [primaryAnalysisError, setPrimaryAnalysisError] = useState<string | null>(null);
  const [isPrimaryCached, setIsPrimaryCached] = useState<boolean>(false);
  const [analysisData, setAnalysisData] = useState<ComprehensiveAnalysisData | null>(null);
  const [vfxData, setVfxData] = useState<VFXSuggestions | null>(null);
  const [poseData, setPoseData] = useState<PoseAdaptationData | null>(null);
  const [shadowData, setShadowData] = useState<ShadowCastingData | null>(null);
  const [perspectiveData, setPerspectiveData] = useState<PerspectiveAnalysisData | null>(null);
  const [photometricData, setPhotometricData] = useState<PhotometricAnalysisData | null>(null);
  const [secondaryAnalysisState, setSecondaryAnalysisState] = useState<Record<RegeneratableModule, SecondaryAnalysisModuleState>>(initialSecondaryAnalysisState);
  
  // --- Prompt Engine State ---
  const [finalPrompt, setFinalPrompt] = useState<string | null>(null);

  // --- UI State (Modals, etc.) ---
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState<boolean>(false);
  const [isMaskEditorOpen, setIsMaskEditorOpen] = useState<boolean>(false);
  const [interactionMask, setInteractionMask] = useState<string | null>(null);
  const [isInpaintEditorOpen, setIsInpaintEditorOpen] = useState<boolean>(false);
  const [cropState, setCropState] = useState<{ isOpen: boolean; imageSrc: string | null }>({ isOpen: false, imageSrc: null });

  // --- History State ---
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // --- Facial Vector Analysis Hook ---
  const facialVectorHook = useFacialVectorAnalysis();
  
  // --- Memoized Values ---
  const canGenerate = useMemo(() => !!finalPrompt && !isPrimaryAnalyzing && Object.values(secondaryAnalysisState).every((s: SecondaryAnalysisModuleState) => !s.loading), [finalPrompt, isPrimaryAnalyzing, secondaryAnalysisState]);
  
  // --- Derived State & Effects ---
  // Reset secondary analysis if primary inputs change
  useEffect(() => {
    setAnalysisData(null);
    setVfxData(null);
    setPoseData(null);
    setShadowData(null);
    setPerspectiveData(null);
    setPhotometricData(null);
    setFinalPrompt(null);
    setSecondaryAnalysisState(initialSecondaryAnalysisState);
    facialVectorHook.reset();
  }, [subjectImage, sceneImage, referenceImage, outfitImage, sceneSource, prompt, facialVectorHook]);
  
  // Re-construct the final prompt whenever analysis data changes
  useEffect(() => {
    if (analysisData) {
      const newPrompt = constructFinalPrompt(prompt, sceneSource, analysisData, vfxData, poseData, shadowData, perspectiveData, photometricData, stylePreset, resolution);
      setFinalPrompt(newPrompt);
    }
  }, [analysisData, vfxData, poseData, shadowData, perspectiveData, photometricData, prompt, sceneSource, stylePreset, resolution]);

  // --- Core Logic Functions ---

  const runSecondaryAnalysisModule = useCallback(async (module: RegeneratableModule) => {
    if (!analysisData || (!sceneImage && !referenceImage)) return;

    setSecondaryAnalysisState(prev => ({ ...prev, [module]: { loading: true, error: null, cached: false } }));

    try {
      let result: any = null;
      const effectiveSceneImage = sceneSource === 'upload' ? sceneImage : referenceImage;

      switch (module) {
        case 'vfx':
          result = await geminiService.getVFXSuggestions(effectiveSceneImage!, analysisData);
          setVfxData(result.data);
          break;
        case 'pose':
          if (vfxData?.smartInteraction) {
            result = await geminiService.adaptPoseForInteraction(subjectImage!, analysisData.subjectPose, vfxData.smartInteraction.description);
            setPoseData(result.data);
          }
          break;
        case 'shadow':
          if (poseData && vfxData?.smartInteraction) {
            result = await geminiService.generateShadowDescription(poseData.adaptedPoseDescription, vfxData.smartInteraction.description, analysisData.lighting);
            setShadowData(result.data);
          }
          break;
        case 'perspective':
          result = await geminiService.analyzeScenePerspective(effectiveSceneImage!);
          setPerspectiveData(result.data);
          break;
        case 'photometric':
          result = await geminiService.performPhotometricAnalysis(effectiveSceneImage!, analysisData.lighting);
          setPhotometricData(result.data);
          break;
      }
      if(result) {
        setSecondaryAnalysisState(prev => ({ ...prev, [module]: { loading: false, error: null, cached: result.isCached } }));
      } else {
        // Handle cases where a module is skipped (e.g. pose without vfx)
        setSecondaryAnalysisState(prev => ({ ...prev, [module]: { ...prev[module], loading: false } }));
      }
      return true; // Indicate success or graceful skip
    } catch (e: any) {
      console.error(`Error in secondary analysis module '${module}':`, e);
      setSecondaryAnalysisState(prev => ({ ...prev, [module]: { loading: false, error: e.message, cached: false } }));
      return false; // Indicate failure
    }
  }, [analysisData, sceneImage, referenceImage, sceneSource, vfxData, poseData, subjectImage]);

  const runFullAnalysisPipeline = useCallback(async () => {
    if (!subjectImage || (!sceneImage && !referenceImage && sceneSource !== 'generate')) return;

    // Reset states
    setIsPrimaryAnalyzing(true);
    setPrimaryAnalysisError(null);
    setIsPrimaryCached(false);
    setAnalysisData(null);
    setVfxData(null);
    setPoseData(null);
    setShadowData(null);
    setPerspectiveData(null);
    setPhotometricData(null);
    setSecondaryAnalysisState(initialSecondaryAnalysisState);
    facialVectorHook.handleAnalysisStart();

    try {
      // 1. Primary Analysis
      const { data, isCached } = await geminiService.performComprehensiveAnalysis(subjectImage, sceneImage, referenceImage, outfitImage, sceneSource, prompt);
      setAnalysisData(data);
      setIsPrimaryCached(isCached);
      facialVectorHook.handleAnalysisSuccess(data, isCached);
      
      // 2. Secondary Analysis Pipeline (sequential)
      if (await runSecondaryAnalysisModule('vfx')) {
          if (await runSecondaryAnalysisModule('pose')) {
              await runSecondaryAnalysisModule('shadow');
          }
      }
      // These can run in parallel with the vfx->pose->shadow chain
      await runSecondaryAnalysisModule('perspective');
      await runSecondaryAnalysisModule('photometric');

    } catch (e: any) {
      console.error("Error in primary analysis:", e);
      setPrimaryAnalysisError(e.message);
      facialVectorHook.handleAnalysisError(e.message);
    } finally {
      setIsPrimaryAnalyzing(false);
    }
  }, [subjectImage, sceneImage, referenceImage, outfitImage, sceneSource, prompt, runSecondaryAnalysisModule, facialVectorHook]);

  const handleVerify = useCallback(() => {
    // --- Input Validation ---
    let overallValid = true;
    const res: VerificationResult = {
      subject: { valid: !!subjectImage, message: subjectImage ? 'Gambar subjek tersedia.' : 'Wajib: Unggah gambar subjek.' },
      scene: { valid: true, message: '' },
      outfit: { valid: true, message: outfitImage ? 'Gambar outfit opsional tersedia.' : 'Outfit akan dideskripsikan dari gambar subjek.', type: 'info' },
      prompt: { valid: prompt.trim().length > 0, message: prompt.trim().length > 0 ? 'Prompt tersedia.' : 'Wajib: Berikan deskripsi prompt.' },
      overall: { valid: false, message: '' },
      promptSnippet: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
    };

    if (!res.subject.valid || !res.prompt.valid) overallValid = false;

    // Scene validation depends on the mode
    if (sceneSource === 'upload' && !sceneImage) {
      res.scene = { valid: false, message: 'Wajib: Unggah gambar latar untuk mode Latar Belakang.' };
      overallValid = false;
    } else if (sceneSource === 'reference' && !referenceImage) {
      res.scene = { valid: false, message: 'Wajib: Unggah gambar referensi untuk mode Referensi Gaya.' };
      overallValid = false;
    } else {
      res.scene = { valid: true, message: 'Sumber scene valid untuk mode yang dipilih.', type: 'info' };
    }

    res.overall.valid = overallValid;
    res.overall.message = overallValid ? "Semua input yang diperlukan valid. Siap untuk memulai Analisis AI." : "Beberapa input yang diperlukan tidak ada. Harap perbaiki sebelum melanjutkan.";
    
    setVerificationResult(res);
    setIsVerificationModalOpen(true);

    if (overallValid) {
        runFullAnalysisPipeline();
    }
  }, [subjectImage, sceneImage, referenceImage, outfitImage, prompt, sceneSource, runFullAnalysisPipeline]);
  
  const handleRegenerateModule = useCallback((module: RegeneratableModule) => {
      runSecondaryAnalysisModule(module);
  }, [runSecondaryAnalysisModule]);
  
  const handleRegeneratePrompt = useCallback(() => {
     if (analysisData) {
      const newPrompt = constructFinalPrompt(prompt, sceneSource, analysisData, vfxData, poseData, shadowData, perspectiveData, photometricData, stylePreset, resolution);
      setFinalPrompt(newPrompt);
    }
  }, [analysisData, vfxData, poseData, shadowData, perspectiveData, photometricData, prompt, sceneSource, stylePreset, resolution]);
  
  const handleGenerate = useCallback(async () => {
    if (!finalPrompt || !subjectImage) return;
    
    setIsGenerating(true);
    setGenerationError(null);
    setOutputImage(null);
    setConsistencyWarning(null);
    
    try {
      const generatedImage = await geminiService.generateFinalImage(finalPrompt, sceneSource, subjectImage, sceneImage, referenceImage, interactionMask);
      
      let finalImage = generatedImage;

      if (isHarmonizationEnabled && analysisData) {
        const cacheKeyFiles = [subjectImage, sceneImage, referenceImage, outfitImage];
        const cachedHarmonizedImage = cacheService.getHarmonizedImage(cacheKeyFiles);
        
        if (cachedHarmonizedImage) {
          finalImage = cachedHarmonizedImage;
          console.log("[App] Harmonization successful (from cache).");
        } else {
          try {
            console.log("[App] Starting post-generation harmonization...");
            const harmonizedImage = await geminiService.performHarmonization(generatedImage, analysisData);
            finalImage = harmonizedImage;
            cacheService.setHarmonizedImage(cacheKeyFiles, harmonizedImage);
            console.log("[App] Harmonization successful (from API).");
          } catch (harmonizationError: any) {
            console.error("Post-generation harmonization failed:", harmonizationError);
            setConsistencyWarning("Harmonisasi akhir gagal. Menampilkan hasil dasar.");
          }
        }
      }

      setOutputImage(finalImage);
      
      const newHistoryItem: HistoryItem = {
        id: uuidv4(),
        timestamp: Date.now(),
        outputImage: finalImage,
        inputs: { subjectImage, sceneImage, referenceImage, outfitImage, prompt, sceneSource, stylePreset, resolution },
      };
      setHistory(prev => [newHistoryItem, ...prev]);

    } catch(e: any) {
      console.error("Error during final image generation:", e);
      setGenerationError(e.message);
    } finally {
      setIsGenerating(false);
    }

  }, [
    finalPrompt, subjectImage, sceneImage, referenceImage, 
    outfitImage, prompt, sceneSource, stylePreset, resolution, 
    interactionMask, isHarmonizationEnabled, analysisData
  ]);
  
  // --- Modal & Editor Handlers ---
  const handleOpenCropModal = useCallback((file: FileWithPreview) => {
      setCropState({ isOpen: true, imageSrc: file.preview });
  }, []);
  
  const handleApplyCrop = useCallback((croppedDataUrl: string) => {
    fetch(croppedDataUrl)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], "cropped_outfit.png", { type: "image/png" });
        const fileWithPreview = Object.assign(file, { preview: croppedDataUrl });
        setOutfitImage(fileWithPreview);
        setCropState({ isOpen: false, imageSrc: null });
      });
  }, []);
  
  const handleApplyMask = useCallback((maskDataUrl: string) => {
    setInteractionMask(maskDataUrl);
    setIsMaskEditorOpen(false);
    // You might want to trigger something here, e.g., show a confirmation
  }, []);

  const handleApplyInpaint = useCallback((newImageDataUrl: string) => {
    setOutputImage(newImageDataUrl); // Update the main output image
    setIsInpaintEditorOpen(false);
    // Optionally, update history with the edited image
    setHistory(prev => {
        if(prev.length > 0) {
            const latest = { ...prev[0], outputImage: newImageDataUrl };
            return [latest, ...prev.slice(1)];
        }
        return prev;
    });
  }, []);
  
  const handleReloadHistory = useCallback((id: string) => {
    const item = history.find(h => h.id === id);
    if(item) {
        // Clear cache and current state before loading
        cacheService.clear();

        // Load inputs
        setSubjectImage(item.inputs.subjectImage);
        setSceneImage(item.inputs.sceneImage);
        setReferenceImage(item.inputs.referenceImage);
        setOutfitImage(item.inputs.outfitImage);
        setPrompt(item.inputs.prompt);
        setSceneSource(item.inputs.sceneSource);
        setStylePreset(item.inputs.stylePreset);
        setResolution(item.inputs.resolution);
        
        // Load output
        setOutputImage(item.outputImage);
        
        // Clear all analysis data to force a fresh start
        setAnalysisData(null);
        setVfxData(null);
        setPoseData(null);
        setShadowData(null);
        setPerspectiveData(null);
        setPhotometricData(null);
        setFinalPrompt(null);
        setSecondaryAnalysisState(initialSecondaryAnalysisState);
        facialVectorHook.reset();
        
        // Automatically run verification and analysis after loading
        // A small timeout allows React to process state updates before re-running analysis
        setTimeout(() => handleVerify(), 100); 
    }
  }, [history, handleVerify, facialVectorHook]);

  const effectiveSceneImage = useMemo(() => {
    return sceneSource === 'upload' ? sceneImage : referenceImage;
  }, [sceneSource, sceneImage, referenceImage]);

  return (
    <>
      <main className="bg-slate-900 text-slate-100 min-h-screen p-2 sm:p-4 transition-all duration-300">
        <div className="container mx-auto">
          <header className="text-center mb-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-amber-400 tracking-tight">V.H.M.S.</h1>
            <p className="text-sm text-slate-400">Visual Harmony & Merger System</p>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* Left Column */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              <InputPanel
                subjectImage={subjectImage} setSubjectImage={setSubjectImage}
                sceneImage={sceneImage} setSceneImage={setSceneImage}
                referenceImage={referenceImage} setReferenceImage={setReferenceImage}
                outfitImage={outfitImage} onOpenCropModal={handleOpenCropModal}
                prompt={prompt} setPrompt={setPrompt}
                sceneSource={sceneSource} setSceneSource={setSceneSource}
              />
              <FacialVectorPanel
                vectorData={facialVectorHook.vectorData}
                isLoading={facialVectorHook.isLoading}
                error={facialVectorHook.error}
                isCached={facialVectorHook.isCached}
                hasSubject={!!subjectImage}
              />
              <HistoryPanel history={history} onReload={handleReloadHistory} />
            </div>

            {/* Middle Column */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              <AnalysisPanel
                isLoading={isPrimaryAnalyzing}
                error={primaryAnalysisError}
                isCached={isPrimaryCached}
                analysisData={analysisData}
                vfxData={vfxData}
                poseData={poseData}
                shadowData={shadowData}
                perspectiveData={perspectiveData}
                photometricData={photometricData}
                secondaryAnalysisState={secondaryAnalysisState}
                onRegenerate={handleRegenerateModule}
              />
            </div>
            
            {/* Right Column */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              <PromptEnginePanel
                  finalPrompt={finalPrompt}
                  isAnalyzing={isPrimaryAnalyzing || [
                      secondaryAnalysisState.vfx, 
                      secondaryAnalysisState.pose, 
                      secondaryAnalysisState.shadow, 
                      secondaryAnalysisState.perspective, 
                      secondaryAnalysisState.photometric
                  ].some(s => s.loading)}
                  onRegenerate={handleRegeneratePrompt}
                  onPromptChange={setFinalPrompt}
              />
              <OutputPanel
                outputImage={outputImage}
                isGenerating={isGenerating}
                onGenerate={handleGenerate}
                onVerify={handleVerify}
                canGenerate={canGenerate}
                stylePreset={stylePreset}
                setStylePreset={setStylePreset}
                resolution={resolution}
                setResolution={setResolution}
                error={generationError}
                onStartEditing={() => setIsInpaintEditorOpen(true)}
                consistencyWarning={consistencyWarning}
                sceneSource={sceneSource}
                isHarmonizationEnabled={isHarmonizationEnabled}
                setIsHarmonizationEnabled={setIsHarmonizationEnabled}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      {verificationResult && <VerificationModal isOpen={isVerificationModalOpen} onClose={() => setIsVerificationModalOpen(false)} result={verificationResult} />}
      
      {cropState.isOpen && cropState.imageSrc && (
          <CropModal isOpen={cropState.isOpen} onClose={() => setCropState({ isOpen: false, imageSrc: null })} imageSrc={cropState.imageSrc} onApply={handleApplyCrop} />
      )}
      
      {isMaskEditorOpen && effectiveSceneImage && analysisData && (
        <MaskEditor
          isOpen={isMaskEditorOpen}
          onClose={() => setIsMaskEditorOpen(false)}
          imageSrc={effectiveSceneImage.preview}
          onApply={handleApplyMask}
          occlusionSuggestion={analysisData.depthAnalysis.occlusionSuggestion}
          sceneImage={effectiveSceneImage}
        />
      )}

      {isInpaintEditorOpen && outputImage && (
        <InpaintEditor
          isOpen={isInpaintEditorOpen}
          onClose={() => setIsInpaintEditorOpen(false)}
          imageSrc={outputImage}
          onApply={handleApplyInpaint}
        />
      )}
    </>
  );
}

export default App;