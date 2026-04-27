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