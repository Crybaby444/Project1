'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useRouter } from '@/i18n/navigation';
import { useErrorText } from '@/lib/forms/error-text';
import { BUILDER_STEPS, stepOf, type BuilderStep } from '@/lib/listings/listing-checks';
import { ApiError, unwrap } from '@/lib/session/api-error';
import { useApiClient } from '@/lib/session/SessionProvider';
import { useBuilder } from '../BuilderContext';

/**
 * Step 6 (second half): what review still needs, step by step with links, and "Send for review".
 * Only drafts and rejected listings are sent; a live listing goes back to review by itself.
 */
export function SubmitPanel() {
  const t = useTranslations('builder.submit');
  const tSteps = useTranslations('builder.steps');
  const client = useApiClient();
  const queryClient = useQueryClient();
  const router = useRouter();
  const toast = useToast();
  const errorText = useErrorText();
  const { draft, missing, setAttempted, goTo, readOnly } = useBuilder();
  const [serverFields, setServerFields] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const list = useRef<HTMLUListElement>(null);
  const status = draft.listing?.status ?? 'DRAFT';
  if (status !== 'DRAFT' && status !== 'REJECTED') return null;

  const fields = [...new Set([...Object.keys(missing), ...serverFields])];
  const byStep = new Map<BuilderStep, number>();
  for (const field of fields) byStep.set(stepOf(field), (byStep.get(stepOf(field)) ?? 0) + 1);
  const steps = BUILDER_STEPS.filter((step) => byStep.has(step));

  async function send() {
    setError(null);
    if (fields.length > 0) {
      setAttempted(true);
      list.current?.focus();
      return;
    }
    setBusy(true);
    try {
      await draft.flush();
      await draft.withListing(async (listing) => {
        const answer = await unwrap(
          client.POST('/api/v1/listings/{id}/submit', { params: { path: { id: listing.id } } }),
        );
        return () => answer.listing;
      });
      void queryClient.invalidateQueries({ queryKey: ['listings', 'mine'] });
      toast.show(t('sent'));
      router.push('/dashboard/lending');
    } catch (failure) {
      if (failure instanceof ApiError && failure.code === 'LISTING_INCOMPLETE') {
        setServerFields(Object.keys(failure.fields ?? {}));
        setAttempted(true);
        requestAnimationFrame(() => list.current?.focus());
      } else setError(errorText(failure));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="submit-title" className="border-ink/20 flex flex-col gap-4 border-t pt-6">
      <h3 id="submit-title" className="text-xl font-bold">
        {t('title')}
      </h3>
      <p className="text-sm leading-relaxed">{t('intro')}</p>
      {steps.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p id="submit-left" className="text-[13px] font-bold tracking-[0.03em] uppercase">
            {t('left')}
          </p>
          <ul ref={list} tabIndex={-1} aria-labelledby="submit-left" className="flex flex-wrap gap-2">
            {steps.map((step) => (
              <li key={step}>
                <a
                  href={`?step=${step}`}
                  onClick={(event) => {
                    event.preventDefault();
                    setAttempted(true);
                    goTo(step);
                  }}
                  className="bg-ink text-canvas rounded-pill ease-yoyo inline-flex min-h-10 items-center border border-ink/15 px-4 text-sm font-bold transition-transform duration-150 hover:-translate-y-0.5 active:scale-[0.96]"
                >
                  {t('leftStep', { step: tSteps(step), count: byStep.get(step)! })}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="flex items-center gap-2 text-sm font-bold">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
            <circle cx="12" cy="12" r="10" fill="var(--glow)" stroke="#000" />
            <path
              d="m7.5 12.5 3 3 6-6.5"
              fill="none"
              stroke="#000"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {t('ready')}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm font-bold">
          {error}
        </p>
      )}
      <Button size="lg" className="self-start" onClick={() => void send()} loading={busy} disabled={readOnly}>
        {t('send')}
      </Button>
    </section>
  );
}
