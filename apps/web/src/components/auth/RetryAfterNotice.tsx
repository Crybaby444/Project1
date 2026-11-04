'use client';

import { useTranslations } from 'next-intl';

/** "Too many attempts, try again in N s", ticking down while the submit button waits. */
export function RetryAfterNotice({ seconds }: { seconds: number }) {
  const t = useTranslations('errors');
  if (seconds <= 0) return null;
  return (
    <p role="status" className="bg-mist rounded-card px-4 py-3 text-sm font-bold">
      {t('retryIn', { seconds })}
    </p>
  );
}
