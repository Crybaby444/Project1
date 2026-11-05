'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { unwrap } from '@/lib/session/api-error';
import { useApiClient } from '@/lib/session/SessionProvider';
import { useBuilder } from './BuilderContext';
import { ListingActions, type ListingAction } from './ListingActions';
import { ListingStatusBadge } from './ListingStatusBadge';

/** Where the listing stands, what that means for edits, and what the owner can do about it. */
export function StatusBanner() {
  const t = useTranslations('builder.status');
  const tStatus = useTranslations('listingStatus');
  const client = useApiClient();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { draft, goTo } = useBuilder();
  const listing = draft.listing;
  // A new listing shows the draft banner from the start, so nothing jumps when its first change creates it.
  const status = listing?.status ?? 'DRAFT';

  async function perform(action: ListingAction) {
    await draft.withListing(async (current) => {
      const path = { params: { path: { id: current.id } } };
      if (action === 'delete') {
        await unwrap(client.DELETE('/api/v1/listings/{id}', path));
        return (latest) => ({ ...latest, status: latest.publishedAt === null ? latest.status : 'ARCHIVED' });
      }
      const answer = await unwrap(
        action === 'hide'
          ? client.POST('/api/v1/listings/{id}/hide', path)
          : client.POST('/api/v1/listings/{id}/unhide', path),
      );
      return () => answer.listing;
    });
    void queryClient.invalidateQueries({ queryKey: ['listings', 'mine'] });
    if (action === 'delete') router.push('/dashboard/lending');
  }

  return (
    <section
      aria-label={tStatus(status)}
      className="border-ink bg-surface rounded-card flex flex-col gap-3 border p-5"
    >
      <div className="flex flex-wrap items-center gap-3">
        <ListingStatusBadge status={status} />
        {status !== 'REJECTED' && <p className="max-w-[80ch] text-sm leading-relaxed">{t(status)}</p>}
      </div>
      {status === 'REJECTED' && (
        <div className="flex flex-col gap-2">
          <p className="text-sm">{t('REJECTED')}</p>
          <blockquote className="border-sticker-ember border-l-4 py-1 pl-4 text-base font-bold [overflow-wrap:anywhere]">
            {listing?.rejectionReason}
          </blockquote>
          <p className="text-sm">
            {t('REJECTED_next')}{' '}
            <a
              href="?step=rules"
              onClick={(event) => {
                event.preventDefault();
                goTo('rules');
              }}
              className="font-bold underline underline-offset-4"
            >
              {t('REJECTED_link')}
            </a>
          </p>
        </div>
      )}
      {listing ? (
        <ListingActions listing={listing} perform={perform} />
      ) : (
        <div aria-hidden="true" className="min-h-10" />
      )}
    </section>
  );
}
