import re
import json
import base64
import httpx
import datetime
import io
import os
import hashlib
from urllib.parse import urlsplit, urlunsplit
from typing import Optional
from bs4 import BeautifulSoup
from youtube_transcript_api import YouTubeTranscriptApi
from pypdf import PdfReader
from openai import AsyncOpenAI
from app.db import get_db
from app.config import settings
from app.ai_helper import chat_with_fallback, chat_json, get_primary_client


# How big a PDF can be before we stop embedding it as base64 in the memory doc.
# Larger PDFs still work — we just don't store the bytes (vault detail won't render).
MAX_EMBED_PDF_BYTES = 3 * 1024 * 1024  # 3 MB

# How much raw text to send to the LLM for richer analysis (PDFs in particular).
ANALYSIS_TEXT_BUDGET = 14000


def get_openai_client() -> AsyncOpenAI:
    return get_primary_client()


async def analyze_with_openai(raw_text: str, model: str, *, source_type: str = "note") -> dict:
    """Generate a rich, structured analysis. The schema is the same across source
    types so the UI can render any subset; PDFs/web articles especially benefit
    from action_items, glossary and study_questions."""
    prompt = f"""You are an expert knowledge analyst. Analyze the following content
and return a JSON object with EXACTLY these keys:

- "summary": 3-4 sentence high-signal overview
- "executive_summary": 1 short paragraph (~60 words) for a busy reader — what this is, why it matters, biggest takeaway
- "key_points": array of 5-7 strings, each a crisp one-line insight (no leading bullets/numbers)
- "action_items": array of 3-5 short imperative phrases the reader should DO after reading (e.g., "Implement X locally", "Read paper Y", "Try Z exercise")
- "glossary": array of 3-6 objects {{"term": "...", "definition": "1 short sentence"}} for important domain terms
- "study_questions": array of 4-6 self-test questions that probe genuine understanding (avoid trivia)
- "tags": array of 4-6 lowercase short tags (1-2 words, no #), useful for search
- "domain": single word from: AI, Technology, Science, Business, Health, History, Philosophy, Engineering, Productivity, Other

Source type: {source_type}

Content:
\"\"\"
{raw_text if raw_text else "No content available."}
\"\"\"

Return ONLY valid JSON. Do not wrap it in markdown."""
    return await chat_json(
        messages=[{"role": "user", "content": prompt}],
        model=model,
        temperature=0.25,
    )


def _coerce_glossary(raw) -> list:
    """Normalize glossary into [{'term': str, 'definition': str}, ...]."""
    if not isinstance(raw, list):
        return []
    out = []
    for it in raw[:8]:
        if isinstance(it, dict):
            term = str(it.get("term") or it.get("name") or "").strip()
            defn = str(it.get("definition") or it.get("def") or it.get("desc") or "").strip()
            if term and defn:
                out.append({"term": term[:60], "definition": defn[:280]})
    return out


def _coerce_str_list(raw, max_items: int = 8, max_len: int = 240) -> list:
    if not isinstance(raw, list):
        return []
    out = []
    for it in raw[:max_items]:
        if it is None:
            continue
        s = str(it).strip()
        if s:
            out.append(s[:max_len])
    return out


