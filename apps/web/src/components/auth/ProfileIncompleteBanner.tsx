'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { useSession } from '@/lib/session/SessionProvider';

/**
 * Google sign-ups and older accounts have not given the two ticks yet (18+, the data consent): renting
 * and lending need them, so a slim bar asks for it on every page until it is given (not on the settings page itself).
 */
export function ProfileIncompleteBanner() {
  const t = useTranslations('identity');
  const { status, user } = useSession();
  const pathname = usePathname();
  if (status !== 'authenticated' || !user || user.role === 'ADMIN') return null;
  if (user.adultConfirmed && user.dataConsent && user.username) return null;
  if (pathname.startsWith('/settings')) return null;
  return (
    <div role="status" className="bg-ink text-canvas flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4 py-2.5 text-center text-sm" data-profile-incomplete="">
      <span>{t('complete')}</span>
      <Link href="/settings" className="font-bold underline decoration-1 underline-offset-4">
        {t('completeLink')}
      </Link>
    </div>
  );
}
