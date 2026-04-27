"""
Extras agent: notes, bookmarks, habits — lightweight CRUD modules
that store data in the same in-memory mock Firestore used by other agents.
"""
import datetime
import uuid
from typing import Optional, List, Dict, Any
from app.db import get_db


def _utcnow_iso() -> str:
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def _today_iso() -> str:
    return datetime.date.today().isoformat()


# ─── Notes ─────────────────────────────────────────────────────────────────────

async def list_notes(tag: str = "", limit: int = 50) -> List[dict]:
    db = await get_db()
    snapshot = await db.collection("notes").get()
    notes = []
    for doc in snapshot:
        d = doc.to_dict() | {"id": doc.id}
        if tag and tag not in (d.get("tags") or []):
            continue
        notes.append(d)
    notes.sort(key=lambda x: (not x.get("pinned", False), x.get("updated_at", "")), reverse=False)
    notes.sort(key=lambda x: x.get("updated_at", ""), reverse=True)
    notes.sort(key=lambda x: x.get("pinned", False), reverse=True)
    return notes[:limit]


async def create_note(title: str, content: str, tags: List[str], pinned: bool = False) -> dict:
    db = await get_db()
    note_id = str(uuid.uuid4())[:8]
    note = {
        "id": note_id,
        "title": title or "Untitled note",
        "content": content or "",
        "tags": tags or [],
        "pinned": bool(pinned),
        "created_at": _utcnow_iso(),
        "updated_at": _utcnow_iso(),
        "word_count": len((content or "").split()),
    }
    await db.collection("notes").document(note_id).set(note)
    return note


async def update_note(note_id: str, **fields) -> dict:
    db = await get_db()
    doc = await db.collection("notes").document(note_id).get()
    if not doc.exists:
        raise ValueError(f"Note {note_id} not found")
    existing = doc.to_dict()
    existing.update({k: v for k, v in fields.items() if v is not None})
    existing["updated_at"] = _utcnow_iso()
    if "content" in fields and fields["content"] is not None:
        existing["word_count"] = len(fields["content"].split())
    await db.collection("notes").document(note_id).set(existing)
    existing["id"] = note_id
    return existing


async def delete_note(note_id: str) -> dict:
    db = await get_db()
    doc = await db.collection("notes").document(note_id).get()
    if not doc.exists:
        raise ValueError(f"Note {note_id} not found")
    await db.collection("notes").document(note_id).delete()
    return {"success": True, "id": note_id}


# ─── Bookmarks ────────────────────────────────────────────────────────────────

async def list_bookmarks(status: str = "", limit: int = 100) -> List[dict]:
    db = await get_db()
    snapshot = await db.collection("bookmarks").get()
    items = []
    for doc in snapshot:
        d = doc.to_dict() | {"id": doc.id}
        if status and d.get("status") != status:
            continue
        items.append(d)
    items.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return items[:limit]


async def create_bookmark(url: str, title: str = "", description: str = "", tags: Optional[List[str]] = None) -> dict:
    db = await get_db()
    from urllib.parse import urlparse
    parsed = urlparse(url)
    domain = parsed.netloc.replace("www.", "") if parsed.netloc else "unknown"
    bm_id = str(uuid.uuid4())[:8]
    bm = {
        "id": bm_id,
        "url": url,
        "title": title or url,
        "description": description or "",
        "domain": domain,
        "tags": tags or [],
        "status": "unread",
        "created_at": _utcnow_iso(),
        "favicon": f"https://www.google.com/s2/favicons?domain={domain}&sz=64",
    }
    await db.collection("bookmarks").document(bm_id).set(bm)
    return bm


async def update_bookmark(bm_id: str, **fields) -> dict:
    db = await get_db()
    doc = await db.collection("bookmarks").document(bm_id).get()
    if not doc.exists:
        raise ValueError(f"Bookmark {bm_id} not found")
    existing = doc.to_dict()
    existing.update({k: v for k, v in fields.items() if v is not None})
    await db.collection("bookmarks").document(bm_id).set(existing)
    existing["id"] = bm_id
    return existing


async def delete_bookmark(bm_id: str) -> dict:
    db = await get_db()
    doc = await db.collection("bookmarks").document(bm_id).get()
    if not doc.exists:
        raise ValueError(f"Bookmark {bm_id} not found")
    await db.collection("bookmarks").document(bm_id).delete()
    return {"success": True, "id": bm_id}


# ─── Habits ───────────────────────────────────────────────────────────────────

async def list_habits() -> List[dict]:
    db = await get_db()
    snapshot = await db.collection("habits").get()
    habits = []
    for doc in snapshot:
        d = doc.to_dict() | {"id": doc.id}
        d["streak"] = _compute_streak(d.get("completions", []))
        d["completed_today"] = _today_iso() in (d.get("completions") or [])
        habits.append(d)
    habits.sort(key=lambda x: x.get("created_at", ""))
    return habits