async def capture(source_type: str, url: str = "", content: str = "", pdf_bytes: bytes = None, user_id: str = "", preview: bool = False) -> dict:
    """Capture knowledge from various sources using OpenAI for analysis."""
    # Resolve user_id from the request context if caller didn't override it.
    if not user_id:
        try:
            from app.user_context import get_uid
            user_id = get_uid()
        except Exception:
            user_id = "guest"
    api_key = settings.OPENAI_API_KEY
    if not api_key:
        return {"error": "OPENAI_API_KEY not found. Please set it in the Secrets panel."}

    model = settings.OPENAI_MODEL
    raw_text = ""
    title = "Untitled Content"
    # Optional PDF metadata that flows through to the saved memory document.
    pdf_meta: dict = {}

    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }

        if source_type == "youtube":
            video_id_match = re.search(r"(?:v=|\/)([0-9A-Za-z_-]{11}).*", url)
            if video_id_match:
                video_id = video_id_match.group(1)
                try:
                    transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
                    raw_text = " ".join([t['text'] for t in transcript_list])[:4000]
                    title = f"YouTube Video: {video_id}"
                except Exception as e:
                    async with httpx.AsyncClient() as client:
                        try:
                            resp = await client.get(f"https://www.youtube.com/oembed?url={url}&format=json", headers=headers)
                            if resp.status_code == 200:
                                title = resp.json().get("title", "YouTube Video")
                        except:
                            title = "YouTube Video (Title Unavailable)"
                    raw_text = f"Title: {title}\nTranscript unavailable. Error: {str(e)}"
            else:
                raw_text = f"Invalid YouTube URL: {url}"
                title = "Invalid YouTube Link"

        elif source_type == "web":
            async with httpx.AsyncClient() as client:
                try:
                    resp = await client.get(url, follow_redirects=True, timeout=15.0, headers=headers)
                    soup = BeautifulSoup(resp.text, 'lxml')
                    title = soup.title.string.strip() if soup.title else "Web Article"
                    meta_desc = ""
                    desc_tag = soup.find("meta", attrs={"name": "description"}) or soup.find("meta", attrs={"property": "og:description"})
                    if desc_tag:
                        meta_desc = desc_tag.get("content", "").strip()
                    paragraphs = [p.get_text().strip() for p in soup.find_all('p') if len(p.get_text().strip()) > 20]
                    content_text = " ".join(paragraphs)
                    raw_text = f"Title: {title}\nDescription: {meta_desc}\nContent: {content_text}"[:4000]
                except Exception as e:
                    raw_text = f"Failed to scrape web article: {url}. Error: {str(e)}"
                    title = "Web Scrape Failed"

        elif source_type == "pdf":
            pdf_source_bytes: Optional[bytes] = pdf_bytes
            if not pdf_source_bytes and url:
                async with httpx.AsyncClient() as client:
                    try:
                        resp = await client.get(url, follow_redirects=True, timeout=20.0)
                        pdf_source_bytes = resp.content
                    except Exception as e:
                        raw_text = f"Failed to fetch PDF: {str(e)}"
                        title = "PDF Error"

            if pdf_source_bytes:
                try:
                    reader = PdfReader(io.BytesIO(pdf_source_bytes))
                    page_count = len(reader.pages)
                    # Try to use the embedded title from PDF metadata
                    try:
                        meta = reader.metadata or {}
                        meta_title = (getattr(meta, "title", None) or meta.get("/Title") or "").strip() if meta else ""
                        if meta_title:
                            title = meta_title[:140]
                        else:
                            title = "PDF Document"
                    except Exception:
                        title = "PDF Document"

                    text_parts = []
                    for i, page in enumerate(reader.pages):
                        try:
                            extracted = page.extract_text()
                        except Exception:
                            extracted = ""
                        if extracted:
                            text_parts.append(extracted)
                    raw_text = "\n\n".join(text_parts)[:ANALYSIS_TEXT_BUDGET]

                    pdf_meta["pdf_pages"] = page_count
                    pdf_meta["pdf_size_kb"] = round(len(pdf_source_bytes) / 1024, 1)
                    pdf_meta["pdf_word_count"] = len(raw_text.split())
                    # Embed the actual bytes as base64 only when small enough
                    # so Vault can render the original PDF inline.
                    if len(pdf_source_bytes) <= MAX_EMBED_PDF_BYTES:
                        b64 = base64.b64encode(pdf_source_bytes).decode("ascii")
                        pdf_meta["pdf_data"] = f"data:application/pdf;base64,{b64}"
                except Exception as e:
                    raw_text = f"Failed to parse PDF. Error: {str(e)}"
                    title = "PDF Parse Error"
            elif not raw_text:
                raw_text = "No PDF content provided."
                title = "Empty PDF"

        elif source_type == "note":
            raw_text = content[:4000]
            words = content.split()[:6]
            title = " ".join(words) + ("..." if len(content.split()) > 6 else "")
            if not title:
                title = "Quick Note"

        try:
            analysis = await analyze_with_openai(raw_text, model, source_type=source_type)
        except Exception as e:
            print(f"OpenAI Analysis Error: {e}")
            analysis = {
                "summary": f"Analysis failed: {str(e)}",
                "executive_summary": "",
                "key_points": ["Error during processing", "Check API Key", "Check content"],
                "action_items": [],
                "glossary": [],
                "study_questions": [],
                "tags": ["error", "retry"],
                "domain": "Other",
            }

        memory_doc = {
            "source_type": source_type,
            "source_url": url,
            "title": analysis.get("title", title),
            "summary": analysis.get("summary", ""),
            "executive_summary": str(analysis.get("executive_summary") or "").strip(),
            "key_points": _coerce_str_list(analysis.get("key_points"), max_items=8, max_len=320),
            "action_items": _coerce_str_list(analysis.get("action_items"), max_items=6, max_len=200),
            "glossary": _coerce_glossary(analysis.get("glossary")),
            "study_questions": _coerce_str_list(analysis.get("study_questions"), max_items=6, max_len=240),
            "tags": _coerce_str_list(analysis.get("tags"), max_items=8, max_len=40),
            "domain": analysis.get("domain", "Other"),
            "userId": user_id,
            "user_id": user_id,
            "created_at": datetime.datetime.now(datetime.timezone.utc),
        }
        memory_doc["title"] = title
        # Attach PDF metadata (page count, size, embedded bytes) when available
        memory_doc.update(pdf_meta)

        duplicate_of = None
        if url:
            try:
                duplicate_of = await _find_duplicate_by_url(user_id, url)
            except Exception as dup_e:
                print(f"Duplicate check failed: {dup_e}")

        if not preview:
            if duplicate_of:
                memory_doc["id"] = duplicate_of["id"]
                memory_doc["duplicate"] = True
                memory_doc["existing"] = duplicate_of
            else:
                memory_doc = await _atomic_create_memory(memory_doc, user_id, url)
        else:
            memory_doc["id"] = "preview_id"
            if duplicate_of:
                memory_doc["duplicate_of"] = duplicate_of

        if hasattr(memory_doc["created_at"], "isoformat"):
            memory_doc["created_at"] = memory_doc["created_at"].isoformat()

        return memory_doc
    except Exception as e:
        print(f"General Capture Error: {e}")
        return {"error": str(e)}


def _normalize_url(raw: str) -> str:
    """Lowercase scheme/host, strip default ports, drop trailing slash on path,
    drop common tracking params (utm_*, fbclid, gclid, ref, ref_src). Returns ''
    if input is falsy or unparseable."""
    if not raw:
        return ""
    try:
        s = raw.strip()
        if not s:
            return ""
        parts = urlsplit(s)
        scheme = (parts.scheme or "https").lower()
        netloc = parts.netloc.lower()
        # strip default ports
        if netloc.endswith(":80") and scheme == "http":
            netloc = netloc[:-3]
        if netloc.endswith(":443") and scheme == "https":
            netloc = netloc[:-4]
        path = parts.path or ""
        if path.endswith("/") and len(path) > 1:
            path = path[:-1]
        # filter tracking params
        TRACKER_PREFIXES = ("utm_",)
        TRACKER_KEYS = {"fbclid", "gclid", "ref", "ref_src", "mc_cid", "mc_eid"}
        if parts.query:
            kept = []
            for kv in parts.query.split("&"):
                if not kv:
                    continue
                k = kv.split("=", 1)[0].lower()
                if k in TRACKER_KEYS or any(k.startswith(p) for p in TRACKER_PREFIXES):
                    continue
                kept.append(kv)
            query = "&".join(kept)
        else:
            query = ""
        # drop fragment for dedup purposes
        return urlunsplit((scheme, netloc, path, query, ""))
    except Exception:
        return raw.strip()


def _memory_doc_id(user_id: str, source_url: str) -> Optional[str]:
    """Return a deterministic Firestore document ID for a (user, normalized_url)
    pair, or None if URL is empty (notes/voice/PDF without URL get random IDs)."""
    norm = _normalize_url(source_url)
    if not norm:
        return None
    digest = hashlib.sha1(f"{user_id}|{norm}".encode("utf-8")).hexdigest()[:24]
    return f"u_{digest}"


