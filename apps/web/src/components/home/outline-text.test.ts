import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const files = ['NightScene.tsx', 'Finale.tsx'].map((f) => [f, readFileSync(join(__dirname, f), 'utf8')] as const);

describe('outlined display text', () => {
  it.each(files)('%s: the stroke is painted under a fill of the ground colour, so letters like A show no inner seams', (_f, src) => {
    const strokes = src.match(/className="[^"]*text-stroke[^"]*"/g) ?? [];
    expect(strokes.length).toBeGreaterThan(0);
    for (const cls of strokes) {
      expect(cls).toMatch(/paint-order:stroke_fill/);
      expect(cls).not.toMatch(/text-transparent/);
    }
  });
});
