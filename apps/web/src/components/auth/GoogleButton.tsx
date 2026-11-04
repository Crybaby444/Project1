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

/** "Continue with Google", only where this deployment offers it (GET /auth/providers). */
export function GoogleButton({ next }: { next: string | null }) {
  const t = useTranslations('auth');
  const locale = useLocale();
  const client = useApiClient();
  const providers = useQuery({
    queryKey: ['auth', 'providers'],
    queryFn: () => unwrap(client.GET('/api/v1/auth/providers')),
    staleTime: 5 * 60_000,
  });

  if (!providers.data?.google) return null;

  const href = `/api/v1/auth/google?returnTo=${encodeURIComponent(googleReturnTo(next, locale))}`;
  return (
    <div className="flex flex-col gap-4">
      {/* A plain link: the API answers with a redirect to Google, not with a page. */}
      <a
        href={href}
        className="border-ink bg-surface text-ink hover:bg-mist rounded-pill ease-yoyo inline-flex min-h-12 items-center justify-center gap-3 border px-6 text-[15px] font-bold tracking-[0.03em] transition-[transform,background-color] duration-150 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97]"
      >
        <GoogleMark />
        {t('google')}
      </a>
      <p className="flex items-center gap-3 text-sm font-bold uppercase" aria-hidden="true">
        <span className="bg-ink/25 h-px flex-1" />
        {t('or')}
        <span className="bg-ink/25 h-px flex-1" />
      </p>
    </div>
  );
}
