'use client';

import { ACTIVITY_GROUPS, type ActivityEvent, type ActivityGroup } from '@yoyo/shared';
import { useFormatter, useNow, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { Link, useRouter } from '@/i18n/navigation';
import { useActivity } from '@/lib/admin/activity';
import { AdminPageHeader } from './parts';

const GROUPS = Object.keys(ACTIVITY_GROUPS) as ActivityGroup[];

/** Where an event's target lives in the admin or on the site. */
function targetHref(e: ActivityEvent): string | null {
  if (!e.targetId) return null;
  switch (e.targetType) {
    case 'LISTING':
      return `/listings/${e.targetId}`;
    case 'BOOKING':
      return `/admin/deals/${e.targetId}`;
    case 'USER':
      return `/admin/users/${e.targetId}`;
    case 'REPORT':
      return '/admin/reports';
    default:
      return null;
  }
}

/**
 * Everything people do (owner, 2026-11-16): filters by group (accounts, listings, deals, messages,
 * reports, follows) and by person, newest first, live every 30 seconds, older pages on demand.
 */
export function AdminActivity({ group, userId }: { group?: ActivityGroup; userId?: string }) {
  const t = useTranslations('admin.activity');
  const tn = useTranslations('admin.nav');
  const format = useFormatter();
  const now = useNow({ updateInterval: 30_000 });
  const router = useRouter();
  const feed = useActivity({ ...(group && { group }), ...(userId && { userId }) });
  const go = (next: { group?: ActivityGroup | undefined; userId?: string | undefined }) => {
    const params = new URLSearchParams();
    const g = 'group' in next ? next.group : group;
    const u = 'userId' in next ? next.userId : userId;
    if (g) params.set('group', g);
    if (u) params.set('user', u);
    const q = params.toString();
    router.replace(q ? `/admin/activity?${q}` : '/admin/activity');
  };
  const items = feed.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader title={tn('activity')} note={t('live')} />
      <p className="text-ink/75 max-w-read leading-relaxed">{t('intro')}</p>
      <nav aria-label={tn('activity')} className="flex flex-wrap gap-2">
        {[undefined, ...GROUPS].map((g) => (
          <button
            key={g ?? 'all'}
            type="button"
            aria-pressed={group === g}
            onClick={() => go({ group: g })}
            className={`rounded-pill min-h-9 border px-4 text-sm font-bold ${group === g ? 'bg-ink text-canvas border-ink' : 'border-ink/20 hover:border-ink'}`}
          >
            {g ? t(`groups.${g}`) : t('all')}
          </button>
        ))}
        {userId && (
          <button type="button" onClick={() => go({ userId: undefined })} className="rounded-pill border-ink bg-mist min-h-9 border px-4 text-sm font-bold">
            {t('clearPerson')} ✕
          </button>
        )}
      </nav>
      {feed.isPending ? (
        <div aria-busy="true" className="bg-mist rounded-media h-64" />
      ) : items.length === 0 ? (
        <p className="admin-glass border-ink/15 rounded-media border px-5 py-10 text-center">{t('empty')}</p>
      ) : (
        <ol className="admin-glass divide-ink/10 border-ink/15 rounded-media m-0 list-none divide-y border p-0">
          {items.map((e) => {
            const href = targetHref(e);
            const at = new Date(e.at);
            return (
              <li key={e.id} className="grid gap-x-4 gap-y-1 px-4 py-3 sm:grid-cols-[7.5rem_minmax(0,14rem)_minmax(0,1fr)] sm:items-baseline">
                <time dateTime={e.at} title={format.dateTime(at, { dateStyle: 'medium', timeStyle: 'short' })} className="text-ink/60 text-sm tabular-nums">
                  {format.relativeTime(at, now)}
                </time>
                <span className="min-w-0 text-sm font-bold">
                  {e.actor ? (
                    <button type="button" onClick={() => go({ userId: e.actor!.id })} className="truncate text-left underline-offset-4 hover:underline" title={t('person')}>
                      {e.actor.username ? `@${e.actor.username}` : e.actor.name}
                    </button>
                  ) : (
                    t('system')
                  )}
                </span>
                <span className="min-w-0 text-sm">
                  <span className="font-semibold">{t(`kinds.${e.kind}`)}</span>
                  {e.summary &&
                    (href ? (
                      <>
                        {' · '}
                        <Link href={href} className="underline decoration-1 underline-offset-4">
                          {e.summary}
                        </Link>
                      </>
                    ) : (
                      <span className="text-ink/70"> · {e.summary}</span>
                    ))}
                  {!e.summary && href && (
                    <>
                      {' · '}
                      <Link href={href} className="underline decoration-1 underline-offset-4">
                        {e.targetId}
                      </Link>
                    </>
                  )}
                </span>
              </li>
            );
          })}
        </ol>
      )}
      {feed.hasNextPage && (
        <Button variant="ghost" className="self-start" onClick={() => void feed.fetchNextPage()} loading={feed.isFetchingNextPage}>
          {t('more')}
        </Button>
      )}
    </div>
  );
}
