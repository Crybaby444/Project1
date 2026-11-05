import type { CategoryNode } from '@yoyo/shared';
import { describe, expect, it } from 'vitest';
import { findCategory, findPath, isLeaf, localized } from './categories';

const node = (id: string, children: CategoryNode[] = []): CategoryNode => ({
  id,
  slug: id,
  sticker: 'blue',
  icon: 'x',
  names: { en: `${id} en`, lv: `${id} lv`, ru: `${id} ru` },
  attributes: [],
  children,
});

const tree = [node('tools', [node('drills'), node('saws')]), node('kids', [node('toys')])];

describe('category tree', () => {
  it('finds the path from the top to a category', () => {
    expect(findPath(tree, 'saws').map((c) => c.id)).toEqual(['tools', 'saws']);
    expect(findPath(tree, 'tools').map((c) => c.id)).toEqual(['tools']);
    expect(findPath(tree, 'nope')).toEqual([]);
    expect(findCategory(tree, 'toys')?.id).toBe('toys');
  });

  it('knows leaves', () => {
    expect(isLeaf(node('x'))).toBe(true);
    expect(isLeaf(tree[0]!)).toBe(false);
  });

  it('reads names in the page language', () => {
    expect(localized(tree[0]!.names, 'lv')).toBe('tools lv');
    expect(localized(tree[0]!.names, 'de')).toBe('tools en');
  });
});
