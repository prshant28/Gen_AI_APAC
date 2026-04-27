"""
Plan Agent — multi-agent plan generator.

Orchestrates 4 specialist agents to turn ANY goal (study, project, research,
travel, career, health, learning, launch, etc.) into a structured, scheduled,
folder-organized plan with LIVE web/YouTube resources interwoven.

Agents:
    1. ResearcherAgent  - extracts intent + breaks goal into focus areas
    2. DiscoverAgent    - pulls live YouTube + curated articles per focus
    3. OrganizerAgent   - groups everything into folders / categories
    4. SchedulerAgent   - lays it out as a day-by-day actionable plan

Returns a single payload the UI renders end-to-end with a visible pipeline.
"""
from __future__ import annotations

import asyncio
import datetime
import json
import logging
import re
from typing import List, Dict, Any, Optional

from app.config import settings
from app.discover_agent import discover_resources
from app.ai_helper import chat_with_fallback, chat_json  # noqa: F401

logger = logging.getLogger("recall-x247.plan")


GOAL_TYPES = {
    "study": {
        "label": "Study / Learn a topic",
        "verb": "master",
        "lens": "concepts, exercises, projects, recall",
    },
    "project": {
        "label": "Ship a project",
        "verb": "ship",
        "lens": "scope, milestones, builds, tests, launch",
    },
    "research": {
        "label": "Research deep-dive",
        "verb": "investigate",
        "lens": "literature, hypotheses, experiments, synthesis",
    },
    "career": {
        "label": "Career move / interview prep",
        "verb": "land",
        "lens": "skills, projects, mocks, networking, applications",
    },
    "travel": {
        "label": "Travel itinerary",
        "verb": "plan",
        "lens": "logistics, places, food, costs, days",
    },
    "health": {
        "label": "Health / fitness goal",
        "verb": "achieve",
        "lens": "training blocks, nutrition, recovery, tracking",
    },
    "launch": {
        "label": "Launch / GTM",
        "verb": "launch",
        "lens": "positioning, audience, channels, content, metrics",
    },
    "skill": {
        "label": "Build a skill",
        "verb": "build",
        "lens": "fundamentals, drills, projects, feedback loops",
    },
}


def _today() -> datetime.date:
    return datetime.date.today()


def _date_str(offset_days: int) -> str:
    return (_today() + datetime.timedelta(days=offset_days)).isoformat()


