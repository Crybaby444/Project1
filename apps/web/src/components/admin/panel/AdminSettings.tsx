'use client';

import { SETTING_RANGES, type AdminSettings as Settings } from '@yoyo/shared';
import { useFormatter, useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { INPUT_CLASS } from '@/components/ui/inputs';
import { useToast } from '@/components/ui/Toast';
import { useAdminSettings, useSaveAdminSettings } from '@/lib/admin/queries';
import { useMoney } from '@/lib/deals/money';
import { ApiError } from '@/lib/session/api-error';
import { AdminPageHeader, Panel } from './parts';

type RangedKey = keyof typeof SETTING_RANGES;
type Item = Settings['items'][number];

/** The groups beside the deal: what the platform charges, which deals ask for more checks, reviews. */
const SIDE: { key: 'fees' | 'checks' | 'reviews'; keys: string[] }[] = [
  { key: 'fees', keys: ['fees.servicePercent', 'fees.welcomeDays'] },
  { key: 'checks', keys: ['checks.highValueDepositEur', 'checks.highValueRentEur'] },
  { key: 'reviews', keys: ['review.windowDays'] },
];

/** The deal's deadlines in the order a deal meets them (owner, 2026-11-26: the deadlines read like the deal). */
const PHASES: { key: 'booking' | 'handover' | 'return'; keys: string[] }[] = [
  { key: 'booking', keys: ['booking.requestTtlHours', 'booking.paymentTtlHours', 'booking.maxAdvanceDays'] },
  { key: 'handover', keys: ['booking.handoverConfirmHours'] },
  {
    key: 'return',
    keys: ['booking.returnConfirmHours', 'booking.inspectionHours', 'booking.damageReplyHours'],
  },
];

const rangeOf = (key: string) => (key in SETTING_RANGES ? SETTING_RANGES[key as RangedKey] : null);

/** Why a draft value cannot be saved, or null. */
function problem(key: string, raw: string): 'range' | null {
  const range = rangeOf(key);
  if (!range) return null;
  const n = Number(raw);
  return raw.trim() === '' || !Number.isInteger(n) || n < range.min || n > range.max ? 'range' : null;
}

/**
 * Platform settings (owner, 2026-11-26: "more thought-out and more useful"): every deal rule and the fee,
 * each with its unit, its range, what it means in days or euros, a mark when it differs from the default and
 * a way back. The deal's deadlines are grouped by its phases (booking, handover, return and deposit); beside
 * them the fee with a new account's free first days, the thresholds of high-value deals and the review
 * window. Edits collect until "Save" (one change, one audit entry), listed old → new above the button.
 */
export function AdminSettings() {
  const t = useTranslations('admin');
  const settings = useAdminSettings();
  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader title={t('settings.title')} note={t('settings.intro')} />
      {settings.isPending ? (
        <div aria-busy="true" className="bg-mist rounded-media h-96 animate-pulse" />
      ) : settings.isError ? (
        <div role="alert" className="flex flex-col items-start gap-3">
          <p>{t('common.loadFailed')}</p>
          <Button variant="ghost" onClick={() => void settings.refetch()}>
            {t('common.retry')}
          </Button>
        </div>
      ) : (
        <Form data={settings.data} />
      )}
    </div>
  );
}

