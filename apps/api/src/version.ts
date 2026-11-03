import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Version from apps/api/package.json (works from both src/ and dist/). */
export const API_VERSION: string = (
  JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8')) as { version: string }
).version;
