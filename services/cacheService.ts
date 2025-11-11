import type { FileWithPreview, PoseAdaptationData, ShadowCastingData, VFXSuggestions, PerspectiveAnalysisData, PhotometricAnalysisData } from '../types';

/**
 * Generates a unique key for a set of files based on their names and sizes.
 * This is a simple but effective way to cache based on file identity for a session.
 * @param files - An array of files used for caching.
 * @returns A string key.
 */
const generateFileCacheKey = (files: (FileWithPreview | null)[]): string => {
  return files
    .filter((file): file is FileWithPreview => file !== null)
    .map(file => `${file.name}-${file.size}-${file.lastModified}`)
    .sort()
    .join('|');
};

// --- Key Generation for Secondary Analyses ---
const generateVFXKey = (fileKey: string) => `vfx-${fileKey}`;
const generatePoseAdaptationKey = (subjectKey: string, interactionText: string) => `pose-${subjectKey}-${interactionText}`;
const generateShadowDataKey = (poseText: string, interactionText: string) => `shadow-${poseText}-${interactionText}`;
const generatePerspectiveKey = (fileKey: string) => `perspective-${fileKey}`;
const generatePhotometricKey = (fileKey: string) => `photometric-${fileKey}`;
// [PENAMBAHAN BARU] Key generator for Harmonization
const generateHarmonizationKey = (fileKey: string) => `harmonized-${fileKey}`;


/**
 * A simple in-memory cache service for the current session.
 * Implements the "Persistent Analysis Cache Engine" feature.
 */
class CacheService {
  private cache: Map<string, any>;

  constructor() {
    this.cache = new Map();
    console.log("Persistent Analysis Cache Engine initialized for this session.");
  }

  // --- Comprehensive Analysis ---
  public getComprehensive<T>(files: (FileWithPreview | null)[]): T | null {
    const key = generateFileCacheKey(files);
    const data = this.cache.get(key);
    if (data) {
      console.log(`[CacheService] HIT: Found comprehensive data for key: ${key}`);
      return data as T;
    }
    console.log(`[CacheService] MISS: No comprehensive data for key: ${key}`);
    return null;
  }
  public setComprehensive<T>(files: (FileWithPreview | null)[], data: T): void {
    const key = generateFileCacheKey(files);
    this.cache.set(key, data);
    console.log(`[CacheService] SET: Stored comprehensive data for key: ${key}`);
  }

  // --- VFX Suggestions ---
  public getVFX(sceneImage: FileWithPreview): { data: VFXSuggestions, isCached: true } | null {
    const key = generateVFXKey(generateFileCacheKey([sceneImage]));
    const data = this.cache.get(key);
    if (data) {
      console.log(`[CacheService] HIT: Found VFX data for key: ${key}`);
      return { data, isCached: true };
    }
    console.log(`[CacheService] MISS: No VFX data for key: ${key}`);
    return null;
  }
  public setVFX(sceneImage: FileWithPreview, data: VFXSuggestions): void {
    const key = generateVFXKey(generateFileCacheKey([sceneImage]));
    this.cache.set(key, data);
    console.log(`[CacheService] SET: Stored VFX data for key: ${key}`);
  }

  // --- Pose Adaptation ---
  public getPoseAdaptation(subjectImage: FileWithPreview, interactionText: string): { data: PoseAdaptationData, isCached: true } | null {
    const key = generatePoseAdaptationKey(generateFileCacheKey([subjectImage]), interactionText);
    const data = this.cache.get(key);
    if (data) {
      console.log(`[CacheService] HIT: Found pose data for key: ${key}`);
      return { data, isCached: true };
    }
    console.log(`[CacheService] MISS: No pose data for key: ${key}`);
    return null;
  }
  public setPoseAdaptation(subjectImage: FileWithPreview, interactionText: string, data: PoseAdaptationData): void {
    const key = generatePoseAdaptationKey(generateFileCacheKey([subjectImage]), interactionText);
    this.cache.set(key, data);
    console.log(`[CacheService] SET: Stored pose data for key: ${key}`);
  }

  // --- Shadow Casting ---
  public getShadowData(poseText: string, interactionText: string): { data: ShadowCastingData, isCached: true } | null {
    const key = generateShadowDataKey(poseText, interactionText);
    const data = this.cache.get(key);
    if (data) {
      console.log(`[CacheService] HIT: Found shadow data for key: ${key}`);
      return { data, isCached: true };
    }
    console.log(`[CacheService] MISS: No shadow data for key: ${key}`);
    return null;
  }
  public setShadowData(poseText: string, interactionText: string, data: ShadowCastingData): void {
    const key = generateShadowDataKey(poseText, interactionText);
    this.cache.set(key, data);
    console.log(`[CacheService] SET: Stored shadow data for key: ${key}`);
  }

  // --- Perspective Analysis ---
  public getPerspective(sceneImage: FileWithPreview): { data: PerspectiveAnalysisData, isCached: true } | null {
    const key = generatePerspectiveKey(generateFileCacheKey([sceneImage]));
    const data = this.cache.get(key);
    if (data) {
      console.log(`[CacheService] HIT: Found perspective data for key: ${key}`);
      return { data, isCached: true };
    }
    console.log(`[CacheService] MISS: No perspective data for key: ${key}`);
    return null;
  }
  public setPerspective(sceneImage: FileWithPreview, data: PerspectiveAnalysisData): void {
    const key = generatePerspectiveKey(generateFileCacheKey([sceneImage]));
    this.cache.set(key, data);
    console.log(`[CacheService] SET: Stored perspective data for key: ${key}`);
  }

  // --- Photometric Analysis ---
  public getPhotometricData(sceneImage: FileWithPreview): { data: PhotometricAnalysisData, isCached: true } | null {
    const key = generatePhotometricKey(generateFileCacheKey([sceneImage]));
    const data = this.cache.get(key);
    if (data) {
      console.log(`[CacheService] HIT: Found photometric data for key: ${key}`);
      return { data, isCached: true };
    }
    console.log(`[CacheService] MISS: No photometric data for key: ${key}`);
    return null;
  }
  public setPhotometricData(sceneImage: FileWithPreview, data: PhotometricAnalysisData): void {
    const key = generatePhotometricKey(generateFileCacheKey([sceneImage]));
    this.cache.set(key, data);
    console.log(`[CacheService] SET: Stored photometric data for key: ${key}`);
  }

  // [PENAMBAHAN BARU] Harmonization ---
  public getHarmonizedImage(files: (FileWithPreview | null)[]): string | null {
    const key = generateHarmonizationKey(generateFileCacheKey(files));
    const data = this.cache.get(key);
    if (data) {
      console.log(`[CacheService] HIT: Found harmonized image for key: ${key}`);
      return data;
    }
    return null;
  }
  public setHarmonizedImage(files: (FileWithPreview | null)[], imageDataUrl: string): void {
    const key = generateHarmonizationKey(generateFileCacheKey(files));
    this.cache.set(key, imageDataUrl);
    console.log(`[CacheService] SET: Stored harmonized image for key: ${key}`);
  }


  /**
   * Clears the entire cache.
   */
  public clear(): void {
    this.cache.clear();
    console.log("[CacheService] Cache cleared.");
  }
}

export const cacheService = new CacheService();