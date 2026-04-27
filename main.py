import os
import re
import time
import json
import uuid
import datetime
import logging
import asyncio
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException, Request, Body, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse, StreamingResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from app.config import settings
from app.db import get_db, log_interaction, get_collection_count
from app.coordinator import run_coordinator, run_coordinator_stream, clear_session_history, get_session_history
from app.capture_agent import capture, save_memory, generate_flashcards, generate_study_plan, generate_daily_briefing, auto_tag_memory, transcribe_audio, bundle_recent_activity, process_capture_session
from app.recall_agent import recall, list_memories, get_memory, delete_memory, get_stats
from app.task_agent import create_task, list_tasks, complete_task, get_tasks_summary, delete_task
from app.calendar_agent import create_event, list_upcoming_events, delete_event
from app.discover_agent import discover_resources
from app.plan_agent import generate_plan, GOAL_TYPES
from app.workspace_agent import (
    list_projects as ws_list_projects,
    get_project as ws_get_project,
    create_project as ws_create_project,
    update_project as ws_update_project,
    delete_project as ws_delete_project,
    add_items as ws_add_items,
    update_item as ws_update_item,
    remove_item as ws_remove_item,
    add_task as ws_add_task,
    toggle_task as ws_toggle_task,
    ai_organize_workspace as ws_ai_organize_workspace,
    apply_organization as ws_apply_organization,
    DEFAULT_SECTIONS as WS_DEFAULT_SECTIONS,
    ingest_plan as ws_ingest_plan,
    ai_organize_memories as ws_ai_organize_memories,
)
from app.workflow_engine import list_workflows, get_workflow, AGENT_REGISTRY
from app.extras_agent import (
    list_notes, create_note, update_note, delete_note,
    list_bookmarks, create_bookmark, update_bookmark, delete_bookmark,
    list_habits, create_habit, toggle_habit, delete_habit,
    seed_extras,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("recall-x247")

app = FastAPI(
    title="Recall X247 API",
    description="AI-powered Second Brain — powered by Google Gemini 2.0",
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
    # Rich analysis (optional — older clients still work)
    executive_summary: Optional[str] = ""
    action_items: Optional[List[str]] = None
    glossary: Optional[List[Dict[str, Any]]] = None
    study_questions: Optional[List[str]] = None
    notes: Optional[str] = ""
    # PDF-specific (optional)
    pdf_data: Optional[str] = None
    pdf_pages: Optional[int] = None
    pdf_size_kb: Optional[float] = None
    pdf_word_count: Optional[int] = None

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
    logger.info(f"Recall X247 v2.0 started. AI: {settings.ai_provider_name}. GCP Project: {settings.GCP_PROJECT_ID}")
    # Seed demo data so judges see a full brain immediately
    try:
        from app.demo_data import seed_demo_data
        db = await get_db()
        seeded = await seed_demo_data(db)
        if seeded:
            logger.info("Demo data seeded successfully.")
    except Exception as e:
        logger.warning(f"Demo seed skipped: {e}")
    try:
        await seed_extras()
        logger.info("Extras (notes, bookmarks, habits) seeded.")
    except Exception as e:
        logger.warning(f"Extras seed skipped: {e}")
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

def _settings_payload():
    return {
        "gen_apac_api_key_set": bool(settings.GEN_API_KEY),
        "openai_api_key_set": bool(settings.FALLBACK_AI_KEY or settings.OPENAI_API_KEY),
        "fallback_key_set": bool(settings.FALLBACK_AI_KEY),
        "openai_model": settings.OPENAI_MODEL,
        "gemini_api_key_set": bool(settings.GEMINI_API_KEY),
        "gemini_model": settings.GEMINI_MODEL,
        "ai_provider": "gemini" if settings.USE_GEMINI else ("openrouter" if settings.USE_OPENROUTER else "openai"),
        "ai_provider_name": settings.ai_provider_name,
        "fallback_provider": settings.FALLBACK_AI_MODEL if settings.has_fallback else None,
        "use_gemini": settings.USE_GEMINI,
        "use_openrouter": settings.USE_OPENROUTER,
        "openai_base_url": settings.openai_base_url,
        "gcp_project_id": settings.GCP_PROJECT_ID,
        "firestore_database_id": settings.FIREBASE_DATABASE_ID,
        "google_calendar_configured": bool(settings.GOOGLE_CALENDAR_ID),
        "status": "online"
    }

@app.get("/settings")
async def settings_endpoint():
    return _settings_payload()

@app.get("/config")
async def config_endpoint():
    """Alias for /settings — used by frontend to avoid SPA route conflict."""
    return _settings_payload()

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


@app.post("/agent/chat/clear")
async def agent_chat_clear(request: ChatRequest):
    """Wipe the in-memory chat history for a session — used by the 'New chat' button."""
    cleared = clear_session_history(request.session_id)
    return {"session_id": request.session_id, "cleared_messages": cleared}


@app.get("/agent/chat/history")
async def agent_chat_history(session_id: str = "agent-hub"):
    """Inspect current session history (debug)."""
    return {"session_id": session_id, "messages": get_session_history(session_id)}


@app.post("/agent/chat/stream")
async def agent_chat_stream(request: ChatRequest):
    """SSE streaming endpoint — yields agent events as they happen."""
    async def event_generator():
        try:
            async for event in run_coordinator_stream(request.message, request.session_id):
                yield event
        except asyncio.CancelledError:
            pass
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
        finally:
            yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive"
        }
    )


