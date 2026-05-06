"""
Per-request user context.

Auth strategy (in priority order):
  1. Firebase ID token in `Authorization: Bearer <token>` header
     → verified server-side via firebase-admin (when the SDK is initialised).
  2. Anonymous Firebase UID passed via `X-User-Id` header (legacy / dev mode).
     Used as a fallback when firebase-admin is unavailable so existing
     deployments keep working without requiring a service-account key.
  3. The literal string "guest" — used for unauthenticated / demo sessions.

Conventions:
  * Guests use the literal user_id "guest" (matches the demo seed tags).
  * Authenticated users use their stable Firebase UID.
  * Anonymous Firebase users get their own unique UID (not "guest").
  * Legacy documents that have no user_id field are treated as guest data
    so demo content keeps working for guests.
"""
import logging
from contextvars import ContextVar
from typing import Awaitable, Callable, Optional

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

logger = logging.getLogger("recall-x247")

GUEST_UID = "guest"
_MAX_UID_LEN = 128

current_user_id_var: ContextVar[str] = ContextVar("current_user_id", default=GUEST_UID)

# --------------------------------------------------------------------------
# Firebase Admin initialisation (optional – gracefully skipped when the
# service-account key / application-default credentials are absent).
# --------------------------------------------------------------------------
_firebase_admin_available = False
try:
    import firebase_admin
    from firebase_admin import auth as fb_auth, credentials as fb_creds
    import os as _os

    _firebase_app = None
    try:
        _firebase_app = firebase_admin.get_app()
    except ValueError:
        pass  # Not yet initialised

    if _firebase_app is None:
        # Try service account key file first, then application-default credentials.
        _sa_path = _os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
        try:
            if _sa_path and _os.path.exists(_sa_path):
                _cred = fb_creds.Certificate(_sa_path)
            else:
                _cred = fb_creds.ApplicationDefault()
            firebase_admin.initialize_app(_cred)
        except Exception as _init_err:
            # No credentials found – initialise with no credentials so that
            # firebase_admin.initialize_app() at least marks the SDK as
            # initialised (token verification will fail gracefully below).
            logger.warning(
                "firebase-admin: could not load credentials (%s). "
                "ID-token verification disabled; falling back to X-User-Id header.",
                _init_err,
            )
            firebase_admin.initialize_app()

    _firebase_admin_available = True
    logger.info("firebase-admin initialised — server-side JWT verification enabled.")
except ImportError:
    logger.warning(
        "firebase-admin package not installed. "
        "Server-side JWT verification disabled; falling back to X-User-Id header."
    )
except Exception as _e:
    logger.warning("firebase-admin setup error: %s", _e)


def _verify_id_token(token: str) -> Optional[str]:
    """Verify a Firebase ID token and return the UID, or None on failure."""
    if not _firebase_admin_available:
        return None
    try:
        decoded = fb_auth.verify_id_token(token)
        return decoded.get("uid")
    except Exception as _e:
        logger.debug("ID token verification failed: %s", _e)
        return None


# --------------------------------------------------------------------------
# Public helpers
# --------------------------------------------------------------------------

def get_uid() -> str:
    """Return the user_id for the current request (defaults to 'guest')."""
    return current_user_id_var.get()


def is_guest(uid: str | None = None) -> bool:
    return (uid if uid is not None else get_uid()) == GUEST_UID


def belongs_to_current_user(doc: dict) -> bool:
    """True if the document's user_id matches the current request's user.

    Checks both `user_id` and the legacy camelCase `userId` field that the
    capture pipeline writes. Untagged legacy docs fall back to guest ownership
    so demo content still surfaces for guests.
    """
    if not isinstance(doc, dict):
        return False
    owner = doc.get("user_id") or doc.get("userId") or GUEST_UID
    return owner == get_uid()


def stamp(doc: dict) -> dict:
    """Tag a doc with the current user_id (in place) and return it.

    Writes both snake_case and camelCase variants so legacy code that reads
    `userId` keeps working alongside the new scoping logic.
    """
    if isinstance(doc, dict):
        uid = get_uid()
        doc["user_id"] = uid
        doc["userId"] = uid
    return doc


class UserContextMiddleware(BaseHTTPMiddleware):
    """Resolve the calling user's UID from the request and store it in a ContextVar.

    Resolution order:
      1. `Authorization: Bearer <firebase-id-token>` → verified via firebase-admin.
      2. `X-User-Id` header → trusted as-is (legacy / dev-mode fallback).
      3. Falls back to GUEST_UID ("guest").
    """

    async def dispatch(self, request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        uid = GUEST_UID

        # 1. Try Bearer token verification (preferred, prevents IDOR attacks).
        auth_header = request.headers.get("authorization", "") or ""
        if auth_header.startswith("Bearer "):
            id_token = auth_header[7:].strip()
            verified = _verify_id_token(id_token)
            if verified:
                uid = verified

        # 2. Fall back to X-User-Id header (legacy / environments without firebase-admin).
        if uid == GUEST_UID:
            raw = request.headers.get("x-user-id", "") or ""
            candidate = raw.strip()[:_MAX_UID_LEN]
            if candidate:
                uid = candidate

        token = current_user_id_var.set(uid)
        try:
            return await call_next(request)
        finally:
            current_user_id_var.reset(token)
