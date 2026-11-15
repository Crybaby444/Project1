'use client';

import { ADMIN_USERS_PAGE_SIZE, type AdminUser } from '@yoyo/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { INPUT_CLASS } from '@/components/ui/inputs';
import { useToast } from '@/components/ui/Toast';
import { useRouter } from '@/i18n/navigation';
import { useAdminUsers, useBlockUser } from '@/lib/admin/queries';
import { AdminPageHeader, Pager, TABLE_CLASS, TD, TH } from './parts';

/**
 * Every account, newest first, 20 a page, searched by name or email (the search lives in the address).
 * An account can be blocked after a confirmation (signed out everywhere at once) and unblocked;
 * administrators cannot be blocked, so they get no button.
 */
export function AdminUsers({ search, page }: { search: string; page: number }) {
  const t = useTranslations('admin');
  const locale = useLocale();
  const router = useRouter();
  const toast = useToast();
  const users = useAdminUsers(search, page);
  const block = useBlockUser();
  const [draft, setDraft] = useState(search);
  const [asking, setAsking] = useState<AdminUser | null>(null);
  const joined = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' });

  // The address follows the search box a moment after typing stops.
  useEffect(() => {
    if (draft.trim() === search) return;
    const timer = setTimeout(() => {
      const q = draft.trim();
      router.replace(q ? `/admin/users?search=${encodeURIComponent(q)}` : '/admin/users');
    }, 300);
    return () => clearTimeout(timer);
  }, [draft, search, router]);

  const go = (next: number) => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (next > 1) params.set('page', String(next));
    const query = params.toString();
    router.replace(query ? `/admin/users?${query}` : '/admin/users');
  };

  function setBlocked(user: AdminUser, blocked: boolean) {
    block.mutate(
      { id: user.id, block: blocked },
      {
        onSuccess: () => {
          setAsking(null);
          toast.show(t(blocked ? 'users.blocked_done' : 'users.unblocked_done', { name: user.name }));
        },
        onError: () => toast.show(t('users.failed')),
      },
    );
  }

  const total = users.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / ADMIN_USERS_PAGE_SIZE));

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader title={t('users.title')} note={users.data ? t('common.total', { count: total }) : undefined} />

      <input
        type="search"
        aria-label={t('users.search')}
        placeholder={t('users.search')}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className={`${INPUT_CLASS} max-w-md`}
      />

      {users.isPending ? (
        <div aria-busy="true" className="bg-mist rounded-media h-72" />
      ) : users.isError ? (
        <div role="alert" className="flex flex-col items-start gap-3">
          <p>{t('common.loadFailed')}</p>
          <Button variant="ghost" onClick={() => void users.refetch()}>
            {t('common.retry')}
          </Button>
        </div>
      ) : users.data.items.length === 0 ? (
        <p className="border-ink/15 rounded-media border px-5 py-10 text-center">{t('users.empty')}</p>
      ) : (
        <div className="border-ink/15 rounded-media relative overflow-x-auto border" tabIndex={0} role="region" aria-label={t('users.title')}>
          <table className={TABLE_CLASS}>
            <thead>
              <tr>
                <th className={TH}>{t('users.name')}</th>
                <th className={TH}>{t('users.email')}</th>
                <th className={TH}>{t('users.role')}</th>
                <th className={TH}>{t('users.joined')}</th>
                <th className={TH}>{t('users.state')}</th>
                <th className={TH}>
                  <span className="sr-only">{t('users.block')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {users.data.items.map((u) => {
                const state = u.deletedAt ? 'deleted' : u.blockedAt ? 'blocked' : 'active';
                return (
                  <tr key={u.id} className="hover:bg-ink/[0.03]">
                    <td className={`${TD} font-semibold`}>{u.name}</td>
                    <td className={TD}>
                      <span className="block max-w-[16rem] truncate">{u.email}</span>
                      <span className="text-ink/70 text-[12px]">{u.emailVerified ? t('users.verified') : t('users.unverified')}</span>
                    </td>
                    <td className={TD}>{t(`users.roles.${u.role}`)}</td>
                    <td className={`${TD} whitespace-nowrap tabular-nums`}>{joined.format(new Date(u.createdAt))}</td>
                    <td className={TD}>
                      <span
                        className={`rounded-pill inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[12px] font-bold ${
                          state === 'active' ? 'border-ink/25 border' : 'bg-ink text-canvas'
                        }`}
                      >
                        {t(`users.${state}`)}
                      </span>
                    </td>
                    <td className={`${TD} text-right`}>
                      {u.role !== 'ADMIN' && !u.deletedAt && (
                        <button
                          type="button"
                          onClick={() => (u.blockedAt ? setBlocked(u, false) : setAsking(u))}
                          aria-label={`${u.blockedAt ? t('users.unblock') : t('users.block')} ${u.name}`}
                          disabled={block.isPending}
                          className="border-ink rounded-pill min-h-9 border px-3 text-[12px] font-bold tracking-[0.03em] whitespace-nowrap uppercase disabled:opacity-40"
                        >
                          {u.blockedAt ? t('users.unblock') : t('users.block')}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pager page={page} pages={pages} onPage={go} />

      <Dialog open={asking !== null} onClose={() => setAsking(null)} title={asking ? t('users.blockTitle', { name: asking.name }) : ''}>
        <p className="leading-relaxed">{t('users.blockBody')}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button onClick={() => asking && setBlocked(asking, true)} loading={block.isPending}>
            {t('users.block')}
          </Button>
          <Button variant="ghost" onClick={() => setAsking(null)}>
            {t('users.cancel')}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
