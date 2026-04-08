# Recall X247 — AI-powered Second Brain

## Overview
An AI-powered productivity assistant for Gen AI Academy APAC 2026 hackathon. Captures knowledge from YouTube, web, PDFs, and notes; allows semantic recall via natural language; and manages tasks and schedules linked to that knowledge.

## Architecture

### Backend (Python / FastAPI)
- **Entry point**: `main.py` — FastAPI app serving REST API on port 8000
- **Framework**: FastAPI + Uvicorn
- **AI/LLM**: Google Gemini 2.0 Flash via `google-adk` (Agent Development Kit) and `google-generativeai`
- **Database**: Google Cloud Firestore (async client)
- **Key modules** in `app/`:
  - `coordinator.py` — LlmAgent orchestrator using Google ADK
  - `capture_agent.py` — Captures knowledge from YouTube, web, PDF, and notes
  - `recall_agent.py` — Semantic search and recall from saved memories
  - `task_agent.py` — Task creation and management
  - `calendar_agent.py` — Google Calendar integration
  - `db.py` — Firestore client and helpers
  - `config.py` — Settings loaded from env vars and `firebase-applet-config.json`

### Frontend (React + TypeScript + Vite)
- **Entry point**: `src/main.tsx`
- **Framework**: React 19 + TypeScript
- **Styling**: Tailwind CSS 4
- **Build tool**: Vite (dev server on port 5000)
- **Key source**: `src/App.tsx` — main application UI
- **Proxying**: Vite proxies `/api`, `/chat`, `/capture`, `/recall`, `/memories`, `/tasks`, `/schedule`, `/stats`, `/settings`, `/logs`, `/health` to the Python backend at port 8000

## Development Workflow

### Running Locally
```
npm run dev
```
This uses `concurrently` to start both:
- Python FastAPI backend on port 8000
- Vite frontend dev server on port 5000

### Building for Production
```
npm run build
```
Vite builds the React app into `dist/`. The FastAPI backend serves static files from `dist/` in production.

## Configuration

### Environment Variables / Secrets
- `GEMINI_API_KEY` — Google Gemini API key (required for AI features)
- `GOOGLE_API_KEY` — Alternative Google API key
- `GCP_PROJECT_ID` — Google Cloud project ID
- `FIREBASE_DATABASE_ID` — Firestore database ID
- `GOOGLE_APPLICATION_CREDENTIALS` — Path to GCP service account JSON
- `GOOGLE_CALENDAR_ID` — Google Calendar ID for scheduling
- `GOOGLE_SA_KEY_PATH` — Service account key path
- `GOOGLE_CSE_CX` — Google Custom Search Engine ID

Config is also loaded from `firebase-applet-config.json` for project ID and Firestore database ID.

## Deployment
- **Target**: Autoscale
- **Build**: `npm run build` (compiles React into `dist/`)
- **Run**: `python main.py` (serves both API and static frontend from port specified by `PORT` env var, defaulting to 8000)
- In production, the FastAPI app serves the built React SPA from `dist/`

## Dependencies
- **Python**: `requirements.txt` (fastapi, uvicorn, google-adk, google-cloud-firestore, google-generativeai, etc.)
- **Node.js**: `package.json` (react, vite, tailwindcss, lucide-react, framer-motion, recharts, firebase)
