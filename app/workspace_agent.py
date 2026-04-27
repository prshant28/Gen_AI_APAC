"""
Workspace Agent — projects/folders for organizing memories, tasks, plans.

Stores in the same in-memory mock Firestore via app.db. Each project owns:
    - id, name, color, description, goal_type, created_at, updated_at
    - folders: [{ id, name, description }]
    - items: [{ id, kind, ref_id, title, url, folder_id, added_at, meta }]
        kind = "memory" | "task" | "plan_day" | "resource"
    - tasks: [{ id, text, done, created_at }]

Also includes an AI-organize helper that buckets memories into suggested folders.
"""
from __future__ import annotations

import datetime
import json
import logging
import re
import uuid
from typing import List, Dict, Any, Optional

from app.db import get_db
from app.config import settings
from app.ai_helper import chat_json

logger = logging.getLogger("recall-x247.workspace")


PROJECT_COLORS = ["#3b82f6", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#7c3aed"]


def _utcnow_iso() -> str:
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def _short_id(prefix: str = "ws") -> str:
    return f"{prefix}_{uuid.uuid4().hex[:10]}"


def _slug(s: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", (s or "").lower()).strip("-")
    return s[:48] or "folder"


def _color_for(idx: int) -> str:
    return PROJECT_COLORS[idx % len(PROJECT_COLORS)]


# ─── CRUD ─────────────────────────────────────────────────────────────────────

async def list_projects() -> List[Dict[str, Any]]:
    db = await get_db()
    snap = await db.collection("workspace_projects").get()
    out: List[Dict[str, Any]] = []
    for doc in snap:
        d = doc.to_dict() | {"id": doc.id}
        out.append(d)
    out.sort(key=lambda p: p.get("updated_at") or "", reverse=True)
    return out


async def get_project(project_id: str) -> Optional[Dict[str, Any]]:
    db = await get_db()
    doc = await db.collection("workspace_projects").document(project_id).get()
    if not doc.exists:
        return None
    return doc.to_dict() | {"id": doc.id}


async def create_project(
    name: str,
    description: str = "",
    color: Optional[str] = None,
    goal_type: str = "general",
    folders: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    db = await get_db()
    existing = await list_projects()
    pid = _short_id("ws")
    project = {
        "id": pid,
        "name": (name or "Untitled project").strip()[:80],
        "description": (description or "").strip()[:240],
        "color": color or _color_for(len(existing)),
        "goal_type": goal_type or "general",
        "folders": folders or [],
        "items": [],
        "tasks": [],
        "created_at": _utcnow_iso(),
        "updated_at": _utcnow_iso(),
    }
    await db.collection("workspace_projects").document(pid).set(project)
    return project


async def update_project(project_id: str, **fields) -> Dict[str, Any]:
    db = await get_db()
    doc = await db.collection("workspace_projects").document(project_id).get()
    if not doc.exists:
        raise ValueError("Project not found")
    data = doc.to_dict()
    for k, v in fields.items():
        if v is not None and k in {"name", "description", "color", "goal_type", "folders"}:
            data[k] = v
    data["updated_at"] = _utcnow_iso()
    await db.collection("workspace_projects").document(project_id).set(data)
    return data | {"id": project_id}


async def delete_project(project_id: str) -> bool:
    db = await get_db()
    doc = await db.collection("workspace_projects").document(project_id).get()
    if not doc.exists:
        return False
    await db.collection("workspace_projects").document(project_id).delete()
    return True


# ─── Items (memories, resources, plan-days, tasks) ────────────────────────────

async def add_items(project_id: str, items: List[Dict[str, Any]], folder_id: Optional[str] = None) -> Dict[str, Any]:
    db = await get_db()
    doc = await db.collection("workspace_projects").document(project_id).get()
    if not doc.exists:
        raise ValueError("Project not found")
    data = doc.to_dict()
    cur_items = data.get("items") or []
    added = 0
    for it in items:
        new = {
            "id": _short_id("itm"),
            "kind": it.get("kind") or "resource",
            "ref_id": it.get("ref_id") or it.get("id") or "",
            "title": (it.get("title") or "Untitled")[:160],
            "url": it.get("url") or "",
            "folder_id": folder_id or it.get("folder_id") or "",
            "added_at": _utcnow_iso(),
            "meta": it.get("meta") or {},
        }
        cur_items.append(new)
        added += 1
    data["items"] = cur_items
    data["updated_at"] = _utcnow_iso()
    await db.collection("workspace_projects").document(project_id).set(data)
    return {"project_id": project_id, "added": added, "total_items": len(cur_items)}


async def remove_item(project_id: str, item_id: str) -> bool:
    db = await get_db()
    doc = await db.collection("workspace_projects").document(project_id).get()
    if not doc.exists:
        return False
    data = doc.to_dict()
    before = len(data.get("items") or [])
    data["items"] = [i for i in (data.get("items") or []) if i.get("id") != item_id]
    if len(data["items"]) == before:
        return False
    data["updated_at"] = _utcnow_iso()
    await db.collection("workspace_projects").document(project_id).set(data)
    return True


async def add_task(project_id: str, text: str, folder_id: Optional[str] = None) -> Dict[str, Any]:
    db = await get_db()
    doc = await db.collection("workspace_projects").document(project_id).get()
    if not doc.exists:
        raise ValueError("Project not found")
    data = doc.to_dict()
    task = {
        "id": _short_id("tk"),
        "text": (text or "")[:240],
        "folder_id": folder_id or "",
        "done": False,
        "created_at": _utcnow_iso(),
    }
    data["tasks"] = (data.get("tasks") or []) + [task]
    data["updated_at"] = _utcnow_iso()
    await db.collection("workspace_projects").document(project_id).set(data)
    return task


async def toggle_task(project_id: str, task_id: str) -> Dict[str, Any]:
    db = await get_db()
    doc = await db.collection("workspace_projects").document(project_id).get()
    if not doc.exists:
        raise ValueError("Project not found")
    data = doc.to_dict()
    tasks = data.get("tasks") or []
    found = None
    for t in tasks:
        if t.get("id") == task_id:
            t["done"] = not bool(t.get("done"))
            found = t
            break
    if not found:
        raise ValueError("Task not found")
    data["tasks"] = tasks
    data["updated_at"] = _utcnow_iso()
    await db.collection("workspace_projects").document(project_id).set(data)
    return found


# ─── Plan → Workspace ingest ──────────────────────────────────────────────────

async def ingest_plan(plan_payload: Dict[str, Any], project_name: Optional[str] = None) -> Dict[str, Any]:
    """Take a `generate_plan` output and create a brand-new project with:
       - folders mirroring the plan's folder structure
       - items for every resource (videos + articles)
       - tasks for every plan day
    """
    name = project_name or plan_payload.get("topic") or "New plan"
    description = plan_payload.get("intent") or ""
    goal_type = plan_payload.get("goal_type") or "general"
    folders_in = plan_payload.get("folders") or []
    plan_days = plan_payload.get("plan") or []

    folders = []
    for i, f in enumerate(folders_in):
        folders.append({
            "id": f.get("id") or _slug(f.get("name", f"folder-{i}")),
            "name": f.get("name") or f"Folder {i+1}",
            "description": f.get("description") or "",
            "weight": f.get("weight") or 3,
        })

    proj = await create_project(
        name=name,
        description=description,
        goal_type=goal_type,
        folders=folders,
    )

    # Items: every video + article from each folder
    items: List[Dict[str, Any]] = []
    for f in folders_in:
        fid = f.get("id")
        for v in (f.get("videos") or []):
            items.append({
                "kind": "resource",
                "ref_id": v.get("youtube_id") or v.get("url") or "",
                "title": v.get("title") or "Untitled video",
                "url": v.get("url") or "",
                "folder_id": fid,
                "meta": {
                    "type": "video",
                    "thumbnail": v.get("thumbnail"),
                    "youtube_id": v.get("youtube_id"),
                    "channel_title": v.get("channel_title"),
                    "duration_display": v.get("duration_display"),
                    "view_count_display": v.get("view_count_display"),
                },
            })
        for a in (f.get("articles") or []):
            items.append({
                "kind": "resource",
                "ref_id": a.get("url") or "",
                "title": a.get("title") or "Untitled article",
                "url": a.get("url") or "",
                "folder_id": fid,
                "meta": {
                    "type": "article",
                    "domain": a.get("domain") or a.get("source"),
                    "summary": a.get("summary"),
                },
            })

    if items:
        await add_items(proj["id"], items)

    # Tasks: one per day
    for d in plan_days:
        await add_task(
            proj["id"],
            text=f"Day {d.get('day')} ({d.get('date')}) — {d.get('title') or d.get('focus_area')}",
            folder_id=d.get("focus_id") or "",
        )

    final = await get_project(proj["id"])
    return final or proj


# ─── AI Organize helper ───────────────────────────────────────────────────────

async def ai_organize_memories(project_id: str, memories: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Call LLM to suggest folders for an existing project based on memories."""
    if not memories:
        return {"suggested_folders": [], "assignments": []}

    bullets = "\n".join([f"- [{m.get('id')}] {m.get('title')}: {(m.get('summary') or '')[:80]}" for m in memories[:30]])
    prompt = (
        "You are OrganizerAgent. Given these memories, propose 3-6 folders and "
        "assign each memory to the best folder.\n\n"
        f"Memories:\n{bullets}\n\n"
        "Return JSON: {\"folders\": [{\"id\":\"slug\",\"name\":\"Title\",\"description\":\"1 line\"}], "
        "\"assignments\": [{\"memory_id\":\"...\",\"folder_id\":\"...\"}]}"
    )
    try:
        result = await chat_json(
            messages=[{"role": "user", "content": prompt}],
            model=settings.OPENAI_MODEL,
            temperature=0.4,
        )
        folders = []
        for f in (result.get("folders") or [])[:6]:
            if not isinstance(f, dict):
                continue
            folders.append({
                "id": _slug(str(f.get("id") or f.get("name") or "folder")),
                "name": str(f.get("name") or "Folder")[:48],
                "description": str(f.get("description") or "")[:160],
            })
        assignments = []
        for a in (result.get("assignments") or [])[:200]:
            if not isinstance(a, dict):
                continue
            assignments.append({
                "memory_id": str(a.get("memory_id") or "")[:40],
                "folder_id": str(a.get("folder_id") or "")[:64],
            })
        return {"suggested_folders": folders, "assignments": assignments}
    except Exception as e:
        logger.warning(f"ai_organize_memories failed: {e}")
        return {"suggested_folders": [], "assignments": [], "error": str(e)}
