# Frontend performance + Lighthouse pass

## What & Why
The web app currently ships as a single ~2.1 MB JavaScript bundle plus a 222 KB CSS file on first load, with **zero route-level code splitting** — every one of the 35 pages is eagerly imported in `src/App.tsx`, and heavy libraries (`firebase`, `recharts`, `framer-motion`, `react-markdown`, `@google/genai`, all of `lucide-react`) are pulled into that single chunk. The production server has no gzip/brotli compression, no long-term cache headers on hashed assets, and `index.html` even sends `Cache-Control: no-store` for everything. The hero logo is a 232 KB PNG and the login screen pulls another ~190 KB of PNGs. The result is a slow first paint, poor LCP, and a Lighthouse Performance score well below where it should be for an app of this size.

The goal is a focused performance pass that measurably improves Core Web Vitals (LCP, CLS, INP) and the Lighthouse Performance score for the public-facing entry points (`/`, `/login`, `/dashboard`) **without** redesigning anything or swapping libraries.

## Done looks like
- Visiting `/dashboard` (signed-in) and `/` (Landing) downloads dramatically less JavaScript on first paint — the route's own chunk + only the vendor chunks it actually needs, instead of one monolithic bundle.
- Each page route is its own lazy chunk; navigating to a new page fetches that page's chunk on demand with a lightweight inline loader (no full-page splash flash).
- Heavy in-page features that aren't visible on first paint (chat markdown rendering, charts, the Live voice panel, the onboarding tour, the revisit scheduler modal) are not in the page's initial chunk.
- Vendor libraries are split into stable named chunks (`vendor-react`, `vendor-firebase`, `vendor-motion`, `vendor-recharts`, `vendor-markdown`, `vendor-icons`, `vendor-gemini`) so repeat visits hit the cache.
- The hero/splash logo and login background images are served as appropriately sized WebP (with PNG fallback only if needed), with `width`/`height` attributes set so they don't cause layout shift; non-critical images use `loading="lazy"` and `decoding="async"`.
- Production responses are gzip/brotli compressed and `dist/assets/*` files are served with `Cache-Control: public, max-age=31536000, immutable`. The blanket `no-store` meta tag is removed from `index.html`.
- Lighthouse (mobile, throttled) on `/` and `/dashboard` shows: Performance ≥ 90, LCP < 2.5 s, CLS < 0.1, TBT < 200 ms. Numbers captured before/after in the PR description.
- A bundle visualizer report is generated as part of the build and the main entry chunk is under ~250 KB gzipped.
- An automated test or build-time check fails the build if the main entry chunk grows beyond an agreed budget, so this doesn't silently regress.

## Out of scope
- Backend / Python performance, Firestore query indexing, Live WebSocket throughput.
- Replacing any library (no swapping `recharts`, `framer-motion`, `react-markdown`, `firebase`, etc.).
- Visual redesign or copy changes — only mechanical loading/asset/caching changes.
- Server-side rendering or moving off Vite SPA.
- PWA / service worker / offline support.
- Public landing page SEO content rewrite (only the technical perf side).

## Steps

