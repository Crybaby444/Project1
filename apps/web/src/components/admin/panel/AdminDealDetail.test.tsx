import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import admin from '../../../../messages/admin/en.json';
import { testBooking } from '@/test/deals';
import { fakeApi, meRoute, testUser } from '@/test/fake-api';
import { renderWithSession } from '@/test/render';
import { AdminDealDetail } from './AdminDealDetail';

vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/i18n/navigation')>()),
  usePathname: () => '/admin/deals/b1',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}));

const t = admin.admin.deals;

const disputed = testBooking({
  id: 'b1',
  status: 'DISPUTED',
  viewerRole: 'ADMIN',
  version: 7,
  dispute: {
    reason: 'DAMAGE',
    openedAt: '2026-11-13T10:00:00.000Z',
    note: 'The lens is cracked',
    resolution: null,
  },
});

function detail(booking = disputed) {
  return {
    booking,
    events: [
      {
        id: 'e1',
        type: 'OPEN_DISPUTE',
        actorKind: 'OWNER',
        actorId: 'u1',
        fromStatus: 'RETURNED',
        toStatus: 'DISPUTED',
        data: {},
        messages: [],
        createdAt: '2026-11-13T10:00:00.000Z',
      },
    ],
    operations: [
      {
        id: 'o1',
        kind: 'BOOKING_PAYMENT',
        bookingId: 'b1',
        userId: 'u2',
        createdAt: '2026-11-10T10:00:00.000Z',
        postings: [
          { account: 'wallet:u2', amount: -5000 },
          { account: 'escrow:b1', amount: 5000 },
        ],
      },
    ],
    photos: [],
    payments: [],
  };
}

describe('AdminDealDetail', () => {
  it('shows the dispute and decides it with the deal version, after a confirmation', async () => {
    const api = fakeApi({
      ...meRoute(testUser({ role: 'ADMIN' })),
      'GET /api/v1/admin/bookings/b1': { status: 200, body: detail() },
      'POST /api/v1/admin/bookings/b1/resolve': {
        status: 200,
        body: { booking: { ...disputed, status: 'COMPLETED' } },
      },
      'GET /api/v1/admin/overview': { status: 404 },
    });
    renderWithSession(<AdminDealDetail id="b1" />, { client: api.client });
    expect(await screen.findByText('The lens is cracked')).toBeInTheDocument();
    expect(screen.getByText(t.disputeReason.DAMAGE)).toBeInTheDocument();
    expect(screen.getByText('escrow:b1')).toBeInTheDocument();

    const form = screen.getByRole('form', { name: t.resolve.title });
    await userEvent.click(within(form).getByRole('radio', { name: t.decision.DEPOSIT_TO_OWNER }));
    await userEvent.type(
      within(form).getByRole('textbox', { name: t.resolve.comment }),
      'Photos show the crack.',
    );
    await userEvent.click(within(form).getByRole('button', { name: t.resolve.submit }));
    expect(screen.getByText(t.resolve.confirm)).toBeInTheDocument();
    expect(api.calls.some((c) => c.path.endsWith('/resolve'))).toBe(false);
    await userEvent.click(screen.getByRole('button', { name: t.resolve.submit }));

    await waitFor(() => {
      const call = api.calls.find((c) => c.path.endsWith('/resolve'));
      expect(call?.body).toEqual({
        version: 7,
        decision: 'DEPOSIT_TO_OWNER',
        comment: 'Photos show the crack.',
      });
      expect(call?.headers.get('Idempotency-Key')).toBeTruthy();
    });
  });

  it('offers no decision for a deal that is not in dispute', async () => {
    const api = fakeApi({
      ...meRoute(testUser({ role: 'ADMIN' })),
      'GET /api/v1/admin/bookings/b1': {
        status: 200,
        body: detail(testBooking({ id: 'b1', status: 'ACTIVE', viewerRole: 'ADMIN' })),
      },
    });
    renderWithSession(<AdminDealDetail id="b1" />, { client: api.client });
    expect(await screen.findByRole('link', { name: t.publicPage })).toHaveAttribute('href', '/bookings/b1');
    expect(screen.queryByRole('form', { name: t.resolve.title })).toBeNull();
  });
});
