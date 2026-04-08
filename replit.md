# Recall X247 — AI-powered Second Brain v2.0

## Overview
An AI-powered productivity assistant for Gen AI Academy APAC 2026 hackathon. Captures knowledge from YouTube, web, PDFs, and notes; allows semantic recall via natural language; manages tasks; generates flashcards; and schedules study sessions. Powered by OpenAI GPT.

## Architecture

### Backend (Python / FastAPI)
- **Entry point**: `main.py` — FastAPI app serving REST API on port 8000
- **Framework**: FastAPI + Uvicorn
- **AI/LLM**: OpenAI GPT-4o-mini via `openai` SDK (function calling / tool use)
- **Database**: Google Cloud Firestore (async client) with in-memory fallback when credentials unavailable
- **Key modules** in `app/`:
  - `coordinator.py` — Multi-agent OpenAI function-calling orchestrator (replaces google-adk)
  - `capture_agent.py` — Captures from YouTube, web, PDF, notes; generates flashcards, study plans, briefings
  - `recall_agent.py` — 3-tier semantic recall; delete memories
  - `task_agent.py` — Task creation, completion, deletion
  - `calendar_agent.py` — Google Calendar integration + Firestore fallback
  - `db.py` — Firestore client with full in-memory mock fallback
  - `config.py` — Settings from env vars + `firebase-applet-config.json`

### Frontend (React + TypeScript + Vite)
- **Entry point**: `src/main.tsx`
- **Framework**: React 19 + TypeScript
- **Styling**: Tailwind CSS 4
- **Build tool**: Vite (dev server on port 5000)
- **Key source**: `src/App.tsx` — full application UI
- **Views**: Dashboard, Capture, Vault, Recall AI, Tasks, Flashcards, Calendar, Settings

## Key Features
1. **Multi-source Capture**: YouTube transcripts, web scraping, PDF upload, quick notes
2. **OpenAI Analysis**: Summary, key points, tags, domain classification via GPT-4o-mini
3. **3-Tier Recall**: tag search → domain classification → semantic scan via OpenAI
4. **AI Flashcards**: Auto-generated Q&A from any saved memory
5. **AI Study Plan**: 7-day personalized study plan based on saved knowledge
6. **AI Daily Briefing**: Morning motivation based on recent activity
7. **Multi-Agent Coordinator**: OpenAI function-calling with 6 tools
8. **Task Management**: Create/complete/delete tasks with priority and due dates
9. **Knowledge Vault**: Delete, filter by domain, view details, generate flashcards
10. **Command Palette**: Cmd+K quick navigation

## API Endpoints
- `POST /chat` — Multi-agent coordinator
- `POST /capture` — Capture from URL or text
- `POST /capture/upload` — PDF file upload
- `GET /memories` — List memories (with domain filter)
- `DELETE /memories/{id}` — Delete a memory
- `GET /memories/{id}/flashcards` — Generate AI flashcards
- `POST /study-plan` — Generate 7-day study plan
- `GET /briefing` — AI daily briefing
- `POST /tasks` — Create task
- `GET /tasks` — List tasks (status filter)
- `POST /tasks/{id}/complete` — Complete task
- `DELETE /tasks/{id}` — Delete task
- `GET /schedule` — List events
- `POST /schedule` — Create event
- `GET /stats` — Memory/task statistics
- `GET /settings` — Configuration status
- `GET /test-ai` — Test OpenAI connection

## Environment Variables / Secrets Required
- `OPENAI_API_KEY` — Required for all AI features
- `GEMINI_API_KEY` (optional, legacy)
- `GOOGLE_API_KEY` (optional, for web search)
- `GOOGLE_CSE_CX` (optional)
- `GCP_PROJECT_ID` — Set to `balmy-vertex-478515-m4`
- `GOOGLE_APPLICATION_CREDENTIALS` — Service account path (optional, falls back to in-memory DB)

## Development Workflow
- Run: `npm run dev` (runs both Vite on port 5000 and FastAPI on port 8000 concurrently)
- Vite proxies API calls to FastAPI backend
- In-memory database used when Firestore credentials unavailable

## Deployment
- Build: `npm run build`
- Run: `python main.py`
- Serves built React app as static files from `/dist`
