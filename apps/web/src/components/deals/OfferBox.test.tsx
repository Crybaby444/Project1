import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { BookingTerms, OfferView } from '@yoyo/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { offerForItem } from '@/lib/deals/offers';
import { testBooking } from '@/test/deals';
import { fakeApi, meRoute, testUser, type FakeRoutes } from '@/test/fake-api';
import { renderWithSession } from '@/test/render';
import { BookingPanel } from './BookingPanel';
import { checkOffer, suggestedOffer, takesOffers } from './OfferBox';
import { OffersBlock } from './Offers';

const push = vi.fn();
vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/i18n/navigation')>()),
  usePathname: () => '/listings/listing-1',
  useRouter: () => ({ replace: vi.fn(), push, refresh: vi.fn() }),
}));

/** 15 € a day, 10 % off from 7 days, 50 € deposit, 1–14 days, no fee-free month. */
function terms(overrides: Partial<BookingTerms> = {}): BookingTerms {
  return {
    listing: { id: 'listing-1', title: 'PlayStation 5', coverUrl: null, city: 'Rīga', district: 'Centrs', ownerId: 'owner-1', ownerName: 'Andris' },
    pricing: { dailyCents: 1500, weeklyDiscountPercent: 10, depositCents: 5000, minDays: 1, maxDays: 14 },
    servicePercent: 10,
    servicePromoUntil: null,
    regularServicePercent: 10,
    welcomeFeeDays: 0,
    maxAdvanceDays: 365,
    timeZone: 'Europe/Riga',
    today: '2026-11-06',
    blocked: [],
    ...overrides,
  };
}

function testOffer(overrides: Partial<OfferView> = {}): OfferView {
  return {
    id: 'offer-1',
    listing: { id: 'listing-1', title: 'PlayStation 5', coverUrl: null },
    renter: { id: 'user-1', name: 'Anna B.' },
    owner: { id: 'owner-1', name: 'Andris' },
    start: '2026-11-08',
    end: '2026-11-10',
    dailyCents: 1200,
    listedDailyCents: 1500,
    status: 'PENDING',
    expiresAt: '2099-01-01T00:00:00.000Z',
    answeredAt: null,
    createdAt: '2026-11-06T10:00:00.000Z',
    ...overrides,
  };
}

function setup(routes: FakeRoutes = {}) {
  const api = fakeApi({
    ...meRoute(testUser()),
    'GET /api/v1/listings/listing-1/booking-terms': { status: 200, body: terms() },
    'GET /api/v1/me/offers': { status: 200, body: { items: [] } },
    ...routes,
  });
  renderWithSession(<BookingPanel listingId="listing-1" />, { client: api.client });
  return api;
}

const day = (n: number) => screen.getByRole('button', { name: new RegExp(`^\\w+day,? ${n} November`) });
const rangeStatus = () => document.querySelector('[data-range-status]');

beforeEach(() => push.mockReset());

describe('checkOffer', () => {
  const threeDays = { start: '2026-11-08', end: '2026-11-10' };

  it('takes half the listed price up to a cent below it, and says what it saves', () => {
    const offer = checkOffer(terms(), threeDays, null, '12');
    expect(offer).toMatchObject({ cents: 1200, problem: null, quote: { priceSource: 'AGREED', rentCents: 3600, totalCents: 8960 } });
    // 45 € + 4.50 € fee at the listed price against 36 € + 3.60 €.
    expect(offer.savingCents).toBe(990);
    expect(checkOffer(terms(), threeDays, null, '7,50').problem).toBeNull();
  });

  it('names what is wrong with the figure', () => {
    expect(checkOffer(terms(), threeDays, null, '').problem).toBe('empty');
    expect(checkOffer(terms(), threeDays, null, '12 euro').problem).toBe('format');
    expect(checkOffer(terms(), threeDays, null, '7.49').problem).toBe('low');
    expect(checkOffer(terms(), threeDays, null, '15').problem).toBe('high');
  });

  it('refuses an offer the weekly discount already beats', () => {
    const week = { start: '2026-11-08', end: '2026-11-14' };
    // 7 × 15 € less 10 % = 94.50 €: 13.50 € a day.
    expect(checkOffer(terms(), week, null, '14')).toMatchObject({ problem: 'notCheaper', listedPerDayCents: 1350 });
    expect(checkOffer(terms(), week, null, '13').problem).toBeNull();
  });

  it('starts from about a tenth off in whole euros, and leaves out items at the lowest price', () => {
    expect(suggestedOffer(1500)).toBe(1300);
    expect(suggestedOffer(150)).toBe(100);
    expect(takesOffers(1500)).toBe(true);
    expect(takesOffers(100)).toBe(false);
  });
});

