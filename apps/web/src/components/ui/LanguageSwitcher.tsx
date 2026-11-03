'use client';

import { LOCALES } from '@yoyo/shared';
import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';

/** Pill switcher between EN / LV / RU that keeps the current page. */
export function LanguageSwitcher() {
  const t = useTranslations('language');
  const current = useLocale();
  const pathname = usePathname();

  return (
    <nav aria-label={t('label')}>
      <ul className="flex flex-wrap justify-center gap-1 rounded-pill border border-ink bg-surface p-1">
        {LOCALES.map((locale) => {
          const active = locale === current;
          return (
            <li key={locale}>
              <Link
                href={pathname}
                locale={locale}
                hrefLang={locale}
                lang={locale}
                aria-current={active ? 'true' : undefined}
                className={`inline-flex min-h-10 items-center rounded-pill px-4 text-[13px] font-bold tracking-[0.03em] uppercase transition-[background-color,color,transform] duration-200 ease-yoyo active:scale-[0.97] ${
                  active ? 'bg-cta text-cta-fg' : 'hover:-translate-y-px hover:bg-mist'
                }`}
              >
                {t(locale)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
