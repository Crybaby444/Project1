'use client';

import { SecuritySettings } from '@/components/settings/SecuritySettings';
import { useSession } from '@/lib/session/SessionProvider';

export default function SecuritySettingsPage() {
  const { user } = useSession();
  // RequireSession (settings/layout) renders this only for a signed-in user.
  return user ? <SecuritySettings user={user} /> : null;
}
