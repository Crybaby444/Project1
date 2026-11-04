'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { useErrorText } from '@/lib/forms/error-text';
import { ApiError, unwrap } from '@/lib/session/api-error';
import { useApiClient } from '@/lib/session/SessionProvider';
import { useCountdown } from '@/lib/use-countdown';

/**
 * "Send the confirmation email again" (POST /auth/resend-verification) for the signed-in person:
 * a toast when it is on its way, a Retry-After countdown on 429, the error text otherwise.
 */
export function useResendVerification(): { resend(): Promise<void>; busy: boolean; retryInSeconds: number } {
  const t = useTranslations('banner.verifyEmail');
  const errorText = useErrorText();
  const client = useApiClient();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const { secondsLeft, start } = useCountdown();

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

  return { resend, busy, retryInSeconds: secondsLeft };
}
