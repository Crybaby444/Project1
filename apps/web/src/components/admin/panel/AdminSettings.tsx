'use client';

import { SETTING_RANGES, type AdminSettings as Settings } from '@yoyo/shared';
import { useFormatter, useNow, useTranslations } from 'next-intl';
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

const GROUPS: { key: 'fees' | 'deals' | 'other'; keys: string[] }[] = [
  { key: 'fees', keys: ['fees.servicePercent', 'fees.promoServicePercent', 'fees.promoServiceUntil'] },
  {
    key: 'deals',
    keys: [
      'booking.requestTtlHours',
      'booking.paymentTtlHours',
      'booking.handoverConfirmHours',
      'booking.returnConfirmHours',
      'booking.inspectionHours',
      'booking.damageReplyHours',
    ],
  },
  { key: 'other', keys: ['booking.maxAdvanceDays', 'review.windowDays'] },
];

const rangeOf = (key: string) => (key in SETTING_RANGES ? SETTING_RANGES[key as RangedKey] : null);

/** Why a draft value cannot be saved, or null. */
function problem(key: string, raw: string): 'range' | null {
  const range = rangeOf(key);
  if (!range) return null;
  const n = Number(raw);
  return raw.trim() === '' || !Number.isInteger(n) || n < range.min || n > range.max ? 'range' : null;
}

