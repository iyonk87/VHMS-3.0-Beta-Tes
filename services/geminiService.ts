import { GoogleGenAI, Modality, Part, Type } from "@google/genai";
import type {
  ComprehensiveAnalysisData,
  FileWithPreview,
  SceneSource,
  VFXSuggestions,
  PoseAdaptationData,
  ShadowCastingData,
  PerspectiveAnalysisData,
  PhotometricAnalysisData
} from '../types';
import { cacheService } from './cacheService';

// Helper to convert File object to a base64 string for the API.
const fileToGenerativePart = async (file: File | Blob, mimeTypeOverride?: string): Promise<Part> => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  const mimeType = mimeTypeOverride || (file instanceof File ? file.type : 'image/png');
  return { inlineData: { data: await base64EncodedDataPromise, mimeType } };
};

const getGenAI = () => {
  // FIX KRITIS 44: Mengubah API_KEY yang salah menjadi variabel wajib CRA.
  const apiKey = process.env.REACT_APP_GEMINI_API_KEY;

  if (!apiKey) {
    console.error("API Key not found. Make sure the REACT_APP_GEMINI_API_KEY environment variable is set.");
    throw new Error(
      "API Key not found. Make sure the REACT_APP_GEMINI_API_KEY environment variable is set."
    );
  }

  return new GoogleGenAI({ apiKey });
};

// --- Schemas for Reliable JSON Output ---

// [REFACTOR] Schema for Subject-only analysis
const subjectAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        subjectPose: { type: Type.STRING, description: "Describe the subject's pose, e.g., 'standing facing forward'." },
        identityLock: { type: Type.STRING, description: "Create a highly detailed, unique vector-like description of the subject's facial features to ensure identity consistency. Be extremely specific." },
        outfitDescription: { type: Type.STRING, description: "Describe the subject's outfit in detail." },
        facsAnalysis: {
            type: Type.OBJECT,
            properties: {
                dominantAUs: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List the key Facial Action Coding System (FACS) Action Units (AUs) detected, e.g., 'AU12 (Lip Corner Puller)'." },
                musculatureDescription: { type: Type.STRING, description: "Describe the overall facial expression based on the detected musculature." },
            },
        },
        landmarks: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { type: { type: Type.STRING, description: "Detected facial landmark, e.g., 'left_eye'." } } } },
    }
};

// [REFACTOR] Schema for Scene-only analysis
const sceneAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        lighting: { type: Type.STRING, description: "Describe the lighting of the scene, e.g., 'Warm, soft light from a window on the left'." },
        lightingEffectOnSubject: { type: Type.STRING, description: "Describe how this lighting should affect a person placed in the scene, e.g., 'Causes soft highlights on the left side of the face'." },
        sceneComposition: { type: Type.STRING, description: "Describe the composition, e.g., 'Rule of thirds, subject on the left'." },
        colorPalette: { type: Type.OBJECT, properties: { dominant: { type: Type.ARRAY, items: { type: Type.STRING } }, accent: { type: Type.ARRAY, items: { type: Type.STRING } } } },
        sceneDescription: { type: Type.STRING, description: "A detailed description of the environment/scene." },
        cameraDetails: { type: Type.STRING, description: "Describe the apparent camera and lens used, e.g., 'DSLR with a 50mm prime lens, shallow depth of field'." },
        depthAnalysis: {
            type: Type.OBJECT,
            properties: {
                depthDescription: { type: Type.STRING, description: "Describe the foreground, midground, and background elements." },
                occlusionSuggestion: { type: Type.STRING, description: "Suggest an element in the scene that a subject could be partially behind to create depth." },
                interactionPoints: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            type: { type: Type.STRING },
                            description: { type: Type.STRING },
                            placementSuggestion: { type: Type.STRING },
                        },
                    },
                },
            },
        },
    }
};


