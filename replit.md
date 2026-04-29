# Recall X247 — AI-powered Second Brain v2.0

## Overview
Recall X247 is an AI-powered productivity assistant designed as a "second brain." It uses a multi-agent AI system to capture knowledge from diverse sources, perform semantic recall, manage tasks, generate flashcards, schedule study sessions, and deliver AI-generated daily briefings. The project aims to provide comprehensive knowledge management and personal productivity enhancement through advanced AI. Its business vision is to become the leading AI-powered productivity platform, helping users to manage information overload and optimize their personal and professional growth.

## User Preferences
I prefer detailed explanations.
I want iterative development.
Ask before making major changes.

## System Architecture
The application employs a multi-agent AI architecture with a central orchestrator.

### UI/UX Decisions
The design system features dark glassmorphism with a neural theme, utilizing CSS custom properties for extensive theming. It supports responsive layouts, a light/dark theme toggle, and premium styling elements.

**Sidebar (redesigned 2026-04-28 for first-time clarity):**
- A pinned "ESSENTIALS" block at the top with 4 prominent items (Dashboard, Capture, Vault, Recall AI), each rendered with a colored icon disc and a one-line description so newcomers immediately see the four core actions.
- Three collapsible groups beneath: WORKSPACE (open by default — Projects, Tasks, Calendar, Notes, Bookmarks), LEARN & GROW (collapsed — Flashcards, Habits, Revisits, Study Plan, Discover), INSIGHTS (collapsed — Mind Graph, Project Insights, Folders, Logs, Health, Status). Open/closed state is persisted in localStorage (`recall-x247-nav-open-v1`); the group containing the active route auto-expands.
- A small footer row above the user profile with three icon+label buttons (Integrations, Pitch Deck, Settings) keeping infrequent destinations one click away without cluttering the main nav.

**First-time onboarding:**
- The Onboarding Tour's final step (4/4) shows three actionable "PICK ONE TO START" cards (Capture / Try Recall AI / Explore Dashboard) that close the tour and navigate, replacing the previous generic chips. Tour open delay was shortened to 350ms for a snappier feel.
- A dismissible "GET FAMILIAR" checklist on the dashboard guides newcomers through 4 setup steps (Capture, Save a quick note, Ask Recall AI, Build a learning habit). Each item auto-checks based on live data; clicking a card navigates to the relevant page. The panel can be hidden via × button (persisted in `recall-x247-checklist-dismissed`) and self-removes once all items are complete.

### Technical Implementations
- **Frontend:** Built with React, TypeScript, and Vite.
- **Backend:** Developed with Python and FastAPI.
- **Multi-Agent System:** An Orchestrator dispatches tasks to specialized sub-agents (CaptureAgent, RecallAgent, TaskAgent, CalendarAgent, BriefingAgent, AnalyticsAgent) via OpenAI function calling. A `WorkflowEngine` manages agents and their tools.
- **Plan Generator (4-agent pipeline):** Creates structured plans for various goals (study, project, research, etc.), returning intent, focus areas, categorized folders, and a day-by-day plan.
- **Workspace Agent:** Manages backend-persisted projects with items, tasks, and folders, including an AI-driven organization feature for memories.
- **Discover Multi-Agent UX:** Enhances content discovery by visualizing the process of YouTube search, article fetching, and ranking, allowing saving content to the workspace.
- **Project Insights and Task Breakdown:** The `insight_agent` detects important work in a project and suggests actions, while `plan_agent` breaks down tasks into micro-plans.
- **Workspace Recall:** Searches items, tasks, memories, and projects to synthesize cited answers.
- **Anti-clutter Dedup:** `capture_agent` adds content-hash-based deduplication for notes.
- **Revisit Reminders:** A Firestore-backed CRUD system with frequency math for recurring reminders. Includes a Smart AI planner to automatically determine cadence and extract details from text.
- **Advanced Dashboard:** An aggregator providing a time-aware greeting, knowledge pulse (activity deltas), activity heatmap, capture streaks, top tags, today's focus, 7-day forecast, and a "pick-up" feature for recent activity.
- **Folder Timeline:** Derives a per-folder activity feed from existing collections, showing capture, insight, task, memory, and plan events with bidirectional linking.
- **Reusable Agent Visualization:** A component to render the state and timings of agent pipelines.
- **Real-time Communication:** Server-Sent Events (SSE) for streaming AI responses and workflow updates.
- **Knowledge Capture:** Supports AI-analyzing content from YouTube, web pages, and PDFs.
- **Semantic Recall:** Features a 3-tier semantic search.
- **Spaced Repetition:** Integrated into Flashcards.
- **Voice Capture:** Transcribes audio uploads for processing as notes.
- **Shareable Memories:** Generates public, read-only views of memories.
- **Auto-tagging:** AI suggests and merges tags for memories.
- **SPA deep-link hardening (2026-04-29):** Two safeguards added so judges/visitors deep-linking to a route on the deployed Cloud Run instance NEVER see raw `{"detail":"Not Found"}` JSON. (1) An `spa_navigation_guard` HTTP middleware in `main.py` runs before routing — for browser navigations (`Sec-Fetch-Dest: document` or `Accept: text/html`) to known SPA route names that *collide* with backend GET endpoints (`/tasks`, `/notes`, `/bookmarks`, `/habits`, `/revisits`, `/settings`, etc.), it short-circuits and serves `dist/index.html` so React Router can take over; XHR/fetch from inside the SPA still hits the JSON API normally because they send `Accept: application/json`. (2) The catch-all `/{full_path:path}` route is now ALWAYS registered (no longer gated on `os.path.isdir(dist_path)` at startup) and falls back to a friendly inline-styled HTML "warming up" page if the SPA shell isn't built — eliminating any path that could leak FastAPI's default 404 JSON. Both `/` and `/dashboard` (and every other SPA route) now serve `text/html` with `Cache-Control: no-cache` for the index shell.

