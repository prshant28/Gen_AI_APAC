import json
import datetime
from typing import List, Dict, Any, Optional
from app.db import get_db
from app.config import settings
from app.ai_helper import chat_with_fallback, chat_json
from app.user_context import get_uid, belongs_to_current_user

STOPWORDS = {"the", "a", "an", "is", "are", "was", "were", "what", "how", "tell", "me", "find", "search", "recall", "about", "i", "my", "do", "know", "have", "can", "you"}
ALLOWED_DOMAINS = ["AI", "Technology", "Science", "Business", "Health", "History", "Philosophy", "Engineering", "Productivity", "Other"]

SOURCE_TYPE_KEYWORDS = {
    "youtube": {"youtube", "video", "videos", "yt", "watch", "watched"},
    "web": {"article", "articles", "blog", "blogs", "post", "posts", "webpage", "website", "web", "url", "link", "links"},
    "note": {"note", "notes", "memo", "memos", "thought", "thoughts", "journal", "diary"},
    "pdf": {"pdf", "pdfs", "paper", "papers", "document", "documents", "doc", "docs"},
}

SOURCE_LABELS = {
    "youtube": "YouTube video",
    "web": "web article",
    "note": "note",
    "pdf": "PDF/document",
}


def _detect_source_filter(query: str) -> Optional[str]:
    """Detect if user is asking for a specific source type (youtube/web/note/pdf)."""
    qwords = {w.strip(".,!?;:'\"").lower() for w in query.split()}
    for source_type, keywords in SOURCE_TYPE_KEYWORDS.items():
        if qwords & keywords:
            return source_type
    return None


def _yt_id(url: str) -> Optional[str]:
    """Extract YouTube video ID from a URL (returns None if not YouTube)."""
    if not url:
        return None
    import re
    patterns = [
        r"(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/embed/)([0-9A-Za-z_-]{11})",
    ]
    for p in patterns:
        m = re.search(p, url)
        if m:
            return m.group(1)
    return None


def _enrich_source(m: dict) -> dict:
    """Build a richer source object for the frontend card."""
    out = {
        "id": m["id"],
        "title": m.get("title"),
        "source_url": m.get("source_url"),
        "source_type": m.get("source_type"),
        "domain": m.get("domain"),
        "summary": (m.get("summary") or "")[:280],
        "key_points": (m.get("key_points") or [])[:5],
        "tags": (m.get("tags") or [])[:6],
    }
    created = m.get("created_at")
    if hasattr(created, "isoformat"):
        out["created_at"] = created.isoformat()
    elif created:
        out["created_at"] = str(created)
    if m.get("source_type") == "youtube":
        yid = _yt_id(m.get("source_url") or "")
        if yid:
            out["youtube_id"] = yid
            out["thumbnail_url"] = f"https://img.youtube.com/vi/{yid}/mqdefault.jpg"
    elif m.get("source_url"):
        try:
            from urllib.parse import urlparse
            host = urlparse(m["source_url"]).netloc
            if host:
                out["favicon_url"] = f"https://www.google.com/s2/favicons?sz=64&domain={host}"
                out["host"] = host.replace("www.", "")
        except Exception:
            pass
    return out