const vfxSchema = {
  type: Type.OBJECT,
  properties: {
    smartInteraction: {
      type: Type.OBJECT,
      nullable: true,
      properties: {
        type: { type: Type.STRING },
        description: { type: Type.STRING },
        placementSuggestion: { type: Type.STRING },
      },
    },
    lightingSuggestion: { type: Type.STRING },
  },
};

const poseSchema = {
  type: Type.OBJECT,
  properties: {
    adaptedPoseDescription: { type: Type.STRING },
    confidenceScore: { type: Type.NUMBER },
    reasoning: { type: Type.STRING },
  },
  required: ['adaptedPoseDescription', 'confidenceScore', 'reasoning'],
};

const shadowSchema = {
  type: Type.OBJECT,
  properties: {
    shadowDescription: { type: Type.STRING },
    softness: { type: Type.STRING, enum: ['hard', 'soft', 'diffuse'] },
    direction: { type: Type.STRING },
    reasoning: { type: Type.STRING },
  },
  required: ['shadowDescription', 'softness', 'direction', 'reasoning'],
};

const perspectiveSchema = {
  type: Type.OBJECT,
  properties: {
    recommendedSubjectScale: { type: Type.NUMBER, description: "A float between 0.1 and 2.0 representing the scaling factor for the subject." },
    vanishingPointCoordinates: { type: Type.STRING, description: "Estimated coordinates of the vanishing point, e.g., '[x, y]' or 'off-canvas'." },
    reasoning: { type: Type.STRING, description: "Brief explanation for the recommended scale." },
  },
  required: ['recommendedSubjectScale', 'vanishingPointCoordinates', 'reasoning'],
};

// [PENAMBAHAN BARU] Schema for Photometric Analysis
const lightSourceSchema = {
    type: Type.OBJECT,
    properties: {
        direction: { type: Type.STRING },
        colorTemperature: { type: Type.STRING },
        intensity: { type: Type.STRING, enum: ['subtle', 'moderate', 'strong'] },
        quality: { type: Type.STRING, enum: ['hard', 'soft', 'diffuse'] },
    },
    required: ['direction', 'colorTemperature', 'intensity', 'quality'],
};

const photometricSchema = {
    type: Type.OBJECT,
    properties: {
        keyLight: lightSourceSchema,
        fillLight: lightSourceSchema,
        rimLight: { ...lightSourceSchema, nullable: true },
        ambientBounceLight: { type: Type.STRING },
        globalMood: { type: Type.STRING },
    },
    required: ['keyLight', 'fillLight', 'rimLight', 'ambientBounceLight', 'globalMood'],
};


// --- Generic API Call Helpers ---

async function callGeminiAPI<T>(model: string, promptParts: Part[], schema: object): Promise<T> {
  const ai = getGenAI();
  console.log(`[GeminiService] Calling model ${model} for JSON output...`);
  const response = await ai.models.generateContent({
    model,
    contents: { parts: promptParts },
    config: {
      responseMimeType: "application/json",
      responseSchema: schema as any,
    },
  });

  try {
    const jsonText = response.text.trim();
    const cleanedJson = jsonText.replace(/^```json\s*|```\s*$/g, '');
    return JSON.parse(cleanedJson) as T;
  } catch (e) {
    console.error("Failed to parse JSON response:", response.text, e);
    throw new Error("Received an invalid JSON response from the AI model.");
  }
}

