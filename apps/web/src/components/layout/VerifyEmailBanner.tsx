'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useErrorText } from '@/lib/forms/error-text';
import { ApiError, unwrap } from '@/lib/session/api-error';
import { useApiClient, useSession } from '@/lib/session/SessionProvider';
import { useCountdown } from '@/lib/use-countdown';

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
  const t = useTranslations('banner.verifyEmail');
  const tErrors = useTranslations('errors');
  const errorText = useErrorText();
  const { status, user } = useSession();
  const client = useApiClient();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const { secondsLeft, start } = useCountdown();

  if (status !== 'authenticated' || !user || user.emailVerified) return null;

  async function resend() {
    setBusy(true);
    try {
      await unwrap(client.POST('/api/v1/auth/resend-verification'));
      toast.show(t('sent'));
    } catch (error) {
      if (error instanceof ApiError && error.code === 'RATE_LIMITED' && error.retryAfterSeconds) {
        start(error.retryAfterSeconds);
      } else {
        toast.show(errorText(error));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-ink bg-surface border-b">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 sm:px-8">
        <MailIcon />
        <p className="min-w-0 flex-1 text-sm font-bold">{t('title')}</p>
        <div className="flex flex-wrap items-center gap-3">
          {secondsLeft > 0 && (
            <p className="text-sm" aria-live="polite">
              {tErrors('retryIn', { seconds: secondsLeft })}
            </p>
          )}
          <Button variant="ghost" onClick={resend} loading={busy} disabled={secondsLeft > 0}>
            {t('resend')}
          </Button>
        </div>
      </div>
    </div>
  );
}