async def _doc_to_memory_dict(doc) -> Optional[dict]:
    """Convert a Firestore snapshot to the standard duplicate metadata dict, or None."""
    if not getattr(doc, "exists", False):
        return None
    data = doc.to_dict() or {}
    created = data.get("created_at")
    if hasattr(created, "isoformat"):
        created = created.isoformat()
    return {
        "id": doc.id,
        "title": data.get("title", "Untitled"),
        "domain": data.get("domain", ""),
        "source_type": data.get("source_type", ""),
        "source_url": data.get("source_url", ""),
        "created_at": created,
    }


def _content_hash(title: str, summary: str) -> str:
    """SHA1 of normalized (title + first 400 chars of summary).
    Used to detect duplicate note-type memories so the vault doesn't get cluttered
    with near-identical entries when the user re-saves the same insight."""
    import hashlib, re as _re
    norm_title = _re.sub(r"\s+", " ", (title or "").lower().strip())[:200]
    norm_summary = _re.sub(r"\s+", " ", (summary or "").lower().strip())[:400]
    blob = f"{norm_title}|{norm_summary}".encode("utf-8")
    return hashlib.sha1(blob).hexdigest()


async def _find_duplicate_by_content_hash(
    user_id: str, title: str, summary: str, days_window: int = 90
) -> Optional[dict]:
    """Return existing memory dict if same (title+summary) hash already saved
    by this user in the last `days_window` days. Tolerant of legacy memories
    without a content_hash field (it's computed lazily on read)."""
    if not title and not summary:
        return None
    target_hash = _content_hash(title, summary)
    cutoff = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=days_window)
    try:
        db = await get_db()
        # In-memory store doesn't support compound indexed queries cleanly, so we
        # do a userId scan + Python-side filter. Bounded to 200 most-recent.
        snap = await db.collection("memories") \
            .where("userId", "==", user_id) \
            .order_by("created_at", direction="DESCENDING") \
            .limit(200).get()
        for d in snap:
            data = d.to_dict() or {}
            created = data.get("created_at")
            if hasattr(created, "isoformat"):
                created_dt = created if isinstance(created, datetime.datetime) else None
            else:
                try:
                    created_dt = datetime.datetime.fromisoformat(str(created).replace("Z", "+00:00"))
                except Exception:
                    created_dt = None
            if created_dt and created_dt < cutoff:
                continue
            stored = data.get("content_hash")
            if not stored:
                stored = _content_hash(data.get("title", ""), data.get("summary", ""))
            if stored == target_hash:
                return {
                    "id": d.id,
                    "title": data.get("title", "Untitled"),
                    "domain": data.get("domain", ""),
                    "source_type": data.get("source_type", ""),
                    "source_url": data.get("source_url", ""),
                    "created_at": created.isoformat() if hasattr(created, "isoformat") else created,
                }
    except Exception as e:
        print(f"_find_duplicate_by_content_hash error: {e}")
    return None


async def _find_duplicate_by_url(user_id: str, source_url: str) -> Optional[dict]:
    """Return an existing memory dict (id+title+created_at) matching userId+source_url.
    Fast path: deterministic doc lookup. Fallback: legacy `where(userId, source_url)` query
    for older docs with random IDs."""
    if not source_url:
        return None
    try:
        db = await get_db()
        # Fast path: deterministic ID
        det_id = _memory_doc_id(user_id, source_url)
        if det_id:
            doc = await db.collection("memories").document(det_id).get()
            md = await _doc_to_memory_dict(doc)
            if md:
                return md
        # Legacy fallback for memories saved before deterministic IDs existed,
        # and for URLs that share normalized form but were stored with raw URL
        norm = _normalize_url(source_url)
        for candidate_url in {source_url, norm}:
            if not candidate_url:
                continue
            query = db.collection("memories") \
                .where("userId", "==", user_id) \
                .where("source_url", "==", candidate_url) \
                .limit(1)
            docs = await query.get()
            for d in docs:
                data = d.to_dict() or {}
                created = data.get("created_at")
                if hasattr(created, "isoformat"):
                    created = created.isoformat()
                return {
                    "id": d.id,
                    "title": data.get("title", "Untitled"),
                    "domain": data.get("domain", ""),
                    "source_type": data.get("source_type", ""),
                    "source_url": data.get("source_url", ""),
                    "created_at": created,
                }
    except Exception as e:
        print(f"_find_duplicate_by_url error: {e}")
    return None


async def _atomic_create_memory(memory_doc: dict, user_id: str, source_url: str) -> dict:
    """Insert a memory doc atomically. For URL-bearing memories we use a deterministic
    document ID (sha1 of userId|normalized_url) so two concurrent saves of the same URL
    end up overwriting the SAME doc instead of creating two records. For URL-less
    memories (notes, voice, PDF without URL) we fall back to auto-generated IDs."""
    try:
        db = await get_db()
        det_id = _memory_doc_id(user_id, source_url)
        if det_id:
            doc_ref = db.collection("memories").document(det_id)
            existing = await doc_ref.get()
            if getattr(existing, "exists", False):
                md = await _doc_to_memory_dict(existing) or {"id": det_id}
                memory_doc["id"] = det_id
                memory_doc["duplicate"] = True
                memory_doc["existing"] = md
                return memory_doc
            # Persist a normalized source_url so legacy `where` queries also hit this row
            memory_doc["source_url"] = _normalize_url(source_url) or source_url
            await doc_ref.set(memory_doc)
            memory_doc["id"] = det_id
            return memory_doc
        # No URL → auto-id
        _, doc_ref = await db.collection("memories").add(memory_doc)
        memory_doc["id"] = doc_ref.id
        return memory_doc
    except Exception as db_e:
        print(f"Firestore Save Error: {db_e}")
        memory_doc["id"] = f"mock_id_{int(datetime.datetime.now().timestamp())}"
        return memory_doc