# --- Workflows ---

@app.get("/workflows")
async def list_workflows_endpoint(limit: int = 20):
    """List recent multi-agent workflows with execution trace."""
    return list_workflows(limit=limit)


@app.get("/workflows/{workflow_id}")
async def get_workflow_endpoint(workflow_id: str):
    """Get a specific workflow with full step details."""
    wf = get_workflow(workflow_id)
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return wf.to_dict()


# --- Agent Registry ---

@app.get("/agents")
async def list_agents_endpoint():
    """List all registered sub-agents with their capabilities."""
    return list(AGENT_REGISTRY.values())


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
async def capture_upload_endpoint(file: UploadFile = File(...), preview: bool = Query(False)):
    """Upload and capture a PDF file. Supports preview mode (preview=true) so the UI can show a confirm-before-save card."""
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    try:
        pdf_bytes = await file.read()
        result = await capture(
            source_type="pdf",
            pdf_bytes=pdf_bytes,
            user_id="demo_user",
            preview=preview,
        )
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        # Pass through original filename for nicer UI titles
        if isinstance(result, dict) and not result.get("title", "").strip().lower().startswith(file.filename.lower()[:6]):
            result.setdefault("source_filename", file.filename)
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

@app.post("/memories/{memory_id}/share")
async def share_memory_endpoint(memory_id: str):
    """Mark a memory as publicly shareable; returns a shareable token-style id."""
    db = await get_db()
    doc = await db.collection("memories").document(memory_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Memory not found")
    mem = doc.to_dict()
    share_token = mem.get("share_token") or uuid.uuid4().hex[:14]
    shared_at = datetime.datetime.now(datetime.timezone.utc).isoformat()
    await db.collection("memories").document(memory_id).update({
        "share_token": share_token,
        "shared_at": shared_at,
        "public": True,
    })
    return {"id": memory_id, "share_token": share_token, "public_url": f"/share/{share_token}"}

@app.post("/memories/{memory_id}/unshare")
async def unshare_memory_endpoint(memory_id: str):
    db = await get_db()
    doc = await db.collection("memories").document(memory_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Memory not found")
    await db.collection("memories").document(memory_id).update({"public": False})
    return {"id": memory_id, "public": False}

@app.get("/share/{share_token}")
async def get_shared_memory_endpoint(share_token: str):
    """Public read-only view of a shared memory — no auth required."""
    db = await get_db()
    snap = await db.collection("memories").get()
    for doc in snap:
        d = doc.to_dict()
        if d.get("share_token") == share_token and d.get("public"):
            return {
                "id": doc.id,
                "title": d.get("title"),
                "summary": d.get("summary"),
                "key_points": d.get("key_points", []),
                "tags": d.get("tags", []),
                "domain": d.get("domain"),
                "source_type": d.get("source_type"),
                "source_url": d.get("source_url"),
                "created_at": d.get("created_at"),
                "shared_at": d.get("shared_at"),
            }
    raise HTTPException(status_code=404, detail="Shared memory not found or has been unshared")

@app.post("/memories/{memory_id}/auto-tag")
async def auto_tag_endpoint(memory_id: str):
    result = await auto_tag_memory(memory_id)
    if result.get("error") == "Memory not found":
        raise HTTPException(status_code=404, detail="Memory not found")
    if "error" in result and not result.get("tags"):
        raise HTTPException(status_code=500, detail=result["error"])
    return result

@app.post("/capture/voice")
async def capture_voice_endpoint(file: UploadFile = File(...)):
    """Accept an audio upload, transcribe it, and run capture pipeline on the text."""
    audio_bytes = await file.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio")
    transcript = await transcribe_audio(audio_bytes, mime=file.content_type or "audio/webm")
    if not transcript or transcript.startswith("[Transcription failed"):
        return {"transcript": transcript or "", "memory": None, "error": "Transcription failed"}
    # Transcription-only: frontend separately POSTs /capture as a note for analysis.
    result = {"transcript": transcript, "memory": None}
    return result


# --- Time Capture (capture-my-last-N-hours bundle) ---

class TimeBundleRequest(BaseModel):
    hours: int = 6  # 1..48, typically 6 or 24


@app.post("/capture/time-bundle")
async def capture_time_bundle_endpoint(request: TimeBundleRequest):
    """Sweep recent memories from the last N hours, dedupe vs prior bundles,
    and create a Workspace project with AI-organized folders + summary."""
    if request.hours < 1 or request.hours > 48:
        raise HTTPException(status_code=400, detail="hours must be between 1 and 48")
    result = await bundle_recent_activity(hours=request.hours)
    return result


# --- Multi-Source Capture Session ---
# Tray of mixed inputs (notes, links, voice transcripts, images) committed in
# one shot into a workspace folder. Folder mode picks how the destination is
# resolved: 'auto' (AI names a fresh workspace), 'create' (caller provides
# name → new workspace), 'existing' (caller provides project_id).

class CaptureSessionItem(BaseModel):
    kind: str  # note | link | voice | image
    content: Optional[str] = ""
    url: Optional[str] = ""
    transcript: Optional[str] = ""
    caption: Optional[str] = ""
    ocr_text: Optional[str] = ""
    data_url: Optional[str] = ""  # for image kind
    title: Optional[str] = ""
    alt: Optional[str] = ""


class CaptureSessionRequest(BaseModel):
    items: List[CaptureSessionItem]
    folder_mode: str = "auto"  # 'auto' | 'create' | 'existing'
    folder_name: Optional[str] = ""
    project_id: Optional[str] = ""
    hint: Optional[str] = ""


@app.post("/capture/session")
async def capture_session_endpoint(request: CaptureSessionRequest):
    """Commit a multi-source capture tray as one workspace bundle."""
    if not request.items:
        raise HTTPException(status_code=400, detail="At least one item is required.")
    if request.folder_mode not in {"auto", "create", "existing"}:
        raise HTTPException(status_code=400, detail="folder_mode must be 'auto', 'create', or 'existing'")
    if request.folder_mode == "existing" and not (request.project_id or "").strip():
        raise HTTPException(status_code=400, detail="project_id is required when folder_mode='existing'")
    if request.folder_mode == "create" and not (request.folder_name or "").strip():
        raise HTTPException(status_code=400, detail="folder_name is required when folder_mode='create'")
    items = [i.model_dump() for i in request.items]
    result = await process_capture_session(
        items=items,
        folder_mode=request.folder_mode,
        folder_name=request.folder_name or "",
        project_id=request.project_id or "",
        hint=request.hint or "",
    )
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


class StudyPlanDay(BaseModel):
    day: Optional[int] = None
    date: str
    title: Optional[str] = ""
    duration_minutes: Optional[int] = 60
    activities: Optional[List[str]] = None


class StudyPlanSaveRequest(BaseModel):
    topic: str = ""
    plan: List[StudyPlanDay]
    create_events: bool = True
    create_tasks: bool = True
    start_time: str = "18:00"


_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
_TIME_RE = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")


@app.post("/study-plan/save")
async def study_plan_save_endpoint(request: StudyPlanSaveRequest):
    """Persist a generated plan: create one calendar event + one task per day.
    Atomic at application level: pre-validates everything, then on any failure
    compensates by deleting what was already created and surfaces an error."""
    if not request.plan:
        raise HTTPException(status_code=400, detail="plan is required")
    if not (request.create_events or request.create_tasks):
        raise HTTPException(status_code=400, detail="at least one of create_events or create_tasks must be true")
    if not _TIME_RE.match(request.start_time or ""):
        raise HTTPException(status_code=400, detail="start_time must be HH:MM (24h)")

    topic_label = (request.topic or "Study Plan").strip()
    normalized: List[Dict[str, Any]] = []
    for idx, day in enumerate(request.plan):
        date_str = (day.date or "").strip()[:10]
        if not _DATE_RE.match(date_str):
            raise HTTPException(status_code=400, detail=f"plan[{idx}].date must be YYYY-MM-DD (got: {day.date!r})")
        try:
            datetime.datetime.fromisoformat(date_str)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"plan[{idx}].date is not a valid calendar date")
        try:
            duration = int(day.duration_minutes or 60)
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail=f"plan[{idx}].duration_minutes must be an integer")
        if duration <= 0 or duration > 24 * 60:
            raise HTTPException(status_code=400, detail=f"plan[{idx}].duration_minutes must be 1..1440")
        title = (day.title or f"Day {day.day or idx + 1} — {topic_label}").strip()
        activities = [a for a in (day.activities or []) if isinstance(a, str) and a.strip()]
        normalized.append({"date": date_str, "title": title, "duration": duration, "activities": activities})

    created_events: List[dict] = []
    created_tasks: List[dict] = []
    try:
        for d in normalized:
            description = " | ".join(d["activities"][:4]) if d["activities"] else ""
            if request.create_events:
                ev = await create_event(
                    title=f"[{topic_label}] {d['title']}",
                    date=d["date"],
                    time=request.start_time,
                    duration_minutes=d["duration"],
                )
                if not isinstance(ev, dict) or not ev.get("id"):
                    raise RuntimeError(f"create_event returned no id for {d['date']}")
                created_events.append(ev)
            if request.create_tasks:
                tk = await create_task(
                    title=f"{d['title']} ({d['duration']}m)" + (f" — {description}" if description else ""),
                    due_date=d["date"],
                    priority="medium",
                )
                if not isinstance(tk, dict) or not tk.get("id"):
                    raise RuntimeError(f"create_task returned no id for {d['date']}")
                created_tasks.append(tk)
    except Exception as e:
        logger.warning(f"study-plan/save failed mid-flight, compensating: {e}")
        for ev in created_events:
            try:
                await delete_event(ev.get("id"))
            except Exception as ce:
                logger.error(f"compensation delete_event failed: {ce}")
        for tk in created_tasks:
            try:
                await delete_task(tk.get("id"))
            except Exception as ce:
                logger.error(f"compensation delete_task failed: {ce}")
        raise HTTPException(status_code=500, detail=f"Save failed and was rolled back: {e}")

    return {
        "topic": topic_label,
        "events_created": len(created_events),
        "tasks_created": len(created_tasks),
        "events": created_events,
        "tasks": created_tasks,
    }


