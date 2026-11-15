'use client';

import { STAFF_PERMISSIONS, STAFF_ROLES, type StaffRole } from '@yoyo/shared';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { Link } from '@/i18n/navigation';
import { useAdminStaff, useChangeStaffRole, useResetTwoFactor } from '@/lib/admin/queries';
import { ApiError } from '@/lib/session/api-error';
import { useSession } from '@/lib/session/SessionProvider';
import { AdminPageHeader, AdminSelect, Panel } from './parts';

/**
 * The role picker used on the staff page and on a person's page: a role, or "not staff". The API refuses
 * your own role, the last owner and a blocked person; the toast says which.
 */
export function StaffRoleSelect({
  id,
  value,
  label,
}: {
  id: string;
  value: StaffRole | null;
  label: string;
}) {
  const ts = useTranslations('admin.staff');
  const toast = useToast();
  const change = useChangeStaffRole();
  return (
    <AdminSelect
      label={label}
      hideLabel
      className="min-w-44"
      value={value ?? ''}
      disabled={change.isPending}
      options={[{ value: '', label: ts('none') }, ...STAFF_ROLES.map((r) => ({ value: r, label: ts(`roles.${r}`) }))]}
      onChange={(v) =>
          change.mutate(
            { id, staffRole: (v || null) as StaffRole | null },
            {
              onSuccess: () => toast.show(ts('changed')),
              onError: (err) => {
                const why = err instanceof ApiError ? (err.details?.why as string | undefined) : undefined;
                toast.show(
                  why === 'SELF' || why === 'LAST_OWNER' || why === 'BLOCKED'
                    ? ts(`why.${why}`)
                    : ts('failed'),
                );
              },
            },
          )
        }
    />
  );
}

/**
 * Admin → Staff (owner only): everyone who works in the panel, their role, whether two-step sign-in is on
 * and when they last signed in; change a role or take someone out. Below, what each role may open.
 */
export function AdminStaff() {
  const t = useTranslations('admin');
  const ts = useTranslations('admin.staff');
  const locale = useLocale();
  const { user } = useSession();
  const staff = useAdminStaff();
  const reset = useResetTwoFactor();
  const toast = useToast();
  const when = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <AdminPageHeader title={ts('title')} note={ts('intro')} />
      {staff.isPending ? (
        <div aria-busy="true" className="bg-mist rounded-media h-64" />
      ) : staff.isError ? (
        <div role="alert" className="flex flex-col items-start gap-3">
          <p>{t('common.loadFailed')}</p>
          <Button variant="ghost" onClick={() => void staff.refetch()}>
            {t('common.retry')}
          </Button>
        </div>
      ) : (
        <ul className="border-ink/15 divide-ink/10 rounded-media divide-y border">
          {staff.data.map((m) => {
            const me = m.id === user?.id;
            return (
              <li key={m.id} className="flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-4 sm:px-5">
                <div className="min-w-0 flex-1 basis-56">
                  <Link
                    href={`/admin/users/${m.id}`}
                    className="font-semibold underline-offset-4 hover:underline"
                  >
                    {m.name}
                  </Link>
                  {me && (
                    <span className="bg-ink text-canvas rounded-pill ml-2 px-2 py-0.5 text-[11px] font-bold">
                      {ts('you')}
                    </span>
                  )}
                  <p className="text-ink/70 text-[13px] [overflow-wrap:anywhere]">{m.email}</p>
                </div>
                <p className="text-ink/75 text-[13px]">
                  {ts('twoFactor')}:{' '}
                  <span className="font-semibold">{m.twoFactor ? ts('on') : ts('off')}</span>
                  {m.twoFactor && !me && (
                    <button
                      type="button"
                      onClick={() => reset.mutate(m.id, { onSuccess: () => toast.show(ts('resetDone')), onError: () => toast.show(ts('failed')) })}
                      disabled={reset.isPending}
                      className="ml-2 font-bold underline decoration-1 underline-offset-4"
                    >
                      {ts('resetTwoFactor')}
                    </button>
                  )}
                  <br />
                  {ts('lastSeen')}:{' '}
                  <span className="tabular-nums">
                    {m.lastSeenAt ? when.format(new Date(m.lastSeenAt)) : ts('never')}
                  </span>
                </p>
                {me ? (
                  <span className="border-ink/25 rounded-pill border px-3 py-1.5 text-[14px] font-semibold">
                    {ts(`roles.${m.staffRole}`)}
                  </span>
                ) : (
                  <StaffRoleSelect id={m.id} value={m.staffRole} label={`${ts('role')}: ${m.name}`} />
                )}
              </li>
            );
          })}
        </ul>
      )}
      <Panel title={ts('access')}>
        <dl className="divide-ink/10 flex flex-col divide-y text-[15px]">
          {STAFF_ROLES.map((r) => (
            <div key={r} className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-2.5">
              <dt className="font-semibold">{ts(`roles.${r}`)}</dt>
              <dd className="text-ink/75" data-sections={STAFF_PERMISSIONS[r].join(' ')}>
                {ts(`may.${r}`)}
              </dd>
            </div>
          ))}
        </dl>
      </Panel>
    </div>
  );
}
