from typing import Optional, List, Dict, Any
from google.cloud import firestore
from google.cloud.firestore import AsyncClient
import datetime

from app.config import settings

class FirestoreDB:
    _instance: Optional[AsyncClient] = None

    @classmethod
    def get_db(cls) -> AsyncClient:
        if cls._instance is None:
            project_id = settings.GCP_PROJECT_ID
            database_id = settings.FIREBASE_DATABASE_ID
            cls._instance = firestore.AsyncClient(
                project=project_id,
                database=database_id
            )
        return cls._instance

async def get_db() -> AsyncClient:
    return FirestoreDB.get_db()

async def log_interaction(session_id: str, user_message: str, reply: str, agents_called: List[str]):
    db = await get_db()
    try:
        log_data = {
            "session_id": session_id,
            "user_message": user_message,
            "reply": reply,
            "agents_called": agents_called,
            "timestamp": datetime.datetime.now(datetime.timezone.utc)
        }
        await db.collection("interaction_logs").add(log_data)
    except Exception as e:
        print(f"Error logging interaction: {e}")

async def get_collection_count(collection_name: str) -> int:
    db = await get_db()
    try:
        docs = db.collection(collection_name).stream()
        count = 0
        async for _ in docs:
            count += 1
        return count
    except Exception as e:
        print(f"Error getting collection count: {e}")
        return 0
