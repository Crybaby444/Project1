'use client';

import { useQuery } from '@tanstack/react-query';
import { UsernameSchema } from '@yoyo/shared';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useEffect, useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { INPUT_CLASS } from '@/components/ui/inputs';
import { unwrap } from '@/lib/session/api-error';
import { useApiClient } from '@/lib/session/SessionProvider';

/** One tick with its words; the error under it (aria-describedby), the box first for a long label. */
function Tick({ label, error, input }: { label: ReactNode; error?: string | undefined; input: InputHTMLAttributes<HTMLInputElement> }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3 text-[15px] leading-relaxed">
        <input
          id={id}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="accent-ink mt-[3px] size-5 shrink-0 cursor-pointer"
          {...input}
        />
        <span>{label}</span>
      </label>
      {error && (
        <p id={`${id}-error`} className="pl-8 text-[13.5px] text-[var(--danger)]">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * The two ticks that replace the birth date (owner, 2026-11-16): "I am 18 or older" and the consent to the
 * processing of personal data, with a link to the privacy policy. `show` leaves out a tick already given.
 */
export function ConsentTicks({
  adult,
  dataConsent,
  show = { adult: true, dataConsent: true },
}: {
  adult: { input: InputHTMLAttributes<HTMLInputElement>; error?: string | undefined };
  dataConsent: { input: InputHTMLAttributes<HTMLInputElement>; error?: string | undefined };
  show?: { adult: boolean; dataConsent: boolean };
}) {
  const t = useTranslations('identity');
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="sr-only">{t('ticksTitle')}</legend>
      {show.adult && <Tick label={t('adult')} {...adult} />}
      {show.dataConsent && (
        <Tick
          label={
            <>
              {t('dataConsent')}{' '}
              <Link href="/privacy" target="_blank" className="font-bold underline underline-offset-4">
                {t('privacy')}
              </Link>
              .
            </>
          }
          {...dataConsent}
        />
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
