import type { CategoryNode } from '@yoyo/shared';
import { describe, expect, it } from 'vitest';
import { categoryHref, findBySlug, pathTo } from './categories';

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
