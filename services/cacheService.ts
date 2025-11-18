import type { FileWithPreview, UnifiedAnalysisData, DependentAdaptationData } from '../types';

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

// --- VHMS v3.1: Key Generation for "Two-Call" Architecture ---
const generateUnifiedKey = (filesKey: string) => `unified-${filesKey}`;
const generateDependentKey = (subjectKey: string, interactionText: string, lightingText: string) => `dependent-${subjectKey}-${interactionText}-${lightingText}`;

// --- Key Generation for 'Dari Prompt' Mode ---
const generateIdentityLockKey = (fileKey: string) => `identity-lock-${fileKey}`;
const generateSubjectDescriptionKey = (fileKey: string) => `subject-desc-${fileKey}`;


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

  // --- NEW: VHMS v3.1 Unified Analysis Caching ---
  public getUnifiedAnalysis(files: (FileWithPreview | null)[]): UnifiedAnalysisData | null {
    const key = generateUnifiedKey(generateFileCacheKey(files));
    const data = this.cache.get(key);
    if (data) {
      console.log(`[CacheService] HIT: Found unified analysis data for key: ${key}`);
      return data;
    }
    return null;
  }
  public setUnifiedAnalysis(files: (FileWithPreview | null)[], data: UnifiedAnalysisData): void {
    const key = generateUnifiedKey(generateFileCacheKey(files));
    this.cache.set(key, data);
    console.log(`[CacheService] SET: Stored unified analysis data for key: ${key}`);
  }

  // --- NEW: VHMS v3.1 Dependent Adaptation Caching ---
  public getDependentAdaptations(subjectImage: FileWithPreview, interactionText: string, lightingText: string): DependentAdaptationData | null {
    const key = generateDependentKey(generateFileCacheKey([subjectImage]), interactionText, lightingText);
    const data = this.cache.get(key);
    if (data) {
      console.log(`[CacheService] HIT: Found dependent adaptation data for key: ${key}`);
      return data;
    }
    return null;
  }
  public setDependentAdaptations(subjectImage: FileWithPreview, interactionText: string, lightingText: string, data: DependentAdaptationData): void {
    const key = generateDependentKey(generateFileCacheKey([subjectImage]), interactionText, lightingText);
    this.cache.set(key, data);
    console.log(`[CacheService] SET: Stored dependent adaptation data for key: ${key}`);
  }

  
  // --- 'Dari Prompt' Mode Caching ---
  public getIdentityLock(files: FileWithPreview[]): string | null {
    const key = generateIdentityLockKey(generateFileCacheKey(files));
    const data = this.cache.get(key);
    if (data) {
        console.log(`[CacheService] HIT: Found Identity Lock for key: ${key}`);
        return data;
    }
    return null;
  }
  public setIdentityLock(files: FileWithPreview[], lock: string): void {
    const key = generateIdentityLockKey(generateFileCacheKey(files));
    this.cache.set(key, lock);
    console.log(`[CacheService] SET: Stored Identity Lock for key: ${key}`);
  }
  
  public getSubjectDescription(subjectImage: FileWithPreview): string | null {
    const key = generateSubjectDescriptionKey(generateFileCacheKey([subjectImage]));
    const data = this.cache.get(key);
    if (data) {
        console.log(`[CacheService] HIT: Found Subject Description for key: ${key}`);
        return data;
    }
    return null;
  }
  public setSubjectDescription(subjectImage: FileWithPreview, description: string): void {
    const key = generateSubjectDescriptionKey(generateFileCacheKey([subjectImage]));
    this.cache.set(key, description);
    console.log(`[CacheService] SET: Stored Subject Description for key: ${key}`);
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