import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import en from '../../../messages/en.json';
import { availableItem } from '@/test/catalog';
import { apiError, fakeApi, meRoute, testUser, type FakeRoutes } from '@/test/fake-api';
import { renderWithSession } from '@/test/render';
import { BookingPanel } from './BookingPanel';

const push = vi.fn();
vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/i18n/navigation')>()),
  usePathname: () => '/listings/cm1abcdefg-cordless-drill',
  useRouter: () => ({ replace: vi.fn(), push, refresh: vi.fn() }),
}));

const b = en.item.booking;
const day = (name: RegExp) => screen.getByRole('button', { name });

function renderPanel(routes: FakeRoutes, signedIn = true, item = availableItem()) {
  const api = fakeApi({ ...meRoute(signedIn ? testUser({ id: 'renter-1' }) : null), ...routes });
  renderWithSession(<BookingPanel item={item} />, { client: api.client, hasSession: signedIn });
  return api;
}

describe('BookingPanel', () => {
  it('asks for dates first, then shows the breakdown the domain computes', async () => {
    const user = userEvent.setup();
    renderPanel({});
    expect(await screen.findByText(b.pickDates)).toBeInTheDocument();
    await user.click(day(/^Wednesday, December 2, 2026/));
    await user.click(day(/^Tuesday, December 8, 2026/));
    const list = screen.getByText(en.item.price.total).closest('dl')!;
    expect(list).toHaveTextContent('€15.00 × 7 days');
    expect(list).toHaveTextContent('−€10.50');
    expect(list).toHaveTextContent('€94.50');
    expect(list).toHaveTextContent('€9.45');
    expect(list).toHaveTextContent('€153.95');
  });

  it('says why a period is too short', async () => {
    const user = userEvent.setup();
    renderPanel({}, true, availableItem({ minDays: 3 }));
    await user.click(await screen.findByRole('button', { name: /^Wednesday, December 2, 2026/ }));
    await user.click(day(/^Thursday, December 3, 2026/));
    expect(screen.getByRole('alert')).toHaveTextContent('The owner rents it for at least 3 days.');
    expect(screen.getByRole('button', { name: b.request })).toBeDisabled();
  });

  it('sends a visitor to sign in and back to the item', async () => {
    const user = userEvent.setup();
    renderPanel({}, false);
    await user.click(await screen.findByRole('button', { name: b.signInToRequest }));
    expect(push).toHaveBeenCalledWith(`/login?next=${encodeURIComponent('/listings/cm1abcdefg-cordless-drill')}`);
  });

  it('requests the booking with the note, and says it was sent', async () => {
    const user = userEvent.setup();
    const api = renderPanel({ 'POST /api/v1/bookings': { status: 201, body: { booking: {} } } });
    await user.click(await screen.findByRole('button', { name: /^Wednesday, December 2, 2026/ }));
    await user.click(day(/^Friday, December 4, 2026/));
    await user.type(screen.getByLabelText(b.message), 'Morning pickup');
    await user.click(screen.getByRole('button', { name: b.request }));
    expect(await screen.findByText(b.sentTitle)).toBeInTheDocument();
    expect(api.calls.find((call) => call.method === 'POST')?.body).toEqual({
      listingId: 'cm1abcdefg',
      start: '2026-12-02',
      end: '2026-12-04',
      message: 'Morning pickup',
    });
  });

  it('shows taken days from the API next to the calendar', async () => {
    const user = userEvent.setup();
    renderPanel({ 'POST /api/v1/bookings': apiError(409, 'DATES_UNAVAILABLE') });
    await user.click(await screen.findByRole('button', { name: /^Wednesday, December 2, 2026/ }));
    await user.click(day(/^Friday, December 4, 2026/));
    await user.click(screen.getByRole('button', { name: b.request }));
    expect(await screen.findByRole('alert')).toHaveTextContent(en.errors.DATES_UNAVAILABLE);
  });

  it('crosses out taken days and lets nobody pick them', async () => {
    renderPanel({});
    const taken = await screen.findByRole('button', { name: /^Thursday, December 10, 2026, taken/ });
    expect(taken).toHaveAttribute('aria-disabled', 'true');
  });

  it('shows the owner their own item without the booking button', async () => {
    const api = fakeApi(meRoute(testUser({ id: 'owner-1' })));
    renderWithSession(<BookingPanel item={availableItem()} />, { client: api.client });
    expect(await screen.findByText(b.own)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: b.request })).toBeNull();
  });
});
