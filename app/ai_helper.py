"""
Shared AI helper: primary client (Gemini) + automatic OpenAI fallback on 429.
"""
import json
from openai import AsyncOpenAI
from app.config import settings


def get_primary_client() -> AsyncOpenAI:
    return AsyncOpenAI(
        api_key=settings.PRIMARY_AI_KEY or settings.OPENAI_API_KEY,
        base_url=settings.openai_base_url,
        default_headers=settings.openai_extra_headers,
    )


def get_fallback_client():
    """Return (AsyncOpenAI, model_name) for the fallback provider, or (None, None)."""
    key = settings.FALLBACK_AI_KEY
    if not key:
        return None, None
    base_url = settings.FALLBACK_AI_BASE_URL
    model = settings.FALLBACK_AI_MODEL
    headers = {}
    if "openrouter" in base_url:
        headers = {
            "HTTP-Referer": "https://recall-x247.replit.app",
            "X-Title": "Recall X247",
        }
    client = AsyncOpenAI(api_key=key, base_url=base_url, default_headers=headers)
    return client, model


def is_rate_limit(err: Exception) -> bool:
    msg = str(err).lower()
    return (
        "429" in str(err)
        or "quota" in msg
        or "rate" in msg
        or "resource_exhausted" in msg
        or "too many requests" in msg
    )


def _clean_json(raw: str) -> str:
    """Strip markdown code fences if the model wrapped the JSON."""
    s = raw.strip()
    if s.startswith("```"):
        lines = s.split("\n")
        s = "\n".join(lines[1:])
        s = s.rsplit("```", 1)[0].strip()
    return s


async def chat_with_fallback(
    messages: list,
    model: str,
    response_format=None,
    temperature: float = 0.3,
    max_tokens: int = None,
) -> tuple[str, str]:
    """
    Call primary AI (Gemini). On 429 / quota errors, auto-retry with OpenAI fallback.
    Returns (content_str, provider_name).
    Raises on non-recoverable errors.
    """
    primary = get_primary_client()
    kwargs = dict(model=model, messages=messages, temperature=temperature)
    if response_format:
        kwargs["response_format"] = response_format
    if max_tokens:
        kwargs["max_tokens"] = max_tokens

    try:
        resp = await primary.chat.completions.create(**kwargs)
        return resp.choices[0].message.content, "primary"
    except Exception as e:
        if not is_rate_limit(e):
            raise

    # ── Fallback ──────────────────────────────────────────────────────────
    fb_client, fb_model = get_fallback_client()
    if not fb_client:
        raise RuntimeError(
            "Primary AI quota exceeded (HTTP 429). "
            "Set OPENAI_API_KEY in Secrets to enable automatic fallback."
        )

    kwargs["model"] = fb_model
    try:
        resp = await fb_client.chat.completions.create(**kwargs)
        return resp.choices[0].message.content, "fallback"
    except Exception as e2:
        # Some endpoints don't support response_format — retry without it
        if response_format and (
            "response_format" in str(e2).lower()
            or "unsupported" in str(e2).lower()
        ):
            kwargs.pop("response_format", None)
            resp = await fb_client.chat.completions.create(**kwargs)
            return resp.choices[0].message.content, "fallback"
        raise


async def chat_json(
    messages: list,
    model: str,
    temperature: float = 0.3,
) -> dict:
    """Convenience: call chat_with_fallback and parse JSON response."""
    raw, _ = await chat_with_fallback(
        messages=messages,
        model=model,
        response_format={"type": "json_object"},
        temperature=temperature,
    )
    return json.loads(_clean_json(raw))
