import re
import json
import httpx
import datetime
import io
import os
from bs4 import BeautifulSoup
from youtube_transcript_api import YouTubeTranscriptApi
from pypdf import PdfReader
from openai import AsyncOpenAI
from app.db import get_db
from app.config import settings
from app.ai_helper import chat_with_fallback, chat_json, get_primary_client


def get_openai_client() -> AsyncOpenAI:
    return get_primary_client()


async def analyze_with_openai(raw_text: str, model: str) -> dict:
    prompt = f"""Analyze this content and return a JSON object with these exact keys:
- summary (string, 3 sentences)
- key_points (array of 5 strings)
- tags (array of 3-5 lowercase single words)
- domain (single word from: AI, Technology, Science, Business, Health, History, Philosophy, Engineering, Productivity, Other)

Content: {raw_text if raw_text else "No content available."}

Return only valid JSON."""

    return await chat_json(
        messages=[{"role": "user", "content": prompt}],
        model=model,
        temperature=0.2,
    )


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
            if pdf_bytes:
                try:
                    reader = PdfReader(io.BytesIO(pdf_bytes))
                    text_parts = []
                    for page in reader.pages:
                        extracted = page.extract_text()
                        if extracted:
                            text_parts.append(extracted)
                    raw_text = " ".join(text_parts)[:4000]
                    title = "PDF Document"
                except Exception as e:
                    raw_text = f"Failed to parse PDF. Error: {str(e)}"
                    title = "PDF Parse Error"
            elif url:
                async with httpx.AsyncClient() as client:
                    try:
                        resp = await client.get(url, follow_redirects=True, timeout=20.0)
                        reader = PdfReader(io.BytesIO(resp.content))
                        text_parts = [p.extract_text() or "" for p in reader.pages]
                        raw_text = " ".join(text_parts)[:4000]
                        title = f"PDF from URL"
                    except Exception as e:
                        raw_text = f"Failed to fetch/parse PDF: {str(e)}"
                        title = "PDF Error"
            else:
                raw_text = "No PDF content provided."
                title = "Empty PDF"

        elif source_type == "note":
            raw_text = content[:4000]
            words = content.split()[:6]
            title = " ".join(words) + ("..." if len(content.split()) > 6 else "")
            if not title:
                title = "Quick Note"

        try:
            analysis = await analyze_with_openai(raw_text, model)
        except Exception as e:
            print(f"OpenAI Analysis Error: {e}")
            analysis = {
                "summary": f"Analysis failed: {str(e)}",
                "key_points": ["Error during processing", "Check API Key", "Check content"],
                "tags": ["error", "retry"],
                "domain": "Other"
            }

        memory_doc = {
            "source_type": source_type,
            "source_url": url,
            "title": analysis.get("title", title),
            "summary": analysis.get("summary", ""),
            "key_points": analysis.get("key_points", []),
            "tags": analysis.get("tags", []),
            "domain": analysis.get("domain", "Other"),
            "userId": user_id,
            "created_at": datetime.datetime.now(datetime.timezone.utc)
        }
        memory_doc["title"] = title

        if not preview:
            try:
                db = await get_db()
                _, doc_ref = await db.collection("memories").add(memory_doc)
                memory_doc["id"] = doc_ref.id
            except Exception as db_e:
                print(f"Firestore Save Error: {db_e}")
                memory_doc["id"] = f"mock_id_{int(datetime.datetime.now().timestamp())}"
        else:
            memory_doc["id"] = "preview_id"

        if hasattr(memory_doc["created_at"], "isoformat"):
            memory_doc["created_at"] = memory_doc["created_at"].isoformat()

        return memory_doc
    except Exception as e:
        print(f"General Capture Error: {e}")
        return {"error": str(e)}


async def save_memory(memory_data: dict, user_id: str = "demo_user") -> dict:
    try:
        db = await get_db()
        memory_doc = {
            "source_type": memory_data.get("source_type", "note"),
            "source_url": memory_data.get("source_url", ""),
            "title": memory_data.get("title", "Untitled"),
            "summary": memory_data.get("summary", ""),
            "key_points": memory_data.get("key_points", []),
            "tags": memory_data.get("tags", []),
            "domain": memory_data.get("domain", "Other"),
            "userId": user_id,
            "created_at": datetime.datetime.now(datetime.timezone.utc)
        }
        try:
            _, doc_ref = await db.collection("memories").add(memory_doc)
            memory_doc["id"] = doc_ref.id
        except Exception as db_e:
            print(f"Firestore Save Error: {db_e}")
            memory_doc["id"] = f"mock_id_{int(datetime.datetime.now().timestamp())}"

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
