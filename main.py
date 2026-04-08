import os
import time
import datetime
import logging
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException, Request, Body, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from app.config import settings
from app.db import get_db, log_interaction, get_collection_count
from app.coordinator import run_coordinator
from app.capture_agent import capture
from app.recall_agent import recall, list_memories, get_memory, get_stats
from app.task_agent import create_task, list_tasks, complete_task, get_tasks_summary
from app.calendar_agent import create_event, list_upcoming_events

# Setup Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("recall-x247")

app = FastAPI(
    title="Recall X247 API",
    description="AI-powered Second Brain and Productivity Assistant",
    version="1.0.0"
)

# --- Middleware ---

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request Logging Middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    try:
        response = await call_next(request)
        process_time = (time.time() - start_time) * 1000
        
        if response.status_code == 401:
            logger.warning(f"Unauthorized request to {request.url.path}. Headers: {dict(request.headers)}")
            
        logger.info(f"{request.method} {request.url.path} - {response.status_code} - {process_time:.2f}ms")
        return response
    except Exception as e:
        logger.error(f"Error processing request {request.method} {request.url.path}: {e}")
        raise e

# --- Error Handling ---

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail},
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "An unexpected internal server error occurred."},
    )

# --- Pydantic Models ---

class ChatRequest(BaseModel):
    message: str
    session_id: str = "default_session"

class ChatResponse(BaseModel):
    reply: str
    agents_called: List[str]
    session_id: str

class CaptureRequest(BaseModel):
    source_type: str = Field(..., pattern="^(youtube|web|pdf|note)$")
    url: Optional[str] = ""
    content: Optional[str] = ""
    preview: bool = False

class MemorySaveRequest(BaseModel):
    source_type: str
    source_url: Optional[str] = ""
    title: str
    summary: str
    key_points: List[str]
    tags: List[str]
    domain: str

class RecallRequest(BaseModel):
    query: str

class TaskCreateRequest(BaseModel):
    title: str
    due_date: Optional[str] = ""
    priority: Optional[str] = "medium"
    linked_memory_id: Optional[str] = ""

class ScheduleRequest(BaseModel):
    title: str
    date: str
    time: str
    duration_minutes: Optional[int] = 60

# --- Startup Event ---

@app.on_event("startup")
async def startup_event():
    logger.info(f"Recall X247 started. GCP Project: {settings.GCP_PROJECT_ID}")
    # We don't block startup with a Firestore write check to avoid deployment timeouts
    # if the environment is not fully configured yet.
    logger.info("Startup complete.")

# --- Endpoints ---

# API routes first
@app.get("/api/health")
async def api_health():
    return await health()

@app.post("/api/chat", response_model=ChatResponse)
async def api_chat(request: ChatRequest):
    return await chat_endpoint(request)

# ... (other API routes can be prefixed or kept as is)

