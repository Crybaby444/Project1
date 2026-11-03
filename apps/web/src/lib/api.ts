import { createApiClient } from '@yoyo/api-client';

/**
 * The app-wide API client. NEXT_PUBLIC_API_URL is the API origin (generated paths start with /api/v1);
 * the local default keeps development and tests working without extra setup.
 */
export const api = createApiClient(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000');
