'use client';

import { LOCALES } from '@yoyo/shared';
import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';

/** Pill group linking the current page in every locale; each language is named in itself. */
export function LanguageSwitcher() {
  const t = useTranslations('language');
  const current = useLocale();
  const pathname = usePathname();

  return (
    <nav aria-label={t('label')}>
      <ul className="flex items-center gap-1 rounded-full border border-ink bg-surface p-1">
        {LOCALES.map((locale) => {
          const active = locale === current;
          return (
            <li key={locale}>
              <Link
                href={pathname}
                locale={locale}
                lang={locale}
                hrefLang={locale}
                aria-current={active ? 'page' : undefined}
                title={t(locale)}
                className={`inline-flex min-h-10 min-w-10 items-center justify-center rounded-full px-3 text-[13px] font-bold tracking-[0.032em] uppercase transition-[background-color,color,transform] duration-150 ease-yoyo hover:-translate-y-0.5 ${
                  active ? 'bg-cta-bg text-cta-fg' : 'text-ink hover:bg-mist'
                }`}
              >
                <span aria-hidden="true">{locale}</span>
                <span className="sr-only">{t(locale)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
