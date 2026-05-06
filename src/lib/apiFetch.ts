import { auth } from './firebase';
import { getIdToken } from 'firebase/auth';

const GUEST_USER_KEY = 'recall-guest-user';

/**
 * Resolve the user ID for attaching to API requests (X-User-Id legacy header).
 * For authenticated (non-anonymous) users this still returns their UID; the
 * actual security is enforced via the Bearer token sent in getAuthHeaders().
 * For anonymous Firebase users we use their real unique UID, NOT the shared
 * "guest" string, so every anonymous session has data isolation.
 */
function resolveUserId(): string {
  try {
    const fbUser = auth?.currentUser;
    if (fbUser && fbUser.uid) {
      // Both real and anonymous Firebase users get their actual unique UID.
      return fbUser.uid;
    }
  } catch {}
  try {
    const raw = localStorage.getItem(GUEST_USER_KEY);
    if (raw) {
      const u = JSON.parse(raw);
      if (u?.uid) return String(u.uid);
    }
  } catch {}
  return 'guest';
}

/**
 * Return auth headers for an API request.
 * Prefers `Authorization: Bearer <id_token>` for verified server-side auth.
 * Always also includes the legacy `X-User-Id` header for backwards compatibility.
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  const uid = resolveUserId();
  headers['X-User-Id'] = uid;

  try {
    const fbUser = auth?.currentUser;
    if (fbUser && !fbUser.isAnonymous) {
      // Get (or refresh) the Firebase ID token and send it for server-side verification.
      const idToken = await getIdToken(fbUser, /* forceRefresh */ false);
      if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
      }
    }
  } catch {
    // If token retrieval fails, we still send X-User-Id as the fallback.
  }

  return headers;
}

function isLocalRequest(input: RequestInfo | URL): boolean {
  try {
    if (typeof input === 'string') {
      if (input.startsWith('/')) return !input.startsWith('//');
      if (input.startsWith('http')) {
        const u = new URL(input);
        return u.origin === window.location.origin;
      }
      return true;
    }
    if (input instanceof URL) return input.origin === window.location.origin;
    if (input instanceof Request) {
      const u = new URL(input.url, window.location.origin);
      return u.origin === window.location.origin;
    }
  } catch {}
  return false;
}

function urlPathOf(input: RequestInfo | URL): string {
  try {
    if (typeof input === 'string') {
      if (input.startsWith('http')) return new URL(input).pathname;
      return input.split('?')[0] || '';
    }
    if (input instanceof URL) return input.pathname;
    if (input instanceof Request) return new URL(input.url, window.location.origin).pathname;
  } catch {}
  return '';
}

function methodOf(input: RequestInfo | URL, init?: RequestInit): string {
  const m = (init?.method || (input instanceof Request ? input.method : 'GET') || 'GET').toUpperCase();
  return m;
}

// Any of these path prefixes can change the number of unread Inbox items:
//   /memories         — direct create / patch / delete (review, archive, trash)
//   /capture          — URL / PDF / voice / time-bundle / session captures all
//                       eventually call save_memory and add to the inbox
// Mutating verbs against any of those broadcast a single global event that
// the sidebar listens to. Doing it here means every existing and future
// capture/triage call site refreshes the badge automatically — no per-page
// wiring needed.
const INBOX_AFFECTING_PREFIXES = ['/memories', '/capture'];

function maybeBroadcastInboxChange(input: RequestInfo | URL, init?: RequestInit): void {
  try {
    const path = urlPathOf(input);
    if (!INBOX_AFFECTING_PREFIXES.some(p => path === p || path.startsWith(p + '/'))) return;
    const method = methodOf(input, init);
    if (method === 'GET' || method === 'HEAD') return;
    window.dispatchEvent(new CustomEvent('inbox-count-refresh'));
  } catch {}
}

export function installApiFetch(): void {
  if ((window as any).__apiFetchInstalled) return;
  (window as any).__apiFetchInstalled = true;
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    if (!isLocalRequest(input)) {
      return originalFetch(input as any, init);
    }
    // Merge auth headers (async — fetches/refreshes Firebase ID token if needed).
    const authHdrs = await getAuthHeaders();
    const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
    for (const [k, v] of Object.entries(authHdrs)) {
      if (!headers.has(k)) headers.set(k, v);
    }
    const nextInit: RequestInit = { ...(init || {}), headers };
    const res = await originalFetch(input as any, nextInit);
    if (res.ok) maybeBroadcastInboxChange(input, init);
    return res;
  };
}

export function getCurrentApiUserId(): string {
  return resolveUserId();
}
