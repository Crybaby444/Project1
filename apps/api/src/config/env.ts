import { EmailSchema, PasswordSchema } from '@yoyo/shared';
import { z } from 'zod';

/** Hosting dashboards often keep a key with an empty value: treat that exactly like an unset variable. */
const blankAsUnset = (value: unknown) => (typeof value === 'string' && value.trim() === '' ? undefined : value);

/** Local mail catcher (Mailpit) used in development and tests. */
const LOCAL_SMTP_URL = 'smtp://localhost:1025';

const EnvObject = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.url(),
  /** Give up on a new database connection after this long instead of hanging (pg's default is "never"). */
  DB_CONNECT_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
  /**
   * The web app origin allowed to call the API with credentials (CORS); also the base of email links,
   * Google's redirect_uri and the post-login redirect. Must be https in production. Normalized to a
   * bare origin: browsers send `Origin: https://site` with no slash or path, so `https://site/` must
   * still match.
   */
  WEB_ORIGIN: z.url().transform((value) => new URL(value).origin),
  /**
   * How many reverse proxies sit in front of the API. With N > 0, Express trusts the last N
   * X-Forwarded-For hops, so `req.ip` is the real client (Render: its load balancer + the Vercel proxy = 2).
   */
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(0),
  /**
   * Shared with the site, whose /api proxy sends it in `x-yoyo-proxy-secret`. When set, X-Forwarded-For
   * is trusted for all TRUST_PROXY_HOPS only on requests that carry it (constant-time check), and for
   * one hop fewer otherwise, so direct calls to the API cannot spoof their address. Unset: as before.
   */
  PROXY_SECRET: z.preprocess(blankAsUnset, z.string().min(32).optional()),
  /** Registrations accepted per hour from all addresses together (a bot wave cannot flood the mail budget). */
  REGISTRATION_HOURLY_CAP: z.preprocess(blankAsUnset, z.coerce.number().int().positive().default(100)),
  /** HS256 key for access tokens and other signed values. Render generates it (render.yaml). */
  JWT_SECRET: z.string().min(32),
  /**
   * Outgoing mail server, e.g. `smtps://resend:<API_KEY>@smtp.resend.com:2465` (Resend; Render's free
   * tier blocks ports 25, 465 and 587).
   * Defaults to the local Mailpit outside production; unset in production means mail is disabled.
   */
  SMTP_URL: z.preprocess(blankAsUnset, z.url({ protocol: /^smtps?$/ }).optional()),
  /** Sender of every email, on a domain the mail service verified, e.g. `Yoyo <no-reply@yoyo.rent>`. */
  MAIL_FROM: z.preprocess(blankAsUnset, z.string().min(3).default('Yoyo <no-reply@yoyo.local>')),
  /**
   * Emails sent per 24 hours from the whole API (in memory, per instance). Over it, mail is skipped and
   * an error is logged at most once an hour; requests still succeed. Default 90: under Resend's free 100.
   */
  MAIL_DAILY_LIMIT: z.preprocess(blankAsUnset, z.coerce.number().int().positive().default(90)),
  /** Google sign-in is on only when both the client id and secret are set (Google Cloud Console). */
  GOOGLE_CLIENT_ID: z.preprocess(blankAsUnset, z.string().optional()),
  GOOGLE_CLIENT_SECRET: z.preprocess(blankAsUnset, z.string().optional()),
  /** Google's OAuth endpoints; tests point them at a local fake. */
  GOOGLE_AUTH_URL: z.url().default('https://accounts.google.com/o/oauth2/v2/auth'),
  GOOGLE_TOKEN_URL: z.url().default('https://oauth2.googleapis.com/token'),
  GOOGLE_JWKS_URL: z.url().default('https://www.googleapis.com/oauth2/v3/certs'),
  /**
   * Who delivers phone confirmation codes. `mailbox` only simulates SMS (the code arrives by email,
   * so it proves nothing about the phone): the default outside production, never allowed in it.
   * Without a provider, phone confirmation is switched off.
   */
  SMS_PROVIDER: z.preprocess(blankAsUnset, z.enum(['mailbox']).optional()),
  /**
   * The administrator account, created or promoted at every API start when both are set. A confirmed
   * account keeps its password; an unconfirmed one with this email is taken over (ADMIN_PASSWORD).
   */
  ADMIN_EMAIL: z.preprocess(blankAsUnset, EmailSchema.optional()),
  ADMIN_PASSWORD: z.preprocess(blankAsUnset, PasswordSchema.optional()),
  /**
   * Where listing photos go: `local` (a folder on this server; the default outside production, never
   * allowed in it: hosting disks are wiped on deploy) or `cloudinary` (needs CLOUDINARY_URL). Without
   * a working storage the API still starts and photo uploads answer 503 STORAGE_DISABLED.
   */
  STORAGE: z.preprocess(blankAsUnset, z.enum(['local', 'cloudinary']).optional()),
  /** `cloudinary://<api_key>:<api_secret>@<cloud_name>` (Cloudinary console → API Keys). */
  CLOUDINARY_URL: z.preprocess(
    blankAsUnset,
    z
      .string()
      .regex(/^cloudinary:\/\/[^:@/\s]+:[^:@/\s]+@[^:@/\s]+$/, 'must look like cloudinary://<api_key>:<api_secret>@<cloud_name>')
      .optional(),
  ),
  /** Cloudinary's upload API; tests point it at a local fake. */
  CLOUDINARY_API_URL: z.url().default('https://api.cloudinary.com'),
  /**
   * The OpenStreetMap geocoder. The public one allows 1 request a second and needs an identifying
   * User-Agent (both are kept); tests point it at a local fake.
   */
  NOMINATIM_URL: z.url().default('https://nominatim.openstreetmap.org'),
  /**
   * Who moves money in and out of Yoyo: `fake` (the default and today the only one) is the test card
   * provider of spec §0 — it looks and behaves like a card form, but no real money moves. A real
   * provider (Stripe Connect) is another value and class behind the PaymentProvider interface.
   */
  PAYMENTS: z.preprocess(blankAsUnset, z.enum(['fake']).default('fake')),
  /**
   * The service fee renters pay, in whole percent of the rent (owner's decision of 2026-11-06: 10 %).
   * A `fees.servicePercent` row in the Setting table overrides it at runtime. Unset: 10.
   */
  FEE_PERCENT: z.preprocess(blankAsUnset, z.coerce.number().int().min(0).max(100).optional()),
  /** The fee during the launch offer, in whole percent (0 for the first 3 months). Unset: 0. */
  FEE_PROMO_PERCENT: z.preprocess(blankAsUnset, z.coerce.number().int().min(0).max(100).optional()),
  /**
   * The launch offer's last day, `YYYY-MM-DD` (in the item's time zone): requests sent before the end of
   * that day pay FEE_PROMO_PERCENT, later ones FEE_PERCENT. Unset: no offer. A `fees.promoServiceUntil`
   * row in the Setting table overrides it. Each booking keeps the fee it was requested with.
   */
  FEE_PROMO_UNTIL: z.preprocess(blankAsUnset, z.iso.date().optional()),
  /**
   * Protects POST /internal/timers/run, which the scheduled GitHub workflow calls every 10 minutes to
   * fire due deal deadlines on a server that sleeps. At least 32 characters; the same value as the
   * repository's Actions secret TIMERS_SECRET. Unset: the route does not exist (deadlines still fire
   * at every start).
   */
  TIMERS_SECRET: z.preprocess(blankAsUnset, z.string().min(32).optional()),
  /** Folder of the local storage, relative to the API's working directory. */
  UPLOADS_DIR: z.preprocess(blankAsUnset, z.string().default('.uploads')),
});