- **Per-user data scoping (2026-04-29):** Multi-tenant isolation across all collections. A `UserContextMiddleware` (`app/user_context.py`) reads the `X-User-Id` request header into a Python `ContextVar` (default `"guest"`); every agent layer stamps writes with `user_id`/`userId` and filters reads via `belongs_to_current_user(doc)` (treating untagged legacy docs as `"guest"` for back-compat). Frontend monkey-patches `window.fetch` (`src/lib/apiFetch.ts`, installed in `src/main.tsx`) to inject the header — Firebase uid for real users, the literal `"guest"` for unauthenticated/guest sessions. Result: **GUEST** sees a curated demo (15 memories, 11 pending tasks, 8 calendar events, 6 revisits, 3 workspace projects), while every signed-in user starts with an empty vault and only sees their own captures. IDOR guards added on every memory/task by-id endpoint (share/unshare/auto-tag/flashcards/study-plan/breakdown/export, plus all `workspace_agent` mutators and timeline/insight task hydration). Daily briefing cache is keyed per-user. Note: `X-User-Id` is currently client-asserted; signing it server-side via Firebase ID-token verification is the recommended next step before public launch.

### Feature Specifications
- **Core AI Functionality:** Multi-agent orchestration and natural language processing.
- **Knowledge Management:** Capture, semantic search, memory vault, and mind graph.
- **Productivity Tools:** Task management, advanced calendar (month/agenda views, topic categorization, ICS import/export, Google/Apple/Outlook subscribe), flashcards with spaced repetition, study plan generation, markdown notes, bookmarks, and habits.
- **Neural Recall Empty State (expanded 2026-04):** Two-column rich landing — left side has 3 categorized prompt sections (Quick recap / Deep dive / Find specific) plus a `localStorage`-backed "Recent questions" history strip (key `recall-x247-history`, max 6, deduped, with Clear). Right side "Your knowledge" panel shows total Memories + Day streak (flame icon), a proportional Source mix bar with legend, clickable Top topics chips, and 3 Recent captures (clickable). Bottom tips strip with kbd shortcut. Data: `/dashboard/advanced` (top_tags, streak), `/memories?limit=100` (recents + derived source mix). Cards expanded to ~13-14px text with 12-13px padding and 26px stat numbers so the empty state scrolls comfortably. Header de-duplicated (subtitle + memCount badges removed — info shown only in the Knowledge panel). "Recall vs Agent Hub" diff card shown by default on first visit; dismissal persisted via `recall-x247-diff-dismissed=1`. Mobile collapses to single column at `max-width: 760px` with further size bumps at `≤640px` and a small reduce at `≤380px`. `:focus-visible` keyboard polish.
- **Sidebar Essentials:** Pinned essentials list contains 5 daily-driver pages: Dashboard, Capture, Vault, Recall AI, Agent Hub. Agent Hub is also removed from the "Insights" group to avoid duplicate listings.
- **No emojis policy:** All UI strings and decorative emojis (🎉/👍/💪/🏆/💡/⚡/🤖/📂/📋/✅/🎙/🌍) have been replaced with lucide icons or plain text across pages.
- **Advanced Dashboard (redesigned 2026-04):** Stat cards moved to the top, duplicate panels removed (Knowledge Pulse strip, Capture Activity line chart, Domain Distribution bar chart, System Status), and every section now uses a unified `SectionHeader` (icon pill + title + uppercase eyebrow + optional action link) plus a 3px left-accent for visual consistency. Adds a derived "Smart Insights" strip (Learning velocity, Topic lead, Next revisit) and a combined Knowledge map (radar + domain list in one panel).
- **Advanced Workspace:** Includes workspace KPIs, Workspace Recall search, per-project analytics with a 30-day heatmap, project templates (blank/hackathon/course/research), Markdown export, drag-and-drop section organization, task due-dates with one-click "send to calendar" bridge, "generate flashcards" bridge for memory items, mobile-responsive layout, and a demo project.
- **Analytics:** Tracks learning velocity, domain expertise, and streaks.
- **User Management:** Profile management, security, and data export.
- **Integrations:** A catalog of third-party integrations.

## External Dependencies
- **AI Providers:** Google Gemini 2.0 Flash, OpenRouter.
- **Database:** Google Cloud Firestore.
- **Deployment:** Google Cloud Run.
- **APIs:** OpenAI-compatible API layer.
- **Third-party Services (Integrated):**
    - Google (Gmail, Calendar, Drive, Docs, Photos, Keep, YouTube)
    - Productivity (Notion, Obsidian, Evernote, Todoist, Trello)
    - Communication (Slack, Discord, Telegram, WhatsApp)
    - Developer (GitHub, GitLab, Linear, Jira)
    - Social (X, LinkedIn, Reddit)
    - Storage (Dropbox, OneDrive, S3)
    - Media (Spotify, Pocket, Instapaper)
    - AI/Automation (Chrome extension, Zapier, Make, OpenAI, Webhooks)