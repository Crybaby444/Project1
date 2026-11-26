'use client';

import { useTranslations } from 'next-intl';
import { IdentityCheck } from '@/components/identity/IdentityCheck';
import { ProfileForm } from '@/components/settings/ProfileForm';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { useSession } from '@/lib/session/SessionProvider';

export default function ProfileSettingsPage() {
  const { user } = useSession();
  const t = useTranslations('identityCheck');
  // RequireSession (settings/layout) renders this only for a signed-in user.
  if (!user) return null;
  return (
    <div className="stack-sheets">
      <ProfileForm key={user.id} user={user} />
      <div id="identity" className="scroll-mt-28">
        <SettingsSection title={t('title')} intro={t('intro')}>
          <IdentityCheck />
        </SettingsSection>
      </div>
    </div>
  );
}
