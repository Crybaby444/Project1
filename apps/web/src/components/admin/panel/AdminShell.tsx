'use client';

import { staffMay, type AdminSection } from '@yoyo/shared';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { panelRole } from '@/lib/admin/staff';
import { useSession } from '@/lib/session/SessionProvider';
import { useAdminOverview } from '@/lib/admin/queries';
import { CommandPalette, OPEN_PALETTE } from './CommandPalette';

type Section = Exclude<AdminSection, 'content'>;

const SECTIONS: { key: Section; group: 'insight' | 'work' | 'money' | 'system'; href: string; icon: ReactNode }[] = [
  {
    key: 'overview',
    group: 'insight',
    href: '/admin',
    icon: <path d="M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-3H4zM14 7h6V4h-6z" />,
  },
  {
    key: 'activity',
    group: 'insight',
    href: '/admin/activity',
    icon: <path d="M3 12h4l3-8 4 16 3-8h4" />,
  },
  {
    key: 'traffic',
    group: 'insight',
    href: '/admin/traffic',
    icon: <path d="M4 19h16M7 15l3-4 3 3 5-7" />,
  },
  {
    key: 'seo',
    group: 'insight',
    href: '/admin/seo',
    icon: <path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4M8 11h6M11 8v6" />,
  },
  {
    key: 'moderation',
    group: 'work',
    href: '/admin/listings',
    icon: <path d="M9 12l2 2 4-4M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z" />,
  },
  {
    key: 'identity',
    group: 'work',
    href: '/admin/identity',
    icon: <path d="M4 6h16v12H4zM8.5 12.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM5.5 16c.6-1.5 1.7-2.2 3-2.2s2.4.7 3 2.2M14 10h4M14 13.5h3" />,
  },
  {
    key: 'deals',
    group: 'work',
    href: '/admin/deals',
    icon: <path d="M7 7h11l-3-3M17 17H6l3 3M18 7v4M6 17v-4" />,
  },
  {
    key: 'categories',
    group: 'work',
    href: '/admin/categories',
    icon: <path d="M4 5h7v7H4zM13 5h7v7h-7zM4 14h7v5H4zM13 14h7v5h-7z" />,
  },
  {
    key: 'reports',
    group: 'work',
    href: '/admin/reports',
    icon: <path d="M5 21V4m0 0h11l-2 4 2 4H5" />,
  },
  {
    key: 'users',
    group: 'work',
    href: '/admin/users',
    icon: <path d="M16 19v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1M9.5 10a3 3 0 100-6 3 3 0 000 6zM21 19v-1a4 4 0 00-3-3.9M15.5 4.1a3 3 0 010 5.8" />,
  },
  {
    key: 'money',
    group: 'money',
    href: '/admin/money',
    icon: <path d="M3 7h18v10H3zM12 14.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM6.5 10v.01M17.5 14v.01" />,
  },
  {
    key: 'audit',
    group: 'system',
    href: '/admin/audit',
    icon: <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />,
  },
  {
    key: 'system',
    group: 'system',
    href: '/admin/system',
    icon: <path d="M4 6h16v10H4zM8 20h8M12 16v4M7 10l2 2 2-3 2 2 2-1" />,
  },
  {
    key: 'staff',
    group: 'system',
    href: '/admin/staff',
    icon: <path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6zM12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM8.5 15.5a4 4 0 0 1 7 0" />,
  },
  {
    key: 'security',
    group: 'system',
    href: '/admin/security',
    icon: <path d="M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5zM12 15v2" />,
  },
  {
    key: 'settings',
    group: 'system',
    href: '/admin/settings',
    icon: <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />,
  },
];

function activeSection(pathname: string): Section {
  if (pathname.startsWith('/admin/activity')) return 'activity';
  if (pathname.startsWith('/admin/traffic')) return 'traffic';
  if (pathname.startsWith('/admin/seo')) return 'seo';
  if (pathname.startsWith('/admin/listings')) return 'moderation';
  if (pathname.startsWith('/admin/identity')) return 'identity';
  if (pathname.startsWith('/admin/deals') || pathname.startsWith('/admin/disputes')) return 'deals';
  if (pathname.startsWith('/admin/reports')) return 'reports';
  if (pathname.startsWith('/admin/categories')) return 'categories';
  if (pathname.startsWith('/admin/users')) return 'users';
  if (pathname.startsWith('/admin/money')) return 'money';
  if (pathname.startsWith('/admin/audit')) return 'audit';
  if (pathname.startsWith('/admin/settings')) return 'settings';
  if (pathname.startsWith('/admin/system')) return 'system';
  if (pathname.startsWith('/admin/staff')) return 'staff';
  if (pathname.startsWith('/admin/security')) return 'security';
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
  // Each staff role sees only its part of the panel (STAFF_PERMISSIONS; the API checks the same table).
  const sections = SECTIONS.filter((s) => staffMay(panelRole(user), s.key));
  const allowed = staffMay(panelRole(user), active);
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
        <div className="hidden px-3 pb-4 lg:block">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event(OPEN_PALETTE))}
            className="bg-canvas/10 hover:bg-canvas/15 text-canvas/80 flex min-h-11 w-full items-center gap-3 rounded-[14px] px-3.5 text-[14px] font-semibold"
          >
            <Icon>
              <path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4" />
            </Icon>
            <span className="flex-1 text-left">{t('search.open')}</span>
            <kbd className="border-canvas/25 rounded-[6px] border px-1.5 text-[11px]">{t('search.shortcut')}</kbd>
          </button>
        </div>
        <nav aria-label={t('navLabel')} className="overflow-x-auto lg:flex-1 lg:overflow-y-auto">
          <ul className="flex gap-1 px-3 py-2 lg:flex-col lg:px-3 lg:py-0">
            <li className="shrink-0 lg:hidden">
              <button
                type="button"
                aria-label={t('search.open')}
                onClick={() => window.dispatchEvent(new Event(OPEN_PALETTE))}
                className="text-canvas/80 hover:bg-canvas/10 flex min-h-11 items-center rounded-[14px] px-3.5"
              >
                <Icon>
                  <path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4" />
                </Icon>
              </button>
            </li>
            {sections.map(({ key, group, href, icon }, index) => {
              const current = key === active;
              const count = waiting[key] ?? 0;
              const firstOfGroup = index === 0 || sections[index - 1]!.group !== group;
              return (
                <li key={key} className="shrink-0">
                  {firstOfGroup && (
                    <p className={`text-canvas/65 hidden px-3.5 pb-1 text-[11px] font-bold tracking-[0.08em] uppercase lg:block ${index === 0 ? '' : 'pt-4'}`}>
                      {t(`groups.${group}`)}
                    </p>
                  )}
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
      <CommandPalette />
      <main id="admin-main" className="min-w-0 px-4 py-8 sm:px-8 lg:px-12 lg:py-10">
        {allowed ? children : <NoAccess />}
      </main>
    </div>
  );
}

/** A section the signed-in staff role doesn't open: say so instead of a page of 403s. */
function NoAccess() {
  const t = useTranslations('admin.noAccess');
  return (
    <div role="alert" className="flex max-w-xl flex-col items-start gap-4 py-10">
      <h1 className="font-display text-[clamp(2.2rem,4vw,3.2rem)] leading-[0.95] font-black uppercase">{t('title')}</h1>
      <p className="text-ink/80">{t('body')}</p>
      <Link href="/admin" className="font-bold underline decoration-1 underline-offset-4">
        {t('back')}
      </Link>
    </div>
  );
}
