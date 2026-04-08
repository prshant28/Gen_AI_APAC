import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GOOGLE_API_KEY': JSON.stringify(env.GOOGLE_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/api': 'http://127.0.0.1:8000',
        '/chat': 'http://127.0.0.1:8000',
        '/capture': 'http://127.0.0.1:8000',
        '/recall': 'http://127.0.0.1:8000',
        '/memories': 'http://127.0.0.1:8000',
        '/tasks': 'http://127.0.0.1:8000',
        '/schedule': 'http://127.0.0.1:8000',
        '/stats': 'http://127.0.0.1:8000',
        '/settings': 'http://127.0.0.1:8000',
        '/logs': 'http://127.0.0.1:8000',
        '/health': 'http://127.0.0.1:8000',
      }
    },
  };
});
