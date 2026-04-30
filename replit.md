# Recall X247 — AI-powered Second Brain v2.0

## Overview
Recall X247 is an AI-powered productivity assistant designed as a "second brain." It uses a multi-agent AI system to capture knowledge, perform semantic recall, manage tasks, generate flashcards, schedule study sessions, and deliver AI-generated daily briefings. The project aims to provide comprehensive knowledge management and personal productivity enhancement, becoming a leading platform to help users manage information overload and optimize personal and professional growth.

## User Preferences
I prefer detailed explanations.
I want iterative development.
Ask before making major changes.

## System Architecture
The application employs a multi-agent AI architecture with a central orchestrator.

### UI/UX Decisions
The design system features dark glassmorphism with a neural theme, utilizing CSS custom properties for extensive theming. It supports responsive layouts and a light/dark theme toggle. The sidebar is redesigned for clarity, featuring pinned "ESSENTIALS" and collapsible groups for WORKSPACE, LEARN & GROW, and INSIGHTS. Onboarding includes an actionable "PICK ONE TO START" tour and a dismissible "GET FAMILIAR" checklist on the dashboard. The Advanced Dashboard is redesigned with stat cards, unified section headers, and derived "Smart Insights." The Neural Recall Empty State features a two-column rich landing with prompt sections, recent questions history, and a "Your knowledge" panel.

### Technical Implementations
- **Frontend:** Built with React, TypeScript, and Vite.
- **Backend:** Developed with Python and FastAPI.
- **Multi-Agent System:** An Orchestrator dispatches tasks to specialized sub-agents via OpenAI function calling, managed by a `WorkflowEngine`.
- **Live Voice/Video Brain:** Real-time bidirectional conversation with Google Gemini Live API.
- **Plan Generator:** A 4-agent pipeline creates structured plans for various goals.
- **Workspace Agent:** Manages backend-persisted projects with AI-driven organization.
- **Discover Multi-Agent UX:** Enhances content discovery by visualizing content search, fetching, and ranking.
- **Project Insights and Task Breakdown:** `insight_agent` suggests actions, and `plan_agent` breaks down tasks into micro-plans.
- **Workspace Recall:** Searches across items, tasks, memories, and projects to synthesize cited answers.
- **Anti-clutter Dedup:** Content-hash-based deduplication for notes.
- **Revisit Reminders:** Firestore-backed CRUD system with frequency math and Smart AI planning.
- **Advanced Dashboard:** Aggregates time-aware greeting, knowledge pulse, activity heatmap, capture streaks, top tags, and a "pick-up" feature.
- **Folder Timeline:** Derives per-folder activity feeds with bidirectional linking.
- **Reusable Agent Visualization:** Component to render agent pipeline states and timings.
- **Real-time Communication:** Server-Sent Events (SSE) for streaming AI responses.
- **Knowledge Capture:** AI-analyzes content from YouTube, web pages, and PDFs.
- **Semantic Recall:** Features a 3-tier semantic search.
- **Spaced Repetition:** Integrated into Flashcards.
- **Voice Capture:** Transcribes audio uploads.
- **Shareable Memories:** Generates public, read-only views.
- **Auto-tagging:** AI suggests and merges tags.
- **SPA Deep-Link Hardening:** HTTP middleware serves `index.html` for SPA routes.
- **Firestore Persistence Strategy:** Prioritizes explicit credentials, then Application Default Credentials, with an in-memory mock as a fallback for development.
- **Daily Briefing:** AI-generated briefing grounded in recent memories and user stats.
- **Per-User Data Scoping:** Multi-tenant isolation across all collections using `X-User-Id` header.
- **Capture Page Upgrades:** Dedicated `/capture` route supporting various file uploads with inline previews and intelligent title generation.
- **Inbox Management:** Library Inbox with sticky filter toolbar (source-type, date, domain, text search), server-side pagination, URL query string state mirroring, and "Undo" functionality.
- **Sidebar Inbox Badge:** Numeric badge on the Library nav item displaying unread capture count, updated dynamically.
- **Recall AI Source-Type Intent:** `recall()` function prioritizes source-type filtering when explicitly mentioned in user queries.
- **Recall AI Redesign:** `recall()` returns short, enriched answers with thumbnails/favicons/tags/key_points/relative dates, up to 8 cards, and 3 follow-up suggestions, supporting conversational history and advanced search query merging.
- **Multi-Agent Behaviour Discipline:** Orchestrator prevents auto-chaining of tasks post-capture and tracks a per-(uid, session) "focus item". A deterministic intent gate redirects pure recall/list intents to dedicated pages.
- **Recall Single-Card Default:** `/recall` returns one focal card by default for single-topic questions, widening to a batch only when explicitly requested. `focal_source_id` parameter pins the primary card across follow-ups.

### Feature Specifications
- **Core AI Functionality:** Multi-agent orchestration and natural language processing.
- **Knowledge Management:** Capture, semantic search, memory vault, and mind graph.
- **Productivity Tools:** Task management, advanced calendar (month/agenda views, topic categorization, ICS import/export, Google/Apple/Outlook subscribe), flashcards with spaced repetition, study plan generation, markdown notes, bookmarks, and habits.
- **Advanced Workspace:** Workspace KPIs, Workspace Recall search, per-project analytics, project templates, Markdown export, drag-and-drop organization, task due-dates, and "generate flashcards" bridge.
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
    - AI/Automation (Chrome extension, Zapier, Make, Webhooks)