async def recall(query: str, history: Optional[List[Dict[str, str]]] = None) -> dict:
    """
    Semantic knowledge recall with 3-tier search + AI synthesis.
    Auto-falls back to OpenAI if primary (Gemini) rate-limits.
    Honours source-type intent: if user mentions "YouTube videos",
    only YouTube memories are returned.

    `history` is an optional list of {role, content} prior turns so that
    follow-up questions ("tell me more about that") can use earlier context.
    """
    db = await get_db()
    memories = []
    history = history or []

    # If this looks like a follow-up ("tell me more", "what about", "and that?"),
    # blend the previous user turn into the effective query so search has signal.
    effective_query = query
    follow_up_markers = {"more", "tell", "what", "about", "that", "and", "those", "it", "this", "explain", "why", "how", "elaborate"}
    qwords = {w.lower().strip(".,!?'\"") for w in query.split()}
    is_short_followup = len(query.split()) <= 6 and bool(qwords & follow_up_markers)
    if history and is_short_followup:
        last_user = next((h for h in reversed(history) if h.get("role") == "user"), None)
        if last_user and last_user.get("content"):
            effective_query = f"{last_user['content']} — {query}"

    source_filter = _detect_source_filter(effective_query)

    def _matches_filter(data: dict) -> bool:
        if not source_filter:
            return True
        return data.get("source_type") == source_filter

    keywords = [w.lower() for w in effective_query.split() if w.lower() not in STOPWORDS]
    # If we have a source filter, also strip the source-type words from keyword list
    if source_filter:
        all_source_words = set().union(*SOURCE_TYPE_KEYWORDS.values())
        keywords = [k for k in keywords if k.strip(".,!?;:'\"") not in all_source_words]

    # Tier 0: when user explicitly mentions a source type (youtube/web/note/pdf),
    # ALWAYS pull the matching items first. This guarantees we never return a note
    # when they asked for YouTube videos.
    def _safe_ts(m):
        ts = m.get("created_at")
        if ts is None:
            return ""
        if hasattr(ts, "isoformat"):
            return ts.isoformat()
        return str(ts)

    if source_filter:
        try:
            snapshot = await db.collection("memories") \
                .where("source_type", "==", source_filter) \
                .limit(40).get()
            source_items = sorted(
                [doc.to_dict() | {"id": doc.id} for doc in snapshot if belongs_to_current_user(doc.to_dict())],
                key=_safe_ts,
                reverse=True,
            )

            if keywords:
                # Rank by overlap with remaining keywords (title/summary/tags)
                kw_set = {k.lower() for k in keywords}
                def _score(m):
                    text = " ".join([
                        m.get("title", ""), m.get("summary", ""),
                        " ".join(m.get("key_points", []) or []),
                        " ".join(m.get("tags", []) or []),
                    ]).lower()
                    return sum(1 for k in kw_set if k in text)
                source_items.sort(key=lambda m: (_score(m), _safe_ts(m)), reverse=True)

            memories = source_items[:10]
        except Exception as e:
            print(f"Tier 0 Source Filter Error: {e}")

        # If source filter detected but the user has zero items of that type,
        # treat it as a false-positive (e.g. "how to film a video for marketing")
        # and fall through to a general search instead of returning nothing.
        if not memories:
            source_filter = None
            keywords = [w.lower() for w in effective_query.split() if w.lower() not in STOPWORDS]

    if not memories and keywords:
        search_kw = keywords[:10]
        try:
            snapshot = await db.collection("memories") \
                .where("tags", "array_contains_any", search_kw) \
                .limit(40).get()
            memories = [
                doc.to_dict() | {"id": doc.id}
                for doc in snapshot
                if belongs_to_current_user(doc.to_dict()) and _matches_filter(doc.to_dict())
            ][:10]
        except Exception as e:
            print(f"Tier 1 Search Error: {e}")

    if len(memories) < 3:
        try:
            domain_content, _ = await chat_with_fallback(
                messages=[{
                    "role": "user",
                    "content": f"Classify this query into exactly one of these domains: {', '.join(ALLOWED_DOMAINS)}. Query: '{effective_query}'. Return only the domain name, nothing else."
                }],
                model=settings.OPENAI_MODEL,
                temperature=0,
                max_tokens=20,
            )
            classified_domain = domain_content.strip()
            if classified_domain in ALLOWED_DOMAINS:
                snapshot = await db.collection("memories") \
                    .where("domain", "==", classified_domain) \
                    .limit(40).get()
                existing_ids = {m["id"] for m in memories}
                for doc in snapshot:
                    data = doc.to_dict()
                    if doc.id not in existing_ids and belongs_to_current_user(data) and _matches_filter(data):
                        memories.append(data | {"id": doc.id})
        except Exception as e:
            print(f"Tier 2 Search Error: {e}")

    if len(memories) < 2:
        try:
            snapshot = await db.collection("memories") \
                .order_by("created_at", direction="DESCENDING") \
                .limit(60).get()
            recent = [
                doc.to_dict() | {"id": doc.id}
                for doc in snapshot
                if belongs_to_current_user(doc.to_dict()) and _matches_filter(doc.to_dict())
            ][:15]  # cap at 15 to keep AI scan payload small (avoids token-quota errors)
            if recent:
                scan_data = [{"index": i, "title": m.get("title"), "summary": (m.get("summary") or "")[:80]} for i, m in enumerate(recent)]
                raw_scan = await chat_json(
                    messages=[{
                        "role": "user",
                        "content": f"Which of these memories are most relevant to the query: '{effective_query}'? Return a JSON object with key 'indices' containing an array of the top 3 index numbers. Memories: {json.dumps(scan_data)}"
                    }],
                    model=settings.OPENAI_MODEL,
                    temperature=0,
                )
                indices = raw_scan.get("indices", [])
                if not indices:
                    for v in raw_scan.values():
                        if isinstance(v, list):
                            indices = v
                            break
                existing_ids = {m["id"] for m in memories}
                for idx in indices:
                    if isinstance(idx, int) and 0 <= idx < len(recent):
                        m = recent[idx]
                        if m["id"] not in existing_ids:
                            memories.append(m)
        except Exception as e:
            print(f"Tier 3 Search Error: {e}")

    # Final safety net: if this was a follow-up and tiers 1-3 came back empty
    # (e.g. AI provider rate-limit hit during scan), return the most recent
    # memories so the user always gets something useful.
    if not memories and history and is_short_followup:
        try:
            snapshot = await db.collection("memories") \
                .order_by("created_at", direction="DESCENDING") \
                .limit(20).get()
            memories = [
                doc.to_dict() | {"id": doc.id}
                for doc in snapshot
                if belongs_to_current_user(doc.to_dict()) and _matches_filter(doc.to_dict())
            ][:6]
        except Exception as e:
            print(f"Follow-up fallback error: {e}")

    if not memories:
        if source_filter:
            label = SOURCE_LABELS.get(source_filter, source_filter)
            msg = f"No {label} captures found yet. Capture one first!"
        else:
            msg = "I couldn't find anything matching that. Try capturing more content."
        return {
            "answer": msg,
            "sources": [],
            "count": 0,
            "follow_ups": [],
        }

    # Return up to 8 cards so the user sees breadth
    top_memories = memories[:8]
    formatted = ""
    for i, m in enumerate(top_memories, 1):
        created = m.get("created_at", "")
        if hasattr(created, "isoformat"):
            created = created.isoformat()
        st = m.get("source_type", "unknown")
        formatted += (
            f"[{i}] Title: {m.get('title')}\n"
            f"    Type: {st}\n"
            f"    Summary: {(m.get('summary') or '')[:300]}\n"
            f"    Key Points: {', '.join((m.get('key_points') or [])[:4])}\n---\n"
        )

    source_constraint = ""
    if source_filter:
        label = SOURCE_LABELS.get(source_filter, source_filter)
        source_constraint = (
            f"\nNOTE: The user asked about their {label} captures. "
            f"All memories below are {label}s — refer to them as such.\n"
        )

    # Optional history block (last 4 turns max) — keeps follow-ups natural
    history_block = ""
    if history:
        recent = history[-4:]
        history_lines = []
        for h in recent:
            role = "User" if h.get("role") == "user" else "Assistant"
            txt = (h.get("content") or "").strip()
            if txt:
                history_lines.append(f"{role}: {txt[:300]}")
        if history_lines:
            history_block = (
                "\nPRIOR CONVERSATION (most recent first below — for follow-up context only):\n"
                + "\n".join(history_lines) + "\n"
            )

    synthesis_prompt = f"""You are the user's personal Second Brain assistant.
The user asks: '{query}'
{source_constraint}{history_block}
Top memories from their vault:
{formatted}

Write a SHORT, direct answer:
- 2-3 sentences MAX (~50 words). No bullet points, no markdown headings.
- Lead with the direct answer, then ONE concrete pointer (e.g. "see the Vertex AI Agent Builder video").
- Do NOT list every memory — the UI shows them as cards below your text.
- Do NOT invent facts not in the memories above.
- If this is a follow-up (history present), connect to the prior turn naturally."""

    try:
        answer_raw, _ = await chat_with_fallback(
            messages=[{"role": "user", "content": synthesis_prompt}],
            model=settings.OPENAI_MODEL,
            temperature=0.3,
            max_tokens=160,
        )
        answer = answer_raw.strip()
    except Exception as e:
        print(f"Synthesis Error: {e}")
        answer = f"Found {len(top_memories)} relevant memories — see the cards below."

    # Generate 3 follow-up suggestions based on the top memories
    follow_ups: List[str] = []
    titles = [m.get("title", "") for m in top_memories[:5] if m.get("title")]
    try:
        fu_prompt = (
            f"The user asked: '{query}'. The system returned memories about: "
            f"{'; '.join(titles)}. "
            f"Suggest exactly 3 SHORT follow-up questions (under 9 words each) "
            f"the user might want to ask next, related to these topics. "
            f"Return JSON: {{\"questions\": [\"q1\", \"q2\", \"q3\"]}}"
        )
        fu_raw = await chat_json(
            messages=[{"role": "user", "content": fu_prompt}],
            model=settings.OPENAI_MODEL,
            temperature=0.5,
        )
        qs = fu_raw.get("questions", [])
        if isinstance(qs, list):
            follow_ups = [str(q).strip() for q in qs if str(q).strip()][:3]
    except Exception as e:
        print(f"Follow-up gen error: {e}")

    # Always pad to exactly 3 follow-ups using deterministic fallbacks
    if titles:
        short_title = titles[0][:50]
        defaults = [
            f"Tell me more about {short_title}",
            "What are the key takeaways?",
            "How do these connect to each other?",
        ]
    else:
        defaults = [
            "Show me my most recent captures",
            "What are the top topics in my vault?",
            "Summarize my knowledge base",
        ]
    seen_lc = {q.lower() for q in follow_ups}
    for d in defaults:
        if len(follow_ups) >= 3:
            break
        if d.lower() not in seen_lc:
            follow_ups.append(d)
            seen_lc.add(d.lower())
    follow_ups = follow_ups[:3]

    return {
        "answer": answer,
        "sources": [_enrich_source(m) for m in top_memories],
        "count": len(top_memories),
        "follow_ups": follow_ups,
        "source_filter": source_filter,
    }


