# Recall X247 — AI-powered Second Brain v2.0

## Overview
Recall X247 is an AI-powered productivity assistant designed to function as a "second brain." It leverages a multi-agent AI system, where a primary Orchestrator coordinates specialized sub-agents using OpenAI function calling and real-time Server-Sent Events (SSE) streaming. The system is capable of capturing knowledge from various sources (YouTube, web, PDFs, notes), performing semantic recall, managing tasks, generating flashcards, scheduling study sessions, and delivering AI-generated daily briefings. The project aims to provide comprehensive knowledge management and personal productivity enhancement, powered by advanced AI.

## User Preferences
I prefer detailed explanations.
I want iterative development.
Ask before making major changes.

## System Architecture
The application employs a multi-agent AI architecture with a central orchestrator.

### UI/UX Decisions
The design system is based on dark glassmorphism with a neural theme, using CSS custom properties for comprehensive theming. It includes responsive layouts for various screen sizes, a light/dark theme toggle, and premium styling elements like gradient button shimmers and glow effects. Key UI components like Dashboard cards, Agent Hub, and various page layouts have been refactored to ensure theme consistency and responsiveness.

### Technical Implementations
- **Frontend:** Built with React, TypeScript, and Vite. It utilizes `react-router-dom` for client-side routing, and `useLocation`/`useNavigate` for navigation. Global features like a toast system and a floating quick-capture button enhance user interaction.
- **Backend:** Developed using Python with FastAPI. It exposes various API endpoints for AI coordination, knowledge capture, data management (memories, tasks, schedules), and analytics.
- **Multi-Agent System:** An Orchestrator (`app/coordinator.py`) dispatches tasks to specialized sub-agents (CaptureAgent, RecallAgent, TaskAgent, CalendarAgent, BriefingAgent, AnalyticsAgent) via OpenAI function calling. Workflows are tracked by a `WorkflowEngine` (`app/workflow_engine.py`) which maintains a registry of agents and their tools.
- **Real-time Communication:** Utilizes Server-Sent Events (SSE) for real-time streaming of AI responses and workflow updates to the frontend Agent Hub.
- **Knowledge Capture:** Supports capturing content from YouTube (transcripts), web pages (scraping), and PDFs (parsing), followed by AI analysis.
- **Semantic Recall:** Implements a 3-tier semantic search mechanism (tag, domain, full text).
- **Spaced Repetition:** Integrated into the Flashcards feature for optimized learning.

### Feature Specifications
- **Core AI Functionality:** Multi-agent orchestration, natural language processing for task execution and knowledge retrieval.
- **Knowledge Management:** Capture, semantic search, vault for stored memories, and a mind graph visualization.
- **Productivity Tools:** Task management, calendar scheduling, flashcards with spaced repetition, study plan generation, **Notes (markdown editor with split preview), Bookmarks (read-later with status filters), Habits (daily tracker with streaks + 30-day heatmap)**.
- **Voice Capture:** `/capture/voice` accepts audio uploads, transcribes via OpenAI Whisper, returns text only — frontend then submits transcript via standard `/capture` note flow.
- **Shareable Memories:** `/memories/{id}/share` issues a public token; `/share/{token}` is the only auth-free SPA route, rendering a public read-only memory view (theme-tokened, light/dark safe).
- **Auto-tagging:** `/memories/{id}/auto-tag` suggests AI tags for an existing memory and merges them.
- **Briefing cache:** `/briefing` cached 5 min in-memory to avoid 429 spam from repeated dashboard loads.
- **Analytics:** Tracking learning velocity, domain expertise, and streak.
- **User Management:** Profile management, security settings (2FA, API keys), and data export options.
- **Integrations:** A comprehensive catalog of third-party integrations across various categories (Google services, productivity apps, communication platforms, developer tools, social media, storage, media, AI/Automation).

## External Dependencies
- **AI Providers:** Google Gemini 2.0 Flash (via `GOOGLE_API_KEY`), with fallback to OpenRouter (via `GEN_APAC_API_KEY`) for rate-limit handling.
- **Database:** Primarily uses an in-memory MockFirestoreClient for development, with full support for Google Cloud Firestore when `GOOGLE_APPLICATION_CREDENTIALS` are configured.
- **Deployment:** Google Cloud Run for continuous deployment via GitHub Actions.
- **APIs:** OpenAI-compatible API layer for agent communication.
- **Third-party Services (Integrated):**
    - Google (Gmail, Calendar, Drive, Docs, Photos, Keep, YouTube)
    - Productivity (Notion, Obsidian, Evernote, Todoist, Trello)
    - Communication (Slack, Discord, Telegram, WhatsApp)
    - Developer (GitHub, GitLab, Linear, Jira)
    - Social (X, LinkedIn, Reddit)
    - Storage (Dropbox, OneDrive, S3)
    - Media (Spotify, Pocket, Instapaper)
    - AI/Automation (Chrome extension, Zapier, Make, OpenAI, Webhooks)

