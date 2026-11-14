'use client';

import type { PublicUser } from '@yoyo/shared';
import { useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { useToast } from '@/components/ui/Toast';
import { Link, useRouter } from '@/i18n/navigation';
import { useDealsSummary } from '@/lib/deals/queries';
import { useSession } from '@/lib/session/SessionProvider';

/** The first letters of the first two names: "Anna Bērziņa" → "AB". */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => Array.from(word)[0] ?? '')
    .join('')
    .toLocaleUpperCase();
}

/** A menu row (v16): the display face, a hairline under it, an arrow that slides in on hover or focus. */
const ITEM =
  "group/item font-display flex min-h-12 w-full items-center gap-3 border-b border-ink/10 px-3 text-left text-[1.35rem] leading-none font-black uppercase transition-[padding,background-color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-mist hover:pl-4 focus-visible:bg-mist focus-visible:pl-4 after:ml-auto after:text-base after:opacity-0 after:transition-opacity after:duration-300 after:content-['→'_/_''] hover:after:opacity-100 focus-visible:after:opacity-100";
/** Signing out: quiet, the body face, no arrow. */
const QUIET_ITEM =
  'flex min-h-11 w-full items-center rounded-pill px-3 text-left text-sm font-bold text-ink/75 transition-colors duration-150 hover:bg-mist hover:text-ink focus-visible:bg-mist focus-visible:text-ink';

/**
 * The signed-in person's round avatar, opening a menu (WAI-ARIA menu button): who is signed in,
 * My deals (with how many wait for them), Wallet, My listings, Moderation (administrators only),
 * Settings and Sign out. Arrow keys, Home and End move between items; Esc closes it and returns
 * focus to the button; Tab or a click elsewhere closes it.
 */
export function UserMenu({ user }: { user: PublicUser }) {
  const t = useTranslations('header');
  const td = useTranslations('dealsMenu');
  // Counted only once the menu has been opened: the header never fetches deals on every page.
  const [wanted, setWanted] = useState(false);
  const summary = useDealsSummary(wanted);
  const waiting = (summary.data?.renter.needsAction ?? 0) + (summary.data?.owner.needsAction ?? 0);
  const { signOut } = useSession();
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [focusOn, setFocusOn] = useState<'first' | 'last'>('first');
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const menuId = useId();

  const items = () => Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);

  useEffect(() => {
    if (!open) return;
    const list = items();
    (focusOn === 'first' ? list[0] : list.at(-1))?.focus();
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open, focusOn]);

  function openAt(where: 'first' | 'last') {
    setWanted(true);
    setFocusOn(where);
    setOpen(true);
  }

  function close({ refocus }: { refocus: boolean }) {
    setOpen(false);
    if (refocus) buttonRef.current?.focus();
  }

  function onButtonKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      openAt(event.key === 'ArrowDown' ? 'first' : 'last');
    }
  }

  function onMenuKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    const list = items();
    const index = list.indexOf(document.activeElement as HTMLElement);
    const move = (to: number) => {
      event.preventDefault();
      list[(to + list.length) % list.length]?.focus();
    };
    if (event.key === 'ArrowDown') move(index + 1);
    else if (event.key === 'ArrowUp') move(index - 1);
    else if (event.key === 'Home') move(0);
    else if (event.key === 'End') move(list.length - 1);
    else if (event.key === 'Escape') {
      event.preventDefault();
      close({ refocus: true });
    } else if (event.key === 'Tab') close({ refocus: false });
  }

  async function onSignOut() {
    close({ refocus: false });
    await signOut();
    router.push('/');
    toast.show(t('signedOut'));
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => (open ? close({ refocus: false }) : openAt('first'))}
        onKeyDown={onButtonKeyDown}
        style={{ backgroundColor: 'var(--ink)', color: 'var(--canvas)' }}   // v16: one ink disc for everyone
        className="border-ink rounded-pill ease-yoyo inline-grid size-10 place-items-center border text-[13px] font-bold tracking-[0.03em] [filter:drop-shadow(0_0_0.6px_var(--sticker-edge))] transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.96]"
      >
        {/* The name says what the button is and still contains the visible initials (WCAG 2.5.3). */}
        <span className="sr-only">{t('account')}, </span>
        {initials(user.name)}
      </button>

      {open && (
        <div className="border-ink/15 bg-surface text-ink animate-pop-in rounded-media absolute top-full right-0 z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] origin-top-right overflow-hidden border p-2 shadow-[0_24px_48px_-28px_rgba(10,11,14,0.5)]">
          <div className="border-ink/15 flex items-center gap-3 border-b px-3 pt-2 pb-4">
            <span aria-hidden="true" className="bg-ink text-canvas font-display grid size-11 shrink-0 place-items-center rounded-full text-lg font-black">
              {initials(user.name)}
            </span>
            <span className="min-w-0">
              <span className="font-display block truncate text-[1.5rem] leading-none font-black uppercase">{user.name}</span>
              <span className="text-ink/75 block truncate text-sm">{user.email}</span>
            </span>
          </div>
          <ul ref={menuRef} id={menuId} role="menu" aria-label={t('account')} onKeyDown={onMenuKeyDown}>
            <li role="none">
              <Link
                href="/bookings"
                role="menuitem"
                tabIndex={-1}
                onClick={() => close({ refocus: false })}
                className={ITEM}
              >
                <span>{td('myDeals')}</span>
                {waiting > 0 && (
                  <span className="rounded-pill bg-ink text-canvas animate-pop-in font-sans inline-flex min-h-6 min-w-6 items-center justify-center px-2 text-[12px] tabular-nums">
                    <span aria-hidden="true">{waiting}</span>
                    <span className="sr-only">{td('waiting', { count: waiting })}</span>
                  </span>
                )}
              </Link>
            </li>
            <li role="none">
              <Link
                href="/wallet"
                role="menuitem"
                tabIndex={-1}
                onClick={() => close({ refocus: false })}
                className={ITEM}
              >
                {td('wallet')}
              </Link>
            </li>
            <li role="none">
              <Link
                href="/dashboard/lending"
                role="menuitem"
                tabIndex={-1}
                onClick={() => close({ refocus: false })}
                className={ITEM}
              >
                {t('myListings')}
              </Link>
            </li>
            <li role="none">
              <Link
                href="/dashboard/favorites"
                role="menuitem"
                tabIndex={-1}
                onClick={() => close({ refocus: false })}
                className={ITEM}
              >
                {t('favorites')}
              </Link>
            </li>
            {user.role === 'ADMIN' && (
              <li role="none">
                <Link
                  href="/admin/listings"
                  role="menuitem"
                  tabIndex={-1}
                  onClick={() => close({ refocus: false })}
                  className={ITEM}
                >
                  {t('moderation')}
                </Link>
              </li>
            )}
            <li role="none">
              <Link
                href="/settings"
                role="menuitem"
                tabIndex={-1}
                onClick={() => close({ refocus: false })}
                className={ITEM}
              >
                {t('settings')}
              </Link>
            </li>
            <li role="none">
              <button type="button" role="menuitem" tabIndex={-1} onClick={onSignOut} className={`${QUIET_ITEM} mt-1`}>
                {t('signOut')}
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