1. **Route-level code splitting for every page.** Convert all 35 page imports in `src/App.tsx` from static `import X from './pages/...'` to `React.lazy(() => import(...))` (or React Router v7's route-level `lazy`). Wrap the authenticated `<Routes>` block and the unauthenticated routes in a `<Suspense>` with a small inline fallback that matches the existing surface (a thin progress strip or the existing splash dots) — must not flash the full-screen splash on every navigation. Keep `Landing`, `Login`, `SharePage`, and `NotFoundPage` lazy too. Add a tiny per-route ErrorBoundary fallback for chunk-load failures that triggers a single hard reload (the existing `index.html` chunk-error reloader can be removed or kept as a safety net — pick one).

2. **Vite build hardening + manual vendor chunks.** In `vite.config.ts`, set `build.target: 'es2022'`, `build.cssCodeSplit: true`, `build.sourcemap: false` for prod, and add `esbuild.drop: ['console', 'debugger']` for production builds only (keep `console.error`/`console.warn`). Add `build.rollupOptions.output.manualChunks` that groups: `react`+`react-dom`+`react-router-dom` → `vendor-react`; `firebase/*` → `vendor-firebase`; `motion`/`framer-motion` → `vendor-motion`; `recharts` + `d3-*` → `vendor-recharts`; `react-markdown` + `remark-gfm` → `vendor-markdown`; `lucide-react` → `vendor-icons`; `@google/genai` → `vendor-gemini`. Add `rollup-plugin-visualizer` (dev dep) emitting `dist/stats.html` after `vite build`, and add an npm script `analyze` that runs the build and opens it.

3. **Defer heavy in-page modules.** Lazy-import the following inside the pages that use them, behind `React.lazy` + `<Suspense fallback={null}>` (or a dynamic `import()` for non-component code), so they are not in the page's initial chunk:
   - `recharts` charts in `DashboardPage` and `AnalyticsPage` — render placeholders until the chart chunk loads.
   - `MarkdownMessage` (and through it `react-markdown` + `remark-gfm`) in `AgentPage` and anywhere else it's used.
   - `LiveChatPanel` (only mount when the user opens Live).
   - `OnboardingTour` (only mount when the tour is actually being shown).
   - `RevisitScheduler` modal (only mount when opened).
   - Heavy tab content inside `LibraryPage` / `LibraryInboxTab` (lazy-load the inbox tab panel and other tabs on first activation).
   - The agent SDK in `src/lib/gemini.ts` — defer until first agent call.

4. **Asset & font optimization.**
   - Convert `public/x247-logo.png` (232 KB) to an appropriately sized WebP (target ≤ 30 KB) and update references in `index.html` and the React tree. Generate a small @1x and @2x and use `srcset` if needed; set explicit `width`/`height` on every `<img>` to lock in the slot and prevent CLS.
   - Same treatment for `attached_assets/login-aura.png` and `attached_assets/login-keyhole.png` if they are still in use.
   - Preload only the hero logo in `index.html` (already done); add `decoding="async"` and `fetchpriority="high"` to the splash logo `<img>` and `loading="lazy"` + `decoding="async"` to all other in-page images.
   - If a custom font is loaded (Poppins is referenced inline), ensure it uses `font-display: swap` and is preconnected; otherwise drop it in favor of the system stack.
   - Add `<link rel="preconnect">` (and `dns-prefetch` fallback) in `index.html` for the Firebase auth + Firestore hosts the app actually contacts.

5. **Production server: compression, cache headers, drop no-cache meta.**
   - In `server.ts` add `compression` middleware (gzip + brotli when supported) for the production branch.
   - In the production branch, serve `dist/assets/*` (the hashed files) with `Cache-Control: public, max-age=31536000, immutable`, and serve `dist/index.html` with `Cache-Control: no-cache` (so the new asset hashes are picked up immediately on deploy).
   - Remove the `<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">` block from `index.html` — it forces every cached asset to be re-validated on every navigation and defeats the entire point of fingerprinted bundles. Keep cache busting via Vite's content hashes instead.
   - Add a small note in `replit.md` (or the existing deployment doc) explaining the new caching contract so it isn't reverted.

6. **Render-cost trims on the heaviest pages.** Profile and apply targeted memoization (`React.memo`, `useMemo`, `useCallback`) on the largest pages where wasted re-renders are visible: `LibraryInboxTab` (952 lines), `CapturePage` (2651 lines), `AgentPage` (1121 lines), `DashboardPage`, `WorkspacePage`. Don't refactor for its own sake — only touch the spots that show up as expensive in the React Profiler. Where a long list is rendered (Inbox, Vault, Notes), make sure list rows are memoized and stable-keyed; consider windowing only if a single list visibly drops frames (do not introduce a new dependency just for this).

7. **Web Vitals reporting + perf budget guardrail.**
   - Add a tiny inline web-vitals listener (≤ 1 KB, can be hand-rolled with `PerformanceObserver` to avoid a new dep) that logs LCP, CLS, INP, FCP, TTFB to the console in dev and POSTs them to a `/api/vitals` no-op endpoint in prod (gated behind a flag). This makes regressions visible.
   - Add a build-time check (a tiny Node script run after `vite build`) that fails the build if the main entry chunk exceeds an agreed gzipped byte budget (e.g. 250 KB) or any single non-vendor chunk exceeds another budget (e.g. 200 KB). Wire it into `package.json` and into the existing GitHub Actions workflow.
   - Capture before/after Lighthouse numbers (mobile, throttled) for `/` and `/dashboard` and paste them into the merge PR description.

## Relevant files
- `src/App.tsx:76-108`
- `src/App.tsx:889-935`
- `src/main.tsx`
- `index.html`
- `vite.config.ts`
- `server.ts`
- `package.json`
- `public/x247-logo.png`
- `attached_assets`
- `src/pages/DashboardPage.tsx`
- `src/pages/AnalyticsPage.tsx`
- `src/pages/AgentPage.tsx`
- `src/pages/CapturePage.tsx`
- `src/pages/LibraryPage.tsx`
- `src/pages/Landing.tsx`
- `src/pages/Login.tsx`
- `src/components/LibraryInboxTab.tsx`
- `src/components/LiveChatPanel.tsx`
- `src/components/OnboardingTour.tsx`
- `src/components/RevisitScheduler.tsx`
- `src/components/MarkdownMessage.tsx`
- `src/lib/firebase.ts`
- `src/lib/gemini.ts`
- `src/lib/liveClient.ts`
- `.github/workflows`
- `replit.md`
