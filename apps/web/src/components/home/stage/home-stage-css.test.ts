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
});
