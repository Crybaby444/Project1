import { readFileSync } from 'node:fs';

// Two levels up from both src/config and dist/config lands on apps/api/package.json.
const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as {
  version: string;
};

export const API_VERSION: string = pkg.version;
