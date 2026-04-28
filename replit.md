# Recall X247 — AI-powered Second Brain v2.0

## Overview
Recall X247 is an AI-powered productivity assistant designed as a "second brain." It uses a multi-agent AI system, orchestrated by a primary agent using OpenAI function calling and real-time Server-Sent Events (SSE). The system captures knowledge from various sources (YouTube, web, PDFs, notes), performs semantic recall, manages tasks, generates flashcards, schedules study sessions, and delivers AI-generated daily briefings. The project aims to provide comprehensive knowledge management and personal productivity enhancement through advanced AI.

## User Preferences
I prefer detailed explanations.
I want iterative development.
Ask before making major changes.

## System Architecture
The application employs a multi-agent AI architecture with a central orchestrator.

### UI/UX Decisions
The design system features dark glassmorphism with a neural theme, utilizing CSS custom properties for extensive theming. It supports responsive layouts, a light/dark theme toggle, and premium styling elements like gradient button shimmers and glow effects. Key UI components, including Dashboard cards, Agent Hub, and various page layouts, are designed for theme consistency and responsiveness. The navigation sidebar groups features into AI Brain, Knowledge, Productivity, Insight, and System categories.

### Technical Implementations
- **Frontend:** Built with React, TypeScript, and Vite, using `react-router-dom` for navigation. It includes a global toast system and a floating quick-capture button.
- **Backend:** Developed with Python and FastAPI, providing API endpoints for AI coordination, knowledge capture, data management, and analytics.
- **Multi-Agent System:** An Orchestrator (`app/coordinator.py`) dispatches tasks to specialized sub-agents (CaptureAgent, RecallAgent, TaskAgent, CalendarAgent, BriefingAgent, AnalyticsAgent) via OpenAI function calling. A `WorkflowEngine` (`app/workflow_engine.py`) manages agents and their tools.
- **Plan Generator (4-agent pipeline)** — `app/plan_agent.py`: Researcher → Discover (parallel per focus area) → Organizer → Scheduler. Generic across goal types (study, project, research, travel, career, health, launch, skill). Returns intent, focus areas, folders with weights, day-by-day plan, and pipeline timings. Surfaced at `/plan/goal-types`, `/plan/generate`, `/plan/save-to-workspace`. Frontend: `src/pages/StudyPlanPage.tsx` (PlanGeneratorPage) with live `AgentPipeline` visualization.
- **Workspace agent** — `app/workspace_agent.py`: backend-persisted projects with items + tasks + folders, plus `ai_organize_memories()` that proposes folders and assigns existing memories. CRUD endpoints at `/workspace/projects[/...]`. Frontend: `src/pages/WorkspacePage.tsx` with folder filter strip, items+tasks columns, and AI Organize.
- **Discover multi-agent UX** — `src/pages/DiscoverPage.tsx` wraps the existing `/discover` call with a 3-agent visualization (YouTube Search, Article Fetcher, Ranker) and adds workspace target picker + per-card "Save to Workspace" + bulk "Save all".
- **Project insights, task breakdown, workspace recall, anti-clutter dedup** (2026-04-27): `app/insight_agent.py` detects important work in a project and returns suggestions with one-click `add_task` / `create_plan` / `save_to_memory` actions (server-side re-validation on apply). `app/plan_agent.py::breakdown_task` does a single-LLM-call micro-plan (3-7 ordered steps with day_offset + due_date + est_minutes; deadline-aware day cap, rejects past deadlines). `app/workspace_recall.py` searches items + tasks + memories + projects and synthesizes a 2-3 sentence cited answer (sources sanitized before LLM injection; emitted citations whitelisted against returned sources). `app/capture_agent.py` adds content-hash dedup (sha1 of normalized title + first 400 chars summary, 90-day window, bounded 200-doc scan) for note-type memories on top of existing URL dedup. Endpoints: `POST /workspace/projects/{id}/extract-insights`, `POST /workspace/projects/{id}/insights/apply`, `POST /tasks/breakdown`, `POST /workspace/recall`. Design notes in `docs/RECALL_PLAN_MEMORY_SYSTEM.md`.
- **Revisit Reminders** (2026-04-28): `app/revisit_agent.py` — Firestore-backed CRUD with frequency math for `once|daily|twice_weekly|weekly|biweekly|monthly|custom_days|specific_date`. Helpers: `_compute_next_due` (advances from now or last visit), `mark_visited` (auto-completes one-shot reminders, advances recurring ones), `snooze_revisit` (float days), `pause/resume/update/delete`, heuristic `suggest_frequency_from_text`. List queries `order_by("next_due", ASC)` at the DB level (with in-memory fallback) so heavy users still see the most urgent reminders first; `list_due` fetches up to 2000 active rows per call. PATCH validates `specific_date` ISO + `custom_days` interval to avoid silently breaking schedules. 11 endpoints under `/revisits/*` (GET/POST list+create, GET/PATCH/DELETE by id, `/visit`, `/snooze`, `/pause`, `/resume`, `/frequencies`, `/due`, `/suggest`). `/briefing` overlays `revisits_due / revisits_upcoming / revisits_due_count` (uncached) on top of the cached AI text. Frontend: reusable `src/components/RevisitScheduler.tsx` (frequency chips + custom-days + date picker + AI suggestion), `src/pages/RevisitsPage.tsx` full management (filter chips all/due/upcoming/paused/completed, search, inline create, all actions), inline scheduler on `CapturePage` post-save, "Set Revisit" button on `MemoryDetailPage`, and a Dashboard panel with overdue/upcoming + Go-to (opens URL or `/memory/:id` and auto-marks visit) / Done / Snooze 1d / Pause. New sidebar nav under Productivity (Bell icon, `#f59e0b`).
- **Folder Timeline with bidirectional edges** (2026-04-27): `app/timeline_agent.py::get_folder_timeline` derives a per-folder activity feed at query time from existing collections (no new event store) — capture / insight / task / memory / plan events sorted newest first. Insight apply handlers in `app/insight_agent.py` now write a `linked_from` pointer onto every spawned artefact and append an `applied_actions[]` row onto the source insight (persisted into the project doc as `recent_insights[]`, capped 50 FIFO), so the aggregator can resolve bidirectional edges (`linked_from` ↔ `linked_to[]`) in one pass. Endpoint: `GET /workspace/projects/{id}/timeline?folder_id=<id>`. Frontend: `src/pages/TimelinePage.tsx` gains a "Workspace flow" mode (project + scope pickers, type filter pills with live counts, click-to-jump dashed pills via `#ev-{id}` anchors, deeplinks to source pages); `src/pages/WorkspacePage.tsx` adds a Timeline button next to AI Organize; `src/pages/CapturePage.tsx` shows a post-save pill with **Open** / **View Timeline**. Full design + integrated workflow diagram in `docs/RECALL_PLAN_MEMORY_SYSTEM.md`.
- **Reusable agent visualization** — `src/components/AgentPipeline.tsx` renders queued/running/done/error pills with ms timings; used by both Plan Generator and Discover.
- **Real-time Communication:** Server-Sent Events (SSE) are used for streaming AI responses and workflow updates to the frontend Agent Hub.
- **Knowledge Capture:** Supports capturing and AI-analyzing content from YouTube (transcripts), web pages (scraping), and PDFs (parsing).
- **Semantic Recall:** Features a 3-tier semantic search mechanism (tag, domain, full text).
- **Spaced Repetition:** Integrated into the Flashcards feature for optimized learning.
- **Voice Capture:** Allows audio uploads, transcribes via OpenAI Whisper, and processes the transcript as a standard note.
- **Shareable Memories:** Provides a mechanism to generate public, read-only views of memories via unique tokens.
- **Auto-tagging:** AI suggests and merges tags for existing memories.

