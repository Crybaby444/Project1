'use client';

import { useTranslations } from 'next-intl';
import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { useSession } from './SessionProvider';

/** For this long after signing out on purpose, a closed page goes home instead of asking to sign in. */
const LEAVING_MS = 10_000;

/**
 * Shows its children only to a signed-in user. The check runs in the browser: the refresh cookie
 * only travels to /api/v1/auth, so the server cannot renew a session while rendering a page.
 * A visitor goes to /login and comes back here afterwards; someone who just signed out goes home.
 */
export function RequireSession({
  children,
  className = '',
}: {
  children: ReactNode;
  /** Around the skeleton. */ className?: string;
}) {
  const { status, endedAt } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations('session');

  useEffect(() => {
    if (status !== 'anonymous') return;
    const justSignedOut = endedAt !== null && Date.now() - endedAt < LEAVING_MS;
    router.replace(justSignedOut ? '/' : `/login?next=${encodeURIComponent(pathname)}`);
  }, [status, endedAt, pathname, router]);

  if (status === 'authenticated') return children;

  return (
    <div
      data-testid="session-skeleton"
      aria-busy="true"
      aria-live="polite"
      className={`flex flex-col gap-4 ${className}`}
    >
      <span className="sr-only">{t('loading')}</span>
      <div aria-hidden="true" className="rounded-pill bg-mist h-8 w-48 animate-pulse" />
      <div
        aria-hidden="true"
        className="rounded-media border-ink/20 bg-surface h-40 w-full animate-pulse border"
      />
      <div
        aria-hidden="true"
        className="rounded-media border-ink/20 bg-surface h-40 w-full animate-pulse border"
      />
    </div>
  );
}
