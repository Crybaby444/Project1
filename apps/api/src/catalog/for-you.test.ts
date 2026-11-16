import { describe, expect, it } from 'vitest';
import { rankForYou, type Candidate } from './for-you';

const now = new Date('2026-11-16T12:00:00Z');
const item = (id: string, over: Partial<Candidate> = {}): Candidate => ({ id, ownerId: 'o-' + id, categoryId: 'c', publishedAt: now, favorites: 0, requests: 0, rating: null, reviewCount: 0, ...over });
const none = { categories: new Set<string>(), owners: new Set<string>() };

describe('rankForYou', () => {
  it('favours popular items, and fresh over old at the same popularity', () => {
    const old = item('old', { publishedAt: new Date('2026-09-01T00:00:00Z') });
    expect(rankForYou([item('a'), item('b', { favorites: 3 }), old], none, now)).toEqual(['b', 'a', 'old']);
  });

  it('lifts the person’s categories and followed owners', () => {
    const order = rankForYou([item('drill', { categoryId: 'tools', favorites: 1 }), item('tent', { categoryId: 'camping' })], { categories: new Set(['camping']), owners: new Set() }, now);
    expect(order[0]).toBe('tent');
  });

  it('keeps variety in the first eight, then fills with the rest', () => {
    const one = Array.from({ length: 6 }, (_, i) => item('m' + i, { ownerId: 'many', categoryId: 'k' + i, favorites: 10 }));
    const others = Array.from({ length: 6 }, (_, i) => item('x' + i, { categoryId: 'k' + i }));
    const order = rankForYou([...one, ...others], none, now);
    expect(order.slice(0, 8).filter((id) => id.startsWith('m'))).toHaveLength(2);
    expect(order).toHaveLength(12);
  });
});
