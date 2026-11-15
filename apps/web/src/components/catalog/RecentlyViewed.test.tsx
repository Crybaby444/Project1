import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import en from '../../../messages/en.json';
import { rememberViewed } from '@/lib/catalog/recently-viewed';
import { catalogItem } from '@/test/catalog';
import { fakeApi, meRoute } from '@/test/fake-api';
import { renderWithSession } from '@/test/render';
import { RecentlyViewed } from './RecentlyViewed';

vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/i18n/navigation')>()),
  usePathname: () => '/c',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}));

afterEach(() => localStorage.clear());

const t = en.catalog.recent;

describe('RecentlyViewed', () => {
  it('shows what this browser looked at, leaves out the current item, and can be cleared', async () => {
    rememberViewed(catalogItem({ id: 'a', title: 'Tent' }));
    rememberViewed(catalogItem({ id: 'b', title: 'Drill' }));
    renderWithSession(<RecentlyViewed except="b" />, { client: fakeApi(meRoute(null)).client, hasSession: false });
    expect(await screen.findByRole('heading', { name: t.title })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Tent/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Drill/ })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: t.clear }));
    await waitFor(() => expect(screen.queryByRole('heading', { name: t.title })).toBeNull());
  });

  it('shows nothing for a first visit', () => {
    renderWithSession(<RecentlyViewed />, { client: fakeApi(meRoute(null)).client, hasSession: false });
    expect(screen.queryByRole('heading', { name: t.title })).toBeNull();
  });
});
