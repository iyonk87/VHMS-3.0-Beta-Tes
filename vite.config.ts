import { fileURLToPath, URL } from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    
    // =======================================================
    // BAGIAN INI HARUS DIHAPUS/DIKOMENTARI TOTAL!!!
    // =======================================================
    /*
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    */
    // =======================================================
    
    resolve: {
      alias: [
        // FIX: Resolved `Cannot find name '__dirname'` error by using `import.meta.url`,
        // which is the modern standard for resolving file paths in ES modules.
        { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) }
      ]
    },
  };
});