'use client';

import { ProfileForm } from '@/components/settings/ProfileForm';
import { useSession } from '@/lib/session/SessionProvider';

export default function ProfileSettingsPage() {
  const { user } = useSession();
  // RequireSession (settings/layout) renders this only for a signed-in user.
  return user ? <ProfileForm key={user.id} user={user} /> : null;
}
