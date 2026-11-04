import { ZodValidationException } from 'nestjs-zod';
import type { z } from 'zod';

/**
 * Validates a body that may be absent altogether (a bare POST from the site): no body counts as `{}`.
 * Invalid input fails like any other DTO, with VALIDATION_FAILED and per-field messages.
 */
export function parseOptionalBody<T extends z.ZodType>(schema: T, body: unknown): z.output<T> {
  const result = schema.safeParse(body ?? {});
  if (!result.success) throw new ZodValidationException(result.error);
  return result.data;
}
