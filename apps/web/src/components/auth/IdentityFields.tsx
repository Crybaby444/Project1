'use client';

import { useQuery } from '@tanstack/react-query';
import { UsernameSchema } from '@yoyo/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useId, useState } from 'react';
import { Select } from '@/components/ui/Select';
import { INPUT_CLASS } from '@/components/ui/inputs';
import { unwrap } from '@/lib/session/api-error';
import { useApiClient } from '@/lib/session/SessionProvider';

/**
 * The birth date as day, month (the site's own Select) and year — no browser date picker — reported as
 * YYYY-MM-DD once all three make a date, '' until then.
 */
export function BirthDateField({ value, onChange, error }: { value: string; onChange(v: string): void; error?: string | undefined }) {
  const t = useTranslations('identity');
  const locale = useLocale();
  const id = useId();
  const [y0, m0, d0] = value ? value.split('-') : ['', '', ''];
  const [day, setDay] = useState(d0 ? String(Number(d0)) : '');
  const [month, setMonth] = useState(m0 ? String(Number(m0)) : '');
  const [year, setYear] = useState(y0 ?? '');
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2000, i, 1))),
  }));
  function report(d: string, m: string, y: string) {
    if (d && m && /^\d{4}$/.test(y)) onChange(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
    else onChange('');
  }
  const errorId = error ? `${id}-error` : undefined;
  return (
    <fieldset className="flex flex-col gap-1.5" aria-describedby={errorId}>
      <legend className="mb-1.5 text-[13px] font-bold tracking-[0.03em] uppercase">{t('birthDate')}</legend>
      <div className="grid grid-cols-[5rem_minmax(0,1fr)_6.5rem] items-center gap-2">
        <input
          aria-label={t('day')}
          inputMode="numeric"
          autoComplete="bday-day"
          placeholder={t('dayPlaceholder')}
          maxLength={2}
          value={day}
          aria-invalid={error ? true : undefined}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '');
            setDay(v);
            report(v, month, year);
          }}
          className={INPUT_CLASS}
        />
        <label htmlFor={`${id}-month`} className="sr-only">
          {t('month')}
        </label>
        <Select
          id={`${id}-month`}
          value={month}
          placeholder={t('month')}
          aria-invalid={error ? true : undefined}
          onChange={(v) => {
            setMonth(v);
            report(day, v, year);
          }}
          options={months}
        />
        <input
          aria-label={t('year')}
          inputMode="numeric"
          autoComplete="bday-year"
          placeholder={t('yearPlaceholder')}
          maxLength={4}
          value={year}
          aria-invalid={error ? true : undefined}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '');
            setYear(v);
            report(day, month, v);
          }}
          className={INPUT_CLASS}
        />
      </div>
      <p className="text-ink/70 text-[13px]">{t('birthHint')}</p>
      {error && (
        <p id={errorId} className="text-sm font-bold">
          {error}
        </p>
      )}
    </fieldset>
  );
}

/** As you type a username: is it free? (asked once it is valid, after a short pause) */
export function UsernameStatus({ username, current }: { username: string; current?: string | null }) {
  const t = useTranslations('identity');
  const client = useApiClient();
  const [debounced, setDebounced] = useState(username);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(username), 350);
    return () => clearTimeout(timer);
  }, [username]);
  const parsed = UsernameSchema.safeParse(debounced);
  const check = useQuery({
    queryKey: ['username-available', parsed.success ? parsed.data : ''] as const,
    queryFn: async () => unwrap(client.GET('/api/v1/auth/username-available', { params: { query: { username: parsed.success ? parsed.data : '' } } })),
    enabled: parsed.success && parsed.data !== current,
    staleTime: 30_000,
  });
  if (!parsed.success || parsed.data === current || !check.data) return null;
  return (
    <p aria-live="polite" className="text-[13px] font-bold" data-username-status={check.data.available ? 'free' : 'taken'}>
      {check.data.available ? t('usernameFree', { username: parsed.data }) : t('usernameTaken')}
    </p>
  );
}
