'use client';

import { DEFAULT_LOCALE } from '@yoyo/shared';
import { useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { unwrap } from '@/lib/session/api-error';
import { useApiClient } from '@/lib/session/SessionProvider';
import { safeNext } from '@/lib/session/safe-next';

/** The site path (with the language prefix) Google should send the person back to. */
export function googleReturnTo(next: string | null | undefined, locale: string): string {
  const path = safeNext(next);
  if (locale === DEFAULT_LOCALE) return path;
  return path === '/' ? `/${locale}` : `/${locale}${path}`;
}

function GoogleMark() {
  // Google's "G" in its own colours, as Google's sign-in branding asks.
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.7Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9h-4v3.1A12 12 0 0 0 12 24Z"
      />
      <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.7V6.6h-4a12 12 0 0 0 0 10.8l4-3Z" />
      <path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8Z"
      />
    </svg>
  );
}

function AppleMark() {
  // Apple's logo, as its sign-in button guidelines ask (white on the black button).
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5" fill="currentColor">
      <path d="M16.37 12.6c-.02-2.2 1.8-3.26 1.88-3.31-1.03-1.5-2.62-1.7-3.18-1.73-1.35-.14-2.64.8-3.33.8-.69 0-1.74-.78-2.86-.76-1.47.02-2.83.86-3.59 2.17-1.53 2.65-.39 6.57 1.1 8.72.73 1.05 1.6 2.23 2.73 2.19 1.1-.04 1.51-.71 2.84-.71 1.32 0 1.7.71 2.86.69 1.18-.02 1.93-1.07 2.65-2.13.84-1.22 1.18-2.4 1.2-2.46-.03-.01-2.3-.88-2.32-3.49ZM14.2 6.13c.6-.73 1.01-1.75.9-2.76-.87.04-1.92.58-2.54 1.31-.56.64-1.05 1.67-.92 2.66.97.08 1.96-.49 2.56-1.21Z" />
    </svg>
  );
}

const BUTTON =
  'rounded-pill ease-yoyo inline-flex min-h-12 items-center justify-center gap-3 border px-6 text-[15px] font-bold tracking-[0.03em] transition-[transform,background-color] duration-150 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.96]';

/**
 * "Continue with Google" and "Continue with Apple" (owner, 2026-11-16), each only where this deployment
 * offers it (GET /auth/providers); one "or" line under them before the email form.
 */
export function GoogleButton({ next }: { next: string | null }) {
  const t = useTranslations('auth');
  const locale = useLocale();
  const client = useApiClient();
  const providers = useQuery({
    queryKey: ['auth', 'providers'],
    queryFn: () => unwrap(client.GET('/api/v1/auth/providers')),
    staleTime: 5 * 60_000,
  });
  const google = providers.data?.google === true;
  const apple = providers.data?.apple === true;
  if (!google && !apple) return null;

  const returnTo = encodeURIComponent(googleReturnTo(next, locale));
  return (
    <div className="flex flex-col gap-3">
      {/* Plain links: the API answers with a redirect to Google or Apple, not with a page. */}
      {apple && (
        <a href={`/api/v1/auth/apple?returnTo=${returnTo}`} className={`${BUTTON} border-black bg-black text-white hover:bg-black/85`} data-sign-in="apple">
          <AppleMark />
          {t('apple')}
        </a>
      )}
      {google && (
        <a href={`/api/v1/auth/google?returnTo=${returnTo}`} className={`${BUTTON} border-ink bg-surface text-ink hover:bg-mist`} data-sign-in="google">
          <GoogleMark />
          {t('google')}
        </a>
      )}
      <p className="mt-1 flex items-center gap-3 text-sm font-bold uppercase" aria-hidden="true">
        <span className="bg-ink/25 h-px flex-1" />
        {t('or')}
        <span className="bg-ink/25 h-px flex-1" />
      </p>
    </div>
  );
}
