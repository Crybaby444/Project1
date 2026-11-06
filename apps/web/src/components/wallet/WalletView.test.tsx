import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import '@/test/dialog';
import { apiError, fakeApi, meRoute, testUser, type FakeRoutes } from '@/test/fake-api';
import { installIntersectionObserver } from '@/test/intersection-observer';
import { renderWithSession } from '@/test/render';
import { amountProblem } from './MoneyDialog';
import { WalletView } from './WalletView';

vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/i18n/navigation')>()),
  usePathname: () => '/wallet',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}));

installIntersectionObserver();

const summary = { balanceCents: 5_000, heldCents: 0, depositsCents: 10_000, incomingCents: 4_500, earnedCents: 12_000 };
const items = [
  { id: 'op-1', kind: 'RENT_RELEASE', amountCents: 4_500, bookingId: 'booking-1', listingTitle: 'PlayStation 5', createdAt: '2026-11-06T10:00:00.000Z' },
  { id: 'op-2', kind: 'TOP_UP', amountCents: 2_500, bookingId: null, listingTitle: null, createdAt: '2026-11-05T10:00:00.000Z' },
];

function setup(routes: FakeRoutes = {}) {
  const api = fakeApi({
    ...meRoute(testUser()),
    'GET /api/v1/wallet': { status: 200, body: summary },
    'GET /api/v1/wallet/transactions': { status: 200, body: { items, total: 2 } },
    'POST /api/v1/payments/card-tokens': { status: 201, body: { token: 'tok_test_1234567890', brand: 'visa', last4: '4242', expMonth: 12, expYear: 2034 } },
    ...routes,
  });
  renderWithSession(<WalletView />, { client: api.client });
  return api;
}

describe('amountProblem', () => {
  it('checks the amount against the limits and the balance', () => {
    expect(amountProblem(null, 'topUp', 0)).toBe('invalid');
    expect(amountProblem(Number.NaN, 'topUp', 0)).toBe('invalid');
    expect(amountProblem(50, 'topUp', 0)).toBe('range');
    expect(amountProblem(2_500, 'topUp', 0)).toBeNull();
    expect(amountProblem(6_000, 'withdraw', 5_000)).toBe('balance');
    expect(amountProblem(5_000, 'withdraw', 5_000)).toBeNull();
  });
});

describe('WalletView', () => {
  it('shows the four sums and the history with links to deals', async () => {
    setup();
    expect(await screen.findByText('Available')).toBeVisible();
    expect(screen.getByText('In deposits')).toBeVisible();
    expect(screen.getByText('Waiting for handover')).toBeVisible();
    expect(screen.getByText('Earned')).toBeVisible();
    await waitFor(() => expect(document.querySelector('[data-ledger]')).not.toBeNull());
    const ledger = document.querySelector<HTMLElement>('[data-ledger]')!;
    expect(within(ledger).getByText('Rent received')).toBeVisible();
    expect(within(ledger).getByText('+€45.00')).toBeVisible();
    expect(within(ledger).getByRole('link', { name: 'Deal: PlayStation 5' })).toHaveAttribute('href', '/bookings/booking-1');
  });

  it('filters the history by kind', async () => {
    const user = userEvent.setup();
    const { calls } = setup();
    await waitFor(() => expect(document.querySelector('[data-ledger]')).not.toBeNull());
    await user.click(screen.getByRole('button', { name: 'Deposit returned' }));
    await waitFor(() => expect(calls.some((c) => c.path === '/api/v1/wallet/transactions' && c.query.includes('kind=DEPOSIT_REFUND'))).toBe(true));
  });

  it('tops up by a test card with a token and an Idempotency-Key', async () => {
    const user = userEvent.setup();
    const { calls } = setup({ 'POST /api/v1/wallet/top-ups': { status: 201, body: { balanceCents: 7_500, payment: { id: 'p1', amountCents: 2_500, brand: 'visa', last4: '4242' } } } });
    await user.click(await screen.findByRole('button', { name: 'Top up' }));
    const dialog = screen.getByRole('dialog', { name: 'Top up the wallet' });
    await user.type(within(dialog).getByLabelText('Amount'), '25');
    await user.click(within(dialog).getByRole('button', { name: /Use: 4242 4242 4242 4242/ }));
    await user.dblClick(within(dialog).getByRole('button', { name: 'Top up €25.00' }));
    await waitFor(() => expect(calls.filter((c) => c.path === '/api/v1/wallet/top-ups')).toHaveLength(1));
    const call = calls.find((c) => c.path === '/api/v1/wallet/top-ups')!;
    expect(call.body).toEqual({ amountCents: 2_500, cardToken: 'tok_test_1234567890' });
    expect(call.headers.get('Idempotency-Key')).toMatch(/^yoyo-/);
  });

  it('stops a withdrawal above the balance before asking the API', async () => {
    const user = userEvent.setup();
    const { calls } = setup();
    await user.click(await screen.findByRole('button', { name: 'Withdraw' }));
    const dialog = screen.getByRole('dialog', { name: 'Withdraw to a card' });
    await user.type(within(dialog).getByLabelText('Amount'), '80');
    await user.click(within(dialog).getByRole('button', { name: /Use: 4242/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Withdraw €80.00' }));
    expect(within(dialog).getByText('You have €50.00 available.')).toBeVisible();
    expect(calls.some((c) => c.method === 'POST')).toBe(false);
  });

  it('says when the wallet limit is reached', async () => {
    const user = userEvent.setup();
    setup({ 'POST /api/v1/wallet/top-ups': apiError(409, 'WALLET_LIMIT') });
    await user.click(await screen.findByRole('button', { name: 'Top up' }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText('Amount'), '25');
    await user.click(within(dialog).getByRole('button', { name: /Use: 4242 4242 4242 4242/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Top up €25.00' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('That is over the wallet limit.');
  });
});
