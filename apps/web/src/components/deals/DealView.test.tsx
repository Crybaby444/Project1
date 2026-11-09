import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BOOKING_ACTIONS, type BookingView } from '@yoyo/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@/test/dialog';
import { historyItem, testBooking } from '@/test/deals';
import { apiError, fakeApi, meRoute, testUser, type FakeRoutes } from '@/test/fake-api';
import { renderWithSession } from '@/test/render';
import { eventFor } from './DealActions';
import { depositState } from './DealSummary';
import { DealView } from './DealView';
import { downloadContract } from './ContractCard';

vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/i18n/navigation')>()),
  usePathname: () => '/bookings/booking-1',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}));

const path = '/api/v1/bookings/booking-1';

// The fixtures are dated around 2026-11-06 (request expiring on the 7th): pin "now" to that day so the
// countdowns read the same whenever the tests run. Only Date is faked; timers and user events stay real.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-06T12:00:00.000Z'));
});
afterEach(() => {
  vi.useRealTimers();
});

function setup(booking: BookingView, routes: FakeRoutes = {}) {
  const api = fakeApi({
    ...meRoute(testUser({ id: booking.viewerRole === 'OWNER' ? 'owner-1' : 'user-1' })),
    [`GET ${path}`]: { status: 200, body: { booking } },
    [`GET ${path}/history`]: { status: 200, body: { items: [historyItem('REQUEST', null, 'REQUESTED', booking.createdAt)] } },
    [`GET ${path}/photos`]: { status: 200, body: { items: [] } },
    'GET /api/v1/wallet': { status: 200, body: { balanceCents: 0, heldCents: 0, depositsCents: 0, incomingCents: 0, earnedCents: 0 } },
    ...routes,
  });
  renderWithSession(<DealView id="booking-1" />, { client: api.client });
  return api;
}

const actionButtons = () => Array.from(document.querySelectorAll('[data-action]')).map((b) => b.getAttribute('data-action'));

