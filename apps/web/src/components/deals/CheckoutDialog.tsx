'use client';

import type { BookingView, CardToken } from '@yoyo/shared';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { useToast } from '@/components/ui/Toast';
import { checkCard, tokenizeCard, type CardFields } from '@/lib/deals/card';
import { useMoney } from '@/lib/deals/money';
import { useDealAction, useWallet } from '@/lib/deals/queries';
import { useErrorText } from '@/lib/forms/error-text';
import { outcomeUnknown } from '@/lib/deals/idempotency';
import { ApiError } from '@/lib/session/api-error';
import { useApiClient, useSession } from '@/lib/session/SessionProvider';
import { CardForm, EMPTY_CARD, TestModeNotice } from './CardForm';
import { FeeLine } from './FeeLine';

type Method = 'WALLET' | 'CARD';

/**
 * Paying for a booking (spec §4.4 step 4): from the Yoyo wallet or by card, on a form that looks and
 * behaves like a real checkout and says plainly that it is test mode. The card becomes a token at the
 * provider first; only the token goes with the payment. One Idempotency-Key per attempt: a double click
 * or a retry after a lost answer is the same payment, and a declined card starts a fresh attempt.
 * Nothing on screen changes before the API answers (money is never optimistic).
 */
export function CheckoutDialog({ booking, open, onClose }: { booking: BookingView; open: boolean; onClose(): void }) {
  const t = useTranslations('checkout');
  const ts = useTranslations('booking.summary');
  const tm = useTranslations('deal.money');
  const money = useMoney();
  const errorText = useErrorText();
  const client = useApiClient();
  const { user } = useSession();
  const toast = useToast();
  const wallet = useWallet();
  const action = useDealAction(booking);
  const balance = wallet.data?.balanceCents ?? 0;
  const enough = balance >= booking.quote.totalCents;
  const [method, setMethod] = useState<Method | null>(null);
  const chosen: Method = method ?? (wallet.data && enough ? 'WALLET' : 'CARD');
  const [card, setCard] = useState<CardFields>(EMPTY_CARD);
  const [token, setToken] = useState<{ for: string; token: CardToken } | null>(null);
  const [tried, setTried] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const groupId = useId();
  const problems = checkCard(card);
  const q = booking.quote;

  async function pay() {
    setTried(true);
    setError(null);
    if (chosen === 'CARD' && Object.keys(problems).length > 0) return;
    if (chosen === 'WALLET' && !enough) return;
    setBusy(true);
    try {
      if (chosen === 'WALLET') {
        await action.run({ type: 'PAY', method: 'WALLET' });
      } else {
        // The same card details keep their token (valid 15 minutes), so a retry is the same payment.
        const fingerprint = JSON.stringify(card);
        const current = token?.for === fingerprint ? token.token : await tokenizeCard(client, card);
        setToken({ for: fingerprint, token: current });
        await action.run({ type: 'PAY', method: 'CARD', cardToken: current.token });
      }
      setCard(EMPTY_CARD);
      setToken(null);
      toast.show(t('paid'));
      onClose();
    } catch (failure) {
      const decline = failure instanceof ApiError && failure.code === 'PAYMENT_DECLINED' ? String(failure.details?.['declineCode'] ?? 'card_declined') : null;
      if (decline || (failure instanceof ApiError && failure.fields?.['cardToken'])) setToken(null);
      setError(
        decline && t.has(`errors.${decline}`)
          ? t(`errors.${decline}`)
          : failure instanceof ApiError && failure.fields?.['cardToken']
            ? t('errors.invalid_token')
            : errorText(failure),
      );
      if (!outcomeUnknown(failure)) wallet.refetch().catch(() => {});
    } finally {
      setBusy(false);
    }
  }

  const pending = busy || action.pending;

  return (
    <Dialog open={open} onClose={() => !pending && onClose()} title={t('title')} wide>
      <div className="flex flex-col gap-5" data-checkout="">
        <dl className="bg-mist rounded-media flex flex-col gap-2 p-4 text-[15px]">
          <div className="flex justify-between gap-3">
            <dt>{tm('rent')}</dt>
            <dd className="font-bold tabular-nums">{money(q.rentCents)}</dd>
          </div>
          <FeeLine quote={q} />
          {q.depositCents > 0 && (
            <div className="flex justify-between gap-3">
              <dt>{ts('deposit')}</dt>
              <dd className="font-bold tabular-nums">{money(q.depositCents)}</dd>
            </div>
          )}
          <div className="border-ink flex items-baseline justify-between gap-3 border-t pt-2">
            <dt className="font-bold">{t('total')}</dt>
            <dd className="text-xl font-bold tabular-nums">{money(q.totalCents)}</dd>
          </div>
        </dl>

        <fieldset className="flex flex-col gap-2" aria-describedby={`${groupId}-hint`}>
          <legend className="mb-2 text-[13px] font-bold tracking-[0.03em] uppercase">{t('method')}</legend>
          {(['WALLET', 'CARD'] as const).map((value) => (
            <label
              key={value}
              className={`rounded-media ease-yoyo flex min-h-12 cursor-pointer items-center gap-3 border px-4 py-3 transition-[background-color,transform] duration-150 active:scale-[0.99] ${
                chosen === value ? 'border-ink bg-mist text-ink' : 'border-ink/40 hover:border-ink'
              }`}
            >
              <input
                type="radio"
                name={`${groupId}-method`}
                value={value}
                checked={chosen === value}
                onChange={() => {
                  setMethod(value);
                  setError(null);
                }}
                disabled={pending}
                className="accent-black size-4"
              />
              <span className="flex flex-1 flex-wrap items-baseline justify-between gap-x-3">
                <span className="font-bold">{value === 'WALLET' ? t('wallet') : t('card')}</span>
                {value === 'WALLET' && wallet.data && (
                  <span className="text-sm tabular-nums">
                    {t('walletBalance', { amount: money(balance) })}
                    {!enough && ` · ${t('walletShort', { amount: money(q.totalCents - balance) })}`}
                  </span>
                )}
              </span>
            </label>
          ))}
          <p id={`${groupId}-hint`} className="sr-only">
            {t('secure')}
          </p>
        </fieldset>

        {chosen === 'WALLET' && !enough && wallet.data && (
          <p className="flex flex-wrap items-center gap-3 text-sm font-bold">
            {t('walletShort', { amount: money(q.totalCents - balance) })}
            <Button variant="ghost" href="/wallet">
              {t('topUp')}
            </Button>
          </p>
        )}

        {chosen === 'CARD' && (
          <div className="animate-step-in flex flex-col gap-4">
            <TestModeNotice
              onUse={(number) => {
                setCard({ number, expiry: '12 / 34', cvc: '123', holder: card.holder || user?.name || '' });
                setError(null);
              }}
            />
            <CardForm value={card} onChange={setCard} problems={problems} showErrors={tried} disabled={pending} />
            <p className="flex items-start gap-2 text-sm">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="mt-0.5 size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z" />
              </svg>
              {t('secure')}
            </p>
          </div>
        )}

        {error && (
          <p role="alert" data-pay-error="" className="rounded-media border-ink flex items-start gap-2 border p-3 text-sm font-bold">
            <span aria-hidden="true" className="bg-[var(--danger)] mt-0.5 inline-block size-4 shrink-0 rounded-full border border-ink/15" />
            {error}
          </p>
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            {t('cancel')}
          </Button>
          <Button size="lg" onClick={() => void pay()} loading={pending} disabled={chosen === 'WALLET' && !enough}>
            {pending ? t('paying') : t('pay', { amount: money(q.totalCents) })}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
