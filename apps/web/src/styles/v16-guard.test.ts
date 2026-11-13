import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Pages already ported to v16 must not slide back to the sticker look: no sticker fills, no tilted
 * badges, no outlined "paper cards". Add a folder here when its stage ships.
 */
const PORTED = [
  'components/home',
  'components/catalog',
  'components/item',
  'app/[locale]/c',
  'app/[locale]/search',
  'app/[locale]/listings/[id]/page.tsx',
  'components/auth',
  'app/[locale]/(auth)',
  'components/layout',
];
const BANNED = /bg-sticker-|[\s:'\"`]-?rotate-(?:[1-9]|1[0-2])\b|rounded-card\b|rounded-card-xl|<Sticker\b|<Card\b/;   // tilts of 1–12° are the sticker look; an icon turning 45/90/180° is fine

const files = (p: string): string[] => {
  const abs = join(__dirname, '..', p);
  if (statSync(abs).isFile()) return [abs];
  return readdirSync(abs, { recursive: true, encoding: 'utf8' })
    .filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f))
    .map((f) => join(abs, f));
};

describe('v16 guard', () => {
  for (const dir of PORTED) {
    it(`${dir} has no sticker classes, tilts or paper cards`, () => {
      const offenders = files(dir).filter((f) => BANNED.test(readFileSync(f, 'utf8')));
      expect(offenders.map((f) => f.split('/src/')[1])).toEqual([]);
    });
  }
});