describe('DealView', () => {
  it('shows the deal, where it is and what happens next', async () => {
    setup(testBooking({ viewerRole: 'OWNER', actions: ['ACCEPT', 'DECLINE'] }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Deal for PlayStation 5' })).toBeVisible();
    expect(screen.getByText('Anna Bērziņa rents from you')).toBeVisible();
    expect(screen.getByText('Requested')).toBeVisible();
    const current = document.querySelector('[aria-current="step"]')!;
    expect(current).toHaveAttribute('data-step', 'answer');
    expect(within(current as HTMLElement).getByText(/The request expires in/)).toBeVisible();
    expect(screen.getByText('Your turn')).toBeVisible();
  });

  it.each([
    [[] as BookingView['actions']],
    [['WITHDRAW'] as BookingView['actions']],
    [['SIGN', 'CANCEL'] as BookingView['actions']],
    [['MARK_RETURNED'] as BookingView['actions']],
    [['ALL_FINE', 'REPORT_DAMAGE'] as BookingView['actions']],
  ])('has a button for each allowed step and nothing else (%j)', async (actions) => {
    setup(testBooking({ status: actions.length ? 'ACCEPTED' : 'ACTIVE', hasContract: true, actions }));
    await screen.findByRole('heading', { level: 1 });
    expect(actionButtons()).toEqual(actions);
  });

  it('declines with a reason, sending the version and an Idempotency-Key', async () => {
    const user = userEvent.setup();
    const { calls } = setup(testBooking({ viewerRole: 'OWNER', actions: ['ACCEPT', 'DECLINE'], version: 2 }), {
      [`POST ${path}/events`]: { status: 200, body: { booking: testBooking({ viewerRole: 'OWNER', status: 'DECLINED', actions: [], version: 3 }) } },
    });
    await user.click(await screen.findByRole('button', { name: 'Decline' }));
    const dialog = screen.getByRole('dialog', { name: 'Decline the request' });
    await user.type(within(dialog).getByLabelText('Reason (optional)'), 'Away that weekend');
    await user.click(within(dialog).getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(calls.find((c) => c.path.endsWith('/events'))?.body).toEqual({ version: 2, event: { type: 'DECLINE', reason: 'Away that weekend' } }));
    expect(calls.find((c) => c.path.endsWith('/events'))!.headers.get('Idempotency-Key')).toMatch(/^yoyo-/);
    expect(await screen.findByText('Declined')).toBeVisible();
  });

  it('asks before a step that moves money', async () => {
    const user = userEvent.setup();
    const { calls } = setup(testBooking({ status: 'RETURNED', viewerRole: 'OWNER', paymentMethod: 'CARD', hasContract: true, actions: ['ALL_FINE', 'REPORT_DAMAGE'] }));
    await user.click(await screen.findByRole('button', { name: 'All fine, return the deposit' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('The deposit goes back to the renter in full.');
    await user.click(screen.getByRole('button', { name: 'Go back' }));
    expect(calls.some((c) => c.method === 'POST')).toBe(false);
  });

  it('reads the deal again and says so when it moved on meanwhile', async () => {
    const user = userEvent.setup();
    let reads = 0;
    setup(testBooking({ viewerRole: 'OWNER', actions: ['ACCEPT', 'DECLINE'] }), {
      [`GET ${path}`]: () => ({
        status: 200,
        body: { booking: reads++ === 0 ? testBooking({ viewerRole: 'OWNER', actions: ['ACCEPT', 'DECLINE'] }) : testBooking({ viewerRole: 'OWNER', status: 'EXPIRED', actions: [] }) },
      }),
      [`POST ${path}/events`]: apiError(409, 'DEADLINE_PASSED'),
    });
    await user.click(await screen.findByRole('button', { name: 'Accept' }));
    expect(await screen.findByText('The deal moved on in the meantime. Here is where it stands now.')).toBeVisible();
    expect(await screen.findByText('Expired')).toBeVisible();
  });

  it('says a deal that is not yours does not exist, and offers no steps', async () => {
    const { calls } = setup(testBooking(), { [`GET ${path}`]: apiError(404, 'NOT_FOUND') });
    expect(await screen.findByRole('heading', { name: 'Deal not found' })).toBeVisible();
    expect(actionButtons()).toEqual([]);
    expect(calls.some((c) => c.method === 'POST')).toBe(false);
  });

  it('shows the dispute and its decision', async () => {
    setup(
      testBooking({
        status: 'CANCELLED',
        paymentMethod: 'CARD',
        outcome: 'REFUNDED_ALL',
        actions: [],
        dispute: { reason: 'NOT_HANDED_OVER', openedAt: '2026-11-10T12:00:00.000Z', note: 'Nobody came', resolution: { decision: 'REFUND_ALL', comment: 'Refunded in full', at: '2026-11-11T09:00:00.000Z' } },
        cancellation: { by: 'ADMIN', reason: null, at: '2026-11-11T09:00:00.000Z' },
      }),
    );
    expect(await screen.findByText('Decision: everything goes back to the renter')).toBeVisible();
    expect(screen.getByText('Refunded in full')).toBeVisible();
    expect(screen.getByText('Everything returned')).toBeVisible();
  });
});

describe('deal helpers', () => {
  it('builds each event the API takes', () => {
    expect(eventFor('DECLINE', '  ')).toEqual({ type: 'DECLINE' });
    expect(eventFor('CANCEL', 'Plans changed')).toEqual({ type: 'CANCEL', reason: 'Plans changed' });
    expect(eventFor('REJECT_DAMAGE', 'It was like that')).toEqual({ type: 'REJECT_DAMAGE', note: 'It was like that' });
    expect(eventFor('REPORT_DAMAGE', 'Cracked screen corner', ['p1'])).toEqual({ type: 'REPORT_DAMAGE', description: 'Cracked screen corner', photoIds: ['p1'] });
    expect(eventFor('PAY', '')).toBeNull();
    for (const action of BOOKING_ACTIONS) expect(() => eventFor(action, 'x')).not.toThrow();
  });

  it('knows where the deposit is', () => {
    expect(depositState(testBooking())).toBe('pending');
    expect(depositState(testBooking({ paymentMethod: 'WALLET' }))).toBe('frozen');
    expect(depositState(testBooking({ paymentMethod: 'WALLET', outcome: 'DEPOSIT_TO_OWNER' }))).toBe('toOwner');
  });

  it('downloads the contract in the chosen language', async () => {
    const fetcher = vi.fn(async () => new Response(new Blob(['%PDF-1.7']), { status: 200 }));
    URL.createObjectURL = vi.fn(() => 'blob:contract');
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await downloadContract('booking-1', 'lv', fetcher as unknown as typeof fetch);
    expect(fetcher).toHaveBeenCalledWith('/api/v1/bookings/booking-1/contract.pdf?lang=lv');
    expect(click).toHaveBeenCalled();
  });
});