/** `YYYY-MM-DD` of a date, in local time. */
const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * Platform settings (owner, 2026-11-26: "more thought-out and more useful"): every deal rule and the fee,
 * each with its unit, its range, what it means in days or euros, a mark when it differs from the default and
 * a way back. The launch offer says whether it is on; the deadlines are drawn as the deal they shape. Edits
 * collect until "Save" (one change, one audit entry), listed old → new above the button.
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
  const format = useFormatter();
  const toast = useToast();
  const save = useSaveAdminSettings();
  /** A value as a person reads it: a date in words, anything else as it is, nothing as a dash. */
  const shown = (key: string, raw: string) =>
    !raw ? '—' : rangeOf(key) ? raw : format.dateTime(new Date(`${raw}T00:00:00`), { day: 'numeric', month: 'long', year: 'numeric' });
  const [draft, setDraft] = useState<Record<string, string>>({});
  const byKey = new Map(data.items.map((i) => [i.key, i]));
  const current = (key: string) => draft[key] ?? String(byKey.get(key)?.value ?? '');
  const dirty = Object.keys(draft).filter((k) => String(byKey.get(k)?.value ?? '') !== draft[k]);
  const invalid = dirty.filter((k) => problem(k, draft[k]!));
  const set = (key: string, value: string) => setDraft((d) => ({ ...d, [key]: value }));
  const undo = (key: string) =>
    setDraft((d) => {
      const { [key]: _, ...rest } = d;
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
      onError: (error) => toast.show(t('failed', { reason: error instanceof ApiError ? error.message : String(error) })),
    });
  }

  const field = (key: string) => {
    const item = byKey.get(key);
    return item ? <Field key={key} item={item} value={current(key)} edited={dirty.includes(key)} onChange={(v) => set(key, v)} onUndo={() => undo(key)} /> : null;
  };

  const panel = (group: (typeof GROUPS)[number]) => (
    <Panel key={group.key} title={t(`group.${group.key}`)}>
      {group.key === 'fees' && <Promo fee={Number(current('fees.servicePercent'))} promo={Number(current('fees.promoServicePercent'))} until={current('fees.promoServiceUntil')} onUntil={(v) => set('fees.promoServiceUntil', v)} />}
      {group.key === 'deals' && <Flow hours={(k) => Number(current(`booking.${k}`))} />}
      <div className="flex flex-col divide-y divide-[color-mix(in_srgb,var(--ink)_10%,transparent)]">{group.keys.map(field)}</div>
    </Panel>
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (dirty.length > 0) submit();
      }}
      className="flex flex-col gap-5"
    >
      {/* Wide screens: two stacks side by side, the short groups (fees, other) on the left and the long one
          (deal deadlines) on the right, so no group leaves a hole under it. */}
      <div className="grid items-start gap-5 xl:grid-cols-2">
        <div className="flex flex-col gap-5">{GROUPS.filter((g) => g.key !== 'deals').map(panel)}</div>
        <div className="flex flex-col gap-5">{GROUPS.filter((g) => g.key === 'deals').map(panel)}</div>
      </div>

      <div className="bg-canvas/90 border-ink/15 sticky bottom-0 -mx-1 flex flex-col gap-3 border-t px-1 py-4 backdrop-blur-md">
        {dirty.length > 0 && (
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0 text-sm" aria-label={t('changes', { count: dirty.length })}>
            {dirty.map((key) => (
              <li key={key} className={`rounded-pill inline-flex items-center gap-2 border px-3 py-1 ${invalid.includes(key) ? 'border-[var(--sticker-ember)]' : 'border-ink/20'}`}>
                <span className="text-ink/75">{t(`key.${key}`)}:</span>
                <span className="tabular-nums">
                  <s className="text-ink/50">{shown(key, String(byKey.get(key)?.value ?? ''))}</s> → <b>{shown(key, draft[key] ?? '')}</b>
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold" role="status">
            {invalid.length > 0 ? t('invalid') : dirty.length > 0 ? t('changes', { count: dirty.length }) : ''}
          </p>
          <div className="flex gap-2">
            {dirty.length > 0 && (
              <Button type="button" variant="ghost" onClick={() => setDraft({})}>
                {t('discard')}
              </Button>
            )}
            <Button type="submit" disabled={dirty.length === 0 || invalid.length > 0} loading={save.isPending}>
              {dirty.length > 0 ? t('saveCount', { count: dirty.length }) : t('save')}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}

function RoundButton({ label, onClick, disabled, children }: { label: string; onClick(): void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="border-ink/25 hover:border-ink ease-yoyo inline-grid size-9 shrink-0 place-items-center rounded-full border transition-[transform,border-color] duration-150 active:scale-90 disabled:opacity-30"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:2]">
        {children}
      </svg>
    </button>
  );
}

/** One setting: its name and default, a stepper with the unit, what the value means, and the ways back. */
function Field({ item, value, edited, onChange, onUndo }: { item: Item; value: string; edited: boolean; onChange(v: string): void; onUndo(): void }) {
  const t = useTranslations('admin.settings');
  const range = rangeOf(item.key);
  const id = `setting-${item.key}`;
  const bad = edited && problem(item.key, value) !== null;
  const n = Number(value);
  const step = (by: number) => {
    if (!range) return;
    const base = Number.isFinite(n) ? n : Number(item.default);
    onChange(String(Math.min(range.max, Math.max(range.min, base + by))));
  };
  const differsFromDefault = String(item.value) !== String(item.default) || (edited && value !== String(item.default));

  return (
    <div className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-6">
      <div className="min-w-0">
        <label htmlFor={id} className="font-semibold">
          {t(`key.${item.key}`)}
        </label>
        <p className="text-ink/65 text-sm">
          {t('default', { value: String(item.default) || '—' })}
          {range && <span className="text-ink/45"> · {t('range', { min: range.min, max: range.max })}</span>}
        </p>
        {t.has(`hint.${item.key}`) && <p className="text-ink/65 text-sm">{t(`hint.${item.key}`)}</p>}
        <Meaning itemKey={item.key} value={n} />
      </div>
      <div className="flex flex-col items-stretch gap-1.5 sm:w-[15rem]">
        <div className="flex items-center gap-2">
          {range && (
            <RoundButton label={t('less')} onClick={() => step(-1)} disabled={Number.isFinite(n) && n <= range.min}>
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
              className={`${INPUT_CLASS} tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none ${range ? 'pr-12 text-center' : ''} ${
                bad ? 'border-[var(--sticker-ember)]' : edited ? 'border-[rgb(var(--admin-light))] shadow-[0_0_0_3px_rgb(var(--admin-light)/0.18)]' : ''
              }`}
            />
            {range && (
              <span aria-hidden="true" className="text-ink/55 pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-semibold">
                {t(`unit.${range.unit}`)}
              </span>
            )}
          </div>
          {range && (
            <RoundButton label={t('more')} onClick={() => step(1)} disabled={Number.isFinite(n) && n >= range.max}>
              <path d="M12 6v12M6 12h12" />
            </RoundButton>
          )}
        </div>
        <div className="flex min-h-6 items-center justify-end gap-3 text-xs font-semibold">
          {bad && range && (
            <span id={`${id}-error`} className="mr-auto text-[var(--sticker-ember)]">
              {t('range', { min: range.min, max: range.max })}
            </span>
          )}
          {edited && (
            <button type="button" onClick={onUndo} className="text-ink/70 hover:text-ink underline decoration-1 underline-offset-2" aria-label={`${t('undo')}: ${t(`key.${item.key}`)}`}>
              {t('was', { value: String(item.value) || '—' })} ↺
            </button>
          )}
          {differsFromDefault && value !== String(item.default) && (
            <button type="button" onClick={() => onChange(String(item.default))} className="text-ink/70 hover:text-ink underline decoration-1 underline-offset-2">
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
  if (range.unit === 'hours' && value >= 24 && value % 24 === 0) text = t('asDays', { days: value / 24 });
  else if (range.unit === 'days' && value >= 60) text = t('asMonths', { months: Math.round(value / 30.4) });
  else if (range.unit === 'percent') text = t('feeExample', { rent: money(10_000), fee: money(value * 100) });
  return text ? <p className="mt-1 text-sm font-semibold text-[rgb(var(--admin-light))]">{text}</p> : null;
}

/** The launch offer at a glance: on (until when, how many days left), over, or none, with quick dates. */
function Promo({ fee, promo, until, onUntil }: { fee: number; promo: number; until: string; onUntil(v: string): void }) {
  const t = useTranslations('admin.settings.promo');
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const today = isoDay(now);
  const end = until ? new Date(`${until}T00:00:00`) : null;
  const days = end ? Math.ceil((end.getTime() - new Date(`${today}T00:00:00`).getTime()) / 86_400_000) : 0;
  const date = end ? format.dateTime(end, { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const state = !end ? 'none' : days >= 0 ? 'active' : 'over';
  const plus = (months: number) => {
    const from = end && days >= 0 ? new Date(end) : new Date(`${today}T00:00:00`);
    from.setMonth(from.getMonth() + months);
    onUntil(isoDay(from));
  };
  const chip = 'border-ink/25 hover:border-ink rounded-pill min-h-8 border px-3 text-xs font-bold transition-colors';
  return (
    <div className={`rounded-media flex flex-col gap-3 border p-4 ${state === 'active' ? 'border-[rgb(var(--admin-light)/0.5)]' : 'border-ink/15'}`}>
      <p className="flex items-start gap-2 text-sm font-semibold">
        <span aria-hidden="true" className={`mt-1.5 inline-block size-2 shrink-0 rounded-full ${state === 'active' ? 'bg-[rgb(var(--admin-light))]' : 'bg-ink/30'}`} />
        {state === 'none' ? t('none', { fee }) : state === 'active' ? t('active', { date, promo, fee, days }) : t('over', { date, fee })}
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={chip} onClick={() => plus(1)}>
          {t('plus1')}
        </button>
        <button type="button" className={chip} onClick={() => plus(3)}>
          {t('plus3')}
        </button>
        {until && (
          <button type="button" className={chip} onClick={() => onUntil('')}>
            {t('clear')}
          </button>
        )}
      </div>
    </div>
  );
}

/** The deadlines as the deal they shape: each step, then the time the next person has, live as you edit. */
function Flow({ hours }: { hours: (key: string) => number }) {
  const t = useTranslations('admin.settings');
  const unit = t('unit.hours');
  const steps: { label: string; wait?: { key: string; label: string } }[] = [
    { label: t('flow.request'), wait: { key: 'requestTtlHours', label: t('flow.answer') } },
    { label: '', wait: { key: 'paymentTtlHours', label: t('flow.pay') } },
    { label: t('flow.handover'), wait: { key: 'handoverConfirmHours', label: t('flow.handoverObject') } },
    { label: t('flow.return'), wait: { key: 'returnConfirmHours', label: t('flow.returnObject') } },
    { label: '', wait: { key: 'inspectionHours', label: t('flow.inspect') } },
    { label: '', wait: { key: 'damageReplyHours', label: t('flow.damage') } },
  ];
  return (
    <figure className="m-0 flex flex-col gap-3">
      <figcaption className="text-ink/60 text-xs font-bold tracking-[0.04em] uppercase">{t('flow.title')}</figcaption>
      <ol className="m-0 flex list-none flex-wrap items-center gap-x-1.5 gap-y-2 p-0 text-xs">
        {steps.map((s, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {s.label && <span className="bg-ink text-canvas rounded-pill px-2.5 py-1 font-bold first-letter:uppercase">{s.label}</span>}
            {s.wait && (
              <span className="border-ink/20 rounded-pill inline-flex items-center gap-1.5 border px-2.5 py-1">
                <span className="text-ink/70">{s.wait.label}</span>
                <b className="tabular-nums text-[rgb(var(--admin-light))]">
                  {Number.isFinite(hours(s.wait.key)) ? hours(s.wait.key) : '—'} {unit}
                </b>
              </span>
            )}
            {i < steps.length - 1 && (
              <span aria-hidden="true" className="text-ink/35">
                →
              </span>
            )}
          </li>
        ))}
      </ol>
    </figure>
  );
}
