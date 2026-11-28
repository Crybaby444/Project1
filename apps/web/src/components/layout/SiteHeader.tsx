'use client';

import { HOME_COUNTRY, type Country } from '@yoyo/shared';
import { CountryPicker } from './CountryPicker';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { Mark } from '@/components/brand/Mark';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { Wordmark } from '@/components/ui/Wordmark';
import { Link, usePathname } from '@/i18n/navigation';
import type { MenuRoot } from '@/lib/catalog/menu';
import { useUnreadCount } from '@/lib/chat/queries';
import { useHideOnScroll } from '@/lib/motion/use-hide-on-scroll';
import { useSession } from '@/lib/session/SessionProvider';
import { CatalogMenu } from './CatalogMenu';
import { MobileTabBar } from './MobileTabBar';
import { NavPills } from './NavPills';
import { SearchCell } from './SearchCell';
import { UserMenu } from './UserMenu';

const ROUND = 'border-ink/15 hover:border-ink/50 bg-surface text-ink rounded-pill ease-yoyo relative inline-grid size-10 shrink-0 place-items-center border transition-[transform,border-color] duration-200 hover:-translate-y-0.5';

function MessagesLink() {
  const t = useTranslations('header');
  const unread = useUnreadCount().data ?? 0;
  return (
    <Link href="/messages" aria-label={unread > 0 ? t('messagesUnread', { count: unread }) : t('messages')} className={ROUND}>
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[18px] fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.7]">
        <path d="M4 5.5h16v10.5H9l-5 4z" />
      </svg>
      {unread > 0 && (
        <span className="bg-accent text-accent-fg ring-canvas absolute -top-1 -right-1 grid min-h-5 min-w-5 place-items-center rounded-full px-1 text-xs font-bold tabular-nums ring-2">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </Link>
  );
}

/**
 * The navigation (owner, 2026-11-16: not a table, adaptive, our concept). A capsule that floats over the
 * page with real depth: the mark, Catalog (a sheet of every category), What is Yoyo, How it works with one
 * light that slides along under them, the search, lending, messages, notifications and you. Like a yo-yo it
 * goes away while you scroll down and comes back when you scroll up (and at once when the keyboard reaches it). On phones and tablets a slim capsule on
 * top (the mark, the search as a magnifier, you) and a tab bar at the bottom where the thumb is. Confirming the email
 * is asked on your own profile, not under the bar (owner, 2026-11-28).
 */
export function SiteHeader({ catalog = [], country = HOME_COUNTRY }: { catalog?: MenuRoot[]; country?: Country }) {
  const t = useTranslations('header');
  const tn = useTranslations('nav');
  const pathname = usePathname();
  const { status, user } = useSession();
  const signedIn = status === 'authenticated' && user;
  const [catalogOpen, setCatalogOpen] = useState(false);
  const onCatalog = useCallback((open: boolean) => setCatalogOpen(open), []);
  const hidden = useHideOnScroll(catalogOpen);
  const active = ['/what-is-yoyo'].find((p) => pathname.startsWith(p)) ?? null;

  return (
    <>
      <header
        data-site-header
        className={`pointer-events-none fixed inset-x-0 top-0 z-30 pt-3 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] focus-within:translate-y-0 focus-within:transition-none ${hidden ? '-translate-y-[calc(100%+8px)]' : ''}`}
      >
        {/* The capsule sits on the page's grid: its edges are the content's edges on every width. */}
        <div className="page">
        <div className="border-ink/10 bg-canvas pointer-events-auto relative flex h-14 items-center gap-2 rounded-full border pr-2 pl-4 shadow-[0_16px_40px_-22px_rgba(10,11,14,0.45),0_1px_0_rgba(255,255,255,0.6)_inset] backdrop-blur-xl lg:h-[60px] lg:gap-3 lg:pl-5">
          <Link href="/" data-site-brand aria-label={tn('homeLabel')} className="rounded-pill flex shrink-0 items-center gap-2 pr-1">
            <Mark size={22} />
            {/* On the narrowest phones (320px) the mark alone, so the search, the country, the language and
                signing in all fit; the link keeps its name. */}
            <Wordmark className="text-2xl max-[359px]:hidden lg:text-2xl" />
          </Link>

          <nav aria-label={tn('main')} className="hidden lg:block">
            <NavPills activeHref={active}>
              <CatalogMenu roots={catalog} onOpenChange={onCatalog} />
              {(
                [
                  ['/what-is-yoyo', tn('whatIsYoyo')],
                ] as const
              ).map(([href, label]) => (
                <Link
                  key={href}
                  href={href}
                  data-nav-item=""
                  data-nav-href={href}
                  aria-current={active === href ? 'page' : undefined}
                  className={`rounded-pill flex h-10 items-center px-4 text-sm font-semibold whitespace-nowrap transition-colors duration-200 ${active === href ? 'text-ink' : 'text-ink/75 hover:text-ink'}`}
                >
                  {label}
                </Link>
              ))}
            </NavPills>
          </nav>

          {/* The one search of the site (owner, 2026-11-28: only in the navigation), on every width: a box where
              there is room, a magnifier that opens it under the bar where there is not. */}
          <div className="flex min-w-0 flex-1 justify-end lg:justify-center">
            <div className="flex w-full max-w-[420px] justify-end">
              <SearchCell />
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <div data-desktop-only data-theme-control className="max-lg:hidden">
              <ThemeToggle />
            </div>
            <CountryPicker country={country} />
            {/* One language menu: on phones a visitor keeps it here; a signed-in person finds it under You. */}
            <div className={signedIn ? 'max-lg:hidden' : ''}>
              <LanguageSwitcher />
            </div>
            {signedIn ? (
              <>
                {user.role !== 'ADMIN' && (
                  <Link
                    href="/listings/new"
                    className="group bg-ink text-canvas rounded-pill ease-yoyo hidden h-10 items-center gap-1.5 px-4 text-sm font-bold tracking-[0.03em] uppercase shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] transition-transform duration-200 hover:-translate-y-0.5 lg:inline-flex"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="ease-yoyo size-4 transition-transform duration-300 group-hover:rotate-90">
                      <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
                    </svg>
                    <span className="max-xl:sr-only">{t('lendItem')}</span>
                  </Link>
                )}
                {user.role !== 'ADMIN' && (
                  <div className="max-lg:hidden">
                    <MessagesLink />
                  </div>
                )}
                {user.role !== 'ADMIN' && <NotificationBell />}
                <UserMenu user={user} />
              </>
            ) : status === 'anonymous' ? (
              <>
                {/* On a phone the tab bar below has "Sign in"; the capsule keeps its room for the search. */}
                <Link href="/login" className="rounded-pill hover:bg-ink/[0.06] hidden h-10 items-center px-3.5 text-sm font-bold tracking-[0.03em] whitespace-nowrap uppercase sm:inline-flex">
                  {t('signIn')}
                </Link>
                <Link href="/register" className="bg-ink text-canvas rounded-pill hidden h-10 items-center px-4 text-sm font-bold tracking-[0.03em] whitespace-nowrap uppercase shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] transition-transform hover:-translate-y-0.5 sm:inline-flex">
                  {t('signUp')}
                </Link>
              </>
            ) : (
              <span aria-hidden="true" className="bg-mist rounded-pill size-10" />
            )}
          </div>

          {/* Catalog's sheet is positioned against this capsule. */}
        </div>
        </div>
      </header>
      {/* Room for the floating bar at the top of every page (the cinematic page runs under it). */}
      <div data-header-spacer aria-hidden="true" className="h-[72px] lg:h-[84px]" />
      <MobileTabBar roots={catalog} />
    </>
  );
}
