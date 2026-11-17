# Payments with Stripe — ready, off

Owner, 2026-11-16: payments are finished in code and stay switched off until the end of the work.
Today the API uses the test-card provider (`PAYMENTS=fake`, the "test mode" badge). Stripe is a second
provider behind the same interface (`apps/api/src/payments/stripe.provider.ts`).

## What is built

| Part | Where | Status |
|---|---|---|
| Charges (PaymentIntent in EUR, confirmed at once, Yoyo's idempotency key) | `StripePaymentProvider.charge` | done, tested against a local fake Stripe |
| Refunds (deposit back, cancellations) | `.refund` | done |
| Payouts to owners: Stripe Connect Express account, transfer | `.payout`, `.createAccount`, `.onboardingLink`; `POST /wallet/stripe-onboarding`; payouts go to the account | done |
| Card form: Stripe's own field (card data never reaches Yoyo) | `apps/web/src/lib/deals/stripe.ts`, `CardForm` | done, on when the publishable key is set |
| Webhook, signature-checked (5-minute window, constant-time) | `POST /api/v1/payments/stripe/webhook` | done; logs events, warns on failures and disputes |

## Switching it on

1. **Stripe account** for the business (needs a company or a sole trader registration in Latvia), with
   **Connect** enabled (Express accounts, country LV first).
2. Test first: use the **test keys** (`sk_test_…`, `pk_test_…`) on a preview deployment.
3. **Render** (API): `PAYMENTS=stripe`, `STRIPE_SECRET_KEY=sk_…`, `STRIPE_WEBHOOK_SECRET=whsec_…`.
4. **Vercel** (site): `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_…` (rebuild needed).
5. **Webhook** in the Stripe dashboard: `https://yoyo.rent/api/v1/payments/stripe/webhook`, events
   `payment_intent.*`, `charge.refunded`, `charge.dispute.*`, `account.updated`.
6. **Apple Pay**: verify the domain `yoyo.rent` in Stripe (Settings → Payment methods → Apple Pay).
7. Remove the test-mode badge (owner's decision of 2026-11-06 ties it to `PAYMENTS=fake`).

Keys go into `.env.deploy` and the hosts' settings only — never into the repository.

## Before real money (must do)

- **3-D Secure (SCA).** In the EU most card payments need the bank's confirmation. Today a card that
  asks for it is answered `DECLINED authentication_required`. Needed: the API answers the PaymentIntent's
  `client_secret`, the site runs `stripe.handleNextAction`, then the payment is confirmed. (Plan item B1b.)
- **The wallet (audit M1).** A balance people top up and withdraw is e-money: with Stripe it must be
  the owner's Connect balance (Stripe holds it), not a Yoyo-held top-up wallet. Renters should pay per
  deal (rent + fee + deposit) instead of topping up. Confirm the set-up with an EU payments lawyer.
- **Invoices / receipts** with the company's details for Yoyo's fee.
