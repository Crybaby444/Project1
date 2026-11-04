import type { RateRule } from './rate-limiter';

const MINUTE = 60_000;

/** Every attempt limit of the API in one place (plan 3, Global Constraints). */
export const RATE_LIMITS = {
  /** 10 registrations a minute per client address. */
  register: (ip: string): RateRule[] => [{ key: `register:ip:${ip}`, limit: 10, windowMs: MINUTE }],
};