## Recent Changes (Apr 2026)
- Agent Hub redesign: collapsible Mission Control bar, focus-mode sidebar, header & bottom New chat (with stream-abort safety), markdown rendering via `react-markdown`, action chips for numbered next-step prompts (`Which one should I run?` only), per-message export menu (`MessageToolbar` rendered through React portal so chat overflow can't clip it; supports Copy / MD / HTML / Print-PDF / JSON), action result cards (`ActionResultCards` for Capture/Task/Calendar with stable step_id dedupe).
- New pages: NotesPage (split-pane markdown editor + autosave), BookmarksPage (filters by domain/tag/status), HabitsPage (7-day grid + 30-day overview), SharePage (public read-only `/share/:token`).
- Backend: `/notes`, `/bookmarks`, `/habits` CRUD via `app/extras_agent.py`; `/memories/{id}/share` + `/share/{token}`; `/capture/voice` with Whisper-style transcription; `/memories/{id}/auto-tag`; 5-minute in-memory cache on `/briefing` to absorb dashboard refetches.
- CapturePage now fires `/memories/{id}/auto-tag` after every save and surfaces newly suggested tags as a toast.
- DashboardPage adds AI Briefing widget, today's habit checklist, and recent notes panel.
- `tsconfig.json` excludes `attached_assets/`, `node_modules`, `dist`, `build`.
- Agent Hub layout reorganized (chat-first): hero compacted to a single row (38px icon + inline "7 ONLINE" pill, no verbose subtitle), body grid swapped so chat is the primary left/top column and the registry/history/inspector is the right/bottom sidebar, JSX order matches visual order (chat composer reachable before registry tabs in keyboard tab traversal), `isolation: isolate` on `.agent-main` and `.agent-sidebar` prevents the overlap that appeared at narrow canvas-iframe widths (~927px).
- Flashcards "Studied" counter fix: previously only saved on the final results screen, so partial sessions didn't count. Now `StudyModal` tracks a `marked` counter and saves the session whenever the user marked at least one card (closing via X / backdrop / Done all persist progress); cancelled sessions with zero interaction still don't increment. Score is now computed as `known/marked` so partial sessions get a fair percentage.
- Capture pipeline + duplicate guard: the Live Agent Pipeline card is now lifted out of the form-vs-preview conditional so it stays visible above BOTH the capture form (during processing) AND the result preview (after success), with a "COMPLETE" badge once all 7 agents finish. Backend `save_memory` and `capture()` now query Firestore for existing `userId + source_url` matches: `/capture` preview attaches `duplicate_of` (existing id+title+created_at), and `/memories` POST returns `{duplicate: true, existing: ...}` instead of silently writing a second copy. Frontend shows a yellow warning banner on the preview ("Bhai, ye URL already Vault mein hai" with an "Open existing" button) and the save toast switches to "Already in your Vault — opened existing entry"; auto-tag fire-and-forget is skipped on duplicates. Concurrency safety: writes use a deterministic Firestore document ID `u_<sha1(userId|normalized_url)>` so two concurrent saves of the same URL collide on the same doc (atomic dedup); URL normalization lowercases scheme/host, strips default ports, drops trailing slash, removes `utm_*` / `fbclid` / `gclid` / `ref` / `mc_*` tracker params, and drops the fragment.
- RecallPage scaling fix for narrow/short embeds (~927x543 canvas iframe): empty state was overflowing — 72px hero + verbose paragraph + 6 large suggestion cards exceeded the available chat-card height, forcing internal scroll that clipped the icon AND the suggestions. Compacted inline (hero 72→56, body gap 28→14, suggestion buttons single-line ellipsis with `flex: 1; min-width: 0`), tightened header/messages/input padding, and added `@media(max-height: 620px)` (further shrinks hero to 44px, tighter gaps) and `(max-height: 520px)` (hero 36px, hides the description) breakpoints in `src/index.css`. Added `min-height: 0` on the chat-area flex column + messages scroll region to harden the flex-shrink chain so content can collapse cleanly. Empty-state auto-scroll bug fixed: `scrollIntoView` no longer fires when `messages.length === 0`, so the hero/suggestions stay anchored at the top instead of being scrolled away.
- RecallPage assistant messages now render markdown (via `MarkdownMessage` + `react-markdown` + `remark-gfm`) so headings, bold, lists, blockquotes, and links render properly instead of showing raw `**`, `#`, `[text](url)` characters. User messages stay as plain text to preserve their literal input. Page shell expanded from `calc(100vh - 8rem)` to `calc(100vh - 5rem)` and top padding dropped 14→10 so the chat card uses ~48px more vertical space.
- RecallPage source citations are now rich preview cards for YouTube sources: each YouTube source renders a 16:9 thumbnail (with mqdefault → hqdefault fallback), play-button overlay, YOUTUBE badge, title (2-line clamp) and short summary (2-line clamp); the whole card is a clickable link that opens the video in a new tab. Non-YouTube sources keep the small colored pills below the cards. Backend `recall_agent.synthesize_answer` source payload now includes `source_type`, `domain`, and a 160-char `summary` so the frontend can render rich cards without an extra API round-trip.