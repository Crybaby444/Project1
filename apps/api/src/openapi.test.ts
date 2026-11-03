import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { loadEnv } from './config/env';
import { buildOpenApiDocument } from './openapi';

type SchemaLike = { $ref?: string; properties?: Record<string, { enum?: unknown[] }> };

describe('buildOpenApiDocument', () => {
  it('documents GET /api/v1/health with 200 and 503 using the shared response schema', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const app = moduleRef.createNestApplication();
    configureApp(app, loadEnv(process.env));
    await app.init();

    const doc = buildOpenApiDocument(app);

    expect(Object.keys(doc.paths)).toContain('/api/v1/health');
    const responses = doc.paths['/api/v1/health']!.get!.responses as Record<
      string,
      { content?: Record<string, { schema: SchemaLike }> }
    >;
    expect(Object.keys(responses)).toEqual(expect.arrayContaining(['200', '503']));

    // The 200 schema must resolve to the zod schema from @yoyo/shared, enums included.
    const ref = responses['200']!.content!['application/json']!.schema.$ref!;
    const schema = doc.components!.schemas![ref.split('/').pop()!] as SchemaLike;
    expect(schema.properties!['status']!.enum).toEqual(['ok', 'degraded']);
    expect(schema.properties!['db']!.enum).toEqual(['up', 'down']);

    await app.close();
  });
});
