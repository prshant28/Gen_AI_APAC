import os
import json
import datetime
from typing import List, Dict, Any, Optional
import google.generativeai as genai
from app.db import get_db
from app.config import settings

# genai configuration moved inside recall function

# Constants
STOPWORDS = {"the", "a", "an", "is", "are", "was", "were", "what", "how", "tell", "me", "find", "search", "recall", "about", "i", "my", "do", "know", "have"}
ALLOWED_DOMAINS = ["AI", "Technology", "Science", "Business", "Health", "History", "Philosophy", "Engineering", "Productivity", "Other"]

async def recall(query: str) -> dict:
    """
    Knowledge Recall Agent: Searches saved memories using a 3-tier fallback algorithm
    and synthesizes a comprehensive answer.
    """
    # Use API key from settings
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        return {
            "answer": "AI Service is not configured. Please set GEMINI_API_KEY in Settings.",
            "sources": [],
            "count": 0
        }
    
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(settings.GEMINI_MODEL)
    except Exception as e:
        return {
            "answer": f"Failed to configure AI service: {str(e)}",
            "sources": [],
            "count": 0
        }

    db = await get_db()
    memories = []
    
    # --- Tier 1: Tag Search ---
    keywords = [word.lower() for word in query.split() if word.lower() not in STOPWORDS]
    # Firestore array-contains-any limit is 10
    if keywords:
        search_keywords = keywords[:10]
        try:
            snapshot = await db.collection("memories") \
                .where("tags", "array_contains_any", search_keywords) \
                .limit(10) \
                .get()
            memories = [doc.to_dict() | {"id": doc.id} for doc in snapshot]
        except Exception as e:
            print(f"Tier 1 Search Error: {e}")

    # --- Tier 2: Domain Search (if Tier 1 yielded few results) ---
    if len(memories) < 3:
        try:
            domain_prompt = f"Classify this query into exactly one of these domains: {', '.join(ALLOWED_DOMAINS)}. Query: '{query}'. Return only the domain name."
            response = await model.generate_content_async(domain_prompt)
            classified_domain = response.text.strip()
            
            if classified_domain in ALLOWED_DOMAINS:
                snapshot = await db.collection("memories") \
                    .where("domain", "==", classified_domain) \
                    .limit(10) \
                    .get()
                
                # Merge and avoid duplicates
                existing_ids = {m["id"] for m in memories}
                for doc in snapshot:
                    if doc.id not in existing_ids:
                        memories.append(doc.to_dict() | {"id": doc.id})
        except Exception as e:
            print(f"Tier 2 Search Error: {e}")

    # --- Tier 3: Full Scan (if still few results) ---
    if len(memories) < 2:
        try:
            snapshot = await db.collection("memories") \
                .order_by("created_at", direction="DESCENDING") \
                .limit(30) \
                .get()
            
            recent_memories = [doc.to_dict() | {"id": doc.id} for doc in snapshot]
            if recent_memories:
                scan_data = [{"index": i, "title": m.get("title"), "summary": m.get("summary")} for i, m in enumerate(recent_memories)]
                scan_prompt = f"Which of these memories are most relevant to the query: '{query}'? Return a JSON array of the top 3 indices. Memories: {json.dumps(scan_data)}"
                
                response = await model.generate_content_async(
                    scan_prompt,
                    generation_config={"response_mime_type": "application/json"}
                )
                indices = json.loads(response.text)
                
                existing_ids = {m["id"] for m in memories}
                for idx in indices:
                    if isinstance(idx, int) and 0 <= idx < len(recent_memories):
                        m = recent_memories[idx]
                        if m["id"] not in existing_ids:
                            memories.append(m)
        except Exception as e:
            print(f"Tier 3 Search Error: {e}")

    # --- Synthesis ---
    if not memories:
        return {
            "answer": "I'm sorry, I couldn't find any relevant memories in your Second Brain to answer that question.",
            "sources": [],
            "count": 0
        }

    # Limit to top 5 for synthesis
    top_memories = memories[:5]
    formatted_text = ""
    for m in top_memories:
        formatted_text += f"Title: {m.get('title')}\nSummary: {m.get('summary')}\nKey Points: {', '.join(m.get('key_points', []))}\nSource: {m.get('source_url', 'N/A')}\n---\n"

    synthesis_prompt = f"""You are a personal knowledge assistant. The user asks: '{query}'
Here are relevant saved memories:
{formatted_text}

Synthesize a comprehensive answer. Cite sources like [Memory: title].
Keep answer under 200 words."""

    try:
        response = await model.generate_content_async(synthesis_prompt)
        answer = response.text.strip()
    except Exception as e:
        print(f"Synthesis Error: {e}")
        answer = "I found some relevant information but encountered an error while synthesizing the final answer."

    return {
        "answer": answer,
        "sources": [{"id": m["id"], "title": m.get("title"), "source_url": m.get("source_url")} for m in top_memories],
        "count": len(top_memories)
    }

async def list_memories(domain: str = "", limit: int = 20) -> List[dict]:
    """
    Lists recent memories, optionally filtered by domain.
    """
    db = await get_db()
    query_ref = db.collection("memories")
    
    if domain and domain in ALLOWED_DOMAINS:
        query_ref = query_ref.where("domain", "==", domain)
        
    snapshot = await query_ref.order_by("created_at", direction="DESCENDING").limit(limit).get()
    
    results = []
    for doc in snapshot:
        m = doc.to_dict()
        m["id"] = doc.id
        # Convert timestamp to string
        if "created_at" in m and hasattr(m["created_at"], "isoformat"):
            m["created_at"] = m["created_at"].isoformat()
        results.append(m)
        
    return results

async def get_memory(memory_id: str) -> dict:
    """
    Retrieves a single memory by ID.
    """
    db = await get_db()
    doc = await db.collection("memories").document(memory_id).get()
    
    if not doc.exists:
        raise ValueError(f"Memory with ID '{memory_id}' not found.")
        
    m = doc.to_dict()
    m["id"] = doc.id
    if "created_at" in m and hasattr(m["created_at"], "isoformat"):
        m["created_at"] = m["created_at"].isoformat()
    return m

async def get_stats() -> dict:
    """
    Returns counts of memories by source_type and domain using Firestore aggregation.
    """
    db = await get_db()
    
    # Note: For large datasets, we'd use a separate stats document updated on write.
    # For this hackathon scaffold, we perform a scan of recent items or use count() if available.
    # Async Firestore Client supports .count()
    
    stats = {
        "by_source": {},
        "by_domain": {},
        "total": 0
    }
    
    # Total count
    total_query = db.collection("memories").count()
    total_result = await total_query.get()
    stats["total"] = total_result[0][0].value
    
    # Counts by source_type
    for s_type in ["youtube", "web", "pdf", "note"]:
        count_query = db.collection("memories").where("source_type", "==", s_type).count()
        count_result = await count_query.get()
        stats["by_source"][s_type] = count_result[0][0].value
        
    # Counts by domain
    for domain in ALLOWED_DOMAINS:
        count_query = db.collection("memories").where("domain", "==", domain).count()
        count_result = await count_query.get()
        stats["by_domain"][domain] = count_result[0][0].value
        
    return stats
