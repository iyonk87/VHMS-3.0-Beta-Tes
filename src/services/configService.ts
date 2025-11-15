// src/services/configService.ts

// Define the structure of our configuration object for strong typing.
interface ModelConfig {
  pro: string;
  fast: string;
  image: string;
}

interface AppConfig {
  models: ModelConfig;
}

/**
 * Loads and validates configuration from environment variables.
 * This is a private function called only once when the module is imported.
 * @returns A validated and defaulted AppConfig object.
 */
const loadConfig = (): AppConfig => {
  // Cast `import.meta` to `any` to avoid TypeScript errors in non-Vite environments.
  // Vite will ensure `import.meta.env` exists at runtime.
  const env = (import.meta as any).env;

  const config: AppConfig = {
    models: {
      pro: env.VITE_PRO_MODEL || 'gemini-2.5-pro',
      fast: env.VITE_FAST_MODEL || 'gemini-2.5-flash',
      image: env.VITE_IMAGE_MODEL || 'gemini-2.5-flash-image',
    },
  };

  // Validation step: Log warnings to the console if fallbacks are being used.
  // This alerts the developer during startup if environment variables are missing.
  if (!env.VITE_PRO_MODEL) {
    console.warn(`[ConfigService] VITE_PRO_MODEL not set. Using fallback: "${config.models.pro}"`);
  }
  if (!env.VITE_FAST_MODEL) {
    console.warn(`[ConfigService] VITE_FAST_MODEL not set. Using fallback: "${config.models.fast}"`);
  }
  if (!env.VITE_IMAGE_MODEL) {
    console.warn(`[ConfigService] VITE_IMAGE_MODEL not set. Using fallback: "${config.models.image}"`);
  }

  console.log('[ConfigService] Centralized configuration loaded successfully.');

  return config;
};

/**
 * Export a single, immutable configuration object.
 * This ensures the configuration is loaded and validated only once at application startup,
 * providing a single source of truth for all modules.
 */
export const config: AppConfig = loadConfig();
