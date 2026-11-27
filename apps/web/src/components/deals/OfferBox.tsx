'use client';

import { offerFloorCents } from '@yoyo/domain';
import type { BookingTerms, OfferView, QuoteView } from '@yoyo/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { INPUT_CLASS } from '@/components/ui/inputs';
import { useToast } from '@/components/ui/Toast';
import { daysBetween, formatDay, formatPeriod } from '@/lib/deals/dates';
import { useDeadline } from '@/lib/deals/deadline';
import { useMoney } from '@/lib/deals/money';
import { useMakeOffer, useOfferStep } from '@/lib/deals/offers';
import { priceRange } from '@/lib/deals/price';
import { useErrorText } from '@/lib/forms/error-text';
import { parseEuros } from '@/lib/listings/money';
import { useDurationText } from './Countdown';
import type { Range } from './DateRangePicker';

/** Whether an item takes offers at all: its price leaves room between the floor (half of it) and itself. */
export function takesOffers(listedDailyCents: number): boolean {
  return offerFloorCents(listedDailyCents) < listedDailyCents;
}

/** A first figure to start from: about a tenth off, in whole euros, never under the floor. */
export function suggestedOffer(listedDailyCents: number): number {
  const tenthOff = Math.floor((listedDailyCents * 0.9) / 100) * 100;
  return Math.min(listedDailyCents - 1, Math.max(offerFloorCents(listedDailyCents), tenthOff));
}

export type OfferProblem = 'empty' | 'format' | 'low' | 'high' | 'notCheaper';

export type OfferCheck = {
  cents: number | null;
  problem: OfferProblem | null;
  /** The price of the days at the offered price, as the owner would get it if they agree. */
  quote: QuoteView | null;
  /** What the offer takes off the total (rent and fee) compared with the listed price. */
  savingCents: number;
  /** The listed price a day once the weekly discount is in (for "notCheaper"). */
  listedPerDayCents: number;
};

/**
 * Checks a typed daily price for the picked days with the domain's rules: from half the listed price, below
 * it, and cheaper than the listed price with its weekly discount (otherwise the API would price the
 * request at the listed price anyway).
 */
export function checkOffer(terms: BookingTerms, range: Range, joined: string | null, text: string): OfferCheck {
  const listed = terms.pricing.dailyCents;
  const atListed = priceRange(terms, range, joined).quote;
  const days = range.end ? daysBetween(range.start, range.end) : 1;
  const listedPerDayCents = atListed ? Math.floor(atListed.rentCents / days) : listed;
  const none = { cents: null, quote: null, savingCents: 0, listedPerDayCents };
  const value = parseEuros(text);
  if (value === null) return { ...none, problem: 'empty' };
  if (Number.isNaN(value)) return { ...none, problem: 'format' };
  if (value < offerFloorCents(listed)) return { ...none, problem: 'low' };
  if (value >= listed) return { ...none, problem: 'high' };
  const atOffer = priceRange(terms, range, joined, value).quote;
  if (!atListed || !atOffer) return { ...none, cents: value, problem: null };
  const savingCents = atListed.totalCents - atOffer.totalCents;
  if (atOffer.priceSource !== 'AGREED' || savingCents <= 0) return { ...none, cents: value, problem: 'notCheaper' };
  return { cents: value, problem: null, quote: atOffer, savingCents, listedPerDayCents };
}

/**
 * "Offer your own price" (spec §4.6), the renter's form in the booking panel: the daily price, what it saves
 * on these days, and the send. The panel's price block above shows the days at the typed price meanwhile.
 * The owner answers within 24 hours; the days stay open to others until a request holds them.
 */
export function OfferForm({
  listingId,
  terms,
  range,
  text,
  check,
  onText,
  onBack,
  onSent,
}: {
  listingId: string;
  terms: BookingTerms;
  range: Range & { end: string };
  text: string;
  check: OfferCheck;
  onText(text: string): void;
  onBack(): void;
  onSent(offer: OfferView): void;
}) {
  const t = useTranslations('booking.offer');
  const money = useMoney();
  const errorText = useErrorText();
  const make = useMakeOffer(listingId);
  const [tried, setTried] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const listed = terms.pricing.dailyCents;
  const days = daysBetween(range.start, range.end);

  const problemText = (problem: OfferProblem | null): string | undefined => {
    switch (problem) {
      case 'empty':
        return tried ? t('errors.empty') : undefined;
      case 'format':
        return t('errors.format');
      case 'low':
        return t('errors.low', { min: money(offerFloorCents(listed)) });
      case 'high':
        return t('errors.high', { price: money(listed) });
      case 'notCheaper':
        return t('errors.notCheaper', { price: money(check.listedPerDayCents) });
      default:
        return undefined;
    }
  };

  async function send(event: FormEvent) {
    event.preventDefault();
    setTried(true);
    setFailure(null);
    if (check.problem !== null || check.cents === null || make.pending) return;
    try {
      onSent(await make.run({ start: range.start, end: range.end, dailyCents: check.cents }));
    } catch (error) {
      setFailure(errorText(error));
    }
  }

  return (
    <form onSubmit={(event) => void send(event)} noValidate className="flex flex-col gap-4" data-offer-form="">
      <Field
        label={t('label')}
        hint={t('hint', { price: money(listed), min: money(offerFloorCents(listed)) })}
        error={problemText(check.problem)}
        suffix="€"
      >
        <input
          value={text}
          onChange={(event) => onText(event.target.value)}
          inputMode="decimal"
          autoComplete="off"
          enterKeyHint="send"
          // The form opens on a click that asks for it: the field is what comes next.
          autoFocus
          className={`${INPUT_CLASS} pr-12 tabular-nums`}
        />
      </Field>
      <p aria-live="polite" className="min-h-6 text-sm font-bold" data-offer-saving="">
        {check.problem === null && check.savingCents > 0 && t('saving', { amount: money(check.savingCents), days })}
      </p>
      {failure && (
        <p role="alert" className="flex items-start gap-2 text-sm font-bold">
          <span aria-hidden="true" className="bg-[var(--danger)] border-ink/15 mt-0.5 inline-block size-4 shrink-0 rounded-full border" />
          {failure}
        </p>
      )}
      <Button type="submit" size="lg" loading={make.pending}>
        {t('send')}
      </Button>
      <Button variant="ghost" onClick={onBack}>
        {t('back')}
      </Button>
      <p className="text-sm">{t('note')}</p>
    </form>
  );
}

