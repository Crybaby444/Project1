'use client';

import { displayFit } from '@/lib/display-fit';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { useErrorText } from '@/lib/forms/error-text';
import type { BuilderStep } from '@/lib/listings/listing-checks';
import { useListing } from '@/lib/listings/queries';
import { ApiError } from '@/lib/session/api-error';
import { ListingBuilder } from './ListingBuilder';
import { useSession } from '@/lib/session/SessionProvider';
import { myProfileHref } from '@/lib/profile/links';

/**
 * Loads a listing into the builder. Someone else's listing is a 404 from the API (it does not exist
 * for them), shown as "not found" rather than an empty builder.
 */
export function EditListing({ id, initialStep }: { id: string; initialStep: BuilderStep }) {
  const t = useTranslations('builder');
  const { user } = useSession();
  const errorText = useErrorText();
  const query = useListing(id);

  if (query.isPending) {
    return (
      <div aria-busy="true" className="page flex flex-col gap-4 py-10">
        <span className="sr-only" role="status">
          {t('loading')}
        </span>
        <div aria-hidden="true" className="bg-mist rounded-pill h-12 w-72 animate-pulse" />
        <div
          aria-hidden="true"
          className="border-ink/20 bg-surface rounded-media h-96 animate-pulse border"
        />
      </div>
    );
  }

  if (query.isError) {
    const notFound = query.error instanceof ApiError && query.error.status === 404;
    return (
      <main className="page-narrow @container flex flex-col items-start gap-5 py-14">
        <h1
          style={displayFit(notFound ? t('notFound.title') : t('loadFailed'), { max: '3.25rem' })}
          className="font-display text-display-fit leading-[0.85] font-black uppercase"
        >
          {notFound ? t('notFound.title') : t('loadFailed')}
        </h1>
        <p className="leading-relaxed">{notFound ? t('notFound.body') : errorText(query.error)}</p>
        <div className="flex flex-wrap gap-3">
          {!notFound && <Button onClick={() => void query.refetch()}>{t('retry')}</Button>}
          <Button variant="ghost" href={user ? myProfileHref(user.id) : '/'}>
            {t('notFound.toMine')}
          </Button>
        </div>
      </main>
    );
  }

  return <ListingBuilder key={query.data.id} initial={query.data} initialStep={initialStep} />;
}
