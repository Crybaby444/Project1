import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import en from '../../../messages/en.json';
import { fakeApi, meRoute } from '@/test/fake-api';
import { renderWithSession } from '@/test/render';
import { HomeSearch } from './HomeSearch';

const push = vi.fn();
vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/i18n/navigation')>()),
  useRouter: () => ({ replace: vi.fn(), push, refresh: vi.fn() }),
}));

const SUGGEST = {
  categories: [],
  listings: [{ id: 'cm1abcdefg', title: 'PlayStation 5 with two controllers', cover: null }],
};

function renderSearch() {
  const api = fakeApi({ ...meRoute(null), 'GET /api/v1/catalog/suggest': { status: 200, body: SUGGEST } });
  renderWithSession(<HomeSearch country="LV" today="2026-11-19" />, { client: api.client, hasSession: false });
  return api;
}

describe('HomeSearch: the What field suggests like the header (owner, 2026-11-19)', () => {
  beforeEach(() => push.mockReset());

  it('shows items as you type; arrow and Enter open one', async () => {
    const user = userEvent.setup();
    renderSearch();
    const what = screen.getByRole('combobox', { name: en.market.search.what });
    await user.type(what, 'playstation ');
    expect(await screen.findByRole('option', { name: /PlayStation 5/ })).toBeVisible();
    await user.keyboard('{ArrowDown}{Enter}');
    await waitFor(() => expect(push).toHaveBeenCalledWith(expect.stringMatching(/^\/listings\/cm1abcdefg-/)));
  });

  it('Enter without picking still searches what was typed', async () => {
    const user = userEvent.setup();
    renderSearch();
    await user.type(screen.getByRole('combobox', { name: en.market.search.what }), 'tent{Enter}');
    await waitFor(() => expect(push).toHaveBeenCalledWith('/search?q=tent'));
  });
});
