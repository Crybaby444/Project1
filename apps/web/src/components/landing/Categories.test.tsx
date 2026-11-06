import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CategoryNode } from '@yoyo/shared';
import { describe, expect, it, vi } from 'vitest';
import siteEn from '../../../messages/site/en.json';
import siteRu from '../../../messages/site/ru.json';
import { renderWithIntl } from '@/test/render';
import { CategoryGrid } from './CategoryGrid';
import { CategoriesRetry } from './CategoriesRetry';

const node = (slug: string, en: string, ru: string, children: CategoryNode[] = []): CategoryNode => ({
  id: slug,
  slug,
  sticker: 'mint' as const,
  icon: slug,
  names: { en, lv: en, ru },
  attributes: [],
  children,
});

const TREE = [
  node('sports-outdoors', 'Sports & outdoors', 'Спорт и отдых', [
    node('bikes', 'Bikes', 'Велосипеды'),
    node('camping', 'Camping', 'Кемпинг'),
  ]),
  node('music', 'Music', 'Музыка', [node('guitars', 'Guitars', 'Гитары')]),
];

describe('CategoryGrid', () => {
  it('shows every top category in the page language with its real subcategories', () => {
    renderWithIntl(<CategoryGrid categories={TREE} />, 'ru');
    const cards = screen.getAllByRole('listitem');
    expect(cards).toHaveLength(2);
    expect(screen.getByRole('heading', { name: 'Спорт и отдых' })).toBeInTheDocument();
    expect(screen.getByText('2 подкатегории')).toBeInTheDocument();
    expect(screen.getByText('1 подкатегория')).toBeInTheDocument();
    expect(screen.getByText('Велосипеды · Кемпинг')).toBeInTheDocument();
  });

  it('is not a link: there is no catalog to open yet, and no dead links', () => {
    renderWithIntl(<CategoryGrid categories={TREE} />);
    expect(screen.queryAllByRole('link')).toEqual([]);
  });
});

describe('CategoriesRetry (the API did not answer in time)', () => {
  it('explains the problem and loads the categories when asked again', async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('still asleep'))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ categories: TREE }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
    const user = userEvent.setup();
    renderWithIntl(<CategoriesRetry fetchImpl={fetchImpl} />);

    expect(screen.getByText(siteEn.landing.categories.error)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: siteEn.landing.categories.retry }));
    expect(await screen.findByText(siteEn.landing.categories.error)).toBeInTheDocument(); // first retry fails too

    await user.click(screen.getByRole('button', { name: siteEn.landing.categories.retry }));
    expect(await screen.findByRole('heading', { name: 'Music' })).toBeInTheDocument();
    expect(screen.queryByText(siteEn.landing.categories.error)).toBeNull();
    expect(fetchImpl).toHaveBeenCalledWith('/api/v1/categories', expect.anything());
  });

  it('marks the button busy while it loads', async () => {
    let answer!: (response: Response) => void;
    const fetchImpl = vi.fn(() => new Promise<Response>((resolve) => (answer = resolve)));
    const user = userEvent.setup();
    renderWithIntl(<CategoriesRetry fetchImpl={fetchImpl} />, 'ru');
    await user.click(screen.getByRole('button', { name: siteRu.landing.categories.retry }));
    expect(screen.getByRole('button', { name: siteRu.landing.categories.retry })).toHaveAttribute(
      'aria-busy',
      'true',
    );
    answer(new Response(JSON.stringify({ categories: TREE }), { status: 200 }));
    expect(await screen.findByRole('heading', { name: 'Музыка' })).toBeInTheDocument();
  });
});
