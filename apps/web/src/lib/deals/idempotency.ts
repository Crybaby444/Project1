'use client';

import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { ApiError } from '@/lib/session/api-error';

/**
 * A fresh `Idempotency-Key` (the API takes 8–100 of `[A-Za-z0-9_-]`). One key is one intent: the API
 * answers a repeat with the same key and body from its record instead of doing it again.
 */
export function newIdempotencyKey(): string {
  return `yoyo-${crypto.randomUUID()}`;
}

/**
 * Whether a failure leaves the outcome unknown, so the next try must reuse the key: the answer was
 * lost on the way (the API may have charged the card), or the first request is still running.
 */
export function outcomeUnknown(error: unknown): boolean {
  return error instanceof ApiError && (error.code === 'NETWORK' || error.code === 'IDEMPOTENCY_IN_PROGRESS');
}

type Options<V, T> = {
  /**
   * What makes two calls the same intent (action, deal version, amount…). The same intent keeps its key
   * until it has an answer; a different one starts a new key.
   */
  intent(vars: V): string;
  /** Sends the request with `key` in the Idempotency-Key header. */
  mutate(vars: V, key: string): Promise<T>;
};

/**
 * Runs money-moving and deal requests safely (plan 8b, Review Focus 1):
 * - a second call while one is running gets the same promise (a double click sends one request);
 * - a retry of the same intent after a lost answer reuses the key, so the API never does it twice;
 * - after an answer (success or a definite error) the key is spent, and the next try gets a new one.
 */
export function useIdempotentMutation<V, T>({ intent, mutate }: Options<V, T>) {
  const key = useRef<{ intent: string; value: string } | null>(null);
  const running = useRef<Promise<T> | null>(null);
  const [pending, setPending] = useState(false);
  const options = useRef({ intent, mutate });
  useLayoutEffect(() => {
    options.current = { intent, mutate };
  });

  const run = useCallback((vars: V): Promise<T> => {
    if (running.current) return running.current;
    const wanted = options.current.intent(vars);
    if (key.current?.intent !== wanted) key.current = { intent: wanted, value: newIdempotencyKey() };
    const value = key.current.value;
    setPending(true);
    const call = options.current
      .mutate(vars, value)
      .then(
        (result) => {
          key.current = null;
          return result;
        },
        (error: unknown) => {
          if (!outcomeUnknown(error)) key.current = null;
          throw error;
        },
      )
      .finally(() => {
        running.current = null;
        setPending(false);
      });
    running.current = call;
    return call;
  }, []);

  return { run, pending };
}
