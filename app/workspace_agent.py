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


# ─── Section system (project-workspace layer over folders) ────────────────────
#
# Every folder (and the implicit "root" bucket of un-foldered items) is composed
# of 4 default sections. Items live in a folder AND a section. AI organization
# routes raw captures into the right section, tags them, and clusters similar
# items together.

DEFAULT_SECTIONS: List[Dict[str, Any]] = [
    {"id": "notes",     "name": "Notes",     "icon": "sticky-note", "description": "Captured memories and knowledge"},
    {"id": "tasks",     "name": "Tasks",     "icon": "check-square", "description": "Actionable to-dos and follow-ups"},
    {"id": "ideas",     "name": "Ideas",     "icon": "lightbulb",   "description": "Hypotheses, sparks, brainstorms"},
    {"id": "resources", "name": "Resources", "icon": "link",        "description": "External links, videos, PDFs, references"},
]
DEFAULT_SECTION_IDS = {s["id"] for s in DEFAULT_SECTIONS}


def _utcnow_iso() -> str:
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def _short_id(prefix: str = "ws") -> str:
    return f"{prefix}_{uuid.uuid4().hex[:10]}"


def _slug(s: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", (s or "").lower()).strip("-")
    return s[:48] or "folder"


def _color_for(idx: int) -> str:
    return PROJECT_COLORS[idx % len(PROJECT_COLORS)]


def _ensure_sections(folder: Dict[str, Any]) -> Dict[str, Any]:
    """Backfill DEFAULT_SECTIONS onto a folder dict (idempotent, in-place)."""
    if not isinstance(folder, dict):
        return folder
    secs = folder.get("sections")
    if not isinstance(secs, list) or not secs:
        folder["sections"] = [dict(s) for s in DEFAULT_SECTIONS]
    else:
        present = {s.get("id") for s in secs if isinstance(s, dict)}
        for d in DEFAULT_SECTIONS:
            if d["id"] not in present:
                secs.append(dict(d))
    return folder


def _default_section_for_item(item: Dict[str, Any]) -> str:
    """Heuristic routing when AI hasn't classified an item yet."""
    kind = (item.get("kind") or "").lower()
    if kind == "task":
        return "tasks"
    if kind in ("resource", "plan_day"):
        return "resources"
    if kind == "memory":
        meta = item.get("meta") or {}
        st = (meta.get("source_type") or "").lower()
        tags = [str(t).lower() for t in (meta.get("tags") or [])]
        if st in ("youtube", "web", "pdf"):
            return "resources"
        if "idea" in tags or "brainstorm" in tags:
            return "ideas"
        return "notes"
    return "notes"


# ─── CRUD ─────────────────────────────────────────────────────────────────────

def _hydrate_project(p: Dict[str, Any]) -> Dict[str, Any]:
    """Backfill sections on every folder, ensure default item fields exist."""
    folders = p.get("folders") or []
    for f in folders:
        _ensure_sections(f)
    p["folders"] = folders
    # Items: backfill section_id + tags/group_id (legacy items will get heuristic section)
    items = p.get("items") or []
    for it in items:
        if not isinstance(it, dict):
            continue
        if not it.get("section_id"):
            it["section_id"] = _default_section_for_item(it)
        if not isinstance(it.get("tags"), list):
            it["tags"] = []
        if "group_id" not in it:
            it["group_id"] = ""
    p["items"] = items
    # Surface the section catalog at project root (read-only convenience for clients).
    p["default_sections"] = [dict(s) for s in DEFAULT_SECTIONS]
    return p


async def list_projects() -> List[Dict[str, Any]]:
    db = await get_db()
    snap = await db.collection("workspace_projects").get()
    out: List[Dict[str, Any]] = []
    for doc in snap:
        d = doc.to_dict() | {"id": doc.id}
        out.append(_hydrate_project(d))
    out.sort(key=lambda p: p.get("updated_at") or "", reverse=True)
    return out


async def get_project(project_id: str) -> Optional[Dict[str, Any]]:
    db = await get_db()
    doc = await db.collection("workspace_projects").document(project_id).get()
    if not doc.exists:
        return None
    return _hydrate_project(doc.to_dict() | {"id": doc.id})


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
    seeded_folders = [_ensure_sections(dict(f)) for f in (folders or [])]
    project = {
        "id": pid,
        "name": (name or "Untitled project").strip()[:80],
        "description": (description or "").strip()[:240],
        "color": color or _color_for(len(existing)),
        "goal_type": goal_type or "general",
        "folders": seeded_folders,
        "items": [],
        "tasks": [],
        # Project-wide grouping catalog populated by AI organize.
        "groups": [],
        "created_at": _utcnow_iso(),
        "updated_at": _utcnow_iso(),
    }
    await db.collection("workspace_projects").document(pid).set(project)
    return _hydrate_project(project)


async def update_project(project_id: str, **fields) -> Dict[str, Any]:
    db = await get_db()
    doc = await db.collection("workspace_projects").document(project_id).get()
    if not doc.exists:
        raise ValueError("Project not found")
    data = doc.to_dict()
    for k, v in fields.items():
        if v is not None and k in {"name", "description", "color", "goal_type", "folders", "groups"}:
            if k == "folders" and isinstance(v, list):
                v = [_ensure_sections(dict(f)) for f in v]
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

async def add_items(
    project_id: str,
    items: List[Dict[str, Any]],
    folder_id: Optional[str] = None,
    section_id: Optional[str] = None,
) -> Dict[str, Any]:
    db = await get_db()
    doc = await db.collection("workspace_projects").document(project_id).get()
    if not doc.exists:
        raise ValueError("Project not found")
    data = doc.to_dict()
    cur_items = data.get("items") or []
    added = 0
    for it in items:
        # Resolve section: explicit param > per-item override > heuristic.
        sec = section_id or it.get("section_id") or _default_section_for_item(it)
        if sec not in DEFAULT_SECTION_IDS:
            sec = _default_section_for_item(it)
        # Tags: caller may pre-supply tags (capped at 7); else empty until AI organize.
        raw_tags = it.get("tags") or (it.get("meta") or {}).get("tags") or []
        tags = [str(t).strip()[:24].lower() for t in raw_tags if str(t).strip()][:7]
        new = {
            "id": _short_id("itm"),
            "kind": it.get("kind") or "resource",
            "ref_id": it.get("ref_id") or it.get("id") or "",
            "title": (it.get("title") or "Untitled")[:160],
            "url": it.get("url") or "",
            "folder_id": folder_id or it.get("folder_id") or "",
            "section_id": sec,
            "tags": tags,
            "group_id": str(it.get("group_id") or "")[:48],
            "added_at": _utcnow_iso(),
            "meta": it.get("meta") or {},
        }
        cur_items.append(new)
        added += 1
    data["items"] = cur_items
    data["updated_at"] = _utcnow_iso()
    await db.collection("workspace_projects").document(project_id).set(data)
    return {"project_id": project_id, "added": added, "total_items": len(cur_items)}


async def update_item(
    project_id: str,
    item_id: str,
    section_id: Optional[str] = None,
    tags: Optional[List[str]] = None,
    group_id: Optional[str] = None,
    folder_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Patch an existing workspace item — section, tags, group, or folder."""
    db = await get_db()
    doc = await db.collection("workspace_projects").document(project_id).get()
    if not doc.exists:
        raise ValueError("Project not found")
    data = doc.to_dict()
    items = data.get("items") or []
    found = None
    for it in items:
        if it.get("id") == item_id:
            if section_id is not None and section_id in DEFAULT_SECTION_IDS:
                it["section_id"] = section_id
            if tags is not None:
                it["tags"] = [str(t).strip()[:24].lower() for t in tags if str(t).strip()][:7]
            if group_id is not None:
                it["group_id"] = str(group_id)[:48]
            if folder_id is not None:
                it["folder_id"] = str(folder_id)[:48]
            found = it
            break
    if not found:
        raise ValueError("Item not found")
    data["items"] = items
    data["updated_at"] = _utcnow_iso()
    await db.collection("workspace_projects").document(project_id).set(data)
    return found


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
    """Call LLM to suggest folders for an existing project based on memories.
    (Legacy entry point — kept for backwards compatibility with the existing
    Workspace UI's "AI Organize" button. Prefer ai_organize_workspace for the
    full sections + tags + groups pipeline.)"""
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


# ─── AI Workspace Organizer (sections + tags + groups in one pass) ────────────

async def ai_organize_workspace(project_id: str, folder_id: Optional[str] = None) -> Dict[str, Any]:
    """For each item in the project (or a specific folder), ask the AI to:
        1. Pick the best section (notes / tasks / ideas / resources)
        2. Generate 5-7 smart tags (lowercase, kebab-case where useful)
        3. Cluster similar items into groups (with a short group title)

    Returns a preview structure the caller can apply via apply_organization().
    No DB writes happen here.
    """
    project = await get_project(project_id)
    if not project:
        return {"ok": False, "reason": "missing_project", "assignments": [], "groups": []}

    items = project.get("items") or []
    if folder_id is not None:
        items = [it for it in items if it.get("folder_id") == folder_id]

    if not items:
        return {"ok": True, "assignments": [], "groups": [], "stats": {"items": 0}}

    # Build a compact catalog for the LLM (cap at 40 items per pass).
    lines = []
    for i, it in enumerate(items[:40]):
        title = (it.get("title") or "Untitled")[:140]
        kind = it.get("kind") or "resource"
        meta = it.get("meta") or {}
        st = meta.get("source_type") or meta.get("type") or ""
        summary = (meta.get("summary") or "")[:140]
        domain = meta.get("domain") or ""
        existing_tags = ", ".join((meta.get("tags") or it.get("tags") or [])[:5])
        bits = [f"kind={kind}"]
        if st: bits.append(f"src={st}")
        if domain: bits.append(f"dom={domain}")
        if existing_tags: bits.append(f"tags=[{existing_tags}]")
        lines.append(f"[{it['id']}] {title} ({'; '.join(bits)})\n    {summary}".rstrip())
    catalog = "\n".join(lines)

    section_help = "\n".join([f"  - {s['id']}: {s['description']}" for s in DEFAULT_SECTIONS])

    prompt = f"""You are OrganizerAgent for a project workspace called "{project.get('name', 'Workspace')}".

For each item below, do THREE things:
  1. Assign it to ONE section: notes, tasks, ideas, or resources.
{section_help}
  2. Suggest 5-7 short, lowercase smart tags. Prefer specific over generic
     (e.g. "vector-search", "rate-limiting", not "tech", "info"). Avoid emojis.
  3. Group items that are clearly about the same topic together. Each group has
     a short, specific title (<=40 chars) and a stable slug id.

Items ({len(lines)}):
{catalog}

Return STRICT JSON of shape:
{{
  "assignments": [
    {{"item_id": "<id>", "section_id": "notes|tasks|ideas|resources",
      "tags": ["tag-one", "tag-two", ...], "group_id": "<slug or empty string>"}}
  ],
  "groups": [
    {{"id": "<slug>", "title": "Short group title", "summary": "<=140 chars"}}
  ]
}}
No prose, no emojis, no extra keys."""

    try:
        result = await chat_json(
            messages=[{"role": "user", "content": prompt}],
            model=settings.OPENAI_MODEL,
            temperature=0.3,
        )
    except Exception as e:
        logger.warning(f"ai_organize_workspace failed: {e}")
        return {"ok": False, "assignments": [], "groups": [], "error": str(e)}

    valid_ids = {it["id"] for it in items}
    assignments_out: List[Dict[str, Any]] = []
    seen_items: set = set()
    for a in (result.get("assignments") or [])[:200]:
        if not isinstance(a, dict):
            continue
        iid = str(a.get("item_id") or "")
        if iid not in valid_ids or iid in seen_items:
            continue
        sec = str(a.get("section_id") or "").lower()
        if sec not in DEFAULT_SECTION_IDS:
            sec = _default_section_for_item(next(it for it in items if it["id"] == iid))
        raw_tags = a.get("tags") or []
        if not isinstance(raw_tags, list):
            raw_tags = []
        tags = []
        for t in raw_tags:
            t = str(t).strip().lower()[:24]
            if t and t not in tags:
                tags.append(t)
            if len(tags) >= 7:
                break
        gid = _slug(str(a.get("group_id") or "")) if a.get("group_id") else ""
        assignments_out.append({"item_id": iid, "section_id": sec, "tags": tags, "group_id": gid})
        seen_items.add(iid)

    groups_out: List[Dict[str, Any]] = []
    seen_gids: set = set()
    for g in (result.get("groups") or [])[:20]:
        if not isinstance(g, dict):
            continue
        gid = _slug(str(g.get("id") or g.get("title") or ""))
        if not gid or gid in seen_gids:
            continue
        seen_gids.add(gid)
        groups_out.append({
            "id": gid,
            "title": str(g.get("title") or "Group")[:48],
            "summary": str(g.get("summary") or "")[:160],
        })

    # Backfill: any assignment that referenced a group id not in groups_out gets cleared.
    valid_gids = {g["id"] for g in groups_out}
    for a in assignments_out:
        if a["group_id"] and a["group_id"] not in valid_gids:
            a["group_id"] = ""

    return {
        "ok": True,
        "assignments": assignments_out,
        "groups": groups_out,
        "stats": {
            "items": len(items),
            "assigned": len(assignments_out),
            "groups": len(groups_out),
        },
    }


async def apply_organization(
    project_id: str,
    assignments: List[Dict[str, Any]],
    groups: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """Persist an ai_organize_workspace() result onto the project."""
    db = await get_db()
    doc = await db.collection("workspace_projects").document(project_id).get()
    if not doc.exists:
        raise ValueError("Project not found")
    data = doc.to_dict()

    # Index assignments by item id.
    by_id: Dict[str, Dict[str, Any]] = {}
    for a in assignments or []:
        if not isinstance(a, dict): continue
        iid = str(a.get("item_id") or "")
        if iid:
            by_id[iid] = a

    items = data.get("items") or []
    updated = 0
    for it in items:
        a = by_id.get(it.get("id") or "")
        if not a:
            continue
        sec = str(a.get("section_id") or "").lower()
        if sec in DEFAULT_SECTION_IDS:
            it["section_id"] = sec
        tags = a.get("tags")
        if isinstance(tags, list):
            it["tags"] = [str(t).strip().lower()[:24] for t in tags if str(t).strip()][:7]
        gid = a.get("group_id")
        if gid is not None:
            it["group_id"] = str(gid)[:48]
        updated += 1

    # Persist project-wide group catalog (de-dupe + cap at 20)
    cleaned_groups: List[Dict[str, Any]] = []
    seen = set()
    for g in (groups or [])[:20]:
        if not isinstance(g, dict): continue
        gid = _slug(str(g.get("id") or g.get("title") or ""))
        if not gid or gid in seen: continue
        seen.add(gid)
        cleaned_groups.append({
            "id": gid,
            "title": str(g.get("title") or "Group")[:48],
            "summary": str(g.get("summary") or "")[:160],
        })
    data["items"] = items
    data["groups"] = cleaned_groups
    data["updated_at"] = _utcnow_iso()
    await db.collection("workspace_projects").document(project_id).set(data)
    return {"ok": True, "updated_items": updated, "groups": cleaned_groups}
