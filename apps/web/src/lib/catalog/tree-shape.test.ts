import { describe, expect, it } from 'vitest';
import { isCurrentTree } from './tree-shape';

const text = (en: string) => ({ en, lv: en, ru: en });
const node = (slug: string, children: unknown[] = []) => ({ slugs: text(slug), names: text(slug), children });

describe('isCurrentTree', () => {
  it('accepts a tree with names and addresses in every language', () => {
    expect(isCurrentTree([node('tools', [node('drills')])])).toBe(true);
  });

  it('refuses an answer of the previous API, without per-language addresses', () => {
    expect(isCurrentTree([{ slug: 'tools', names: text('Tools'), children: [] }])).toBe(false);
  });

  it('refuses a subcategory missing a language', () => {
    expect(isCurrentTree([node('tools', [{ slugs: { en: 'drills' }, names: text('Drills') }])])).toBe(false);
  });
});
