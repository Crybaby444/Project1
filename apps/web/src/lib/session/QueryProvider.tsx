'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

const newClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: true } } });

/** The tab's cache, created once in the browser. */
let browserClient: QueryClient | undefined;

/**
 * One query cache per browser tab (and per server render). The [locale] layout is mounted afresh when
 * the language changes; the cache outlives it, so the signed-in user is still known at once and the
 * header does not fall back to a placeholder until GET /me answers.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() =>
    typeof window === 'undefined' ? newClient() : (browserClient ??= newClient()),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
