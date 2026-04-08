import os
import uuid
import datetime
from typing import Optional, List, Dict, Any

from app.config import settings

# ─── In-Memory Mock Firestore ─────────────────────────────────────────────────

class MockDocSnapshot:
    def __init__(self, id: str, data: dict):
        self.id = id
        self.reference = MockDocRef(None, id)
        self._data = data

    @property
    def exists(self) -> bool:
        return self._data is not None

    def to_dict(self) -> dict:
        return dict(self._data) if self._data else {}


class MockDocRef:
    def __init__(self, collection, doc_id: str):
        self._collection = collection
        self.id = doc_id

    async def get(self) -> MockDocSnapshot:
        if self._collection is None:
            return MockDocSnapshot(self.id, None)
        data = self._collection._store.get(self.id)
        return MockDocSnapshot(self.id, data)

    async def set(self, data: dict) -> None:
        if self._collection is not None:
            self._collection._store[self.id] = dict(data)

    async def update(self, data: dict) -> None:
        if self._collection is not None and self.id in self._collection._store:
            self._collection._store[self.id].update(data)

    async def delete(self) -> None:
        if self._collection is not None:
            self._collection._store.pop(self.id, None)


class MockQuery:
    def __init__(self, collection, filters=None, order_field=None, order_dir="ASCENDING", limit_n=None):
        self._collection = collection
        self._filters = filters or []
        self._order_field = order_field
        self._order_dir = order_dir
        self._limit_n = limit_n

    def where(self, field, op, value) -> "MockQuery":
        new_filters = self._filters + [(field, op, value)]
        return MockQuery(self._collection, new_filters, self._order_field, self._order_dir, self._limit_n)

    def order_by(self, field, direction="ASCENDING") -> "MockQuery":
        return MockQuery(self._collection, self._filters, field, direction, self._limit_n)

    def limit(self, n: int) -> "MockQuery":
        return MockQuery(self._collection, self._filters, self._order_field, self._order_dir, n)

    def count(self) -> "MockAggQuery":
        return MockAggQuery(self)

    def _apply(self) -> List[tuple]:
        items = list(self._collection._store.items())

        for (field, op, value) in self._filters:
            filtered = []
            for doc_id, doc in items:
                doc_val = doc.get(field)
                if op == "==" and doc_val == value:
                    filtered.append((doc_id, doc))
                elif op == ">=" and doc_val is not None and str(doc_val) >= str(value):
                    filtered.append((doc_id, doc))
                elif op == "<=" and doc_val is not None and str(doc_val) <= str(value):
                    filtered.append((doc_id, doc))
                elif op == ">" and doc_val is not None and str(doc_val) > str(value):
                    filtered.append((doc_id, doc))
                elif op == "array_contains" and isinstance(doc_val, list) and value in doc_val:
                    filtered.append((doc_id, doc))
                elif op == "array_contains_any" and isinstance(doc_val, list) and any(v in doc_val for v in value):
                    filtered.append((doc_id, doc))
                elif op == "in" and doc_val in value:
                    filtered.append((doc_id, doc))
            items = filtered

        if self._order_field:
            reverse = self._order_dir == "DESCENDING"
            def sort_key(item):
                val = item[1].get(self._order_field)
                if val is None:
                    return ""
                if hasattr(val, "isoformat"):
                    return val.isoformat()
                return str(val)
            items = sorted(items, key=sort_key, reverse=reverse)

        if self._limit_n is not None:
            items = items[:self._limit_n]

        return items

    async def get(self) -> List[MockDocSnapshot]:
        return [MockDocSnapshot(doc_id, doc) for doc_id, doc in self._apply()]

    async def stream(self):
        for doc_id, doc in self._apply():
            yield MockDocSnapshot(doc_id, doc)


class MockAggQuery:
    def __init__(self, query: MockQuery):
        self._query = query

    async def get(self):
        items = self._query._apply()
        return [[type('obj', (object,), {'value': len(items)})()]]


