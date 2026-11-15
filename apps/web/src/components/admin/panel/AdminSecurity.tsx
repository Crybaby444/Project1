'use client';

import { useTranslations } from 'next-intl';
import { TwoFactorSettings } from '@/components/settings/TwoFactorSettings';
import { useSession } from '@/lib/session/SessionProvider';
import { AdminPageHeader, Panel } from './parts';

/** Admin → Security: everyone in the panel turns on their own two-step sign-in here. */
export function AdminSecurity() {
  const t = useTranslations('admin.security');
  const tf = useTranslations('twoFactor');
  const { user } = useSession();
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <AdminPageHeader title={t('title')} note={tf('intro')} />
      <Panel title={tf('title')}>{user && <TwoFactorSettings hasPassword={user.hasPassword} />}</Panel>
    </div>
  );
}
