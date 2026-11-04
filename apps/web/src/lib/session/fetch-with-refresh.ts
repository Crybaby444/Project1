const REFRESH_PATH = '/api/v1/auth/refresh';
const AUTH_PREFIX = '/api/v1/auth/';
const LOCK_NAME = 'yoyo-refresh';
/** When this browser last renewed the session (any tab), so a tab that waited for the lock can skip its own. */
const REFRESHED_AT_KEY = 'yoyo-refreshed-at';
const REFRESH_CODES = new Set(['AUTH_UNAUTHENTICATED', 'TOKEN_EXPIRED']);
/** The auth endpoints that need a session, so an expired one is renewed for them like for /me. */
const SESSION_AUTH_PATHS = new Set(['/api/v1/auth/logout-all', '/api/v1/auth/resend-verification']);
/** Without Web Locks: a refresh by another tab this recent is reused instead of rotating the token again. */
const RECENT_REFRESH_MS = 5000;

type Fetch = typeof globalThis.fetch;

function pathOf(input: RequestInfo | URL): string {
  const url = input instanceof Request ? input.url : String(input);
  try {
    return new URL(url, 'http://relative.invalid').pathname;
  } catch {
    return url;
  }
}

/** Whether a 401 means "the session needs renewing" (rather than, say, a wrong password). */
async function asksForRefresh(response: Response): Promise<boolean> {
  if (response.status !== 401) return false;
  try {
    const body = (await response.clone().json()) as { error?: { code?: unknown } };
    return typeof body.error?.code === 'string' && REFRESH_CODES.has(body.error.code);
  } catch {
    return false;
  }
}

function readRefreshedAt(): number {
  try {
    return Number(window.localStorage.getItem(REFRESHED_AT_KEY)) || 0;
  } catch {
    return 0;
  }
}

function writeRefreshedAt(): void {
  try {
    window.localStorage.setItem(REFRESHED_AT_KEY, String(Date.now()));
  } catch {
    // Storage blocked: the lock alone still keeps tabs from refreshing at the same time.
  }
}

/**
 * A `fetch` for the API client that renews the session once when the access token is missing or
 * expired, then repeats the request.
 *
 * - One refresh at a time for the whole app: parallel 401s share one `POST /auth/refresh`
 *   (a module-level promise), and tabs take turns through Web Locks where available.
 * - A tab that waited for another tab's refresh reuses it instead of rotating the token again.
 * - The credential endpoints under `/auth/*` (login, refresh, reset…) are never refreshed for: a 401
 *   there is an answer, not an expired session. Only logout-all and resend-verification, which need
 *   a session, are.
 * - A request that still gets 401 after a refresh is returned as is: the session is over, no loop.
 */
export function createFetchWithRefresh(baseFetch: Fetch = (...args) => globalThis.fetch(...args)) {
  let inFlight: Promise<boolean> | null = null;

  async function doRefresh(): Promise<boolean> {
    try {
      const response = await baseFetch(REFRESH_PATH, { method: 'POST', credentials: 'same-origin' });
      if (response.ok) writeRefreshedAt();
      return response.ok;
    } catch {
      return false;
    }
  }

  function refreshOnce(): Promise<boolean> {
    if (inFlight) return inFlight;
    const requestedAt = Date.now();
    const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
    const run = locks
      ? locks.request(LOCK_NAME, async () => (readRefreshedAt() > requestedAt ? true : doRefresh()))
      : Date.now() - readRefreshedAt() < RECENT_REFRESH_MS
        ? Promise.resolve(true)
        : doRefresh();
    inFlight = Promise.resolve(run).finally(() => {
      inFlight = null;
    });
    return inFlight;
  }

  async function fetchWithRefresh(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const path = pathOf(input);
    if (path.startsWith(AUTH_PREFIX) && !SESSION_AUTH_PATHS.has(path)) return baseFetch(input, init);
    // A Request's body can be read once, so keep a copy for the repeat.
    const repeat = input instanceof Request ? input.clone() : input;
    const response = await baseFetch(input, init);
    if (!(await asksForRefresh(response))) return response;
    if (!(await refreshOnce())) return response;
    return baseFetch(repeat, init);
  }

  return { fetchWithRefresh, refreshOnce };
}

/** The app-wide instance (the browser API client uses it). */
export const { fetchWithRefresh, refreshOnce } = createFetchWithRefresh();
