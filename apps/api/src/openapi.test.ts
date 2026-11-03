import type { INestApplication } from '@nestjs/common';
import { createApp } from './app.factory';
import { buildOpenApiDocument } from './openapi';

describe('buildOpenApiDocument', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('documents the health endpoint with both answers', () => {
    const doc = buildOpenApiDocument(app);
    expect(Object.keys(doc.paths)).toContain('/api/v1/health');
    expect(Object.keys(doc.paths['/api/v1/health']?.get?.responses ?? {})).toEqual(
      expect.arrayContaining(['200', '503']),
    );
  });
});
