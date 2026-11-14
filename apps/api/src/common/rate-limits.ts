import type { RateRule } from './rate-limiter';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/** Every attempt limit of the API in one place (plan 3, Global Constraints). */
export const RATE_LIMITS = {
  /** 10 registrations a minute per client address, and `hourlyCap` an hour from all addresses together. */
  register: (ip: string, hourlyCap: number): RateRule[] => [
    { key: `register:ip:${ip}`, limit: 10, windowMs: MINUTE },
    { key: 'register:global', limit: hourlyCap, windowMs: HOUR },
  ],
  /**
   * 5 a minute per address and email, 30 a minute per address across all emails (password spraying),
   * and `emailHourlyCap` (20 unless LOGIN_EMAIL_HOURLY_CAP says otherwise) an hour per email from any
   * address: an address can change, the email cannot.
   */
  login: (ip: string, email: string, emailHourlyCap = 20): RateRule[] => [
    { key: `login:ip-email:${ip}|${email}`, limit: 5, windowMs: MINUTE },
    { key: `login:ip:${ip}`, limit: 30, windowMs: MINUTE },
    { key: `login:email:${email}`, limit: emailHourlyCap, windowMs: HOUR },
  ],
  /**
   * Instead of the per-email hour bucket, for a browser that shows a valid device cookie of this
   * account: 5 a minute per device. An attacker filling the per-email bucket cannot lock the owner out.
   */
  loginFromDevice: (ip: string, email: string, deviceId: string): RateRule[] => [
    { key: `login:ip-email:${ip}|${email}`, limit: 5, windowMs: MINUTE },
    { key: `login:device:${deviceId}`, limit: 5, windowMs: MINUTE },
  ],
  /** 3 an hour per address and email, and 5 an hour per email from any address. */
  forgotPassword: (ip: string, email: string): RateRule[] => [
    { key: `forgot-password:ip-email:${ip}|${email}`, limit: 3, windowMs: HOUR },
    { key: `forgot-password:email:${email}`, limit: 5, windowMs: HOUR },
  ],
  /**
   * Checks of a signed-in user's current password (change password, delete account) are guesses like
   * logins: the same 5 a minute and 20 an hour, shared by both endpoints.
   */
  passwordCheck: (userId: string): RateRule[] => [
    { key: `password-check:user:${userId}`, limit: 5, windowMs: MINUTE },
    { key: `password-check:user-hour:${userId}`, limit: 20, windowMs: HOUR },
  ],
  /** One phone code a minute per user. */
  phoneCode: (userId: string): RateRule[] => [{ key: `phone-code:user:${userId}`, limit: 1, windowMs: MINUTE }],
  /** At most 5 confirmation emails per account a day, the one sent at registration included. */
  verificationMail: (userId: string): RateRule[] => [
    { key: `verification-mail:user-day:${userId}`, limit: 5, windowMs: 24 * HOUR },
  ],
  /** 30 new listings an hour per user: drafts are cheap, but not free. */
  createListing: (userId: string): RateRule[] => [{ key: `create-listing:user:${userId}`, limit: 30, windowMs: HOUR }],
  /** 60 photo uploads an hour per user (each one is decoded and re-encoded on the server). */
  photoUpload: (userId: string): RateRule[] => [{ key: `photo-upload:user:${userId}`, limit: 60, windowMs: HOUR }],
  /** 30 address searches (search and reverse together) a minute per user. */
  geo: (userId: string): RateRule[] => [{ key: `geo:user:${userId}`, limit: 30, windowMs: MINUTE }],
  /** One confirmation email a minute per user. */
  resendVerification: (userId: string): RateRule[] => [
    { key: `resend-verification:user:${userId}`, limit: 1, windowMs: MINUTE },
  ],
  /** 20 card tokens an hour per user (the payment form makes one per payment). */
  cardToken: (userId: string): RateRule[] => [{ key: `card-token:user:${userId}`, limit: 20, windowMs: HOUR }],
  /** 10 top-ups and 10 payouts an hour per user. */
  walletMove: (userId: string, kind: 'top-up' | 'payout'): RateRule[] => [{ key: `wallet-${kind}:user:${userId}`, limit: 10, windowMs: HOUR }],
  /** 20 booking requests an hour and 30 a day per renter (each one emails an owner). */
  bookingRequest: (userId: string): RateRule[] => [
    { key: `booking-request:user:${userId}`, limit: 20, windowMs: HOUR },
    { key: `booking-request:user-day:${userId}`, limit: 30, windowMs: 24 * HOUR },
  ],
  /** 120 search suggestions a minute per address (a search box asks as people type). */
  suggest: (ip: string): RateRule[] => [{ key: `suggest:ip:${ip}`, limit: 120, windowMs: MINUTE }],
  /** 120 favourite changes a minute per user. */
  favorite: (userId: string): RateRule[] => [{ key: `favorite:user:${userId}`, limit: 120, windowMs: MINUTE }],
  review: (userId: string): RateRule[] => [{ key: `review:user:${userId}`, limit: 20, windowMs: MINUTE }],
  /** 20 price offers a day per renter. */
  offer: (userId: string): RateRule[] => [{ key: `offer:user:${userId}`, limit: 20, windowMs: 24 * HOUR }],
};