# --- Discover external resources ---

class DiscoverRequest(BaseModel):
    topic: str
    kinds: Optional[List[str]] = None


@app.post("/discover")
async def discover_endpoint(request: DiscoverRequest):
    if not (request.topic or "").strip():
        raise HTTPException(status_code=400, detail="topic is required")
    result = await discover_resources(topic=request.topic, kinds=request.kinds)
    if "error" in result and not result.get("items"):
        raise HTTPException(status_code=502, detail=result["error"])
    return result


class DiscoverDigestRequest(BaseModel):
    topic: str
    items: List[Dict[str, Any]]


@app.post("/discover/digest")
async def discover_digest_endpoint(request: DiscoverDigestRequest):
    """Synthesize a one-shot AI brief over a list of discover items."""
    if not (request.topic or "").strip():
        raise HTTPException(status_code=400, detail="topic is required")
    if not request.items:
        raise HTTPException(status_code=400, detail="items required")
    from app.discover_agent import synthesize_digest
    result = await synthesize_digest(topic=request.topic, items=request.items[:10])
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    return result


# --- Plan Generator (multi-agent) ---

class PlanGenerateRequest(BaseModel):
    topic: str
    goal_type: str = "study"
    days: int = 7
    minutes_per_day: int = 60
    include_resources: bool = True


