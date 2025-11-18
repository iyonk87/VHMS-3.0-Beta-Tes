import { Modality, Part, Type } from "@google/genai";
import type {
  ComprehensiveAnalysisData,
  FileWithPreview,
  SceneSource,
  AnalysisModelSelection,
  UnifiedAnalysisData,
  DependentAdaptationData
} from '../types';
import { cacheService } from './cacheService';
import { config } from './configService';

// Helper to convert File object to a base64 string for the API.
const fileToGenerativePart = async (file: File | Blob, mimeTypeOverride?: string): Promise<Part> => {
  if (!(file instanceof File) && !(file instanceof Blob)) {
      console.error("[VHMS FATAL] Invalid input type passed to fileToGenerativePart:", file);
      throw new Error("Input gambar yang harus dianalisis hilang atau tidak valid (Bukan File/Blob).");
  }
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  const mimeType = mimeTypeOverride || (file instanceof File ? file.type : 'image/png');
  return { inlineData: { data: await base64EncodedDataPromise, mimeType } };
};

const PROXY_URL = '/.netlify/functions/gemini-proxy'; 

async function callProxy(promptBody: any, modelName: string) {
    const response = await fetch(PROXY_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ promptBody, modelName }), 
    });

    const result = await response.json();

    if (!response.ok) {
        let finalErrorMessage = 'Terjadi Kesalahan Proxy: Gagal Menghubungi Server.';
        if (result) {
            if (result.error && typeof result.error.message === 'string') {
                finalErrorMessage = result.error.message;
            } 
            else if (typeof result.details === 'string') {
                finalErrorMessage = result.details;
            }
            else if (typeof result.error === 'string') {
                finalErrorMessage = result.error;
            }
        }
        throw new Error(finalErrorMessage);
    }
    
    return result;
}


// --- Error Interceptor ---
const handleGeminiError = (error: any): never => {
  console.error("[GeminiService] Raw API Error Intercepted:", error);

  const errorMessage = error.message || JSON.stringify(error);
  
  if (errorMessage.includes("API key") || errorMessage.includes("FATAL_NO_API_KEY_FOUND")) {
       throw new Error("Kunci API tidak ditemukan. Pastikan VITE_GEMINI_API_KEY telah diatur dengan benar di environment variables Anda.");
  }

  if (
    error.status === 429 ||
    errorMessage.includes("429") ||
    errorMessage.includes("quota") ||
    errorMessage.includes("RESOURCE_EXHAUSTED")
  ) {
    throw new Error(
      "⚠️ Layanan Sedang Sibuk (Batas Kuota Gratis Tercapai).\n" +
      "Terlalu banyak permintaan dalam waktu singkat. Mohon tunggu sekitar 30-60 detik agar kuota Anda pulih, lalu coba lagi. VHMS Team"
    );
  }

  throw error;
};

// --- Schemas for Reliable JSON Output ---

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

const identityLockSchema = {
    type: Type.OBJECT,
    properties: {
        identityLock: { 
            type: Type.STRING, 
            description: "Create a single, highly detailed, unique vector-like description of the subject's consistent facial features synthesized from all provided images. Be extremely specific to ensure identity consistency." 
        },
    },
    required: ['identityLock'],
};

// --- NEW: VHMS v3.1 Schemas for "Two-Call" Architecture ---

const unifiedAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        ...subjectAnalysisSchema.properties,
        ...sceneAnalysisSchema.properties,
        vfx: vfxSchema,
        perspective: perspectiveSchema,
        photometric: photometricSchema,
    },
    required: [
        'subjectPose', 'identityLock', 'outfitDescription', 'facsAnalysis', 'landmarks',
        'lighting', 'lightingEffectOnSubject', 'sceneComposition', 'colorPalette', 'sceneDescription', 'cameraDetails', 'depthAnalysis',
        'vfx', 'perspective', 'photometric'
    ]
};

const dependentAdaptationSchema = {
    type: Type.OBJECT,
    properties: {
        pose: poseSchema,
        shadow: shadowSchema,
    },
    required: ['pose', 'shadow']
};


// --- Generic API Call Helpers ---

const getModelName = (selection: AnalysisModelSelection): string => {
  return selection === 'Pro' ? config.models.pro : config.models.fast;
};

async function callGeminiAPI<T>(modelName: string, promptParts: Part[], schema: object): Promise<T> {
  try {
    console.log(`[GeminiService] Calling proxy for JSON output using model ${modelName}...`);
  
    const promptBody = {
      contents: { parts: promptParts },
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    };

    const result = await callProxy(promptBody, modelName);

    const textPart = result.candidates?.[0]?.content?.parts?.find(p => 'text' in p);

    if (!textPart || typeof (textPart as any).text !== 'string') {
      console.error("[GeminiService] No valid JSON text part found in proxy response.", JSON.stringify(result, null, 2));
      throw new Error("Respons dari proxy tidak mengandung output JSON yang valid.");
    }

    const jsonText = (textPart as any).text.trim();
    const cleanedJson = jsonText.replace(/^```json\s*|```\s*$/g, '');
    return JSON.parse(cleanedJson) as T;

  } catch (e) {
    handleGeminiError(e);
    throw e; 
  }
}

