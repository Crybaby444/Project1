'use client';

import type { ApiClient } from '@yoyo/api-client';
import { useEffect, useState } from 'react';
import { api } from './api';

export type ApiHealth = 'checking' | 'online' | 'offline';

/** Asks GET /api/v1/health once. Online only when the API answers 200 with status "ok". */
export function useApiHealth(client: ApiClient = api): ApiHealth {
  const [health, setHealth] = useState<ApiHealth>('checking');

  useEffect(() => {
    const controller = new AbortController();
    client
      .GET('/api/v1/health', { signal: controller.signal })
      .then(({ data, response }) => {
        setHealth(response.status === 200 && data?.status === 'ok' ? 'online' : 'offline');
      })
      .catch(() => {
        if (!controller.signal.aborted) setHealth('offline');
      });
    return () => controller.abort();
  }, [client]);

  return health;
}