@app.get("/plan/goal-types")
async def plan_goal_types():
    return {
        "goal_types": [
            {"id": k, "label": v["label"], "verb": v["verb"], "lens": v["lens"]}
            for k, v in GOAL_TYPES.items()
        ]
    }


@app.post("/plan/generate")
async def plan_generate_endpoint(request: PlanGenerateRequest):
    if not (request.topic or "").strip():
        raise HTTPException(status_code=400, detail="topic is required")
    result = await generate_plan(
        topic=request.topic,
        goal_type=request.goal_type,
        days=request.days,
        minutes_per_day=request.minutes_per_day,
        include_resources=request.include_resources,
    )
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    return result


class PlanIngestRequest(BaseModel):
    plan: Dict[str, Any]
    project_name: Optional[str] = None


@app.post("/plan/save-to-workspace")
async def plan_save_to_workspace(request: PlanIngestRequest):
    if not request.plan or not isinstance(request.plan, dict):
        raise HTTPException(status_code=400, detail="plan is required")
    project = await ws_ingest_plan(request.plan, project_name=request.project_name)
    return project


class PlanRegenerateDayRequest(BaseModel):
    topic: str
    day_index: int  # zero-based
    plan: List[Dict[str, Any]]
    goal_type: str = "study"
    minutes_per_day: int = 60