// NEW: Generic function for simple text-based responses (no JSON schema)
async function callGeminiTextAPI(modelName: string, promptParts: Part[]): Promise<string> {
  try {
    console.log(`[GeminiService] Calling proxy for text output using model ${modelName}...`);

    const promptBody = {
      contents: { parts: promptParts },
    };

    const result = await callProxy(promptBody, modelName);

    const textPart = result.candidates?.[0]?.content?.parts?.find(p => 'text' in p);

    if (!textPart || typeof (textPart as any).text !== 'string') {
      console.error("[GeminiService] No valid text part found in proxy response.", JSON.stringify(result, null, 2));
      throw new Error("Respons dari proxy tidak mengandung output teks yang valid.");
    }

    return (textPart as any).text.trim();

  } catch (e) {
    handleGeminiError(e);
    throw e;
  }
}


async function callGeminiImageAPI(modelName: string, promptParts: Part[]): Promise<string> {
  try {
    console.log(`[GeminiService] Calling proxy for image output using model ${modelName} with ${promptParts.length} parts...`);
    
    const promptBody = {
      contents: { parts: promptParts },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    };

    const result = await callProxy(promptBody, modelName);

    for (const part of result.candidates[0].content.parts) {
      if (part.inlineData) {
        const base64ImageBytes: string = part.inlineData.data;
        return `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
      }
    }

    throw new Error("No image was generated by the model.");

  } catch (e) {
    handleGeminiError(e);
    throw e;
  }
}

// --- NEW V3.1: UNIFIED ANALYSIS PIPELINE (CALL 1) ---

export const performUnifiedAnalysis = async (
  subjectImage: FileWithPreview,
  sceneImage: FileWithPreview, // In pro modes, this is required.
  outfitImage: FileWithPreview | null,
  prompt: string,
  modelSelection: AnalysisModelSelection
): Promise<{ data: UnifiedAnalysisData, isCached: boolean }> => {
  const cacheKeyFiles = [subjectImage, sceneImage, outfitImage].filter(Boolean);
  const cached = cacheService.getUnifiedAnalysis(cacheKeyFiles);
  if (cached) return { data: cached, isCached: true };

  console.log("[GeminiService V3.1] Executing Unified Analysis Call (1/2)...");

  const subjectPart = await fileToGenerativePart(subjectImage);
  const scenePart = await fileToGenerativePart(sceneImage);
  const parts: Part[] = [subjectPart, scenePart];

  let analysisPrompt = `You are VHMS, an expert multi-modal analysis engine. Analyze the provided subject and scene images to create a photorealistic composite. The user's goal is: "${prompt}". Fill the entire JSON schema with a comprehensive, integrated analysis covering the subject, scene, VFX, perspective, and photometric lighting.`;
  
  if (outfitImage) {
    parts.push(await fileToGenerativePart(outfitImage));
    analysisPrompt += "\nAn additional image is provided as an outfit reference. Use this for the 'outfitDescription'.";
  }

  parts.unshift({ text: analysisPrompt });

  const data = await callGeminiAPI<UnifiedAnalysisData>(getModelName(modelSelection), parts, unifiedAnalysisSchema);
  cacheService.setUnifiedAnalysis(cacheKeyFiles, data);
  return { data, isCached: false };
};


// --- NEW V3.1: DEPENDENT ADAPTATION PIPELINE (CALL 2) ---

export const performDependentAdaptations = async (
  unifiedData: UnifiedAnalysisData,
  subjectImage: FileWithPreview,
  modelSelection: AnalysisModelSelection
): Promise<{ data: DependentAdaptationData, isCached: boolean }> => {
    const interactionDescription = unifiedData.vfx.smartInteraction?.placementSuggestion || "No specific interaction";
    const cached = cacheService.getDependentAdaptations(subjectImage, interactionDescription, unifiedData.lighting);
    if (cached) return { data: cached, isCached: true };

    console.log("[GeminiService V3.1] Executing Dependent Adaptation Call (2/2)...");

    const subjectPart = await fileToGenerativePart(subjectImage);
    
    const prompt = `Given this comprehensive scene and subject analysis:
    - Original Subject Pose: "${unifiedData.subjectPose}"
    - Smart Interaction Suggestion: "${interactionDescription}"
    - Scene Lighting: "${unifiedData.lighting}"
    
    Your task is to perform the dependent adaptations:
    1.  **Adapt Pose:** Describe a new, realistic pose for the subject that incorporates the smart interaction.
    2.  **Generate Shadow:** Based on the newly adapted pose and the scene lighting, describe the shadow the subject should cast.
    
    Fill the entire JSON schema with the results.`;

    const parts: Part[] = [subjectPart, { text: prompt }];

    const data = await callGeminiAPI<DependentAdaptationData>(getModelName(modelSelection), parts, dependentAdaptationSchema);
    cacheService.setDependentAdaptations(subjectImage, interactionDescription, unifiedData.lighting, data);
    return { data, isCached: false };
}


// --- 'Dari Prompt' Mode Specific Functions ---

export const generateIdentityLockFromImages = async (
    images: FileWithPreview[],
    modelSelection: AnalysisModelSelection
): Promise<string> => {
    const cached = cacheService.getIdentityLock(images);
    if (cached) return cached;
    
    const parts: Part[] = [];
    for (const image of images) {
        parts.push(await fileToGenerativePart(image));
    }
    const prompt = `Analyze these ${images.length} images of the same person. Synthesize and return a single, unified 'identityLock' string that captures their core facial features consistently across all photos. The lock should be extremely detailed to ensure high-fidelity identity preservation in subsequent image generations.`;
    parts.unshift({ text: prompt });

    const result = await callGeminiAPI<{ identityLock: string }>(getModelName(modelSelection), parts, identityLockSchema);
    
    cacheService.setIdentityLock(images, result.identityLock);
    return result.identityLock;
};

export const describeSubjectImage = async (
    subjectImage: FileWithPreview,
    modelSelection: AnalysisModelSelection
): Promise<string> => {
    const cached = cacheService.getSubjectDescription(subjectImage);
    if (cached) return cached;

    const parts: Part[] = [await fileToGenerativePart(subjectImage)];
    const prompt = `Analyze the person in this image. Describe their pose and outfit in a single, concise sentence. This description will be used in an image generation prompt. Example: "A woman wearing a red leather jacket, standing and looking at the camera."`;
    parts.unshift({ text: prompt });
    
    const description = await callGeminiTextAPI(getModelName(modelSelection), parts);

    cacheService.setSubjectDescription(subjectImage, description);
    return description;
};

// --- Image Generation & Post-Processing ---

const dataUrlToBlob = (dataUrl: string): Blob => {
    const arr = dataUrl.split(',');
    if (arr.length < 2) {
        throw new Error('Invalid data URL');
    }
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || mimeMatch.length < 2) {
        throw new Error('Could not determine MIME type from data URL');
    }
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
};

export const generateFinalImage = async (
  finalPrompt: string,
  sceneSource: SceneSource,
  subjectImage: FileWithPreview | null,
  sceneImage: FileWithPreview | null,
  referenceImage: FileWithPreview | null,
  interactionMask: string | null
): Promise<string> => {
  const parts: Part[] = [];
  
  let augmentedPrompt = finalPrompt;

  if (subjectImage) {
    parts.push(await fileToGenerativePart(subjectImage));
  }

  let baseImage: FileWithPreview | null = null;
  if (sceneSource === 'upload' && sceneImage) baseImage = sceneImage;
  if (sceneSource === 'reference' && referenceImage) baseImage = referenceImage;
  
  if (baseImage) {
    parts.push(await fileToGenerativePart(baseImage));
  }

  if (interactionMask) {
    console.log("[GeminiService] Interaction mask found. Augmenting prompt and adding mask part.");
    augmentedPrompt += "\n\n**--- MASKING & OCCLUSION DIRECTIVE ---**\nA black and white interaction mask is provided as an image part. The subject must appear BEHIND the white areas of this mask to create a realistic occlusion effect with foreground elements.";

    const maskBlob = dataUrlToBlob(interactionMask);
    parts.push(await fileToGenerativePart(maskBlob, 'image/png'));
  }
  
  parts.unshift({ text: augmentedPrompt });

  return callGeminiImageAPI(config.models.image, parts);
};

export const performHarmonization = async (
  baseImageSrc: string,
  analysisData: ComprehensiveAnalysisData
): Promise<string> => {
  console.log("[GeminiService] Starting Post-Generation Harmonization...");
  const imageBlob = await (await fetch(baseImageSrc)).blob();
  const imagePart = await fileToGenerativePart(imageBlob);

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

  return callGeminiImageAPI(config.models.image, [textPart, imagePart]);
};

export const generateObjectMask = async (
  sceneImage: FileWithPreview,
  occlusionSuggestion: string
): Promise<string> => {
  const scenePart = await fileToGenerativePart(sceneImage);
  const textPart = { text: `Generate a black and white segmentation mask for the following object in the image: "${occlusionSuggestion}". The object(s) of interest MUST be solid white (#FFFFFF) and the entire background MUST be solid black (#000000). Do not include any shades of gray, text, or other elements. The output must be only the binary mask.` };
  
  return callGeminiImageAPI(config.models.image, [scenePart, textPart]);
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

  return callGeminiImageAPI(config.models.image, [imagePart, maskPart, textPart]);
};