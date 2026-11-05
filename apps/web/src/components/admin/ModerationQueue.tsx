'use client';

import { displayFit } from '@/lib/display-fit';
import { useQueryClient } from '@tanstack/react-query';
import { ADMIN_LISTINGS_PAGE_SIZE, type AdminListing } from '@yoyo/shared';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Sticker } from '@/components/ui/Sticker';
import { useToast } from '@/components/ui/Toast';
import { useErrorText } from '@/lib/forms/error-text';
import { listingKeys, useCategories, useModerationQueue } from '@/lib/listings/queries';
import { ApiError, unwrap } from '@/lib/session/api-error';
import { useApiClient } from '@/lib/session/SessionProvider';
import { ModerationCard } from './ModerationCard';
import { RejectDialog } from './RejectDialog';

/**
 * The review queue (spec §4.8), administrators only (the page is behind RequireRole; the API checks
 * the role anyway). Each decision carries the version shown, so an owner's change made meanwhile is
 * never approved unseen (409 → the queue reloads with the latest version).
 */
export function ModerationQueue({ page }: { page: number }) {
  const t = useTranslations('moderation');
  const errorText = useErrorText();
  const toast = useToast();
  const client = useApiClient();
  const queryClient = useQueryClient();
  const query = useModerationQueue(page);
  const categories = useCategories().data ?? [];
  const [rejecting, setRejecting] = useState<AdminListing | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function decide(
    listing: AdminListing,
    decision: { action: 'approve' } | { action: 'reject'; reason: string },
  ) {
    setBusyId(listing.id);
    setNotice(null);
    try {
      const path = { params: { path: { id: listing.id } } };
      if (decision.action === 'approve') {
        await unwrap(
          client.POST('/api/v1/admin/listings/{id}/approve', { ...path, body: { version: listing.version } }),
        );
      } else {
        await unwrap(
          client.POST('/api/v1/admin/listings/{id}/reject', {
            ...path,
            body: { reason: decision.reason, version: listing.version },
          }),
        );
      }
      setRejecting(null);
      toast.show(decision.action === 'approve' ? t('approved') : t('rejected'));
    } catch (error) {
      setRejecting(null);
      setNotice(error instanceof ApiError && error.status === 409 ? t('changed') : errorText(error));
    } finally {
      setBusyId(null);
      await queryClient.invalidateQueries({ queryKey: listingKeys.queue(page) });
    }
  }

  const total = query.data?.total ?? 0;
  const items = query.data?.items ?? [];
  const from = (page - 1) * ADMIN_LISTINGS_PAGE_SIZE + 1;
  const to = from + items.length - 1;
  const pages = Math.max(1, Math.ceil(total / ADMIN_LISTINGS_PAGE_SIZE));

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10 sm:px-8 sm:py-14">
      <header className="@container flex flex-col gap-2">
        <h1
          style={displayFit(t('title'), { max: '3.5rem' })}
          className="font-display text-display-fit leading-[0.85] font-black uppercase"
        >
          {t('title')}
        </h1>
        <p className="leading-relaxed">{t('intro')}</p>
      </header>

      {notice && (
        <p
          role="alert"
          className="bg-sticker-lavender rounded-card border border-black p-4 font-bold text-black"
        >
          {notice}
        </p>
      )}

      {query.isPending ? (
        <div aria-busy="true" className="flex flex-col gap-6">
          {[0, 1].map((key) => (
            <div
              key={key}
              aria-hidden="true"
              className="border-ink/20 bg-surface rounded-card-xl h-96 animate-pulse border"
            />
          ))}
        </div>
      ) : query.isError ? (
        <div
          role="alert"
          className="border-ink bg-surface rounded-card flex flex-col items-start gap-3 border p-6"
        >
          <p className="font-bold">{t('loadFailed')}</p>
          <p>{errorText(query.error)}</p>
          <Button variant="ghost" onClick={() => void query.refetch()}>
            {t('retry')}
          </Button>
        </div>
      ) : items.length === 0 ? (
        <section className="border-ink bg-surface rounded-card-xl flex flex-col items-center gap-4 border px-6 py-14 text-center">
          <Sticker kind="check" size={88} />
          <h2 className="text-2xl font-bold">{t('emptyTitle')}</h2>
          <p className="max-w-[52ch] leading-relaxed">{t('emptyBody')}</p>
        </section>
      ) : (
        <>
          <p role="status" className="text-sm font-bold">
            {t('showing', { from, to, total })}
          </p>
          <ul className="flex flex-col gap-6">
            {items.map((listing) => (
              <li key={`${listing.id}:${listing.version}`} className="animate-pop-in">
                <ModerationCard
                  listing={listing}
                  categories={categories}
                  busy={busyId === listing.id}
                  onApprove={() => void decide(listing, { action: 'approve' })}
                  onReject={() => setRejecting(listing)}
                />
              </li>
            ))}
          </ul>
          {pages > 1 && (
            <nav aria-label={t('pages')} className="flex flex-wrap justify-between gap-3">
              {page > 1 ? (
                <Button variant="ghost" href={`/admin/listings?page=${page - 1}`}>
                  {t('previous')}
                </Button>
              ) : (
                <span />
              )}
              {page < pages && (
                <Button variant="ghost" href={`/admin/listings?page=${page + 1}`}>
                  {t('next')}
                </Button>
              )}
            </nav>
          )}
        </>
      )}

      {rejecting && (
        <RejectDialog
          key={rejecting.id}
          open
          busy={busyId === rejecting.id}
          onClose={() => setRejecting(null)}
          onReject={(reason) => void decide(rejecting, { action: 'reject', reason })}
        />
      )}
    </main>
  );
}
