'use client';

import { useTranslations } from 'next-intl';
import { useId } from 'react';
import { Field } from '@/components/ui/Field';
import { INPUT_CLASS } from '@/components/ui/inputs';
import { brandOf, formatCardNumber, formatExpiry, TEST_CARDS, type CardFields, type CardProblem } from '@/lib/deals/card';

export const EMPTY_CARD: CardFields = { number: '', expiry: '', cvc: '', holder: '' };

/**
 * "Test mode" on every card form while payments are simulated (owner's decision, 2026-11-06): no real
 * money moves, and the provider's test numbers are one click away. A sticker band, with words, not
 * just a colour.
 */
export function TestModeNotice({ onUse }: { onUse(number: string): void }) {
  const t = useTranslations('checkout');
  return (
    <section
      aria-labelledby="test-mode"
      data-test-mode=""
      className="rounded-media bg-ink text-canvas flex flex-col gap-2 border border-ink/15 p-4"
    >
      <h3 id="test-mode" className="flex items-center gap-2 text-[13px] font-bold tracking-[0.03em] uppercase">
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 3h6M10 3v6L4.5 18.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3" />
        </svg>
        {t('testMode')}
      </h3>
      <p className="text-sm">{t('testModeBody')}</p>
      <ul aria-label={t('testCards')} className="flex flex-col gap-1">
        {TEST_CARDS.map((card) => (
          <li key={card.key} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
            <span>
              <span className="font-bold tabular-nums">{card.number}</span> · {t(`cards.${card.key}`)}
            </span>
            <button
              type="button"
              onClick={() => onUse(card.number)}
              aria-label={`${t('use')}: ${card.number}, ${t(`cards.${card.key}`)}`}
              className="rounded-pill ease-yoyo min-h-8 border border-canvas/30 bg-canvas text-ink px-3 text-[12px] font-bold tracking-[0.03em] uppercase transition-transform duration-150 hover:-translate-y-0.5 active:scale-[0.96]"
            >
              {t('use')}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

const BRAND_STYLE = {
  visa: 'bg-[var(--glow)] text-black',
  mastercard: 'bg-[var(--danger)] text-black',
  amex: 'bg-ink text-canvas',
} as const;

/**
 * A card form that behaves like a real one: the number groups itself and shows its brand, the expiry
 * gets its slash, autofill works (autocomplete cc-*), and the number never stays longer than the form.
 * Errors are shown only once `showErrors` (after the first try to pay).
 */
export function CardForm({
  value,
  onChange,
  problems,
  showErrors,
  disabled = false,
}: {
  value: CardFields;
  onChange(next: CardFields): void;
  problems: CardProblem;
  showErrors: boolean;
  disabled?: boolean;
}) {
  const t = useTranslations('checkout');
  const id = useId();
  const brand = brandOf(value.number);
  const error = (field: keyof CardFields) => (showErrors && problems[field] ? t(`errors.${problems[field]!}`) : undefined);
  const set = (patch: Partial<CardFields>) => onChange({ ...value, ...patch });

  return (
    <div className="flex flex-col gap-4" data-card-form="">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-number`} className="text-[13px] font-bold tracking-[0.03em] uppercase">
          {t('number')}
        </label>
        <div className="relative">
          <input
            id={`${id}-number`}
            inputMode="numeric"
            autoComplete="cc-number"
            name="cc-number"
            placeholder="1234 1234 1234 1234"
            value={value.number}
            onChange={(event) => set({ number: formatCardNumber(event.target.value) })}
            disabled={disabled}
            aria-invalid={error('number') ? true : undefined}
            aria-describedby={error('number') ? `${id}-number-error` : undefined}
            className={`${INPUT_CLASS} pr-36 tabular-nums tracking-wider`}
          />
          <span
            aria-live="polite"
            className={`rounded-pill pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 border px-2.5 py-0.5 text-[12px] font-bold transition-[opacity,transform] duration-250 ease-yoyo ${
              brand ? `border-ink/15 opacity-100 ${BRAND_STYLE[brand]}` : 'scale-90 border-transparent opacity-0'
            }`}
          >
            {brand ? t(`brand.${brand}`) : ''}
          </span>
        </div>
        {error('number') && (
          <p id={`${id}-number-error`} aria-live="polite" className="flex items-start gap-1.5 text-sm font-bold">
            <span aria-hidden="true" className="bg-[var(--danger)] mt-0.5 inline-block size-4 shrink-0 rounded-full border border-ink/15" />
            {error('number')}
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label={t('expiry')} error={error('expiry')}>
          <input
            inputMode="numeric"
            autoComplete="cc-exp"
            name="cc-exp"
            placeholder="MM / YY"
            value={value.expiry}
            onChange={(event) => set({ expiry: formatExpiry(event.target.value) })}
            disabled={disabled}
            className={`${INPUT_CLASS} tabular-nums`}
          />
        </Field>
        <Field label={t('cvc')} error={error('cvc')}>
          <input
            inputMode="numeric"
            autoComplete="cc-csc"
            name="cc-csc"
            placeholder={brand === 'amex' ? '1234' : '123'}
            maxLength={4}
            value={value.cvc}
            onChange={(event) => set({ cvc: event.target.value.replace(/\D/g, '') })}
            disabled={disabled}
            className={`${INPUT_CLASS} tabular-nums`}
          />
        </Field>
      </div>
      <Field label={t('holder')} error={error('holder')}>
        <input
          autoComplete="cc-name"
          name="cc-name"
          value={value.holder}
          onChange={(event) => set({ holder: event.target.value })}
          disabled={disabled}
          className={INPUT_CLASS}
        />
      </Field>
    </div>
  );
}