@app.post("/plan/regenerate-day")
async def plan_regenerate_day_endpoint(request: PlanRegenerateDayRequest):
    if not (request.topic or "").strip():
        raise HTTPException(status_code=400, detail="topic is required")
    if request.day_index < 0 or request.day_index >= len(request.plan or []):
        raise HTTPException(status_code=400, detail="day_index out of range")
    from app.plan_agent import regenerate_day
    result = await regenerate_day(
        topic=request.topic,
        day_index=request.day_index,
        plan=request.plan,
        goal_type=request.goal_type,
        minutes_per_day=request.minutes_per_day,
    )
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    return result


# --- Workspace projects (CRUD + items + tasks) ---

class WorkspaceProjectCreate(BaseModel):
    name: str
    description: str = ""
    color: Optional[str] = None
    goal_type: str = "general"
    folders: Optional[List[Dict[str, Any]]] = None


class WorkspaceProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    goal_type: Optional[str] = None
    folders: Optional[List[Dict[str, Any]]] = None


class WorkspaceItemsAdd(BaseModel):
    items: List[Dict[str, Any]]
    folder_id: Optional[str] = None
    section_id: Optional[str] = None


class WorkspaceItemUpdate(BaseModel):
    section_id: Optional[str] = None
    tags: Optional[List[str]] = None
    group_id: Optional[str] = None
    folder_id: Optional[str] = None


class WorkspaceTaskCreate(BaseModel):
    text: str
    folder_id: Optional[str] = None


class WorkspaceOrganizeApply(BaseModel):
    assignments: List[Dict[str, Any]]
    groups: List[Dict[str, Any]] = []


@app.get("/workspace/projects")
async def ws_projects_list():
    return {"projects": await ws_list_projects()}


@app.post("/workspace/projects")
async def ws_projects_create(req: WorkspaceProjectCreate):
    if not (req.name or "").strip():
        raise HTTPException(status_code=400, detail="name is required")
    return await ws_create_project(
        name=req.name, description=req.description, color=req.color,
        goal_type=req.goal_type, folders=req.folders,
    )


@app.get("/workspace/projects/{project_id}")
async def ws_projects_get(project_id: str):
    p = await ws_get_project(project_id)
    if not p:
        raise HTTPException(status_code=404, detail="project not found")
    return p


@app.patch("/workspace/projects/{project_id}")
async def ws_projects_update(project_id: str, req: WorkspaceProjectUpdate):
    try:
        return await ws_update_project(project_id, **req.model_dump(exclude_none=True))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.delete("/workspace/projects/{project_id}")
async def ws_projects_delete(project_id: str):
    ok = await ws_delete_project(project_id)
    if not ok:
        raise HTTPException(status_code=404, detail="project not found")
    return {"deleted": True, "id": project_id}


