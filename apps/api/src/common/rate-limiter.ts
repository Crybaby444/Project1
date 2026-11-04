import { Global, Inject, Injectable, Module } from '@nestjs/common';
import { CLOCK, type Clock } from '../clock/clock';
import { RateLimitedError } from './app-error';

export interface RateRule {
  /** What is counted, e.g. `login:email:anna@mail.lv`. */
  key: string;
  limit: number;
  windowMs: number;
}

interface Track {
  windowMs: number;
  /** Times of the counted attempts still inside the window, oldest first (at most `limit`). */
  stamps: number[];
}

/** Above this many tracked keys, expired ones are dropped, then the oldest, to bound memory. */
const MAX_KEYS = 50_000;

/**
 * Sliding-window attempt counter in memory, with time from the Clock. Handlers call it after input
 * validation, so keys use normalized values (the lowercase email, not what was typed).
 * Per instance: it resets on restart and is not shared between instances.
 */
@Injectable()
export class RateLimiter {
  private readonly tracks = new Map<string, Track>();

  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  /**
   * Counts one attempt against every rule. If any rule is already at its limit, nothing is counted
   * and RateLimitedError says when the earliest blocking rule frees up.
   */
  hit(rules: readonly RateRule[]): void {
    const now = this.clock.now().getTime();
    let retryAfterMs = 0;
    const live = rules.map((rule) => {
      const stamps = (this.tracks.get(rule.key)?.stamps ?? []).filter((stamp) => stamp > now - rule.windowMs);
      if (stamps.length >= rule.limit) retryAfterMs = Math.max(retryAfterMs, stamps[0]! + rule.windowMs - now);
      return { rule, stamps };
    });
    if (retryAfterMs > 0) throw new RateLimitedError(Math.ceil(retryAfterMs / 1000));

    for (const { rule, stamps } of live) {
      stamps.push(now);
      this.tracks.delete(rule.key); // re-insert, so Map order stays "least recently used first"
      this.tracks.set(rule.key, { windowMs: rule.windowMs, stamps });
    }
    if (this.tracks.size > MAX_KEYS) this.sweep(now);
  }

  private sweep(now: number): void {
    for (const [key, track] of this.tracks) {
      if ((track.stamps.at(-1) ?? 0) <= now - track.windowMs) this.tracks.delete(key);
    }
    for (const key of this.tracks.keys()) {
      if (this.tracks.size <= MAX_KEYS * 0.9) break;
      this.tracks.delete(key);
    }
  }
}

@Global()
@Module({ providers: [RateLimiter], exports: [RateLimiter] })
export class RateLimiterModule {}
