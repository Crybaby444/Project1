import { z } from 'zod';

export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.url(),
  /** Give up on a new database connection after this long instead of hanging (pg's default is "never"). */
  DB_CONNECT_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
  /**
   * The web app origin allowed to call the API with credentials (CORS). Normalized to a bare origin:
   * browsers send `Origin: https://site` with no slash or path, so `https://site/` must still match.
   */
  WEB_ORIGIN: z.url().transform((value) => new URL(value).origin),
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
