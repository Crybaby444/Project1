import { describe, expect, it } from 'vitest';
import { HealthResponseSchema } from './health.js';

describe('HealthResponseSchema', () => {
  it('accepts ok and degraded payloads', () => {
    expect(HealthResponseSchema.parse({ status: 'ok', db: 'up', version: '0.1.0' })).toBeTruthy();
    expect(HealthResponseSchema.safeParse({ status: 'degraded', db: 'down', version: '0.1.0' }).success).toBe(
      true,
    );
  });

  it('rejects unknown statuses', () => {
    expect(HealthResponseSchema.safeParse({ status: 'meh', db: 'up', version: '1' }).success).toBe(false);
  });
});