async def save_memory(memory_data: dict, user_id: str = "") -> dict:
    if not user_id:
        try:
            from app.user_context import get_uid
            user_id = get_uid()
        except Exception:
            user_id = "guest"
    try:
        source_url = memory_data.get("source_url", "")

        # Duplicate guard #1: same URL → return existing
        existing = await _find_duplicate_by_url(user_id, source_url) if source_url else None
        if existing:
            return {
                **existing,
                "duplicate": True,
                "existing": existing,
            }

        # Duplicate guard #2 (anti-clutter for notes): same content hash within 90 days.
        # Skips when there IS a URL — _find_duplicate_by_url already covers that case.
        if not source_url:
            content_dup = await _find_duplicate_by_content_hash(
                user_id,
                memory_data.get("title", ""),
                memory_data.get("summary", ""),
            )
            if content_dup:
                return {
                    **content_dup,
                    "duplicate": True,
                    "duplicate_reason": "content_hash",
                    "existing": content_dup,
                }

        memory_doc = {
            "source_type": memory_data.get("source_type", "note"),
            "source_url": source_url,
            "title": memory_data.get("title", "Untitled"),
            "summary": memory_data.get("summary", ""),
            "executive_summary": memory_data.get("executive_summary", ""),
            "key_points": memory_data.get("key_points", []) or [],
            "action_items": memory_data.get("action_items", []) or [],
            "glossary": memory_data.get("glossary", []) or [],
            "study_questions": memory_data.get("study_questions", []) or [],
            "tags": memory_data.get("tags", []) or [],
            "domain": memory_data.get("domain", "Other"),
            "content_hash": _content_hash(
                memory_data.get("title", ""), memory_data.get("summary", "")
            ),
            "userId": user_id,
            "user_id": user_id,
            "created_at": datetime.datetime.now(datetime.timezone.utc),
        }
        # PDF-only optional fields
        for k in ("pdf_data", "pdf_pages", "pdf_size_kb", "pdf_word_count"):
            if memory_data.get(k) is not None:
                memory_doc[k] = memory_data.get(k)
        # Free-form note from the user
        if memory_data.get("notes"):
            memory_doc["notes"] = memory_data.get("notes")
        memory_doc = await _atomic_create_memory(memory_doc, user_id, source_url)

        if hasattr(memory_doc.get("created_at"), "isoformat"):
            memory_doc["created_at"] = memory_doc["created_at"].isoformat()
        return memory_doc
    except Exception as e:
        return {"error": str(e)}


async def generate_flashcards(memory_id: str) -> dict:
    """Generate Q&A flashcards from a saved memory (current user only)."""
    from app.user_context import belongs_to_current_user
    if not (settings.PRIMARY_AI_KEY or settings.OPENAI_API_KEY):
        return {"error": "No AI key configured. Set OPENAI_API_KEY in Secrets."}

    try:
        db = await get_db()
        doc = await db.collection("memories").document(memory_id).get()
        if not doc.exists:
            return {"error": f"Memory {memory_id} not found."}

        memory = doc.to_dict()
        if not belongs_to_current_user(memory):
            return {"error": f"Memory {memory_id} not found."}
        content = f"Title: {memory.get('title')}\nSummary: {memory.get('summary')}\nKey Points: {', '.join(memory.get('key_points', []))}"

        prompt = f"""Create 5 educational flashcards from this content. Return JSON with key "flashcards" containing an array of objects with "question" and "answer" fields.

Content:
{content}"""

        result = await chat_json(
            messages=[{"role": "user", "content": prompt}],
            model=settings.OPENAI_MODEL,
            temperature=0.4,
        )
        cards = result.get("flashcards", [])
        if not cards:
            for v in result.values():
                if isinstance(v, list) and v:
                    cards = v
                    break
        return {
            "memory_title": memory.get("title"),
            "flashcards": cards,
        }
    except Exception as e:
        return {"error": str(e)}


async def generate_study_plan(topic: str = "", days: int = 7) -> dict:
    """Generate a structured study plan based on the current user's saved memories."""
    from app.user_context import belongs_to_current_user
    try:
        db = await get_db()
        snapshot = await db.collection("memories").order_by("created_at", direction="DESCENDING").limit(60).get()
        memories = [doc.to_dict() for doc in snapshot if belongs_to_current_user(doc.to_dict())][:10]

        memory_summary = "\n".join([f"- {m.get('title')}: {m.get('summary', '')[:100]}" for m in memories])

        prompt = f"""Create a {days}-day study plan based on these saved knowledge items{f' focusing on: {topic}' if topic else ''}.

Saved Knowledge:
{memory_summary if memory_summary else 'No memories saved yet.'}

Return JSON with key "plan" containing an array of objects with:
- day (number)
- date (string, starting from today {datetime.date.today().isoformat()})
- title (string)
- activities (array of strings, 2-3 activities)
- duration_minutes (number)
- focus_area (string)"""

        result = await chat_json(
            messages=[{"role": "user", "content": prompt}],
            model=settings.OPENAI_MODEL,
            temperature=0.5,
        )
        return {
            "topic": topic or "General Knowledge Review",
            "days": days,
            "plan": result.get("plan", [])
        }
    except Exception as e:
        return {"error": str(e)}


async def generate_daily_briefing() -> dict:
    """Generate an AI daily briefing based on recent activity for the current user."""
    from app.user_context import belongs_to_current_user
    try:
        db = await get_db()
        memories_snap = await db.collection("memories").order_by("created_at", direction="DESCENDING").limit(40).get()
        tasks_snap = await db.collection("tasks").where("status", "==", "pending").limit(40).get()

        memories = [doc.to_dict() for doc in memories_snap if belongs_to_current_user(doc.to_dict())][:5]
        tasks = [doc.to_dict() for doc in tasks_snap if belongs_to_current_user(doc.to_dict())][:5]

        memories_text = "\n".join([f"- {m.get('title')}" for m in memories]) or "No memories yet."
        tasks_text = "\n".join([f"- {t.get('title')} (Priority: {t.get('priority', 'medium')})" for t in tasks]) or "No pending tasks."

        prompt = f"""You are a personal AI assistant. Generate a brief, motivating daily briefing for today ({datetime.date.today().strftime('%A, %B %d, %Y')}).

Recent Knowledge Captured:
{memories_text}

Pending Tasks:
{tasks_text}

Write a 2-3 sentence briefing that summarizes their knowledge state and motivates them for today. Be concise and upbeat."""

        content, _ = await chat_with_fallback(
            messages=[{"role": "user", "content": prompt}],
            model=settings.OPENAI_MODEL,
            temperature=0.7,
            max_tokens=150,
        )
        return {
            "briefing": content.strip(),
            "date": datetime.date.today().isoformat()
        }
    except Exception as e:
        return {"briefing": "Ready for another great day of learning!", "date": datetime.date.today().isoformat()}


