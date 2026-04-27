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


async def capture(source_type: str, url: str = "", content: str = "", pdf_bytes: bytes = None, user_id: str = "demo_user", preview: bool = False) -> dict:
    """
    Capture knowledge from various sources using OpenAI for analysis.
    """
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


async def save_memory(memory_data: dict, user_id: str = "demo_user") -> dict:
    try:
        source_url = memory_data.get("source_url", "")

        # Duplicate guard: if this URL is already saved for this user, return existing
        existing = await _find_duplicate_by_url(user_id, source_url) if source_url else None
        if existing:
            return {
                **existing,
                "duplicate": True,
                "existing": existing,
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
            "userId": user_id,
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
    """Generate Q&A flashcards from a saved memory."""
    if not (settings.PRIMARY_AI_KEY or settings.OPENAI_API_KEY):
        return {"error": "No AI key configured. Set OPENAI_API_KEY in Secrets."}

    try:
        db = await get_db()
        doc = await db.collection("memories").document(memory_id).get()
        if not doc.exists:
            return {"error": f"Memory {memory_id} not found."}

        memory = doc.to_dict()
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
    """Generate a structured study plan based on saved memories."""
    try:
        db = await get_db()
        snapshot = await db.collection("memories").order_by("created_at", direction="DESCENDING").limit(10).get()
        memories = [doc.to_dict() for doc in snapshot]

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
    """Generate an AI daily briefing based on recent activity."""
    try:
        db = await get_db()
        memories_snap = await db.collection("memories").order_by("created_at", direction="DESCENDING").limit(5).get()
        tasks_snap = await db.collection("tasks").where("status", "==", "pending").limit(5).get()

        memories = [doc.to_dict() for doc in memories_snap]
        tasks = [doc.to_dict() for doc in tasks_snap]

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
    """Use AI to suggest 3-5 additional tags for an existing memory."""
    from app.db import get_db
    db = await get_db()
    doc = await db.collection("memories").document(memory_id).get()
    if not doc.exists:
        return {"error": "Memory not found", "tags": []}
    mem = doc.to_dict()
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
