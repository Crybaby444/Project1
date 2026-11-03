import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** API version from apps/api/package.json (src/ and dist/ both sit one level below it). */
export const API_VERSION: string = (
  JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8')) as { version: string }
).version;
