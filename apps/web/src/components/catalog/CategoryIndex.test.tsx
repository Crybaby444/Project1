import type { CategoryNode } from '@yoyo/shared';
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithIntl } from '@/test/render';
import { testCategories } from '@/test/listings';
import { CategoryIndex } from './CategoryIndex';

const child = (n: number, root: CategoryNode): CategoryNode => ({
  ...root, id: `${root.id}-c${n}`, slug: `sub-${n}`, slugs: { en: `sub-${n}`, lv: `sub-${n}`, ru: `sub-${n}` },
  names: { en: `Sub ${n}`, lv: `Apakš ${n}`, ru: `Под ${n}` }, children: [],
});
const root = testCategories[0]!;
const roots: CategoryNode[] = [
  { ...root, children: [child(1, root), child(2, root), child(3, root)] },
  { ...root, id: 'r2', slug: 'tools', slugs: { en: 'tools', lv: 'instrumenti', ru: 'instrumenty' }, names: { en: 'Tools', lv: 'Instrumenti', ru: 'Инструменты' }, children: [] },
];

describe('CategoryIndex', () => {
  it('lists every root as one numbered row linking to its page in the language', () => {
    renderWithIntl(<CategoryIndex roots={roots} locale="lv" />, 'lv');
    const rows = screen.getAllByRole('link');
    expect(rows).toHaveLength(2);
    expect(rows[1]).toHaveAttribute('href', expect.stringContaining('instrumenti'));
    expect(within(rows[0]!).getByText('01')).toBeInTheDocument();
    expect(within(rows[1]!).getByText('Instrumenti')).toBeInTheDocument();
  });

  it('names at most two subcategories under a root', () => {
    renderWithIntl(<CategoryIndex roots={roots} locale="en" />);
    const first = screen.getAllByRole('link')[0]!;
    expect(first).toHaveTextContent('Sub 1 · Sub 2');
    expect(first).not.toHaveTextContent('Sub 3');
  });

  it('marks the name for the drop cursor to fill', () => {
    renderWithIntl(<CategoryIndex roots={roots} locale="en" />);
    expect(screen.getAllByRole('link')[0]!.querySelector('[data-cursor-text]')).toHaveTextContent('Electronics');
  });

  it('wraps a long name onto two lines on a phone instead of clipping it (display text never cut)', () => {
    renderWithIntl(<CategoryIndex roots={roots} locale="en" />);
    const name = screen.getAllByRole('link')[0]!.querySelector('[data-cursor-text]')!;
    expect(name.className).not.toMatch(/\btruncate\b|whitespace-nowrap/);
    expect(name.className).toMatch(/overflow-wrap:anywhere/);
  });
});
