'use client';

import type { BookingView } from '@yoyo/shared';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { useToast } from '@/components/ui/Toast';
import { useRefreshAfterDeal } from '@/lib/deals/queries';
import { useErrorText } from '@/lib/forms/error-text';
import { unwrap } from '@/lib/session/api-error';
import { useApiClient } from '@/lib/session/SessionProvider';

/** Contracts are signed through a provider (Smart-ID, Mobile-ID, eParaksts) when the site is set up for it. */
export const PROVIDER_SIGNING = process.env.NEXT_PUBLIC_SIGNATURES === 'dokobit';

const CHECK_EVERY_MS = 3000;

/**
 * Signing with the provider (audit C1): the provider's own page inside the dialog, and a check every few
 * seconds; the API records the signature only once the provider confirms it, then the deal moves on here.
 */
export function ProviderSign({ booking, onClose }: { booking: BookingView; onClose(): void }) {
  const t = useTranslations('dealActions.sign.provider');
  const client = useApiClient();
  const toast = useToast();
  const errorText = useErrorText();
  const refresh = useRefreshAfterDeal();
  const [url, setUrl] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const path = { params: { path: { id: booking.id } } };

  useEffect(() => {
    let live = true;
    unwrap(client.POST('/api/v1/bookings/{id}/signing', path))
      .then((started) => live && setUrl(started.url))
      .catch((error: unknown) => live && setProblem(errorText(error)));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one signing per attempt
  }, [attempt]);

  useEffect(() => {
    if (!url) return;
    const timer = setInterval(() => {
      unwrap(client.GET('/api/v1/bookings/{id}/signing', path))
        .then(async ({ state }) => {
          if (state === 'SIGNED') {
            clearInterval(timer);
            await refresh();
            toast.show(t('done'));
            onClose();
          } else if (state === 'FAILED') {
            clearInterval(timer);
            setUrl(null);
            setProblem(t('failed'));
          }
        })
        .catch(() => {});
    }, CHECK_EVERY_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- polls the signing this page opened
  }, [url]);

  return (
    <Dialog open onClose={onClose} title={t('title')} wide>
      <div className="flex flex-col gap-4">
        <p>{t('lead')}</p>
        {problem ? (
          <div role="alert" className="bg-mist rounded-media flex flex-col items-start gap-3 p-4">
            <p className="font-bold">{problem}</p>
            <Button
              variant="ghost"
              onClick={() => {
                setProblem(null);
                setAttempt((n) => n + 1);
              }}
            >
              {t('retry')}
            </Button>
          </div>
        ) : url ? (
          <>
            <iframe src={url} title={t('frame')} className="border-ink/15 rounded-media h-[70dvh] min-h-96 w-full border bg-white" allow="publickey-credentials-get *" />
            <p role="status" className="text-ink/65 text-sm">
              {t('waiting')}{' '}
              <a href={url} target="_blank" rel="noopener noreferrer" className="font-bold underline">
                {t('openNew')}
              </a>
            </p>
          </>
        ) : (
          <div aria-busy="true" className="bg-mist rounded-media h-96 animate-pulse" />
        )}
      </div>
    </Dialog>
  );
}
