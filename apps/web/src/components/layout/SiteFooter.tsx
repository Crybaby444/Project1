'use client';

import { LOCALES } from '@yoyo/shared';
import { useLocale, useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';
import { TransitionLink } from '@/components/motion/TransitionLink';
import { ThemeSelect } from '@/components/theme/ThemeSelect';
import { shouldAnimateLanguageChange, switchLanguage } from '@/components/ui/switch-language';
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
 * The bottom of every page (v16): the pages in two short lists (the service in the display face, the
 * documents beside them) and the contact address, the wordmark across the width as the sign-off, and
 * one small row for the year, the language and the theme. No tagline, no column headings.
 */
export function SiteFooter() {
  const t = useTranslations('footer');

  return (
    <footer data-site-footer className="border-ink/15 bg-canvas text-ink overflow-x-clip border-t">
      <div className="mx-auto grid max-w-[1440px] gap-10 px-4 pt-14 pb-6 sm:px-8 sm:pt-20 md:grid-cols-[1.3fr_1fr_1fr]">
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="group font-display self-start text-[clamp(1.6rem,2.6vw,2.4rem)] leading-none font-black break-all uppercase"
        >
          <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_2px] bg-left-bottom bg-no-repeat pb-1 transition-[background-size] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:bg-[length:100%_2px]">
            {CONTACT_EMAIL}
          </span>
        </a>
        <nav aria-label={t('pagesLabel')} className="contents">
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {SERVICE_LINKS.map(([key, href]) => (
              <li key={key}>
                <TransitionLink
                  href={href}
                  className="font-display inline-flex min-h-10 items-center text-[clamp(1.5rem,2.2vw,2rem)] leading-none font-black uppercase transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:translate-x-1.5"
                >
                  {t(`links.${key}`)}
                </TransitionLink>
              </li>
            ))}
          </ul>
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {DOCUMENT_LINKS.map(([key, href]) => (
              <li key={key}>
                <TransitionLink href={href} className={LINK}>
                  {t(`links.${key}`)}
                </TransitionLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="@container mx-auto max-w-[1440px] px-4 sm:px-8">
        <p
          data-footer-wordmark
          aria-hidden="true"
          className="font-display pointer-events-none m-0 pt-[0.1em] text-center text-[59cqw] leading-[0.72] font-black tracking-[-0.02em] uppercase select-none"
        >
          YOYO
        </p>
      </div>
      <div className="border-ink/15 mt-6 border-t">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-4 sm:px-8">
          <p className="text-ink/75 m-0 text-[13px] font-medium">{t('copyright', { year: new Date().getFullYear() })}</p>
          <div className="-mx-3 flex flex-wrap items-center gap-x-6 gap-y-1">
            <FooterLanguages label={t('languageLabel')} />
            <ThemeSelect compact />
          </div>
        </div>
      </div>
    </footer>
  );
}
