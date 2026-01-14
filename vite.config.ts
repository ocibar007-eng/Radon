import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carrega variáveis de ambiente baseadas no modo (development/production)
  // O terceiro argumento '' garante que carregue TODAS as variáveis, não só as com prefixo VITE_
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      // Polyfills para dcmjs (biblioteca DICOM usa APIs Node.js)
      nodePolyfills({
        include: ['buffer', 'stream', 'util', 'events'],
        globals: {
          Buffer: true,
          global: true,
          process: true,
        },
      }),
    ],
    resolve: {
      // BLINDAGEM: Alias explícito para funcionar em qualquer ambiente (local, container, CI)
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    define: {
      // Polyfill para process.env no navegador
      // Combina variáveis do .env local (loadEnv) com process.env (Vercel CI)
      // Prioridade: process.env (Vercel) > loadEnv (.env local)
      'process.env': {
        API_KEY: JSON.stringify(process.env.API_KEY || env.API_KEY || process.env.GEMINI_API_KEY || env.GEMINI_API_KEY),
        FIREBASE_API_KEY: JSON.stringify(process.env.FIREBASE_API_KEY || env.FIREBASE_API_KEY),
        FIREBASE_AUTH_DOMAIN: JSON.stringify(process.env.FIREBASE_AUTH_DOMAIN || env.FIREBASE_AUTH_DOMAIN),
        FIREBASE_PROJECT_ID: JSON.stringify(process.env.FIREBASE_PROJECT_ID || env.FIREBASE_PROJECT_ID),
        FIREBASE_STORAGE_BUCKET: JSON.stringify(process.env.FIREBASE_STORAGE_BUCKET || env.FIREBASE_STORAGE_BUCKET),
        FIREBASE_MESSAGING_SENDER_ID: JSON.stringify(process.env.FIREBASE_MESSAGING_SENDER_ID || env.FIREBASE_MESSAGING_SENDER_ID),
        FIREBASE_APP_ID: JSON.stringify(process.env.FIREBASE_APP_ID || env.FIREBASE_APP_ID)
      }
    },
    server: {
      port: 3000,
      open: true
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
      target: 'esnext'
    },
    esbuild: {
      target: 'esnext'
    },
    optimizeDeps: {
      esbuildOptions: {
        target: 'esnext'
      }
    }
  };
});