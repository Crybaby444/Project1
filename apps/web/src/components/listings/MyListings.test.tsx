import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { OwnerListingSummary } from '@yoyo/shared';
import { describe, expect, it, vi } from 'vitest';
import en from '../../../messages/en.json';
import { fakeApi, meRoute, testUser, type FakeRoutes } from '@/test/fake-api';
import { renderWithSession } from '@/test/render';
import { MyListings } from './MyListings';

vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/i18n/navigation')>()),
  usePathname: () => '/dashboard/lending',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}));

const m = en.myListings;

function summary(overrides: Partial<OwnerListingSummary> = {}): OwnerListingSummary {
  return {
    id: 'l1',
    status: 'DRAFT',
    title: 'Bosch drill',
    categoryId: null,
    dailyCents: 800,
    cover: { thumb: '/t', card: '/c', full: '/f' },
    photoCount: 1,
    rejectionReason: null,
    submittedAt: null,
    publishedAt: null,
    updatedAt: '2026-11-04T10:00:00.000Z',
    version: 2,
    ...overrides,
  };
}

function renderMine(routes: FakeRoutes, initial: 'ALL' | 'ARCHIVED' = 'ALL') {
  const { client, calls } = fakeApi({ ...meRoute(testUser()), ...routes });
  renderWithSession(<MyListings initialStatus={initial} />, { client });
  return calls;
}

describe('MyListings', () => {
  it('invites a new owner to lend the first item', async () => {
    renderMine({ 'GET /api/v1/me/listings': { status: 200, body: { items: [] } } });
    expect(await screen.findByRole('heading', { name: m.emptyTitle })).toBeVisible();
    expect(screen.getAllByRole('link', { name: m.lend }).at(-1)).toHaveAttribute('href', '/listings/new');
  });

  it('shows each listing with its status, and a rejected one with its reason and a fix link', async () => {
    renderMine({
      'GET /api/v1/me/listings': {
        status: 200,
        body: {
          items: [
            summary(),
            summary({
              id: 'l2',
              title: 'Tent',
              status: 'REJECTED',
              rejectionReason: 'The photo shows a different tent.',
            }),
          ],
        },
      },
    });
    const tent = (await screen.findByRole('heading', { name: 'Tent' })).closest('article')!;
    expect(within(tent).getByText(en.listingStatus.REJECTED)).toBeVisible();
    expect(within(tent).getByText('The photo shows a different tent.')).toBeVisible();
    expect(within(tent).getByRole('link', { name: m.fix })).toHaveAttribute(
      'href',
      '/listings/l2/edit?step=basics',
    );
    const drill = screen.getByRole('heading', { name: 'Bosch drill' }).closest('article')!;
    expect(within(drill).getByText('€8 a day')).toBeVisible();
    expect(within(drill).getByRole('link', { name: m.edit })).toHaveAttribute('href', '/listings/l1/edit');
  });

  it('asks the API for deleted listings only when that filter is chosen', async () => {
    const user = userEvent.setup();
    const calls = renderMine({ 'GET /api/v1/me/listings': { status: 200, body: { items: [] } } });
    await user.click(await screen.findByRole('button', { name: m.filter.ARCHIVED }));
    await waitFor(() => expect(calls.some((c) => c.query === 'status=ARCHIVED')).toBe(true));
    expect(screen.getByRole('button', { name: m.filter.ARCHIVED })).toHaveAttribute('aria-pressed', 'true');
    expect(await screen.findByText(m.emptyFilter)).toBeVisible();
  });

  it('hides a published listing', async () => {
    const user = userEvent.setup();
    const live = summary({ status: 'PUBLISHED', publishedAt: '2026-11-03T10:00:00.000Z' });
    const calls = renderMine({
      'GET /api/v1/me/listings': { status: 200, body: { items: [live] } },
      'POST /api/v1/listings/l1/hide': { status: 200, body: { listing: {} } },
    });
    await user.click(await screen.findByRole('button', { name: en.listingActions.hide }));
    await waitFor(() => expect(calls.some((c) => c.path === '/api/v1/listings/l1/hide')).toBe(true));
    expect(await screen.findByText(en.listingActions.hidden)).toBeVisible();
  });
});
