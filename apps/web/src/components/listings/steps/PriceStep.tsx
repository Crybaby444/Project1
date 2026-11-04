'use client';

import { quote, type ListingPricing } from '@yoyo/domain';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { Field } from '@/components/ui/Field';
import { INPUT_CLASS } from '@/components/ui/inputs';
import { checkListing, type ListingValues } from '@/lib/listings/listing-checks';
import { centsToInput, formatEuros, parseEuros } from '@/lib/listings/money';
import { useBuilder } from '../BuilderContext';

type NumericField = 'dailyCents' | 'weeklyDiscountPercent' | 'depositCents' | 'minDays' | 'maxDays';

const WHOLE = /^\d{1,9}$/;

/** A whole number as typed; empty → `empty`, anything else that is not one → NaN (shown as an error). */
function parseWhole(text: string, empty: number): number {
  const compact = text.trim();
  if (compact === '') return empty;
  return WHOLE.test(compact) ? Number(compact) : Number.NaN;
}

function AmountField({
  field,
  label,
  hint,
  suffix,
  kind,
}: {
  field: NumericField;
  label: string;
  hint: string;
  suffix: string;
  kind: 'euros' | 'whole';
}) {
  const locale = useLocale();
  const { draft, errorFor, touch, readOnly } = useBuilder();
  const value = draft.values[field];
  const [text, setText] = useState(() =>
    kind === 'euros'
      ? centsToInput(value, locale)
      : value === null || Number.isNaN(value)
        ? ''
        : String(value),
  );

  function onChange(next: string) {
    setText(next);
    let parsed: number | null;
    if (kind === 'euros') {
      parsed = parseEuros(next);
      // An empty deposit means none; an empty daily price is "not set yet".
      if (parsed === null && field !== 'dailyCents') parsed = 0;
    } else parsed = parseWhole(next, field === 'weeklyDiscountPercent' ? 0 : Number.NaN);
    draft.change({ [field]: parsed } as Partial<ListingValues>);
  }

  return (
    <Field label={label} hint={hint} error={errorFor(field)} suffix={suffix}>
      <input
        type="text"
        inputMode={kind === 'euros' ? 'decimal' : 'numeric'}
        autoComplete="off"
        value={text}
        readOnly={readOnly}
        onChange={(event) => onChange(event.target.value)}
        onBlur={() => touch(field)}
        className={`${INPUT_CLASS} pr-16`}
      />
    </Field>
  );
}

/** What the owner receives for `days` (the rent: the renter pays the fee on top), or null. */
function payout(values: ListingValues, days: number) {
  try {
    const pricing = values as unknown as ListingPricing;
    const result = quote({ pricing, days, servicePercent: 0 });
    return { cents: result.ownerPayoutCents, discount: result.discountPercent };
  } catch {
    return null;
  }
}

/** Step 4: price a day, weekly discount, deposit and the rental lengths, checked like the API does. */
export function PriceStep() {
  const t = useTranslations('builder.price');
  const locale = useLocale();
  const { draft, category } = useBuilder();
  const { values } = draft;
  const priceErrors = Object.keys(checkListing(values, 'draft', { category, photoCount: 0 })).filter(
    (field) => ['dailyCents', 'weeklyDiscountPercent', 'depositCents', 'minDays', 'maxDays'].includes(field),
  );
  const ready = values.dailyCents !== null && priceErrors.length === 0;
  const examples = ready
    ? [...new Set([Math.max(1, values.minDays), Math.max(7, values.minDays)])]
        .filter((days) => days <= values.maxDays)
        .map((days) => ({ days, result: payout(values, days) }))
    : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <AmountField field="dailyCents" label={t('daily')} hint={t('dailyHint')} suffix="€" kind="euros" />
        <AmountField
          field="weeklyDiscountPercent"
          label={t('weekly')}
          hint={t('weeklyHint')}
          suffix="%"
          kind="whole"
        />
        <AmountField
          field="depositCents"
          label={t('deposit')}
          hint={t('depositHint')}
          suffix="€"
          kind="euros"
        />
        <div className="hidden sm:block" />
        <AmountField
          field="minDays"
          label={t('minDays')}
          hint={t('daysHint')}
          suffix={t('days')}
          kind="whole"
        />
        <AmountField
          field="maxDays"
          label={t('maxDays')}
          hint={t('daysHint')}
          suffix={t('days')}
          kind="whole"
        />
      </div>

      <section
        aria-label={t('payout')}
        className="bg-sticker-sun rounded-card flex flex-col gap-3 border border-black p-5 text-black"
      >
        <h3 className="text-[13px] font-bold tracking-[0.03em] uppercase">{t('payout')}</h3>
        {examples.length > 0 ? (
          <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {examples.map(({ days, result }) =>
              result ? (
                <div key={days} className="flex flex-col">
                  <dt className="text-sm">{t('payoutFor', { days })}</dt>
                  <dd className="flex flex-wrap items-baseline gap-2">
                    <span className="text-2xl font-bold tabular-nums">
                      {formatEuros(result.cents, locale)}
                    </span>
                    {result.discount > 0 && (
                      <span className="text-sm">{t('payoutDiscount', { percent: result.discount })}</span>
                    )}
                  </dd>
                </div>
              ) : null,
            )}
          </dl>
        ) : (
          <p className="text-sm">{t('payoutWaiting')}</p>
        )}
        <p className="text-sm">{t('payoutNote')}</p>
      </section>
    </div>
  );
}
