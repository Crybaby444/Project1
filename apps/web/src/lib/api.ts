import { createApiClient } from '@yoyo/api-client';
import { apiBaseUrl } from './api-url';

/**
 * The app-wide API client: same-origin `/api/...` in the browser (proxied to the API), the API origin
 * on the server. See apiBaseUrl.
 */
export const api = createApiClient(
  apiBaseUrl(typeof window !== 'undefined', process.env.NEXT_PUBLIC_API_URL, process.env.NODE_ENV),
);
