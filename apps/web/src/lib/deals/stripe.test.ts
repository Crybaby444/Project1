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

  it('3-D Secure: confirms with the bank and answers the intent to pay again with; nothing to confirm without a secret', async () => {
    vi.stubEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'pk_test_123');
    const handleNextAction = vi.fn(async () => ({ paymentIntent: { id: 'pi_123', status: 'succeeded' } }));
    window.Stripe = (() => ({ elements: vi.fn(), createPaymentMethod: vi.fn(), handleNextAction })) as unknown as Window['Stripe'];
    const { confirmWithBank } = await import('./stripe');
    expect(await confirmWithBank({ declineCode: 'authentication_required', clientSecret: 'pi_123_secret', paymentIntent: 'pi_123' })).toBe('pi_123');
    expect(handleNextAction).toHaveBeenCalledWith({ clientSecret: 'pi_123_secret' });
    expect(await confirmWithBank({ declineCode: 'card_declined' })).toBeNull();
    handleNextAction.mockResolvedValueOnce({ error: { message: 'cancelled' } } as never);
    expect(await confirmWithBank({ clientSecret: 'pi_9_secret', paymentIntent: 'pi_9' })).toBeNull();
  });
});
