import type { CategoryNode } from '@yoyo/shared';
import { describe, expect, it } from 'vitest';
import { categoryHref, coversByRoot, findBySlug, pathTo } from './categories';

const node = (slug: string, lv: string, ru: string, children: CategoryNode[] = []): CategoryNode => ({
  id: `id-${slug}`,
  slug,
  slugs: { en: slug, lv, ru },
  sticker: 'sun',
  icon: 'x',
  names: { en: slug, lv, ru },
  attributes: [],
  children,
});

const tree = [node('tools', 'instrumenti', 'instrumenty', [node('saws', 'zagi', 'pily')]), node('music', 'muzika', 'muzyka')];

describe('category tree', () => {
  it('finds a category by the slug of the page language, or by another language’s', () => {
    expect(findBySlug(tree, 'lv', 'zagi')).toEqual({ node: tree[0]!.children[0], exact: true });
    expect(findBySlug(tree, 'lv', 'saws')).toEqual({ node: tree[0]!.children[0], exact: false });
    expect(findBySlug(tree, 'ru', 'nothing')).toBeNull();
  });

  it('gives the path from the root for breadcrumbs, and each language’s address', () => {
    expect(pathTo(tree, 'saws').map((n) => n.slug)).toEqual(['tools', 'saws']);
    expect(pathTo(tree, 'id-saws').map((n) => n.slug)).toEqual(['tools', 'saws']);
    expect(categoryHref(tree[0]!, 'ru')).toBe('/ru/c/instrumenty');
    expect(categoryHref(tree[0]!, 'en')).toBe('/c/tools');
  });
});

describe('coversByRoot', () => {
  const tree = [node('tools', 'instrumenti', 'instrumenty', [node('drills', 'urbji', 'dreli')]), node('sport', 'sports', 'sport')];
  const item = (categoryId: string | null, thumb: string | null) => ({ categoryId, cover: thumb ? { thumb } : null });

  it('gives each root up to three thumbnails of its items, newest first, from any depth', () => {
    const covers = coversByRoot(tree, [
      item('id-drills', 'd1'),
      item('id-tools', 't1'),
      item('id-drills', 'd2'),
      item('id-drills', 'd3'),
      item('id-sport', 's1'),
    ]);
    expect(covers).toEqual({ 'id-tools': ['d1', 't1', 'd2'], 'id-sport': ['s1'] });
  });

  it('skips items without a photo or a known category, and repeats', () => {
    expect(coversByRoot(tree, [item('id-drills', null), item(null, 'x'), item('gone', 'y'), item('id-sport', 's1'), item('id-sport', 's1')])).toEqual({
      'id-sport': ['s1'],
    });
  });
});
