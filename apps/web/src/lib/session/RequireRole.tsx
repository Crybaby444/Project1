'use client';

import { displayFit } from '@/lib/display-fit';
import type { PublicUser } from '@yoyo/shared';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { RequireSession } from './RequireSession';
import { useSession } from './SessionProvider';

/**
 * Shows its children only to a signed-in user with `role`; anyone else sees "no access" and nothing
 * behind it is mounted (so its requests are never sent). The API checks the role on every request
 * anyway: this only keeps people from screens they cannot use.
 */
export function RequireRole({ role, children }: { role: PublicUser['role']; children: ReactNode }) {
  return (
    <RequireSession>
      <RoleGate role={role}>{children}</RoleGate>
    </RequireSession>
  );
}

function RoleGate({ role, children }: { role: PublicUser['role']; children: ReactNode }) {
  const { user } = useSession();
  const t = useTranslations('noAccess');
  if (user?.role === role) return children;
  return (
    <section className="@container flex flex-col items-start gap-5 py-6">
      <p
        aria-hidden="true"
        style={displayFit('403', { min: '3rem', max: '8rem' })}
        className="font-display text-display-fit leading-[0.8] font-black"
      >
        403
      </p>
      <h1 className="font-display text-[clamp(2.6rem,6vw,4.8rem)] leading-[0.95] font-black uppercase hyphens-auto [overflow-wrap:anywhere]">{t('title')}</h1>
      <p className="max-w-[52ch] leading-relaxed">{t('body')}</p>
      <Button variant="ghost" href="/">
        {t('back')}
      </Button>
    </section>
  );
}
