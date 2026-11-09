import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { BookingTerms } from '@yoyo/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiError, fakeApi, meRoute, testUser, type FakeRoutes } from '@/test/fake-api';
import { testBooking } from '@/test/deals';
import { renderWithSession } from '@/test/render';
import { BookingPanel, priceRange } from './BookingPanel';
import { nextRange } from './DateRangePicker';

const push = vi.fn();
vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/i18n/navigation')>()),
  usePathname: () => '/items/listing-1/book',
  useRouter: () => ({ replace: vi.fn(), push, refresh: vi.fn() }),
}));

/** 15 € a day, 10 % off from 7 days, 50 € deposit, 1–14 days; 20 Nov is taken. */
function terms(overrides: Partial<BookingTerms> = {}): BookingTerms {
  return {
    listing: { id: 'listing-1', title: 'PlayStation 5', coverUrl: null, city: 'Rīga', district: 'Centrs', ownerId: 'owner-1', ownerName: 'Andris' },
    pricing: { dailyCents: 1500, weeklyDiscountPercent: 10, depositCents: 5000, minDays: 1, maxDays: 14 },
    servicePercent: 10,
    servicePromoUntil: null,
    regularServicePercent: 10,
    maxAdvanceDays: 365,
    timeZone: 'Europe/Riga',
    today: '2026-11-06',
    blocked: [{ start: '2026-11-20', end: '2026-11-20' }],
    ...overrides,
  };
}

function setup(routes: FakeRoutes = {}, t = terms()) {
  const api = fakeApi({
    ...meRoute(testUser()),
    'GET /api/v1/listings/listing-1/booking-terms': { status: 200, body: t },
    ...routes,
  });
  renderWithSession(<BookingPanel listingId="listing-1" />, { client: api.client });
  return api;
}

const day = (n: number) => screen.getByRole('button', { name: new RegExp(`^\\w+day,? ${n} November`) });

const rangeStatus = () => document.querySelector('[data-range-status]');

beforeEach(() => push.mockReset());

describe('priceRange', () => {
  it('prices 8 days with the domain rules, like the API', () => {
    expect(priceRange(terms(), { start: '2026-11-08', end: '2026-11-15' }).quote).toMatchObject({
      days: 8,
      rentCents: 10_800,
      serviceFeeCents: 1_080,
      totalCents: 16_880,
    });
  });

  it('refuses a range across a taken day and outside the length limits', () => {
    expect(priceRange(terms(), { start: '2026-11-19', end: '2026-11-21' }).problem).toBe('crossesTaken');
    expect(priceRange(terms(), { start: '2026-11-01', end: '2026-11-15' }).problem).toBe('tooLong');
    expect(priceRange(terms({ pricing: { ...terms().pricing, minDays: 3 } }), { start: '2026-11-08', end: '2026-11-08' }).problem).toBe('tooShort');
  });

  it('applies the launch offer the terms give', () => {
    const q = priceRange(terms({ servicePercent: 0, servicePromoUntil: '2027-02-05' }), { start: '2026-11-08', end: '2026-11-10' }).quote;
    expect(q).toMatchObject({ servicePercent: 0, serviceFeeCents: 0, servicePromoUntil: '2027-02-05', totalCents: 9_500 });
  });

  it('starts a new range on a click before the start or after a finished range', () => {
    expect(nextRange(null, '2026-11-08')).toEqual({ start: '2026-11-08', end: null });
    expect(nextRange({ start: '2026-11-08', end: null }, '2026-11-10')).toEqual({ start: '2026-11-08', end: '2026-11-10' });
    expect(nextRange({ start: '2026-11-08', end: null }, '2026-11-07')).toEqual({ start: '2026-11-07', end: null });
    expect(nextRange({ start: '2026-11-08', end: '2026-11-10' }, '2026-11-12')).toEqual({ start: '2026-11-12', end: null });
  });
});

describe('BookingPanel', () => {
  it('prices the picked days and sends one request with an Idempotency-Key', async () => {
    const user = userEvent.setup();
    const { calls } = setup({ 'POST /api/v1/bookings': { status: 201, body: { booking: testBooking({ id: 'booking-9' }) } } });
    await screen.findByRole('grid');
    await user.click(day(8));
    expect(rangeStatus()).toHaveTextContent('Now pick the last day');
    await user.click(day(10));
    expect(rangeStatus()).toHaveTextContent('3 days');
    const summary = screen.getByRole('region', { name: 'Price' });
    expect(within(summary).getByText('€4.50')).toBeVisible();
    expect(within(summary).getByText('€99.50')).toBeVisible();

    await user.type(screen.getByLabelText('Message to the owner (optional)'), 'Saturday morning?');
    const send = screen.getByRole('button', { name: 'Send request' });
    await user.dblClick(send);
    await waitFor(() => expect(push).toHaveBeenCalledWith('/bookings/booking-9'));
    const posts = calls.filter((c) => c.method === 'POST');
    expect(posts).toHaveLength(1);
    expect(posts[0]!.headers.get('Idempotency-Key')).toMatch(/^yoyo-/);
    expect(posts[0]!.body).toEqual({ listingId: 'listing-1', start: '2026-11-08', end: '2026-11-10', message: 'Saturday morning?' });
  });

  it('crosses out taken days and does not let them be picked', async () => {
    const user = userEvent.setup();
    setup();
    await screen.findByRole('grid');
    const taken = day(20);
    expect(taken).toHaveAccessibleName(/taken/);
    expect(taken).toHaveAttribute('aria-disabled', 'true');
    await user.click(day(19));
    await user.click(day(21));
    expect(screen.getByRole('alert')).toHaveTextContent('Some days in between are taken');
    expect(screen.getByRole('button', { name: 'Send request' })).toBeDisabled();
  });

  it('shows the launch-offer badge on the fee', async () => {
    const user = userEvent.setup();
    setup({}, terms({ servicePercent: 0, servicePromoUntil: '2027-02-05' }));
    await screen.findByRole('grid');
    await user.click(day(8));
    await user.click(day(9));
    expect(screen.getByText('0% fee until 5 Feb 2027')).toBeInTheDocument();
    expect(screen.getByText(/Launch offer: the service fee is 0% for requests sent until 5 Feb 2027/)).toBeInTheDocument();
  });

  it('says when the days were taken meanwhile, and starts over', async () => {
    const user = userEvent.setup();
    setup({ 'POST /api/v1/bookings': apiError(409, 'DATES_UNAVAILABLE') });
    await screen.findByRole('grid');
    await user.click(day(8));
    await user.click(day(9));
    await user.click(screen.getByRole('button', { name: 'Send request' }));
    expect(await screen.findByText('Some of these days are already taken. Pick other dates.')).toBeVisible();
    expect(rangeStatus()).toHaveTextContent('Pick the first day');
    expect(push).not.toHaveBeenCalled();
  });

  it('tells the owner it is their own item, and a visitor to sign in', async () => {
    const api = fakeApi({
      ...meRoute(testUser({ id: 'owner-1' })),
      'GET /api/v1/listings/listing-1/booking-terms': { status: 200, body: terms() },
    });
    renderWithSession(<BookingPanel listingId="listing-1" />, { client: api.client });
    expect(await screen.findByText('This is your item. Others book it from this page.')).toBeVisible();
  });

  it('says the item cannot be booked', async () => {
    setup({ 'GET /api/v1/listings/listing-1/booking-terms': apiError(409, 'LISTING_UNAVAILABLE') });
    expect(await screen.findByRole('alert')).toHaveTextContent('This item cannot be booked right now.');
  });
});
