import re
import json
import httpx
import datetime
import io
import os
from bs4 import BeautifulSoup
from youtube_transcript_api import YouTubeTranscriptApi
from pypdf import PdfReader
import google.generativeai as genai
from app.db import get_db
from app.config import settings

# genai configuration moved inside capture function

async def capture(source_type: str, url: str = "", content: str = "", pdf_bytes: bytes = None, user_id: str = "demo_user", preview: bool = False) -> dict:
    """
    MCP-style tool to capture knowledge from various sources.
    If preview is True, it returns the analysis without saving to Firestore.
    """
    # Use API key from settings
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        print("Error: GEMINI_API_KEY not found in environment.")
        return {"error": "GEMINI_API_KEY not found. Please set it in the Settings menu."}
    
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(settings.GEMINI_MODEL)
    except Exception as e:
        print(f"Error configuring Gemini: {e}")
        return {"error": f"Failed to configure AI service: {str(e)}"}

    raw_text = ""
    title = "Untitled Content"
    
    try:
        # 1. FETCH CONTENT BASED ON SOURCE TYPE
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        
        if source_type == "youtube":
            # Extract video_id
            video_id_match = re.search(r"(?:v=|\/)([0-9A-Za-z_-]{11}).*", url)
            if video_id_match:
                video_id = video_id_match.group(1)
                try:
                    # Get transcript (first 3000 chars)
                    transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
                    raw_text = " ".join([t['text'] for t in transcript_list])[:3000]
                    title = f"YouTube Video: {video_id}"
                except Exception as e:
                    print(f"YouTube Transcript Error: {e}")
                    # Fallback to oEmbed for title
                    async with httpx.AsyncClient() as client:
                        try:
                            resp = await client.get(f"https://www.youtube.com/oembed?url={url}&format=json", headers=headers)
                            if resp.status_code == 200:
                                title = resp.json().get("title", "YouTube Video")
                        except:
                            title = "YouTube Video (Title Unavailable)"
                    raw_text = f"Title: {title}\nTranscript unavailable for {url}. Error: {str(e)}"
            else:
                raw_text = f"Invalid YouTube URL: {url}"
                title = "Invalid YouTube Link"

        elif source_type == "web":
            async with httpx.AsyncClient() as client:
                try:
                    resp = await client.get(url, follow_redirects=True, timeout=15.0, headers=headers)
                    soup = BeautifulSoup(resp.text, 'lxml')
                    
                    # Extract Title
                    title = soup.title.string.strip() if soup.title else "Web Article"
                    
                    # Extract Meta Description
                    meta_desc = ""
                    description_tag = soup.find("meta", attrs={"name": "description"}) or soup.find("meta", attrs={"property": "og:description"})
                    if description_tag:
                        meta_desc = description_tag.get("content", "").strip()
                    
                    # Extract Paragraphs
                    paragraphs = [p.get_text().strip() for p in soup.find_all('p') if len(p.get_text().strip()) > 20]
                    content_text = " ".join(paragraphs)
                    
                    raw_text = f"Title: {title}\nDescription: {meta_desc}\nContent: {content_text}"[:3000]
                except Exception as e:
                    print(f"Web Scrape Error: {e}")
                    raw_text = f"Failed to scrape web article: {url}. Error: {str(e)}"
                    title = "Web Scrape Failed"

        elif source_type == "pdf":
            if pdf_bytes:
                try:
                    reader = PdfReader(io.BytesIO(pdf_bytes))
                    text_parts = []
                    for page in reader.pages:
                        text_parts.append(page.extract_text())
                    raw_text = " ".join(text_parts)[:3000]
                    title = "PDF Document"
                except Exception as e:
                    raw_text = f"Failed to parse PDF. Error: {str(e)}"
                    title = "PDF Parse Error"
            else:
                raw_text = "No PDF bytes provided."
                title = "Empty PDF"

        elif source_type == "note":
            raw_text = content[:3000]
            title = "Typed Note"

        # 2. CALL GEMINI FOR ANALYSIS
        gemini_prompt = f"""Analyze this content and return a JSON object with these exact keys:
summary (string, 3 sentences), key_points (array of 5 strings),
tags (array of 3-5 lowercase single words), domain (single word from allowed list).

Allowed domains: [AI, Technology, Science, Business, Health, History, Philosophy, Engineering, Productivity, Other]

Content: {raw_text if raw_text else "No content available."}"""

        try:
            if not api_key:
                raise ValueError("GEMINI_API_KEY is not set in the environment.")

            response = await model.generate_content_async(
                gemini_prompt, 
                generation_config={
                    "response_mime_type": "application/json",
                    "temperature": 0.2
                }
            )
            if not response.text:
                raise ValueError("Gemini returned an empty response.")
            
            analysis = json.loads(response.text)
        except Exception as e:
            print(f"Gemini Analysis Error: {e}")
            analysis = {
                "summary": f"Analysis failed: {str(e)}",
                "key_points": ["Error during processing", "Check API Key", "Check content length"],
                "tags": ["error", "retry"],
                "domain": "Other"
            }

        # 3. SAVE TO FIRESTORE (only if not preview)
        memory_doc = {
            "source_type": source_type,
            "source_url": url,
            "title": title,
            "summary": analysis.get("summary", ""),
            "key_points": analysis.get("key_points", []),
            "tags": analysis.get("tags", []),
            "domain": analysis.get("domain", "Other"),
            "userId": user_id,
            "created_at": datetime.datetime.now(datetime.timezone.utc)
        }

        if not preview:
            try:
                db = await get_db()
                _, doc_ref = await db.collection("memories").add(memory_doc)
                memory_doc["id"] = doc_ref.id
            except Exception as db_e:
                print(f"Firestore Save Error (ignored): {db_e}")
                memory_doc["id"] = f"mock_id_{int(datetime.datetime.now().timestamp())}"
        else:
            memory_doc["id"] = "preview_id"
        
        # Convert datetime to string for the return dict
        if hasattr(memory_doc["created_at"], "isoformat"):
            memory_doc["created_at"] = memory_doc["created_at"].isoformat()

        return memory_doc
    except Exception as e:
        print(f"General Capture Error: {e}")
        return {"error": str(e)}

async def save_memory(memory_data: dict, user_id: str = "demo_user") -> dict:
    """
    Saves a refined memory document to Firestore.
    """
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
            print(f"Firestore Save Error in save_memory (ignored): {db_e}")
            memory_doc["id"] = f"mock_id_{int(datetime.datetime.now().timestamp())}"
            
        memory_doc["created_at"] = memory_doc["created_at"].isoformat()
        return memory_doc
    except Exception as e:
        print(f"Critical Capture Agent Error: {e}")
        return {"error": str(e)}
