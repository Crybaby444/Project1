'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { myProfileHref } from '@/lib/profile/links';
import { useSession } from '@/lib/session/SessionProvider';

/** Sends a signed-in person to a tab of their own profile; anyone else to sign in. */
export function ToMyProfile({ tab, status }: { tab: string; status?: string }) {
  const { user, status: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (session === 'loading') return;
    router.replace(user ? myProfileHref(user.id, tab, status) : `/login?next=${encodeURIComponent(pathname)}`);
  }, [user, session, tab, status, router, pathname]);
  return <div aria-busy="true" className="page page-y min-h-[50dvh]" />;
}
