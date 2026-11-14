'use client';

import { LOCALES } from '@yoyo/shared';
import { useLocale, useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';
import { TransitionLink } from '@/components/motion/TransitionLink';
import { ThemeSelect } from '@/components/theme/ThemeSelect';
import { shouldAnimateLanguageChange, switchLanguage } from '@/components/ui/switch-language';
import { Mark } from '@/components/brand/Mark';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { prefersReducedMotion } from '@/lib/motion';
import { CONTACT_EMAIL } from '@/lib/site';

const SERVICE_LINKS = [
  ['catalog', '/c'], // the header carries no catalog (owner, 2026-11-13): it lives here and on the home page
  ['howItWorks', '/how-it-works'],
  ['faq', '/faq'],
] as const;

const DOCUMENT_LINKS = [
  ['terms', '/terms'],
  ['privacy', '/privacy'],
  ['cookies', '/cookies'],
] as const;

const LINK =
  'inline-flex min-h-10 items-center rounded-pill text-[15px] font-bold underline-offset-4 transition-transform duration-150 ease-yoyo hover:-translate-y-0.5 hover:underline';

/**
 * The language choice of the footer: its own small list (the header has the main switcher), using the
 * same animated switch. After a switch the focus returns to the footer, where the visitor was.
 */
function FooterLanguages({ label }: { label: string }) {
  const t = useTranslations('language');
  const current = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  function onClick(event: MouseEvent<HTMLAnchorElement>, locale: string) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (locale === current) return;
    event.preventDefault();
    void switchLanguage({
      locale,
      navigate: () => router.push(pathname, { locale, scroll: false }),
      animate: shouldAnimateLanguageChange(prefersReducedMotion(), typeof document.startViewTransition === 'function'),
      afterSwitch: () => {
        if (document.activeElement && document.activeElement !== document.body) return;
        document.querySelector<HTMLElement>('[data-footer-language="current"]')?.focus({ preventScroll: true });
      },
    });
  }

  return (
    <nav aria-label={label}>
      <ul className="flex flex-wrap gap-1">
        {LOCALES.map((locale) => {
          const active = locale === current;
          return (
            <li key={locale}>
              <Link
                href={pathname}
                locale={locale}
                prefetch={false}
                hrefLang={locale}
                lang={locale}
                aria-current={active ? 'true' : undefined}
                data-footer-language={active ? 'current' : undefined}
                onClick={(event) => onClick(event, locale)}
                className={`rounded-pill inline-flex min-h-10 items-center px-3 text-[12px] font-bold tracking-[0.03em] uppercase transition-colors duration-200 ${
                  active ? 'text-ink underline decoration-1 underline-offset-4' : 'text-ink/70 hover:text-ink'
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

/**
 * The bottom of every page (v16): minimal. One row — the mark and the year, the pages as a single line of
 * links, the contact address; one small row under it for the language and the theme.
 */
export function SiteFooter() {
  const t = useTranslations('footer');
  const links = [...SERVICE_LINKS, ...DOCUMENT_LINKS];

  return (
    <footer data-site-footer className="border-ink/15 bg-canvas text-ink border-t">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 py-8 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
        <p className="flex items-center gap-2.5 text-[13px] font-medium">
          <Mark size={20} />
          <span>{t('copyright', { year: new Date().getFullYear() })}</span>
        </p>
        <nav aria-label={t('pagesLabel')}>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] font-semibold">
            {links.map(([key, href]) => (
              <li key={key}>
                <TransitionLink href={href} className={LINK}>
                  {t(`links.${key}`)}
                </TransitionLink>
              </li>
            ))}
          </ul>
        </nav>
        <a href={`mailto:${CONTACT_EMAIL}`} className={`${LINK} text-[13px] font-semibold`}>
          {CONTACT_EMAIL}
        </a>
      </div>
      <div className="border-ink/10 border-t">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-8">
          <FooterLanguages label={t('languageLabel')} />
          <ThemeSelect compact />
        </div>
      </div>
    </footer>
  );
}
