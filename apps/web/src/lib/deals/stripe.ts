'use client';

/**
 * Stripe's own card field (owner, 2026-11-16: payments ready, switched on later). With
 * NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY set (and PAYMENTS=stripe on the API), card details are typed into
 * Stripe's iframe and never reach Yoyo; Stripe hands back a PaymentMethod id that pays like a card token.
 * Without the key the test-card form stays (spec §0).
 */
type StripeElement = { mount(el: HTMLElement): void; destroy(): void; on(event: 'change', cb: (e: { complete: boolean; error?: { message: string } }) => void): void };
type StripeJs = {
  handleNextAction(input: { clientSecret: string }): Promise<{ paymentIntent?: { id: string; status: string }; error?: { message: string } }>;
  elements(options?: Record<string, unknown>): { create(type: 'card', options?: Record<string, unknown>): StripeElement };
  createPaymentMethod(input: { type: 'card'; card: StripeElement; billing_details?: { name?: string } }): Promise<{
    paymentMethod?: { id: string; card?: { brand: string; last4: string; exp_month: number; exp_year: number } };
    error?: { message: string };
  }>;
};

declare global {
  interface Window {
    Stripe?: (key: string) => StripeJs;
  }
}

export const STRIPE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';
export const stripeEnabled = () => STRIPE_KEY.startsWith('pk_');

let loading: Promise<StripeJs> | null = null;

/** Stripe.js from Stripe itself (PCI: it must be loaded from js.stripe.com, never bundled). */
export function loadStripe(): Promise<StripeJs> {
  loading ??= new Promise((resolve, reject) => {
    if (window.Stripe) return resolve(window.Stripe(STRIPE_KEY));
    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/';
    script.async = true;
    script.onload = () => (window.Stripe ? resolve(window.Stripe(STRIPE_KEY)) : reject(new Error('Stripe.js did not load')));
    script.onerror = () => {
      loading = null;
      reject(new Error('Stripe.js did not load'));
    };
    document.head.appendChild(script);
  });
  return loading;
}

/** The mounted card field of the open form (one at a time). */
let mounted: { stripe: StripeJs; card: StripeElement } | null = null;

export async function mountStripeCard(host: HTMLElement, onChange: (state: { complete: boolean; error?: string }) => void): Promise<() => void> {
  const stripe = await loadStripe();
  const card = stripe.elements({ locale: document.documentElement.lang || 'auto' }).create('card', {
    hidePostalCode: true,
    style: { base: { fontSize: '16px', fontFamily: 'system-ui, sans-serif', color: '#0a0b0e' } },
  });
  card.mount(host);
  card.on('change', (e) => onChange({ complete: e.complete, ...(e.error && { error: e.error.message }) }));
  mounted = { stripe, card };
  return () => {
    card.destroy();
    if (mounted?.card === card) mounted = null;
  };
}

/** The PaymentMethod for what was typed: the token the API charges or pays out to. */
export async function stripeCardToken(holder: string): Promise<{ token: string; brand: string; last4: string; expMonth: number; expYear: number }> {
  if (!mounted) throw new Error('The card field is not open');
  const { paymentMethod, error } = await mounted.stripe.createPaymentMethod({ type: 'card', card: mounted.card, billing_details: { name: holder } });
  if (error || !paymentMethod) throw new Error(error?.message ?? 'The card was not accepted');
  return {
    token: paymentMethod.id,
    brand: paymentMethod.card?.brand ?? 'visa',
    last4: paymentMethod.card?.last4 ?? '0000',
    expMonth: paymentMethod.card?.exp_month ?? 1,
    expYear: paymentMethod.card?.exp_year ?? 2030,
  };
}

/**
 * 3-D Secure (SCA): a decline that carries `clientSecret` means the bank wants the person to confirm. Stripe
 * shows the bank's page; when it is confirmed, the answer is the PaymentIntent to pay again with.
 * Null when there is nothing to confirm, or the person did not confirm.
 */
export async function confirmWithBank(details: Record<string, unknown> | undefined): Promise<string | null> {
  const clientSecret = details?.['clientSecret'];
  const paymentIntent = details?.['paymentIntent'];
  if (!stripeEnabled() || typeof clientSecret !== 'string' || typeof paymentIntent !== 'string') return null;
  const stripe = await loadStripe();
  const { paymentIntent: done, error } = await stripe.handleNextAction({ clientSecret });
  if (error || done?.status !== 'succeeded') return null;
  return paymentIntent;
}
