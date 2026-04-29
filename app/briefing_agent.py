"""Daily Briefing persistence + history + recap.

Each generated briefing is now saved to a Firestore collection (`briefings`)
keyed by `{user_id}_{YYYY-MM-DD}` so the user can reopen any past day. We also
expose helpers that pull recent action items out of memories and remember
which ones the user has ticked off.

This module is intentionally LLM-light — only the weekly/monthly recap calls
the model. Day-of briefings continue to come from `capture_agent.generate_daily_briefing`,
this file just persists the result.
"""
from __future__ import annotations

import datetime
import hashlib
from collections import Counter
from typing import Any, Dict, List, Optional

from app.db import get_db
from app.user_context import belongs_to_current_user, get_uid
from app.ai_helper import chat_with_fallback
from app.config import settings


IST = datetime.timezone(datetime.timedelta(hours=5, minutes=30))


def _today_iso() -> str:
    return datetime.datetime.now(IST).date().isoformat()


def _doc_id(user_id: str, date_iso: str) -> str:
    return f"{user_id}_{date_iso}"


def _action_id(memory_id: str, text: str) -> str:
    """Stable per-action ID so completion state survives across briefing
    regenerations. The same action text on the same memory always hashes to
    the same id."""
    h = hashlib.sha1(f"{memory_id}|{text.strip().lower()}".encode("utf-8")).hexdigest()[:16]
    return f"a_{h}"


def _parse_iso(raw: Any) -> Optional[datetime.datetime]:
    if not raw:
        return None
    if isinstance(raw, datetime.datetime):
        return raw
    try:
        return datetime.datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
    except Exception:
        return None


# ── Persistence ──────────────────────────────────────────────────────────────

