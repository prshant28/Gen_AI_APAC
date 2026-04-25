import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const isGitHubPages = process.env.GITHUB_PAGES === 'true';
  return {
    base: isGitHubPages ? '/Gen_AI_APAC/' : '/',
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || process.env.GEMINI_API_KEY),
      'process.env.GOOGLE_API_KEY': JSON.stringify(env.GOOGLE_API_KEY || process.env.GOOGLE_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      port: 5000,
      host: '0.0.0.0',
      allowedHosts: true,
      watch: {
        ignored: ['**/.local/**', '**/node_modules/**', '**/.git/**'],
      },
      proxy: {
        '/api': 'http://127.0.0.1:8000',
        '/chat': 'http://127.0.0.1:8000',
        '/agent': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
          selfHandleResponse: false,
          configure: (proxy) => {
            proxy.on('proxyReq', (_proxyReq, req) => {
              if (req.url?.includes('/stream')) {
                _proxyReq.setHeader('Accept', 'text/event-stream');
              }
            });
          },
        },
        '/capture': 'http://127.0.0.1:8000',
        '/recall': 'http://127.0.0.1:8000',
        '/memories': 'http://127.0.0.1:8000',
        '/tasks': 'http://127.0.0.1:8000',
        '/schedule': 'http://127.0.0.1:8000',
        '/stats': 'http://127.0.0.1:8000',
        '/settings': 'http://127.0.0.1:8000',
        '/logs': 'http://127.0.0.1:8000',
        '/health': 'http://127.0.0.1:8000',
        '/agents': 'http://127.0.0.1:8000',
        '/workflows': 'http://127.0.0.1:8000',
      }
    },
  };
});
