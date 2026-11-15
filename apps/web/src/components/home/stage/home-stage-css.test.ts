import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(__dirname, 'home-stage.css'), 'utf8');

describe('home-stage.css', () => {
  it('drops the blended header while one of its menus is open, so the panel is solid, not see-through', () => {
    const at = css.indexOf("[data-site-header]:has([aria-expanded='true'])");
    expect(at).toBeGreaterThan(-1);
    const rule = css.slice(css.indexOf('{', at), css.indexOf('}', at));
    expect(rule).toMatch(/mix-blend-mode:\s*normal/);
    expect(rule).toMatch(/--ink:\s*inherit/);
    expect(rule).toMatch(/background:\s*var\(--canvas\)/);
  });

  it('hangs the home header as a chin: a solid page-coloured bar with a rounded bottom, no blending', () => {
    const at = css.indexOf('html[data-staged] [data-site-header] {');
    const rule = css.slice(at, css.indexOf('}', at));
    expect(rule).toMatch(/background:\s*var\(--canvas\)/);
    expect(rule).toMatch(/border-radius:\s*0 0/);
    expect(rule).not.toMatch(/mix-blend-mode:\s*difference/);
  });

  it('hides the theme controls on the home (it always shows the light palette), in the global styles', () => {
    const globals = readFileSync(join(__dirname, '../../../app/globals.css'), 'utf8');
    expect(globals).toMatch(/\[data-theme-control\][^{]*\{[^}]*display:\s*none/);
  });

  it('sizes the chin to the screen: as wide as the header content at most, corners and gaps that scale', () => {
    const at = css.indexOf('html[data-staged] [data-site-header] {');
    const rule = css.slice(at, css.indexOf('}', at));
    expect(rule).toMatch(/inset-inline:\s*max\(/);
    expect(rule).toMatch(/border-radius:\s*0 0 clamp\(/);
  });

  it('leaves no text selection or tap flash on the home scenes', () => {
    const at = css.indexOf('[data-home-root] {');
    expect(at).toBeGreaterThan(-1);
    const rule = css.slice(at, css.indexOf('}', at));
    expect(rule).toMatch(/user-select:\s*none/);
    expect(rule).toMatch(/-webkit-tap-highlight-color:\s*transparent/);
  });
});