def _slug(s: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", (s or "").lower()).strip("-")
    return s[:48] or "plan"


# ─── Agent 1: Researcher ──────────────────────────────────────────────────────

async def researcher_agent(topic: str, goal_type: str, days: int) -> Dict[str, Any]:
    """Break the user goal into 3-6 focus areas with one-line descriptions."""
    gt = GOAL_TYPES.get(goal_type, GOAL_TYPES["study"])
    prompt = (
        f"You are ResearcherAgent. The user wants to {gt['verb']} the goal: "
        f"\"{topic}\" in {days} days. Lens: {gt['lens']}.\n\n"
        f"Return JSON {{\"intent\": <1-line restatement>, \"focus_areas\": [<3 to 6 items>]}}. "
        f"Each focus_area MUST be an object with keys: "
        f"id (short kebab-case), title (2-4 words), description (1 short sentence), "
        f"weight (1-5 importance), search_query (3-6 word YouTube search query). "
        f"Be specific to the topic — no generic filler."
    )
    try:
        result = await chat_json(
            messages=[{"role": "user", "content": prompt}],
            model=settings.OPENAI_MODEL,
            temperature=0.4,
        )
        focus = result.get("focus_areas") or []
        # Sanitize
        clean = []
        for i, f in enumerate(focus[:6]):
            if not isinstance(f, dict):
                continue
            clean.append({
                "id": _slug(str(f.get("id") or f.get("title") or f"area-{i}")),
                "title": str(f.get("title") or f"Focus {i+1}").strip()[:60],
                "description": str(f.get("description") or "").strip()[:160],
                "weight": int(max(1, min(5, f.get("weight") or 3))),
                "search_query": str(f.get("search_query") or f.get("title") or topic).strip()[:80],
            })
        if not clean:
            # Fallback: split topic into one focus area
            clean = [{
                "id": _slug(topic),
                "title": topic[:40],
                "description": "Core focus area",
                "weight": 5,
                "search_query": topic,
            }]
        return {"intent": str(result.get("intent") or topic).strip()[:200], "focus_areas": clean}
    except Exception as e:
        logger.warning(f"researcher_agent failed: {e}")
        return {
            "intent": topic,
            "focus_areas": [{
                "id": _slug(topic), "title": topic[:40],
                "description": "Core focus area", "weight": 5, "search_query": topic,
            }],
        }


# ─── Agent 2: Discover (live YT + articles per focus area) ────────────────────

async def discover_for_focus(focus: Dict[str, Any]) -> Dict[str, Any]:
    """Run /discover for ONE focus area. Returns trimmed top-N items."""
    try:
        res = await discover_resources(topic=focus["search_query"], kinds=["video", "article"])
        items = res.get("items") or []
        # Trim to top 3 videos + top 2 articles per focus
        videos = [i for i in items if i.get("type") == "video"][:3]
        articles = [i for i in items if i.get("type") == "article"][:2]
        return {"focus_id": focus["id"], "videos": videos, "articles": articles}
    except Exception as e:
        logger.warning(f"discover_for_focus failed for {focus.get('id')}: {e}")
        return {"focus_id": focus["id"], "videos": [], "articles": []}


async def discover_agent(focus_areas: List[Dict[str, Any]]) -> Dict[str, List[Dict]]:
    """Run discovery for all focus areas in parallel."""
    results = await asyncio.gather(
        *[discover_for_focus(f) for f in focus_areas],
        return_exceptions=True,
    )
    by_focus: Dict[str, List[Dict]] = {}
    for r in results:
        if isinstance(r, dict):
            by_focus[r["focus_id"]] = (r.get("videos") or []) + (r.get("articles") or [])
    return by_focus


# ─── Agent 3: Organizer (folder structure) ────────────────────────────────────

def organizer_agent(
    topic: str,
    focus_areas: List[Dict[str, Any]],
    resources_by_focus: Dict[str, List[Dict]],
) -> Dict[str, Any]:
    """Group everything into a clean folder structure deterministically."""
    folders = []
    total_resources = 0
    for f in focus_areas:
        res = resources_by_focus.get(f["id"], [])
        videos = [r for r in res if r.get("type") == "video"]
        articles = [r for r in res if r.get("type") == "article"]
        total_resources += len(res)
        folders.append({
            "id": f["id"],
            "name": f["title"],
            "description": f["description"],
            "weight": f["weight"],
            "videos": videos,
            "articles": articles,
            "video_count": len(videos),
            "article_count": len(articles),
        })
    return {
        "root": _slug(topic),
        "folders": folders,
        "total_resources": total_resources,
    }


# ─── Agent 4: Scheduler (day-by-day) ──────────────────────────────────────────

def scheduler_agent(
    topic: str,
    days: int,
    folders: List[Dict[str, Any]],
    minutes_per_day: int = 60,
) -> List[Dict[str, Any]]:
    """Distribute folders across days deterministically; weave in resources."""
    if not folders:
        return []

    # Weight-based round-robin: each day gets a focus area + 1-2 resources
    # Sort folders by weight descending so heavier areas appear first
    sorted_folders = sorted(folders, key=lambda f: (-f.get("weight", 3), f["id"]))
    plan: List[Dict[str, Any]] = []
    res_idx_by_focus = {f["id"]: 0 for f in folders}

    for d in range(days):
        focus = sorted_folders[d % len(sorted_folders)]
        all_res = (focus.get("videos") or []) + (focus.get("articles") or [])
        idx = res_idx_by_focus[focus["id"]]
        # 1-2 resources per day from this focus, cycling
        chunk = []
        if all_res:
            chunk.append(all_res[idx % len(all_res)])
            if len(all_res) > 1:
                chunk.append(all_res[(idx + 1) % len(all_res)])
            res_idx_by_focus[focus["id"]] = idx + 2

        activities = []
        if d == 0:
            activities.append(f"Kick off — set up your workspace for {topic}")
        activities.append(f"Focus: {focus['name']}")
        if focus.get("description"):
            activities.append(focus["description"])
        for r in chunk:
            label = "Watch" if r.get("type") == "video" else "Read"
            title = (r.get("title") or "")[:80]
            dur = r.get("duration_display")
            extra = f" ({dur})" if dur else ""
            activities.append(f"{label}: {title}{extra}")
        if d == days - 1:
            activities.append("Wrap-up: write a 5-bullet summary + 3 questions")
        else:
            activities.append("Capture 3 key takeaways into your second brain")

        plan.append({
            "day": d + 1,
            "date": _date_str(d),
            "title": f"Day {d + 1} — {focus['name']}",
            "focus_area": focus["name"],
            "focus_id": focus["id"],
            "duration_minutes": minutes_per_day,
            "activities": activities,
            "resources": [{
                "title": r.get("title"),
                "url": r.get("url"),
                "type": r.get("type"),
                "thumbnail": r.get("thumbnail"),
                "youtube_id": r.get("youtube_id"),
                "channel_title": r.get("channel_title"),
                "duration_display": r.get("duration_display"),
                "domain": r.get("domain") or r.get("source"),
            } for r in chunk],
        })
    return plan


# ─── Public entry point ───────────────────────────────────────────────────────

async def generate_plan(
    topic: str,
    goal_type: str = "study",
    days: int = 7,
    minutes_per_day: int = 60,
    include_resources: bool = True,
) -> Dict[str, Any]:
    """Run the full 4-agent pipeline."""
    topic = (topic or "").strip()
    if not topic:
        return {"error": "topic is required"}
    days = max(1, min(30, int(days or 7)))
    minutes_per_day = max(15, min(480, int(minutes_per_day or 60)))
    goal_type = goal_type if goal_type in GOAL_TYPES else "study"

    pipeline_started = datetime.datetime.utcnow().isoformat() + "Z"
    timings: Dict[str, float] = {}

    # 1. Researcher
    t0 = asyncio.get_event_loop().time()
    research = await researcher_agent(topic, goal_type, days)
    timings["researcher_ms"] = round((asyncio.get_event_loop().time() - t0) * 1000)
    focus_areas = research["focus_areas"]

    # 2. Discover (parallel per focus)
    if include_resources:
        t0 = asyncio.get_event_loop().time()
        resources_by_focus = await discover_agent(focus_areas)
        timings["discover_ms"] = round((asyncio.get_event_loop().time() - t0) * 1000)
    else:
        resources_by_focus = {f["id"]: [] for f in focus_areas}
        timings["discover_ms"] = 0

    # 3. Organizer
    t0 = asyncio.get_event_loop().time()
    organized = organizer_agent(topic, focus_areas, resources_by_focus)
    timings["organizer_ms"] = round((asyncio.get_event_loop().time() - t0) * 1000)

    # 4. Scheduler
    t0 = asyncio.get_event_loop().time()
    schedule = scheduler_agent(topic, days, organized["folders"], minutes_per_day)
    timings["scheduler_ms"] = round((asyncio.get_event_loop().time() - t0) * 1000)

    return {
        "topic": topic,
        "intent": research["intent"],
        "goal_type": goal_type,
        "goal_label": GOAL_TYPES[goal_type]["label"],
        "days": days,
        "minutes_per_day": minutes_per_day,
        "focus_areas": focus_areas,
        "folders": organized["folders"],
        "total_resources": organized["total_resources"],
        "plan": schedule,
        "pipeline": {
            "started_at": pipeline_started,
            "agents": [
                {"name": "ResearcherAgent", "status": "done", "ms": timings["researcher_ms"], "out": f"{len(focus_areas)} focus areas"},
                {"name": "DiscoverAgent", "status": "done", "ms": timings["discover_ms"], "out": f"{organized['total_resources']} live resources"},
                {"name": "OrganizerAgent", "status": "done", "ms": timings["organizer_ms"], "out": f"{len(organized['folders'])} folders"},
                {"name": "SchedulerAgent", "status": "done", "ms": timings["scheduler_ms"], "out": f"{len(schedule)} days scheduled"},
            ],
            "total_ms": sum(timings.values()),
        },
    }
