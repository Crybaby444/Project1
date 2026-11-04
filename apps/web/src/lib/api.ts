import { createApiClient } from '@yoyo/api-client';
import { apiBaseUrl } from './api-url';
import { fetchWithRefresh } from './session/fetch-with-refresh';

const isBrowser = typeof window !== 'undefined';

/**
 * The app-wide API client: same-origin `/api/...` in the browser (proxied to the API), the API origin
 * on the server. See apiBaseUrl. In the browser an expired session is renewed once and the request
 * repeated (fetchWithRefresh).
 */
export const api = createApiClient(
  apiBaseUrl(isBrowser, process.env.NEXT_PUBLIC_API_URL, process.env.NODE_ENV),
  isBrowser ? { fetch: fetchWithRefresh } : {},
);
