'use client';

import { useTranslations } from 'next-intl';
import { useResendVerification } from '@/components/auth/use-resend-verification';
import { Button } from '@/components/ui/Button';
import { useSession } from '@/lib/session/SessionProvider';

function MailIcon() {
  return (
    <span
      aria-hidden="true"
      className="bg-sticker-sun rounded-pill inline-grid size-8 shrink-0 place-items-center border border-black text-black"
    >
      <svg
        viewBox="0 0 24 24"
        className="size-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      >
        <rect x="3" y="5.5" width="18" height="13" rx="2" />
        <path d="m4 7 8 6 8-6" />
      </svg>
    </span>
  );
}

/** A thin strip under the header until the signed-in person confirms their email, with "send again". */
export function VerifyEmailBanner() {
  const { status, user } = useSession();
  if (status !== 'authenticated' || !user || user.emailVerified) return null;
  return <Banner />;
}

function Banner() {
  const t = useTranslations('banner.verifyEmail');
  const tErrors = useTranslations('errors');
  const { resend, busy, retryInSeconds } = useResendVerification();

  return (
    <div className="border-ink bg-surface border-b">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 sm:px-8">
        <MailIcon />
        <p className="min-w-0 flex-1 text-sm font-bold">{t('title')}</p>
        <div className="flex flex-wrap items-center gap-3">
          {retryInSeconds > 0 && (
            <p className="text-sm" aria-live="polite">
              {tErrors('retryIn', { seconds: retryInSeconds })}
            </p>
          )}
          <Button variant="ghost" onClick={resend} loading={busy} disabled={retryInSeconds > 0}>
            {t('resend')}
          </Button>
        </div>
      </div>
    </div>
  );
}
