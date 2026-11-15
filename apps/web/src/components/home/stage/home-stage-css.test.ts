import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(__dirname, 'home-stage.css'), 'utf8');

describe('home-stage.css', () => {
  it('hides the theme controls on the home (it always shows the light palette), in the global styles', () => {
    const globals = readFileSync(join(__dirname, '../../../app/globals.css'), 'utf8');
    expect(globals).toMatch(/\[data-theme-control\][^{]*\{[^}]*display:\s*none/);
  });

  it('leaves no text selection or tap flash on the home scenes', () => {
    const at = css.indexOf('[data-home-root] {');
    expect(at).toBeGreaterThan(-1);
    const rule = css.slice(at, css.indexOf('}', at));
    expect(rule).toMatch(/user-select:\s*none/);
    expect(rule).toMatch(/-webkit-tap-highlight-color:\s*transparent/);
  });
});