def _compute_streak(completions: List[str]) -> int:
    if not completions:
        return 0
    completed = set(completions)
    streak = 0
    cur = datetime.date.today()
    while cur.isoformat() in completed:
        streak += 1
        cur -= datetime.timedelta(days=1)
    return streak


async def create_habit(name: str, icon: str = "Zap", color: str = "#10b981", goal: str = "daily") -> dict:
    db = await get_db()
    h_id = str(uuid.uuid4())[:8]
    habit = {
        "id": h_id,
        "name": name,
        "icon": icon,
        "color": color,
        "goal": goal,
        "completions": [],
        "created_at": _utcnow_iso(),
    }
    await db.collection("habits").document(h_id).set(habit)
    habit["streak"] = 0
    habit["completed_today"] = False
    return habit


async def toggle_habit(h_id: str, date_iso: str = "") -> dict:
    db = await get_db()
    doc = await db.collection("habits").document(h_id).get()
    if not doc.exists:
        raise ValueError(f"Habit {h_id} not found")
    h = doc.to_dict()
    target = date_iso or _today_iso()
    completions = list(h.get("completions") or [])
    if target in completions:
        completions.remove(target)
    else:
        completions.append(target)
    h["completions"] = completions
    await db.collection("habits").document(h_id).set(h)
    h["id"] = h_id
    h["streak"] = _compute_streak(completions)
    h["completed_today"] = _today_iso() in completions
    return h


async def delete_habit(h_id: str) -> dict:
    db = await get_db()
    doc = await db.collection("habits").document(h_id).get()
    if not doc.exists:
        raise ValueError(f"Habit {h_id} not found")
    await db.collection("habits").document(h_id).delete()
    return {"success": True, "id": h_id}


# ─── Demo seeds ───────────────────────────────────────────────────────────────

async def seed_extras():
    """Add a few starter notes, bookmarks, and habits if empty."""
    db = await get_db()

    notes_snap = await db.collection("notes").get()
    if not list(notes_snap):
        await create_note(
            "Hackathon Pitch — 30 second elevator",
            "# Recall X247\n\nThe second brain that thinks with you.\n\n- 7 specialist AI agents\n- Multi-modal capture (YouTube, web, PDF, voice)\n- Real-time orchestration with Gemini 2.0\n\n## Why now?\nGen AI APAC 2026 — agentic AI is the new OS.",
            ["pitch", "hackathon", "important"],
            pinned=True,
        )
        await create_note(
            "Daily reflection — what worked",
            "Three things that worked today:\n1. Time-blocking 90-min deep work sessions\n2. Capturing every idea into Recall before context-switching\n3. Reviewing agent workflow logs to improve prompts",
            ["reflection", "journal"],
        )
        await create_note(
            "Reading list — AI agents",
            "- ReAct paper (Yao et al)\n- Toolformer (Schick et al)\n- AutoGPT architecture review\n- Anthropic Constitutional AI\n- Google's Gemini technical report",
            ["ai", "reading"],
        )

    bm_snap = await db.collection("bookmarks").get()
    if not list(bm_snap):
        await create_bookmark("https://ai.google.dev/gemini-api/docs", "Gemini API Documentation", "Official docs for Gemini API integration", ["ai", "google", "docs"])
        await create_bookmark("https://platform.openai.com/docs", "OpenAI Platform Docs", "API reference for GPT-4o, embeddings, Whisper", ["ai", "openai", "docs"])
        await create_bookmark("https://www.anthropic.com/research", "Anthropic Research", "Latest research from Claude team", ["ai", "research"])
        await create_bookmark("https://news.ycombinator.com", "Hacker News", "Top tech and startup news", ["news", "tech"])

    h_snap = await db.collection("habits").get()
    if not list(h_snap):
        today = datetime.date.today()
        h1 = await create_habit("Capture 1 memory", "Database", "#00d4ff", "daily")
        h2 = await create_habit("Review flashcards", "Brain", "#a78bfa", "daily")
        h3 = await create_habit("Daily briefing", "Sun", "#f59e0b", "daily")
        h4 = await create_habit("Inbox zero", "CheckCircle2", "#10b981", "daily")
        # back-fill completions for streak realism
        for h_id in [h1["id"], h2["id"]]:
            doc = await db.collection("habits").document(h_id).get()
            data = doc.to_dict()
            data["completions"] = [(today - datetime.timedelta(days=i)).isoformat() for i in range(0, 7)]
            await db.collection("habits").document(h_id).set(data)
        for h_id in [h3["id"]]:
            doc = await db.collection("habits").document(h_id).get()
            data = doc.to_dict()
            data["completions"] = [(today - datetime.timedelta(days=i)).isoformat() for i in [1, 2, 4, 5]]
            await db.collection("habits").document(h_id).set(data)
