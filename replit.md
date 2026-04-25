# Recall X247 — AI-powered Second Brain v2.0

## Overview
An AI-powered productivity assistant built for Gen AI Academy APAC 2026 hackathon. Implements a **full multi-agent AI system** — a primary Orchestrator coordinates specialized sub-agents via OpenAI function calling with real-time SSE streaming. Captures knowledge from YouTube, web, PDFs, and notes; allows semantic recall; manages tasks; generates flashcards; schedules study sessions; and delivers AI daily briefings.

**AI Provider:** OpenRouter (GEN_APAC_API_KEY) → GPT-4o-mini. Branding shown as "Neural AI".

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

### Key Architecture
- `src/App.tsx` — ~3200 lines, all views, SSE streaming, YouTube helpers
- `src/index.css` — Dark neural theme, responsive breakpoints, animations
- **Design System:** `#05050f` bg, Space Grotesk, cyan/purple glassmorphism
- **Animations:** NeuralBackground canvas particles, ambient blobs, agent status pulsing
- **YouTube:** `getYouTubeId()`, `YouTubeEmbed`, `YouTubeThumbnail` components
- **Responsive:** `.responsive-content` class, mobile hamburger menu, sm: breakpoints

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