async def save_briefing(payload: Dict[str, Any], date_iso: Optional[str] = None) -> Dict[str, Any]:
    """Persist a briefing for `date_iso` (defaults to today, IST). Idempotent —
    re-saving the same date overwrites the previous copy so the user always
    sees the freshest text for that day."""
    uid = get_uid()
    when = date_iso or _today_iso()
    doc = {
        "user_id": uid,
        "date": when,
        "briefing": str(payload.get("briefing") or "").strip(),
        "executive_summary": str(payload.get("executive_summary") or "").strip(),
        "stats": payload.get("stats") or {},
        "memories": payload.get("memories") or [],
        "tasks": payload.get("tasks") or [],
        "saved_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    }
    db = await get_db()
    try:
        await db.collection("briefings").document(_doc_id(uid, when)).set(doc)
    except Exception as e:
        print(f"save_briefing error: {e}")
    return doc


async def get_briefing(date_iso: str) -> Optional[Dict[str, Any]]:
    """Return the saved briefing for the given date for the current user, or None."""
    uid = get_uid()
    db = await get_db()
    try:
        snap = await db.collection("briefings").document(_doc_id(uid, date_iso)).get()
        if not getattr(snap, "exists", False):
            return None
        data = snap.to_dict() or {}
        if not belongs_to_current_user(data):
            return None
        return data
    except Exception as e:
        print(f"get_briefing error: {e}")
        return None


async def list_briefings(limit: int = 30) -> List[Dict[str, Any]]:
    """Return recent persisted briefings (newest first), capped to `limit`.

    Filters by `user_id == uid` server-side with `order_by("date", DESC)` and
    `limit` so we never scan the full collection. Falls back to a client-side
    filter only if Firestore composite-index errors come back, so the page
    keeps working until the index is added."""
    uid = get_uid()
    db = await get_db()
    out: List[Dict[str, Any]] = []
    try:
        try:
            snap = await db.collection("briefings").where(
                "user_id", "==", uid
            ).order_by("date", direction="DESCENDING").limit(limit).get()
        except Exception as inner:
            # Composite-index missing or backend unsupported — fall back so
            # the page still renders. Logged so the operator can add the index.
            print(f"list_briefings indexed query failed, falling back: {inner}")
            snap = await db.collection("briefings").where(
                "user_id", "==", uid
            ).get()
        for doc in snap:
            data = doc.to_dict() or {}
            if not belongs_to_current_user(data):
                continue
            out.append({
                "date": data.get("date") or "",
                "briefing": data.get("briefing") or "",
                "executive_summary": data.get("executive_summary") or "",
                "saved_at": data.get("saved_at") or "",
            })
    except Exception as e:
        print(f"list_briefings error: {e}")
    out.sort(key=lambda b: b.get("date", ""), reverse=True)
    return out[:limit]


# ── Action items (sourced from recent memories) ──────────────────────────────

async def list_action_items(limit_memories: int = 12, max_items: int = 20) -> List[Dict[str, Any]]:
    """Pull `action_items` out of the user's most recent memories and return
    them as a flat checkbox-friendly list. Completion state is read from a
    separate `briefing_action_state` doc per user so toggles don't mutate the
    underlying memory."""
    uid = get_uid()
    db = await get_db()
    items: List[Dict[str, Any]] = []
    completed = await _load_completed(uid)
    try:
        snap = await db.collection("memories").order_by(
            "created_at", direction="DESCENDING"
        ).limit(60).get()
        seen = 0
        for doc in snap:
            data = doc.to_dict() or {}
            if not belongs_to_current_user(data):
                continue
            if data.get("trashed_at") or data.get("archived"):
                continue
            seen += 1
            if seen > limit_memories:
                pass  # keep scanning a bit further so older memories with
                       # action_items still surface, but cap the total below
            mem_id = getattr(doc, "id", "") or data.get("id", "")
            for raw in (data.get("action_items") or [])[:6]:
                text = str(raw).strip()
                if not text:
                    continue
                aid = _action_id(mem_id, text)
                items.append({
                    "id": aid,
                    "memory_id": mem_id,
                    "memory_title": (data.get("title") or "Untitled")[:120],
                    "domain": data.get("domain") or "",
                    "text": text[:240],
                    "completed": aid in completed,
                    "created_at": str(data.get("created_at") or ""),
                })
                if len(items) >= max_items:
                    break
            if len(items) >= max_items:
                break
    except Exception as e:
        print(f"list_action_items error: {e}")
    items.sort(key=lambda x: (x["completed"], x["created_at"]), reverse=False)
    return items


async def _load_completed(uid: str) -> set:
    db = await get_db()
    try:
        snap = await db.collection("briefing_action_state").document(uid).get()
        if not getattr(snap, "exists", False):
            return set()
        data = snap.to_dict() or {}
        return set(data.get("completed") or [])
    except Exception:
        return set()


async def toggle_action_item(action_id: str, done: bool) -> Dict[str, Any]:
    """Mark an action item complete/incomplete. State is keyed by the stable
    action_id so the checkbox survives briefing regeneration."""
    uid = get_uid()
    db = await get_db()
    completed = await _load_completed(uid)
    if done:
        completed.add(action_id)
    else:
        completed.discard(action_id)
    try:
        await db.collection("briefing_action_state").document(uid).set({
            "user_id": uid,
            "completed": sorted(completed),
            "updated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        })
    except Exception as e:
        print(f"toggle_action_item error: {e}")
    return {"id": action_id, "completed": done}


# ── Today's timeline (tasks + revisits + calendar events) ───────────────────

async def todays_timeline() -> List[Dict[str, Any]]:
    """Chronologically merged list of today's tasks, due habits, due revisits
    and scheduled calendar events."""
    from app.task_agent import list_tasks
    from app.revisit_agent import list_due
    from app.calendar_agent import list_upcoming_events

    today = datetime.datetime.now(IST).date()
    today_iso = today.isoformat()
    items: List[Dict[str, Any]] = []

    try:
        tasks = await list_tasks(status="pending", limit=200)
    except Exception:
        tasks = []
    for t in tasks:
        due = (t.get("due_date") or "").strip()
        if due and due != today_iso:
            continue
        items.append({
            "kind": "task",
            "id": t.get("id", ""),
            "title": t.get("title", "Untitled"),
            "subtitle": f"Priority: {t.get('priority', 'medium')}",
            "time_iso": t.get("due_at") or "",
            "color": "#9333ea",
        })

    try:
        rv = await list_due(window_days=1)
        for r in rv.get("due", []):
            items.append({
                "kind": "revisit",
                "id": r.get("id", ""),
                "title": r.get("title", "Untitled"),
                "subtitle": "Revisit due",
                "time_iso": r.get("next_due") or "",
                "url": r.get("url", ""),
                "memory_id": r.get("memory_id", ""),
                "color": "#f59e0b",
            })
    except Exception:
        pass

    try:
        evts = await list_upcoming_events(days=1)
        for e in evts:
            start_raw = e.get("start_iso") or e.get("date") or ""
            start_dt = _parse_iso(start_raw)
            if start_dt is None:
                continue
            try:
                if start_dt.astimezone(IST).date() != today:
                    continue
            except Exception:
                continue
            items.append({
                "kind": "event",
                "id": e.get("id", ""),
                "title": e.get("title", "Untitled"),
                "subtitle": e.get("topic") or "Calendar",
                "time_iso": start_raw,
                "color": "#06b6d4",
            })
    except Exception:
        pass

    def sort_key(it: Dict[str, Any]) -> str:
        return it.get("time_iso") or "z"
    items.sort(key=sort_key)
    return items


# ── Weekly / Monthly recap ──────────────────────────────────────────────────

def _period_window(period: str) -> int:
    return 30 if period == "month" else 7


async def generate_recap(period: str = "week") -> Dict[str, Any]:
    """Aggregate captures for the period and ask the LLM for a short recap.
    Falls back to a deterministic stats-only summary if no model key is set."""
    days = _period_window(period)
    uid = get_uid()
    db = await get_db()
    cutoff = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=days)
    captures: List[Dict[str, Any]] = []
    try:
        snap = await db.collection("memories").order_by(
            "created_at", direction="DESCENDING"
        ).limit(400).get()
        for doc in snap:
            data = doc.to_dict() or {}
            if not belongs_to_current_user(data):
                continue
            if data.get("trashed_at"):
                continue
            ts = _parse_iso(data.get("created_at"))
            if ts is None or ts < cutoff:
                continue
            captures.append(data)
    except Exception as e:
        print(f"generate_recap fetch error: {e}")

    domain_counts = Counter(m.get("domain") or "General" for m in captures)
    tag_counts: Counter = Counter()
    for m in captures:
        for t in (m.get("tags") or [])[:6]:
            tag = str(t).strip().lower()
            if tag:
                tag_counts[tag] += 1
    src_counts = Counter((m.get("source_type") or "note").lower() for m in captures)
    top_titles = [(m.get("title") or "Untitled")[:90] for m in captures[:8]]

    stats = {
        "captures": len(captures),
        "top_domains": [{"name": d, "count": c} for d, c in domain_counts.most_common(5)],
        "top_tags": [{"tag": t, "count": c} for t, c in tag_counts.most_common(8)],
        "source_mix": [{"type": s, "count": c} for s, c in src_counts.most_common(4)],
    }

    recap_text = ""
    if settings.OPENAI_API_KEY and captures:
        period_label = "week" if period == "week" else "month"
        title_block = "\n".join(f"- {t}" for t in top_titles) or "(no captures)"
        prompt = (
            f"Write a friendly 3-4 sentence recap of the user's past {period_label} "
            f"of learning. They captured {len(captures)} items, mostly in "
            f"{(stats['top_domains'][0]['name'] if stats['top_domains'] else 'mixed topics')}. "
            f"Mention one specific topic from the list below.\n\nRecent titles:\n{title_block}\n\n"
            f"Tone: warm, concrete, no filler, no emojis."
        )
        try:
            recap_text = await chat_with_fallback(
                messages=[{"role": "user", "content": prompt}],
                model=settings.OPENAI_MODEL,
                temperature=0.4,
                max_tokens=180,
            )
        except Exception as e:
            print(f"generate_recap LLM error: {e}")
    if not recap_text:
        if captures:
            top_dom = stats["top_domains"][0]["name"] if stats["top_domains"] else "various topics"
            recap_text = (
                f"You captured {len(captures)} items in the past {days} days, "
                f"with {top_dom} leading the way. Keep the momentum going."
            )
        else:
            recap_text = (
                f"No captures in the past {days} days. A short reading session today "
                f"would re-start the streak."
            )

    return {
        "period": period,
        "days": days,
        "user_id": uid,
        "stats": stats,
        "recap": recap_text,
        "generated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    }
