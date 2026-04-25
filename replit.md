# Recall X247 — AI-powered Second Brain v2.0

## Overview
An AI-powered productivity assistant built for Gen AI Academy APAC 2026 hackathon. Implements a **full multi-agent AI system** — a primary Orchestrator coordinates specialized sub-agents via OpenAI function calling with real-time SSE streaming. Captures knowledge from YouTube, web, PDFs, and notes; allows semantic recall; manages tasks; generates flashcards; schedules study sessions; and delivers AI daily briefings.

**AI Provider:** Google Gemini 2.0 Flash (GOOGLE_API_KEY via OpenAI-compat layer). Auto-falls back to OpenRouter (GEN_APAC_API_KEY) on rate-limit. UI branding: "Powered by Google Gemini 2.0".

## Global Features (April 2026 — Hackathon Upgrade)
- **Global Toast System** (`App.tsx`) — Event-driven toasts via `window.dispatchEvent(new CustomEvent('recall-toast', { detail: { msg, type } }))`. Exported `showToast(msg, type)` helper usable from any page. Types: `success` (green), `error` (red), `info` (indigo). Animated slide-in/out, stacked, auto-dismiss at 3.8s.
- **Floating Quick-Capture FAB** (`App.tsx`) — Purple `+` button fixed at bottom-right. Expands to: Capture URL (→ /capture), Quick Note (inline modal that posts to `/capture` and fires a toast), Agent Hub (→ /agent). Collapses with 45° rotation animation. Shown only when authenticated.
- **FlashcardsPage** — Complete dark-theme redesign with spaced repetition. Grid of memory cards, study session modal with Know/Don't Know buttons, score tracking persisted to `localStorage`, session results screen with retry option for missed cards. Stats bar showing total decks, studied count, avg score.
- **VaultPage** — Converted from Tailwind light-theme (`bg-white`, `text-slate-*`) to full dark CSS vars. Added sort control (newest/oldest/A-Z), real-time client-side search with clear button, domain filter, inline flashcard generator with spaced repetition. Dark glassmorphism modals.
- **TasksPage** — Converted from Tailwind light-theme to dark CSS vars. Inline new-task form (no modal), overdue detection, priority filter chips, summary stat cards (pending/due today/overdue/completed), animated task list with colored left border per priority.
- **GraphPage** — Added mouse hover tooltips (floating node info card), click-to-select interaction with detailed right-panel info, highlighted edges on hover, cursor changes. Fixed all hardcoded colors (#f1f5f9, #4b5563) → CSS vars.
- **AnalyticsPage** — Fixed all hardcoded colors (#e2e8f0, #4b5563, #6b7280, #9ca3af) → CSS vars. Upgraded Captures chart from BarChart to AreaChart with gradient fill. Added icon to each KPI card. Added avg tags/memory metric.
- **CapturePage** — Migrated from local toast state to global `showToast()` system.

## UI/UX
- **Light/Dark theme toggle** — Moon/Sun button in header, persisted in localStorage, applies `data-theme="dark"` to `<html>` element. CSS custom properties drive all theme colors.
- **Responsive** — Stat cards 2-col on mobile → 4-col on desktop; Agent Hub hides left panel on mobile; header collapses search + Capture text on small screens; `responsive-content` class handles padding.
- **Design system** — CSS custom properties: `--bg`, `--surface`, `--surface-2`, `--surface-3`, `--border`, `--border-2`, `--text-1`, `--text-2`, `--text-3`, `--primary`, `--primary-bg`, `--primary-dark`, `--primary-border`, `--shadow-sm/md/lg`, `--inner-glow`.
- **Premium styling** — Glassmorphism cards, gradient button shimmer, dark mesh background, glow effects, Poppins font.
- **Theme visibility fixes** (April 2026):
  - Fixed all dark-mode-only views (WorkspaceView, MemoryTimeline, Analytics, KnowledgeGraph) — replaced hardcoded `#f1f5f9`/`#e2e8f0`/`#6b7280` colors with CSS vars
  - Fixed Dashboard card inner glow (`rgba(255,255,255,0.9)`) — now theme-aware via `isDark` prop
  - Fixed loading screen hardcoded `#f5f6fa` background → `var(--bg)`
  - Fixed sidebar/main wrapper inner glows — theme-aware
  - Fixed AgentHub agent name `#1e293b` → `var(--text-1)`, idle dot → `var(--border-2)`
  - Fixed Calendar/Study Plan modals — covered by comprehensive Tailwind class overrides in CSS
  - Upgraded `text-slate-400` dark override to proper visible value
  - **Login page full light-theme** (pages.css): `.lg-box` white glass panel, `.lg-heading` dark→indigo gradient, `.lg-field` light bg + visible border, `.lg-divider` dark lines, `.lg-label`/`.lg-eyebrow` visible gray, `.lg-alert-*` light-on-brand colors, `.lg-trust-*` muted gray, `.lg-google-btn` outlined, focus ring indigo, autofill text visible
  - **Landing page light-theme additions**: `.lx-feed-item` pills dark borders, `.lx-bento-card` white glass, `.lx-tmarquee-card` white glass, `.lx-terminal-box` light bg, `.lx-final-cta` light gradient, `.lx-hero-word` vivid indigo gradient, `.lx-final-grad` gradient text
- **CI/CD** — `.github/workflows/deploy.yml` auto-deploys to Google Cloud Run on push to `main`.

## Multi-Agent Architecture

```
User Request
     ↓
Orchestrator (Primary Agent) — app/coordinator.py
     ↓ OpenAI function calling → dispatches tools
     ├── CaptureAgent     → capture_knowledge (YouTube, web, PDF, note)
     ├── RecallAgent      → recall_knowledge / list_memories
     ├── TaskAgent        → create_task / list_tasks
     ├── CalendarAgent    → schedule_event / list_schedule
     ├── BriefingAgent    → get_daily_briefing / generate_study_plan
     └── AnalyticsAgent   → get_knowledge_stats
     ↓ SSE streaming (real-time events)
     ↓ Workflow tracked in app/workflow_engine.py
Frontend Agent Hub (/agent) — real-time chat UI
```

### Workflow Engine (`app/workflow_engine.py`)
- Each user request spawns a `Workflow` with named `WorkflowSteps`
- Steps track: agent name, tool used, input/output, status, duration_ms
- In-memory store with 50-workflow LRU eviction
- `AGENT_REGISTRY` defines all 7 agents with roles, colors, and tools

### Coordinator (`app/coordinator.py`)
- 10 MCP-style tools registered (function calling schema)
- `run_coordinator()` — sync version for `/chat`
- `run_coordinator_stream()` — async generator for SSE streaming at `/agent/chat/stream`
- SSE event types: `workflow_start`, `thinking`, `agent_start`, `agent_complete`, `agent_error`, `workflow_complete`, `error`, `done`

## Backend (Python / FastAPI) — `main.py`

| Endpoint | Method | Description |
|---|---|---|
| `/chat` | POST | Coordinator chat (sync) |
| `/agent/chat/stream` | POST | SSE streaming chat |
| `/workflows` | GET | Recent workflow history |
| `/workflows/{id}` | GET | Single workflow with step trace |
| `/agents` | GET | Agent registry |
| `/capture` | POST | Capture knowledge |
| `/capture/upload` | POST | Upload PDF |
| `/memories` | GET/POST/DELETE | Knowledge vault CRUD |
| `/recall` | POST | Semantic search |
| `/tasks` | GET/POST | Task management |
| `/schedule` | GET/POST | Calendar events |
| `/briefing` | GET | AI daily briefing |
| `/stats` | GET | System statistics |

### Key Files
- `app/coordinator.py` — Multi-agent orchestrator with SSE streaming
- `app/workflow_engine.py` — Workflow tracking + AGENT_REGISTRY
- `app/capture_agent.py` — YouTube transcript, web scrape, PDF parse, AI analysis
- `app/recall_agent.py` — 3-tier semantic recall (tag → domain → full text)
- `app/task_agent.py` — Task CRUD operations
- `app/calendar_agent.py` — Event scheduling
- `app/db.py` — Firestore + in-memory mock fallback
- `app/config.py` — GEN_APAC_API_KEY → OpenRouter config

## Frontend (React + TypeScript + Vite)

### Views (13 total)
- **Dashboard** — Stats, charts, recent memories, daily briefing
- **Agent Hub** (`/agent`) — Real-time multi-agent chat with SSE streaming, agent registry panel, workflow history
- **Capture** — URL/text/PDF capture with YouTube embed preview
- **Vault** — Knowledge grid with YouTube thumbnails, detail modal with YouTube embed
- **Neural Recall** — Semantic search with AI answers
- **Tasks** — Task management with priority/due dates
- **Flashcards** — AI-generated study cards
- **Calendar** — Event scheduling
- **Timeline** — Chronological memory view
- **Mind Graph** — Knowledge graph visualization
- **Analytics** — Learning velocity, domain radar, streak tracking
- **Workspace** — Kanban project board with linked memories
- **Settings** — API configuration and testing

### Key Architecture (refactored April 2026)
- `src/App.tsx` — Routing shell only (~280 lines). `BrowserRouter` + `Routes` + auth guard. Sidebar uses `useLocation`/`useNavigate` from react-router-dom.
- `src/lib/types.ts` — Shared TypeScript types: `Memory`, `Flashcard`, `AgentMsg`, `AgentStepData`, `View`
- `src/lib/utils.tsx` — Shared utilities: `cn()`, `getYouTubeId()`, `YouTubeEmbed`, `YouTubeThumbnail`
- `src/pages/` — One file per route (13 page components)
- `src/index.css` — Dark neural theme, responsive breakpoints, animations
- **Routing:** react-router-dom v7, all routes URL-based (`/dashboard`, `/agent`, `/capture`, etc.)
- **Auth guard:** Unauthenticated users see Landing (`/`) or Login (`/login`). Authenticated users get AppShell with Sidebar + nested Routes.
- **Design System:** `#05050f` bg, Space Grotesk, cyan/purple glassmorphism
- **YouTube:** `getYouTubeId()`, `YouTubeEmbed`, `YouTubeThumbnail` in `src/lib/utils.tsx`
- **Responsive:** `.responsive-content` class, mobile hamburger menu, sm: breakpoints

### Page → Route Map
| Page | Route | File |
|------|-------|------|
| Dashboard | /dashboard | src/pages/DashboardPage.tsx |
| Agent Hub | /agent | src/pages/AgentPage.tsx |
| Capture | /capture | src/pages/CapturePage.tsx |
| Vault | /vault | src/pages/VaultPage.tsx |
| Neural Recall | /recall | src/pages/RecallPage.tsx |
| Tasks | /tasks | src/pages/TasksPage.tsx |
| Flashcards | /flashcards | src/pages/FlashcardsPage.tsx |
| Calendar | /calendar | src/pages/CalendarPage.tsx |
| Timeline | /timeline | src/pages/TimelinePage.tsx |
| Mind Graph | /graph | src/pages/GraphPage.tsx |
| Analytics | /analytics | src/pages/AnalyticsPage.tsx |
| Workspace | /workspace | src/pages/WorkspacePage.tsx |
| Settings | /settings | src/pages/SettingsPage.tsx |

## Development Setup

```bash
npm run dev  # Starts both FastAPI (port 8000) and Vite (port 5000)
```

Vite proxies `/api/*`, `/chat`, `/agent/*`, `/workflows`, etc. to FastAPI port 8000.

## Required Secrets
- `GEN_APAC_API_KEY` — OpenRouter API key (maps to OPENAI_API_KEY internally)
- Optional: `GEMINI_API_KEY`, `GOOGLE_API_KEY`, `GOOGLE_CSE_CX`
- Optional: Firebase/Firestore credentials (`service_account.json`)

## Database
- Uses **in-memory MockFirestoreClient** (data resets on restart) when no Firestore credentials
- Collections: `memories`, `tasks`, `events`, `interaction_logs`, `flashcards`
- Full Firestore async client available when `GOOGLE_APPLICATION_CREDENTIALS` is set
