import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createApp } from '../src/app.factory';
import { buildOpenApiDocument } from '../src/openapi';

/** Writes apps/api/openapi.json without connecting to the database. */
async function main(): Promise<void> {
  process.env['DATABASE_URL'] ??= 'postgresql://localhost:5432/yoyo_dev';
  process.env['WEB_ORIGIN'] ??= 'http://localhost:3000';
  const app = await createApp({ logger: false });
  const doc = buildOpenApiDocument(app);
  const target = join(__dirname, '..', 'openapi.json');
  writeFileSync(target, `${JSON.stringify(doc, null, 2)}\n`);
  await app.close();
  console.log(`OpenAPI written to ${target}`);
}

void main();