async function callGeminiImageAPI(promptParts: Part[]): Promise<string> {
  const ai = getGenAI();
  const model = 'gemini-2.5-flash-image';
  console.log(`[GeminiService] Calling model ${model} for image output...`);

  const response = await ai.models.generateContent({
    model,
    contents: { parts: promptParts },
    config: {
      responseModalities: [Modality.IMAGE],
    },
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      const base64ImageBytes: string = part.inlineData.data;
      return `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
    }
  }

  throw new Error("No image was generated by the model.");
}

// --- [REFACTORED] Primary Analysis Pipeline ---

// [NEW] Internal function for subject-only analysis
const analyzeSubject = async (subjectImage: FileWithPreview, outfitImage: FileWithPreview | null) => {
    const parts: Part[] = [await fileToGenerativePart(subjectImage)];
    let prompt = "Analyze the provided subject image for identity locking, pose, facial expression (using FACS), and key landmarks.";
    if(outfitImage){
        parts.push(await fileToGenerativePart(outfitImage));
        prompt += "\nA second image is provided as an outfit reference. Describe this outfit for the subject.";
    }
    parts.unshift({ text: prompt });
    return callGeminiAPI<any>('gemini-2.5-pro', parts, subjectAnalysisSchema);
};

// [NEW] Internal function for scene-only analysis
const analyzeScene = async (sceneImage: FileWithPreview | null, referenceImage: FileWithPreview | null, sceneSource: SceneSource, prompt: string) => {
    if ((sceneSource === 'upload' && !sceneImage) || (sceneSource === 'reference' && !referenceImage)) {
        // If the scene should come from a prompt, generate a placeholder scene analysis
        return {
            lighting: "Inferred from prompt",
            lightingEffectOnSubject: "To be determined by AI based on prompt",
            sceneComposition: "Balanced composition",
            colorPalette: { dominant: [], accent: [] },
            sceneDescription: `Generated from prompt: "${prompt}"`,
            cameraDetails: "Standard DSLR look",
            depthAnalysis: { depthDescription: "N/A", occlusionSuggestion: "", interactionPoints: [] }
        };
    }

    const imageToAnalyze = sceneSource === 'upload' ? sceneImage : referenceImage;
    const parts: Part[] = [await fileToGenerativePart(imageToAnalyze!)];
    const analysisPrompt = `Analyze the provided scene image for lighting, composition, color palette, camera details, and depth. The user's goal is: "${prompt}".`;
    parts.unshift({ text: analysisPrompt });
    
    return callGeminiAPI<any>('gemini-2.5-pro', parts, sceneAnalysisSchema);
};

export const performComprehensiveAnalysis = async (
  subjectImage: FileWithPreview,
  sceneImage: FileWithPreview | null,
  referenceImage: FileWithPreview | null,
  outfitImage: FileWithPreview | null,
  sceneSource: SceneSource,
  prompt: string
): Promise<{ data: ComprehensiveAnalysisData, isCached: boolean }> => {
  const cacheKeyFiles = [subjectImage, sceneImage, referenceImage, outfitImage].filter(Boolean);
  const cached = cacheService.getComprehensive<ComprehensiveAnalysisData>(cacheKeyFiles);
  if (cached) return { data: cached, isCached: true };

  console.log("[GeminiService] Starting Micro-Analysis Pipeline...");

  const subjectPromise = analyzeSubject(subjectImage, outfitImage);
  const scenePromise = analyzeScene(sceneImage, referenceImage, sceneSource, prompt);

  const [subjectData, sceneData] = await Promise.all([subjectPromise, scenePromise]);
  
  // Merge the results into the final comprehensive data structure
  const mergedData: ComprehensiveAnalysisData = {
    ...subjectData,
    ...sceneData
  };
    
  console.log("[GeminiService] Micro-Analysis Pipeline complete. Merged data.");
  cacheService.setComprehensive(cacheKeyFiles, mergedData);
  return { data: mergedData, isCached: false };
};


// --- Secondary Analysis Functions (Unchanged) ---

export const getVFXSuggestions = async (
  sceneImage: FileWithPreview,
  primaryData: ComprehensiveAnalysisData
): Promise<{ data: VFXSuggestions, isCached: boolean }> => {
  const cached = cacheService.getVFX(sceneImage);
  if (cached) return cached;

  const scenePart = await fileToGenerativePart(sceneImage);
  const textPart = { text: `Given the scene image and this analysis:
    - Lighting: ${primaryData.lighting}
    - Composition: ${primaryData.sceneComposition}
    - Depth/Occlusion: ${primaryData.depthAnalysis.depthDescription}
    Suggest one 'smart interaction' point for a subject (e.g., "leaning against the railing") and a refined lighting suggestion to enhance realism.`
  };

  const data = await callGeminiAPI<VFXSuggestions>('gemini-2.5-pro', [scenePart, textPart], vfxSchema);
  cacheService.setVFX(sceneImage, data);
  return { data, isCached: false };
};

export const adaptPoseForInteraction = async (
  subjectImage: FileWithPreview,
  originalPose: string,
  interactionDescription: string
): Promise<{ data: PoseAdaptationData, isCached: boolean }> => {
    const cached = cacheService.getPoseAdaptation(subjectImage, interactionDescription);
    if (cached) return cached;
    
    const subjectPart = await fileToGenerativePart(subjectImage);
    const textPart = { text: `The subject's current pose is: "${originalPose}". Adapt this pose to realistically interact with this element: "${interactionDescription}". Describe the new pose and provide a confidence score.` };

    const data = await callGeminiAPI<PoseAdaptationData>('gemini-2.5-pro', [subjectPart, textPart], poseSchema);
    cacheService.setPoseAdaptation(subjectImage, interactionDescription, data);
    return { data, isCached: false };
};

export const generateShadowDescription = async (
  adaptedPose: string,
  interaction: string,
  lighting: string
): Promise<{ data: ShadowCastingData, isCached: boolean }> => {
    const cached = cacheService.getShadowData(adaptedPose, interaction);
    if (cached) return cached;

    const textPart = { text: `A subject is in this pose: "${adaptedPose}", interacting with "${interaction}". The scene lighting is: "${lighting}". Describe the shadow the subject should cast, including its direction and softness (hard, soft, or diffuse).` };
    
    const data = await callGeminiAPI<ShadowCastingData>('gemini-2.5-pro', [textPart], shadowSchema);
    cacheService.setShadowData(adaptedPose, interaction, data);
    return { data, isCached: false };
};

export const analyzeScenePerspective = async (
  sceneImage: FileWithPreview
): Promise<{ data: PerspectiveAnalysisData, isCached: boolean }> => {
    const cached = cacheService.getPerspective(sceneImage);
    if (cached) return cached;

    const scenePart = await fileToGenerativePart(sceneImage);
    const textPart = { text: "Analyze the perspective, vanishing point, and relative scale of this scene. Provide a recommended scale factor (as a float, e.g., 0.85) for a human subject to be realistically placed within it. A scale of 1.0 means the subject is at a neutral middle-ground depth." };

    const data = await callGeminiAPI<PerspectiveAnalysisData>('gemini-2.5-pro', [scenePart, textPart], perspectiveSchema);
    cacheService.setPerspective(sceneImage, data);
    return { data, isCached: false };
};

// [PENAMBAHAN BARU] Photometric Analysis Engine
export const performPhotometricAnalysis = async (
  sceneImage: FileWithPreview,
  primaryLightingDescription: string
): Promise<{ data: PhotometricAnalysisData, isCached: boolean }> => {
    const cached = cacheService.getPhotometricData(sceneImage);
    if (cached) return cached;

    const scenePart = await fileToGenerativePart(sceneImage);
    const textPart = { text: `You are an expert Director of Photography. Deconstruct the lighting of the provided scene image. The initial lighting assessment is: "${primaryLightingDescription}". Your task is to provide a technical, multi-point lighting plan.
    - Identify the single Key Light (main light source).
    - Identify the Fill Light (light filling in shadows).
    - Identify if a Rim Light is present (light separating subject from background).
    - Describe any ambient or bounce light.
    - Summarize the global mood.
    Fill the provided JSON schema with precise, actionable details.` 
    };

    const data = await callGeminiAPI<PhotometricAnalysisData>('gemini-2.5-pro', [scenePart, textPart], photometricSchema);
    cacheService.setPhotometricData(sceneImage, data);
    return { data, isCached: false };
};


export const generateFinalImage = async (
  finalPrompt: string,
  sceneSource: SceneSource,
  subjectImage: FileWithPreview,
  sceneImage: FileWithPreview | null,
  referenceImage: FileWithPreview | null,
  interactionMask: string | null
): Promise<string> => {
  const parts: Part[] = [{ text: finalPrompt }];
  parts.push(await fileToGenerativePart(subjectImage));

  let baseImage: FileWithPreview | null = null;
  if (sceneSource === 'upload' && sceneImage) baseImage = sceneImage;
  if (sceneSource === 'reference' && referenceImage) baseImage = referenceImage;
  
  if (baseImage) {
    parts.push(await fileToGenerativePart(baseImage));
  }
  
  return callGeminiImageAPI(parts);
};

// [PENAMBAHAN BARU] Post-Generation Harmonization Engine
export const performHarmonization = async (
  baseImageSrc: string,
  analysisData: ComprehensiveAnalysisData
): Promise<string> => {
  console.log("[GeminiService] Starting Post-Generation Harmonization...");

  // 1. Convert the base image data URL to a Blob, then to a GenerativePart
  const imageBlob = await (await fetch(baseImageSrc)).blob();
  const imagePart = await fileToGenerativePart(imageBlob);

  // 2. Construct the detailed harmonization prompt
  const harmonizationPrompt = `
You are an expert digital post-production artist. Your task is to subtly harmonize the subject within the provided image with their environment. Do not make drastic changes.

Based on the original scene analysis:
- Scene Lighting: ${analysisData.lighting}
- Dominant Color Palette: ${analysisData.colorPalette.dominant.join(', ')}
- Camera Details: ${analysisData.cameraDetails}

Perform the following fine-tuned adjustments:
1.  **Color Bleeding:** Apply a very subtle color cast from the environment's dominant colors onto the edges of the subject to simulate reflected light.
2.  **Grain/Noise Matching:** Analyze the grain/noise texture of the background and apply a consistent, minimal layer to the subject to ensure they don't look "too clean" for the scene.
3.  **Sharpness Calibration:** Ensure the subject's sharpness level is consistent with the scene's depth of field described in the camera details.

The final output must be only the enhanced, photorealistic image. It should look natural and unedited.
  `;
  const textPart = { text: harmonizationPrompt };

  // 3. Call the image generation API with the harmonization instructions
  return callGeminiImageAPI([textPart, imagePart]);
};


export const generateObjectMask = async (
  sceneImage: FileWithPreview,
  occlusionSuggestion: string
): Promise<string> => {
  const scenePart = await fileToGenerativePart(sceneImage);
  const textPart = { text: `Generate a black and white segmentation mask for the following object in the image: "${occlusionSuggestion}". The object(s) of interest MUST be solid white (#FFFFFF) and the entire background MUST be solid black (#000000). Do not include any shades of gray, text, or other elements. The output must be only the binary mask.` };
  
  return callGeminiImageAPI([scenePart, textPart]);
};

export const performInpainting = async (
  imageSrc: string,
  maskDataUrl: string,
  inpaintPrompt: string
): Promise<string> => {
  const imageBlob = await (await fetch(imageSrc)).blob();
  const maskBlob = await (await fetch(maskDataUrl)).blob();

  const imagePart = await fileToGenerativePart(imageBlob);
  const maskPart = await fileToGenerativePart(maskBlob, 'image/png'); 
  const textPart = { text: `You are an expert inpainting model. Use the second image as a mask. The white areas of the mask indicate the region to modify in the first image. Fill the masked region according to this instruction: "${inpaintPrompt}". The result should be seamless and photorealistic.` };

  return callGeminiImageAPI([imagePart, maskPart, textPart]);
};