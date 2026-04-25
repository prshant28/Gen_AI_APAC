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
    FALLBACK_AI_KEY: Optional[str] = None

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

        # Resolve Gemini API key
        gemini_key = (
            os.getenv("GOOGLE_API_KEY")
            or os.getenv("GEMINI_API_KEY")
            or self.GEMINI_API_KEY
        )
        if gemini_key:
            self.GEMINI_API_KEY = gemini_key
            self.GOOGLE_API_KEY = gemini_key

        # Fallback key — OpenRouter/OpenAI for when Gemini rate-limits
        self.FALLBACK_AI_KEY = (
            os.getenv("GEN_APAC_API_KEY")
            or os.getenv("GEN_API_KEY")
            or os.getenv("OPENAI_API_KEY")
        )

        # Resolve the AI key — prefer Gemini for Google Cloud, fall back to OpenRouter
        if self.GEMINI_API_KEY:
            # Use Gemini via OpenAI-compatible endpoint
            self.OPENAI_API_KEY = self.GEMINI_API_KEY
            self.OPENAI_MODEL = self.GEMINI_MODEL
            self.USE_GEMINI = True
            self.USE_OPENROUTER = False
        else:
            resolved_key = (
                os.getenv("GEN_APAC_API_KEY")
                or os.getenv("GEN_API_KEY")
                or self.OPENAI_API_KEY
                or os.getenv("OPENAI_API_KEY")
            )
            if resolved_key:
                self.OPENAI_API_KEY = resolved_key
                if _is_openrouter_key(resolved_key):
                    self.USE_OPENROUTER = True
                    self.OPENAI_MODEL = "openai/gpt-4o-mini"
                else:
                    self.USE_OPENROUTER = False
                    self.OPENAI_MODEL = "gpt-4o-mini"

    @property
    def openai_base_url(self) -> str:
        if self.USE_GEMINI:
            return GEMINI_COMPAT_URL
        return OPENROUTER_BASE_URL if self.USE_OPENROUTER else OPENAI_BASE_URL

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
        return self.OPENAI_API_KEY or self.GEMINI_API_KEY

    @property
    def using_openai(self) -> bool:
        return bool(self.OPENAI_API_KEY)

    @property
    def ai_provider_name(self) -> str:
        if self.USE_GEMINI:
            return f"Google Gemini ({self.GEMINI_MODEL})"
        if self.USE_OPENROUTER:
            return f"OpenRouter ({self.OPENAI_MODEL})"
        return f"OpenAI ({self.OPENAI_MODEL})"

    class Config:
        env_file = ".env"


settings = Settings()
print(f"AI Provider: {settings.ai_provider_name}")
