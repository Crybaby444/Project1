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
    activity: { requests: 0, offers: 0, nextStart: null, earnedCents: 0 },
    ...overrides,
  };
}

function renderMine(routes: FakeRoutes, initial: 'ALL' | 'ARCHIVED' = 'ALL') {
  const { client, calls } = fakeApi({ ...meRoute(testUser()), ...routes });
  renderWithSession(<MyListings initialStatus={initial} />, { client });
  return calls;
}

describe('MyListings', () => {
  it('says what is going on with a published item: requests waiting (a way to them), the next rental, what it earned', async () => {
    renderMine({
      'GET /api/v1/me/listings': {
        status: 200,
        body: { items: [summary({ status: 'PUBLISHED', publishedAt: '2026-11-04T10:00:00.000Z', activity: { requests: 2, offers: 1, nextStart: '2026-11-20', earnedCents: 12_500 } })] },
      },
    });
    const waiting = await screen.findByRole('link', { name: '2 requests waiting' });
    expect(waiting).toHaveAttribute('href', '/bookings?role=owner');
    expect(screen.getByRole('link', { name: '1 price offer' })).toHaveAttribute('href', '/bookings?role=owner');
    expect(screen.getByText('Next rental from 20 Nov')).toBeInTheDocument();
    expect(screen.getByText('Earned €125')).toBeInTheDocument();
  });

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

  it('asks the API for deleted listings only when they are opened at the foot', async () => {
    const user = userEvent.setup();
    const calls = renderMine({ 'GET /api/v1/me/listings': { status: 200, body: { items: [] } } });
    expect(screen.queryByRole('button', { name: m.filter.ARCHIVED })).toBeNull(); // no row of filters
    await user.click(await screen.findByRole('button', { name: m.deleted.show }));
    await waitFor(() => expect(calls.some((c) => c.query === 'status=ARCHIVED')).toBe(true));
    expect(await screen.findByText(m.deleted.none)).toBeVisible();
  });

  it('hides a published listing from its "more" menu (hide and delete stay out of the main row)', async () => {
    const user = userEvent.setup();
    const live = summary({ status: 'PUBLISHED', publishedAt: '2026-11-03T10:00:00.000Z' });
    const calls = renderMine({
      'GET /api/v1/me/listings': { status: 200, body: { items: [live] } },
      'POST /api/v1/listings/l1/hide': { status: 200, body: { listing: {} } },
    });
    expect(screen.queryByRole('button', { name: en.listingActions.hide })).toBeNull();
    await user.click(await screen.findByRole('button', { name: 'More actions for Bosch drill' }));
    await user.click(screen.getByRole('menuitem', { name: en.listingActions.hide }));
    await waitFor(() => expect(calls.some((c) => c.path === '/api/v1/listings/l1/hide')).toBe(true));
    expect(await screen.findByText(en.listingActions.hidden)).toBeVisible();
  });
});
