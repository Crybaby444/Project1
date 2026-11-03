import { describe, expect, it } from 'vitest';
import { HealthResponseSchema } from './health';

describe('HealthResponseSchema', () => {
  it('accepts both healthy and degraded responses', () => {
    expect(HealthResponseSchema.parse({ status: 'ok', db: 'up', version: '0.1.0' })).toEqual({
      status: 'ok',
      db: 'up',
      version: '0.1.0',
    });
    expect(HealthResponseSchema.safeParse({ status: 'degraded', db: 'down', version: '0.1.0' }).success).toBe(
      true,
    );
  });

  it('rejects unknown states and a missing version', () => {
    expect(HealthResponseSchema.safeParse({ status: 'fine', db: 'up', version: '1' }).success).toBe(false);
    expect(HealthResponseSchema.safeParse({ status: 'ok', db: 'up' }).success).toBe(false);
  });
});
