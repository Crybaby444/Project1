import { z } from 'zod';

/** Body of `GET /api/v1/health`, shared by the API (OpenAPI docs) and the web app. */
export const HealthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  db: z.enum(['up', 'down']),
  version: z.string(),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;
