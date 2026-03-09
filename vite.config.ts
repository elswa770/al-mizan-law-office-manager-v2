import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        strictPort: false, // Allow Vite to try next available port
        hmr: {
          port: 3001,
          overlay: true
        },
        watch: {
          usePolling: false
        },
        headers: {
          'Cross-Origin-Opener-Policy': 'unsafe-none',
          'Cross-Origin-Embedder-Policy': 'unsafe-none'
        },
        fs: {
          allow: ['..']
        }
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        chunkSizeWarningLimit: 2500,
        rollupOptions: {
          output: {
            manualChunks: {
              // Firebase modules
              'firebase': ['firebase/app', 'firebase/firestore', 'firebase/auth', 'firebase/storage'],
              // Large UI components
              'document-generator': ['./pages/DocumentGenerator.tsx'],
              'ai-assistant': ['./pages/AIAssistant.tsx'],
              'settings': ['./pages/Settings.tsx'],
              // Utilities
              'utils': ['./services/authService.ts', './services/dbService.ts', './services/offlineManager.ts']
            }
          }
        }
      },
      optimizeDeps: {
        include: ['firebase', '@firebase/*']
      }
    };
});
