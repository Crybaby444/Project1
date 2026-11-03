import { describe, expect, it } from 'vitest';
import { HealthResponseSchema } from './health.js';

describe('HealthResponseSchema', () => {
  it('accepts both healthy and degraded answers', () => {
    expect(HealthResponseSchema.parse({ status: 'ok', db: 'up', version: '0.1.0' })).toBeTruthy();
    expect(
      HealthResponseSchema.parse({ status: 'degraded', db: 'down', version: '0.1.0' }),
    ).toBeTruthy();
  });

  it('rejects unknown statuses', () => {
    expect(HealthResponseSchema.safeParse({ status: 'meh', db: 'up', version: '1' }).success).toBe(
      false,
    );
  });
});
