'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';

const TABS = [
  { href: '/settings', key: 'profile' },
  { href: '/settings/security', key: 'security' },
] as const;

/** Profile / Security as one segmented pill row (the same on a phone, where it fills the width). */
export function SettingsTabs() {
  const t = useTranslations('settings');
  const pathname = usePathname();

  return (
    <nav aria-label={t('title')}>
      <ul className="border-ink bg-surface rounded-pill flex w-full gap-1 border p-1 sm:w-fit">
        {TABS.map(({ href, key }) => {
          const active = pathname === href;
          return (
            <li key={key} className="flex-1 sm:flex-none">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`rounded-pill ease-yoyo flex min-h-10 items-center justify-center px-5 text-[13px] font-bold tracking-[0.03em] uppercase transition-[background-color,color,transform] duration-200 active:scale-[0.96] ${
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
