import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

/** Where the example listings' photos live: `apps/api/assets/demo` (shipped with the API image). */
const DIR = join(__dirname, '..', '..', 'assets', 'demo');

/**
 * The JPEG photos of an example item, read from the assets (1200×900, 4:3 like the builder's crop): real
 * photos in the public domain or under CC0 (owner, 2026-11-28: "use real photos"), listed in CREDITS.md.
 */
export async function demoPhotos(names: readonly string[]): Promise<Buffer[]> {
  return Promise.all(names.map((name) => readFile(join(DIR, `${name}.jpg`))));
}
