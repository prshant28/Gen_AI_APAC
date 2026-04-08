# Recall X247 — AI-powered Second Brain

Recall X247 is a production-ready multi-agent AI system designed for the **Gen AI Academy APAC 2026 hackathon**. It serves as an intelligent "Second Brain" that helps users capture knowledge from various sources, recall it using natural language, and manage tasks and schedules linked to that knowledge.

## 🚀 Key Features

-   **Multi-Agent Architecture**: Orchestrated by a `KnowledgeCoordinator` using Gemini 2.0 Flash.
-   **Knowledge Capture**: Automatically summarize and tag content from YouTube, web articles, PDFs, and notes.
-   **Semantic Recall**: Ask questions about your saved knowledge and get context-aware answers.
-   **Task Management**: Create and track tasks linked to your captured memories.
-   **Calendar Integration**: Schedule study sessions or events directly on Google Calendar.
-   **Multi-Step Workflows**: "Capture this video, create a task to review it, and schedule a study session for tomorrow" — all in one request.

## 🛠️ Tech Stack

-   **Language**: Python 3.11
-   **Framework**: FastAPI + Uvicorn
-   **AI**: Gemini 2.0 Flash (via `google-generativeai`)
-   **Database**: Google Cloud Firestore (Async)
-   **Deployment**: Google Cloud Run (Dockerized)
-   **Tools**: BeautifulSoup4, YouTube Transcript API, PyPDF, Google API Python Client

## 📂 Project Structure

```text
/
├── main.py              # FastAPI entry point
├── app/
│   ├── config.py        # Configuration and environment settings
│   ├── db.py            # Firestore singleton and logging
│   ├── coordinator.py   # Primary LlmAgent (KnowledgeCoordinator)
│   ├── capture_agent.py # Content ingestion and summarization
│   ├── recall_agent.py  # Semantic search and memory retrieval
│   ├── task_agent.py    # Task CRUD operations
│   └── calendar_agent.py# Google Calendar integration
├── Dockerfile           # Container configuration
├── requirements.txt     # Python dependencies
└── .env.example         # Environment variable template
```

## ⚙️ Setup & Installation

### 1. Environment Variables
Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
```
Key variables:
- `GEMINI_API_KEY`: Your Google AI Studio API key (Falls back to `GOOGLE_API_KEY` if not set).
- `GCP_PROJECT_ID`: Your Google Cloud Project ID.
- `GOOGLE_APPLICATION_CREDENTIALS`: Path to your service account JSON key.

### 2. Verification
You can verify your configuration in the **Settings** tab of the application. Use the **"Test AI Connection"** button to ensure your API key is valid and the system can communicate with Gemini.

### 2. Docker Deployment
Build and run the container:
```bash
docker build -t recall-x247 .
docker run -p 3000:3000 --env-file .env recall-x247
```

### 3. Local Development
```bash
pip install -r requirements.txt
python3 main.py
```

## 📡 API Documentation

### `POST /chat`
The main entry point for the coordinator.
- **Body**: `{"message": "string", "user_id": "string"}`
- **Example**: `"Capture this YouTube video https://youtu.be/... and create a task to review it."`

### `POST /capture`
Directly capture content.
- **Body**: `{"source_type": "youtube|web|pdf|note", "url": "string", "content": "string"}`

### `GET /tasks`
List all tasks for a user.
- **Query**: `?user_id=demo_user&status=todo`

### `GET /schedules`
List all scheduled events.
- **Query**: `?user_id=demo_user&date=YYYY-MM-DD`

## 🛡️ Security
Firestore rules are configured to ensure data isolation between users. See `firestore.rules` for details.

---
*Developed for the Gen AI Academy APAC 2026 Hackathon.*
