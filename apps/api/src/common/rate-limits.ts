import type { RateRule } from './rate-limiter';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/** Every attempt limit of the API in one place (plan 3, Global Constraints). */
export const RATE_LIMITS = {
  /** 10 registrations a minute per client address. */
  register: (ip: string): RateRule[] => [{ key: `register:ip:${ip}`, limit: 10, windowMs: MINUTE }],
  /**
   * 5 a minute per address and email, and 20 an hour per email from any address: addresses can be
   * spoofed by calling the API directly, the email cannot.
   */
  login: (ip: string, email: string): RateRule[] => [
    { key: `login:ip-email:${ip}|${email}`, limit: 5, windowMs: MINUTE },
    { key: `login:email:${email}`, limit: 20, windowMs: HOUR },
  ],
  /** 3 an hour per address and email, and 5 an hour per email from any address. */
  forgotPassword: (ip: string, email: string): RateRule[] => [
    { key: `forgot-password:ip-email:${ip}|${email}`, limit: 3, windowMs: HOUR },
    { key: `forgot-password:email:${email}`, limit: 5, windowMs: HOUR },
  ],
  /** One phone code a minute per user. */
  phoneCode: (userId: string): RateRule[] => [{ key: `phone-code:user:${userId}`, limit: 1, windowMs: MINUTE }],
  /** One confirmation email a minute per user. */
  resendVerification: (userId: string): RateRule[] => [
    { key: `resend-verification:user:${userId}`, limit: 1, windowMs: MINUTE },
  ],
};
