'use client';

import type { Locale } from '@yoyo/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { SearchBox } from '@/components/catalog/SearchBox';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { Link, usePathname } from '@/i18n/navigation';
import type { MenuRoot } from '@/lib/catalog/menu';
import { useUnreadCount } from '@/lib/chat/queries';
import { localized } from '@/lib/listings/categories';
import { useSession } from '@/lib/session/SessionProvider';
import { categoryPath } from '@/lib/seo';

function Tab({ href, label, active, children, badge }: { href: string; label: string; active: boolean; children: ReactNode; badge?: number }) {
  return (
    <Link href={href} aria-current={active ? 'page' : undefined} className="relative flex min-w-0 flex-1 flex-col items-center gap-1 py-2 text-xs font-semibold">
      <span className={`relative grid size-7 place-items-center ${active ? 'text-ink' : 'text-ink/60'}`}>
        {children}
        {badge ? <span className="bg-ink text-canvas ring-canvas absolute -top-1 -right-2 grid min-h-4 min-w-4 place-items-center rounded-full px-1 text-xs font-bold ring-2">{badge > 9 ? '9+' : badge}</span> : null}
      </span>
      <span className={active ? 'text-ink' : 'text-ink/60'}>{label}</span>
      {active && <span aria-hidden="true" className="absolute top-0 size-[5px] rounded-full bg-[var(--glow)] shadow-[0_0_8px_1px_var(--glow)]" />}
    </Link>
  );
}

const icon = 'size-[22px] fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.7]';

/**
 * Phones and tablets (owner, 2026-11-16: the navigation must adapt): a bar at the bottom, where the thumb
 * is — Home, Catalog (a sheet of every category), Lend (the raised chrome button), Messages, You — that
 * steps away while you scroll down and comes back when you scroll up.
 */
export function MobileTabBar({ roots }: { roots: MenuRoot[] }) {
  const t = useTranslations('nav');
  const th = useTranslations('header');
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const { status, user } = useSession();
  const unread = useUnreadCount().data ?? 0;
  const [sheet, setSheet] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (sheet && !d.open) d.showModal();
    if (!sheet && d.open) d.close();
  }, [sheet]);

  if (user?.role === 'ADMIN') return null;
  const signedIn = status === 'authenticated' && !!user;
  const at = (p: string) => (p === '/' ? pathname === '/' : pathname.startsWith(p));

  return (
    <>
      <nav
        aria-label={t('tabs')}
        data-tab-bar=""
        className={`border-ink/10 bg-canvas/90 fixed inset-x-4 bottom-[max(10px,env(safe-area-inset-bottom))] z-30 flex items-stretch rounded-float border px-1 shadow-[0_18px_40px_-18px_rgba(10,11,14,0.45)] backdrop-blur-xl lg:hidden`}
      >
        <Tab href="/" label={t('home')} active={at('/')}>
          <svg viewBox="0 0 24 24" aria-hidden="true" className={icon}>
            <path d="M4 10.5 12 4l8 6.5V20H4z" />
          </svg>
        </Tab>
        <button type="button" aria-expanded={sheet} onClick={() => setSheet(true)} className="flex min-w-0 flex-1 flex-col items-center gap-1 py-2 text-xs font-semibold">
          <span className="text-ink/60 grid size-7 place-items-center">
            <svg viewBox="0 0 24 24" aria-hidden="true" className={icon}>
              <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />
            </svg>
          </span>
          <span className="text-ink/60">{t('catalog')}</span>
        </button>
        <div className="flex flex-1 items-center justify-center">
          <Link
            href={signedIn ? '/listings/new' : '/login?next=%2Flistings%2Fnew'}
            aria-label={th('lendItem')}
            className="bg-ink text-canvas -mt-6 grid size-14 place-items-center rounded-full shadow-[0_12px_24px_-8px_rgba(10,11,14,0.7),inset_0_1px_0_rgba(255,255,255,0.25)] ring-4 ring-[var(--canvas)] transition-transform active:scale-95"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6">
              <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </Link>
        </div>
        <Tab href={signedIn ? '/messages' : '/login?next=%2Fmessages'} label={th('messages')} active={at('/messages')} badge={unread}>
          <svg viewBox="0 0 24 24" aria-hidden="true" className={icon}>
            <path d="M4 5.5h16v10.5H9l-5 4z" />
          </svg>
        </Tab>
        <Tab href={signedIn ? `/u/${user.id}` : '/login'} label={signedIn ? t('you') : th('signIn')} active={(signedIn && at(`/u/${user.id}`)) || at('/dashboard') || at('/bookings') || at('/wallet') || at('/settings') || at('/login')}>
          <svg viewBox="0 0 24 24" aria-hidden="true" className={icon}>
            <circle cx="12" cy="8.5" r="3.6" />
            <path d="M5 20c1.2-3.6 3.8-5.2 7-5.2s5.8 1.6 7 5.2" />
          </svg>
        </Tab>
      </nav>

      <dialog
        ref={dialog}
        aria-label={t('catalog')}
        onClose={() => setSheet(false)}
        onClick={(e) => {
          if (e.target === dialog.current || (e.target as HTMLElement).closest('a')) setSheet(false);
        }}
        className="bg-canvas text-ink open:animate-sheet-up m-0 mt-auto max-h-[88dvh] w-full max-w-none overflow-y-auto rounded-t-[30px] p-0 backdrop:bg-[color-mix(in_srgb,var(--night)_55%,transparent)] lg:hidden"
      >
        <div className="flex flex-col gap-5 px-5 pt-3 pb-[max(24px,env(safe-area-inset-bottom))]">
          <span aria-hidden="true" className="bg-ink/20 mx-auto h-1.5 w-12 rounded-full" />
          <div className="flex items-center justify-between">
            <span className="type-section">{t('catalog')}</span>
            <button type="button" aria-label={t('close')} onClick={() => setSheet(false)} className="bg-ink/[0.06] rounded-pill inline-grid size-10 place-items-center">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
                <path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <SearchBox compact label={t('search')} />
          <ul className="border-ink/10 divide-ink/10 divide-y border-y">
            {roots.map((root) => {
              const key = root.slugs.en;
              const open = expanded === key;
              return (
                <li key={key}>
                  <button type="button" aria-expanded={open} onClick={() => setExpanded(open ? null : key)} className="flex min-h-14 w-full items-center justify-between gap-3 text-left">
                    <span className="font-display text-2xl leading-none font-black uppercase">{localized(root.names, locale)}</span>
                    <svg viewBox="0 0 12 12" aria-hidden="true" className={`size-3 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
                      <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  {open && (
                    <ul className="flex flex-col pb-3">
                      {root.children.map((child) => (
                        <li key={child.slugs.en}>
                          <Link href={categoryPath(child.slugs[locale])} className="flex min-h-11 items-center text-base">
                            {localized(child.names, locale)}
                          </Link>
                        </li>
                      ))}
                      <li>
                        <Link href={categoryPath(root.slugs[locale])} className="flex min-h-11 items-center text-base font-bold underline decoration-1 underline-offset-4">
                          {t('all')}
                        </Link>
                      </li>
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-base font-semibold">
            <Link href="/what-is-yoyo" className="flex min-h-11 items-center gap-2">
              <span aria-hidden="true" className="size-2 rounded-full bg-[var(--glow)] ring-1 ring-black/20" />
              {t('whatIsYoyo')}
            </Link>
            <Link href="/faq" className="flex min-h-11 items-center">
              {t('faq')}
            </Link>
          </div>
          <ThemeToggle className="self-start" />
        </div>
      </dialog>
    </>
  );
}
