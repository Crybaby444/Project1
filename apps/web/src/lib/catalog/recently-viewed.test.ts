import { afterEach, describe, expect, it } from 'vitest';
import { catalogItem } from '@/test/catalog';
import { forgetViewed, recallViewed, rememberViewed, RECENT_LIMIT } from './recently-viewed';

afterEach(() => localStorage.clear());

describe('recently viewed items', () => {
  it('keeps the newest first, once each, up to the limit', () => {
    for (let i = 0; i < RECENT_LIMIT + 2; i++) rememberViewed(catalogItem({ id: `i${i}` }));
    rememberViewed(catalogItem({ id: 'i3', title: 'Seen again' }));
    const items = recallViewed();
    expect(items).toHaveLength(RECENT_LIMIT);
    expect(items[0]).toMatchObject({ id: 'i3', title: 'Seen again' });
    expect(items.filter((i) => i.id === 'i3')).toHaveLength(1);
  });

  it('survives broken or foreign data and a browser that refuses storage', () => {
    localStorage.setItem('yoyo-recent', '{not json');
    expect(recallViewed()).toEqual([]);
    localStorage.setItem('yoyo-recent', JSON.stringify([{ id: 1 }, catalogItem({ id: 'ok' })]));
    expect(recallViewed().map((i) => i.id)).toEqual(['ok']);
    forgetViewed();
    expect(recallViewed()).toEqual([]);
  });
});
