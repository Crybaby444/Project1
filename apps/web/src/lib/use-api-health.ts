'use client';

import type { ApiClient } from '@yoyo/api-client';
import { useEffect, useState } from 'react';
import { api } from './api';

export type ApiHealth = 'checking' | 'online' | 'offline';

/** Pings `GET /api/v1/health` once: online only for 200 with `status: 'ok'`. */
export function useApiHealth(client: ApiClient = api): ApiHealth {
  const [health, setHealth] = useState<ApiHealth>('checking');

  useEffect(() => {
    let cancelled = false;
    client
      .GET('/api/v1/health')
      .then(({ data, response }) => {
        if (!cancelled) setHealth(response.status === 200 && data?.status === 'ok' ? 'online' : 'offline');
      })
      .catch(() => {
        if (!cancelled) setHealth('offline');
      });
    return () => {
      cancelled = true;
    };
  }, [client]);

  return health;
}
