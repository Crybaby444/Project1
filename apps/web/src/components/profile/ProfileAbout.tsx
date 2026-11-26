'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useSession } from '@/lib/session/SessionProvider';

/**
 * A few words about the person, inside the profile's band (owner, 2026-11-26: one style for every block; a
 * separate huge "About" heading over one short line read as a mistake). Your own profile without them asks
 * for them, with a link to where they are written.
 */
export function ProfileAbout({ userId, about }: { userId: string; about: string | null }) {
  const t = useTranslations('profile');
  const { user } = useSession();
  if (about) {
    return <p className="max-w-[60ch] text-base leading-relaxed whitespace-pre-line text-[var(--paper)]/85 [overflow-wrap:anywhere]">{about}</p>;
  }
  if (user?.id !== userId) return null;
  return (
    <Link href="/settings" className="self-start text-sm font-semibold text-[var(--paper)]/70 underline decoration-1 underline-offset-4 hover:text-[var(--paper)]">
      {t('addAbout')}
    </Link>
  );
}
