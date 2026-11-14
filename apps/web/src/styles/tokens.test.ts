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

  it('in the dark the "night" scenes are the inverse of the page (cream), so their transitions still show', () => {
    const dark = block("[data-theme='dark']");
    expect(dark).toMatch(/--night:\s*#f4f1e6/i);
    expect(dark).toMatch(/--paper:\s*#0a0b0e/i);
  });

  it('the dim night line keeps 3:1 on the night in both themes (axe, large text)', () => {
    const lum = (hex: string) => {
      const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
      return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
    };
    const ratio = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x! + 0.05) / (y! + 0.05); };
    const pick = (src: string, name: string) => src.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, 'i'))?.[1] ?? '';
    const dark = block("[data-theme='dark']");
    expect(ratio(pick(css, 'night-dim'), pick(css, 'night'))).toBeGreaterThanOrEqual(3);
    expect(ratio(pick(dark, 'night-dim'), pick(dark, 'night'))).toBeGreaterThanOrEqual(3);
  });

  it('is black and white only: the accent is a neutral chrome grey, no blue (owner, 2026-11-13)', () => {
    expect(css).toMatch(/--glow:\s*#a9aeb6/i);
    expect(css).not.toMatch(/#9ed2ff/i);
  });

  it('has no yellow and none of the old sticker colours', () => {
    expect(css).not.toMatch(/#ffd731|#55db9c|#4da2ff|#5c4ade|#e9ccff/i);
  });
});
