import { describe, expect, it } from 'vitest';
import { FakeClock } from '../../test/support/fake-clock';
import { RateLimitedError } from './app-error';
import { RateLimiter } from './rate-limiter';

const MINUTE = 60_000;

function blocked(limiter: RateLimiter, rules: Parameters<RateLimiter['hit']>[0]): RateLimitedError | undefined {
  try {
    limiter.hit(rules);
    return undefined;
  } catch (error) {
    if (error instanceof RateLimitedError) return error;
    throw error;
  }
}

describe('RateLimiter', () => {
  it('allows `limit` attempts in a window and refuses the next one until the oldest leaves the window', () => {
    const clock = new FakeClock();
    const limiter = new RateLimiter(clock);
    const rule = [{ key: 'login:a', limit: 5, windowMs: MINUTE }];

    for (let i = 0; i < 5; i++) {
      expect(blocked(limiter, rule)).toBeUndefined();
      clock.advance(1_000);
    }
    const sixth = blocked(limiter, rule);
    expect(sixth).toBeInstanceOf(RateLimitedError);
    expect(sixth!.retryAfterSeconds).toBe(55); // the first attempt was 5 s ago

    clock.advance(55_000);
    expect(blocked(limiter, rule)).toBeUndefined();
  });

  it('counts each key on its own', () => {
    const limiter = new RateLimiter(new FakeClock());
    expect(blocked(limiter, [{ key: 'register:1.1.1.1', limit: 1, windowMs: MINUTE }])).toBeUndefined();
    expect(blocked(limiter, [{ key: 'register:2.2.2.2', limit: 1, windowMs: MINUTE }])).toBeUndefined();
    expect(blocked(limiter, [{ key: 'register:1.1.1.1', limit: 1, windowMs: MINUTE }])).toBeInstanceOf(RateLimitedError);
  });

  it('refuses when any of several rules is at its limit, without counting the refused attempt', () => {
    const clock = new FakeClock();
    const limiter = new RateLimiter(clock);
    const perIp = (ip: string) => ({ key: `ip:${ip}:anna`, limit: 5, windowMs: MINUTE });
    const perEmail = { key: 'email:anna', limit: 2, windowMs: 60 * MINUTE };

    expect(blocked(limiter, [perIp('1'), perEmail])).toBeUndefined();
    expect(blocked(limiter, [perIp('2'), perEmail])).toBeUndefined();
    const third = blocked(limiter, [perIp('3'), perEmail]);
    expect(third!.retryAfterSeconds).toBe(3600);

    // The refused attempt did not count against ip 3: it still has all 5 attempts once the email rule allows.
    clock.advance(60 * MINUTE);
    for (let i = 0; i < 2; i++) expect(blocked(limiter, [perIp('3'), perEmail])).toBeUndefined();
  });
});
