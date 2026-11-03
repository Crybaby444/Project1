import type { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from './app.js';
import { buildOpenApiDocument } from './openapi.js';

describe('buildOpenApiDocument', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createApp({ logger: false });
  });

  afterAll(async () => {
    await app.close();
  });

  it('documents the health endpoint with both responses', () => {
    const doc = buildOpenApiDocument(app);
    expect(Object.keys(doc.paths)).toContain('/api/v1/health');
    expect(Object.keys(doc.paths['/api/v1/health']!.get!.responses)).toEqual(
      expect.arrayContaining(['200', '503']),
    );
  });
});
