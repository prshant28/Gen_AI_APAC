import os
import json
from pydantic_settings import BaseSettings
from typing import Optional

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
OPENAI_BASE_URL = "https://api.openai.com/v1"
GEMINI_COMPAT_URL = "https://generativelanguage.googleapis.com/v1beta/openai/"


def _is_openrouter_key(key: Optional[str]) -> bool:
    return bool(key and key.startswith("sk-or-v1"))


class Settings(BaseSettings):
    GCP_PROJECT_ID: Optional[str] = None
    FIREBASE_DATABASE_ID: Optional[str] = None
    GOOGLE_APPLICATION_CREDENTIALS: Optional[str] = None
    GEMINI_MODEL: str = "gemini-2.0-flash"
    GEMINI_API_KEY: Optional[str] = None
    GOOGLE_API_KEY: Optional[str] = None
    GOOGLE_CALENDAR_ID: Optional[str] = None
    GOOGLE_SA_KEY_PATH: Optional[str] = None
    GOOGLE_CSE_CX: Optional[str] = None
    GEN_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gemini-2.0-flash"
    USE_OPENROUTER: bool = False
    USE_GEMINI: bool = False

    # Primary client key (Gemini or fallback)
    PRIMARY_AI_KEY: Optional[str] = None
    PRIMARY_AI_BASE_URL: Optional[str] = None
    PRIMARY_AI_MODEL: Optional[str] = None

    # Fallback key (real OpenAI or OpenRouter) — used when primary 429s
    FALLBACK_AI_KEY: Optional[str] = None
    FALLBACK_AI_BASE_URL: str = OPENAI_BASE_URL
    FALLBACK_AI_MODEL: str = "gpt-4o-mini"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

        config_path = "firebase-applet-config.json"
        if os.path.exists(config_path):
            try:
                with open(config_path, "r") as f:
                    config = json.load(f)
                    if not self.GCP_PROJECT_ID:
                        self.GCP_PROJECT_ID = config.get("projectId")
                    if not self.FIREBASE_DATABASE_ID:
                        self.FIREBASE_DATABASE_ID = config.get("firestoreDatabaseId")
            except Exception as e:
                print(f"Error loading firebase config: {e}")

        if not self.GCP_PROJECT_ID:
            self.GCP_PROJECT_ID = os.getenv(
                "FIREBASE_PROJECT_ID", os.getenv("GCP_PROJECT_ID", "demo-project")
            )
        if not self.FIREBASE_DATABASE_ID:
            self.FIREBASE_DATABASE_ID = os.getenv("FIREBASE_DATABASE_ID", "(default)")

        # Save the RAW OPENAI_API_KEY before anything overwrites it
        raw_openai_key = (
            os.getenv("OPENAI_API_KEY")
            or os.getenv("FALLBACK_AI_KEY")
            or os.getenv("GEN_APAC_API_KEY")
            or os.getenv("GEN_API_KEY")
        )

        # Resolve Gemini API key
        gemini_key = (
            os.getenv("GOOGLE_API_KEY")
            or os.getenv("GEMINI_API_KEY")
            or self.GEMINI_API_KEY
        )
        if gemini_key:
            self.GEMINI_API_KEY = gemini_key
            self.GOOGLE_API_KEY = gemini_key

        # --- Build PRIMARY client config ---
        if self.GEMINI_API_KEY:
            self.PRIMARY_AI_KEY = self.GEMINI_API_KEY
            self.PRIMARY_AI_BASE_URL = GEMINI_COMPAT_URL
            self.PRIMARY_AI_MODEL = self.GEMINI_MODEL
            self.USE_GEMINI = True
            self.USE_OPENROUTER = False
            # Keep OPENAI_API_KEY pointing at Gemini for backward compat
            self.OPENAI_API_KEY = self.GEMINI_API_KEY
            self.OPENAI_MODEL = self.GEMINI_MODEL
        else:
            # No Gemini — use OpenAI / OpenRouter as primary
            resolved_key = raw_openai_key
            if resolved_key:
                self.PRIMARY_AI_KEY = resolved_key
                if _is_openrouter_key(resolved_key):
                    self.PRIMARY_AI_BASE_URL = OPENROUTER_BASE_URL
                    self.PRIMARY_AI_MODEL = "openai/gpt-4o-mini"
                    self.USE_OPENROUTER = True
                else:
                    self.PRIMARY_AI_BASE_URL = OPENAI_BASE_URL
                    self.PRIMARY_AI_MODEL = "gpt-4o-mini"
                self.OPENAI_API_KEY = resolved_key
                self.OPENAI_MODEL = self.PRIMARY_AI_MODEL

        # --- Build FALLBACK client config ---
        # Fallback = real OpenAI key (distinct from Gemini key)
        # Only set FALLBACK if there's a separate non-Gemini key available
        if self.USE_GEMINI and raw_openai_key:
            # We have both Gemini (primary) and an OpenAI key (fallback)
            self.FALLBACK_AI_KEY = raw_openai_key
            if _is_openrouter_key(raw_openai_key):
                self.FALLBACK_AI_BASE_URL = OPENROUTER_BASE_URL
                self.FALLBACK_AI_MODEL = "openai/gpt-4o-mini"
            else:
                self.FALLBACK_AI_BASE_URL = OPENAI_BASE_URL
                self.FALLBACK_AI_MODEL = "gpt-4o-mini"
        elif not self.USE_GEMINI:
            self.FALLBACK_AI_KEY = None

    @property
    def openai_base_url(self) -> str:
        return self.PRIMARY_AI_BASE_URL or (GEMINI_COMPAT_URL if self.USE_GEMINI else OPENAI_BASE_URL)

    @property
    def openai_extra_headers(self) -> dict:
        if self.USE_GEMINI:
            return {}
        if self.USE_OPENROUTER:
            return {
                "HTTP-Referer": "https://recall-x247.replit.app",
                "X-Title": "Recall X247",
            }
        return {}

    @property
    def active_ai_key(self) -> Optional[str]:
        return self.PRIMARY_AI_KEY or self.OPENAI_API_KEY or self.GEMINI_API_KEY

    @property
    def using_openai(self) -> bool:
        return bool(self.OPENAI_API_KEY)

    @property
    def has_fallback(self) -> bool:
        return bool(self.FALLBACK_AI_KEY)

    @property
    def ai_provider_name(self) -> str:
        if self.USE_GEMINI:
            fallback_info = " + OpenAI fallback" if self.has_fallback else ""
            return f"Google Gemini ({self.GEMINI_MODEL}){fallback_info}"
        if self.USE_OPENROUTER:
            return f"OpenRouter ({self.OPENAI_MODEL})"
        return f"OpenAI ({self.OPENAI_MODEL})"

    class Config:
        env_file = ".env"


settings = Settings()
print(f"AI Provider: {settings.ai_provider_name}")
if settings.has_fallback:
    print(f"Fallback AI: OpenAI ({settings.FALLBACK_AI_MODEL}) ready")
else:
    print("Warning: No fallback AI key configured (set OPENAI_API_KEY for 429 resilience)")
