import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import deals from '../../../messages/deals/en.json';
import { testBooking } from '@/test/deals';
import { fakeApi, meRoute, testUser } from '@/test/fake-api';
import { renderWithSession } from '@/test/render';
import { DealClosing } from './DealClosing';

const t = deals.deal.closing;

describe('DealClosing', () => {
  it('tells the renter the deposit came back and leads to the review', async () => {
    const booking = testBooking({ status: 'COMPLETED', viewerRole: 'RENTER', outcome: 'DEPOSIT_REFUNDED' });
    const api = fakeApi({
      ...meRoute(testUser()),
      [`GET /api/v1/bookings/${booking.id}/reviews`]: { status: 200, body: { viewerRole: 'RENTER', canReview: true, mine: null, theirs: null, deadline: null } },
    });
    renderWithSession(<DealClosing booking={booking} />, { client: api.client });
    expect(screen.getByRole('heading', { name: t.title })).toBeVisible();
    expect(screen.getByText(/is back in your Yoyo wallet/)).toBeVisible();
    expect(await screen.findByRole('link', { name: t.review })).toHaveAttribute('href', '#deal-reviews');
  });

  it('tells the owner the rent is in the wallet', () => {
    const booking = testBooking({ status: 'COMPLETED', viewerRole: 'OWNER', outcome: 'DEPOSIT_REFUNDED' });
    const api = fakeApi({ ...meRoute(testUser()) });
    renderWithSession(<DealClosing booking={booking} />, { client: api.client });
    expect(screen.getByText(/is in your Yoyo wallet/)).toBeVisible();
    expect(screen.getByRole('link', { name: t.moreOwner })).toBeVisible();
  });
});