@app.get("/health")
async def health():
    try:
        memories_count = await get_collection_count("memories")
        tasks_count = await get_collection_count("tasks")
        return {
            "status": "ok",
            "memories_count": memories_count,
            "tasks_count": tasks_count,
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    result = await run_coordinator(request.message, request.session_id)
    
    if "error" in result and result["error"] == "Unauthorized":
        raise HTTPException(status_code=401, detail=result["reply"])
    
    # Log interaction to Firestore
    await log_interaction(
        session_id=result["session_id"],
        user_message=request.message,
        reply=result["reply"],
        agents_called=result["agents_called"]
    )
    
    return result

@app.post("/capture")
async def capture_endpoint(request: CaptureRequest):
    logger.info(f"Capture request received: {request.source_type} for user demo_user")
    try:
        result = await capture(
            source_type=request.source_type,
            url=request.url,
            content=request.content,
            preview=request.preview,
            user_id="demo_user"
        )
        
        if "error" in result:
            logger.error(f"Capture agent error: {result['error']}")
            # Check for auth errors from Gemini
            if "GEMINI_API_KEY not found" in str(result['error']) or "AI Service is not configured" in str(result['error']):
                raise HTTPException(status_code=401, detail=result["error"])
            raise HTTPException(status_code=500, detail=result["error"])
            
        return result
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Capture endpoint exception: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/memories")
async def save_memory_endpoint(request: MemorySaveRequest):
    from app.capture_agent import save_memory
    result = await save_memory(request.model_dump())
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    return result

@app.post("/recall")
async def recall_endpoint(request: RecallRequest):
    result = await recall(request.query)
    if isinstance(result, dict) and "answer" in result and "AI Service is not configured" in result["answer"]:
        raise HTTPException(status_code=401, detail=result["answer"])
    if isinstance(result, dict) and "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    return result

@app.get("/memories")
async def list_memories_endpoint(domain: str = "", limit: int = 20):
    return await list_memories(domain=domain, limit=limit)

@app.get("/memories/{memory_id}")
async def get_memory_endpoint(memory_id: str):
    try:
        return await get_memory(memory_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.post("/tasks")
async def create_task_endpoint(request: TaskCreateRequest):
    return await create_task(
        title=request.title,
        due_date=request.due_date,
        priority=request.priority,
        linked_memory_id=request.linked_memory_id
    )

@app.get("/tasks")
async def list_tasks_endpoint(status: str = "pending", limit: int = 10):
    return await list_tasks(status=status, limit=limit)

@app.post("/tasks/{task_id}/complete")
async def complete_task_endpoint(task_id: str):
    try:
        return await complete_task(task_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.post("/schedule")
async def schedule_endpoint(request: ScheduleRequest):
    return await create_event(
        title=request.title,
        date=request.date,
        time=request.time,
        duration_minutes=request.duration_minutes
    )

@app.get("/schedule")
async def list_schedule_endpoint():
    return await list_upcoming_events(days=7)

@app.get("/logs")
async def list_logs_endpoint(limit: int = 10):
    db = await get_db()
    snapshot = await db.collection("interaction_logs").order_by("timestamp", direction="DESCENDING").limit(limit).get()
    return [doc.to_dict() | {"id": doc.id, "timestamp": doc.to_dict()["timestamp"].isoformat()} for doc in snapshot]

@app.get("/test-ai")
async def test_ai_endpoint():
    """Test the Gemini API connection."""
    if not settings.GEMINI_API_KEY:
        raise HTTPException(status_code=401, detail="GEMINI_API_KEY is not set.")
    
    try:
        import google.generativeai as genai
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel(settings.GEMINI_MODEL)
        response = await model.generate_content_async("Say 'Connection Successful!'")
        return {"status": "success", "message": response.text.strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Test Failed: {str(e)}")

@app.get("/settings")
async def settings_endpoint():
    """Check system status and API configuration."""
    return {
        "gemini_api_key_set": bool(settings.GEMINI_API_KEY),
        "gemini_model": settings.GEMINI_MODEL,
        "gcp_project_id": settings.GCP_PROJECT_ID,
        "firestore_database_id": settings.FIREBASE_DATABASE_ID,
        "status": "online"
    }

@app.get("/stats")
async def stats_endpoint():
    try:
        # Get real counts from Firestore
        total_memories = await get_collection_count("memories")
        pending_tasks = await get_collection_count("tasks")
        total_interactions = await get_collection_count("interaction_logs")
        
        # Get domain breakdown
        db = await get_db()
        memories_snapshot = await db.collection("memories").get()
        domains = {}
        for doc in memories_snapshot:
            data = doc.to_dict()
            domain = data.get("domain", "Other")
            domains[domain] = domains.get(domain, 0) + 1
        
        domain_list = [{"name": k, "value": v} for k, v in domains.items()]
        if not domain_list:
            domain_list = [{"name": "General", "value": 1}]

        return {
            "total_memories": total_memories,
            "pending_tasks": pending_tasks,
            "ai_interactions": total_interactions,
            "knowledge_domains": domain_list
        }
    except Exception as e:
        logger.error(f"Stats error: {e}")
        # Fallback to demo data if Firestore fails
        return {
            "total_memories": 124,
            "pending_tasks": 12,
            "ai_interactions": 450,
            "knowledge_domains": [{"name": "CS", "value": 40}, {"name": "Other", "value": 60}]
        }

# Serve Static Files (at the end to avoid catching API routes)
dist_path = os.path.join(os.getcwd(), "dist")
if os.path.exists(dist_path):
    app.mount("/", StaticFiles(directory=dist_path, html=True), name="static")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Fallback to index.html for SPA routing
        index_path = os.path.join(dist_path, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
        return JSONResponse(status_code=404, content={"error": "Not Found"})
else:
    @app.get("/")
    async def root():
        return {
            "name": "Recall X247",
            "version": "1.0.0",
            "status": "online (no static files found)",
            "description": "AI-powered Second Brain and Productivity Assistant"
        }

if __name__ == "__main__":
    import uvicorn
    # Use PORT from env, default to 8000 for local dev if not specified
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
