import os
import json
from pydantic_settings import BaseSettings
from typing import Optional

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
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4o-mini"

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
            self.GCP_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", os.getenv("GCP_PROJECT_ID", "demo-project"))
        if not self.FIREBASE_DATABASE_ID:
            self.FIREBASE_DATABASE_ID = os.getenv("FIREBASE_DATABASE_ID", "(default)")
        if not self.GEMINI_API_KEY:
            self.GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", os.getenv("GOOGLE_API_KEY"))
        if not self.OPENAI_API_KEY:
            self.OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

    @property
    def active_ai_key(self) -> Optional[str]:
        return self.OPENAI_API_KEY or self.GEMINI_API_KEY

    @property
    def using_openai(self) -> bool:
        return bool(self.OPENAI_API_KEY)

    class Config:
        env_file = ".env"

settings = Settings()
