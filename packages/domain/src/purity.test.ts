import { readdirSync, readFileSync } from 'node:fs';
import { builtinModules } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * The domain core is pure: time, randomness, the environment and I/O only come in as arguments.
 * This test reads every production source file (tests excluded) and fails on any of them.
 */
const SRC = fileURLToPath(new URL('.', import.meta.url));

const FORBIDDEN: ReadonlyArray<readonly [what: string, pattern: RegExp]> = [
  ['Date.now()', /\bDate\.now\s*\(/],
  ['new Date() without an argument', /\bnew\s+Date\s*\(\s*\)/],
  ['Date() without new', /(?<!\bnew\s+)(?<![\w$.])Date\s*\(/],
  ['Math.random()', /\bMath\.random\s*\(/],
  ['performance.now()', /\bperformance\.now\s*\(/],
  ['crypto randomness', /\bcrypto\.(?:randomUUID|randomBytes|randomInt|getRandomValues)\s*\(/],
  ['process.env', /\bprocess\.env\b/],
  ['timers', /\b(?:setTimeout|setInterval|setImmediate)\s*\(/],
  ['console', /\bconsole\.\w+\s*\(/],
  ['fetch()', /(?<![\w$.])fetch\s*\(/],
];

const MODULE_SPECIFIER =
  /\bfrom\s+['"]([^'"]+)['"]|\bimport\s*\(\s*['"]([^'"]+)['"]|\brequire\s*\(\s*['"]([^'"]+)['"]/g;

function impurities(source: string): string[] {
  const found = FORBIDDEN.filter(([, pattern]) => pattern.test(source)).map(([what]) => what);
  for (const match of source.matchAll(MODULE_SPECIFIER)) {
    const specifier = match[1] ?? match[2] ?? match[3] ?? '';
    if (specifier.startsWith('node:') || builtinModules.includes(specifier)) {
      found.push(`Node module ${specifier}`);
    }
  }
  return found;
}

function productionFiles(): string[] {
  return readdirSync(SRC, { recursive: true, encoding: 'utf8' })
    .filter((file) => file.endsWith('.ts') && !file.endsWith('.test.ts'))
    .sort();
}

describe('purity check', () => {
  it.each([
    ['const t = Date.now();', 'Date.now()'],
    ['const d = new Date();', 'new Date() without an argument'],
    ['const s = Date();', 'Date() without new'],
    ['const r = Math.random();', 'Math.random()'],
    ['const t = performance.now();', 'performance.now()'],
    ['const id = crypto.randomUUID();', 'crypto randomness'],
    ['const tz = process.env.TZ;', 'process.env'],
    ['setTimeout(run, 10);', 'timers'],
    ['console.log(value);', 'console'],
    ['await fetch(url);', 'fetch()'],
    ["import { readFileSync } from 'node:fs';", 'Node module node:fs'],
    ["import fs from 'fs';", 'Node module fs'],
  ])('flags %s', (source, what) => {
    expect(impurities(source)).toEqual([what]);
  });

  it('lets deterministic date code through', () => {
    const source = [
      "import type { Locale } from '@yoyo/shared';",
      "import { DomainError } from './errors';",
      'const d = new Date(value);',
      'const t = Date.UTC(2026, 0, 1);',
      'const ok = isDate(d) && toLocalDate(d);',
    ].join('\n');
    expect(impurities(source)).toEqual([]);
  });
});

describe('production code', () => {
  it('is all scanned', () => {
    expect(productionFiles()).toEqual(
      expect.arrayContaining([
        'booking/decide.ts',
        'booking/request.ts',
        'booking/transitions.ts',
        'booking/types.ts',
        'dates.ts',
        'errors.ts',
        'index.ts',
        'ledger.ts',
        'money.ts',
        'pricing.ts',
        'settings.ts',
      ]),
    );
  });

  it('reads no clock, randomness, environment or I/O', () => {
    const found = productionFiles().flatMap((file) =>
      impurities(readFileSync(join(SRC, file), 'utf8')).map((what) => `${file}: ${what}`),
    );
    expect(found).toEqual([]);
  });
});
