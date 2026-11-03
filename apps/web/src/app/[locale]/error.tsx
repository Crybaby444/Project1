'use client';

import { useTranslations } from 'next-intl';
import { ErrorView } from '@/components/ErrorView';
import { Button } from '@/components/ui/Button';

/**
 * Error boundary for every localized page: a Yoyo-styled 500 in the visitor's language.
 * The raw error is never shown to visitors (Next.js logs it on the server).
 */
export default function LocaleError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations('error');

  return (
    <ErrorView
      title={t('title')}
      body={t('body')}
      retryLabel={t('retry')}
      onRetry={reset}
      backLink={
        <Button variant="ghost" href="/">
          {t('back')}
        </Button>
      }
    />
  );
}
