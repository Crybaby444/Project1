'use client';

import { useTranslations } from 'next-intl';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { Button } from '@/components/ui/Button';
import { LanguageMenu, LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { LogoMark } from '@/components/ui/LogoMark';
import { Wordmark } from '@/components/ui/Wordmark';
import { Link } from '@/i18n/navigation';
import { useSession } from '@/lib/session/SessionProvider';
import { UserMenu } from './UserMenu';
import { VerifyEmailBanner } from './VerifyEmailBanner';

/**
 * The bar on every page: the wordmark home on the left; language, theme and the account on the right.
 * One row at any width: below 1024px the language pills fold into one button, and below 640px a
 * visitor sees only "Sign in" (the sign-in page links to sign-up). Below 640px the row is also a
 * little tighter, so the longest "Sign in" (Latvian "Pieteikties") still fits a 320px phone.
 */
export function SiteHeader() {
  const t = useTranslations('header');
  const { status, user } = useSession();

  return (
    <>
      <header data-site-header className="border-ink bg-surface border-b">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-2 px-4 sm:gap-3 sm:px-8">
          <Link href="/" className="rounded-pill inline-flex shrink-0 items-center gap-2">
            <LogoMark size={36} className="hidden sm:block" />
            <Wordmark className="text-[24px] sm:text-[28px]" />
          </Link>

          <div className="flex min-w-0 items-center gap-1 sm:gap-2">
            <div className="hidden lg:block">
              <LanguageSwitcher />
            </div>
            <LanguageMenu className="shrink-0 lg:hidden" />
            <ThemeToggle className="shrink-0" />
            {status === 'authenticated' && user ? (
              <div className="shrink-0">
                <UserMenu user={user} />
              </div>
            ) : status === 'anonymous' ? (
              <>
                <Button variant="ghost" href="/login" className="shrink-0 max-sm:px-3 max-sm:text-[12px]">
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