### Feature Specifications
- **Core AI Functionality:** Multi-agent orchestration and natural language processing for task execution and knowledge retrieval.
- **Knowledge Management:** Capture, semantic search, a vault for stored memories, and a mind graph visualization.
- **Productivity Tools:** Task management, advanced calendar (month + agenda views, topic categorization with color stripes, prev/next month nav, day-detail modal, ICS import/export, Google/Apple/Outlook subscribe wizard, click-event-to-linked-task deep-link via `/tasks?focus=<id>`), flashcards with spaced repetition, study plan generation, notes (markdown editor), bookmarks (read-later), and habits (daily tracker).
- **Calendar API surface (FastAPI):** `GET/POST /schedule` (events), `GET /calendar/topics`, `GET /calendar/events/{id}`, `DELETE /calendar/events/{id}`, `POST /calendar/import` (RFC 5545 VEVENT parser in `app/calendar_agent.py:parse_ics_text`), `GET /calendar/google/wizard` (4-step connect flow), `GET /calendar.ics` (read-only feed enriched with `CATEGORIES` + topic + linked-task in `DESCRIPTION`).
- **Analytics:** Tracks learning velocity, domain expertise, and streaks.
- **User Management:** Includes profile management, security settings, and data export.
- **Integrations:** A catalog of third-party integrations across various categories.

## External Dependencies
- **AI Providers:** Google Gemini 2.0 Flash (via `GOOGLE_API_KEY`) with OpenRouter fallback (via `GEN_APAC_API_KEY`).
- **Database:** Google Cloud Firestore, with an in-memory MockFirestoreClient for development.
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