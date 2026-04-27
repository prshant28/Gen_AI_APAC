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
- **Productivity Tools:** Task management, calendar scheduling, flashcards with spaced repetition, study plan generation, notes (markdown editor), bookmarks (read-later), and habits (daily tracker).
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