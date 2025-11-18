import type {
  Resolution,
  SceneSource,
  StylePreset,
  UnifiedAnalysisData,
  DependentAdaptationData,
  ComprehensiveAnalysisData
} from '../../types';

// Helper function to format a section of the prompt.
const formatSection = (title: string, content: string | undefined | null): string => {
  if (!content) return '';
  return `\n--${title.toUpperCase()}--\n${content}`;
};

/**
 * Constructs the final, detailed prompt for the image generation model.
 * This function acts as the "Director's Briefing," assembling all analyzed data.
 * RE-ENGINEERED for VHMS v3.1 "Two-Call" Architecture.
 */
export const constructFinalPrompt = (
  userInput: string,
  sceneSource: SceneSource,
  unifiedData: UnifiedAnalysisData | ComprehensiveAnalysisData, // Accept both for backward compatibility during transition
  dependentData: DependentAdaptationData | null,
  style: StylePreset,
  resolution: Resolution
): string => {
  // --- BRANCH 1: 'DARI PROMPT' (Simplified Flow) ---
  if (sceneSource === 'generate') {
    let briefing = `**VHMS DIRECTOR'S BRIEFING (Simplified Mode)**\n`;
    briefing += `**Primary Goal:** A photorealistic image based on the user's full description.\n`;
    briefing += formatSection("Identity Lock", unifiedData.identityLock);
    briefing += `\n--USER DIRECTIVE--\n${userInput}`;
    briefing += `\n\n**--- TECHNICAL DIRECTIVES ---**`;
    briefing += formatSection("Style & Mood", `Render in a "${style}" style.`);
    briefing += `\n\n**--- FINAL INSTRUCTION ---**\nGenerate a photorealistic, coherent image adhering strictly to all directives. The subject's facial identity, defined by the Identity Lock, is non-negotiable. The user directive contains the full description of the subject's pose, outfit, and the scene.`;
    return briefing;
  }
  
  // --- BRANCH 2: PRO MODES ('upload' & 'reference') ---
  // Type guard to ensure we're working with the full UnifiedAnalysisData
  if (!('vfx' in unifiedData)) {
    console.error("PromptEngine: Incorrect data type passed for Pro modes. Expected UnifiedAnalysisData.");
    return `Error: Data analisis tidak lengkap untuk membuat prompt.`;
  }
  
  let briefing = `**VHMS DIRECTOR'S BRIEFING**\n`;
  briefing += `**Primary Goal:** ${userInput}\n`;

  // --- CORE ELEMENTS ---
  briefing += `\n**--- CORE ELEMENTS ---**`;
  briefing += formatSection("Identity Lock", unifiedData.identityLock);
  briefing += formatSection("Subject Description", `A person with the locked identity, wearing: ${unifiedData.outfitDescription}.`);
  
  const finalPose = dependentData?.pose?.adaptedPoseDescription || unifiedData.subjectPose;
  briefing += formatSection("Subject Pose & Action", `${userInput}. The subject's specific pose is: ${finalPose}.`);

  briefing += formatSection("Scene Description", "The scene is provided by the user-uploaded background/reference image. Adhere to its composition, lighting, and elements.");

  // --- TECHNICAL DIRECTIVES ---
  briefing += `\n\n**--- TECHNICAL DIRECTIVES ---**`;
  briefing += formatSection("Style & Mood", `Render in a "${style}" style. The global mood is: ${unifiedData.photometric?.globalMood || 'determined by the scene'}.`);
  briefing += formatSection("Camera & Composition", `${unifiedData.cameraDetails}. Composition is ${unifiedData.sceneComposition}.`);

  if (unifiedData.photometric) {
    briefing += `\n--LIGHTING--`;
    briefing += `\n- Key Light: ${unifiedData.photometric.keyLight.direction}, ${unifiedData.photometric.keyLight.colorTemperature}, ${unifiedData.photometric.keyLight.intensity} intensity, ${unifiedData.photometric.keyLight.quality} quality.`;
    briefing += `\n- Fill Light: ${unifiedData.photometric.fillLight.direction}, ${unifiedData.photometric.fillLight.colorTemperature}, ${unifiedData.photometric.fillLight.intensity} intensity, ${unifiedData.photometric.fillLight.quality} quality.`;
    if (unifiedData.photometric.rimLight) {
        briefing += `\n- Rim Light: ${unifiedData.photometric.rimLight.direction}, ${unifiedData.photometric.rimLight.colorTemperature}, ${unifiedData.photometric.rimLight.intensity} intensity, ${unifiedData.photometric.rimLight.quality} quality.`;
    }
    briefing += `\n- Ambient/Bounce: ${unifiedData.photometric.ambientBounceLight}.`;
  } else {
    briefing += formatSection("Lighting", unifiedData.lighting);
  }
  
  briefing += formatSection("Shadows", dependentData?.shadow?.shadowDescription || "Cast realistic shadows based on the lighting.");
  
  if (unifiedData.perspective || unifiedData.vfx?.smartInteraction) {
      briefing += `\n\n**--- INTEGRATION DETAILS ---**`;
      if (unifiedData.perspective) {
          briefing += `\n- Subject Scale: The subject should be scaled to ${Math.round(unifiedData.perspective.recommendedSubjectScale * 100)}% of a neutral scale to fit the scene's perspective.`;
      }
      if (unifiedData.vfx?.smartInteraction) {
          briefing += `\n- Interaction Point: The subject is interacting with the scene. Specifically: ${unifiedData.vfx.smartInteraction.placementSuggestion}.`;
      }
  }

  // --- FINAL INSTRUCTION ---
  briefing += `\n\n**--- FINAL INSTRUCTION ---**\nGenerate a photorealistic, coherent image adhering strictly to all directives. The subject's facial identity, defined by the Identity Lock, is non-negotiable.`;

  return briefing;
};