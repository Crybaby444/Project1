'use client';

import { useTranslations } from 'next-intl';
import { useId, type ReactNode } from 'react';
import { Select, type SelectOption } from '@/components/ui/Select';
import { useCountUp } from '@/lib/motion/use-count-up';

/** Admin tables: hairline rows, small caps headers, numbers in tabular figures. */
export const TABLE_CLASS = 'w-full min-w-[720px] border-collapse text-left text-base';
export const TH =
  'border-ink/15 text-ink/70 border-b px-4 py-3 text-xs font-bold tracking-[0.04em] uppercase';
export const TD = 'border-ink/10 border-b px-4 py-3 align-middle';

export function AdminPageHeader({
  title,
  note,
  count,
  action,
}: {
  title: string;
  note?: string;
  count?: number;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-2">
        <h1 className="font-display text-display-l flex flex-wrap items-baseline gap-x-4 leading-[0.92] font-black uppercase">
          {title}
          {/* How many there are, beside the title (owner, 2026-11-26: not a stray total line under it). */}
          {count !== undefined && (
            <span className="border-ink/20 rounded-pill inline-flex min-h-9 -translate-y-1.5 items-center border px-3 font-sans text-base font-bold tracking-normal normal-case tabular-nums">
              <CountUp value={count} />
            </span>
          )}
        </h1>
        {note && <p className="text-ink/70 max-w-[70ch] text-sm leading-relaxed font-semibold">{note}</p>}
      </div>
      {action}
    </header>
  );
}

/**
 * An empty list of the panel: the site's empty state on the panel's glass (DESIGN.md "Surfaces"): a small
 * still mark in its square, what is empty at the block step, and, if useful, what to do.
 */
export function AdminEmpty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="admin-glass border-ink/15 rounded-media flex flex-col items-start gap-4 border p-5 sm:flex-row sm:items-center sm:gap-5 sm:p-6">
      <span aria-hidden="true" className="border-ink/15 text-ink/60 rounded-tile grid size-12 shrink-0 place-items-center border">
        <svg viewBox="0 0 24 24" className="size-6 fill-none stroke-current [stroke-width:1.6] [stroke-linecap:round] [stroke-linejoin:round]">
          <path d="M4 7h16M4 12h10M4 17h7" />
        </svg>
      </span>
      <div className="flex min-w-0 flex-col gap-1.5">
        <h2 className="type-block">{title}</h2>
        {hint && <p className="text-ink/70 max-w-read text-sm leading-relaxed">{hint}</p>}
      </div>
    </div>
  );
}

export function Pager({ page, pages, onPage }: { page: number; pages: number; onPage(page: number): void }) {
  const t = useTranslations('admin.common');
  if (pages <= 1) return null;
  const button =
    'border-ink rounded-pill min-h-10 border px-4 text-sm font-bold tracking-[0.03em] uppercase disabled:opacity-40';
  return (
    <nav aria-label={t('page', { page, pages })} className="flex items-center justify-between gap-3">
      <button type="button" className={button} disabled={page <= 1} onClick={() => onPage(page - 1)}>
        ← {t('prev')}
      </button>
      <span className="text-sm font-semibold tabular-nums">{t('page', { page, pages })}</span>
      <button type="button" className={button} disabled={page >= pages} onClick={() => onPage(page + 1)}>
        {t('next')} →
      </button>
    </nav>
  );
}

/** A titled block of the deal page and the money page. */
export function Panel({
  title,
  children,
  className = '',
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`admin-glass border-ink/15 rounded-media flex flex-col gap-4 border p-5 sm:p-6 ${className}`}
    >
      <h2 className="text-ink/70 type-label">{title}</h2>
      {children}
    </section>
  );
}

/**
 * The admin panel's dropdown: the site's own Select (owner, 2026-11-16: no browser-native lists), with a
 * visible or screen-reader-only label.
 */
export function AdminSelect({
  label,
  hideLabel = false,
  value,
  options,
  onChange,
  disabled,
  className = 'min-w-48',
}: {
  label: string;
  hideLabel?: boolean;
  value: string;
  options: SelectOption[];
  onChange(value: string): void;
  disabled?: boolean;
  className?: string;
}) {
  const id = useId();
  return (
    <div className="flex items-center gap-2 text-sm font-semibold">
      <label htmlFor={id} className={hideLabel ? 'sr-only' : undefined}>
        {label}
      </label>
      <Select
        id={id}
        value={value}
        options={options}
        onChange={onChange}
        disabled={disabled}
        className={className}
      />
    </div>
  );
}

/** A whole number (or, with `format`, money or a percentage) that counts up as it arrives. */
export function CountUp({ value, format }: { value: number; format?: (n: number) => string }) {
  const shown = Math.round(useCountUp(value));
  return <>{format ? format(shown) : shown}</>;
}

/** One figure of a page's summary row: its name, the figure, a note or two, and room for a small drawing. */
export function StatCard({
  label,
  value,
  notes = [],
  children,
}: {
  label: string;
  value: ReactNode;
  notes?: string[];
  children?: ReactNode;
}) {
  return (
    <div className="admin-glass border-ink/15 rounded-media @container flex min-w-0 flex-col gap-1 border p-5">
      <dt className="text-ink/70 text-sm font-semibold">{label}</dt>
      {/* The figure keeps to one line and shrinks with its card (five across on a laptop, two on a phone). */}
      <dd className="font-display text-[clamp(1.375rem,13cqi,var(--text-display-m))] leading-none font-black whitespace-nowrap tabular-nums">{value}</dd>
      {notes.map((note) => (
        <dd key={note} className="text-ink/70 text-sm">
          {note}
        </dd>
      ))}
      {children && <dd className="mt-auto pt-3">{children}</dd>}
    </div>
  );
}
