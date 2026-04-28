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
The design system features dark glassmorphism with a neural theme, utilizing CSS custom properties for extensive theming. It supports responsive layouts, a light/dark theme toggle, and premium styling elements. Navigation groups features into AI Brain, Knowledge, Productivity, Insight, and System categories.

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

### Feature Specifications
- **Core AI Functionality:** Multi-agent orchestration and natural language processing.
- **Knowledge Management:** Capture, semantic search, memory vault, and mind graph.
- **Productivity Tools:** Task management, advanced calendar (month/agenda views, topic categorization, ICS import/export, Google/Apple/Outlook subscribe), flashcards with spaced repetition, study plan generation, markdown notes, bookmarks, and habits.
- **Advanced Dashboard:** Displays key metrics like activity pulse, capture heatmap, streaks, top topics, today's focus, and a 7-day forecast.
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