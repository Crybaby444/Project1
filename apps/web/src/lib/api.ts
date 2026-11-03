import { createApiClient } from '@yoyo/api-client';

/** Origin of the API server; request paths already include `/api/v1`. */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export const api = createApiClient(API_URL);
