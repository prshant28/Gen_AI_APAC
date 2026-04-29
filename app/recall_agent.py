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


async def recall(query: str) -> dict:
    """
    Semantic knowledge recall with 3-tier search + AI synthesis.
    Auto-falls back to OpenAI if primary (Gemini) rate-limits.
    Honours source-type intent: if user mentions "YouTube videos",
    only YouTube memories are returned.
    """
    db = await get_db()
    memories = []

    source_filter = _detect_source_filter(query)

    def _matches_filter(data: dict) -> bool:
        if not source_filter:
            return True
        return data.get("source_type") == source_filter

    keywords = [w.lower() for w in query.split() if w.lower() not in STOPWORDS]
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
            keywords = [w.lower() for w in query.split() if w.lower() not in STOPWORDS]

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
                    "content": f"Classify this query into exactly one of these domains: {', '.join(ALLOWED_DOMAINS)}. Query: '{query}'. Return only the domain name, nothing else."
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
            ][:30]
            if recent:
                scan_data = [{"index": i, "title": m.get("title"), "summary": m.get("summary", "")[:100]} for i, m in enumerate(recent)]
                raw_scan = await chat_json(
                    messages=[{
                        "role": "user",
                        "content": f"Which of these memories are most relevant to the query: '{query}'? Return a JSON object with key 'indices' containing an array of the top 3 index numbers. Memories: {json.dumps(scan_data)}"
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

    if not memories:
        if source_filter:
            label = SOURCE_LABELS.get(source_filter, source_filter)
            msg = f"You don't have any {label} captures saved yet. Try capturing one first from the Capture page!"
        else:
            msg = "I couldn't find any relevant memories in your Second Brain. Try capturing some content first!"
        return {"answer": msg, "sources": [], "count": 0}

    top_memories = memories[:5]
    formatted = ""
    for m in top_memories:
        created = m.get("created_at", "")
        if hasattr(created, "isoformat"):
            created = created.isoformat()
        st = m.get("source_type", "unknown")
        formatted += (
            f"Title: {m.get('title')}\n"
            f"Type: {st}\n"
            f"Summary: {m.get('summary', '')}\n"
            f"Key Points: {', '.join(m.get('key_points', []))}\n"
            f"Source: {m.get('source_url', 'N/A')}\n"
            f"Date: {created}\n---\n"
        )

    source_constraint = ""
    if source_filter:
        label = SOURCE_LABELS.get(source_filter, source_filter)
        source_constraint = (
            f"\nIMPORTANT: The user specifically asked about their {label} captures. "
            f"Every memory listed below is a {label}. Reference them as such — "
            f"do NOT call them notes/articles/PDFs.\n"
        )

    synthesis_prompt = f"""You are a personal knowledge assistant for a "Second Brain" app.
The user asks: '{query}'
{source_constraint}
Here are the most relevant saved memories:
{formatted}

Synthesize a comprehensive, helpful answer based on these memories.
- Cite sources using [Memory: Title] notation
- Keep the answer concise (under 250 words)
- If multiple memories are relevant, connect the insights
- Use bullet points for clarity when listing multiple points
- Only use information from the memories above. Do NOT invent topics not present."""

    try:
        answer_raw, _ = await chat_with_fallback(
            messages=[{"role": "user", "content": synthesis_prompt}],
            model=settings.OPENAI_MODEL,
            temperature=0.3,
            max_tokens=400,
        )
        answer = answer_raw.strip()
    except Exception as e:
        print(f"Synthesis Error: {e}")
        answer = "I found relevant memories but encountered an error synthesizing the answer."

    return {
        "answer": answer,
        "sources": [{
            "id": m["id"],
            "title": m.get("title"),
            "source_url": m.get("source_url"),
            "source_type": m.get("source_type"),
            "domain": m.get("domain"),
            "summary": (m.get("summary") or "")[:160],
        } for m in top_memories],
        "count": len(top_memories)
    }


async def list_memories(domain: str = "", limit: int = 20) -> List[dict]:
    db = await get_db()
    query_ref = db.collection("memories")
    if domain and domain in ALLOWED_DOMAINS:
        query_ref = query_ref.where("domain", "==", domain)
    # Over-fetch then filter to current user
    snapshot = await query_ref.order_by("created_at", direction="DESCENDING").limit(max(limit * 4, 80)).get()
    results = []
    for doc in snapshot:
        m = doc.to_dict()
        if not belongs_to_current_user(m):
            continue
        m["id"] = doc.id
        if "created_at" in m and hasattr(m["created_at"], "isoformat"):
            m["created_at"] = m["created_at"].isoformat()
        results.append(m)
        if len(results) >= limit:
            break
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


async def delete_memory(memory_id: str) -> dict:
    db = await get_db()
    doc_ref = db.collection("memories").document(memory_id)
    doc = await doc_ref.get()
    if not doc.exists or not belongs_to_current_user(doc.to_dict()):
        raise ValueError(f"Memory '{memory_id}' not found.")
    await doc_ref.delete()
    return {"success": True, "message": f"Memory {memory_id} deleted."}


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
