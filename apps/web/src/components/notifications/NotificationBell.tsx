'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { useNotifications } from '@/lib/notifications/queries';
import { NotificationList } from './NotificationList';

/** How many the panel shows; the page has the rest. */
const PANEL_LIMIT = 8;

/**
 * The bell in the header (plan 9, spec §4.7): how many notifications are unread, and a panel with the
 * newest, each worded in the reader's language and leading to its deal or item. It asks for news every
 * 30 seconds while the tab is visible. Esc or a click elsewhere closes the panel.
 */
export function NotificationBell() {
  const t = useTranslations('notifications');
  const notifications = useNotifications();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const unread = notifications.data?.unread ?? 0;

  useEffect(() => {
    if (!open) return;
    const away = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const esc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={unread > 0 ? `${t('bell')}, ${t('unread', { count: unread })}` : t('bell')}
        onClick={() => setOpen((v) => !v)}
        className="border-ink/15 hover:border-ink/50 bg-surface text-ink rounded-pill ease-yoyo relative inline-grid size-10 place-items-center border transition-[transform,border-color] duration-150 hover:-translate-y-0.5 active:scale-[0.96]"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className={`size-[18px] fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.7] ${unread > 0 ? 'origin-top animate-[bell-ring_1.2s_ease-in-out_1]' : ''}`}>
          <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0" />
        </svg>
        {unread > 0 && (
          <span aria-hidden="true" className="bg-ink text-canvas border-canvas absolute -top-1 -right-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 px-1 text-xs font-bold tabular-nums">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <section
          id={panelId}
          aria-label={t('title')}
          className="border-ink/15 bg-surface text-ink animate-pop-in rounded-media absolute top-full right-0 z-40 mt-2 flex w-[min(24rem,calc(100vw-2rem))] origin-top-right max-sm:fixed max-sm:inset-x-4 max-sm:top-[4.25rem] max-sm:w-auto flex-col overflow-hidden border shadow-pop"
        >
          <NotificationList limit={PANEL_LIMIT} compact onNavigate={() => setOpen(false)} />
          <Link href="/notifications" onClick={() => setOpen(false)} className="border-ink/15 hover:bg-mist border-t px-4 py-3 text-center text-sm font-bold">
            {t('seeAll')}
          </Link>
        </section>
      )}
    </div>
  );
}
