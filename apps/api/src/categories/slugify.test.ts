import { describe, expect, it } from 'vitest';
import { CATALOG } from './catalog-data';
import { localizedSlugs } from './slugify';

describe('localizedSlugs', () => {
  it('gives every catalog category the W03 address on each language, unique per language', () => {
    const slugs = localizedSlugs(CATALOG);
    expect(slugs.size).toBe(90);
    expect(slugs.get('ladders-scaffolding')).toEqual({ en: 'ladders-scaffolding', lv: 'kapnes-sastatnes', ru: 'lestnitsy-lesa' });
    expect(slugs.get('tools')).toEqual({ en: 'tools', lv: 'instrumenti', ru: 'instrumenty' });
    expect(slugs.get('strollers')).toEqual({ en: 'strollers', lv: 'bernu-rati', ru: 'detskie-kolyaski' });
    expect(slugs.get('garden')).toEqual({ en: 'garden', lv: 'darzs-pagalms', ru: 'sad-dvor' });
  });

  it('refuses two categories on one address, and non-ASCII slugs', () => {
    const node = (slug: string, lv: string, ru: string) => ({ slug, slugs: { en: slug, lv, ru } });
    expect(() => localizedSlugs([node('a', 'same', 'a'), node('b', 'same', 'b')])).toThrow(/already used/);
    expect(() => localizedSlugs([node('a', 'mēbeles', 'a')])).toThrow(/lowercase ASCII/);
  });
});
