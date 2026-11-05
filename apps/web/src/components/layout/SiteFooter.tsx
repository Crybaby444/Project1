'use client';

import { useTranslations } from 'next-intl';
import { TransitionLink } from '@/components/motion/TransitionLink';
import { ThemeSelect } from '@/components/theme/ThemeSelect';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { LogoMark } from '@/components/ui/LogoMark';
import { Sticker } from '@/components/ui/Sticker';
import { displayFit } from '@/lib/display-fit';
import { CONTACT_EMAIL } from '@/lib/site';

const SERVICE_LINKS = [
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
            <LogoMark size={44} />
            <Sticker kind="star" size={40} className="-rotate-12" />
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
          <LanguageSwitcher label={t('languageLabel')} focusTarget="footer-pill" />
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
