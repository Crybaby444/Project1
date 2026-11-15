'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { useSession } from '@/lib/session/SessionProvider';
import { useAdminOverview } from '@/lib/admin/queries';

type Section = 'overview' | 'moderation' | 'deals' | 'reports' | 'users' | 'money';

const SECTIONS: { key: Section; href: string; icon: ReactNode }[] = [
  {
    key: 'overview',
    href: '/admin',
    icon: <path d="M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-3H4zM14 7h6V4h-6z" />,
  },
  {
    key: 'moderation',
    href: '/admin/listings',
    icon: <path d="M9 12l2 2 4-4M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z" />,
  },
  {
    key: 'deals',
    href: '/admin/deals',
    icon: <path d="M7 7h11l-3-3M17 17H6l3 3M18 7v4M6 17v-4" />,
  },
  {
    key: 'reports',
    href: '/admin/reports',
    icon: <path d="M5 21V4m0 0h11l-2 4 2 4H5" />,
  },
  {
    key: 'users',
    href: '/admin/users',
    icon: <path d="M16 19v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1M9.5 10a3 3 0 100-6 3 3 0 000 6zM21 19v-1a4 4 0 00-3-3.9M15.5 4.1a3 3 0 010 5.8" />,
  },
  {
    key: 'money',
    href: '/admin/money',
    icon: <path d="M3 7h18v10H3zM12 14.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM6.5 10v.01M17.5 14v.01" />,
  },
];

function activeSection(pathname: string): Section {
  if (pathname.startsWith('/admin/listings')) return 'moderation';
  if (pathname.startsWith('/admin/deals') || pathname.startsWith('/admin/disputes')) return 'deals';
  if (pathname.startsWith('/admin/reports')) return 'reports';
  if (pathname.startsWith('/admin/users')) return 'users';
  if (pathname.startsWith('/admin/money')) return 'money';
  return 'overview';
}

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="size-[18px] shrink-0 fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.7]">
      {children}
    </svg>
  );
}

/**
 * The admin panel's frame (owner, 2026-11-14): a night sidebar with the sections and what waits in
 * each (listings to review, disputes to decide), the page beside it. On a phone the sections become a
 * row of tabs above the page. The site header and footer are left out (globals.css): an administrator's
 * account is for the panel only (owner, 2026-11-15).
 */
export function AdminShell({ children }: { children: ReactNode }) {
  const t = useTranslations('admin');
  const pathname = usePathname();
  const active = activeSection(pathname);
  const overview = useAdminOverview();
  const { user, signOut } = useSession();
  const router = useRouter();
  async function leave() {
    await signOut();
    router.push('/login');
  }
  const waiting: Partial<Record<Section, number>> = {
    moderation: overview.data?.listings.pendingReview ?? 0,
    deals: overview.data?.deals.disputed ?? 0,
    reports: overview.data?.reports?.open ?? 0,
  };

  return (
    <div data-admin-root className="-mx-4 grid min-h-svh grid-cols-[minmax(0,1fr)] sm:-mx-8 lg:grid-cols-[248px_minmax(0,1fr)] lg:bg-[linear-gradient(to_right,var(--ink)_248px,transparent_248px)]">
      <aside className="bg-ink text-canvas min-w-0 lg:sticky lg:top-0 lg:flex lg:h-svh lg:flex-col">
        <p className="font-display hidden px-6 pt-7 pb-6 text-[1.9rem] leading-none font-black uppercase lg:block">
          Yoyo <span className="text-canvas/60">/ {t('brand')}</span>
        </p>
        <nav aria-label={t('navLabel')} className="overflow-x-auto lg:flex-1 lg:overflow-visible">
          <ul className="flex gap-1 px-3 py-2 lg:flex-col lg:px-3 lg:py-0">
            {SECTIONS.map(({ key, href, icon }) => {
              const current = key === active;
              const count = waiting[key] ?? 0;
              return (
                <li key={key} className="shrink-0">
                  <Link
                    href={href}
                    aria-current={current ? 'page' : undefined}
                    className={`ease-yoyo flex min-h-11 items-center gap-3 rounded-[14px] px-3.5 text-[15px] font-semibold whitespace-nowrap transition-colors duration-150 ${
                      current ? 'bg-canvas text-ink' : 'text-canvas/80 hover:bg-canvas/10 hover:text-canvas'
                    }`}
                  >
                    <Icon>{icon}</Icon>
                    <span className="flex-1">{t(`nav.${key}`)}</span>
                    {count > 0 && (
                      <span
                        className={`rounded-pill inline-flex min-h-5 min-w-5 items-center justify-center px-1.5 text-[11px] font-bold tabular-nums ${
                          current ? 'bg-ink text-canvas' : 'bg-canvas text-ink'
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
            <li className="shrink-0 lg:hidden">
              <button
                type="button"
                onClick={() => void leave()}
                className="text-canvas/80 hover:bg-canvas/10 flex min-h-11 items-center gap-3 rounded-[14px] px-3.5 text-[15px] font-semibold whitespace-nowrap"
              >
                {t('signOut')}
              </button>
            </li>
          </ul>
        </nav>
        <div className="border-canvas/15 hidden border-t px-3 py-4 lg:block">
          {user && <p className="text-canvas/70 truncate px-3.5 pb-2 text-[13px]">{user.email}</p>}
          <button
            type="button"
            onClick={() => void leave()}
            className="text-canvas/80 hover:bg-canvas/10 hover:text-canvas flex min-h-11 w-full items-center gap-3 rounded-[14px] px-3.5 text-[14px] font-semibold"
          >
            <Icon>
              <path d="M15 17l5-5-5-5M20 12H9M12 20H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7" />
            </Icon>
            {t('signOut')}
          </button>
        </div>
      </aside>
      <main id="admin-main" className="min-w-0 px-4 py-8 sm:px-8 lg:px-12 lg:py-10">
        {children}
      </main>
    </div>
  );
}
