import { createApiClient } from '@yoyo/api-client';

/** Public API base, e.g. `https://api.yoyo.rent/api/v1`. */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

// OpenAPI paths already include `/api/v1`, so the client needs the part before it.
const API_BASE = API_URL.replace(/\/api\/v1\/?$/, '');

export const api = createApiClient(API_BASE);
