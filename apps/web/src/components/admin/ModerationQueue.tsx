'use client';

import { displayFit } from '@/lib/display-fit';
import { useQueryClient } from '@tanstack/react-query';
import { ADMIN_LISTINGS_PAGE_SIZE, type AdminListing } from '@yoyo/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Mark } from '@/components/brand/Mark';
import { useToast } from '@/components/ui/Toast';
import { useErrorText } from '@/lib/forms/error-text';
import { Link } from '@/i18n/navigation';
import { findPath } from '@/lib/listings/categories';
import { listingKeys, useCategories, useModerationQueue, type ModerationQueueName } from '@/lib/listings/queries';
import { ApiError, unwrap } from '@/lib/session/api-error';
import { useApiClient } from '@/lib/session/SessionProvider';
import { ModerationCard } from './ModerationCard';
import { MoveCategoryDialog } from './MoveCategoryDialog';
import { RejectDialog } from './RejectDialog';

/**
 * The review queue (spec §4.8), administrators only (the page is behind RequireRole; the API checks
 * the role anyway). Each decision carries the version shown, so an owner's change made meanwhile is
 * never approved unseen (409 → the queue reloads with the latest version).
 */
export function ModerationQueue({ page, queue = 'review' }: { page: number; queue?: ModerationQueueName }) {
  const t = useTranslations('moderation');
  const locale = useLocale();
  const errorText = useErrorText();
  const toast = useToast();
  const client = useApiClient();
  const queryClient = useQueryClient();
  const query = useModerationQueue(page, queue);
  const categories = useCategories().data ?? [];
  const [rejecting, setRejecting] = useState<AdminListing | null>(null);
  const [moving, setMoving] = useState<AdminListing | null>(null);
  const base = queue === 'other' ? '/admin/listings?queue=other' : '/admin/listings';
  const pageHref = (number: number) => `${base}${queue === 'other' ? '&' : '?'}page=${number}`;
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
      await queryClient.invalidateQueries({ queryKey: listingKeys.queue(page, queue) });
    }
  }

  /** Files a listing under another category; the owner gets an email in their language. */
  async function move(listing: AdminListing, categoryId: string) {
    setBusyId(listing.id);
    setNotice(null);
    try {
      await unwrap(
        client.POST('/api/v1/admin/listings/{id}/category', {
          params: { path: { id: listing.id } },
          body: { categoryId, version: listing.version },
        }),
      );
      const name = findPath(categories, categoryId)
        .map((node) => node.names[locale as keyof typeof node.names])
        .join(' · ');
      toast.show(t('move.done', { category: name }));
    } catch (error) {
      setNotice(error instanceof ApiError && error.status === 409 ? t('changed') : errorText(error));
    } finally {
      setMoving(null);
      setBusyId(null);
      await queryClient.invalidateQueries({ queryKey: ['listings', 'queue'] });
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
        <p className="leading-relaxed">{queue === 'other' ? t('otherIntro') : t('intro')}</p>
      </header>

      <nav aria-label={t('queues')} className="flex flex-wrap gap-2">
        {(['review', 'other'] as const).map((name) => (
          <Link
            key={name}
            href={name === 'other' ? '/admin/listings?queue=other' : '/admin/listings'}
            aria-current={queue === name ? 'page' : undefined}
            className={`rounded-pill ease-yoyo inline-flex min-h-10 items-center border px-4 text-[13px] font-bold tracking-[0.03em] uppercase transition-transform duration-150 hover:-translate-y-0.5 ${
              queue === name ? 'bg-cta text-cta-fg border-cta' : 'border-ink bg-surface text-ink'
            }`}
          >
            {t(name === 'other' ? 'queueOther' : 'queueReview')}
          </Link>
        ))}
      </nav>

      {notice && (
        <p
          role="alert"
          className="bg-mist rounded-media border border-ink/15 p-4 font-bold text-ink"
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
              className="border-ink/20 bg-surface rounded-media h-96 animate-pulse border"
            />
          ))}
        </div>
      ) : query.isError ? (
        <div
          role="alert"
          className="border-ink/15 bg-surface rounded-media flex flex-col items-start gap-3 border p-6"
        >
          <p className="font-bold">{t('loadFailed')}</p>
          <p>{errorText(query.error)}</p>
          <Button variant="ghost" onClick={() => void query.refetch()}>
            {t('retry')}
          </Button>
        </div>
      ) : items.length === 0 ? (
        <section className="border-ink/15 flex flex-col items-center gap-4 border-y px-6 py-16 text-center">
          <Mark size={88} string={false} className="shrink-0 animate-[spin_6s_linear_infinite] motion-reduce:animate-none" />
          <h2 className="font-display text-[clamp(1.9rem,3.2vw,2.8rem)] leading-[0.95] font-black uppercase">{queue === 'other' ? t('otherEmptyTitle') : t('emptyTitle')}</h2>
          <p className="max-w-[52ch] leading-relaxed">{queue === 'other' ? t('otherEmptyBody') : t('emptyBody')}</p>
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
                  {...(queue === 'other' && { onMove: () => setMoving(listing) })}
                />
              </li>
            ))}
          </ul>
          {pages > 1 && (
            <nav aria-label={t('pages')} className="flex flex-wrap justify-between gap-3">
              {page > 1 ? (
                <Button variant="ghost" href={pageHref(page - 1)}>
                  {t('previous')}
                </Button>
              ) : (
                <span />
              )}
              {page < pages && (
                <Button variant="ghost" href={pageHref(page + 1)}>
                  {t('next')}
                </Button>
              )}
            </nav>
          )}
        </>
      )}

      {moving && (
        <MoveCategoryDialog
          key={moving.id}
          categories={categories}
          currentId={moving.categoryId}
          title={moving.title ?? ''}
          busy={busyId === moving.id}
          onClose={() => setMoving(null)}
          onMove={(categoryId) => void move(moving, categoryId)}
        />
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