class MockCollectionRef:
    def __init__(self, store: dict):
        self._store = store

    async def add(self, data: dict):
        doc_id = str(uuid.uuid4())
        self._store[doc_id] = dict(data)
        doc_ref = MockDocRef(self, doc_id)
        doc_ref._collection = self
        return (datetime.datetime.now(datetime.timezone.utc), doc_ref)

    def document(self, doc_id: str) -> MockDocRef:
        ref = MockDocRef(self, doc_id)
        return ref

    def where(self, field, op, value) -> MockQuery:
        return MockQuery(self, [(field, op, value)])

    def order_by(self, field, direction="ASCENDING") -> MockQuery:
        return MockQuery(self, [], field, direction)

    def limit(self, n: int) -> MockQuery:
        return MockQuery(self, [], None, "ASCENDING", n)

    def count(self) -> MockAggQuery:
        return MockAggQuery(MockQuery(self))

    async def get(self) -> List[MockDocSnapshot]:
        return [MockDocSnapshot(doc_id, doc) for doc_id, doc in self._store.items()]

    async def stream(self):
        for doc_id, doc in self._store.items():
            yield MockDocSnapshot(doc_id, doc)


class MockFirestoreClient:
    """In-memory Firestore mock for when real credentials are unavailable."""
    _collections: Dict[str, dict] = {}

    def collection(self, name: str) -> MockCollectionRef:
        if name not in self._collections:
            self._collections[name] = {}
        return MockCollectionRef(self._collections[name])


# ─── DB Provider ─────────────────────────────────────────────────────────────

_db_instance = None
_using_mock = False

def _get_firestore_client():
    """Try to get a real Firestore client, falling back to mock."""
    global _db_instance, _using_mock

    if _db_instance is not None:
        return _db_instance

    # Check if we have valid credentials before even trying Firestore
    creds_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "")
    has_valid_credentials = creds_path and os.path.exists(creds_path)

    if not has_valid_credentials:
        # No valid service account file — clear the bad path and use in-memory DB
        if creds_path:
            print(f"Warning: GOOGLE_APPLICATION_CREDENTIALS={creds_path} not found. Using in-memory DB.")
            os.environ.pop("GOOGLE_APPLICATION_CREDENTIALS", None)
        else:
            print("No Firestore credentials configured. Using in-memory database.")

        _db_instance = MockFirestoreClient()
        _using_mock = True
        return _db_instance

    try:
        from google.cloud import firestore as gfs
        project_id = settings.GCP_PROJECT_ID
        database_id = settings.FIREBASE_DATABASE_ID or "(default)"
        _db_instance = gfs.AsyncClient(project=project_id, database=database_id)
        _using_mock = False
        print(f"Connected to Firestore: project={project_id}, db={database_id}")
        return _db_instance
    except Exception as e:
        print(f"Firestore connection failed: {e}")
        print("Using in-memory database fallback (data will not persist across restarts).")
        _db_instance = MockFirestoreClient()
        _using_mock = True
        return _db_instance


async def get_db():
    return _get_firestore_client()


async def log_interaction(session_id: str, user_message: str, reply: str, agents_called: List[str]):
    db = await get_db()
    try:
        log_data = {
            "session_id": session_id,
            "user_message": user_message,
            "reply": reply,
            "agents_called": agents_called,
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }
        await db.collection("interaction_logs").add(log_data)
    except Exception as e:
        print(f"Error logging interaction: {e}")


async def get_collection_count(collection_name: str) -> int:
    db = await get_db()
    try:
        if isinstance(db, MockFirestoreClient):
            return len(db.collection(collection_name)._store)
        count_query = db.collection(collection_name).count()
        result = await count_query.get()
        return result[0][0].value
    except Exception as e:
        print(f"Error getting collection count for {collection_name}: {e}")
        return 0
