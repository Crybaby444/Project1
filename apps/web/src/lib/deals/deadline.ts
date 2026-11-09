'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

export interface Remaining {
  /** Whole days, hours, minutes and seconds left (each below its next unit). */
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  /** Milliseconds left; 0 once due. */
  ms: number;
  overdue: boolean;
}

/** Time left until `dueAt` at `now`, rounded up to the second (a deadline never shows 0 before it is due). */
export function remaining(dueAt: string, now: number): Remaining {
  const ms = Math.max(0, Date.parse(dueAt) - now);
  const total = Math.ceil(ms / 1000);
  return {
    days: Math.floor(total / 86_400),
    hours: Math.floor((total % 86_400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
    ms,
    overdue: ms === 0,
  };
}

/** How often the countdown redraws: every second in the last hour, every minute before that. */
export function tickFor(ms: number): number {
  return ms <= 3_600_000 ? 1000 : 60_000;
}

/**
 * The time left until a deal's deadline, from the clock rather than from ticks (a throttled background
 * tab stays right). `onExpire` runs once when the deadline passes: the server's timer may have moved the
 * deal on, so the page reads it again.
 */
export function useDeadline(dueAt: string | null, onExpire?: () => void): Remaining | null {
  const [now, setNow] = useState(() => Date.now());
  const expired = useRef<string | null>(null);
  const callback = useRef(onExpire);
  useLayoutEffect(() => {
    callback.current = onExpire;
  });

  useEffect(() => {
    if (!dueAt) return;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const current = Date.now();
      setNow(current);
      const left = Date.parse(dueAt) - current;
      if (left <= 0) {
        if (expired.current !== dueAt) {
          expired.current = dueAt;
          callback.current?.();
        }
        return;
      }
      // Wake up on the unit boundary, so minutes change exactly when they should.
      const step = tickFor(left);
      timer = setTimeout(tick, (left % step) + 15 || step);
    };
    tick();
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        clearTimeout(timer);
        tick();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [dueAt]);

  return dueAt ? remaining(dueAt, now) : null;
}
