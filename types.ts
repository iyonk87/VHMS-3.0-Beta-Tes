// --- Basic Types ---

// Represents a File object with an added 'preview' URL for display.
export interface FileWithPreview extends File {
  preview: string;
}

// Defines the source for the scene.
export type SceneSource = 'upload' | 'reference' | 'generate';

// Defines the visual style preset for the output.
export type StylePreset = 'Cinematic' | 'Studio' | 'Natural';

// Defines the output resolution.
export type Resolution = 'HD' | '2K' | '4K';

// Defines which secondary analysis modules can be regenerated.
// FIX: Added 'photometric' to the list.
export type RegeneratableModule = 'vfx' | 'pose' | 'shadow' | 'perspective' | 'photometric';

// --- Analysis Data Structures ---

// Facial Action Coding System (FACS) analysis data.
export interface FACSAnalysis {
    dominantAUs: string[];
    musculatureDescription: string;
}

// Facial landmark data.
export interface Landmark {
    type: string;
}

// Data related to scene depth and object interaction.
export interface DepthAnalysis {
    depthDescription: string;
    occlusionSuggestion: string;
    interactionPoints: {
        type: string;
        description: string;
        placementSuggestion: string;
    }[];
}

// The comprehensive data structure holding the results of the primary analysis.
export interface ComprehensiveAnalysisData {
    // Subject Analysis
    subjectPose: string;
    identityLock: string;
    outfitDescription: string;
    facsAnalysis: FACSAnalysis;
    landmarks: Landmark[];
    
    // Scene Analysis
    lighting: string;
    lightingEffectOnSubject: string;

    sceneComposition: string;
    colorPalette: {
        dominant: string[];
        accent: string[];
    };
    sceneDescription: string;
    cameraDetails: string;
    depthAnalysis: DepthAnalysis;
}

// --- Secondary Analysis Modules Data ---

// Suggestions for Visual Effects (VFX) and interactions.
export interface VFXSuggestions {
    smartInteraction: {
        type: string;
        description: string;
        placementSuggestion: string;
    } | null;
    lightingSuggestion: string;
}

// Data for adapting a subject's pose based on interactions.
export interface PoseAdaptationData {
    adaptedPoseDescription: string;
    confidenceScore: number;
    reasoning: string;
}

// Data describing how shadows should be cast.
export interface ShadowCastingData {
    shadowDescription: string;
    softness: 'hard' | 'soft' | 'diffuse';
    direction: string;
    reasoning: string;
}

// Data from perspective analysis, including recommended scaling.
export interface PerspectiveAnalysisData {
    recommendedSubjectScale: number;
    vanishingPointCoordinates: string;
    reasoning: string;
}

// Data structure for the Photometric Analysis results.
export interface LightSourceData {
    direction: string;
    colorTemperature: string;
    intensity: 'subtle' | 'moderate' | 'strong';
    quality: 'hard' | 'soft' | 'diffuse';
}
export interface PhotometricAnalysisData {
    keyLight: LightSourceData;
    fillLight: LightSourceData;
    rimLight: LightSourceData | null;
    ambientBounceLight: string;
    globalMood: string;
}

// Represents the state of an individual secondary analysis module.
export interface SecondaryAnalysisModuleState {
    loading: boolean;
    error: string | null;
    cached: boolean;
}

// --- UI and State Management ---

// Defines the global status of the application for the state machine.
export type AppStatus =
  | 'IDLE'          // Waiting for user action
  | 'VERIFYING'     // Verifying inputs
  | 'ANALYZING_PRIMARY' // Running comprehensive analysis
  | 'ANALYZING_SECONDARY' // Running one or more secondary modules
  | 'GENERATING_IMAGE'  // Calling the image generation model
  | 'HARMONIZING'     // Post-processing the image
  | 'DONE'          // Process complete, image is displayed
  | 'ERROR';        // An error occurred

// NEW: Defines the model selection for secondary analysis modules.
export type AnalysisModelSelection = 'Pro' | 'Fast';

// NEW: Defines the state structure for storing model selections.
export interface AnalysisModelsState {
    subject: AnalysisModelSelection;
    scene: AnalysisModelSelection;
    vfx: AnalysisModelSelection;
    pose: AnalysisModelSelection;
    shadow: AnalysisModelSelection;
    perspective: AnalysisModelSelection;
    photometric: AnalysisModelSelection;
}

// The structure of an item in the generation history.
export interface HistoryItem {
    id: string;
    timestamp: number;
    outputImage: string;
    inputs: {
        subjectImage: FileWithPreview;
        sceneImage: FileWithPreview | null;
        referenceImage: FileWithPreview | null;
        outfitImage: FileWithPreview | null;
        prompt: string;
        sceneSource: SceneSource;
        stylePreset: StylePreset;
        resolution: Resolution;
    };
}

// The result of the input verification process.
export interface VerificationResult {
    subject: { valid: boolean; message: string };
    // FIX: Allow 'success' as a valid type for the scene verification message.
    scene: { valid: boolean; message: string; type?: 'info' | 'success' };
    outfit: { valid: boolean; message: string; type?: 'info' };
    prompt: { valid: boolean; message: string };
    overall: { valid: boolean; message: string };
    promptSnippet: string;
}