# ─── Auto-tag & share helpers ─────────────────────────────────────────────────

async def auto_tag_memory(memory_id: str) -> dict:
    """Use AI to suggest 3-5 additional tags for an existing memory (current user only)."""
    from app.db import get_db
    from app.user_context import belongs_to_current_user
    db = await get_db()
    doc = await db.collection("memories").document(memory_id).get()
    if not doc.exists:
        return {"error": "Memory not found", "tags": []}
    mem = doc.to_dict()
    if not belongs_to_current_user(mem):
        return {"error": "Memory not found", "tags": []}
    existing = mem.get("tags", []) or []
    text = f"{mem.get('title','')}\n\n{mem.get('summary','')}\n\nKey points: {' | '.join(mem.get('key_points', []) or [])}"

    prompt = (
        f"Suggest 5 short lowercase tags (1-2 words each) for this memory. "
        f"Avoid duplicates of existing tags: {existing}. "
        f"Return ONLY a JSON array like [\"tag1\",\"tag2\"]. No prose.\n\n{text[:1500]}"
    )
    try:
        content, _ = await chat_with_fallback(
            messages=[{"role": "user", "content": prompt}],
            model=settings.OPENAI_MODEL, temperature=0.4, max_tokens=120,
        )
        import json, re
        m = re.search(r"\[[^\]]+\]", content)
        new_tags = []
        if m:
            try:
                new_tags = [str(t).strip().lower() for t in json.loads(m.group(0))]
            except Exception:
                new_tags = [t.strip(' "\'').lower() for t in m.group(0).strip("[]").split(",")]
        new_tags = [t for t in new_tags if t and t not in existing][:5]
        merged = existing + new_tags
        await db.collection("memories").document(memory_id).update({"tags": merged})
        return {"id": memory_id, "added": new_tags, "tags": merged}
    except Exception as e:
        return {"error": str(e), "tags": existing}


async def transcribe_audio(audio_bytes: bytes, mime: str = "audio/webm") -> str:
    """Transcribe audio bytes to text using OpenAI Whisper (with graceful fallback)."""
    try:
        client = get_openai_client()
        import io
        ext = "webm"
        if "wav" in mime: ext = "wav"
        elif "mp3" in mime or "mpeg" in mime: ext = "mp3"
        elif "ogg" in mime: ext = "ogg"
        elif "m4a" in mime or "mp4" in mime: ext = "m4a"
        f = io.BytesIO(audio_bytes); f.name = f"voice.{ext}"
        resp = await client.audio.transcriptions.create(model="whisper-1", file=f)
        return getattr(resp, "text", "") or ""
    except Exception as e:
        return f"[Transcription failed: {e}] (Recorded {len(audio_bytes)} bytes)"


# ─── Time-Capture Bundle ────────────────────────────────────────────────────
# Sweep recent memories (e.g. last 6 / 24 hours), dedupe vs prior bundles,
# AI-synthesize a workspace, and persist as a Workspace project so all the
# scattered captures live as one organized Folder with summary + highlights.

def _parse_iso(ts) -> Optional[datetime.datetime]:
    if ts is None:
        return None
    if isinstance(ts, datetime.datetime):
        return ts if ts.tzinfo else ts.replace(tzinfo=datetime.timezone.utc)
    if not isinstance(ts, str):
        return None
    s = ts.strip()
    if not s:
        return None
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    try:
        dt = datetime.datetime.fromisoformat(s)
        return dt if dt.tzinfo else dt.replace(tzinfo=datetime.timezone.utc)
    except Exception:
        return None


async def list_memories_in_window(hours_back: int, limit: int = 200) -> list[dict]:
    """Return memories whose created_at falls inside [now - hours_back, now],
    scoped to the current user."""
    from app.user_context import belongs_to_current_user
    db = await get_db()
    snap = await db.collection("memories").order_by("created_at", direction="DESCENDING").limit(limit * 2).get()
    cutoff = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=max(1, hours_back))
    out: list[dict] = []
    for doc in snap:
        m = doc.to_dict() or {}
        if not belongs_to_current_user(m):
            continue
        m["id"] = doc.id
        ts = _parse_iso(m.get("created_at"))
        if ts is None or ts < cutoff:
            continue
        if hasattr(m.get("created_at"), "isoformat"):
            m["created_at"] = m["created_at"].isoformat()
        out.append(m)
        if len(out) >= limit:
            break
    return out


async def _already_bundled_memory_ids() -> set[str]:
    """Collect every memory id that's already been packed into a previous
    time-capture workspace for the *current user*, so reruns within the same
    window don't duplicate. Other users' bundles must not interfere."""
    from app.user_context import belongs_to_current_user
    try:
        db = await get_db()
        snap = await db.collection("workspace_projects").get()
        seen: set[str] = set()
        for doc in snap:
            d = doc.to_dict() or {}
            if not belongs_to_current_user(d):
                continue
            if (d.get("goal_type") or "") != "time_capture":
                continue
            for it in (d.get("items") or []):
                rid = it.get("ref_id")
                if rid:
                    seen.add(rid)
            meta = d.get("meta") or {}
            for rid in (meta.get("memory_ids") or []):
                if rid:
                    seen.add(rid)
        return seen
    except Exception as e:
        print(f"_already_bundled_memory_ids error: {e}")
        return set()


