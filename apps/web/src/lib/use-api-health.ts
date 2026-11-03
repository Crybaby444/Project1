'use client';

import { useEffect, useState } from 'react';
import { api } from './api';

export type ApiHealth = 'checking' | 'online' | 'offline';

export async function fetchApiHealth(): Promise<Exclude<ApiHealth, 'checking'>> {
  try {
    const { data, response } = await api.GET('/api/v1/health');
    return response.status === 200 && data?.status === 'ok' ? 'online' : 'offline';
  } catch {
    return 'offline';
  }
}

/** `online` only for 200 with `status: "ok"`; anything else, including network errors, is `offline`. */
export function useApiHealth(): ApiHealth {
  const [health, setHealth] = useState<ApiHealth>('checking');

  useEffect(() => {
    let active = true;
    void fetchApiHealth().then((next) => {
      if (active) setHealth(next);
    });
    return () => {
      active = false;
    };
  }, []);

  return health;
}
