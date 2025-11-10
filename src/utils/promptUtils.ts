import type {
  ComprehensiveAnalysisData,
  PoseAdaptationData,
  Resolution,
  SceneSource,
  ShadowCastingData,
  StylePreset,
  VFXSuggestions,
  PerspectiveAnalysisData,
  PhotometricAnalysisData, // Added for photometric module
} from '../../types';

// Helper function to format a section of the prompt.
const formatSection = (title: string, content: string | undefined | null): string => {
  if (!content) return '';
  return `\n--${title.toUpperCase()}--\n${content}`;
};

/**
 * Constructs the final, detailed prompt for the image generation model.
 * This function acts as the "Director's Briefing," assembling all analyzed data.
 */
export const constructFinalPrompt = (
  userInput: string,
  sceneSource: SceneSource,
  analysis: ComprehensiveAnalysisData,
  vfx: VFXSuggestions | null,
  pose: PoseAdaptationData | null,
  shadow: ShadowCastingData | null,
  perspective: PerspectiveAnalysisData | null,
  photometric: PhotometricAnalysisData | null, // Added for photometric module
  style: StylePreset,
  resolution: Resolution
): string => {
  let briefing = `**VHMS DIRECTOR'S BRIEFING**\n`;
  briefing += `**Primary Goal:** ${userInput}\n`;

  // --- CORE ELEMENTS ---
  briefing += `\n**--- CORE ELEMENTS ---**`;
  briefing += formatSection("Identity Lock", analysis.identityLock);
  briefing += formatSection("Subject Description", `A person with the locked identity, wearing: ${analysis.outfitDescription}.`);
  
  // Use adapted pose if available, otherwise use original.
  const finalPose = pose?.adaptedPoseDescription || analysis.subjectPose;
  briefing += formatSection("Subject Pose & Action", `${userInput}. The subject's specific pose is: ${finalPose}.`);

  // Scene description depends on the source.
  if (sceneSource === 'generate') {
    briefing += formatSection("Scene Description", `Create a scene based on this user prompt: "${userInput}". Additional scene details: ${analysis.sceneDescription}.`);
  } else {
    briefing += formatSection("Scene Description", "The scene is provided by the user-uploaded background/reference image. Adhere to its composition, lighting, and elements.");
  }

  // --- TECHNICAL DIRECTIVES ---
  briefing += `\n\n**--- TECHNICAL DIRECTIVES ---**`;
  briefing += formatSection("Style & Mood", `Render in a "${style}" style. The global mood is: ${photometric?.globalMood || 'determined by the scene'}.`);
  briefing += formatSection("Camera & Composition", `${analysis.cameraDetails}. Composition is ${analysis.sceneComposition}.`);

  // Photometric data provides more detailed lighting info.
  if (photometric) {
    briefing += `\n--LIGHTING--`;
    briefing += `\n- Key Light: ${photometric.keyLight.direction}, ${photometric.keyLight.colorTemperature}, ${photometric.keyLight.intensity} intensity, ${photometric.keyLight.quality} quality.`;
    briefing += `\n- Fill Light: ${photometric.fillLight.direction}, ${photometric.fillLight.colorTemperature}, ${photometric.fillLight.intensity} intensity, ${photometric.fillLight.quality} quality.`;
    if (photometric.rimLight) {
        briefing += `\n- Rim Light: ${photometric.rimLight.direction}, ${photometric.rimLight.colorTemperature}, ${photometric.rimLight.intensity} intensity, ${photometric.rimLight.quality} quality.`;
    }
    briefing += `\n- Ambient/Bounce: ${photometric.ambientBounceLight}.`;
  } else {
    briefing += formatSection("Lighting", analysis.lighting);
  }
  
  briefing += formatSection("Shadows", shadow?.shadowDescription || "Cast realistic shadows based on the lighting.");
  
  // Integration details
  if (perspective || vfx?.smartInteraction) {
      briefing += `\n\n**--- INTEGRATION DETAILS ---**`;
      if (perspective) {
          briefing += `\n- Subject Scale: The subject should be scaled to ${Math.round(perspective.recommendedSubjectScale * 100)}% of a neutral scale to fit the scene's perspective.`;
      }
      if (vfx?.smartInteraction) {
          briefing += `\n- Interaction Point: The subject is interacting with the scene. Specifically: ${vfx.smartInteraction.placementSuggestion}.`;
      }
  }

  // --- FINAL INSTRUCTION ---
  briefing += `\n\n**--- FINAL INSTRUCTION ---**\nGenerate a photorealistic, coherent image adhering strictly to all directives. The subject's facial identity, defined by the Identity Lock, is non-negotiable.`;

  return briefing;
};
