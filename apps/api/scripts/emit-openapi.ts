import { writeFileSync } from 'node:fs';
import { createApp } from '../src/app.js';
import { buildOpenApiDocument } from '../src/openapi.js';

// The document only needs route metadata; no database connection is opened.
process.env.DATABASE_URL ??= 'postgresql://localhost:5432/yoyo_dev';
process.env.WEB_ORIGIN ??= 'http://localhost:3000';

const app = await createApp({ logger: false });
const doc = buildOpenApiDocument(app);
const out = new URL('../openapi.json', import.meta.url);
writeFileSync(out, `${JSON.stringify(doc, null, 2)}\n`);
await app.close();
console.log(`OpenAPI written to ${out.pathname}`);