export const EnvSchema = EnvObject.superRefine((env, ctx) => {
  if (env.NODE_ENV === 'production' && !env.WEB_ORIGIN.startsWith('https://')) {
    ctx.addIssue({
      code: 'custom',
      path: ['WEB_ORIGIN'],
      message: 'must be an https:// origin in production (Secure cookies, email links, Google redirects)',
    });
  }
  if (env.NODE_ENV === 'production' && env.SMS_PROVIDER === 'mailbox') {
    ctx.addIssue({
      code: 'custom',
      path: ['SMS_PROVIDER'],
      message: '"mailbox" only simulates SMS by email and is not allowed in production',
    });
  }
  if (env.NODE_ENV === 'production' && env.STORAGE === 'local') {
    ctx.addIssue({
      code: 'custom',
      path: ['STORAGE'],
      message: '"local" keeps photos on this server\'s disk, which hosting wipes on deploy; use "cloudinary" in production',
    });
  }
}).transform((env) => {
  const production = env.NODE_ENV === 'production';
  return {
    ...env,
    SMTP_URL: env.SMTP_URL ?? (production ? undefined : LOCAL_SMTP_URL),
    SMS_PROVIDER: env.SMS_PROVIDER ?? (production ? undefined : ('mailbox' as const)),
    STORAGE: env.STORAGE ?? (production ? undefined : ('local' as const)),
  };
});

export type Env = z.infer<typeof EnvSchema>;

/** Injection token for the validated environment. */
export const ENV = Symbol('ENV');

/**
 * Validates the process environment once at startup.
 * Throws a single error that names every invalid or missing variable, so a bad deploy fails fast and clearly.
 */
export function loadEnv(source: Record<string, string | undefined>): Env {
  const result = EnvSchema.safeParse(source);
  if (!result.success) {
    const problems = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`Invalid environment configuration:\n  ${problems.join('\n  ')}`);
  }
  return result.data;
}
