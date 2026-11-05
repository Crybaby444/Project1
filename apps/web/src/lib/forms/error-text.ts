'use client';

import { isErrorCode } from '@yoyo/shared';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';
import { ApiError } from '@/lib/session/api-error';

/** The person-readable text for any failure: `errors.<CODE>`, a countdown for 429, INTERNAL for the unknown. */
export function useErrorText(): (error: unknown) => string {
  const t = useTranslations('errors');
  return useCallback(
    (error: unknown) => {
      if (!(error instanceof ApiError)) return t('INTERNAL');
      if (error.code === 'RATE_LIMITED' && error.retryAfterSeconds) {
        return t('retryIn', { seconds: error.retryAfterSeconds });
      }
      return error.code === 'NETWORK' || isErrorCode(error.code) ? t(error.code) : t('INTERNAL');
    },
    [t],
  );
}
