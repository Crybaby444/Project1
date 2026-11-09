import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { brandOf, checkCard, formatCardNumber, formatExpiry, luhn } from '@/lib/deals/card';
import { testBooking } from '@/test/deals';
import '@/test/dialog';
import { apiError, fakeApi, meRoute, testUser, type FakeRoutes } from '@/test/fake-api';
import { renderWithSession } from '@/test/render';
import { CheckoutDialog } from './CheckoutDialog';


describe('card rules (the same as the provider)', () => {
  it('checks the number by Luhn and finds the brand', () => {
    expect(luhn('4242 4242 4242 4242')).toBe(true);
    expect(luhn('4242 4242 4242 4241')).toBe(false);
    expect(brandOf('4242')).toBe('visa');
    expect(brandOf('5555 5555')).toBe('mastercard');
    expect(brandOf('2221 00')).toBe('mastercard');
    expect(brandOf('3782 822463 10005')).toBe('amex');
    expect(brandOf('6011')).toBeNull();
  });

  it('groups the number and puts the slash in the expiry', () => {
    expect(formatCardNumber('4242424242424242')).toBe('4242 4242 4242 4242');
    expect(formatCardNumber('378282246310005')).toBe('3782 822463 10005');
    expect(formatExpiry('1234')).toBe('12 / 34');
    expect(formatExpiry('1')).toBe('1');
  });

  it('refuses an expired card, a wrong CVC length and a missing name', () => {
    const now = new Date('2026-11-06T00:00:00Z');
    const good = { number: '4242 4242 4242 4242', expiry: '11 / 26', cvc: '123', holder: 'Anna' };
    expect(checkCard(good, now)).toEqual({});
    expect(checkCard({ ...good, expiry: '10 / 26' }, now)).toEqual({ expiry: 'expiry' });
    expect(checkCard({ ...good, expiry: '13 / 30' }, now)).toEqual({ expiry: 'expiry' });
    expect(checkCard({ ...good, number: '3782 822463 10005', cvc: '123' }, now)).toEqual({ cvc: 'cvc' });
    expect(checkCard({ ...good, holder: ' ' }, now)).toEqual({ holder: 'holder' });
  });
});

const accepted = testBooking({
  status: 'ACCEPTED',
  hasContract: true,
  renterSignedAt: '2026-11-06T11:00:00.000Z',
  ownerSignedAt: '2026-11-06T12:00:00.000Z',
  actions: ['PAY', 'CANCEL'],
  version: 3,
});

function setup(routes: FakeRoutes, balanceCents = 0) {
  const api = fakeApi({
    ...meRoute(testUser()),
    'GET /api/v1/wallet': { status: 200, body: { balanceCents, heldCents: 0, depositsCents: 0, incomingCents: 0, earnedCents: 0 } },
    'POST /api/v1/payments/card-tokens': { status: 201, body: { token: 'tok_test_1234567890', brand: 'visa', last4: '4242', expMonth: 12, expYear: 2034 } },
    ...routes,
  });
  renderWithSession(<CheckoutDialog booking={accepted} open onClose={() => {}} />, { client: api.client });
  return api;
}

const events = '/api/v1/bookings/booking-1/events';

describe('CheckoutDialog', () => {
  it('says it is test mode and fills a test card in one click', async () => {
    const user = userEvent.setup();
    setup({});
    expect(await screen.findByRole('heading', { name: 'Test mode' })).toBeVisible();
    expect(screen.getByText(/No real money moves/)).toBeVisible();
    await user.click(screen.getByRole('button', { name: /Use: 4242 4242 4242 4242/ }));
    expect(screen.getByLabelText('Card number')).toHaveValue('4242 4242 4242 4242');
    expect(screen.getByText('Visa')).toBeVisible();
    expect(screen.getByLabelText('Name on the card')).toHaveValue('Anna Bērziņa');
  });

  it('pays by card with a token, never the number, and one request for a double click', async () => {
    const user = userEvent.setup();
    const { calls } = setup({ [`POST ${events}`]: { status: 200, body: { booking: { ...accepted, status: 'PAID', actions: [] } } } });
    await user.click(await screen.findByRole('button', { name: /Use: 4242 4242 4242 4242/ }));
    await user.dblClick(screen.getByRole('button', { name: 'Pay €149.50' }));
    await waitFor(() => expect(calls.filter((c) => c.path === events)).toHaveLength(1));
    const pay = calls.find((c) => c.path === events)!;
    expect(pay.body).toEqual({ version: 3, event: { type: 'PAY', method: 'CARD', cardToken: 'tok_test_1234567890' } });
    expect(pay.headers.get('Idempotency-Key')).toMatch(/^yoyo-/);
    expect(JSON.stringify(pay.body)).not.toContain('4242 4242');
    const tokenCall = calls.find((c) => c.path.endsWith('/card-tokens'))!;
    expect(tokenCall.body).toMatchObject({ number: '4242424242424242', expMonth: 12, expYear: 2034, cvc: '123' });
  });

  it('explains a declined card and starts a new attempt with a new key', async () => {
    const user = userEvent.setup();
    let answer = 0;
    const { calls } = setup({
      [`POST ${events}`]: () =>
        answer++ === 0
          ? apiError(402, 'PAYMENT_DECLINED', { details: { declineCode: 'insufficient_funds' } })
          : { status: 200, body: { booking: { ...accepted, status: 'PAID' } } },
    });
    await user.click(await screen.findByRole('button', { name: /Use: 4000 0000 0000 9995/ }));
    await user.click(screen.getByRole('button', { name: 'Pay €149.50' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('The card does not have enough money.');
    await user.click(screen.getByRole('button', { name: /Use: 4242 4242 4242 4242/ }));
    await user.click(screen.getByRole('button', { name: 'Pay €149.50' }));
    await waitFor(() => expect(calls.filter((c) => c.path === events)).toHaveLength(2));
    const [first, second] = calls.filter((c) => c.path === events);
    expect(first!.headers.get('Idempotency-Key')).not.toBe(second!.headers.get('Idempotency-Key'));
  });

  it('shows the card errors only after a try, and sends nothing', async () => {
    const user = userEvent.setup();
    const { calls } = setup({});
    await screen.findByRole('heading', { name: 'Test mode' });
    expect(screen.queryByText('Check the card number.')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Pay €149.50' }));
    expect(screen.getByText('Check the card number.')).toBeVisible();
    expect(calls.filter((c) => c.method === 'POST')).toHaveLength(0);
  });

  it('pays from the wallet when it holds enough', async () => {
    const user = userEvent.setup();
    const { calls } = setup({ [`POST ${events}`]: { status: 200, body: { booking: { ...accepted, status: 'PAID' } } } }, 20_000);
    expect(await screen.findByText('Balance €200.00')).toBeVisible();
    expect(screen.getByRole('radio', { name: /Yoyo wallet/ })).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Pay €149.50' }));
    await waitFor(() => expect(calls.find((c) => c.path === events)?.body).toEqual({ version: 3, event: { type: 'PAY', method: 'WALLET' } }));
  });
});
