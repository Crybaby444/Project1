'use client';

import { useQueryClient } from '@tanstack/react-query';
import { WALLET_LIMITS, type CardToken } from '@yoyo/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { CardForm, EMPTY_CARD, TestModeNotice } from '@/components/deals/CardForm';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Field } from '@/components/ui/Field';
import { INPUT_CLASS } from '@/components/ui/inputs';
import { useToast } from '@/components/ui/Toast';
import { checkCard, tokenizeCard, type CardFields } from '@/lib/deals/card';
import { useIdempotentMutation } from '@/lib/deals/idempotency';
import { useMoney } from '@/lib/deals/money';
import { walletKeys } from '@/lib/deals/queries';
import { useErrorText } from '@/lib/forms/error-text';
import { parseEuros } from '@/lib/listings/money';
import { ApiError, unwrap } from '@/lib/session/api-error';
import { useApiClient, useSession } from '@/lib/session/SessionProvider';

export type MoneyMode = 'topUp' | 'withdraw';

/** Why an amount does not work, or null: a real amount, within the limits, and for a payout no more than the balance. */
export function amountProblem(cents: number | null, mode: MoneyMode, balanceCents: number): 'invalid' | 'range' | 'balance' | null {
  if (cents === null || Number.isNaN(cents)) return 'invalid';
  const limits = mode === 'topUp' ? WALLET_LIMITS.topUp : WALLET_LIMITS.payout;
  if (cents < limits.min || cents > limits.max) return 'range';
  if (mode === 'withdraw' && cents > balanceCents) return 'balance';
  return null;
}

/**
 * Topping up the wallet from a card, or withdrawing to one, through the payment provider (test mode).
 * One Idempotency-Key per attempt: a double click or a retry after a lost answer charges or pays out
 * once. The balance changes on screen only when the API has answered.
 */
export function MoneyDialog({ mode, balanceCents, onClose }: { mode: MoneyMode; balanceCents: number; onClose(): void }) {
  const t = useTranslations('wallet');
  const tc = useTranslations('checkout');
  const locale = useLocale();
  const money = useMoney();
  const errorText = useErrorText();
  const client = useApiClient();
  const { user } = useSession();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('');
  const [card, setCard] = useState<CardFields>(EMPTY_CARD);
  const [token, setToken] = useState<{ for: string; token: CardToken } | null>(null);
  const [tried, setTried] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const cents = parseEuros(amount);
  const problem = amountProblem(cents, mode, balanceCents);
  const cardProblems = checkCard(card);
  const limits = mode === 'topUp' ? WALLET_LIMITS.topUp : WALLET_LIMITS.payout;
  const max = mode === 'withdraw' ? Math.min(limits.max, balanceCents) : limits.max;

  const move = useIdempotentMutation<{ amountCents: number; cardToken: string }, { text: string }>({
    intent: (vars) => `${mode}:${JSON.stringify(vars)}`,
    mutate: async (vars, key) => {
      const params = { header: { 'Idempotency-Key': key } };
      if (mode === 'topUp') {
        await unwrap(client.POST('/api/v1/wallet/top-ups', { params, body: vars }));
        return { text: t('toppedUp', { amount: money(vars.amountCents) }) };
      }
      const { payout } = await unwrap(client.POST('/api/v1/wallet/payouts', { params, body: vars }));
      return {
        text:
          payout.status === 'DONE'
            ? t('withdrawn', { amount: money(vars.amountCents), card: `${payout.brand.toUpperCase()} ·· ${payout.last4}` })
            : t('withdrawPending', { amount: money(vars.amountCents) }),
      };
    },
  });

  async function submit() {
    setTried(true);
    setError(null);
    if (problem || Object.keys(cardProblems).length > 0 || cents === null) return;
    setBusy(true);
    try {
      const fingerprint = JSON.stringify(card);
      const current = token?.for === fingerprint ? token.token : await tokenizeCard(client, card);
      setToken({ for: fingerprint, token: current });
      const result = await move.run({ amountCents: cents, cardToken: current.token });
      await queryClient.invalidateQueries({ queryKey: walletKeys.all });
      toast.show(result.text);
      onClose();
    } catch (failure) {
      const decline = failure instanceof ApiError && failure.code === 'PAYMENT_DECLINED' ? String(failure.details?.['declineCode'] ?? 'card_declined') : null;
      if (decline || (failure instanceof ApiError && failure.fields?.['cardToken'])) setToken(null);
      setError(decline && tc.has(`errors.${decline}`) ? tc(`errors.${decline}`) : errorText(failure));
    } finally {
      setBusy(false);
    }
  }

  const amountError =
    tried && problem
      ? problem === 'invalid'
        ? t('amountInvalid')
        : problem === 'balance'
          ? t('amountOverBalance', { balance: money(balanceCents) })
          : t('amountRange', { min: money(limits.min), max: money(max) })
      : undefined;
  const pending = busy || move.pending;
  const shown = cents !== null && !Number.isNaN(cents) ? money(cents) : '';

  return (
    <Dialog open onClose={() => !pending && onClose()} title={mode === 'topUp' ? t('topUpTitle') : t('withdrawTitle')} wide>
      <form
        className="flex flex-col gap-5"
        data-money-dialog={mode}
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <Field label={t('amount')} hint={t('amountHint', { min: money(limits.min), max: money(max) })} error={amountError} suffix="€">
          <input
            inputMode="decimal"
            autoComplete="off"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder={locale === 'en' ? '25.00' : '25,00'}
            disabled={pending}
            className={`${INPUT_CLASS} pr-16 text-lg font-bold tabular-nums`}
          />
        </Field>
        <TestModeNotice onUse={(number) => setCard({ number, expiry: '12 / 34', cvc: '123', holder: card.holder || user?.name || '' })} />
        <CardForm value={card} onChange={setCard} problems={cardProblems} showErrors={tried} disabled={pending} />
        {error && (
          <p role="alert" className="rounded-media border-ink/15 flex items-start gap-2 border p-3 text-sm font-bold">
            <span aria-hidden="true" className="bg-[var(--danger)] mt-0.5 inline-block size-4 shrink-0 rounded-full border border-ink/15" />
            {error}
          </p>
        )}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            {tc('cancel')}
          </Button>
          <Button type="submit" size="lg" loading={pending}>
            {mode === 'topUp' ? t('topUpSubmit', { amount: shown }) : t('withdrawSubmit', { amount: shown })}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
