"""
Discover Agent — uses LLM to suggest external resources (articles + YouTube videos)
for a given topic. Returns shape compatible with frontend cards.
"""
import json
import re
from typing import Dict, Any, List
from app.config import settings
from app.ai_helper import chat_json


_YT_RE = re.compile(r"(?:youtube\.com/watch\?(?:.*&)?v=|youtu\.be/)([A-Za-z0-9_-]{6,15})")


def _extract_yt_id(url: str) -> str | None:
    if not url:
        return None
    m = _YT_RE.search(url)
    return m.group(1) if m else None


def _domain_of(url: str) -> str:
    try:
        from urllib.parse import urlparse
        host = urlparse(url).hostname or ""
        return host.replace("www.", "")
    except Exception:
        return ""


async def discover_resources(topic: str, kinds: List[str] | None = None) -> Dict[str, Any]:
    """
    Ask the LLM to suggest 4-6 articles and 4-6 YouTube videos for a topic.
    Each item: {title, url, type: 'article'|'video', source, summary, thumbnail?}
    """
    topic = (topic or "").strip()
    if not topic:
        return {"topic": "", "items": [], "error": "topic required"}

    kinds = kinds or ["article", "video"]
    want_articles = "article" in kinds
    want_videos = "video" in kinds

    system = (
        "You are a research curator. Suggest only well-known, real, publicly accessible "
        "resources from reputable sources (e.g., Wikipedia, MIT OCW, freeCodeCamp, "
        "Khan Academy, Andrej Karpathy, 3Blue1Brown, Two Minute Papers, Stanford, "
        "Coursera, Hugging Face, official docs, well-known publications). "
        "Never fabricate URLs. If unsure, prefer canonical homepages over deep links."
    )

    parts = []
    if want_articles:
        parts.append('4-6 high-quality "article" entries from reputable sources (docs, papers, blog posts, tutorials)')
    if want_videos:
        parts.append('4-6 high-quality "video" entries — prefer real YouTube URLs of well-known channels')

    user = f"""Suggest external learning resources about: "{topic}".

Return strictly JSON:
{{
  "items": [
    {{
      "title": "Resource title",
      "url": "https://...",
      "type": "article" | "video",
      "source": "Channel/Publication name",
      "summary": "1-2 sentence why-it-matters"
    }}
  ]
}}

Include {' and '.join(parts)}.
Order: highest-signal items first. Mix article and video. No duplicates."""

    try:
        result = await chat_json(
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            model=settings.OPENAI_MODEL,
            temperature=0.4,
        )
    except Exception as e:
        return {"topic": topic, "items": [], "error": str(e)}

    raw_items = result.get("items") or []
    if not isinstance(raw_items, list):
        for v in result.values():
            if isinstance(v, list):
                raw_items = v
                break

    items: List[Dict[str, Any]] = []
    seen_urls: set[str] = set()
    for raw in raw_items:
        if not isinstance(raw, dict):
            continue
        url = (raw.get("url") or "").strip()
        title = (raw.get("title") or "").strip()
        if not url or not title or url in seen_urls:
            continue
        # Only allow real public http(s) URLs — reject javascript:, data:, file:, etc.
        try:
            from urllib.parse import urlparse
            parsed = urlparse(url)
            if parsed.scheme not in ("http", "https") or not parsed.hostname:
                continue
        except Exception:
            continue
        seen_urls.add(url)

        rtype = (raw.get("type") or "").lower()
        yt_id = _extract_yt_id(url)
        if yt_id:
            rtype = "video"
        elif rtype not in ("article", "video"):
            rtype = "article"

        item = {
            "title": title,
            "url": url,
            "type": rtype,
            "source": (raw.get("source") or _domain_of(url) or "").strip(),
            "summary": (raw.get("summary") or "").strip()[:240],
            "domain": _domain_of(url),
        }
        if yt_id:
            item["youtube_id"] = yt_id
            item["thumbnail"] = f"https://img.youtube.com/vi/{yt_id}/mqdefault.jpg"
        items.append(item)

    return {"topic": topic, "items": items, "count": len(items)}