async def bundle_recent_activity(hours: int = 6) -> dict:
    """Capture-my-last-N-hours: fetches recent memories, dedupes vs prior
    bundles, asks the LLM to title + summarize + group into folders, then
    creates a Workspace project containing the items.

    Returns: { ok, project, summary, key_learnings, highlights, included, skipped }
    """
    from app.workspace_agent import create_project as _ws_create, add_items as _ws_add
    hours = max(1, min(48, int(hours or 6)))
    window_end = datetime.datetime.now(datetime.timezone.utc)
    window_start = window_end - datetime.timedelta(hours=hours)

    recent = await list_memories_in_window(hours_back=hours, limit=200)
    if not recent:
        return {
            "ok": False,
            "reason": "no_recent",
            "message": f"No captures found in the last {hours} hours.",
            "hours": hours,
            "window_start": window_start.isoformat(),
            "window_end": window_end.isoformat(),
        }

    already = await _already_bundled_memory_ids()
    fresh = [m for m in recent if m.get("id") not in already]
    skipped_ids = [m.get("id") for m in recent if m.get("id") in already]

    if not fresh:
        return {
            "ok": False,
            "reason": "all_bundled",
            "message": f"All {len(recent)} captures from the last {hours} hours are already in a workspace.",
            "hours": hours,
            "window_start": window_start.isoformat(),
            "window_end": window_end.isoformat(),
            "skipped": skipped_ids,
        }

    # Build a compact catalog for the LLM
    catalog_lines = []
    for i, m in enumerate(fresh[:40]):  # cap LLM input
        st = (m.get("source_type") or "note")
        title = (m.get("title") or "Untitled")[:120]
        summ = (m.get("summary") or "")[:240]
        tags = ", ".join((m.get("tags") or [])[:5])
        dom = m.get("domain") or "general"
        catalog_lines.append(
            f"[{i}] id={m.get('id')} | source={st} | domain={dom} | tags={tags}\n    title: {title}\n    summary: {summ}"
        )
    catalog = "\n".join(catalog_lines) or "(no items)"

    when_label = "the last 6 hours" if hours <= 6 else (f"the last {hours} hours" if hours < 24 else "today")
    prompt = f"""You are organizing a knowledge worker's scattered captures from {when_label} into ONE structured workspace.

Captures ({len(fresh)} total, indexed 0..{len(fresh)-1}):
{catalog}

Return STRICT JSON with these keys:
- "title": string, <=60 chars, descriptive workspace name (e.g. "Morning research: GenAI agents")
- "summary": string, 3-5 sentences synthesizing what the user worked on
- "key_learnings": array of 4-6 concise bullet strings (the takeaways across captures)
- "highlights": array of up to 3 objects {{"index": int, "why": "<one-line reason this item matters most>"}}
- "folders": array of 2-5 objects {{"name": "<short topical folder name>", "description": "<one-line>", "indexes": [<capture indexes that belong here>]}}

Rules:
- Every capture index 0..{len(fresh)-1} MUST appear in exactly one folder's "indexes".
- Folder names should be topical (e.g. "Agent design", "Python tooling"), not source-type names.
- Be specific and concrete, not generic. Use Hinglish words only if titles already used them.
- No emojis."""

    try:
        result = await chat_json(
            messages=[{"role": "user", "content": prompt}],
            model=settings.OPENAI_MODEL,
            temperature=0.3,
        )
    except Exception as e:
        return {"ok": False, "reason": "ai_failed", "message": f"AI synthesis failed: {e}"}

    title = (result.get("title") or f"Activity bundle · last {hours}h").strip()[:80]
    summary = (result.get("summary") or "").strip()
    learnings = [str(x).strip() for x in (result.get("key_learnings") or []) if str(x).strip()][:6]
    highlights_raw = result.get("highlights") or []
    folders_raw = result.get("folders") or []

    # ── Validate folder mapping: ensure every capture is bucketed exactly once.
    def _safe_idx(v):
        try:
            i = int(v)
            return i if 0 <= i < len(fresh) else None
        except Exception:
            return None

    folder_specs = []
    seen_idxs: set[int] = set()
    for fi, f in enumerate(folders_raw):
        name = (f.get("name") or f"Folder {fi+1}").strip()[:48]
        desc = (f.get("description") or "").strip()[:120]
        idxs = []
        for v in (f.get("indexes") or []):
            i = _safe_idx(v)
            if i is not None and i not in seen_idxs:
                idxs.append(i)
                seen_idxs.add(i)
        folder_specs.append({"name": name, "description": desc, "indexes": idxs})

    # Catch any captures the AI dropped → put in a misc folder
    leftovers = [i for i in range(len(fresh)) if i not in seen_idxs]
    if leftovers:
        if not folder_specs:
            folder_specs.append({"name": "Captures", "description": "Recent items", "indexes": leftovers})
        else:
            folder_specs.append({"name": "Other", "description": "Additional captures", "indexes": leftovers})

    # ── Create the workspace project with the AI-suggested folders.
    folders_payload = [
        {"id": _short_folder_id(spec["name"], i), "name": spec["name"], "description": spec["description"]}
        for i, spec in enumerate(folder_specs)
    ]
    project = await _ws_create(
        name=title,
        description=summary[:240],
        goal_type="time_capture",
        folders=folders_payload,
    )

    # Stamp dedup metadata directly onto the project doc.
    try:
        db = await get_db()
        pdoc = await db.collection("workspace_projects").document(project["id"]).get()
        pdata = pdoc.to_dict() or project
        pdata["meta"] = {
            "bundle_type": "time_capture",
            "hours": hours,
            "window_start": window_start.isoformat(),
            "window_end": window_end.isoformat(),
            "memory_ids": [m["id"] for m in fresh],
            "key_learnings": learnings,
            "summary": summary,
        }
        await db.collection("workspace_projects").document(project["id"]).set(pdata)
    except Exception as e:
        print(f"bundle_recent_activity meta-stamp error: {e}")

    # Add captures into their assigned folders.
    highlight_ids: set[str] = set()
    for h in highlights_raw[:3]:
        i = _safe_idx(h.get("index") if isinstance(h, dict) else h)
        if i is not None:
            highlight_ids.add(fresh[i]["id"])

    for spec, fp in zip(folder_specs, folders_payload):
        items = []
        for i in spec["indexes"]:
            m = fresh[i]
            items.append({
                "kind": "memory",
                "ref_id": m["id"],
                "title": m.get("title") or "Untitled",
                "url": m.get("source_url") or "",
                "meta": {
                    "source_type": m.get("source_type"),
                    "domain": m.get("domain"),
                    "created_at": m.get("created_at"),
                    "highlight": m["id"] in highlight_ids,
                    "tags": (m.get("tags") or [])[:5],
                },
            })
        if items:
            try:
                await _ws_add(project["id"], items, folder_id=fp["id"])
            except Exception as e:
                print(f"bundle_recent_activity add_items error: {e}")

    # Refresh project so we return the populated version.
    try:
        db = await get_db()
        pdoc = await db.collection("workspace_projects").document(project["id"]).get()
        if pdoc.exists:
            project = pdoc.to_dict() | {"id": pdoc.id}
    except Exception:
        pass

    highlights_out = [
        {
            "memory_id": fresh[_safe_idx(h.get("index") if isinstance(h, dict) else h)]["id"],
            "title": fresh[_safe_idx(h.get("index") if isinstance(h, dict) else h)].get("title"),
            "why": (h.get("why") if isinstance(h, dict) else "")[:160],
        }
        for h in highlights_raw[:3]
        if _safe_idx(h.get("index") if isinstance(h, dict) else h) is not None
    ]

    return {
        "ok": True,
        "hours": hours,
        "window_start": window_start.isoformat(),
        "window_end": window_end.isoformat(),
        "project": project,
        "summary": summary,
        "key_learnings": learnings,
        "highlights": highlights_out,
        "included": [m["id"] for m in fresh],
        "skipped": skipped_ids,
        "stats": {
            "captured": len(fresh),
            "skipped_already_bundled": len(skipped_ids),
            "folders": len(folders_payload),
        },
    }


