'use client';

import { LOCALES } from '@yoyo/shared';
import { useLocale, useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';
import { TransitionLink } from '@/components/motion/TransitionLink';
import { ThemeSelect } from '@/components/theme/ThemeSelect';
import { shouldAnimateLanguageChange, switchLanguage } from '@/components/ui/switch-language';
import { Mark } from '@/components/brand/Mark';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { displayFit } from '@/lib/display-fit';
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

const HEADING = 'text-xs font-bold tracking-[0.032em] uppercase';
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
      <ul className="border-ink bg-surface rounded-pill flex flex-wrap gap-1 border p-1">
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
                className={`rounded-pill ease-yoyo inline-flex min-h-10 items-center px-4 text-[13px] font-bold tracking-[0.03em] uppercase transition-[background-color,color,transform] duration-200 active:scale-[0.97] ${
                  active ? 'bg-cta text-cta-fg' : 'hover:bg-mist hover:-translate-y-px'
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
 * The bottom of every page: what Yoyo is, the service and legal pages, the contact address, and the
 * language and theme controls. Calm on purpose (it also sits under app screens, DESIGN.md §7): no
 * ribbon, one sticker, the wordmark as the closing line.
 */
export function SiteFooter() {
  const t = useTranslations('footer');

  return (
    <footer data-site-footer className="border-ink bg-band text-ink border-t">
      <div className="mx-auto grid max-w-[1440px] gap-10 px-4 pt-12 pb-8 sm:px-8 md:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1.4fr]">
        <div className="flex flex-col items-start gap-4">
          <div className="flex items-center gap-3">
            <Mark size={32} />
          </div>
          <p className="max-w-[36ch] text-lg leading-snug font-bold">{t('tagline')}</p>
          <div className="flex flex-col gap-1">
            <h2 className={HEADING}>{t('contact')}</h2>
            <p className="max-w-[40ch] text-[15px] leading-relaxed">{t('contactLead')}</p>
            <a href={`mailto:${CONTACT_EMAIL}`} className={`${LINK} self-start`}>
              {CONTACT_EMAIL}
            </a>
          </div>
        </div>

        <nav aria-label={t('pagesLabel')} className="grid grid-cols-1 gap-8 min-[380px]:grid-cols-2">
          <div className="flex flex-col gap-2">
            <h2 className={HEADING}>{t('service')}</h2>
            <ul className="flex flex-col">
              {SERVICE_LINKS.map(([key, href]) => (
                <li key={key}>
                  <TransitionLink href={href} className={LINK}>
                    {t(`links.${key}`)}
                  </TransitionLink>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-2">
            <h2 className={HEADING}>{t('documents')}</h2>
            <ul className="flex flex-col">
              {DOCUMENT_LINKS.map(([key, href]) => (
                <li key={key}>
                  <TransitionLink href={href} className={LINK}>
                    {t(`links.${key}`)}
                  </TransitionLink>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <div className="flex flex-col items-start gap-5 md:col-span-2 lg:col-span-1">
          <h2 className={HEADING}>{t('settings')}</h2>
          <FooterLanguages label={t('languageLabel')} />
          <ThemeSelect />
        </div>
      </div>

      <div className="@container mx-auto max-w-[1440px] overflow-hidden px-4 sm:px-8">
        <p
          aria-hidden="true"
          style={displayFit('YOYO', { min: '4rem', max: '32rem' })}
          className="font-display text-display-fit -mb-[0.12em] text-center leading-[0.78] font-black tracking-normal uppercase select-none"
        >
          YOYO
        </p>
      </div>

      <div className="border-ink border-t">
        <p className="mx-auto max-w-[1440px] px-4 py-4 text-[13px] sm:px-8">
          {t('copyright', { year: new Date().getFullYear() })}
        </p>
      </div>
    </footer>
  );
}
