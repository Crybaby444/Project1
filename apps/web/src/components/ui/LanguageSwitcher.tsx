'use client';

import { LOCALES } from '@yoyo/shared';
import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';

/** Pill links to the current page in every language, each labelled in its own language. */
export function LanguageSwitcher() {
  const t = useTranslations('language');
  const current = useLocale();
  const pathname = usePathname();

  return (
    <nav aria-label={t('label')}>
      <ul className="flex flex-wrap gap-1">
        {LOCALES.map((locale) => {
          const active = locale === current;
          return (
            <li key={locale}>
              <Link
                href={pathname}
                locale={locale}
                lang={locale}
                hrefLang={locale}
                aria-current={active ? 'true' : undefined}
                className={`inline-flex min-h-10 items-center rounded-pill border border-ink px-3 text-[13px] font-bold tracking-[0.032em] transition-[translate,background-color,color] duration-(--dur-fast) ease-yoyo hover:-translate-y-0.5 ${
                  active ? 'bg-cta-bg text-cta-fg' : 'bg-surface text-ink'
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