def _short_folder_id(name: str, idx: int) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", (name or "").lower()).strip("-")[:24] or f"folder-{idx}"
    return f"f_{base}_{idx}"


# ─── Multi-Source Capture Session ───────────────────────────────────────────
# A session is a tray of mixed inputs (notes, links, voice transcripts, images)
# that the user assembles, then commits as ONE bundle into a target workspace.
# Folder modes: 'auto' (AI names a fresh workspace), 'create' (caller-provided
# name → new workspace), 'existing' (caller-provided project_id).
#
# Each item is funneled through the existing single-capture pipeline so the
# original /capture flow remains the source of truth — this is purely an
# orchestration layer.

async def process_capture_session(
    items: list[dict],
    folder_mode: str = "auto",
    folder_name: str = "",
    project_id: str = "",
    hint: str = "",
    user_id: str = "",
) -> dict:
    """Run a batch of mixed-source capture items, then route results into one
    workspace. Returns { ok, session_id, project, memories, summary, errors }."""
    from app.workspace_agent import (
        create_project as _ws_create,
        get_project as _ws_get,
        add_items as _ws_add,
    )
    if not items:
        return {"ok": False, "reason": "empty", "message": "Session has no items."}

    session_id = f"sess_{uuid_hex8()}"
    saved_memories: list[dict] = []
    errors: list[dict] = []

    # ── Phase 1: ingest each item via the existing capture path ──────────
    for idx, raw in enumerate(items):
        kind = (raw.get("kind") or "").strip().lower()
        try:
            if kind == "note":
                content = (raw.get("content") or "").strip()
                if not content:
                    errors.append({"index": idx, "kind": kind, "error": "empty content"})
                    continue
                result = await capture(source_type="note", content=content, user_id=user_id)
            elif kind == "link":
                url = (raw.get("url") or "").strip()
                if not url:
                    errors.append({"index": idx, "kind": kind, "error": "empty url"})
                    continue
                source_type = "youtube" if ("youtube.com" in url or "youtu.be" in url) else "web"
                result = await capture(source_type=source_type, url=url, user_id=user_id)
            elif kind == "voice":
                # Voice items arrive as already-transcribed text (the client uses
                # the existing /capture/voice transcription endpoint first).
                transcript = (raw.get("content") or raw.get("transcript") or "").strip()
                if not transcript:
                    errors.append({"index": idx, "kind": kind, "error": "empty transcript"})
                    continue
                result = await capture(source_type="note", content=f"[Voice memo]\n{transcript}", user_id=user_id)
            elif kind == "image":
                # Image items: caller passes caption/OCR text + a base64 data URL.
                # We treat the caption as a note so it flows through the same pipeline,
                # then attach the FULL data URL to the resulting memory doc under
                # `image_data` so it round-trips to vault detail (mirrors how PDFs
                # use `pdf_data`). Cap at MAX_EMBED_PDF_BYTES to avoid doc bloat.
                caption = (raw.get("caption") or raw.get("alt") or raw.get("title") or "Captured image").strip()
                ocr = (raw.get("ocr_text") or "").strip()
                body = caption + (f"\n\nExtracted text:\n{ocr}" if ocr else "")
                result = await capture(source_type="note", content=body, user_id=user_id)
                if isinstance(result, dict):
                    data_url = (raw.get("data_url") or "").strip()
                    # Rough byte estimate from base64 length (4 chars ≈ 3 bytes)
                    if data_url and len(data_url) <= MAX_EMBED_PDF_BYTES * 4 // 3:
                        result["image_data"] = data_url
                        result["image_caption"] = caption
                        # Stamp a marker into notes so search / vault lists know
                        result["notes"] = ((result.get("notes") or "") + f"\n\n[image attached · {caption}]").strip()
                    elif data_url:
                        # Too big to embed — store caption only and warn caller.
                        result["notes"] = ((result.get("notes") or "") + f"\n\n[image too large to embed · {caption}]").strip()
            else:
                errors.append({"index": idx, "kind": kind, "error": f"unsupported kind: {kind!r}"})
                continue

            if not isinstance(result, dict) or "error" in result:
                errors.append({"index": idx, "kind": kind, "error": str(result.get("error") if isinstance(result, dict) else result)})
                continue

            # Persist to memories collection (capture() returns a structured
            # analysis but does NOT auto-save; mirrors the single /capture flow).
            saved = await save_memory(result, user_id=user_id)
            if isinstance(saved, dict) and saved.get("id"):
                saved_memories.append(saved)
            else:
                errors.append({"index": idx, "kind": kind, "error": "save returned no id"})
        except Exception as e:
            errors.append({"index": idx, "kind": kind, "error": str(e)})

    if not saved_memories:
        return {
            "ok": False,
            "reason": "all_failed",
            "message": "No items in this session could be captured.",
            "errors": errors,
            "session_id": session_id,
        }

    # ── Phase 2: resolve target workspace ───────────────────────────────
    project: Optional[dict] = None
    folder_mode = (folder_mode or "auto").lower()

    if folder_mode == "existing" and project_id:
        project = await _ws_get(project_id)
        if not project:
            return {"ok": False, "reason": "missing_project", "message": f"Workspace {project_id} not found.", "session_id": session_id}
    elif folder_mode == "create":
        name = (folder_name or "").strip() or "Capture session"
        project = await _ws_create(
            name=name,
            description=hint or f"Session of {len(saved_memories)} captures",
            goal_type="capture_session",
        )
    else:
        # auto: ask AI for a topical folder name + short description
        catalog_lines = []
        for i, m in enumerate(saved_memories[:30]):
            t = (m.get("title") or "Untitled")[:120]
            s = (m.get("summary") or "")[:200]
            st = m.get("source_type") or "note"
            catalog_lines.append(f"[{i}] {st} :: {t}\n    {s}")
        catalog = "\n".join(catalog_lines) or "(no items)"
        prompt = f"""You are naming a workspace folder for a batch of captures the user just collected{f' (user hint: {hint})' if hint else ''}.

Captures ({len(saved_memories)}):
{catalog}

Return STRICT JSON:
- "name": string, <=48 chars, descriptive topical folder name (NOT generic like "Notes" — be specific to the content)
- "description": string, <=140 chars, one-sentence summary of what this folder contains
- "summary": string, 2-3 sentences synthesizing what the user captured
No emojis."""
        try:
            ai = await chat_json(
                messages=[{"role": "user", "content": prompt}],
                model=settings.OPENAI_MODEL,
                temperature=0.3,
            )
        except Exception as e:
            ai = {"name": "Capture session", "description": f"AI naming failed: {e}", "summary": ""}
        # Sanitize AI output: blank/whitespace/junk -> deterministic fallback so
        # workspace_agent doesn't silently rename to "Untitled project".
        fallback_name = (hint.strip()[:48] if hint else "") or f"Capture session · {len(saved_memories)} items"
        name = _sanitize_ai_name(ai.get("name"), fallback_name, max_len=48)
        description = (ai.get("description") or "").strip()[:240]
        summary_text = (ai.get("summary") or "").strip()
        project = await _ws_create(
            name=name,
            description=description or summary_text[:240],
            goal_type="capture_session",
        )
        # Stamp session metadata on the project for traceability.
        try:
            db = await get_db()
            pdoc = await db.collection("workspace_projects").document(project["id"]).get()
            pdata = pdoc.to_dict() or project
            pdata["meta"] = {
                "bundle_type": "capture_session",
                "session_id": session_id,
                "summary": summary_text,
                "memory_ids": [m["id"] for m in saved_memories],
                "created_at": _utcnow_session(),
            }
            await db.collection("workspace_projects").document(project["id"]).set(pdata)
            project = pdata | {"id": project["id"]}
        except Exception as e:
            print(f"process_capture_session meta-stamp error: {e}")

    # ── Phase 3: add memories as workspace items ────────────────────────
    items_payload = [
        {
            "kind": "memory",
            "ref_id": m["id"],
            "title": m.get("title") or "Untitled",
            "url": m.get("source_url") or "",
            "meta": {
                "source_type": m.get("source_type"),
                "domain": m.get("domain"),
                "tags": (m.get("tags") or [])[:5],
                "session_id": session_id,
            },
        }
        for m in saved_memories
    ]
    routing_ok = True
    routing_error = ""
    try:
        await _ws_add(project["id"], items_payload)
    except Exception as e:
        routing_ok = False
        routing_error = str(e) or "add_items failed"
        errors.append({"index": -1, "kind": "routing", "error": routing_error})
        print(f"process_capture_session add_items error: {e}")

    # Refresh project to return populated state.
    try:
        db = await get_db()
        pdoc = await db.collection("workspace_projects").document(project["id"]).get()
        if pdoc.exists:
            project = pdoc.to_dict() | {"id": pdoc.id}
    except Exception:
        pass

    return {
        "ok": routing_ok,
        "session_id": session_id,
        "project": project,
        "memories": [{"id": m["id"], "title": m.get("title"), "source_type": m.get("source_type")} for m in saved_memories],
        "summary": (project.get("meta") or {}).get("summary", "") if isinstance(project, dict) else "",
        "routing_error": routing_error,
        "stats": {
            "captured": len(saved_memories),
            "failed": len(errors),
            "routed": len(items_payload) if routing_ok else 0,
            "folder_mode": folder_mode,
        },
        "errors": errors,
    }


def _sanitize_ai_name(raw, fallback: str, max_len: int = 48) -> str:
    """Coerce an AI-generated title/folder name into a usable string.
    Returns `fallback` when the AI value is missing, non-string, blank,
    or a generic placeholder that would lead to "Untitled project"."""
    if not isinstance(raw, str):
        return fallback
    cleaned = raw.strip().strip('"').strip("'").strip()
    if not cleaned:
        return fallback
    low = cleaned.lower()
    junk = {"untitled", "untitled project", "notes", "note", "n/a", "none", "tbd"}
    if low in junk:
        return fallback
    return cleaned[:max_len]


def uuid_hex8() -> str:
    import uuid as _uuid
    return _uuid.uuid4().hex[:8]


def _utcnow_session() -> str:
    return datetime.datetime.now(datetime.timezone.utc).isoformat()
