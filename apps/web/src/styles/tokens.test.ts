import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(__dirname, 'tokens.css'), 'utf8');

/** The declarations inside the first block whose selector list starts with `selector`. */
function block(selector: string): string {
  const at = css.indexOf(selector);
  expect(at, `no block for ${selector}`).toBeGreaterThan(-1);
  return css.slice(css.indexOf('{', at) + 1, css.indexOf('}', at));
}

describe('v16 palette', () => {
  it('light theme is cream paper with night ink', () => {
    const light = block(":root,\n[data-theme='light']");
    expect(light).toMatch(/--canvas:\s*#f4f1e6/i);
    expect(light).toMatch(/--ink:\s*#0a0b0e/i);
  });

  it('dark theme turns it round: night paper, cream ink', () => {
    const dark = block("[data-theme='dark']");
    expect(dark).toMatch(/--canvas:\s*#0a0b0e/i);
    expect(dark).toMatch(/--ink:\s*#f4f1e6/i);
  });

  it('has the one light, ice blue', () => {
    expect(css).toMatch(/--glow:\s*#9ed2ff/i);
  });

  it('has no yellow and none of the old sticker colours', () => {
    expect(css).not.toMatch(/#ffd731|#55db9c|#4da2ff|#5c4ade|#e9ccff/i);
  });
});
