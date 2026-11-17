'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { usePathname } from '@/i18n/navigation';
import { useProviders } from '@/lib/auth/providers';
import { useIdentityState } from '@/lib/identity/queries';
import { useSession } from '@/lib/session/SessionProvider';

/**
 * What a signed-in person still needs before they can lend or rent (owner, 2026-11-16), or null when
 * nothing: the two sign-up ticks (Settings → Profile), then an identity confirmed by a moderator.
 */
export function useDealReadiness(): 'ready' | 'profile' | 'identity' | 'pending' | 'unknown' {
  const { status, user } = useSession();
  const providers = useProviders();
  const required = providers.data?.identityRequired ?? true;
  const needsCheck = status === 'authenticated' && !!user && user.role !== 'ADMIN' && required && !user.identityVerified;
  const check = useIdentityState(needsCheck);
  if (status !== 'authenticated' || !user || user.role === 'ADMIN') return 'ready';
  if (!user.adultConfirmed || !user.dataConsent || !user.username) return 'profile';
  if (!providers.data) return 'unknown';
  if (!needsCheck) return 'ready';
  return check.data?.status === 'PENDING' ? 'pending' : 'identity';
}

/** The box shown in place of "Send for review" or "Request to rent" until the person is ready. */
export function IdentityNotice({ action, readiness }: { action: 'lend' | 'rent'; readiness: ReturnType<typeof useDealReadiness> }) {
  const t = useTranslations('identityCheck.notice');
  const pathname = usePathname();
  if (readiness === 'ready' || readiness === 'unknown') return null;
  const href = readiness === 'profile' ? '/settings' : `/verify-identity?next=${encodeURIComponent(pathname)}`;
  return (
    <div role="status" className="border-ink/20 rounded-media flex flex-col items-start gap-3 border p-4" data-identity-notice={readiness}>
      <p className="text-base leading-relaxed">{t(`${readiness}.${action}`)}</p>
      {readiness !== 'pending' && (
        <Button size="md" href={href}>
          {t(`${readiness}.button`)}
        </Button>
      )}
    </div>
  );
}
