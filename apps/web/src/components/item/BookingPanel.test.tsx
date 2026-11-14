import { screen } from '@testing-library/react';
import type { BookingTerms } from '@yoyo/shared';
import { describe, expect, it, vi } from 'vitest';
import deals from '../../../messages/deals/en.json';
import { availableItem } from '@/test/catalog';
import { fakeApi, meRoute, testUser } from '@/test/fake-api';
import { renderWithSession } from '@/test/render';
import { BookingPanel } from './BookingPanel';

vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/i18n/navigation')>()),
  usePathname: () => '/listings/cm1abcdefg-cordless-drill',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}));

const TERMS: BookingTerms = {
  listing: { id: 'cm1abcdefg', title: 'Cordless drill', coverUrl: null, city: 'Rīga', district: 'Centrs', ownerId: 'owner-1', ownerName: 'Jānis' },
  pricing: { dailyCents: 1500, weeklyDiscountPercent: 10, depositCents: 5000, minDays: 1, maxDays: 30 },
  servicePercent: 10,
  servicePromoUntil: null,
  regularServicePercent: 10,
  maxAdvanceDays: 180,
  timeZone: 'Europe/Riga',
  today: '2026-12-01',
  blocked: [],
};

function renderPanel(userId: string | null) {
  const api = fakeApi({
    ...meRoute(userId ? testUser({ id: userId }) : null),
    'GET /api/v1/listings/cm1abcdefg/booking-terms': { status: 200, body: TERMS },
  });
  renderWithSession(<BookingPanel item={availableItem()} />, { client: api.client, hasSession: userId !== null });
  return api;
}

describe('item BookingPanel', () => {
  it('starts with the phone bar hidden, as the server renders it, until the observer says the panel is away', () => {
    // An observer that never reports: the first client render must match the server's (bar hidden).
    vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} unobserve() {} });
    renderPanel(null);
    const bar = screen.getByText(/from/i, { selector: 'p.tabular-nums' }).parentElement!;
    expect(bar).toHaveAttribute('aria-hidden', 'true');
    vi.unstubAllGlobals();
  });

  it('shows the price, discount, deposit and days, then the deal screens’ booking panel in one column', async () => {
    const api = renderPanel(null);
    expect(screen.getAllByText('€15 / day')[0]).toBeInTheDocument();
    expect(screen.getByText('−10% from 7 days')).toBeInTheDocument();
    expect(screen.getByText('Deposit €50')).toBeInTheDocument();
    expect(screen.getByText('1–30 days')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: deals.booking.dates })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: deals.booking.signIn })).toHaveAttribute(
      'href',
      `/login?next=${encodeURIComponent('/listings/cm1abcdefg-cordless-drill')}`,
    );
    // Stacked: the side column is too narrow for the calendar and the price next to each other.
    expect(document.querySelector('[data-booking-panel]')!.className).not.toMatch(/grid-cols/);
    expect(api.calls.some((call) => call.path === '/api/v1/listings/cm1abcdefg/booking-terms')).toBe(true);
  });

  it('tells the owner it is their own item, with nothing to send', async () => {
    renderPanel('owner-1');
    expect(await screen.findByText(deals.booking.own)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: deals.booking.send })).toBeNull();
  });
});
