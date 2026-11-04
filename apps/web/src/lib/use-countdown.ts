'use client';

import { useCallback, useEffect, useState } from 'react';

const TICK_MS = 250;

/**
 * Whole seconds left until a moment, ticking down to 0 (for "try again in N s").
 * Counts from the clock rather than from ticks, so a throttled background tab stays right.
 */
export function useCountdown(): { secondsLeft: number; start(seconds: number): void } {
  const [until, setUntil] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (until === 0) return;
    const timer = setInterval(() => {
      const left = Math.max(0, Math.ceil((until - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) setUntil(0);
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [until]);

  const start = useCallback((seconds: number) => {
    const whole = Math.max(0, Math.ceil(seconds));
    setSecondsLeft(whole);
    setUntil(whole > 0 ? Date.now() + whole * 1000 : 0);
  }, []);

  return { secondsLeft, start };
}