async def list_memories(
    domain: str = "",
    limit: int = 20,
    unreviewed: bool = False,
    include_archived: bool = False,
    include_trashed: bool = False,
) -> List[dict]:
    """List the current user's memories, newest first.

    `unreviewed=True` returns only items that have not yet been reviewed
    or archived from the Inbox — a memory is considered "in the inbox"
    when neither `reviewed` nor `archived` is true on the document.
    Older docs created before these fields existed are treated as
    unreviewed (the field is missing) so legacy captures still show up.

    By default, items in Trash (`trashed_at` set) and items in Archive
    (`archived=True`) are excluded from the main list. Pass
    `include_archived=True` to merge archived items back in. Trashed items
    only appear via the dedicated /trash endpoints.
    """
    db = await get_db()
    query_ref = db.collection("memories")
    if domain and domain in ALLOWED_DOMAINS:
        query_ref = query_ref.where("domain", "==", domain)
    # Over-fetch then filter to current user (and optionally unreviewed)
    snapshot = await query_ref.order_by("created_at", direction="DESCENDING").limit(max(limit * 4, 80)).get()
    results = []
    for doc in snapshot:
        m = doc.to_dict()
        if not belongs_to_current_user(m):
            continue
        # Exclude trashed unless explicitly requested
        if not include_trashed and m.get("trashed_at"):
            continue
        # Exclude archived unless explicitly requested
        if not include_archived and m.get("archived") is True:
            continue
        if unreviewed and (m.get("reviewed") is True or m.get("archived") is True):
            continue
        m["id"] = doc.id
        if "created_at" in m and hasattr(m["created_at"], "isoformat"):
            m["created_at"] = m["created_at"].isoformat()
        results.append(m)
        if len(results) >= limit:
            break
    # Pinned items float to the top within the returned page
    results.sort(key=lambda x: 0 if x.get("pinned") else 1)
    return results


