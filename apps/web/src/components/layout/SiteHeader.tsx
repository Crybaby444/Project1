'use client';

import { useTranslations } from 'next-intl';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { Button } from '@/components/ui/Button';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { Mark } from '@/components/brand/Mark';
import { Wordmark } from '@/components/ui/Wordmark';
import { Link } from '@/i18n/navigation';
import { useSession } from '@/lib/session/SessionProvider';
import type { MenuRoot } from '@/lib/catalog/menu';
import { UserMenu } from './UserMenu';
import { VerifyEmailBanner } from './VerifyEmailBanner';

/**
 * The bar on every page (v16): the mark dead centre; language, theme and the account on the right; nothing
 * on the left. The catalog is reached from the home page and the footer (owner, 2026-11-13), so `catalog`
 * is accepted for the layout's sake and not drawn here. On a phone only the mark and one button remain.
 * One row at any width: the language is one compact pill that opens a menu, and below 640px a
 * visitor sees only "Sign in" (the sign-in page links to sign-up). Below 640px the row is also a
 * little tighter, so the longest "Sign in" (Latvian "Pieteikties") still fits a 320px phone next to
 * the catalog button.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function SiteHeader(_props: { catalog?: MenuRoot[] }) {
  const t = useTranslations('header');
  const { status, user } = useSession();

  return (
    <>
      {/* z-30: its own layer above the page, so the language and account menus open over the content. */}
      <header data-site-header className="border-ink bg-surface relative z-30 border-b">
        <div className="relative mx-auto grid h-16 max-w-[1440px] grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 sm:gap-3 sm:px-8">
          <div aria-hidden="true" />
          <Link
            href="/"
            data-site-brand
            className="rounded-pill absolute left-1/2 inline-flex -translate-x-1/2 items-center gap-2"
          >
            <Mark size={24} />
            <Wordmark className="text-[26px] sm:text-[28px]" />
          </Link>

          <div className="col-start-3 flex min-w-0 items-center justify-self-end gap-0.5 sm:gap-2">
            {/* On a phone the language moves to the empty left corner (it must stay one tap away); the theme
                steps aside to the footer. On wider screens both sit here, on the right. */}
            <div data-phone-left className="max-sm:absolute max-sm:top-1/2 max-sm:left-4 max-sm:-translate-y-1/2">
              <LanguageSwitcher className="shrink-0" />
            </div>
            <div data-desktop-only className="flex items-center max-sm:hidden">
              <ThemeToggle className="shrink-0" />
            </div>
            {status === 'authenticated' && user ? (
              <>
                <Link
                  href="/listings/new"
                  className="group border-cta bg-cta text-cta-fg rounded-pill ease-yoyo inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center gap-1.5 border px-2.5 text-[13px] font-bold tracking-[0.03em] uppercase transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.96] sm:px-4"
                >
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className="ease-yoyo size-4 transition-transform duration-250 group-hover:rotate-90"
                  >
                    <path
                      d="M12 5v14M5 12h14"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.25"
                      strokeLinecap="round"
                    />
                  </svg>
                  {/* On a phone only the "+" shows; the name stays for assistive tech. */}
                  <span className="sr-only sm:not-sr-only">{t('lendItem')}</span>
                </Link>
                <div className="shrink-0">
                  <UserMenu user={user} />
                </div>
              </>
            ) : status === 'anonymous' ? (
              <>
                <Button variant="ghost" href="/login" className="shrink-0 max-sm:px-2 max-sm:text-[12px]">
                  {t('signIn')}
                </Button>
                <div className="hidden shrink-0 sm:block">
                  <Button href="/register">{t('signUp')}</Button>
                </div>
              </>
            ) : (
              <span aria-hidden="true" className="bg-mist rounded-pill size-10 shrink-0" />
            )}
          </div>
        </div>
      </header>
      <VerifyEmailBanner />
    </>
  );
}
