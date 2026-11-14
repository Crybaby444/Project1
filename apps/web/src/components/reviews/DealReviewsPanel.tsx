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
import { ReviewList } from './ReviewList';
import { StarInput } from './StarInput';

const key = (bookingId: string) => ['bookings', bookingId, 'reviews'] as const;

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

  const reviews = useQuery({
    queryKey: key(bookingId),
    queryFn: () => unwrap(client.GET('/api/v1/bookings/{id}/reviews', { params: { path: { id: bookingId } } })),
  });
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
    ? new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(data.deadline))
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
    <section aria-labelledby={`${textId}-heading`} className="border-ink/15 flex flex-col gap-5 border-t pt-6" data-deal-reviews="">
      <h2 id={`${textId}-heading`} className="font-display m-0 text-[clamp(1.9rem,3.2vw,2.8rem)] leading-[0.95] font-black uppercase">
        {t('heading')}
      </h2>

      {data.canReview ? (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
          <p className="m-0 max-w-[60ch] leading-relaxed">{t('intro', { name: otherName, date })}</p>
          {data.theirsWaiting && <p className="m-0 text-sm font-bold">{t('waiting', { name: otherName })}</p>}
          <StarInput legend={t('aboutPerson', { name: otherName })} name="person" value={rating} onChange={setRating} invalid={tried && rating === 0} />
          {asRenter && <StarInput legend={t('aboutItem')} name="item" value={itemRating} onChange={setItemRating} invalid={tried && itemRating === 0} />}
          <div className="flex flex-col gap-1.5">
            <label htmlFor={textId} className="text-[13px] font-bold tracking-[0.03em] uppercase">
              {t('text')}
            </label>
            <textarea
              id={textId}
              value={text}
              onChange={(event) => setText(event.target.value)}
              maxLength={REVIEW_TEXT.max}
              aria-invalid={(tried && !textOk) || undefined}
              aria-describedby={`${textId}-hint`}
              className={TEXTAREA_CLASS}
            />
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

      {data.mine && !data.theirs && <p className="m-0 max-w-[60ch] leading-relaxed">{t('sent', { name: otherName, date })}</p>}
      {data.mine && (
        <div className="flex flex-col gap-2">
          <h3 className="m-0 text-[13px] font-bold tracking-[0.03em] uppercase">{t('mine')}</h3>
          <ReviewList reviews={[data.mine]} showItem={asRenter} />
        </div>
      )}
      {data.theirs && (
        <div className="flex flex-col gap-2">
          <h3 className="m-0 text-[13px] font-bold tracking-[0.03em] uppercase">{t('theirs', { name: otherName })}</h3>
          <ReviewList reviews={[data.theirs]} />
        </div>
      )}
      {!data.canReview && !data.mine && !data.theirs && <p className="m-0">{t('closed')}</p>}
    </section>
  );
}
