<div align="center">

<img src="https://img.shields.io/badge/Recall_X247-AI_Second_Brain-05050f?style=for-the-badge&logo=brain&logoColor=00d4ff" alt="Recall X247" />

# 🧠 Recall X247

### *Your AI-Powered Second Brain — 15-Agent Knowledge System*

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-GitHub_Pages-00d4ff?style=for-the-badge)](https://prshant28.github.io/Gen_AI_APAC/)
[![Backend API](https://img.shields.io/badge/⚡_Backend_API-Cloud_Run-4285F4?style=for-the-badge&logo=google-cloud&logoColor=white)](https://recall-x247-727590322606.asia-southeast1.run.app/)
[![Hackathon](https://img.shields.io/badge/🏆_Gen_AI_Academy-APAC_2026-FF6B35?style=for-the-badge)](https://github.com/prshant28/Gen_AI_APAC)

[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-6.4-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker&logoColor=white)](https://docker.com)
[![Firestore](https://img.shields.io/badge/Firestore-Cloud_DB-FFCA28?style=flat-square&logo=firebase&logoColor=black)](https://firebase.google.com/docs/firestore)
[![Cloud Run](https://img.shields.io/badge/Google_Cloud_Run-asia--southeast1-4285F4?style=flat-square&logo=google-cloud&logoColor=white)](https://cloud.google.com/run)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

<br/>

> **The ultimate AI second brain — capture knowledge from anywhere, recall it instantly with semantic search, manage projects, schedule study sessions, generate flashcards, and get AI daily briefings. All through natural language, orchestrated by 15 specialized AI agents.**

<br/>

| 🌐 Frontend (GitHub Pages) | ⚡ Backend API (Cloud Run) | 📖 Interactive API Docs |
|:---:|:---:|:---:|
| **[prshant28.github.io/Gen_AI_APAC](https://prshant28.github.io/Gen_AI_APAC/)** | **[recall-x247 on Cloud Run](https://recall-x247-727590322606.asia-southeast1.run.app/)** | **[/docs](https://recall-x247-727590322606.asia-southeast1.run.app/docs)** |

</div>

---

## 📋 Table of Contents

1. [What is Recall X247?](#-what-is-recall-x247)
2. [Live Demo](#-live-demo)
3. [Complete Feature List](#-complete-feature-list)
4. [Multi-Agent Architecture](#-multi-agent-architecture)
5. [Full System Workflow](#-full-system-workflow)
6. [Application Views (35+ Pages)](#-application-views)
7. [Tech Stack](#-tech-stack)
8. [Project Structure](#-project-structure)
9. [Quick Start](#-quick-start)
10. [Environment Variables](#-environment-variables)
11. [API Reference](#-api-reference)
12. [Database & Persistence](#-database--persistence)
13. [Deployment](#-deployment)
14. [Performance & Optimization](#-performance--optimization)
15. [Security](#-security)
16. [Contributing](#-contributing)
17. [License](#-license)

---

## ✨ What is Recall X247?

**Recall X247** is a **production-grade, multi-agent AI second brain** built for the **Gen AI Academy APAC 2026 Hackathon**. It solves the modern information overload crisis by giving you a unified intelligent platform that thinks, remembers, and works alongside you — 24 hours a day, 7 days a week.

### The Problem
Modern knowledge workers face a fragmented digital life — notes live in one app, bookmarks in another, videos watched but forgotten, tasks scattered across tools, and no system that connects them all. Learning is passive, recall is manual, and insights are buried.

### The Solution
Recall X247 acts as your **persistent AI second brain**:

| Capability | What it does |
|---|---|
| 📥 **Capture** | Ingests YouTube videos, web articles, PDFs, notes, images, and voice memos |
| 🔍 **Recall** | Returns instant, cited, AI-synthesized answers from your personal knowledge vault |
| ✅ **Manage** | Tracks tasks, projects, habits, and goals linked to your knowledge |
| 📅 **Schedule** | Schedules study sessions and events with Google Calendar integration |
| 🃏 **Study** | Generates smart flashcards with spaced repetition from your memories |
| 📊 **Analyze** | Delivers AI daily briefings, learning analytics, streaks, and velocity tracking |
| 🔴 **Discover** | Finds new YouTube videos and articles on topics you care about |
| 🤖 **Orchestrate** | Coordinates all of the above through a single natural language conversation |

---

## 🚀 Live Demo

<div align="center">

### 🌐 [Try it Live → https://recall-x247-727590322606.asia-southeast1.run.app](https://recall-x247-727590322606.asia-southeast1.run.app/)

</div>

**Try these example prompts in the Agent Hub:**
```
"Capture this YouTube video https://youtu.be/dQw4w9WgXcQ and create a task to review it"
"What did I learn about machine learning last week?"
"Schedule a study session for tomorrow at 2pm and generate flashcards from my recent notes"
"Give me my daily briefing and show my pending tasks"
"Discover top YouTube videos about generative AI and save the best one"
"Create a study plan for learning Python in 30 days"
"What are my top 5 knowledge domains this month?"
"Summarize everything I've captured about LLMs"
```

📺 **Watch the full walkthrough:** [YouTube Demo Video](https://youtu.be/bzwuRDVhGJM?si=si6Qcr_NblTJbVIZ)

---

## 🎯 Complete Feature List

### 📥 Knowledge Capture
- **YouTube Videos** — Auto-fetches transcripts via YouTube Transcript API, AI-generates title, summary, key points, and tags; embeds thumbnail preview; deduplication by content hash
- **Web Articles** — Scrapes any public URL using BeautifulSoup4, summarizes with LLM, extracts key insights and auto-tags by domain
- **PDF Documents** — Uploads and parses PDF content (up to 25 MB), OCR vision fallback for image-heavy PDFs, inline embed for files under 700 KB
- **Plain Notes** — Free-form text with AI-powered auto-tagging, deduplication for identical content
- **Voice/Audio** — Audio upload and transcription support
- **Images** — Vision-capable OCR to extract and index text from images and screenshots
- **Multi-file Upload** — `.pdf`, `.txt`, `.md`, `.markdown` file types supported
- **Intelligent Title Generation** — Auto-generates descriptive titles when none are provided
- **Smart Deduplication** — Content-hash-based dedup prevents storing identical items
- **Domain Classification** — Automatically classifies captures into domains: AI, Technology, Science, Business, Health, History, Philosophy, Engineering, Productivity

### 🔍 Neural Recall & Semantic Search
- **3-Tier Semantic Search** — Tag matching → Domain filtering → Full-text keyword search, cascading for maximum recall coverage
- **Source-Type Intent Detection** — Recognizes when a query mentions "YouTube", "PDF", "article", or "note" and filters accordingly
- **Recency-Aware Search** — Detects time-based queries ("what did I save recently", "latest captures") and returns time-ordered results
- **Browse Intent Mode** — Pure vault browsing ("show everything", "list my notes") without forced topic matching
- **AI-Synthesized Answers** — Generates cited, conversational answers grounded in your memories
- **Single-Card Focus Mode** — Returns one focal card by default for single-topic questions, widens to up to 8 for explicit batch requests
- **Conversational History** — Supports follow-up questions with context carried across turns
- **Follow-up Suggestions** — AI surfaces 3 related questions after each answer
- **Rich Result Cards** — Thumbnails, favicons, tags, key points, relative dates, source badges
- **Knowledge Graph Visualization** — Interactive graph showing connections between memories by domain and tag

### ✅ Task & Project Management
- **Task CRUD** — Create, update, complete, and delete tasks with priority levels (low/medium/high/urgent) and due dates
- **Kanban Workspace** — Drag-and-drop project board with sections: Inbox, In Progress, Review, Done
- **Project Templates** — Pre-built templates for common goal types
- **Folder Organization** — Nest memories and tasks inside project folders
- **AI Organize** — AI auto-buckets memories into suggested project folders
- **Task Due Dates** — Set and track deadlines with visual indicators
- **Workspace KPIs** — Per-project metrics: items added, tasks completed, study sessions
- **Workspace Recall** — Semantic search across items, tasks, memories, and projects within a workspace
- **Markdown Export** — Export entire workspace or individual projects to Markdown
- **Linked Memories** — Tasks and notes are linked to the memories that inspired them
- **"Generate Flashcards" Bridge** — One-click flashcard generation from workspace items
- **Project Insights** — AI-powered action suggestions and next steps per project

### 🃏 Flashcards & Spaced Repetition
- **AI-Generated Cards** — Automatically generates question-answer pairs from any memory
- **Spaced Repetition** — Supports SRS scheduling logic for optimal review intervals
- **Study Session Scheduling** — Schedule focused study sessions directly to your calendar
- **Deck Management** — Organize cards into decks by topic or source
- **Progress Tracking** — Track cards reviewed, mastered, and due for review
- **Study Plan Generation** — AI creates multi-week study plans with daily goals

### 📅 Calendar & Scheduling
- **Event Creation** — Schedule any event with title, description, date/time, and duration
- **Google Calendar Integration** — Sync events to and from Google Calendar via service account
- **ICS Import/Export** — Import `.ics` files; export calendars for Apple/Outlook subscribe links
- **Month & Agenda Views** — Toggle between visual calendar grid and agenda list
- **Topic Categorization** — Events auto-categorized by learning domain
- **Study Session Blocks** — Dedicated "study session" event type linked to flashcard decks

### 📊 Daily Briefing & Insights
- **AI Daily Briefing** — Each morning, generates a personalized briefing grounded in your recent memories, pending tasks, and calendar events
- **Briefing History** — All briefings persisted to Firestore; access any past day
- **Weekly & Monthly Recaps** — LLM-generated summaries of your learning over the week/month
- **Action Items Extraction** — Pulls actionable to-dos out of recent memories and briefings
- **Opt-in Scheduler** — Configure auto-delivery of briefings at a set time each day
- **In-App Banner Notifications** — Briefing notification delivered as dismissible banner inside the app

### 📈 Analytics & Learning Intelligence
- **Learning Velocity** — Tracks how many items you capture and review over time
- **Domain Radar Chart** — Radar visualization of your top knowledge domains
- **Streak Tracking** — Daily capture and review streaks with gamification
- **Activity Heatmap** — GitHub-style contribution heatmap of capture activity
- **Top Tags & Domains** — Rankings of your most-used tags and knowledge areas
- **Capture Statistics** — Total memories, by source type, by domain, over time
- **"Pick Up Where You Left Off"** — Smart dashboard card surfacing your most recent unfinished capture thread

### 🔴 Discover & Content Intelligence
- **YouTube Discovery** — Searches YouTube Data API v3 for real videos on any topic; returns title, channel, views, duration, published date
- **Article Discovery** — LLM surfaces high-signal articles on any topic
- **One-Click Capture** — Discover a video or article, capture it directly to your vault in one tap
- **10-Minute Cache** — In-process cache makes repeated searches instant
- **Discover Multi-Agent UX** — Visualizes search, fetch, and rank pipeline with agent step indicators

### 🎙️ Live AI Brain (Gemini Live)
- **Real-Time Voice Conversation** — Bidirectional voice chat with Google Gemini Live API
- **Video Brain** — Screen/camera sharing + real-time visual AI analysis
- **Conversational Knowledge Access** — Ask Gemini Live about anything in your vault

### 📝 Notes & Bookmarks
- **Markdown Notes** — Full-featured markdown notes editor with live preview
- **Bookmarks** — Save and tag URLs as lightweight bookmarks separate from full captures
- **Trash / Undo** — Soft-delete with undo support; permanent purge from Trash page
- **Tags Manager** — View, rename, merge, and delete tags across your entire vault

### 👤 User & Profile Management
- **Per-User Data Isolation** — Full multi-tenant architecture; every collection scoped by `X-User-Id` header
- **Profile Management** — Username, avatar, display preferences
- **Data Export** — Export all your memories, tasks, and notes
- **Security Settings** — Manage API keys and connected integrations
- **Onboarding Tour** — Interactive "PICK ONE TO START" guided tour for new users
- **Dismissible Checklist** — "GET FAMILIAR" dashboard checklist tracks first-use milestones

### 🔗 Integrations (Catalog)
- **Google** — Gmail, Calendar, Drive, Docs, Photos, Keep, YouTube
- **Productivity** — Notion, Obsidian, Evernote, Todoist, Trello
- **Communication** — Slack, Discord, Telegram, WhatsApp
- **Developer** — GitHub, GitLab, Linear, Jira
- **Social** — X (Twitter), LinkedIn, Reddit
- **Storage** — Dropbox, OneDrive, Amazon S3
- **Media** — Spotify, Pocket, Instapaper
- **AI & Automation** — Chrome Extension, Zapier, Make, Webhooks

### ⚡ Performance & Infrastructure
- **Lazy-Loaded Routes** — Every page is `React.lazy()` behind a `ChunkErrorBoundary`; entry chunk ships only the shell + router
- **Tab-Level Code Splitting** — Hub pages lazy-load each tab only when opened
- **Deferred Heavy Libraries** — Recharts, react-markdown, and @google/genai loaded on first use via dynamic imports
- **Brotli + Gzip Compression** — `BrotliMiddleware` stacked above `GZipMiddleware` on FastAPI; Express dev server uses gzip
- **Immutable Asset Caching** — Fingerprinted `/assets/*` served with `Cache-Control: public, max-age=31536000, immutable`
- **Bundle Budget CI** — Fails CI if entry chunk exceeds 250 KB gz or any route chunk exceeds 200 KB gz
- **Core Web Vitals Tracking** — LCP, CLS, INP, FCP, TTFB shipped to `/api/vitals` via `sendBeacon` on page hide
- **LCP Preload** — Hero logo preloaded with `fetchpriority="high"` in `index.html`
- **3-Tier AI Failover** — Primary AI key → fallback OpenAI/OpenRouter key → backup Gemini key; never drops a request

---

## 🏗️ Multi-Agent Architecture

Recall X247 uses a **hierarchical multi-agent system** with a central Orchestrator coordinating **15 specialized sub-agents** via OpenAI-compatible function calling with real-time SSE streaming:

```
╔══════════════════════════════════════════════════════════════╗
║              User Natural Language Request                   ║
╚══════════════════════════════════╤═══════════════════════════╝
                                   │  HTTP POST /agent/chat/stream
                                   ▼
          ┌────────────────────────────────────────────┐
          │   🧠  ORCHESTRATOR  (KnowledgeCoordinator)  │
          │   • GPT-4o-mini / Gemini 2.0 Flash          │
          │   • OpenAI function-calling loop             │
          │   • 10+ MCP-style tool definitions           │
          │   • WorkflowEngine step tracking             │
          │   • 3-tier AI failover (primary→fallback     │
          │     →backup)                                 │
          │   app/coordinator.py                        │
          └──────────┬─────────────────────────────────┘
                     │  Routes to specialized agents
     ┌───────────────┼──────────────────────────────────┐
     │               │              │                   │
     ▼               ▼              ▼                   ▼
┌─────────┐   ┌──────────┐  ┌──────────┐        ┌──────────┐
│ Capture │   │  Recall  │  │  Task    │        │Calendar  │
│  Agent  │   │  Agent   │  │  Agent   │        │  Agent   │
│  📥    │   │  🔍     │  │  ✅     │        │  📅     │
└─────────┘   └──────────┘  └──────────┘        └──────────┘
     │               │              │                   │
     ▼               ▼              ▼                   ▼
┌─────────┐   ┌──────────┐  ┌──────────┐        ┌──────────┐
│Briefing │   │Analytics │  │ Discover │        │Workspace │
│  Agent  │   │  Agent   │  │  Agent   │        │  Agent   │
│  📊    │   │  📈     │  │  🔴     │        │  🗂️    │
└─────────┘   └──────────┘  └──────────┘        └──────────┘
     │               │              │                   │
     ▼               ▼              ▼                   ▼
┌─────────┐   ┌──────────┐  ┌──────────┐        ┌──────────┐
│  Plan   │   │ Insight  │  │Timeline  │        │ Library  │
│  Agent  │   │  Agent   │  │  Agent   │        │  Agent   │
│  🗓️   │   │  💡     │  │  ⏱️    │        │  📚     │
└─────────┘   └──────────┘  └──────────┘        └──────────┘
     │
     ▼  SSE Streaming  (real-time events: thinking → agent_start → agent_complete → done)
┌───────────────────────────────────────────────────────────┐
│         React Frontend  —  Agent Hub (/agent)             │
│   • AgentPipeline component visualizes step timings       │
│   • WorkflowHistory panel                                 │
│   • Live chat with streamed markdown rendering            │
└───────────────────────────────────────────────────────────┘
```

### Full Agent Registry

| Agent | File | Role | Key Capabilities |
|---|---|---|---|
| 🧠 **Orchestrator** | `app/coordinator.py` | Central router and coordinator | Routes all requests; 10+ tool definitions; 3-tier AI failover; workflow tracking |
| 📥 **CaptureAgent** | `app/capture_agent.py` | Multi-source knowledge ingestion | YouTube transcripts, web scraping, PDF parsing, OCR, voice; AI summarization; auto-tagging |
| 🔍 **RecallAgent** | `app/recall_agent.py` | Semantic search and AI answers | 3-tier search; source/recency/browse intent detection; cited AI answers; follow-up suggestions |
| ✅ **TaskAgent** | `app/task_agent.py` | Task lifecycle management | CRUD tasks; priority/due dates; filter by status; link to memories |
| 📅 **CalendarAgent** | `app/calendar_agent.py` | Event and session scheduling | Create/list events; Google Calendar sync; ICS import/export; study session blocks |
| 📊 **BriefingAgent** | `app/briefing_agent.py` | Daily intelligence and recaps | AI morning briefing; history persistence; weekly/monthly recaps; action-item extraction |
| 📅 **BriefingScheduler** | `app/briefing_scheduler.py` | Auto-delivery scheduling | Opt-in scheduled briefing at user-configured time; in-app banner notification |
| 📈 **DashboardAgent** | `app/dashboard_agent.py` | Aggregated stats and heatmap | Time-aware greeting; knowledge pulse; activity heatmap; capture streaks; top tags |
| 🔴 **DiscoverAgent** | `app/discover_agent.py` | Content discovery and recommendations | YouTube Data API v3 search; LLM article surfacing; 10-min in-process cache; one-click capture |
| 🗂️ **WorkspaceAgent** | `app/workspace_agent.py` | Project and folder organization | Projects/folders/items/tasks CRUD; AI organize; section system; Markdown export; KPIs |
| 🔎 **WorkspaceRecall** | `app/workspace_recall.py` | Cross-workspace semantic search | Search memories, tasks, items, and projects with synthesized cited answers |
| 🗓️ **PlanAgent** | `app/plan_agent.py` | Study plan and goal planning | 4-agent pipeline: Analyzes goal → Breaks into phases → Schedules → Summarizes |
| 💡 **InsightAgent** | `app/insight_agent.py` | Project insights and task breakdown | AI action suggestions per project; micro-plan task breakdown |
| ⏱️ **TimelineAgent** | `app/timeline_agent.py` | Folder activity timeline | Per-folder chronological activity feeds with bidirectional linking |
| 📚 **LibraryAgent** | `app/library_agent.py` | Library inbox management | Server-side pagination; source/date/domain/text filters; review/archive with undo |
| 🔁 **RevisitAgent** | `app/revisit_agent.py` | Spaced repetition reminders | Firestore-backed revisit CRUD; frequency math; smart AI revisit planning |
| 🧪 **ExtrasAgent** | `app/extras_agent.py` | Supplementary utilities | Miscellaneous helper tools for edge cases |
| 🤖 **AIHelper** | `app/ai_helper.py` | Shared AI utility layer | `chat_with_fallback`, `chat_json`, primary client factory; used by all agents |

---

## 🔄 Full System Workflow

Here is the end-to-end journey of a user request through Recall X247:

### 1. User Sends a Message
The user types or speaks a natural language request in the **Agent Hub** (`/agent`).

```
User: "Capture this YouTube video https://youtu.be/abc123 and create a task to review it tomorrow"
```

### 2. Frontend Initiates SSE Stream
The React frontend opens a Server-Sent Events connection to `POST /agent/chat/stream` carrying the message, user ID, and session context.

### 3. Orchestrator Receives the Request
`app/coordinator.py` receives the message and:
- Registers a new **Workflow** in the WorkflowEngine with a unique workflow ID
- Determines intent using an LLM reasoning pass
- Selects the appropriate tools to call (OpenAI function-calling format)

### 4. Real-Time SSE Events Stream to Frontend

```
→ workflow_start    (workflow ID, timestamp)
→ thinking          (orchestrator reasoning text, streamed token by token)
→ agent_start       (CaptureAgent activated, step ID)
→ agent_complete    (CaptureAgent done: saved memory ID, title, summary)
→ agent_start       (TaskAgent activated)
→ agent_complete    (TaskAgent done: task created with due date)
→ workflow_complete (total duration, step count, entity summary)
→ done
```

The **AgentPipeline** component in the frontend renders each step with live status indicators and timing.

### 5. Agent Execution

#### CaptureAgent Flow:
```
URL received
  → Detect source type (YouTube / web / PDF / note)
  → YouTube: fetch transcript via YouTubeTranscriptApi
  → Web: scrape with httpx + BeautifulSoup4
  → PDF: parse with PyPDF + optional vision OCR
  → Send content to LLM: generate title, summary, key_points[], tags[]
  → Content-hash dedup check against Firestore
  → Persist Memory document to Firestore (or in-memory mock)
  → Return: { id, title, source_type, summary, thumbnail_url, tags }
```

#### RecallAgent Flow:
```
Query received
  → Intent detection: recency? browse? source-type filter?
  → Tier 1: Tag match across user's memories
  → Tier 2: Domain match (if Tier 1 < threshold)
  → Tier 3: Full-text keyword search (if Tier 2 < threshold)
  → Gather top N candidates (up to 8, or 1 for single-topic)
  → LLM synthesizes a cited answer using candidates as context
  → Append 3 follow-up question suggestions
  → Return: { answer, sources[], follow_ups[] }
```

#### TaskAgent Flow:
```
Task request received
  → Parse: title, priority (low/medium/high/urgent), due_date, linked_memory_id
  → CRUD operation: create / update / complete / delete
  → Persist to Firestore tasks collection (scoped by user_id)
  → Return: { id, title, priority, due_date, status }
```

### 6. Workflow Persisted
The completed workflow (with all steps, timings, inputs, outputs) is saved and accessible at `GET /workflows/{id}`.

### 7. Frontend Renders Result
The Agent Hub renders the assistant's final markdown response alongside the agent pipeline visualization showing which agents ran, how long each took, and what each produced.

---

## 🖥️ Application Views

Recall X247 has **35+ pages and views** organized across a sidebar with collapsible groups:

### 🏠 Essentials (Always Pinned)
| Page | Route | Description |
|---|---|---|
| 🏠 **Landing** | `/` (unauthenticated) | Public landing page with feature overview and CTA |
| 📊 **Dashboard** | `/dashboard` | Time-aware greeting; knowledge pulse; activity heatmap; capture streaks; top tags; AI "pick up where you left off" |
| 🤖 **Agent Hub** | `/agent` | Real-time multi-agent SSE chat; AgentPipeline visualization; workflow history; agent registry status panel |
| 📥 **Capture** | `/capture` | Multi-source capture (URL/text/file upload); YouTube embed preview; live AI analysis progress |
| 🗄️ **Vault** | `/vault` | Knowledge grid with thumbnails; full-text detail modals; filter by source type/domain/tag |
| 🔍 **Neural Recall** | `/recall` | Semantic search with 3-tier cascade; AI-synthesized cited answers; follow-up suggestions; conversational history |

### 🗂️ Workspace
| Page | Route | Description |
|---|---|---|
| 🗂️ **Workspace** | `/workspace` | Kanban project board; drag-and-drop sections; linked memories; AI organize; project KPIs |
| 📝 **Notes** | `/notes` | Full markdown notes editor with live preview |
| 🔖 **Bookmarks** | `/bookmarks` | Lightweight URL bookmarks with tags |
| ✅ **Tasks** | `/tasks` | Task list with priority/due dates; filter by status; linked to memories |

### 📚 Learn & Grow
| Page | Route | Description |
|---|---|---|
| 📚 **Library** | `/library` | Inbox with sticky filter toolbar (source, date, domain, search); server-side pagination; review/archive with undo; unread badge |
| 🃏 **Flashcards** | `/flashcards` | AI-generated study cards; spaced repetition; deck management; progress tracking |
| 📅 **Calendar** | `/calendar` | Month/agenda views; Google Calendar sync; ICS import/export; study session blocks; topic categorization |
| ⏱️ **Timeline** | `/timeline` | Chronological memory view; per-folder activity feeds; bidirectional links |
| 🗓️ **Study Plan** | `/study-plan` | AI-generated multi-week study plans with daily goals and scheduling |
| 🔁 **Revisits** | `/revisits` | Spaced repetition revisit queue; smart AI scheduling; frequency math |
| 🔴 **Discover** | `/discover` | YouTube + article discovery; one-click capture; multi-agent pipeline UX |
| 🎙️ **Focus** | `/focus` | Live Gemini voice/video brain session; real-time bidirectional conversation |
| 📖 **Learn** | `/learn` | Curated learning hub with topic exploration |

### 💡 Insights
| Page | Route | Description |
|---|---|---|
| 📊 **Daily Briefing** | `/briefing` | AI morning briefing; history; weekly/monthly recaps; action items; opt-in scheduler |
| 📈 **Analytics** | `/analytics` | Learning velocity; domain radar chart; streak tracking; capture statistics |
| 💡 **Insights** | `/insights` | Project insights; AI action suggestions; task micro-plans |
| 🕸️ **Mind Graph** | `/graph` | Interactive knowledge graph; nodes by domain/tag; connection visualization |
| 🏷️ **Tags Manager** | `/tags` | View, rename, merge, and delete tags across the entire vault |

### 👤 User & System
| Page | Route | Description |
|---|---|---|
| 👤 **Profile** | `/profile` | Username, avatar, display preferences, data export |
| 🔌 **Integrations** | `/integrations` | Catalog of 30+ third-party integrations |
| ⚙️ **Settings** | `/settings` | API keys, AI provider configuration, testing tools |
| 🗑️ **Trash** | `/trash` | Soft-deleted items; undo restore; permanent purge |
| 🔗 **Share** | `/share/:id` | Public, read-only view of a shared memory |
| 📄 **Memory Detail** | `/memory/:id` | Full memory detail with source embed, key points, tags, linked tasks |
| 🎴 **Deck** | `/deck` | Standalone product presentation slide deck (18 slides, keyboard nav, PDF export) |
| 🎓 **Session Detail** | `/session/:id` | Individual study session detail and performance |
| ❓ **404** | `*` | Friendly not-found page with navigation suggestions |
| 🔐 **Login** | `/login` | Authentication page |

---

## 🛠️ Tech Stack

<div align="center">

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Frontend Framework** | React | 19 | UI component library |
| **Language (Frontend)** | TypeScript | 5.8 | Type-safe frontend code |
| **Build Tool** | Vite | 6.4 | Fast bundler + dev server |
| **Styling** | Tailwind CSS | 4.2 | Utility-first CSS |
| **Animations** | Framer Motion | 12 | Smooth UI transitions |
| **Icons** | Lucide React | 0.546 | Icon system |
| **Charts** | Recharts | 3.8 | Analytics visualizations |
| **Markdown** | react-markdown + remark-gfm | 10.1 | Render AI markdown responses |
| **Routing** | React Router DOM | 7.14 | Client-side navigation |
| **Validation** | Zod | 4.3 | Schema validation |
| **Backend Framework** | FastAPI | 0.109+ | Python async API server |
| **Language (Backend)** | Python | 3.11 | Backend runtime |
| **ASGI Server** | Uvicorn | 0.27+ | Production ASGI server |
| **AI Orchestration** | OpenAI SDK | 1.0+ | Function calling + streaming |
| **Primary AI Model** | GPT-4o-mini / Gemini 2.0 Flash | — | Orchestration and generation |
| **Live AI** | Google Gemini Live API | — | Real-time voice/video brain |
| **Database** | Google Cloud Firestore | 2.13+ | Persistent NoSQL storage |
| **Web Scraping** | BeautifulSoup4 + lxml | 4.12+ | Article scraping |
| **YouTube** | youtube-transcript-api | 0.6+ | Transcript extraction |
| **PDF Parsing** | PyPDF | 4.0+ | PDF text extraction |
| **Compression** | brotli-asgi + gzip | — | Response compression |
| **Containerization** | Docker | — | Cloud Run deployment |
| **Cloud Hosting** | Google Cloud Run | — | Serverless container hosting |
| **Static Hosting** | GitHub Pages | — | Frontend static deployment |
| **CI/CD** | GitHub Actions | — | Automated deploy pipeline |
| **E2E Testing** | Playwright | 1.59+ | End-to-end browser tests |
| **Firebase SDK** | Firebase JS SDK | 12.12 | Client-side auth/firestore |

</div>

---

## 📂 Project Structure

```text
Gen_AI_APAC/
│
├── 📄 main.py                        # FastAPI entry point — all routes, middleware, static serving
├── 📄 server.ts                      # Express dev/edge server (gzip, static, SPA fallback)
├── 📄 index.html                     # HTML shell (logo preload, entry chunk)
├── 📄 Dockerfile                     # Multi-stage container build for Cloud Run
├── 📄 vite.config.ts                 # Vite config: code splitting, vendor chunks, bundle budget
├── 📄 requirements.txt               # Python dependencies
├── 📄 package.json                   # Node dependencies + scripts
├── 📄 tsconfig.json                  # TypeScript config
├── 📄 playwright.config.ts           # Playwright E2E test config
├── 📄 firestore.rules                # Firestore security rules (per-user data isolation)
├── 📄 firebase-applet-config.json    # Firebase project config
├── 📄 check_env.py                   # Startup environment validation script
│
├── app/                              # Python backend
│   ├── __init__.py
│   ├── config.py                     # Environment settings + 3-tier AI client config
│   ├── db.py                         # Firestore async client + in-memory mock fallback
│   ├── ai_helper.py                  # Shared AI utilities: chat_with_fallback, chat_json
│   ├── user_context.py               # Per-request user ID scoping (X-User-Id header)
│   ├── coordinator.py                # 🧠 Orchestrator — 10+ tools, SSE streaming, failover
│   ├── workflow_engine.py            # Workflow + WorkflowStep tracking, AGENT_REGISTRY
│   ├── capture_agent.py              # 📥 YouTube / web / PDF / note / OCR ingestion
│   ├── recall_agent.py               # 🔍 3-tier semantic search + AI answer synthesis
│   ├── task_agent.py                 # ✅ Task CRUD with priority and due dates
│   ├── calendar_agent.py             # 📅 Google Calendar integration + ICS
│   ├── briefing_agent.py             # 📊 Daily briefing persistence + weekly/monthly recaps
│   ├── briefing_scheduler.py         # ⏰ Auto-delivery scheduler + notification system
│   ├── dashboard_agent.py            # 📊 Stats aggregation, heatmap, streaks, top tags
│   ├── discover_agent.py             # 🔴 YouTube Data API v3 + LLM article discovery
│   ├── workspace_agent.py            # 🗂️ Projects / folders / items / tasks / AI-organize
│   ├── workspace_recall.py           # 🔎 Cross-workspace semantic search
│   ├── plan_agent.py                 # 🗓️ 4-agent study plan pipeline
│   ├── insight_agent.py              # 💡 Project insights + task micro-plans
│   ├── timeline_agent.py             # ⏱️ Per-folder activity timeline
│   ├── library_agent.py              # 📚 Library inbox with filters and pagination
│   ├── revisit_agent.py              # 🔁 Spaced repetition revisit CRUD + scheduler
│   ├── extras_agent.py               # 🧪 Supplementary utilities
│   ├── live_agent.py                 # 🎙️ Gemini Live voice/video brain session
│   └── demo_data.py                  # Demo seed data for new users
│
├── src/                              # React frontend (TypeScript)
│   ├── main.tsx                      # App entry point + Web Vitals lazy loader
│   ├── App.tsx                       # Router + lazy page imports + ChunkErrorBoundary
│   ├── index.css                     # Dark neural theme + CSS custom properties + animations
│   ├── types.ts                      # Shared TypeScript type definitions
│   │
│   ├── pages/                        # 35+ page components
│   │   ├── Landing.tsx               # Public landing page
│   │   ├── Login.tsx                 # Authentication
│   │   ├── DashboardPage.tsx         # Advanced dashboard
│   │   ├── AgentPage.tsx             # Agent Hub with SSE streaming
│   │   ├── CapturePage.tsx           # Multi-source capture
│   │   ├── VaultPage.tsx             # Knowledge grid
│   │   ├── RecallPage.tsx            # Semantic search
│   │   ├── TasksPage.tsx             # Task management
│   │   ├── WorkspacePage.tsx         # Kanban workspace
│   │   ├── CalendarPage.tsx          # Calendar with Google sync
│   │   ├── FlashcardsPage.tsx        # Flashcard study
│   │   ├── DeckPage.tsx              # Flashcard deck management
│   │   ├── StudyPlanPage.tsx         # AI study plan
│   │   ├── TimelinePage.tsx          # Chronological view
│   │   ├── GraphPage.tsx             # Knowledge graph
│   │   ├── AnalyticsPage.tsx         # Learning analytics
│   │   ├── DailyBriefingPage.tsx     # AI briefing
│   │   ├── InsightsPage.tsx          # Project insights
│   │   ├── DiscoverPage.tsx          # Content discovery
│   │   ├── LibraryPage.tsx           # Library inbox
│   │   ├── NotesPage.tsx             # Markdown notes
│   │   ├── BookmarksPage.tsx         # Bookmarks
│   │   ├── RevisitsPage.tsx          # Spaced repetition
│   │   ├── HabitsPage.tsx            # Habit tracking
│   │   ├── FocusPage.tsx             # Gemini Live session
│   │   ├── LearnPage.tsx             # Learning hub
│   │   ├── TagsManagerPage.tsx       # Tag management
│   │   ├── ProfilePage.tsx           # User profile
│   │   ├── IntegrationsPage.tsx      # Integrations catalog
│   │   ├── SettingsPage.tsx          # API config + testing
│   │   ├── TrashPage.tsx             # Soft-delete trash bin
│   │   ├── SharePage.tsx             # Public shared memory view
│   │   ├── MemoryDetailPage.tsx      # Full memory detail
│   │   ├── SessionDetailPage.tsx     # Study session detail
│   │   └── NotFoundPage.tsx          # 404 page
│   │
│   ├── components/                   # Reusable UI components
│   │   ├── AgentPipeline.tsx         # Agent step visualization with timings
│   │   ├── ActionResultCards.tsx     # Agent output result cards
│   │   ├── BriefingNotifier.tsx      # In-app briefing banner
│   │   ├── LazyMarkdownMessage.tsx   # Lazily-loaded markdown renderer
│   │   ├── MarkdownMessage.tsx       # Streaming markdown renderer
│   │   ├── LiveChatPanel.tsx         # Gemini Live bidirectional chat
│   │   ├── AutoGrowTextarea.tsx      # Auto-expanding textarea
│   │   ├── MessageToolbar.tsx        # Per-message action toolbar
│   │   ├── NavRedirectCard.tsx       # Agent hub navigation hint card
│   │   ├── OnboardingTour.tsx        # Interactive first-use tour
│   │   ├── PageBreadcrumbs.tsx       # Page breadcrumb navigation
│   │   ├── RevisitScheduler.tsx      # Revisit frequency scheduler
│   │   ├── TabbedPage.tsx            # Lazy-loading tab container
│   │   ├── ViewModeToggle.tsx        # Grid/list view toggle
│   │   ├── LegacyRedirectBanner.tsx  # Old route redirect warning
│   │   └── charts/                  # Recharts-based chart components
│   │
│   ├── agents/                       # Frontend agent integration modules
│   ├── lib/                          # Utilities: gemini.ts, vitals.ts
│   └── types/                        # Additional TypeScript types
│
├── public/                           # Static assets
│   └── deck/                        # Standalone product slide deck
│       ├── index.html               # 18-slide HTML presentation
│       └── recall-x247-deck.pdf     # Pre-rendered PDF (A4 landscape)
│
├── scripts/                          # Developer tooling
│   ├── export-deck-pdf.mjs           # Playwright-based PDF export for slide deck
│   ├── check-bundle-budget.mjs       # Bundle size budget checker
│   └── check-no-vendor-leaks.sh      # Vendor code leak detector
│
├── tests/                            # Playwright E2E tests
│   └── sidebar-active-cue.spec.ts    # Sidebar navigation regression test
│
├── docs/                             # Additional documentation
├── attached_assets/                  # Project assets and diagrams
├── screenshots/                      # App screenshots for README/docs
│
└── .github/workflows/
    ├── deploy.yml                    # Cloud Run CI/CD (Docker build + deploy)
    └── gh-pages.yml                  # GitHub Pages CI/CD (vite build + bundle budget)
```

---

## ⚙️ Quick Start

### Prerequisites
- **Python** 3.11 or higher
- **Node.js** 20 or higher
- An **AI API key** — one of:
  - [OpenRouter](https://openrouter.ai) API key (prefix: `sk-or-v1-...`) → set as `GEN_APAC_API_KEY`
  - [OpenAI](https://platform.openai.com) API key → set as `OPENAI_API_KEY`
  - [Google Gemini](https://aistudio.google.com) API key → set as `GEMINI_API_KEY`

### 1. Clone & Install

```bash
git clone https://github.com/prshant28/Gen_AI_APAC.git
cd Gen_AI_APAC

# Install Python dependencies
pip install -r requirements.txt

# Install Node dependencies
npm install
```

### 2. Configure Environment

Create a `.env` file in the project root:

```bash
cp .env.example .env   # if .env.example exists, otherwise create .env manually
```

See the full [Environment Variables](#-environment-variables) section below for all options.

### 3. Run Locally

```bash
npm run dev
```

This single command starts **both** servers concurrently:
- ⚡ **FastAPI backend** → `http://localhost:8000`
- 🌐 **Vite frontend** → `http://localhost:5000`

Open [http://localhost:5000](http://localhost:5000) in your browser.

### 4. Run with Docker

```bash
docker build -t recall-x247 .
docker run -p 8000:8000 --env-file .env recall-x247
```

Open [http://localhost:8000](http://localhost:8000).

### 5. Run E2E Tests

```bash
npm run test:e2e:install   # install Playwright browsers (once)
npm run test:e2e           # run all tests
```

---

## 🔑 Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `GEN_APAC_API_KEY` | ✅ (or alternative) | — | OpenRouter API key (primary AI) |
| `OPENAI_API_KEY` | ✅ (or alternative) | — | OpenAI API key (direct, takes highest priority) |
| `GEMINI_API_KEY` | — | — | Google Gemini API key |
| `PRIMARY_AI_KEY` | — | — | Explicit primary AI key override |
| `PRIMARY_AI_BASE_URL` | — | Auto-detected | Base URL for primary AI provider |
| `PRIMARY_AI_MODEL` | — | `gpt-4o-mini` | Model name for primary provider |
| `FALLBACK_AI_KEY` | — | — | Fallback OpenAI/OpenRouter key (used on primary 429) |
| `FALLBACK_AI_MODEL` | — | `gpt-4o-mini` | Model for fallback provider |
| `BACKUP_GEMINI_API_KEY` | — | — | Third-tier backup Gemini key (separate billing account) |
| `GCP_PROJECT_ID` | — | `demo-project` | Google Cloud project ID for Firestore |
| `FIREBASE_DATABASE_ID` | — | `(default)` | Firestore database ID |
| `GOOGLE_APPLICATION_CREDENTIALS` | — | — | Path to GCP service account JSON |
| `GOOGLE_API_KEY` | — | — | Google API key (for YouTube Data API v3 discovery) |
| `GOOGLE_CSE_CX` | — | — | Google Custom Search Engine ID |
| `GOOGLE_CALENDAR_ID` | — | — | Google Calendar ID for event sync |
| `GOOGLE_SA_KEY_PATH` | — | — | Path to Google Calendar service account JSON |

> 💡 **Zero-config mode**: Set only `GEN_APAC_API_KEY` (or `OPENAI_API_KEY`). The app automatically uses an **in-memory mock database** when no Firestore credentials are provided — perfect for local development and demos.

---

## 📡 API Reference

The FastAPI backend automatically generates interactive docs at [`/docs`](https://recall-x247-727590322606.asia-southeast1.run.app/docs) (Swagger UI) and [`/redoc`](https://recall-x247-727590322606.asia-southeast1.run.app/redoc).

### Core Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/chat` | Synchronous coordinator chat |
| `POST` | `/agent/chat/stream` | **SSE streaming** multi-agent chat (recommended) |
| `GET` | `/agents` | List registered agents with status |
| `GET` | `/workflows` | Recent workflow history (last 20) |
| `GET` | `/workflows/{id}` | Single workflow with full step trace |
| `POST` | `/capture` | Capture knowledge (YouTube/web/PDF/note) |
| `POST` | `/capture/upload` | Upload a file (PDF/txt/md, up to 25 MB) |
| `GET` | `/memories` | List memories (paginated, filterable) |
| `GET` | `/memories/{id}` | Get single memory detail |
| `DELETE` | `/memories/{id}` | Delete a memory |
| `POST` | `/recall` | Semantic search with AI answer |
| `GET` | `/tasks` | List tasks |
| `POST` | `/tasks` | Create a task |
| `PATCH` | `/tasks/{id}` | Update a task |
| `DELETE` | `/tasks/{id}` | Delete a task |
| `GET` | `/schedule` | List calendar events |
| `POST` | `/schedule` | Create a calendar event |
| `GET` | `/briefing` | Get today's AI daily briefing |
| `GET` | `/briefing/history` | List past briefings |
| `GET` | `/stats` | System statistics |
| `GET` | `/discover` | Discover YouTube videos + articles on a topic |
| `GET` | `/workspace/projects` | List workspace projects |
| `POST` | `/workspace/projects` | Create a project |
| `GET` | `/workspace/projects/{id}` | Get project detail with items/tasks |
| `POST` | `/workspace/recall` | Search across a workspace |
| `GET` | `/flashcards` | List flashcard decks |
| `POST` | `/flashcards/generate` | Generate flashcards from a memory |
| `GET` | `/health` | Health check (returns `{"status": "ok"}`) |
| `GET` | `/api/health` | API health check |
| `POST` | `/api/vitals` | Core Web Vitals beacon receiver (204) |

### SSE Streaming Chat — Example

```bash
curl -N -X POST https://recall-x247-727590322606.asia-southeast1.run.app/agent/chat/stream \
  -H "Content-Type: application/json" \
  -H "X-User-Id: my_user_id" \
  -d '{
    "message": "Capture https://youtu.be/dQw4w9WgXcQ and create a task to review it",
    "session_id": "session_001"
  }'
```

### SSE Event Types

| Event | Payload | Description |
|---|---|---|
| `workflow_start` | `{ workflow_id, timestamp }` | New workflow registered |
| `thinking` | `{ text }` | Orchestrator reasoning (streamed token by token) |
| `agent_start` | `{ step_id, agent, tool, input }` | Sub-agent activated |
| `agent_complete` | `{ step_id, agent, output, duration_ms }` | Sub-agent finished with result |
| `navigate` | `{ path }` | Frontend redirect hint (e.g., `/recall`) |
| `workflow_complete` | `{ workflow_id, steps, total_ms }` | All steps done |
| `error` | `{ message }` | Error occurred |
| `done` | — | Stream closed |

### Capture API — Example

```bash
# Capture a YouTube video
curl -X POST https://recall-x247-727590322606.asia-southeast1.run.app/capture \
  -H "Content-Type: application/json" \
  -H "X-User-Id: my_user_id" \
  -d '{"url": "https://youtu.be/dQw4w9WgXcQ", "source_type": "youtube"}'

# Upload a PDF
curl -X POST https://recall-x247-727590322606.asia-southeast1.run.app/capture/upload \
  -H "X-User-Id: my_user_id" \
  -F "file=@/path/to/document.pdf"
```

---

## 🗄️ Database & Persistence

### Firestore Collections

| Collection | Documents | Description |
|---|---|---|
| `memories` | `{user_id}_{uuid}` | All captured knowledge items |
| `tasks` | `{user_id}_{uuid}` | User tasks with priority/due date |
| `schedule` | `{user_id}_{uuid}` | Calendar events |
| `briefings` | `{user_id}_{date}` | Daily briefing history |
| `briefing_settings` | `{user_id}` | User briefing schedule preferences |
| `briefing_notifications` | `{user_id}_{date}` | In-app notification state |
| `workflows` | `{workflow_id}` | Workflow execution history |
| `workspaces` | `{user_id}_{uuid}` | Projects with folders/items/tasks |
| `flashcards` | `{user_id}_{uuid}` | Flashcard decks |
| `revisits` | `{user_id}_{uuid}` | Spaced repetition revisit queue |

### Persistence Strategy

1. **Explicit credentials** — `GOOGLE_APPLICATION_CREDENTIALS` or `GOOGLE_SA_KEY_PATH` service account JSON
2. **Application Default Credentials** — GCP-managed identity (Cloud Run, GKE)
3. **In-memory mock fallback** — Automatically used when no Firestore credentials exist; perfect for local development without any Google Cloud setup

### Security Rules

`firestore.rules` enforces **per-user data isolation**: users can only read and write documents that belong to their own `user_id`.

---

## 🚢 Deployment

### Automated CI/CD

Every push to `main` triggers two parallel GitHub Actions workflows:

```
git push → main
  │
  ├── 🐳  .github/workflows/deploy.yml  (Google Cloud Run)
  │       ├── Authenticate with GCP (Workload Identity / SA key)
  │       ├── docker build -t gcr.io/$PROJECT/recall-x247 .
  │       ├── docker push
  │       └── gcloud run deploy recall-x247
  │               --region asia-southeast1
  │               --memory 1Gi --cpu 1
  │               --set-secrets GEN_APAC_API_KEY:latest
  │
  └── 📄  .github/workflows/gh-pages.yml  (GitHub Pages)
          ├── npm ci
          ├── npm run check:bundle-budget   ← fails CI if chunks too large
          ├── npm run build
          └── Deploy dist/ to gh-pages branch
```

### Manual Cloud Run Deployment

```bash
gcloud run deploy recall-x247 \
  --source . \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --set-secrets "GEN_APAC_API_KEY=GEN_APAC_API_KEY:latest"
```

### Required GitHub Secrets

| Secret | Description |
|---|---|
| `GEN_APAC_API_KEY` | OpenRouter / OpenAI API key *(Optional)* |
| `GCP_PROJECT_ID` | Google Cloud Project ID |
| `GCP_SA_KEY` | Google Cloud Service Account JSON (base64-encoded) |
| `GEMINI_API_KEY` | Google Gemini API key |

### Product Slide Deck

A standalone 18-slide HTML presentation lives at `/deck/index.html`. It is self-contained with no app code dependency and covers: problem, solution loop, personas, journey, all feature deep-dives, roadmap, architecture, and CTA.

```bash
# Regenerate the pre-rendered PDF (requires Playwright + Chromium)
npm run export:deck-pdf
```

Keyboard navigation: `←` / `→` / `Space` (next) · `N` (speaker notes) · `P` (print) · `D` (download PDF) · `F` (fullscreen)

---

## ⚡ Performance & Optimization

- **Lazy Routes** — Every page in `App.tsx` is `React.lazy()` wrapped; only the shell + router ship in the entry chunk
- **Tab-Level Splitting** — `TabbedPage.tsx` lazy-loads each tab's code only when opened for the first time
- **Deferred Libraries** — `recharts` (chart components), `react-markdown` (`LazyMarkdownMessage`), and `@google/genai` (`src/lib/gemini.ts` Proxy pattern) are deferred until first use
- **Vendor Chunk Pinning** — Stable vendor chunks pinned in `vite.config.ts` for long-term browser cache reuse
- **Brotli + Gzip** — `BrotliMiddleware` stacked above `GZipMiddleware`; all responses ≥ 1 KB compressed
- **Immutable Caching** — Fingerprinted `/assets/*` served with `Cache-Control: public, max-age=31536000, immutable`
- **SPA Shell Cache** — `index.html` served with `Cache-Control: no-cache` for instant revalidation
- **LCP Preload** — `x247-logo.webp` preloaded with `fetchpriority="high"` in `index.html`
- **Bundle Budget** — CI fails if entry chunk > 250 KB gz or any route chunk > 200 KB gz (enforced by `scripts/check-bundle-budget.mjs`)
- **Core Web Vitals** — LCP, CLS, INP, FCP, TTFB tracked and sent to `/api/vitals` via `sendBeacon`; loaded lazily after `requestIdleCallback`
- **Bundle Analysis** — Run `npm run analyze` to open an interactive treemap at `dist/stats.html`

---

## 🛡️ Security

- **Per-User Data Isolation** — Every Firestore collection scoped by `X-User-Id` header; `firestore.rules` enforces that users can only access their own documents
- **Secret Management** — All API keys stored as Google Cloud Secrets; never committed to source code
- **No Credentials in Source** — `GOOGLE_APPLICATION_CREDENTIALS` and `GOOGLE_SA_KEY_PATH` point to files outside the repo
- **CORS Configuration** — FastAPI CORS middleware restricts origins to production domains
- **Input Validation** — Pydantic v2 models validate all request bodies at the API boundary
- **PDF Size Cap** — PDFs over 700 KB are not base64-embedded to prevent Firestore 1 MiB document limit violations
- **Content-Hash Dedup** — SHA-256 hash of note content prevents storing duplicate items

---

## 🤝 Contributing

1. **Fork** the repository
2. **Create** your feature branch:
   ```bash
   git checkout -b feat/your-amazing-feature
   ```
3. **Make** your changes following the existing code style
4. **Test** your changes:
   ```bash
   npm run lint          # TypeScript type check
   npm run test:e2e      # Playwright E2E tests
   ```
5. **Commit** using conventional commits:
   ```bash
   git commit -m 'feat: add amazing feature'
   ```
6. **Push** your branch:
   ```bash
   git push origin feat/your-amazing-feature
   ```
7. **Open a Pull Request** against `main`

### Development Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start FastAPI + Vite dev servers concurrently |
| `npm run build` | Build production frontend bundle |
| `npm run lint` | TypeScript type-check (no emit) |
| `npm run analyze` | Build + open bundle treemap at `dist/stats.html` |
| `npm run check:bundle-budget` | Fail if chunks exceed size budget |
| `npm run check:vendor-leaks` | Check for vendor code leaks |
| `npm run test:e2e` | Run Playwright E2E test suite |
| `npm run test:e2e:install` | Install Playwright browsers |
| `npm run export:deck-pdf` | Re-generate the slide deck PDF |
| `python check_env.py` | Validate environment variables |

---

## 📜 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Built with ❤️ by [Prashant Maurya](https://github.com/prshant28) for the [Gen AI Academy APAC 2026 Hackathon](https://github.com/prshant28/Gen_AI_APAC)**

📺 [Watch the Demo](https://youtu.be/bzwuRDVhGJM?si=si6Qcr_NblTJbVIZ) · 🌐 [Live App](https://recall-x247-727590322606.asia-southeast1.run.app/) · 📖 [API Docs](https://recall-x247-727590322606.asia-southeast1.run.app/docs)

[![GitHub Stars](https://img.shields.io/github/stars/prshant28/Gen_AI_APAC?style=social)](https://github.com/prshant28/Gen_AI_APAC/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/prshant28/Gen_AI_APAC?style=social)](https://github.com/prshant28/Gen_AI_APAC/network/members)

</div>

