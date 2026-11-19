'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { RequireSession } from '@/lib/session/RequireSession';
import { useSession } from '@/lib/session/SessionProvider';
import type { ProfileTab } from './profile-tabs';

function Go({ tab, status }: { tab: ProfileTab; status?: string }) {
  const { user } = useSession();
  const router = useRouter();
  useEffect(() => {
    if (!user) return;
    const query = new URLSearchParams();
    if (tab !== 'items') query.set('tab', tab);
    if (status) query.set('status', status);
    const rest = query.toString();
    router.replace(`/u/${user.id}${rest ? `?${rest}` : ''}`);
  }, [user, tab, status, router]);
  return null;
}

/**
 * The old "My items / Favourites / Following / My shops" addresses (owner, 2026-11-19: those pages are
 * not needed, everything lives in the profile): sign in if needed, then the matching tab of your profile.
 */
export function ToMyProfile({ tab, status }: { tab: ProfileTab; status?: string }) {
  return (
    <RequireSession className="page py-10">
      <Go tab={tab} status={status} />
    </RequireSession>
  );
}
