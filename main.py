import os
import time
import datetime
import logging
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException, Request, Body, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from app.config import settings
from app.db import get_db, log_interaction, get_collection_count
from app.coordinator import run_coordinator
from app.capture_agent import capture, save_memory, generate_flashcards, generate_study_plan, generate_daily_briefing
from app.recall_agent import recall, list_memories, get_memory, delete_memory, get_stats
from app.task_agent import create_task, list_tasks, complete_task, get_tasks_summary, delete_task
from app.calendar_agent import create_event, list_upcoming_events

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("recall-x247")

app = FastAPI(
    title="Recall X247 API",
    description="AI-powered Second Brain — powered by OpenAI GPT",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    try:
        response = await call_next(request)
        process_time = (time.time() - start_time) * 1000
        logger.info(f"{request.method} {request.url.path} - {response.status_code} - {process_time:.2f}ms")
        return response
    except Exception as e:
        logger.error(f"Error processing request {request.method} {request.url.path}: {e}")
        raise e

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(status_code=exc.status_code, content={"error": exc.detail})

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error: {exc}", exc_info=True)
    return JSONResponse(status_code=500, content={"error": "An unexpected internal server error occurred."})


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

class StudyPlanRequest(BaseModel):
    topic: Optional[str] = ""
    days: Optional[int] = 7


# --- Startup ---

@app.on_event("startup")
async def startup_event():
    logger.info(f"Recall X247 v2.0 started. Using OpenAI: {settings.using_openai}. GCP Project: {settings.GCP_PROJECT_ID}")
    logger.info("Startup complete.")


# --- Health & Settings ---

@app.get("/api/health")
async def api_health():
    return await health()

@app.get("/health")
async def health():
    try:
        memories_count = await get_collection_count("memories")
        tasks_count = await get_collection_count("tasks")
        return {
            "status": "ok",
            "memories_count": memories_count,
            "tasks_count": tasks_count,
            "ai_provider": "openai" if settings.using_openai else "gemini",
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")

@app.get("/settings")
async def settings_endpoint():
    return {
        "gen_apac_api_key_set": bool(settings.GEN_APAC_API_KEY),
        "openai_api_key_set": bool(settings.OPENAI_API_KEY),
        "openai_model": settings.OPENAI_MODEL,
        "gemini_api_key_set": bool(settings.GEMINI_API_KEY),
        "gemini_model": settings.GEMINI_MODEL,
        "ai_provider": "openai" if settings.using_openai else "gemini",
        "use_openrouter": settings.USE_OPENROUTER,
        "openai_base_url": settings.openai_base_url,
        "gcp_project_id": settings.GCP_PROJECT_ID,
        "firestore_database_id": settings.FIREBASE_DATABASE_ID,
        "google_calendar_configured": bool(settings.GOOGLE_CALENDAR_ID),
        "status": "online"
    }

@app.get("/test-ai")
async def test_ai_endpoint():
    if not settings.OPENAI_API_KEY:
        raise HTTPException(status_code=401, detail="OPENAI_API_KEY is not set.")
    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(
            api_key=settings.OPENAI_API_KEY,
            base_url=settings.openai_base_url,
            default_headers=settings.openai_extra_headers
        )
        response = await client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[{"role": "user", "content": "Reply with exactly: 'OpenAI Connection Successful!'"}],
            max_tokens=30
        )
        return {"status": "success", "message": response.choices[0].message.content.strip(), "model": settings.OPENAI_MODEL}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Test Failed: {str(e)}")


# --- Chat / Coordinator ---

@app.post("/api/chat", response_model=ChatResponse)
async def api_chat(request: ChatRequest):
    return await chat_endpoint(request)

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    result = await run_coordinator(request.message, request.session_id)
    if "error" in result and result.get("error") == "Unauthorized":
        raise HTTPException(status_code=401, detail=result["reply"])
    await log_interaction(
        session_id=result["session_id"],
        user_message=request.message,
        reply=result["reply"],
        agents_called=result["agents_called"]
    )
    return result


# --- Capture ---

@app.post("/capture")
async def capture_endpoint(request: CaptureRequest):
    logger.info(f"Capture request: {request.source_type}")
    try:
        result = await capture(
            source_type=request.source_type,
            url=request.url,
            content=request.content,
            preview=request.preview,
            user_id="demo_user"
        )
        if "error" in result:
            if "OPENAI_API_KEY" in str(result['error']) or "not found" in str(result['error']).lower():
                raise HTTPException(status_code=401, detail=result["error"])
            raise HTTPException(status_code=500, detail=result["error"])
        return result
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/capture/upload")
async def capture_upload_endpoint(file: UploadFile = File(...)):
    """Upload and capture a PDF file."""
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    try:
        pdf_bytes = await file.read()
        result = await capture(
            source_type="pdf",
            pdf_bytes=pdf_bytes,
            user_id="demo_user",
            preview=False
        )
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        return result
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- Memories ---

@app.post("/memories")
async def save_memory_endpoint(request: MemorySaveRequest):
    result = await save_memory(request.model_dump())
    if "error" in result:
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

@app.delete("/memories/{memory_id}")
async def delete_memory_endpoint(memory_id: str):
    try:
        return await delete_memory(memory_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.get("/memories/{memory_id}/flashcards")
async def get_flashcards_endpoint(memory_id: str):
    result = await generate_flashcards(memory_id)
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    return result


# --- Recall ---

@app.post("/recall")
async def recall_endpoint(request: RecallRequest):
    result = await recall(request.query)
    if isinstance(result, dict) and "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    return result


# --- Tasks ---

@app.post("/tasks")
async def create_task_endpoint(request: TaskCreateRequest):
    return await create_task(
        title=request.title,
        due_date=request.due_date,
        priority=request.priority,
        linked_memory_id=request.linked_memory_id
    )

@app.get("/tasks")
async def list_tasks_endpoint(status: str = "pending", limit: int = 20):
    return await list_tasks(status=status, limit=limit)

@app.post("/tasks/{task_id}/complete")
async def complete_task_endpoint(task_id: str):
    try:
        return await complete_task(task_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.delete("/tasks/{task_id}")
async def delete_task_endpoint(task_id: str):
    try:
        result = await delete_task(task_id)
        return {"success": True, "message": result}
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))


# --- Schedule ---

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
    return await list_upcoming_events(days=14)


# --- Study Plan & Briefing ---

@app.post("/study-plan")
async def study_plan_endpoint(request: StudyPlanRequest):
    result = await generate_study_plan(topic=request.topic, days=request.days)
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    return result

@app.get("/briefing")
async def briefing_endpoint():
    return await generate_daily_briefing()


# --- Stats & Logs ---

@app.get("/stats")
async def stats_endpoint():
    try:
        total_memories = await get_collection_count("memories")
        pending_tasks = await get_collection_count("tasks")
        total_interactions = await get_collection_count("interaction_logs")
        db = await get_db()
        memories_snapshot = await db.collection("memories").get()
        domains = {}
        for doc in memories_snapshot:
            data = doc.to_dict()
            domain = data.get("domain", "Other")
            domains[domain] = domains.get(domain, 0) + 1
        domain_list = [{"name": k, "value": v} for k, v in domains.items()]
        if not domain_list:
            domain_list = []
        return {
            "total_memories": total_memories,
            "pending_tasks": pending_tasks,
            "ai_interactions": total_interactions,
            "knowledge_domains": domain_list
        }
    except Exception as e:
        logger.error(f"Stats error: {e}")
        return {
            "total_memories": 0,
            "pending_tasks": 0,
            "ai_interactions": 0,
            "knowledge_domains": []
        }

@app.get("/logs")
async def list_logs_endpoint(limit: int = 10):
    try:
        db = await get_db()
        snapshot = await db.collection("interaction_logs").order_by("timestamp", direction="DESCENDING").limit(limit).get()
        results = []
        for doc in snapshot:
            d = doc.to_dict() | {"id": doc.id}
            if "timestamp" in d and hasattr(d["timestamp"], "isoformat"):
                d["timestamp"] = d["timestamp"].isoformat()
            results.append(d)
        return results
    except Exception as e:
        return []


# --- Static Files ---

dist_path = os.path.join(os.getcwd(), "dist")
if os.path.exists(dist_path):
    app.mount("/", StaticFiles(directory=dist_path, html=True), name="static")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        index_path = os.path.join(dist_path, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
        return JSONResponse(status_code=404, content={"error": "Not Found"})
else:
    @app.get("/")
    async def root():
        return {
            "name": "Recall X247",
            "version": "2.0.0",
            "status": "online",
            "ai_provider": "openai" if settings.using_openai else "gemini",
            "description": "AI-powered Second Brain — powered by OpenAI GPT"
        }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
