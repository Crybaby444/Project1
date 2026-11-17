import { afterEach, describe, expect, it, vi } from 'vitest';

describe('card form with Stripe on (owner, 2026-11-16: ready, switched on with the key)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('stays the test-card form without a publishable key', async () => {
    const { stripeEnabled } = await import('./stripe');
    expect(stripeEnabled()).toBe(false);
  });

  it('with a key: only the holder is checked here, and the token comes from Stripe, not from Yoyo', async () => {
    vi.stubEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'pk_test_123');
    const createPaymentMethod = vi.fn(async () => ({ paymentMethod: { id: 'pm_123', card: { brand: 'mastercard', last4: '4444', exp_month: 4, exp_year: 2031 } } }));
    const element = { mount: vi.fn(), destroy: vi.fn(), on: vi.fn() };
    vi.stubGlobal('Stripe', () => ({ elements: () => ({ create: () => element }), createPaymentMethod }));
    window.Stripe = (globalThis as unknown as { Stripe: Window['Stripe'] }).Stripe;
    const stripe = await import('./stripe');
    const { checkCard, tokenizeCard } = await import('./card');
    expect(stripe.stripeEnabled()).toBe(true);
    expect(checkCard({ number: '', expiry: '', cvc: '', holder: 'Anna Test' })).toEqual({});
    expect(checkCard({ number: '', expiry: '', cvc: '', holder: '' })).toEqual({ holder: 'holder' });
    await stripe.mountStripeCard(document.createElement('div'), () => undefined);
    const post = vi.fn();
    const token = await tokenizeCard({ POST: post } as never, { number: '', expiry: '', cvc: '', holder: 'Anna Test' });
    expect(token).toEqual({ token: 'pm_123', brand: 'mastercard', last4: '4444', expMonth: 4, expYear: 2031 });
    expect(post).not.toHaveBeenCalled();
    expect(createPaymentMethod).toHaveBeenCalledWith(expect.objectContaining({ type: 'card', billing_details: { name: 'Anna Test' } }));
  });
});
