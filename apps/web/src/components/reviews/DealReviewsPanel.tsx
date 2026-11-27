'use client';

import { REVIEW_TEXT, type DealReviews } from '@yoyo/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { useId, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { TEXTAREA_CLASS } from '@/components/ui/inputs';
import { unwrap } from '@/lib/session/api-error';
import { useApiClient } from '@/lib/session/SessionProvider';
import { useErrorText } from '@/lib/forms/error-text';
import { dateLocale } from '@/lib/deals/dates';
import { ReviewList } from './ReviewList';
import { StarInput } from './StarInput';
import { Sheet } from '@/components/ui/Sheet';

const key = (bookingId: string) => ['bookings', bookingId, 'reviews'] as const;

/** A completed deal's reviews: whether this side may still write, theirs and mine (one request, shared). */
export function useDealReviews(bookingId: string) {
  const client = useApiClient();
  return useQuery({
    queryKey: key(bookingId),
    queryFn: () => unwrap(client.GET('/api/v1/bookings/{id}/reviews', { params: { path: { id: bookingId } } })),
  });
}

/**
 * Reviews on a completed deal's page (plan 10): the form while this side may still write theirs (the
 * renter also scores the item), then theirs, and the other side's once it is public. Blind: until both
 * wrote or the window closed, the other side's review is only announced, never shown.
 */
export function DealReviewsPanel({ bookingId, otherName }: { bookingId: string; otherName: string }) {
  const t = useTranslations('reviews.deal');
  const locale = useLocale();
  const client = useApiClient();
  const queryClient = useQueryClient();
  const errorText = useErrorText();
  const textId = useId();
  const [rating, setRating] = useState(0);
  const [itemRating, setItemRating] = useState(0);
  const [text, setText] = useState('');
  const [tried, setTried] = useState(false);

  const reviews = useDealReviews(bookingId);
  const send = useMutation({
    mutationFn: () =>
      unwrap(
        client.POST('/api/v1/bookings/{id}/reviews', {
          params: { path: { id: bookingId } },
          body: { rating, text: text.trim(), ...(reviews.data?.viewerRole === 'RENTER' ? { itemRating } : {}) },
        }),
      ),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: key(bookingId) }),
  });

  if (!reviews.data) return null;
  const data: DealReviews = reviews.data;
  const asRenter = data.viewerRole === 'RENTER';
  const date = data.deadline
    ? new Intl.DateTimeFormat(dateLocale(locale), { day: 'numeric', month: 'long', timeZone: 'Europe/Riga' }).format(new Date(data.deadline))
    : '';
  const length = text.trim().length;
  const textOk = length >= REVIEW_TEXT.min && length <= REVIEW_TEXT.max;
  const complete = rating > 0 && (!asRenter || itemRating > 0) && textOk;

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setTried(true);
    if (complete) send.mutate();
  }

  return (
    <Sheet id="deal-reviews" aria-labelledby={`${textId}-heading`} className="flex scroll-mt-28 flex-col gap-5" data-deal-reviews="">
      <h2 id={`${textId}-heading`} className="type-block m-0">
        {t('heading')}
      </h2>

      {data.canReview ? (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
          <p className="m-0 max-w-read leading-relaxed">{t('intro', { name: otherName, date })}</p>
          {data.theirsWaiting && <p className="m-0 text-sm font-bold">{t('waiting', { name: otherName })}</p>}
          <StarInput
            legend={t('aboutPerson', { name: otherName })}
            name="person"
            value={rating}
            onChange={setRating}
            error={tried && rating === 0 ? t('errors.stars') : undefined}
          />
          {asRenter && (
            <StarInput
              legend={t('aboutItem')}
              name="item"
              value={itemRating}
              onChange={setItemRating}
              error={tried && itemRating === 0 ? t('errors.stars') : undefined}
            />
          )}
          <div className="flex flex-col gap-1.5">
            <label htmlFor={textId} className="type-label">
              {t('text')}
            </label>
            <textarea
              id={textId}
              value={text}
              onChange={(event) => setText(event.target.value)}
              maxLength={REVIEW_TEXT.max}
              aria-invalid={(tried && !textOk) || undefined}
              aria-describedby={tried && !textOk ? `${textId}-hint ${textId}-error` : `${textId}-hint`}
              className={TEXTAREA_CLASS}
            />
            {tried && !textOk && (
              <p id={`${textId}-error`} className="m-0 flex items-start gap-2 text-sm font-bold">
                <span aria-hidden="true" className="bg-[var(--danger)] border-ink/15 mt-0.5 inline-block size-4 shrink-0 rounded-full border" />
                {t('errors.text', { min: REVIEW_TEXT.min, max: REVIEW_TEXT.max })}
              </p>
            )}
            <p id={`${textId}-hint`} className="m-0 flex justify-between gap-3 text-sm">
              <span>{t('hint', { min: REVIEW_TEXT.min, max: REVIEW_TEXT.max })}</span>
              <span className="tabular-nums">
                {length} / {REVIEW_TEXT.max}
              </span>
            </p>
          </div>
          {send.error && (
            <p role="alert" className="m-0 font-bold">
              {errorText(send.error)}
            </p>
          )}
          <Button type="submit" size="lg" loading={send.isPending} className="self-start">
            {t('submit')}
          </Button>
        </form>
      ) : null}

      {data.mine && !data.theirs && <p className="m-0 max-w-read leading-relaxed">{t('sent', { name: otherName, date })}</p>}
      {data.mine && (
        <div className="flex flex-col gap-2">
          <h3 className="type-label m-0">{t('mine')}</h3>
          <ReviewList reviews={[data.mine]} showItem={asRenter} />
        </div>
      )}
      {data.theirs && (
        <div className="flex flex-col gap-2">
          <h3 className="type-label m-0">{t('theirs', { name: otherName })}</h3>
          <ReviewList reviews={[data.theirs]} />
        </div>
      )}
      {!data.canReview && !data.mine && !data.theirs && <p className="m-0">{t('closed')}</p>}
    </Sheet>
  );
}
