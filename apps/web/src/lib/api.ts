import { createApiClient } from '@yoyo/api-client';
import { resolveApiUrl } from './api-url';

/** The app-wide API client (see resolveApiUrl for how the address is chosen). */
export const api = createApiClient(resolveApiUrl(process.env.NEXT_PUBLIC_API_URL, process.env.NODE_ENV));
