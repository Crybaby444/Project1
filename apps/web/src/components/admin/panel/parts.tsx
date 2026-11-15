'use client';

import { useTranslations } from 'next-intl';
import { useId, type ReactNode } from 'react';
import { Select, type SelectOption } from '@/components/ui/Select';

/** Admin tables: hairline rows, small caps headers, numbers in tabular figures. */
export const TABLE_CLASS = 'w-full min-w-[720px] border-collapse text-left text-[15px]';
export const TH = 'border-ink/15 text-ink/70 border-b px-4 py-3 text-[12px] font-bold tracking-[0.04em] uppercase';
export const TD = 'border-ink/10 border-b px-4 py-3 align-middle';

export function AdminPageHeader({ title, note, action }: { title: string; note?: string; action?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-[clamp(2.6rem,5vw,4.2rem)] leading-[0.92] font-black uppercase">{title}</h1>
        {note && <p className="text-ink/70 text-sm font-semibold">{note}</p>}
      </div>
      {action}
    </header>
  );
}

/** Previous / next with "Page 2 of 5"; nothing when there is one page. */
export function Pager({ page, pages, onPage }: { page: number; pages: number; onPage(page: number): void }) {
  const t = useTranslations('admin.common');
  if (pages <= 1) return null;
  const button = 'border-ink rounded-pill min-h-10 border px-4 text-[13px] font-bold tracking-[0.03em] uppercase disabled:opacity-40';
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
export function Panel({ title, children, className = '' }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={`border-ink/15 rounded-media flex flex-col gap-4 border p-5 sm:p-6 ${className}`}>
      <h2 className="text-ink/70 text-[13px] font-bold tracking-[0.04em] uppercase">{title}</h2>
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
      <Select id={id} value={value} options={options} onChange={onChange} disabled={disabled} className={className} />
    </div>
  );
}
