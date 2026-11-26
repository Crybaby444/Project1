'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';

const TABS = [
  { href: '/settings', key: 'profile' },
  { href: '/settings/security', key: 'security' },
  { href: '/settings/notifications', key: 'notifications' },
] as const;

/**
 * Profile / Security / Email: one segmented pill row on phones and tablets (it fills the width), the
 * settings' rail from lg up: the same three as a column, the open one filled.
 */
export function SettingsTabs() {
  const t = useTranslations('settings');
  const pathname = usePathname();

  return (
    <nav aria-label={t('title')}>
      <ul className="border-ink bg-surface rounded-pill lg:sheet lg:border-ink/15 lg:rounded-media flex w-full gap-1 border p-1 sm:w-fit lg:w-full lg:flex-col lg:p-1.5">
        {TABS.map(({ href, key }) => {
          const active = pathname === href;
          return (
            <li key={key} className="flex-1 sm:flex-none">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`rounded-pill ease-yoyo flex min-h-10 items-center justify-center px-2 text-xs tracking-normal min-[380px]:px-3 min-[380px]:text-sm min-[380px]:tracking-[0.03em] sm:px-5 lg:min-h-11 lg:justify-start lg:px-4 font-bold uppercase transition-[background-color,color,transform] duration-200 active:scale-[0.96] ${
                  active ? 'bg-cta text-cta-fg' : 'hover:bg-mist'
                }`}
              >
                {t(`tabs.${key}`)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
