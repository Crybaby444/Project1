'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { adminMayStay } from './admin-only';
import { useSession } from './SessionProvider';

/** Sends a signed-in administrator from a page made for renters and owners to the admin panel. */
export function AdminOnly() {
  const { user } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const admin = user?.role === 'ADMIN';
  useEffect(() => {
    if (admin && !adminMayStay(pathname)) router.replace('/admin');
  }, [admin, pathname, router]);
  return null;
}