function Form({ data }: { data: Settings }) {
  const t = useTranslations('admin.settings');
  const toast = useToast();
  const save = useSaveAdminSettings();
  /** A value as a person reads it: with its unit, nothing as a dash. */
  const shown = (key: string, raw: string) => {
    const range = rangeOf(key);
    return !raw ? '—' : range ? `${raw} ${t(`unit.${range.unit}`)}` : raw;
  };
  const [draft, setDraft] = useState<Record<string, string>>({});
  const byKey = new Map(data.items.map((i) => [i.key, i]));
  const current = (key: string) => draft[key] ?? String(byKey.get(key)?.value ?? '');
  const dirty = Object.keys(draft).filter((k) => String(byKey.get(k)?.value ?? '') !== draft[k]);
  const invalid = dirty.filter((k) => problem(k, draft[k]!));
  const set = (key: string, value: string) => setDraft((d) => ({ ...d, [key]: value }));
  const undo = (key: string) =>
    setDraft((d) => {
      const rest = { ...d };
      delete rest[key];
      return rest;
    });

  function submit() {
    if (invalid.length > 0) return;
    const change: Record<string, number | string> = {};
    for (const key of dirty) {
      const item = byKey.get(key)!;
      change[key] = typeof item.default === 'number' ? Number(draft[key]) : draft[key]!.trim();
    }
    save.mutate(change, {
      onSuccess: () => {
        setDraft({});
        toast.show(t('saved'));
      },
      onError: (error) =>
        toast.show(t('failed', { reason: error instanceof ApiError ? error.message : String(error) })),
    });
  }

  const field = (key: string) => {
    const item = byKey.get(key);
    return item ? (
      <Field
        key={key}
        item={item}
        value={current(key)}
        edited={dirty.includes(key)}
        onChange={(v) => set(key, v)}
        onUndo={() => undo(key)}
      />
    ) : null;
  };

  const rows = (keys: string[]) => (
    <div className="flex flex-col divide-y divide-[color-mix(in_srgb,var(--ink)_10%,transparent)]">
      {keys.map(field)}
    </div>
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (dirty.length > 0) submit();
      }}
      className="flex flex-col gap-5"
    >
      {/* Wide screens: the deal's deadlines on the right, phase by phase; the fee, the checks and the
          reviews stacked on the left. */}
      <div className="grid items-start gap-5 xl:grid-cols-2">
        <div className="flex flex-col gap-5">
          {SIDE.map((group) => (
            <Panel key={group.key} title={t(`group.${group.key}`)}>
              <p className="text-ink/65 -mt-2 text-sm">{t(`groupNote.${group.key}`)}</p>
              {rows(group.keys)}
            </Panel>
          ))}
        </div>
        <Panel title={t('group.deals')}>
          <ol className="m-0 flex list-none flex-col gap-6 p-0">
            {PHASES.map((phase, i) => (
              <li key={phase.key} className="flex flex-col gap-1">
                <h3 className="flex items-center gap-3 text-base font-bold">
                  <span
                    aria-hidden="true"
                    className="border-ink/30 font-display grid size-7 shrink-0 place-items-center rounded-full border text-sm tabular-nums"
                  >
                    {i + 1}
                  </span>
                  {t(`phase.${phase.key}.title`)}
                </h3>
                <p className="text-ink/65 pl-10 text-sm">{t(`phase.${phase.key}.note`)}</p>
                <div>{rows(phase.keys)}</div>
              </li>
            ))}
          </ol>
        </Panel>
      </div>

      <div className="bg-canvas/90 border-ink/15 sticky bottom-0 -mx-1 flex flex-col gap-3 border-t px-1 py-4 backdrop-blur-md">
        {dirty.length > 0 && (
          <ul
            className="m-0 flex list-none flex-wrap gap-2 p-0 text-sm"
            aria-label={t('changes', { count: dirty.length })}
          >
            {dirty.map((key) => (
              <li
                key={key}
                className={`rounded-pill inline-flex items-center gap-2 border px-3 py-1 ${invalid.includes(key) ? 'border-[var(--sticker-ember)]' : 'border-ink/20'}`}
              >
                <span className="text-ink/75">{t(`key.${key}`)}:</span>
                <span className="tabular-nums">
                  <s className="text-ink/50">{shown(key, String(byKey.get(key)?.value ?? ''))}</s> →{' '}
                  <b>{shown(key, draft[key] ?? '')}</b>
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold" role="status">
            {invalid.length > 0
              ? t('invalid')
              : dirty.length > 0
                ? t('changes', { count: dirty.length })
                : ''}
          </p>
          <div className="flex gap-2">
            {dirty.length > 0 && (
              <Button type="button" variant="ghost" onClick={() => setDraft({})}>
                {t('discard')}
              </Button>
            )}
            <Button
              type="submit"
              disabled={dirty.length === 0 || invalid.length > 0}
              loading={save.isPending}
            >
              {dirty.length > 0 ? t('saveCount', { count: dirty.length }) : t('save')}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}

function RoundButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick(): void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="border-ink/25 hover:border-ink ease-yoyo inline-grid size-9 shrink-0 place-items-center rounded-full border transition-[transform,border-color] duration-150 active:scale-90 disabled:opacity-30"
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="size-4 fill-none stroke-current [stroke-width:2] [stroke-linecap:round] [stroke-linejoin:round]"
      >
        {children}
      </svg>
    </button>
  );
}

/** One setting: its name and default, a stepper with the unit, what the value means, and the ways back. */
function Field({
  item,
  value,
  edited,
  onChange,
  onUndo,
}: {
  item: Item;
  value: string;
  edited: boolean;
  onChange(v: string): void;
  onUndo(): void;
}) {
  const t = useTranslations('admin.settings');
  const format = useFormatter();
  const range = rangeOf(item.key);
  const id = `setting-${item.key}`;
  const between = range ? t('range', { min: format.number(range.min), max: format.number(range.max) }) : '';
  const bad = edited && problem(item.key, value) !== null;
  const n = Number(value);
  const step = (by: number) => {
    if (!range) return;
    const base = Number.isFinite(n) ? n : Number(item.default);
    onChange(String(Math.min(range.max, Math.max(range.min, base + by))));
  };
  const differsFromDefault =
    String(item.value) !== String(item.default) || (edited && value !== String(item.default));

  return (
    <div className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-6">
      <div className="min-w-0">
        <label htmlFor={id} className="font-semibold">
          {t(`key.${item.key}`)}
        </label>
        <p className="text-ink/65 text-sm">
          {t('default', { value: String(item.default) || '—' })}
          {range && <span className="text-ink/45 whitespace-nowrap"> · {between}</span>}
        </p>
        {t.has(`hint.${item.key}`) && <p className="text-ink/65 text-sm">{t(`hint.${item.key}`)}</p>}
        <Meaning itemKey={item.key} value={n} />
      </div>
      <div className="flex flex-col items-stretch gap-1.5 sm:w-[13.5rem]">
        <div className="flex items-center gap-2">
          {range && (
            <RoundButton
              label={t('less')}
              onClick={() => step(-1)}
              disabled={Number.isFinite(n) && n <= range.min}
            >
              <path d="M6 12h12" />
            </RoundButton>
          )}
          <div className="relative min-w-0 flex-1">
            <input
              id={id}
              type={range ? 'number' : 'date'}
              inputMode={range ? 'numeric' : undefined}
              min={range?.min}
              max={range?.max}
              value={value}
              aria-invalid={bad || undefined}
              aria-describedby={bad ? `${id}-error` : undefined}
              onChange={(e) => onChange(e.target.value)}
              className={`${INPUT_CLASS} [appearance:textfield] tabular-nums [&::-webkit-inner-spin-button]:appearance-none ${range ? 'pr-12 text-center' : ''} ${
                bad
                  ? 'border-[var(--sticker-ember)]'
                  : edited
                    ? 'border-[rgb(var(--admin-light))] shadow-[0_0_0_3px_rgb(var(--admin-light)/0.18)]'
                    : ''
              }`}
            />
            {range && (
              <span
                aria-hidden="true"
                className="text-ink/55 pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-semibold"
              >
                {t(`unit.${range.unit}`)}
              </span>
            )}
          </div>
          {range && (
            <RoundButton
              label={t('more')}
              onClick={() => step(1)}
              disabled={Number.isFinite(n) && n >= range.max}
            >
              <path d="M12 6v12M6 12h12" />
            </RoundButton>
          )}
        </div>
        <div className="flex min-h-6 items-center justify-end gap-3 text-xs font-semibold">
          {bad && range && (
            <span id={`${id}-error`} className="mr-auto text-[var(--sticker-ember)]">
              {between}
            </span>
          )}
          {edited && (
            <button
              type="button"
              onClick={onUndo}
              className="text-ink/70 hover:text-ink underline decoration-1 underline-offset-2"
              aria-label={`${t('undo')}: ${t(`key.${item.key}`)}`}
            >
              {t('was', { value: String(item.value) || '—' })} ↺
            </button>
          )}
          {differsFromDefault && value !== String(item.default) && (
            <button
              type="button"
              onClick={() => onChange(String(item.default))}
              className="text-ink/70 hover:text-ink underline decoration-1 underline-offset-2"
            >
              {t('reset')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** What a value means in plain terms: hours as days, long day spans as months, a fee on a 100 € rental. */
function Meaning({ itemKey, value }: { itemKey: string; value: number }) {
  const t = useTranslations('admin.settings');
  const money = useMoney();
  const range = rangeOf(itemKey);
  if (!range || !Number.isFinite(value) || value < range.min || value > range.max) return null;
  let text: string | null = null;
  if (itemKey === 'fees.welcomeDays' && value === 0) text = t('off');
  else if (range.unit === 'hours' && value >= 24 && value % 24 === 0)
    text = t('asDays', { days: value / 24 });
  else if (range.unit === 'days' && value >= 28)
    text = t('asMonths', { months: Math.max(1, Math.round(value / 30.4)) });
  else if (range.unit === 'percent') text = t('feeExample', { rent: money(10_000), fee: money(value * 100) });
  return text ? <p className="mt-1 text-sm font-semibold text-[rgb(var(--admin-light))]">{text}</p> : null;
}