/**
 * The renter's accepted offer at the top of the booking panel: the price the owner agreed to and its days.
 * Picked on other days, it says so and gives those days back with one click.
 */
export function AgreedNotice({ offer, applies, onUseDays }: { offer: OfferView; applies: boolean; onUseDays(): void }) {
  const t = useTranslations('booking.offer');
  const locale = useLocale();
  const money = useMoney();
  const period = formatPeriod(offer.start, offer.end, locale);
  const lastDay = formatDay(offer.start, locale);
  return (
    <div className="border-ink/15 flex items-start gap-3 border-b pb-5" data-offer-agreed="">
      <span aria-hidden="true" className="mt-1.5 size-2.5 shrink-0 rounded-full bg-[var(--glow)] shadow-[0_0_0_4px_rgb(158_210_255/0.28),0_0_14px_var(--glow)]" />
      <div className="flex min-w-0 flex-col gap-1">
        <p className="font-bold">{t('agreed', { price: money(offer.dailyCents), name: offer.owner.name })}</p>
        <p className="text-sm">{applies ? t('agreedUntil', { period, day: lastDay }) : t('agreedOnly', { period })}</p>
        {!applies && (
          <Button variant="ghost" className="mt-2 self-start" onClick={onUseDays}>
            {t('useDays')}
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Under the request button: the renter's waiting offer (with change and withdraw), or the owner's "no" to
 * the last one; otherwise the way into the form.
 */
export function OfferStatus({
  offer,
  canOffer,
  onOffer,
}: {
  offer: OfferView | null;
  /** The picked days work and the item takes offers. */
  canOffer: boolean;
  onOffer(fromCents?: number): void;
}) {
  const t = useTranslations('booking.offer');
  const locale = useLocale();
  const money = useMoney();
  const toast = useToast();
  const errorText = useErrorText();
  const step = useOfferStep();
  const [failure, setFailure] = useState<string | null>(null);
  const waiting = offer?.status === 'PENDING' ? offer : null;
  const left = useDeadline(waiting?.expiresAt ?? null);
  const duration = useDurationText();

  async function withdraw(id: string) {
    setFailure(null);
    try {
      await step.run({ id, step: 'withdraw' });
      toast.show(t('withdrawn'));
    } catch (error) {
      setFailure(errorText(error));
    }
  }

  if (waiting) {
    return (
      <div className="border-ink/15 flex flex-col gap-3 border-t pt-5" data-offer-pending="">
        <div className="flex items-start gap-3">
          <span aria-hidden="true" className="border-ink mt-1.5 size-2.5 shrink-0 rounded-full border-2" />
          <div className="flex min-w-0 flex-col gap-1">
            <p className="font-bold">
              {t('pending', { price: money(waiting.dailyCents), period: formatPeriod(waiting.start, waiting.end, locale) })}
            </p>
            <p className="text-sm tabular-nums">{left && !left.overdue ? t('pendingWait', { time: duration(left) }) : t('pendingSoon')}</p>
          </div>
        </div>
        {failure && (
          <p role="alert" className="text-sm font-bold">
            {failure}
          </p>
        )}
        <div className="flex flex-wrap gap-2 pl-5.5">
          {canOffer && (
            <Button variant="ghost" onClick={() => onOffer(waiting.dailyCents)}>
              {t('change')}
            </Button>
          )}
          <Button variant="ghost" loading={step.pending} onClick={() => void withdraw(waiting.id)}>
            {t('withdraw')}
          </Button>
        </div>
      </div>
    );
  }

  const answered = offer && (offer.status === 'DECLINED' || offer.status === 'EXPIRED') ? offer : null;
  if (!answered && !canOffer) return null;
  return (
    <div className="border-ink/15 flex flex-col gap-3 border-t pt-5" data-offer-open="">
      {answered && (
        <p className="text-sm" data-offer-answer={answered.status}>
          {t(answered.status === 'DECLINED' ? 'declined' : 'expired', { price: money(answered.dailyCents) })}
        </p>
      )}
      {canOffer && (
        <Button variant="ghost" onClick={() => onOffer()}>
          {t('open')}
        </Button>
      )}
    </div>
  );
}
