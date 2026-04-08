import json
import datetime
from typing import List, Dict, Any, Optional
from openai import AsyncOpenAI
from app.db import get_db
from app.config import settings

STOPWORDS = {"the", "a", "an", "is", "are", "was", "were", "what", "how", "tell", "me", "find", "search", "recall", "about", "i", "my", "do", "know", "have", "can", "you"}
ALLOWED_DOMAINS = ["AI", "Technology", "Science", "Business", "Health", "History", "Philosophy", "Engineering", "Productivity", "Other"]


def get_client() -> AsyncOpenAI:
    return AsyncOpenAI(
        api_key=settings.OPENAI_API_KEY,
        base_url=settings.openai_base_url,
        default_headers=settings.openai_extra_headers
    )


async def recall(query: str) -> dict:
    """
    Semantic knowledge recall using OpenAI with 3-tier search fallback.
    """
    api_key = settings.OPENAI_API_KEY
    if not api_key:
        return {
            "answer": "AI Service is not configured. Please set OPENAI_API_KEY in Secrets.",
            "sources": [],
            "count": 0
        }

    client = get_client()
    db = await get_db()
    memories = []

    keywords = [w.lower() for w in query.split() if w.lower() not in STOPWORDS]

    if keywords:
        search_kw = keywords[:10]
        try:
            snapshot = await db.collection("memories") \
                .where("tags", "array_contains_any", search_kw) \
                .limit(10).get()
            memories = [doc.to_dict() | {"id": doc.id} for doc in snapshot]
        except Exception as e:
            print(f"Tier 1 Search Error: {e}")

    if len(memories) < 3:
        try:
            domain_resp = await client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[{
                    "role": "user",
                    "content": f"Classify this query into exactly one of these domains: {', '.join(ALLOWED_DOMAINS)}. Query: '{query}'. Return only the domain name, nothing else."
                }],
                temperature=0,
                max_tokens=20
            )
            classified_domain = domain_resp.choices[0].message.content.strip()
            if classified_domain in ALLOWED_DOMAINS:
                snapshot = await db.collection("memories") \
                    .where("domain", "==", classified_domain) \
                    .limit(10).get()
                existing_ids = {m["id"] for m in memories}
                for doc in snapshot:
                    if doc.id not in existing_ids:
                        memories.append(doc.to_dict() | {"id": doc.id})
        except Exception as e:
            print(f"Tier 2 Search Error: {e}")

    if len(memories) < 2:
        try:
            snapshot = await db.collection("memories") \
                .order_by("created_at", direction="DESCENDING") \
                .limit(30).get()
            recent = [doc.to_dict() | {"id": doc.id} for doc in snapshot]
            if recent:
                scan_data = [{"index": i, "title": m.get("title"), "summary": m.get("summary", "")[:100]} for i, m in enumerate(recent)]
                scan_resp = await client.chat.completions.create(
                    model=settings.OPENAI_MODEL,
                    messages=[{
                        "role": "user",
                        "content": f"Which of these memories are most relevant to the query: '{query}'? Return a JSON array of the top 3 indices only. Memories: {json.dumps(scan_data)}"
                    }],
                    response_format={"type": "json_object"},
                    temperature=0
                )
                raw = json.loads(scan_resp.choices[0].message.content)
                indices = raw if isinstance(raw, list) else list(raw.values())[0]
                existing_ids = {m["id"] for m in memories}
                for idx in indices:
                    if isinstance(idx, int) and 0 <= idx < len(recent):
                        m = recent[idx]
                        if m["id"] not in existing_ids:
                            memories.append(m)
        except Exception as e:
            print(f"Tier 3 Search Error: {e}")

    if not memories:
        return {
            "answer": "I couldn't find any relevant memories in your Second Brain. Try capturing some content first!",
            "sources": [],
            "count": 0
        }

    top_memories = memories[:5]
    formatted = ""
    for m in top_memories:
        created = m.get("created_at", "")
        if hasattr(created, "isoformat"):
            created = created.isoformat()
        formatted += f"Title: {m.get('title')}\nSummary: {m.get('summary', '')}\nKey Points: {', '.join(m.get('key_points', []))}\nSource: {m.get('source_url', 'N/A')}\nDate: {created}\n---\n"

    synthesis_prompt = f"""You are a personal knowledge assistant for a "Second Brain" app.
The user asks: '{query}'

Here are the most relevant saved memories:
{formatted}

Synthesize a comprehensive, helpful answer based on these memories. 
- Cite sources using [Memory: Title] notation
- Keep the answer concise (under 250 words)
- If multiple memories are relevant, connect the insights
- Use bullet points for clarity when listing multiple points"""

    try:
        resp = await client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[{"role": "user", "content": synthesis_prompt}],
            temperature=0.3,
            max_tokens=400
        )
        answer = resp.choices[0].message.content.strip()
    except Exception as e:
        print(f"Synthesis Error: {e}")
        answer = "I found relevant memories but encountered an error synthesizing the answer."

    return {
        "answer": answer,
        "sources": [{"id": m["id"], "title": m.get("title"), "source_url": m.get("source_url")} for m in top_memories],
        "count": len(top_memories)
    }


async def list_memories(domain: str = "", limit: int = 20) -> List[dict]:
    db = await get_db()
    query_ref = db.collection("memories")
    if domain and domain in ALLOWED_DOMAINS:
        query_ref = query_ref.where("domain", "==", domain)
    snapshot = await query_ref.order_by("created_at", direction="DESCENDING").limit(limit).get()
    results = []
    for doc in snapshot:
        m = doc.to_dict()
        m["id"] = doc.id
        if "created_at" in m and hasattr(m["created_at"], "isoformat"):
            m["created_at"] = m["created_at"].isoformat()
        results.append(m)
    return results


async def get_memory(memory_id: str) -> dict:
    db = await get_db()
    doc = await db.collection("memories").document(memory_id).get()
    if not doc.exists:
        raise ValueError(f"Memory '{memory_id}' not found.")
    m = doc.to_dict()
    m["id"] = doc.id
    if "created_at" in m and hasattr(m["created_at"], "isoformat"):
        m["created_at"] = m["created_at"].isoformat()
    return m


async def delete_memory(memory_id: str) -> dict:
    db = await get_db()
    doc_ref = db.collection("memories").document(memory_id)
    doc = await doc_ref.get()
    if not doc.exists:
        raise ValueError(f"Memory '{memory_id}' not found.")
    await doc_ref.delete()
    return {"success": True, "message": f"Memory {memory_id} deleted."}


async def get_stats() -> dict:
    db = await get_db()
    stats = {"by_source": {}, "by_domain": {}, "total": 0}
    try:
        total_query = db.collection("memories").count()
        total_result = await total_query.get()
        stats["total"] = total_result[0][0].value
        for s_type in ["youtube", "web", "pdf", "note"]:
            cq = db.collection("memories").where("source_type", "==", s_type).count()
            cr = await cq.get()
            stats["by_source"][s_type] = cr[0][0].value
        for domain in ALLOWED_DOMAINS:
            cq = db.collection("memories").where("domain", "==", domain).count()
            cr = await cq.get()
            stats["by_domain"][domain] = cr[0][0].value
    except Exception as e:
        print(f"Stats error: {e}")
    return stats
