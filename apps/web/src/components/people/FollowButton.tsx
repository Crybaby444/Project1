'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { usePathname } from '@/i18n/navigation';
import { useFollowingIds, useToggleFollow } from '@/lib/people/queries';
import { useSession } from '@/lib/session/SessionProvider';

/**
 * Follow someone (owner, 2026-11-16): their new items reach your bell and your Following feed. A visitor
 * is sent to sign in and back; your own profile has no button. `onChange` lets a counter follow along.
 */
export function FollowButton({ userId, name, onChange }: { userId: string; name: string; onChange?(following: boolean): void }) {
  const t = useTranslations('people');
  const { status, user } = useSession();
  const pathname = usePathname();
  const ids = useFollowingIds();
  const toggle = useToggleFollow(userId);
  if (user?.id === userId) return null;
  if (status !== 'authenticated') {
    return <Button href={`/login?next=${encodeURIComponent(pathname)}`}>{t('follow')}</Button>;
  }
  const following = ids.data?.has(userId) ?? false;
  return (
    <Button
      variant={following ? 'ghost' : 'primary'}
      aria-pressed={following}
      aria-label={following ? t('unfollowName', { name }) : t('followName', { name })}
      onClick={() => {
        toggle.mutate(!following);
        onChange?.(!following);
      }}
      disabled={ids.isPending}
      data-follow={following ? 'on' : 'off'}
    >
      {following ? t('following') : t('follow')}
    </Button>
  );
}
