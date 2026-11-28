import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import en from '../../../messages/en.json';
import { fakeApi, meRoute } from '@/test/fake-api';
import { renderWithSession } from '@/test/render';
import { SearchBox } from './SearchBox';

const push = vi.fn();
vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/i18n/navigation')>()),
  useRouter: () => ({ replace: vi.fn(), push, refresh: vi.fn() }),
}));

const s = en.catalog.search;
const SUGGEST = {
  categories: [{ slug: 'drills-drivers', slugs: { en: 'drills-drivers', lv: 'urbjmasinas', ru: 'dreli' }, names: { en: 'Drills & drivers', lv: 'Urbjmašīnas', ru: 'Дрели' }, sticker: 'sun' }],
  listings: [{ id: 'cm1abcdefg', title: 'Cordless drill', cover: null }],
};

const PEOPLE = {
  items: [{ id: 'u1', name: 'Dris Ozola', username: 'dris', city: 'Rīga', listingCount: 2, followers: 5, rating: null, reviewCount: 0 }],
};

function renderBox(people: typeof PEOPLE = { items: [] }) {
  const api = fakeApi({
    ...meRoute(null),
    'GET /api/v1/catalog/suggest': { status: 200, body: SUGGEST },
    'GET /api/v1/people': { status: 200, body: people },
  });
  renderWithSession(<SearchBox />, { client: api.client, hasSession: false });
  return api;
}

describe('SearchBox (combobox)', () => {
  it('suggests categories and items after a pause, asked once per text', async () => {
    const user = userEvent.setup();
    const api = renderBox();
    const box = screen.getByRole('combobox', { name: s.label });
    await user.type(box, 'dri');
    expect(await screen.findByRole('option', { name: /Drills & drivers/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Cordless drill/ })).toBeInTheDocument();
    expect(box).toHaveAttribute('aria-expanded', 'true');
    // Typing quickly is one request, not one per letter.
    const suggest = api.calls.filter((call) => call.path === '/api/v1/catalog/suggest');
    expect(suggest).toHaveLength(1);
    expect(suggest[0]!.query).toBe('q=dri&lang=en');
  });

  it('finds people too, under the items, and opens their profile (owner, 2026-11-28)', async () => {
    const user = userEvent.setup();
    renderBox(PEOPLE);
    const box = screen.getByRole('combobox', { name: s.label });
    await user.type(box, 'dri');
    expect(await screen.findByRole('group', { name: s.people })).toBeInTheDocument();
    await user.click(screen.getByRole('option', { name: /Dris Ozola/ }));
    expect(push).toHaveBeenLastCalledWith('/u/u1');
  });

  it('an @name looks only for people', async () => {
    const user = userEvent.setup();
    const api = renderBox(PEOPLE);
    await user.type(screen.getByRole('combobox', { name: s.label }), '@dris');
    expect(await screen.findByRole('option', { name: /Dris Ozola/ })).toBeInTheDocument();
    expect(api.calls.filter((call) => call.path === '/api/v1/catalog/suggest')).toHaveLength(0);
    expect(screen.queryByRole('option', { name: /Cordless drill/ })).not.toBeInTheDocument();
  });

  it('arrows move the active option (aria-activedescendant); Enter opens it', async () => {
    const user = userEvent.setup();
    renderBox();
    const box = screen.getByRole('combobox', { name: s.label });
    await user.type(box, 'dri');
    await screen.findByRole('option', { name: /Drills/ });
    await user.keyboard('{ArrowDown}{ArrowDown}');
    const active = screen.getByRole('option', { name: /Cordless drill/ });
    expect(active).toHaveAttribute('aria-selected', 'true');
    expect(box).toHaveAttribute('aria-activedescendant', active.id);
    await user.keyboard('{Enter}');
    expect(push).toHaveBeenLastCalledWith('/listings/cm1abcdefg-cordless-drill');
  });

  it('Enter with no option chosen searches the text; Esc closes, then clears', async () => {
    const user = userEvent.setup();
    renderBox();
    const box = screen.getByRole('combobox', { name: s.label });
    await user.type(box, 'dri');
    await screen.findByRole('option', { name: /Drills/ });
    await user.keyboard('{Escape}');
    await waitFor(() => expect(box).toHaveAttribute('aria-expanded', 'false'));
    await user.keyboard('{Escape}');
    expect(box).toHaveValue('');
    await user.type(box, 'tent{Enter}');
    expect(push).toHaveBeenLastCalledWith('/search?q=tent');
  });
});
