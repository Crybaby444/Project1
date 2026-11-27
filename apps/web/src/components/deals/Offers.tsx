'use client';

import type { OfferView } from '@yoyo/shared';
import { useLocale, useNow, useTranslations } from 'next-intl';
import { useState } from 'react';
import { TransitionLink } from '@/components/motion/TransitionLink';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { daysBetween, formatDay, formatPeriod } from '@/lib/deals/dates';
import { useDeadline } from '@/lib/deals/deadline';
import { useMoney } from '@/lib/deals/money';
import { isOpen, useMyOffers, useOfferStep, type OfferRole } from '@/lib/deals/offers';
import { useErrorText } from '@/lib/forms/error-text';
import { useDurationText } from './Countdown';
import { DealCover } from './DealView';

/**
 * One open price offer as a card: the item, the price against the listed one, the days, what it comes to,
 * how long it stays open, and the one-click answers (spec §4.6): the owner accepts or declines, the renter
 * books an accepted one or takes back one still waiting.
 */
export function OfferCard({ offer, role, flat = false }: { offer: OfferView; role: OfferRole; flat?: boolean }) {
  const t = useTranslations('offers');
  const locale = useLocale();
  const money = useMoney();
  const toast = useToast();
  const errorText = useErrorText();
  const step = useOfferStep();
  const [failure, setFailure] = useState<string | null>(null);
  const [answering, setAnswering] = useState<'accept' | 'decline' | 'withdraw' | null>(null);
  const left = useDeadline(offer.expiresAt);
  const duration = useDurationText();
  const days = daysBetween(offer.start, offer.end);
  const total = offer.dailyCents * days;
  const waiting = offer.status === 'PENDING';
  const other = role === 'owner' ? offer.renter.name : offer.owner.name;
  const time = left && !left.overdue ? duration(left) : null;

  async function answer(which: 'accept' | 'decline' | 'withdraw') {
    setFailure(null);
    setAnswering(which);
    try {
      await step.run({ id: offer.id, step: which });
      toast.show(t(`done.${which}`, { name: other }));
    } catch (error) {
      setFailure(errorText(error));
    } finally {
      setAnswering(null);
    }
  }

  const status = waiting
    ? role === 'owner'
      ? time && t('answerWithin', { time })
      : time && t('waitWithin', { time })
    : role === 'owner'
      ? t('agreedOwner', { name: other, day: formatDay(offer.start, locale) })
      : t('agreedRenter', { day: formatDay(offer.start, locale) });

  const ring = (waiting && role === 'owner') || (!waiting && role === 'renter');
  const actions =
    waiting && role === 'owner' ? (
      <>
        <Button loading={answering === 'accept'} disabled={answering !== null} onClick={() => void answer('accept')}>
          {t('accept')}
        </Button>
        <Button variant="ghost" loading={answering === 'decline'} disabled={answering !== null} onClick={() => void answer('decline')}>
          {t('decline')}
        </Button>
      </>
    ) : waiting ? (
      <Button variant="ghost" loading={answering === 'withdraw'} onClick={() => void answer('withdraw')}>
        {t('withdraw')}
      </Button>
    ) : role === 'renter' ? (
      <Button href={`/listings/${offer.listing.id}?from=${offer.start}&to=${offer.end}#booking`}>{t('book')}</Button>
    ) : null;

  return (
    // A card of its own in "My deals"; inside the item page's booking sheet, a row between hairlines
    // (DESIGN.md: nothing is nested in a sheet).
    <li
      data-offer-card={offer.id}
      data-offer-status={offer.status}
      className={`flex flex-col gap-3 ${
        flat ? 'border-ink/15 border-t pt-4' : `sheet rounded-media p-4 sm:p-5 ${ring ? 'border-ink border-2' : 'border-ink/15 border'}`
      }`}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <DealCover booking={{ id: offer.id, listing: { ...offer.listing, city: null, district: null } }} size="card" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <TransitionLink
            href={`/listings/${offer.listing.id}`}
            data-cursor-text
            className="font-display text-2xl leading-[0.95] font-black [overflow-wrap:anywhere] uppercase hover:underline sm:text-3xl"
          >
            {offer.listing.title}
          </TransitionLink>
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-lg font-bold tabular-nums">{t('perDay', { price: money(offer.dailyCents) })}</span>
            <span className="text-ink/70 text-sm tabular-nums">{t('instead', { price: money(offer.listedDailyCents) })}</span>
          </p>
          <p className="flex flex-wrap gap-x-3 gap-y-0.5 text-sm">
            <span>{t(role === 'owner' ? 'from' : 'to', { name: other })}</span>
            <span className="font-bold">{formatPeriod(offer.start, offer.end, locale)}</span>
            <span className="tabular-nums">{t(role === 'owner' ? 'youGet' : 'comesTo', { total: money(total), days })}</span>
          </p>
          {status && (
            <p className="text-sm tabular-nums" data-offer-line="">
              {status}
            </p>
          )}
          {failure && (
            <p role="alert" className="text-sm font-bold">
              {failure}
            </p>
          )}
        </div>
      </div>
      {/* Under the text from 640px; across the card on a phone, the answers side by side. */}
      {actions && <div className="flex gap-2 sm:pl-24 max-sm:[&>*]:flex-1">{actions}</div>}
    </li>
  );
}

/**
 * The open price offers of one side, above the deals in "My deals" (and the owner's own item page, for that
 * item): the owner's to answer and those they accepted, the renter's waiting and accepted ones. Nothing
 * shows while there are none.
 */
export function OffersBlock({ role, listingId }: { role: OfferRole; listingId?: string }) {
  const t = useTranslations('offers');
  const now = useNow({ updateInterval: 60_000 });
  const offers = useMyOffers(role);
  const open = (offers.data ?? []).filter(
    (offer) => isOpen(offer, now.getTime()) && (listingId === undefined || offer.listing.id === listingId),
  );
  if (open.length === 0) return null;
  const headingId = `offers-${role}${listingId ? '-item' : ''}`;
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3" data-offers={role}>
      <h2 id={headingId} className="type-block flex flex-wrap items-baseline gap-x-3 gap-y-1">
        {t(`title.${role}`)}
        <span className="border-ink/20 rounded-pill inline-flex min-h-7 items-center border px-2.5 font-sans text-sm font-bold tracking-normal normal-case tabular-nums">
          {open.length}
        </span>
      </h2>
      <ul className={`grid grid-cols-[minmax(0,1fr)] ${listingId ? 'gap-4' : 'gap-3 lg:grid-cols-2'}`}>
        {open.map((offer) => (
          <OfferCard key={offer.id} offer={offer} role={role} flat={listingId !== undefined} />
        ))}
      </ul>
    </section>
  );
}
