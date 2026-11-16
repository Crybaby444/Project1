'use client';

import { useQuery } from '@tanstack/react-query';
import { unwrap } from '@/lib/session/api-error';
import { useApiClient } from '@/lib/session/SessionProvider';

/** What this deployment offers (GET /auth/providers): sign-in methods and whether identity is required. */
export function useProviders() {
  const client = useApiClient();
  return useQuery({
    queryKey: ['auth', 'providers'],
    queryFn: () => unwrap(client.GET('/api/v1/auth/providers')),
    staleTime: 5 * 60_000,
  });
}
