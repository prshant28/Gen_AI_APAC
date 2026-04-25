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
          bypass: (req) => {
            // /agent (exact) is the SPA page — let it through on GET
            if (req.method === 'GET' && req.url === '/agent') return req.url;
            return null;
          },
          configure: (proxy) => {
            proxy.on('proxyReq', (_proxyReq, req) => {
              if (req.url?.includes('/stream')) {
                _proxyReq.setHeader('Accept', 'text/event-stream');
              }
            });
          },
        },
        // Routes that are BOTH SPA pages (GET) and API endpoints (POST/PUT/DELETE)
        '/recall': { target: 'http://127.0.0.1:8000', bypass: (req) => req.method === 'GET' ? req.url : null },
        '/capture': { target: 'http://127.0.0.1:8000', bypass: (req) => req.method === 'GET' ? req.url : null },
        '/tasks': { target: 'http://127.0.0.1:8000', bypass: (req) => req.method === 'GET' ? req.url : null },
        '/settings': { target: 'http://127.0.0.1:8000', bypass: (req) => req.method === 'GET' ? req.url : null },
        '/flashcards': { target: 'http://127.0.0.1:8000', bypass: (req) => req.method === 'GET' ? req.url : null },
        // Pure API endpoints (no SPA page conflict)
        '/memories': 'http://127.0.0.1:8000',
        '/schedule': 'http://127.0.0.1:8000',
        '/stats': 'http://127.0.0.1:8000',
        '/logs': 'http://127.0.0.1:8000',
        '/health': 'http://127.0.0.1:8000',
        '/agents': 'http://127.0.0.1:8000',
        '/workflows': 'http://127.0.0.1:8000',
        '/export': 'http://127.0.0.1:8000',
        '/briefing': 'http://127.0.0.1:8000',
        '/study-plan': 'http://127.0.0.1:8000',
        '/test-ai': 'http://127.0.0.1:8000',
      }
    },
  };
});
