'use client';

import type { Notification } from '@yoyo/shared';
import { useLocale, useNow, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { Link } from '@/i18n/navigation';
import { notificationHref, useMarkNotificationRead, useNotifications } from '@/lib/notifications/queries';

/** A notification in the reader's language; an event the site does not know yet gets a plain line. */
export function useNotificationText() {
  const t = useTranslations('notifications');
  return (n: Notification) => {
    const key = `event.${n.kind}.${n.event}`;
    return t.has(key) ? t(key, { title: n.title }) : t('fallback', { title: n.title });
  };
}

/**
 * The notifications, newest first: unread ones carry a dot and bold words; opening one marks it read
 * and goes to its deal or item. Used by the bell's panel (compact, the newest few) and the page.
 */
export function NotificationList({ limit, compact = false, onNavigate }: { limit?: number; compact?: boolean; onNavigate?: () => void }) {
  const t = useTranslations('notifications');
  const notifications = useNotifications();
  const read = useMarkNotificationRead();
  const text = useNotificationText();
  const locale = useLocale();
  const now = useNow({ updateInterval: 60_000 });
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const ago = (iso: string) => {
    const minutes = Math.round((new Date(iso).getTime() - now.getTime()) / 60_000);
    if (Math.abs(minutes) < 60) return rtf.format(minutes, 'minute');
    const hours = Math.round(minutes / 60);
    if (Math.abs(hours) < 24) return rtf.format(hours, 'hour');
    return rtf.format(Math.round(hours / 24), 'day');
  };

  if (notifications.isPending) return <div aria-busy="true" className={compact ? 'h-40' : 'bg-mist rounded-media h-64'} />;
  if (notifications.isError) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 p-4">
        <p>{t('loadFailed')}</p>
        <Button variant="ghost" onClick={() => void notifications.refetch()}>
          {t('retry')}
        </Button>
      </div>
    );
  }
  const { items, unread } = notifications.data;
  const shown = limit ? items.slice(0, limit) : items;

  return (
    <div className="flex flex-col">
      <div className={`flex items-center justify-between gap-3 ${compact ? 'border-ink/15 border-b px-4 py-3' : 'pb-3'}`}>
        <p className={compact ? 'text-[13px] font-bold tracking-[0.04em] uppercase' : 'text-ink/75 text-sm font-semibold'}>
          {compact ? t('title') : unread > 0 ? t('unread', { count: unread }) : ''}
        </p>
        {unread > 0 && (
          <button type="button" onClick={() => read.mutate('all')} className="min-h-9 text-sm font-bold underline decoration-1 underline-offset-4">
            {t('markAll')}
          </button>
        )}
      </div>
      {shown.length === 0 ? (
        <p className="text-ink/75 px-4 py-8 text-center text-sm">{t('empty')}</p>
      ) : (
        <ul className={`divide-ink/10 divide-y ${compact ? 'max-h-[min(60vh,28rem)] overflow-y-auto' : 'border-ink/15 border-y'}`}>
          {shown.map((n) => (
            <li key={n.id}>
              <Link
                href={notificationHref(n)}
                onClick={() => {
                  if (!n.readAt) read.mutate(n.id);
                  onNavigate?.();
                }}
                className="hover:bg-mist flex items-start gap-3 px-4 py-3"
              >
                <span aria-hidden="true" className={`mt-2 inline-block size-2 shrink-0 rounded-full ${n.readAt ? 'border-ink/30 border' : 'bg-ink'}`} />
                <span className="min-w-0 flex-1">
                  <span className={`block text-[15px] leading-snug [overflow-wrap:anywhere] ${n.readAt ? '' : 'font-semibold'}`}>{text(n)}</span>
                  <time dateTime={n.createdAt} className="text-ink/70 mt-0.5 block text-xs">
                    {ago(n.createdAt)}
                  </time>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
