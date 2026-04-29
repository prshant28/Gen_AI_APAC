import { auth } from './firebase';

const GUEST_USER_KEY = 'recall-guest-user';

function resolveUserId(): string {
  try {
    const fbUser = auth?.currentUser;
    if (fbUser && fbUser.uid && !fbUser.isAnonymous) {
      return fbUser.uid;
    }
  } catch {}
  try {
    const raw = localStorage.getItem(GUEST_USER_KEY);
    if (raw) {
      const u = JSON.parse(raw);
      if (u?.isGuest || (typeof u?.uid === 'string' && u.uid.startsWith('guest'))) {
        return 'guest';
      }
      if (u?.uid) return String(u.uid);
    }
  } catch {}
  try {
    const fbUser = auth?.currentUser;
    if (fbUser?.isAnonymous && fbUser.uid) return fbUser.uid;
  } catch {}
  return 'guest';
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

export function installApiFetch(): void {
  if ((window as any).__apiFetchInstalled) return;
  (window as any).__apiFetchInstalled = true;
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    if (!isLocalRequest(input)) {
      return originalFetch(input as any, init);
    }
    const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
    if (!headers.has('X-User-Id')) {
      headers.set('X-User-Id', resolveUserId());
    }
    const nextInit: RequestInit = { ...(init || {}), headers };
    return originalFetch(input as any, nextInit);
  };
}

export function getCurrentApiUserId(): string {
  return resolveUserId();
}
