'use client';

import { displayFit } from '@/lib/display-fit';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { useErrorText } from '@/lib/forms/error-text';
import type { BuilderStep } from '@/lib/listings/listing-checks';
import { useListing } from '@/lib/listings/queries';
import { ApiError } from '@/lib/session/api-error';
import { ListingBuilder } from './ListingBuilder';

/**
 * Loads a listing into the builder. Someone else's listing is a 404 from the API (it does not exist
 * for them), shown as "not found" rather than an empty builder.
 */
export function EditListing({ id, initialStep }: { id: string; initialStep: BuilderStep }) {
  const t = useTranslations('builder');
  const errorText = useErrorText();
  const query = useListing(id);

  if (query.isPending) {
    return (
      <div aria-busy="true" className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-4 py-10 sm:px-8">
        <span className="sr-only" role="status">
          {t('loading')}
        </span>
        <div aria-hidden="true" className="bg-mist rounded-pill h-12 w-72 animate-pulse" />
        <div
          aria-hidden="true"
          className="border-ink/20 bg-surface rounded-card-xl h-96 animate-pulse border"
        />
      </div>
    );
  }

  if (query.isError) {
    const notFound = query.error instanceof ApiError && query.error.status === 404;
    return (
      <main className="@container mx-auto flex w-full max-w-3xl flex-col items-start gap-5 px-4 py-14">
        <h1
          style={displayFit(notFound ? t('notFound.title') : t('loadFailed'), { max: '3.25rem' })}
          className="font-display text-display-fit leading-[0.85] font-black uppercase"
        >
          {notFound ? t('notFound.title') : t('loadFailed')}
        </h1>
        <p className="leading-relaxed">{notFound ? t('notFound.body') : errorText(query.error)}</p>
        <div className="flex flex-wrap gap-3">
          {!notFound && <Button onClick={() => void query.refetch()}>{t('retry')}</Button>}
          <Button variant="ghost" href="/dashboard/lending">
            {t('notFound.toMine')}
          </Button>
        </div>
      </main>
    );
  }

  return <ListingBuilder key={query.data.id} initial={query.data} initialStep={initialStep} />;
}
