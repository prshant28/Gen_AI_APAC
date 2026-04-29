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
        // WebSocket bridge for the Live (Gemini Live) feature. Vite needs
        // `ws: true` to upgrade the connection — otherwise the browser sees
        // a plain HTTP request that hangs.
        '/ws': { target: 'ws://127.0.0.1:8000', ws: true, changeOrigin: true },
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
        // Routes that are BOTH SPA pages (GET nav) and API endpoints (fetch/POST/DELETE)
        // Only bypass to SPA when the browser is doing real page navigation (Accept: text/html).
        // JavaScript fetch() calls send Accept: */* and must be proxied to the backend.
        '/recall': { target: 'http://127.0.0.1:8000', bypass: (req) => (req.method === 'GET' && (req.headers['accept'] || '').includes('text/html')) ? req.url : null },
        '/capture': { target: 'http://127.0.0.1:8000', bypass: (req) => (req.method === 'GET' && (req.headers['accept'] || '').includes('text/html')) ? req.url : null },
        '/tasks': { target: 'http://127.0.0.1:8000', bypass: (req) => (req.method === 'GET' && (req.headers['accept'] || '').includes('text/html')) ? req.url : null },
        '/settings': { target: 'http://127.0.0.1:8000', bypass: (req) => (req.method === 'GET' && (req.headers['accept'] || '').includes('text/html')) ? req.url : null },
        '/flashcards': { target: 'http://127.0.0.1:8000', bypass: (req) => (req.method === 'GET' && (req.headers['accept'] || '').includes('text/html')) ? req.url : null },
        // SPA + API conflict pages — bypass to SPA only on real page nav
        '/revisits': { target: 'http://127.0.0.1:8000', bypass: (req) => (req.method === 'GET' && req.url === '/revisits' && (req.headers['accept'] || '').includes('text/html')) ? req.url : null },
        '/notes': { target: 'http://127.0.0.1:8000', bypass: (req) => (req.method === 'GET' && (req.headers['accept'] || '').includes('text/html')) ? req.url : null },
        '/bookmarks': { target: 'http://127.0.0.1:8000', bypass: (req) => (req.method === 'GET' && (req.headers['accept'] || '').includes('text/html')) ? req.url : null },
        '/habits': { target: 'http://127.0.0.1:8000', bypass: (req) => (req.method === 'GET' && (req.headers['accept'] || '').includes('text/html')) ? req.url : null },
        '/share': { target: 'http://127.0.0.1:8000', bypass: (req) => (req.method === 'GET' && (req.headers['accept'] || '').includes('text/html')) ? req.url : null },
        // Pure API endpoints (no SPA page conflict)
        '/memories': 'http://127.0.0.1:8000',
        '/schedule': 'http://127.0.0.1:8000',
        '/stats': 'http://127.0.0.1:8000',
        '/logs': 'http://127.0.0.1:8000',
        '/health': 'http://127.0.0.1:8000',
        '/agents': 'http://127.0.0.1:8000',
        '/workflows': 'http://127.0.0.1:8000',
        '/export': 'http://127.0.0.1:8000',
        // /briefing is BOTH the SPA Daily Briefing page (GET nav with text/html
        // Accept) and an API root with /briefing/list, /briefing/timeline,
        // /briefing/recap etc. Bypass to the SPA only on real page navigation
        // so deep-link / refresh on /briefing renders the React app.
        '/briefing': { target: 'http://127.0.0.1:8000', bypass: (req) => (req.method === 'GET' && req.url === '/briefing' && (req.headers['accept'] || '').includes('text/html')) ? req.url : null },
        // /dashboard is BOTH an SPA page (GET nav) and an API root (/dashboard/advanced).
        // Bypass to SPA only on real page navigation (Accept: text/html on the bare path).
        '/dashboard': { target: 'http://127.0.0.1:8000', bypass: (req) => (req.method === 'GET' && req.url === '/dashboard' && (req.headers['accept'] || '').includes('text/html')) ? req.url : null },
        '/study-plan': 'http://127.0.0.1:8000',
        '/plan': { target: 'http://127.0.0.1:8000', bypass: (req) => (req.method === 'GET' && (req.headers['accept'] || '').includes('text/html')) ? req.url : null },
        '/workspace': { target: 'http://127.0.0.1:8000', bypass: (req) => (req.method === 'GET' && (req.headers['accept'] || '').includes('text/html')) ? req.url : null },
        '/discover': { target: 'http://127.0.0.1:8000', bypass: (req) => (req.method === 'GET' && (req.headers['accept'] || '').includes('text/html')) ? req.url : null },
        '/calendar.ics': 'http://127.0.0.1:8000',
        '/test-ai': 'http://127.0.0.1:8000',
        '/config': 'http://127.0.0.1:8000',
      }
    },
  };
});