describe('offerForItem', () => {
  const now = Date.parse('2026-11-06T12:00:00.000Z');
  it('speaks with the open offer first, then a recent answer, never a withdrawn or used one', () => {
    const declined = testOffer({ id: 'declined', status: 'DECLINED' });
    const accepted = testOffer({ id: 'accepted', status: 'ACCEPTED' });
    expect(offerForItem([declined, accepted], 'listing-1', '2026-11-06', now)?.id).toBe('accepted');
    expect(offerForItem([declined], 'listing-1', '2026-11-06', now)?.id).toBe('declined');
    expect(offerForItem([declined], 'listing-1', '2026-11-09', now)).toBeNull();
    expect(offerForItem([testOffer({ status: 'WITHDRAWN' })], 'listing-1', '2026-11-06', now)).toBeNull();
    expect(offerForItem([testOffer({ expiresAt: '2026-11-06T11:00:00.000Z' })], 'listing-1', '2026-11-06', now)).toBeNull();
    expect(offerForItem([accepted], 'listing-2', '2026-11-06', now)).toBeNull();
  });
});

describe('offering a price in the booking panel', () => {
  it('writes an offer for the picked days, shows the price at it, and waits for the owner', async () => {
    const user = userEvent.setup();
    let mine: OfferView[] = [];
    const { calls } = setup({
      'GET /api/v1/me/offers': () => ({ status: 200, body: { items: mine } }),
      'POST /api/v1/listings/listing-1/offers': (body) => {
        mine = [testOffer({ dailyCents: (body as { dailyCents: number }).dailyCents })];
        return { status: 201, body: { offer: mine[0] } };
      },
    });
    await screen.findByRole('grid');
    expect(screen.queryByRole('button', { name: 'Offer your price' })).toBeNull();
    await user.click(day(8));
    await user.click(day(10));
    await user.click(screen.getByRole('button', { name: 'Offer your price' }));

    const field = screen.getByLabelText('Your price a day');
    expect(field).toHaveValue('13');
    expect(field).toHaveFocus();
    expect(within(screen.getByRole('region', { name: 'If the owner agrees' })).getByText('Your price €13.00 × 3 days')).toBeVisible();
    await user.clear(field);
    await user.type(field, '7');
    expect(screen.getByText('At least €7.50: half the listed price.')).toBeVisible();
    await user.clear(field);
    await user.type(field, '12');
    expect(screen.getByText('That is €9.90 less for 3 days')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Send the offer' }));

    expect(await screen.findByText(/^You offered €12\.00 a day for 8 ?– ?10 Nov 2026$/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Send request' })).toBeVisible();
    const post = calls.find((call) => call.method === 'POST')!;
    expect(post.path).toBe('/api/v1/listings/listing-1/offers');
    expect(post.body).toEqual({ start: '2026-11-08', end: '2026-11-10', dailyCents: 1200 });
    expect(post.headers.get('Idempotency-Key')).toMatch(/^yoyo-/);
  });

  it('goes back to the listed price without sending anything', async () => {
    const user = userEvent.setup();
    const { calls } = setup();
    await screen.findByRole('grid');
    await user.click(day(8));
    await user.click(day(10));
    await user.click(screen.getByRole('button', { name: 'Offer your price' }));
    await user.click(screen.getByRole('button', { name: 'Book at the listed price' }));
    expect(screen.getByRole('button', { name: 'Send request' })).toBeVisible();
    expect(within(screen.getByRole('region', { name: 'Price' })).getByText('€99.50')).toBeVisible();
    expect(calls.filter((call) => call.method === 'POST')).toHaveLength(0);
  });

  it('picks the days of an accepted offer and books them at its price', async () => {
    const user = userEvent.setup();
    const { calls } = setup({
      'GET /api/v1/me/offers': { status: 200, body: { items: [testOffer({ status: 'ACCEPTED' })] } },
      'POST /api/v1/bookings': { status: 201, body: { booking: testBooking({ id: 'booking-9' }) } },
    });
    expect(await screen.findByText('Your price is accepted: €12.00 a day')).toBeVisible();
    expect(rangeStatus()).toHaveTextContent('3 days');
    expect(within(screen.getByRole('region', { name: 'Price' })).getByText('Your price €12.00 × 3 days')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Offer your price' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Send the request at your price' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/bookings/booking-9'));
    expect(calls.find((call) => call.method === 'POST')!.body).toEqual({
      listingId: 'listing-1',
      start: '2026-11-08',
      end: '2026-11-10',
      offerId: 'offer-1',
    });
  });

  it('says the agreed price is for its own days when others are picked, and gives them back', async () => {
    const user = userEvent.setup();
    setup({ 'GET /api/v1/me/offers': { status: 200, body: { items: [testOffer({ status: 'ACCEPTED' })] } } });
    await screen.findByText('Your price is accepted: €12.00 a day');
    await user.click(day(12));
    await user.click(day(13));
    expect(screen.getByText(/^This price is for 8 ?– ?10 Nov 2026 only$/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Send request' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Pick these days' }));
    expect(screen.getByRole('button', { name: 'Send the request at your price' })).toBeVisible();
  });

  it('tells the renter the owner said no, and lets them offer again', async () => {
    const user = userEvent.setup();
    setup({ 'GET /api/v1/me/offers': { status: 200, body: { items: [testOffer({ status: 'DECLINED' })] } } });
    await screen.findByRole('grid');
    await user.click(day(8));
    await user.click(day(10));
    expect(await screen.findByText(/The owner did not take €12.00 a day/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Offer your price' })).toBeVisible();
  });
});

describe('OffersBlock', () => {
  it("lists the owner's open offers and accepts one with a click", async () => {
    const user = userEvent.setup();
    let mine = [testOffer()];
    const api = fakeApi({
      ...meRoute(testUser({ id: 'owner-1' })),
      'GET /api/v1/me/offers': () => ({ status: 200, body: { items: mine } }),
      'POST /api/v1/offers/offer-1/accept': () => {
        mine = [testOffer({ status: 'ACCEPTED' })];
        return { status: 200, body: { offer: mine[0] } };
      },
    });
    renderWithSession(<OffersBlock role="owner" />, { client: api.client });
    const card = await screen.findByRole('listitem');
    expect(within(card).getByText('€12.00 a day')).toBeVisible();
    expect(within(card).getByText('instead of €15.00')).toBeVisible();
    expect(within(card).getByText('you get €36.00 for 3 days')).toBeVisible();
    await user.click(within(card).getByRole('button', { name: 'Accept' }));
    expect(await screen.findByText('Offer accepted. Anna B. can book at this price.')).toBeInTheDocument();
    expect(await screen.findByText('You agreed. Anna B. can book by the end of 8 Nov 2026')).toBeVisible();
    expect(api.calls.some((call) => call.method === 'POST' && call.path === '/api/v1/offers/offer-1/accept')).toBe(true);
  });

  it('shows nothing while there are no open offers', async () => {
    const api = fakeApi({
      ...meRoute(testUser()),
      'GET /api/v1/me/offers': { status: 200, body: { items: [testOffer({ status: 'DECLINED' })] } },
    });
    const { container } = renderWithSession(<OffersBlock role="renter" />, { client: api.client });
    await waitFor(() => expect(api.calls.some((call) => call.path === '/api/v1/me/offers')).toBe(true));
    expect(container.querySelector('[data-offers]')).toBeNull();
  });
});
