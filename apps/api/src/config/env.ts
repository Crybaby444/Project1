import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.string().min(1).url(),
  WEB_ORIGIN: z.string().min(1).url(),
});

export type Env = z.infer<typeof EnvSchema>;

export const ENV = Symbol('ENV');

/** Validates the environment and reports every invalid key at once. */
export function loadEnv(source: Record<string, string | undefined>): Env {
  const result = EnvSchema.safeParse(source);
  if (!result.success) {
    const problems = result.error.issues.map(
      (issue) => `${issue.path.join('.')}: ${issue.message}`,
    );
    throw new Error(`Invalid environment variables:\n  ${problems.join('\n  ')}`);
  }
  return result.data;
}
