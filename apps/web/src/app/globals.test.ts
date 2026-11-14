import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(__dirname, 'globals.css'), 'utf8');

describe('globals.css', () => {
  it('never fades the page colours: a theme change is drawn by the view transition, not by half-way text', () => {
    const body = css.slice(css.indexOf('  body {'), css.indexOf('}', css.indexOf('  body {')));
    expect(body).not.toMatch(/transition/);
  });
});
