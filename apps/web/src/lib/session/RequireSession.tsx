'use client';

import { useTranslations } from 'next-intl';
import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { useSession } from './SessionProvider';

/**
 * Shows its children only to a signed-in user. The check runs in the browser: the refresh cookie
 * only travels to /api/v1/auth, so the server cannot renew a session while rendering a page.
 * A visitor goes to /login and comes back here afterwards.
 */
export function RequireSession({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations('session');

  useEffect(() => {
    if (status === 'anonymous') router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [status, pathname, router]);

  if (status === 'authenticated') return children;

  return (
    <div data-testid="session-skeleton" aria-busy="true" aria-live="polite" className="flex flex-col gap-4">
      <span className="sr-only">{t('loading')}</span>
      <div aria-hidden="true" className="rounded-pill bg-mist h-8 w-48 animate-pulse" />
      <div
        aria-hidden="true"
        className="rounded-card-xl border-ink/20 bg-surface h-40 w-full animate-pulse border"
      />
      <div
        aria-hidden="true"
        className="rounded-card-xl border-ink/20 bg-surface h-40 w-full animate-pulse border"
      />
    </div>
  );
}
