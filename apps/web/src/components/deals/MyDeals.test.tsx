import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { testBooking } from '@/test/deals';
import { apiError, fakeApi, meRoute, testUser, type FakeRoutes } from '@/test/fake-api';
import { installIntersectionObserver } from '@/test/intersection-observer';
import { renderWithSession } from '@/test/render';
import { MyDeals } from './MyDeals';

vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/i18n/navigation')>()),
  usePathname: () => '/bookings',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}));

installIntersectionObserver();

const waiting = testBooking({ id: 'b-wait', actions: ['WITHDRAW'] });
const going = testBooking({ id: 'b-go', status: 'PAID', paymentMethod: 'CARD', actions: [], listing: { ...testBooking().listing, title: 'Drill' } });

function setup(routes: FakeRoutes = {}) {
  const api = fakeApi({
    ...meRoute(testUser()),
    'GET /api/v1/me/bookings/summary': { status: 200, body: { renter: { open: 2, needsAction: 1 }, owner: { open: 0, needsAction: 0 } } },
    'GET /api/v1/me/bookings': { status: 200, body: { items: [waiting, going], total: 2 } },
    ...routes,
  });
  renderWithSession(<MyDeals initialRole="renter" initialGroup="open" />, { client: api.client });
  return api;
}

describe('MyDeals', () => {
  it('lists deals with their status, whose turn it is, and links to each', async () => {
    setup();
    const link = await screen.findByRole('link', { name: /PlayStation 5/ });
    expect(link).toHaveAttribute('href', '/bookings/b-wait');
    expect(within(link).getByText('Requested')).toBeVisible();
    expect(within(link).getByText('Your turn')).toBeVisible();
    const other = screen.getByRole('link', { name: /Drill/ });
    expect(within(other).getByText('Deposit frozen')).toBeVisible();
    expect(within(other).queryByText('Your turn')).toBeNull();
  });

  it('counts the waiting deals on the tab and switches roles with the arrow keys', async () => {
    const user = userEvent.setup();
    const { calls } = setup();
    const renter = screen.getByRole('tab', { name: 'I rent' });
    await waitFor(() => expect(renter).toHaveAccessibleDescription('1 waits for you'));
    expect(renter).toHaveAttribute('aria-selected', 'true');
    renter.focus();
    await user.keyboard('{ArrowRight}');
    const owner = screen.getByRole('tab', { name: 'I lend' });
    expect(owner).toHaveAttribute('aria-selected', 'true');
    expect(owner).toHaveFocus();
    await waitFor(() => expect(calls.some((c) => c.path === '/api/v1/me/bookings' && c.query.includes('role=owner'))).toBe(true));
  });

  it('shows only the deals waiting for me in that group', async () => {
    const user = userEvent.setup();
    setup();
    await screen.findByRole('link', { name: /Drill/ });
    await user.click(screen.getByRole('button', { name: 'Waiting for me' }));
    await waitFor(() => expect(screen.queryByRole('link', { name: /Drill/ })).toBeNull());
    expect(screen.getByRole('link', { name: /PlayStation 5/ })).toBeVisible();
  });

  it('asks for closed deals from the API', async () => {
    const user = userEvent.setup();
    const { calls } = setup();
    await screen.findByRole('link', { name: /Drill/ });
    await user.click(screen.getByRole('button', { name: 'Closed' }));
    await waitFor(() => expect(calls.some((c) => c.query.includes('group=closed'))).toBe(true));
  });

  it('has a friendly empty state', async () => {
    setup({ 'GET /api/v1/me/bookings': { status: 200, body: { items: [], total: 0 } } });
    expect(await screen.findByRole('heading', { name: 'You have not rented anything yet' })).toBeVisible();
  });

  it('offers to try again when the list fails', async () => {
    setup({ 'GET /api/v1/me/bookings': apiError(500, 'INTERNAL') });
    expect(await screen.findByRole('button', { name: 'Try again' })).toBeVisible();
  });
});