@app.post("/workspace/projects/{project_id}/items")
async def ws_items_add(project_id: str, req: WorkspaceItemsAdd):
    if not req.items:
        raise HTTPException(status_code=400, detail="items required")
    try:
        return await ws_add_items(project_id, req.items, folder_id=req.folder_id, section_id=req.section_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.patch("/workspace/projects/{project_id}/items/{item_id}")
async def ws_items_update(project_id: str, item_id: str, req: WorkspaceItemUpdate):
    try:
        return await ws_update_item(
            project_id, item_id,
            section_id=req.section_id, tags=req.tags,
            group_id=req.group_id, folder_id=req.folder_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.delete("/workspace/projects/{project_id}/items/{item_id}")
async def ws_items_remove(project_id: str, item_id: str):
    ok = await ws_remove_item(project_id, item_id)
    if not ok:
        raise HTTPException(status_code=404, detail="item not found")
    return {"deleted": True, "id": item_id}


@app.get("/workspace/sections")
async def ws_sections_catalog():
    """Static catalog of default sections for client UIs that want to render
    consistent labels/icons before any folder is created."""
    return {"sections": list(WS_DEFAULT_SECTIONS)}


@app.post("/workspace/projects/{project_id}/tasks")
async def ws_tasks_add(project_id: str, req: WorkspaceTaskCreate):
    if not (req.text or "").strip():
        raise HTTPException(status_code=400, detail="text required")
    try:
        return await ws_add_task(project_id, text=req.text, folder_id=req.folder_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.post("/workspace/projects/{project_id}/tasks/{task_id}/toggle")
async def ws_tasks_toggle(project_id: str, task_id: str):
    try:
        return await ws_toggle_task(project_id, task_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.post("/workspace/projects/{project_id}/ai-organize")
async def ws_ai_organize(project_id: str):
    proj = await ws_get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="project not found")
    mems = await list_memories(domain="", limit=30)
    return await ws_ai_organize_memories(project_id, mems if isinstance(mems, list) else [])


@app.post("/workspace/projects/{project_id}/ai-organize-full")
async def ws_ai_organize_full(project_id: str, folder_id: Optional[str] = None):
    """Comprehensive AI organize: assigns sections, tags (5-7 per item), and
    clusters similar items into groups. Returns a PREVIEW — caller applies
    via POST /apply-organization."""
    proj = await ws_get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="project not found")
    return await ws_ai_organize_workspace(project_id, folder_id=folder_id)


@app.post("/workspace/projects/{project_id}/apply-organization")
async def ws_apply_organize(project_id: str, req: WorkspaceOrganizeApply):
    try:
        return await ws_apply_organization(project_id, req.assignments, req.groups)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# --- Insight extraction (AI layer over a folder/project) ---

class InsightApplyRequest(BaseModel):
    insight: Dict[str, Any]
    action: Dict[str, Any]


@app.post("/workspace/projects/{project_id}/extract-insights")
async def ws_extract_insights(project_id: str, folder_id: Optional[str] = None):
    """Scan a folder (or whole project when folder_id omitted) and return
    AI-extracted insights with auto priority + meaningful suggested actions."""
    from app.insight_agent import extract_insights
    result = await extract_insights(project_id, folder_id)
    if not result.get("ok") and result.get("error") == "project not found":
        raise HTTPException(status_code=404, detail="project not found")
    return result


@app.post("/workspace/projects/{project_id}/insights/apply")
async def ws_apply_insight(project_id: str, req: InsightApplyRequest):
    """Execute one suggested action (add_task | create_plan | save_to_memory)
    by routing to the existing task / plan / memory subsystems."""
    from app.insight_agent import apply_insight_action
    result = await apply_insight_action(project_id, req.insight, req.action)
    if not result.get("ok"):
        raise HTTPException(status_code=400, detail=result.get("error", "apply failed"))
    return result


# --- Calendar ICS subscription feed ---

def _ics_escape(text: str) -> str:
    """Escape per RFC 5545: backslash, comma, semicolon, newline. Strip CR and other
    control chars first to prevent header/property injection via CRLF."""
    s = text or ""
    s = s.replace("\r\n", "\n").replace("\r", "\n")
    s = "".join(ch for ch in s if ch == "\n" or ch == "\t" or ord(ch) >= 0x20)
    return s.replace("\\", "\\\\").replace(",", "\\,").replace(";", "\\;").replace("\n", "\\n")


def _ics_dt(date_str: str, time_str: str = "09:00") -> str:
    try:
        d = datetime.datetime.fromisoformat(f"{date_str}T{time_str}:00")
        return d.strftime("%Y%m%dT%H%M%S")
    except Exception:
        return datetime.datetime.now().strftime("%Y%m%dT%H%M%S")


@app.get("/calendar.ics")
async def calendar_ics():
    """Read-only iCal feed of upcoming events + open tasks. Subscribe in Google/Apple/Outlook."""
    events = await list_upcoming_events(days=180)
    open_tasks = await list_tasks(status="pending", limit=100)
    now_stamp = datetime.datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")

    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Recall X247//AI Second Brain//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "X-WR-CALNAME:Recall X247",
        "X-WR-CALDESC:Events and tasks from your AI Second Brain",
    ]

    for ev in events or []:
        if not isinstance(ev, dict):
            continue
        eid = ev.get("id") or str(uuid.uuid4())
        title = ev.get("title") or "Event"
        date_s = ev.get("date") or ""
        time_s = ev.get("time") or "09:00"
        dur = int(ev.get("duration_minutes") or 60)
        if not date_s:
            continue
        start = _ics_dt(date_s, time_s)
        try:
            start_dt = datetime.datetime.strptime(start, "%Y%m%dT%H%M%S")
            end_dt = start_dt + datetime.timedelta(minutes=dur)
            end = end_dt.strftime("%Y%m%dT%H%M%S")
        except Exception:
            end = start
        lines += [
            "BEGIN:VEVENT",
            f"UID:{eid}@recall-x247",
            f"DTSTAMP:{now_stamp}",
            f"DTSTART:{start}",
            f"DTEND:{end}",
            f"SUMMARY:{_ics_escape(title)}",
            f"DESCRIPTION:{_ics_escape('Event from Recall X247')}",
            "END:VEVENT",
        ]

    for tk in open_tasks or []:
        if not isinstance(tk, dict):
            continue
        tid = tk.get("id") or str(uuid.uuid4())
        title = tk.get("title") or "Task"
        due = tk.get("due_date") or ""
        if not due:
            continue
        try:
            d = datetime.datetime.fromisoformat(due[:10])
            dval = d.strftime("%Y%m%d")
        except Exception:
            continue
        lines += [
            "BEGIN:VTODO",
            f"UID:t-{tid}@recall-x247",
            f"DTSTAMP:{now_stamp}",
            f"DUE;VALUE=DATE:{dval}",
            f"SUMMARY:{_ics_escape('[Task] ' + title)}",
            f"PRIORITY:{5 if tk.get('priority') == 'medium' else (3 if tk.get('priority') == 'high' else 7)}",
            "STATUS:NEEDS-ACTION",
            "END:VTODO",
        ]

    lines.append("END:VCALENDAR")
    body = "\r\n".join(lines) + "\r\n"
    return Response(content=body, media_type="text/calendar; charset=utf-8", headers={
        "Content-Disposition": 'inline; filename="recall-x247.ics"',
        "Cache-Control": "no-cache",
    })

_BRIEFING_CACHE: Dict[str, Any] = {"data": None, "expires_at": 0.0}

@app.get("/briefing")
async def briefing_endpoint(force: bool = False):
    """Daily AI briefing — cached for 5 minutes to avoid hammering AI provider."""
    now_ts = time.time()
    cached = _BRIEFING_CACHE.get("data")
    if not force and cached and now_ts < _BRIEFING_CACHE.get("expires_at", 0):
        return cached
    result = await generate_daily_briefing()
    _BRIEFING_CACHE["data"] = result
    _BRIEFING_CACHE["expires_at"] = now_ts + 300  # 5 minutes
    return result


# --- Notes ---

class NoteCreateRequest(BaseModel):
    title: Optional[str] = "Untitled note"
    content: Optional[str] = ""
    tags: Optional[List[str]] = []
    pinned: Optional[bool] = False

class NoteUpdateRequest(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    tags: Optional[List[str]] = None
    pinned: Optional[bool] = None

@app.get("/notes")
async def list_notes_endpoint(tag: str = "", limit: int = 50):
    return await list_notes(tag=tag, limit=limit)

@app.post("/notes")
async def create_note_endpoint(req: NoteCreateRequest):
    return await create_note(title=req.title or "Untitled note", content=req.content or "", tags=req.tags or [], pinned=bool(req.pinned))

@app.put("/notes/{note_id}")
async def update_note_endpoint(note_id: str, req: NoteUpdateRequest):
    try:
        return await update_note(note_id, **req.model_dump(exclude_unset=True))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.delete("/notes/{note_id}")
async def delete_note_endpoint(note_id: str):
    try:
        return await delete_note(note_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# --- Bookmarks ---

class BookmarkCreateRequest(BaseModel):
    url: str
    title: Optional[str] = ""
    description: Optional[str] = ""
    tags: Optional[List[str]] = []

class BookmarkUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    status: Optional[str] = None

@app.get("/bookmarks")
async def list_bookmarks_endpoint(status: str = "", limit: int = 100):
    return await list_bookmarks(status=status, limit=limit)

@app.post("/bookmarks")
async def create_bookmark_endpoint(req: BookmarkCreateRequest):
    return await create_bookmark(url=req.url, title=req.title or "", description=req.description or "", tags=req.tags or [])

@app.put("/bookmarks/{bm_id}")
async def update_bookmark_endpoint(bm_id: str, req: BookmarkUpdateRequest):
    try:
        return await update_bookmark(bm_id, **req.model_dump(exclude_unset=True))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.delete("/bookmarks/{bm_id}")
async def delete_bookmark_endpoint(bm_id: str):
    try:
        return await delete_bookmark(bm_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# --- Habits ---

class HabitCreateRequest(BaseModel):
    name: str
    icon: Optional[str] = "Zap"
    color: Optional[str] = "#10b981"
    goal: Optional[str] = "daily"

@app.get("/habits")
async def list_habits_endpoint():
    return await list_habits()

@app.post("/habits")
async def create_habit_endpoint(req: HabitCreateRequest):
    return await create_habit(name=req.name, icon=req.icon or "Zap", color=req.color or "#10b981", goal=req.goal or "daily")

@app.post("/habits/{h_id}/toggle")
async def toggle_habit_endpoint(h_id: str, date: str = ""):
    try:
        return await toggle_habit(h_id, date_iso=date)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.delete("/habits/{h_id}")
async def delete_habit_endpoint(h_id: str):
    try:
        return await delete_habit(h_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# --- Stats & Logs ---

@app.get("/export/vault")
async def export_vault():
    """Export entire knowledge vault as a Markdown file for download."""
    try:
        db = await get_db()
        memories_snapshot = await db.collection("memories").get()
        memories = [doc.to_dict() | {"id": doc.id} for doc in memories_snapshot]

        lines = [
            "# 🧠 Recall X247 — Knowledge Vault Export",
            f"> Exported on {datetime.datetime.now().strftime('%B %d, %Y at %H:%M')}",
            f"> Total memories: {len(memories)}",
            "",
            "---",
            ""
        ]
        by_domain: dict = {}
        for m in memories:
            d = m.get("domain", "Other")
            by_domain.setdefault(d, []).append(m)

        for domain, items in sorted(by_domain.items()):
            lines.append(f"## {domain} ({len(items)} memories)")
            lines.append("")
            for m in items:
                created = m.get("created_at", "")
                if hasattr(created, "isoformat"):
                    created = created.isoformat()[:10]
                elif isinstance(created, str):
                    created = created[:10]
                lines.append(f"### {m.get('title', 'Untitled')}")
                lines.append(f"**Source:** {m.get('source_type', '').title()} | **Date:** {created}")
                if m.get("source_url"):
                    lines.append(f"**URL:** {m.get('source_url')}")
                lines.append("")
                lines.append(f"**Summary:** {m.get('summary', '')}")
                lines.append("")
                if m.get("key_points"):
                    lines.append("**Key Points:**")
                    for kp in m["key_points"]:
                        lines.append(f"- {kp}")
                if m.get("tags"):
                    lines.append(f"\n**Tags:** {', '.join('#' + t for t in m['tags'])}")
                lines.append("")
                lines.append("---")
                lines.append("")

        content = "\n".join(lines)
        from fastapi.responses import Response
        return Response(
            content=content,
            media_type="text/markdown",
            headers={"Content-Disposition": 'attachment; filename="recall-x247-vault.md"'}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")


@app.get("/stats")
async def stats_endpoint():
    try:
        from datetime import date
        total_interactions = await get_collection_count("interaction_logs")
        db = await get_db()

        # Memories: count + domains + captured today
        memories_snapshot = await db.collection("memories").get()
        domains = {}
        captured_today = 0
        today_str = date.today().isoformat()
        for doc in memories_snapshot:
            data = doc.to_dict()
            domain = data.get("domain", "Other")
            domains[domain] = domains.get(domain, 0) + 1
            created = data.get("created_at", "")
            if created and str(created)[:10] == today_str:
                captured_today += 1
        total_memories = len(memories_snapshot)
        domain_list = [{"name": k, "value": v} for k, v in domains.items()]

        # Tasks: count only pending ones
        pending_tasks_list = await list_tasks(status="pending", limit=200)
        pending_tasks = len(pending_tasks_list)

        return {
            "total_memories": total_memories,
            "pending_tasks": pending_tasks,
            "ai_interactions": total_interactions,
            "knowledge_domains": domain_list,
            "captured_today": captured_today,
            "flashcards": total_memories,
            "streak_days": 0,
            "focus_sessions": 0,
        }
    except Exception as e:
        logger.error(f"Stats error: {e}")
        return {
            "total_memories": 0,
            "pending_tasks": 0,
            "ai_interactions": 0,
            "knowledge_domains": [],
            "captured_today": 0,
            "flashcards": 0,
            "streak_days": 0,
            "focus_sessions": 0,
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