async def get_memory(memory_id: str) -> dict:
    db = await get_db()
    doc = await db.collection("memories").document(memory_id).get()
    if not doc.exists:
        raise ValueError(f"Memory '{memory_id}' not found.")
    m = doc.to_dict()
    if not belongs_to_current_user(m):
        raise ValueError(f"Memory '{memory_id}' not found.")
    m["id"] = doc.id
    if "created_at" in m and hasattr(m["created_at"], "isoformat"):
        m["created_at"] = m["created_at"].isoformat()
    return m


async def delete_memory(memory_id: str, hard: bool = False) -> dict:
    """Soft-delete by default — set `trashed_at` so the item moves to Trash
    and can be restored. Pass `hard=True` to permanently remove the doc
    (used by the trash purge endpoint)."""
    db = await get_db()
    doc_ref = db.collection("memories").document(memory_id)
    doc = await doc_ref.get()
    if not doc.exists or not belongs_to_current_user(doc.to_dict()):
        raise ValueError(f"Memory '{memory_id}' not found.")
    if hard:
        await doc_ref.delete()
        return {"success": True, "message": f"Memory {memory_id} permanently deleted.", "hard": True}
    import datetime as _dt
    now_iso = _dt.datetime.now(_dt.timezone.utc).isoformat()
    await doc_ref.update({"trashed_at": now_iso})
    return {"success": True, "message": f"Memory {memory_id} moved to Trash.", "trashed_at": now_iso}


async def get_stats() -> dict:
    """Per-user stats. We iterate (rather than .count()) so we can filter by user_id."""
    db = await get_db()
    stats = {"by_source": {}, "by_domain": {}, "total": 0}
    try:
        snap = await db.collection("memories").get()
        for s_type in ["youtube", "web", "pdf", "note"]:
            stats["by_source"][s_type] = 0
        for d in ALLOWED_DOMAINS:
            stats["by_domain"][d] = 0
        for doc in snap:
            data = doc.to_dict()
            if not belongs_to_current_user(data):
                continue
            stats["total"] += 1
            st = data.get("source_type")
            if st in stats["by_source"]:
                stats["by_source"][st] += 1
            dm = data.get("domain")
            if dm in stats["by_domain"]:
                stats["by_domain"][dm] += 1
    except Exception as e:
        print(f"Stats error: {e}")
    return stats
