"""
Discover Agent — fetches REAL YouTube videos via YouTube Data API v3
and uses LLM to surface high-signal articles for any topic.

Returns shape compatible with frontend cards:
  { items: [
      { title, url, type, source, summary, thumbnail, youtube_id?,
        channel_title?, channel_id?, view_count?, view_count_display?,
        duration_seconds?, duration_display?, published_at?, age_display? }
    ],
    count, error? }
"""
import os
import re
import time
import logging
import datetime
from typing import Dict, Any, List, Optional
from urllib.parse import urlparse

import httpx

from app.config import settings
from app.ai_helper import chat_json

logger = logging.getLogger("recall-x247")

YT_API_BASE = "https://www.googleapis.com/youtube/v3"
_YT_RE = re.compile(r"(?:youtube\.com/watch\?(?:.*&)?v=|youtu\.be/|youtube\.com/embed/)([A-Za-z0-9_-]{6,15})")
_ISO_DUR_RE = re.compile(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?")

# Tiny in-process cache so repeat searches within 10 minutes are instant
_YT_CACHE: Dict[str, tuple[float, List[Dict[str, Any]]]] = {}
_ART_CACHE: Dict[str, tuple[float, List[Dict[str, Any]]]] = {}
_CACHE_TTL = 600.0  # 10 minutes


def _extract_yt_id(url: str) -> Optional[str]:
    if not url:
        return None
    m = _YT_RE.search(url)
    return m.group(1) if m else None


def _domain_of(url: str) -> str:
    try:
        host = urlparse(url).hostname or ""
        return host.replace("www.", "")
    except Exception:
        return ""


def _parse_iso8601_duration(d: str) -> int:
    """Convert PT4M37S → 277 seconds. Returns 0 on failure."""
    if not d:
        return 0
    m = _ISO_DUR_RE.match(d)
    if not m:
        return 0
    h, mn, s = m.groups()
    return int(h or 0) * 3600 + int(mn or 0) * 60 + int(s or 0)


def _format_duration(seconds: int) -> str:
    if seconds <= 0:
        return ""
    h, rem = divmod(seconds, 3600)
    m, s = divmod(rem, 60)
    if h:
        return f"{h}:{m:02d}:{s:02d}"
    return f"{m}:{s:02d}"


def _humanize_views(n: int) -> str:
    if n is None:
        return ""
    if n >= 1_000_000_000:
        return f"{n / 1_000_000_000:.1f}B views"
    if n >= 1_000_000:
        return f"{n / 1_000_000:.1f}M views"
    if n >= 1_000:
        return f"{n / 1_000:.1f}K views"
    return f"{n} views"


def _humanize_age(iso_date: str) -> str:
    """ISO8601 → '3 weeks ago' style. Returns '' on failure."""
    if not iso_date:
        return ""
    try:
        # Strip Z if present, parse as UTC
        dt = datetime.datetime.fromisoformat(iso_date.replace("Z", "+00:00"))
        now = datetime.datetime.now(datetime.timezone.utc)
        delta = now - dt
        secs = int(delta.total_seconds())
        if secs < 60:
            return "just now"
        if secs < 3600:
            return f"{secs // 60}m ago"
        if secs < 86400:
            return f"{secs // 3600}h ago"
        days = secs // 86400
        if days < 7:
            return f"{days}d ago"
        if days < 30:
            wks = days // 7
            return f"{wks} week{'s' if wks > 1 else ''} ago"
        if days < 365:
            mos = days // 30
            return f"{mos} month{'s' if mos > 1 else ''} ago"
        yrs = days // 365
        return f"{yrs} year{'s' if yrs > 1 else ''} ago"
    except Exception:
        return ""


def _classify_video_kind(seconds: int) -> str:
    """Quick heuristic: short / tutorial / talk / lecture."""
    if seconds <= 0:
        return ""
    if seconds < 90:
        return "Short"
    if seconds < 12 * 60:
        return "Quick watch"
    if seconds < 35 * 60:
        return "Tutorial"
    if seconds < 75 * 60:
        return "Talk"
    return "Lecture"


async def _youtube_search(topic: str, max_results: int = 8) -> tuple[List[Dict[str, Any]], str]:
    """Call YouTube Data API v3 search.list + videos.list to get rich metadata.
    Returns (videos, status) where status ∈ {'ok','no_key','blocked','error'}."""
    # Prefer dedicated YOUTUBE_API_KEY if set, else fall back to GOOGLE_API_KEY
    api_key = (
        os.environ.get("YOUTUBE_API_KEY")
        or os.environ.get("YT_API_KEY")
        or settings.GOOGLE_API_KEY
    )
    if not api_key:
        logger.warning("YouTube search skipped: no API key")
        return [], "no_key"

    cache_key = f"{topic.lower().strip()}::{max_results}"
    cached = _YT_CACHE.get(cache_key)
    if cached and (time.time() - cached[0]) < _CACHE_TTL:
        return cached[1], "ok"

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            search_res = await client.get(
                f"{YT_API_BASE}/search",
                params={
                    "key": api_key,
                    "q": topic,
                    "part": "snippet",
                    "type": "video",
                    "maxResults": max_results,
                    "safeSearch": "moderate",
                    "relevanceLanguage": "en",
                    "videoEmbeddable": "true",
                },
            )
            if search_res.status_code != 200:
                err_text = search_res.text[:300]
                logger.warning(f"YouTube search.list failed {search_res.status_code}: {err_text}")
                if search_res.status_code == 403 and "blocked" in err_text.lower():
                    return [], "blocked"
                return [], "error"
            search_data = search_res.json()
            video_ids = [
                it["id"]["videoId"]
                for it in search_data.get("items", [])
                if it.get("id", {}).get("videoId")
            ]
            if not video_ids:
                return [], "ok"

            # Hydrate stats + duration in one call
            details_res = await client.get(
                f"{YT_API_BASE}/videos",
                params={
                    "key": api_key,
                    "id": ",".join(video_ids),
                    "part": "snippet,contentDetails,statistics",
                },
            )
            if details_res.status_code != 200:
                logger.warning(f"YouTube videos.list failed {details_res.status_code}: {details_res.text[:200]}")
                return [], "error"
            items = details_res.json().get("items", [])
    except Exception as e:
        logger.warning(f"YouTube API request failed: {e}")
        return [], "error"

    out: List[Dict[str, Any]] = []
    for it in items:
        vid = it.get("id")
        sn = it.get("snippet", {})
        cd = it.get("contentDetails", {})
        st = it.get("statistics", {})
        if not vid or not sn.get("title"):
            continue
        thumbs = sn.get("thumbnails", {}) or {}
        thumb = (
            thumbs.get("maxres", {}).get("url")
            or thumbs.get("standard", {}).get("url")
            or thumbs.get("high", {}).get("url")
            or thumbs.get("medium", {}).get("url")
            or thumbs.get("default", {}).get("url")
            or f"https://img.youtube.com/vi/{vid}/hqdefault.jpg"
        )
        duration_s = _parse_iso8601_duration(cd.get("duration", ""))
        view_count = int(st.get("viewCount", 0) or 0)
        published_at = sn.get("publishedAt", "")
        out.append({
            "title": sn.get("title", "").strip(),
            "url": f"https://www.youtube.com/watch?v={vid}",
            "type": "video",
            "source": sn.get("channelTitle", "YouTube"),
            "domain": "youtube.com",
            "summary": (sn.get("description") or "").strip()[:280],
            "thumbnail": thumb,
            "youtube_id": vid,
            "channel_title": sn.get("channelTitle", ""),
            "channel_id": sn.get("channelId", ""),
            "view_count": view_count,
            "view_count_display": _humanize_views(view_count),
            "duration_seconds": duration_s,
            "duration_display": _format_duration(duration_s),
            "published_at": published_at,
            "age_display": _humanize_age(published_at),
            "kind_label": _classify_video_kind(duration_s),
            "like_count": int(st.get("likeCount", 0) or 0),
        })

    _YT_CACHE[cache_key] = (time.time(), out)
    return out, "ok"


async def _llm_videos(topic: str, max_items: int = 6) -> List[Dict[str, Any]]:
    """Fallback: ask LLM to suggest well-known real YouTube videos when the
    Data API is unavailable. We don't fabricate metadata — only title + URL +
    a synthesized description. Used only when YouTube Data API is blocked."""
    system = (
        "You are a YouTube curator. Suggest only real, well-known YouTube videos "
        "from credible educational/professional channels (3Blue1Brown, MIT, Stanford, "
        "Andrej Karpathy, Yannic Kilcher, Computerphile, Two Minute Papers, freeCodeCamp, "
        "TED, conference talks). Never fabricate video IDs."
    )
    user = f"""Suggest {max_items} real YouTube videos about: "{topic}".
Use canonical YouTube URLs (https://www.youtube.com/watch?v=ID). Prefer popular,
high-quality educational videos. Order by likely usefulness.

Return strictly JSON:
{{ "items": [
  {{ "title": "...", "url": "https://www.youtube.com/watch?v=...", "channel": "Channel Name",
     "summary": "1-2 sentence value prop" }}
] }}"""
    try:
        result = await chat_json(
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            model=settings.OPENAI_MODEL,
            temperature=0.5,
        )
    except Exception as e:
        logger.warning(f"LLM videos call failed: {e}")
        return []

    raw_items = result.get("items") or []
    if not isinstance(raw_items, list):
        for v in result.values():
            if isinstance(v, list):
                raw_items = v
                break

    out: List[Dict[str, Any]] = []
    seen: set[str] = set()
    for raw in raw_items:
        if not isinstance(raw, dict):
            continue
        url = (raw.get("url") or "").strip()
        title = (raw.get("title") or "").strip()
        vid = _extract_yt_id(url)
        if not vid or not title or vid in seen:
            continue
        seen.add(vid)
        channel = (raw.get("channel") or "").strip()
        out.append({
            "title": title,
            "url": f"https://www.youtube.com/watch?v={vid}",
            "type": "video",
            "source": channel or "YouTube",
            "domain": "youtube.com",
            "summary": (raw.get("summary") or "").strip()[:240],
            "thumbnail": f"https://img.youtube.com/vi/{vid}/hqdefault.jpg",
            "youtube_id": vid,
            "channel_title": channel,
        })
    return out


async def _llm_articles(topic: str, max_items: int = 6) -> List[Dict[str, Any]]:
    """Use LLM to suggest reputable article-style resources for a topic."""
    cache_key = topic.lower().strip()
    cached = _ART_CACHE.get(cache_key)
    if cached and (time.time() - cached[0]) < _CACHE_TTL:
        return cached[1]

    system = (
        "You are a research curator. Suggest only well-known, real, publicly accessible "
        "article-style resources from reputable sources (Wikipedia, MIT OCW, freeCodeCamp, "
        "Khan Academy, official docs, well-known publications, arXiv abstracts). "
        "Never fabricate URLs. Prefer canonical homepages over deep links if unsure."
    )
    user = f"""Suggest {max_items} high-quality article-style learning resources about: "{topic}".
Articles only — no YouTube videos.

Return strictly JSON:
{{ "items": [
  {{ "title": "...", "url": "https://...", "source": "Channel/Publication", "summary": "1-2 sentence why-it-matters" }}
] }}

Order: highest-signal first. No duplicates."""

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
        logger.warning(f"LLM articles call failed: {e}")
        return []

    raw_items = result.get("items") or []
    if not isinstance(raw_items, list):
        for v in result.values():
            if isinstance(v, list):
                raw_items = v
                break

    out: List[Dict[str, Any]] = []
    seen: set[str] = set()
    for raw in raw_items:
        if not isinstance(raw, dict):
            continue
        url = (raw.get("url") or "").strip()
        title = (raw.get("title") or "").strip()
        if not url or not title or url in seen:
            continue
        try:
            parsed = urlparse(url)
            if parsed.scheme not in ("http", "https") or not parsed.hostname:
                continue
        except Exception:
            continue
        # Skip YouTube URLs in the article path — they should come from the YT API
        if _extract_yt_id(url):
            continue
        seen.add(url)
        out.append({
            "title": title,
            "url": url,
            "type": "article",
            "source": (raw.get("source") or _domain_of(url) or "").strip(),
            "domain": _domain_of(url),
            "summary": (raw.get("summary") or "").strip()[:240],
        })

    _ART_CACHE[cache_key] = (time.time(), out)
    return out


async def discover_resources(topic: str, kinds: List[str] | None = None) -> Dict[str, Any]:
    """Hybrid: real YouTube videos via Data API v3 + LLM-curated articles."""
    topic = (topic or "").strip()
    if not topic:
        return {"topic": "", "items": [], "error": "topic required"}

    kinds = kinds or ["article", "video"]
    want_articles = "article" in kinds
    want_videos = "video" in kinds

    videos: List[Dict[str, Any]] = []
    articles: List[Dict[str, Any]] = []
    yt_status = "skipped"

    # Run both in parallel where applicable
    import asyncio
    tasks = []
    if want_videos:
        tasks.append(_youtube_search(topic, max_results=8))
    else:
        tasks.append(asyncio.sleep(0, result=([], "skipped")))
    if want_articles:
        tasks.append(_llm_articles(topic, max_items=6))
    else:
        tasks.append(asyncio.sleep(0, result=[]))
    try:
        yt_result, articles = await asyncio.gather(*tasks)
        if want_videos:
            videos, yt_status = yt_result
        else:
            yt_status = "skipped"
    except Exception as e:
        logger.warning(f"discover gather failed: {e}")
        videos, articles, yt_status = [], [], "error"

    # If YouTube Data API is blocked / errored, fall back to LLM-suggested videos
    if want_videos and not videos and yt_status in ("blocked", "error", "no_key"):
        try:
            videos = await _llm_videos(topic, max_items=6)
        except Exception as e:
            logger.warning(f"LLM video fallback failed: {e}")
            videos = []

    # Interleave articles and videos so the grid feels mixed (3 vids, 1 article, repeat)
    items: List[Dict[str, Any]] = []
    vi = ai = 0
    while vi < len(videos) or ai < len(articles):
        for _ in range(2):
            if vi < len(videos):
                items.append(videos[vi]); vi += 1
        if ai < len(articles):
            items.append(articles[ai]); ai += 1

    return {
        "topic": topic,
        "items": items,
        "count": len(items),
        "video_count": len(videos),
        "article_count": len(articles),
        "youtube_api_used": yt_status == "ok",
        "youtube_api_status": yt_status,
    }
