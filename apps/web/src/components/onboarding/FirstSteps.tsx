'use client';

import { useNow, useTranslations } from 'next-intl';
import { RetryAfterNotice } from '@/components/auth/RetryAfterNotice';
import { useResendVerification } from '@/components/auth/use-resend-verification';
import { Button } from '@/components/ui/Button';
import { Link } from '@/i18n/navigation';
import { Sheet } from '@/components/ui/Sheet';
import { useDealsSummary } from '@/lib/deals/queries';
import { useMyListings } from '@/lib/listings/queries';
import { useSession } from '@/lib/session/SessionProvider';

/** How long a new account sees its first steps: its first month (the month it rents without a fee). */
const FIRST_MONTH_MS = 30 * 24 * 60 * 60 * 1000;

type Step = { key: 'account' | 'email' | 'identity' | 'about' | 'first'; done: boolean; href?: string };

/**
 * A new account's first steps (owner, 2026-11-26: make using Yoyo as positive as possible): what is done and
 * what is left to rent and lend safely, each with its way there, and the first month without a service fee.
 * Shown to the signed-in person only, on their own profile, in their first month, until every step is done;
 * then it is gone (owner, 2026-11-28: not on the home). Confirming the email is asked here, with "send again"
 * on its step, instead of a strip under the header on every page.
 */
export function FirstSteps({ tone = 'night', forUserId }: { tone?: 'night' | 'quiet'; forUserId?: string }) {
  const t = useTranslations('firstSteps');
  const { user, status } = useSession();
  const signedIn = status === 'authenticated' && !!user && user.role !== 'ADMIN';
  const listings = useMyListings(signedIn ? 'ALL' : null);
  const deals = useDealsSummary(signedIn);
  const now = useNow({ updateInterval: 60 * 60 * 1000 });
  if (!signedIn || !user) return null;
  // On a profile: only on one's own.
  if (forUserId && forUserId !== user.id) return null;
  if (now.getTime() - new Date(user.createdAt).getTime() > FIRST_MONTH_MS) return null;
  if (listings.isPending || deals.isPending) return null;

  const hasFirst = (listings.data?.length ?? 0) > 0 || (deals.data ? deals.data.renter.open + deals.data.owner.open > 0 : false);
  // The account itself counts: a new person starts at 1 of 5, already on the way, not at nothing.
  const steps: Step[] = [
    { key: 'account', done: true },
    { key: 'email', done: user.emailVerified },
    { key: 'identity', done: user.identityVerified, href: '/verify-identity' },
    { key: 'about', done: Boolean(user.about?.trim() && user.city), href: '/settings' },
    { key: 'first', done: hasFirst, href: '/c' },
  ];
  const done = steps.filter((s) => s.done).length;
  if (done === steps.length) return null;

  return (
    <Sheet tone={tone} aria-labelledby="first-steps" className="flex flex-col gap-5" data-first-steps="">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
        <h2 id="first-steps" className="type-block">
          {t('title')}
        </h2>
        <span className="border-ink/25 rounded-pill inline-flex min-h-8 -translate-y-1 items-center border px-3 text-sm font-bold tabular-nums">
          <span aria-hidden="true">
            {done} / {steps.length}
          </span>
          <span className="sr-only">{t('progress', { done, total: steps.length })}</span>
        </span>
      </div>
      <ol className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {steps.map((step) => (
          <li key={step.key} data-step={step.key} data-done={step.done || undefined}>
            <StepRow
              step={step}
              label={t(`steps.${step.key}.title`)}
              hint={step.done ? t('done') : t(`steps.${step.key}.hint`)}
              action={step.key === 'email' && !step.done ? <ResendButton /> : undefined}
            />
          </li>
        ))}
      </ol>
      <p className="text-ink/80 flex items-start gap-2 text-sm leading-relaxed">
        <span aria-hidden="true" className="mt-1.5 size-2 shrink-0 rounded-full bg-[rgb(77_124_255)] shadow-[0_0_10px_2px_rgb(77_124_255/0.6)]" />
        {t('welcome')}
      </p>
    </Sheet>
  );
}

/** "Send again" for the confirmation email, on its step; a countdown when asked too often. */
function ResendButton() {
  const t = useTranslations('banner.verifyEmail');
  const { resend, busy, retryInSeconds } = useResendVerification();
  return (
    <span className="flex shrink-0 flex-col items-end gap-1">
      <Button variant="ghost" size="md" onClick={resend} loading={busy} disabled={retryInSeconds > 0} className="min-h-9 px-3.5 text-xs">
        {t('resend')}
      </Button>
      <RetryAfterNotice seconds={retryInSeconds} inline />
    </span>
  );
}

/**
 * After the first month the steps are gone, but an unconfirmed email is still asked for on one's own
 * profile: one quiet row with "send again" (it used to be a strip under the header on every page).
 */
export function EmailReminder({ forUserId }: { forUserId: string }) {
  const t = useTranslations('banner.verifyEmail');
  const { user, status } = useSession();
  const now = useNow({ updateInterval: 60 * 60 * 1000 });
  if (status !== 'authenticated' || !user || user.id !== forUserId || user.emailVerified || user.role === 'ADMIN') return null;
  // In the first month the first steps ask for it (with the same button).
  if (now.getTime() - new Date(user.createdAt).getTime() <= FIRST_MONTH_MS) return null;
  return (
    <Sheet pad="sm" aria-label={t('title')} className="flex flex-wrap items-center justify-between gap-3" data-email-reminder="">
      <p className="m-0 font-bold">{t('title')}</p>
      <ResendButton />
    </Sheet>
  );
}

function StepRow({ step, label, hint, action }: { step: Step; label: string; hint: string; action?: React.ReactNode }) {
  const body = (
    <>
      <span
        aria-hidden="true"
        className={`grid size-7 shrink-0 place-items-center rounded-full border ${step.done ? 'bg-ink text-canvas border-ink' : 'border-ink/35'}`}
      >
        {step.done && (
          <svg viewBox="0 0 24 24" className="size-4 fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:2.5]">
            <path d="m5 12.5 4.5 4.5L19 7.5" />
          </svg>
        )}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className={`font-bold ${step.done ? 'text-ink/60 line-through decoration-1' : ''}`}>{label}</span>
        <span className="text-ink/70 text-sm">{hint}</span>
      </span>
    </>
  );
  const row = 'border-ink/15 rounded-tile flex items-center gap-3 border p-3';
  return step.done || !step.href ? (
    <div className={`${row} ${action ? 'flex-wrap' : ''}`}>
      {body}
      {action}
    </div>
  ) : (
    <Link href={step.href} className={`${row} hover:border-ink/50 transition-colors`}>
      {body}
    </Link>
  );
}
