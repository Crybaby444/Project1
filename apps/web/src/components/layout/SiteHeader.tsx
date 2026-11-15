'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Mark } from '@/components/brand/Mark';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { Wordmark } from '@/components/ui/Wordmark';
import { Link, usePathname } from '@/i18n/navigation';
import type { MenuRoot } from '@/lib/catalog/menu';
import { useUnreadCount } from '@/lib/chat/queries';
import { useSession } from '@/lib/session/SessionProvider';
import { CatalogMenu } from './CatalogMenu';
import { MobileMenu } from './MobileMenu';
import { SearchCell } from './SearchCell';
import { UserMenu } from './UserMenu';
import { VerifyEmailBanner } from './VerifyEmailBanner';

/** One cell of the bar: full height, hairline on its right. */
const CELL = 'border-ink/15 flex h-full shrink-0 items-center border-r';
const LINK_CELL = 'ease-yoyo relative flex h-full items-center px-6 text-[15px] font-semibold whitespace-nowrap transition-colors duration-150 hover:bg-ink/[0.05]';

function PageLink({ href, children }: { href: string; children: ReactNode }) {
  const pathname = usePathname();
  const current = href === '/' ? pathname === '/' : pathname.startsWith(href);
  return (
    <Link href={href} aria-current={current ? 'page' : undefined} data-nav-cell="" className={LINK_CELL}>
      {children}
      {/* The page you are on: the one light, under its name. */}
      {current && <span aria-hidden="true" className="absolute inset-x-6 bottom-0 h-[3px] rounded-t-full bg-[var(--glow)]" />}
    </Link>
  );
}

function MessagesLink() {
  const t = useTranslations('header');
  const unread = useUnreadCount().data ?? 0;
  return (
    <Link
      href="/messages"
      aria-label={unread > 0 ? t('messagesUnread', { count: unread }) : t('messages')}
      className="border-ink/20 hover:border-ink bg-surface text-ink rounded-pill ease-yoyo relative inline-grid size-10 shrink-0 place-items-center border transition-[transform,border-color] duration-150 hover:-translate-y-0.5"
    >
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
 * The bar on every page (owner, 2026-11-16: "like a row of cells, in our concept"): one row of full-height
 * cells split by hairlines — the mark (home), Catalog (every category in a panel), Home, What is Yoyo,
 * How it works, the search filling the middle, then lending, messages and notifications, theme, language
 * and the account. Cells that do not fit step out at narrower widths (into the Catalog panel and the phone
 * menu), so nothing ever overlaps. Below 1024px: the menu button, the mark, and the account.
 */
export function SiteHeader({ catalog = [] }: { catalog?: MenuRoot[] }) {
  const t = useTranslations('header');
  const tn = useTranslations('nav');
  const { status, user } = useSession();
  const signedIn = status === 'authenticated' && user;

  return (
    <>
      {/* z-30: its own layer above the page, so its panels open over the content. Sticky: one reach away. */}
      <header data-site-header className="border-ink/15 bg-canvas sticky top-0 z-30 border-b">
        <div className="relative flex h-16 items-stretch lg:h-[72px]">
          <div className="flex items-center pl-2 lg:hidden">
            <MobileMenu roots={catalog} />
          </div>
          <div className={`${CELL} max-lg:border-r-0`}>
            <Link href="/" data-site-brand aria-label={tn('homeLabel')} className="hover:bg-ink/[0.05] flex h-full items-center gap-2 px-3 transition-colors lg:px-7">
              <Mark size={24} />
              <Wordmark className="text-[26px] lg:text-[28px]" />
            </Link>
          </div>

          <nav aria-label={tn('main')} className="hidden h-full items-stretch lg:flex">
            <div className={CELL}>
              <CatalogMenu roots={catalog} className="h-full" />
            </div>
            <div className={`${CELL} max-xl:hidden`}>
              <PageLink href="/">{tn('home')}</PageLink>
            </div>
            <div className={CELL}>
              <PageLink href="/what-is-yoyo">
                <span aria-hidden="true" className="mr-2 size-1.5 rounded-full bg-[var(--glow)] ring-1 ring-black/25" />
                {tn('whatIsYoyo')}
              </PageLink>
            </div>
            <div className={`${CELL} max-2xl:hidden`}>
              <PageLink href="/how-it-works">{tn('howItWorks')}</PageLink>
            </div>
          </nav>

          <div className="border-ink/15 hidden min-w-0 flex-1 items-center border-r px-5 lg:flex">
            <SearchCell />
          </div>
          <div className="flex-1 lg:hidden" />

          {signedIn && user.role !== 'ADMIN' && (
            <div className={`${CELL} px-3 lg:px-5`}>
              <Link
                href="/listings/new"
                className="group border-cta bg-cta text-cta-fg rounded-pill ease-yoyo inline-flex min-h-10 min-w-10 items-center justify-center gap-1.5 border px-2.5 text-[13px] font-bold tracking-[0.03em] uppercase transition-transform duration-150 hover:-translate-y-0.5 active:scale-[0.96] xl:px-4"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="ease-yoyo size-4 transition-transform duration-250 group-hover:rotate-90">
                  <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
                </svg>
                <span className="sr-only xl:not-sr-only">{t('lendItem')}</span>
              </Link>
            </div>
          )}
          {signedIn && user.role !== 'ADMIN' && (
            <div className={`${CELL} gap-2 px-3 max-sm:hidden lg:px-5`}>
              <MessagesLink />
              <NotificationBell />
            </div>
          )}
          <div data-desktop-only data-theme-control className={`${CELL} px-4 max-lg:hidden`}>
            <ThemeToggle />
          </div>
          <div className={`${CELL} px-3 max-sm:hidden lg:px-4`}>
            <LanguageSwitcher />
          </div>
          <div className="flex h-full shrink-0 items-center gap-2 px-3 lg:px-6">
            {signedIn ? (
              <>
                {user.role !== 'ADMIN' && (
                  <div className="sm:hidden">
                    <NotificationBell />
                  </div>
                )}
                <UserMenu user={user} />
              </>
            ) : status === 'anonymous' ? (
              <>
                <Link href="/login" className="rounded-pill border-ink hover:bg-ink/[0.05] inline-flex min-h-10 items-center border px-4 text-[13px] font-bold tracking-[0.03em] whitespace-nowrap uppercase max-sm:px-3 max-sm:text-[12px]">
                  {t('signIn')}
                </Link>
                <Link href="/register" className="bg-cta text-cta-fg rounded-pill hidden min-h-10 items-center px-4 text-[13px] font-bold tracking-[0.03em] whitespace-nowrap uppercase transition-transform hover:-translate-y-0.5 sm:inline-flex">
                  {t('signUp')}
                </Link>
              </>
            ) : (
              <span aria-hidden="true" className="bg-mist rounded-pill size-10" />
            )}
          </div>
        </div>
      </header>
      <VerifyEmailBanner />
    </>
  );
}
