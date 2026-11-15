'use client';

import { useTranslations } from 'next-intl';
import { Mark } from '@/components/brand/Mark';
import { SearchBox } from '@/components/catalog/SearchBox';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { Button } from '@/components/ui/Button';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { Wordmark } from '@/components/ui/Wordmark';
import { Link } from '@/i18n/navigation';
import type { MenuRoot } from '@/lib/catalog/menu';
import { useUnreadCount } from '@/lib/chat/queries';
import { useSession } from '@/lib/session/SessionProvider';
import { CategoryNav } from './CategoryNav';
import { MobileMenu } from './MobileMenu';
import { UserMenu } from './UserMenu';
import { VerifyEmailBanner } from './VerifyEmailBanner';

const ICON_BUTTON =
  'border-ink/20 hover:border-ink bg-surface text-ink rounded-pill ease-yoyo relative inline-grid size-10 shrink-0 place-items-center border transition-[transform,border-color] duration-150 hover:-translate-y-0.5 active:scale-[0.96]';

function MessagesLink() {
  const t = useTranslations('header');
  const unread = useUnreadCount().data ?? 0;
  return (
    <Link href="/messages" className={ICON_BUTTON} aria-label={unread > 0 ? t('messagesUnread', { count: unread }) : t('messages')}>
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[18px] fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.7]">
        <path d="M4 5.5h16v10.5H9l-5 4z" />
      </svg>
      {unread > 0 && (
        <span className="bg-ink text-canvas ring-canvas absolute -top-1 -right-1 grid min-h-5 min-w-5 place-items-center rounded-full px-1 text-[10px] font-bold tabular-nums ring-2">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </Link>
  );
}

/**
 * The bar on every page (owner, 2026-11-16: a proper, tidy navigation). Row one: the mark and name on the
 * left, the search with suggestions in the middle, the way to lend, messages, notifications and the
 * account on the right, language and theme tucked beside them. Row two on wide screens: every category with
 * its subcategories, and the way to "What is Yoyo". Below 1024px a menu button opens all of that in a
 * sheet, and the search moves into it; the row keeps the mark, lending and the account.
 */
export function SiteHeader({ catalog = [] }: { catalog?: MenuRoot[] }) {
  const t = useTranslations('header');
  const { status, user } = useSession();
  const signedIn = status === 'authenticated' && user;

  return (
    <>
      {/* z-30: its own layer above the page, so its menus open over the content. Sticky: always one reach away. */}
      <header data-site-header className="border-ink/15 bg-canvas/90 supports-[backdrop-filter]:bg-canvas/80 sticky top-0 z-30 border-b backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-2 px-3 sm:gap-3 sm:px-8">
          <MobileMenu roots={catalog} />
          <Link href="/" data-site-brand className="rounded-pill inline-flex shrink-0 items-center gap-2 pr-1">
            <Mark size={24} />
            <Wordmark className="text-[26px] sm:text-[28px]" />
          </Link>

          <div className="hidden min-w-0 flex-1 justify-center px-2 lg:flex">
            <SearchBox compact className="w-full max-w-[560px]" />
          </div>
          <div className="flex-1 lg:hidden" />

          <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
            <div className="max-sm:hidden">
              <LanguageSwitcher className="shrink-0" />
            </div>
            <div data-desktop-only data-theme-control className="flex items-center max-lg:hidden">
              <ThemeToggle className="shrink-0" />
            </div>
            {signedIn ? (
              <>
                {user.role !== 'ADMIN' && (
                  <Link
                    href="/listings/new"
                    className="group border-cta bg-cta text-cta-fg rounded-pill ease-yoyo inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center gap-1.5 border px-2.5 text-[13px] font-bold tracking-[0.03em] uppercase transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.96] sm:px-4"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="ease-yoyo size-4 transition-transform duration-250 group-hover:rotate-90">
                      <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
                    </svg>
                    {/* On a phone only the "+" shows; the name stays for assistive tech. */}
                    <span className="sr-only xl:not-sr-only">{t('lendItem')}</span>
                  </Link>
                )}
                {user.role !== 'ADMIN' && (
                  <div className="shrink-0 max-sm:hidden">
                    <MessagesLink />
                  </div>
                )}
                {user.role !== 'ADMIN' && (
                  <div className="shrink-0">
                    <NotificationBell />
                  </div>
                )}
                <div className="shrink-0">
                  <UserMenu user={user} />
                </div>
              </>
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
        {catalog.length > 0 && (
          <div data-category-row className="border-ink/10 border-t max-lg:hidden">
            <CategoryNav roots={catalog} />
          </div>
        )}
      </header>
      <VerifyEmailBanner />
    </>
  );
}
