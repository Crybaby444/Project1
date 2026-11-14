'use client';

import { useQueryClient } from '@tanstack/react-query';
import { BOOKING_LIMITS, type BookingPhoto, type BookingPhotoKind, type BookingView } from '@yoyo/shared';
import { useTranslations } from 'next-intl';
import { useId, useRef, useState, type ChangeEvent } from 'react';
import { useErrorText } from '@/lib/forms/error-text';
import { dealKeys, useDealPhotos } from '@/lib/deals/queries';
import { uploadBookingPhoto } from '@/lib/listings/upload-photo';

/** Who may add which photos when (the API's rule, plan 8 Task 9); the API checks it again. */
export function uploadableKinds(booking: Pick<BookingView, 'status' | 'viewerRole'>): BookingPhotoKind[] {
  const kinds: BookingPhotoKind[] = [];
  const owner = booking.viewerRole === 'OWNER';
  const party = booking.viewerRole !== 'ADMIN';
  if (owner && (booking.status === 'PAID' || booking.status === 'ACTIVE')) kinds.push('HANDOVER');
  if (party && (booking.status === 'ACTIVE' || booking.status === 'RETURNED')) kinds.push('RETURN');
  return kinds;
}

function Uploader({
  bookingId,
  kind,
  onUploaded,
  label,
}: {
  bookingId: string;
  kind: BookingPhotoKind;
  onUploaded(photo: BookingPhoto): void;
  label: string;
}) {
  const t = useTranslations('deal.photos');
  const errorText = useErrorText();
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    setError(null);
    for (const file of files) {
      setProgress(0);
      try {
        const { photo } = await uploadBookingPhoto(bookingId, kind, file, { onProgress: setProgress });
        onUploaded(photo);
      } catch (failure) {
        setError(errorText(failure));
        break;
      } finally {
        setProgress(null);
      }
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <input
        ref={input}
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        tabIndex={-1}
        aria-label={label}
        className="sr-only"
        onChange={(e) => void onFiles(e)}
      />
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={progress !== null}
        className="rounded-media ease-yoyo border-ink/15 hover:bg-mist grid aspect-square w-24 place-items-center border border-dashed text-center text-[12px] font-bold transition-[transform,background-color] duration-150 hover:-translate-y-0.5 active:scale-[0.96] disabled:opacity-70"
      >
        {progress !== null ? (
          <span role="status" className="tabular-nums">
            {t('uploading', { percent: progress })}
          </span>
        ) : (
          <span className="flex flex-col items-center gap-1 px-1">
            <span aria-hidden="true" className="text-xl leading-none">
              +
            </span>
            {label}
          </span>
        )}
      </button>
      {error && (
        <p role="alert" className="text-sm font-bold">
          {error}
        </p>
      )}
    </div>
  );
}

function Thumb({ photo, n, kindLabel }: { photo: BookingPhoto; n: number; kindLabel: string }) {
  const t = useTranslations('deal.photos');
  return (
    <a href={photo.urls.full} target="_blank" rel="noreferrer" className="border-ink/15 rounded-media ease-yoyo block size-24 overflow-hidden border transition-transform duration-150 hover:-translate-y-0.5">
      {/* eslint-disable-next-line @next/next/no-img-element -- sized by the API's storage */}
      <img src={photo.urls.thumb} alt={t('alt', { n, kind: kindLabel })} width={96} height={96} className="size-full object-cover" />
    </a>
  );
}

/** Damage photos for a damage report: uploaded right away, chosen for the report (1–8). */
export function DamagePhotos({
  bookingId,
  value,
  onChange,
  error,
}: {
  bookingId: string;
  value: string[];
  onChange(ids: string[]): void;
  error?: string | undefined;
}) {
  const t = useTranslations('deal');
  const [photos, setPhotos] = useState<BookingPhoto[]>([]);
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-[13px] font-bold tracking-[0.03em] uppercase">{t('damage.photos')}</legend>
      <div className="flex flex-wrap gap-3">
        {photos.map((photo, index) => (
          <Thumb key={photo.id} photo={photo} n={index + 1} kindLabel={t('photos.DAMAGE')} />
        ))}
        {photos.length < BOOKING_LIMITS.damagePhotos && (
          <Uploader
            bookingId={bookingId}
            kind="DAMAGE"
            label={t('photos.add')}
            onUploaded={(photo) => {
              setPhotos((list) => [...list, photo]);
              onChange([...value, photo.id]);
            }}
          />
        )}
      </div>
      {error && (
        <p className="flex items-start gap-2 text-sm font-bold" aria-live="polite">
          <span aria-hidden="true" className="bg-[var(--danger)] mt-0.5 inline-block size-4 shrink-0 rounded-full border border-ink/15" />
          {error}
        </p>
      )}
    </fieldset>
  );
}

/** The item's condition at handover and return, and damage, as both sides (and Yoyo) see it. */
export function DealPhotos({ booking }: { booking: BookingView }) {
  const t = useTranslations('deal.photos');
  const queryClient = useQueryClient();
  const photos = useDealPhotos(booking.id);
  const kinds = uploadableKinds(booking);
  const items = photos.data ?? [];
  if (items.length === 0 && kinds.length === 0) return null;

  const groups = (['HANDOVER', 'RETURN', 'DAMAGE'] as const)
    .map((kind) => ({ kind, items: items.filter((p) => p.kind === kind) }))
    .filter((g) => g.items.length > 0 || kinds.includes(g.kind));

  return (
    <section aria-labelledby="deal-photos" className="border-ink/15 bg-surface rounded-media flex flex-col gap-4 border p-5 sm:p-6">
      <div className="flex flex-col gap-1">
        <h2 id="deal-photos" className="text-xl font-bold">
          {t('title')}
        </h2>
        {kinds.length > 0 && <p className="text-sm">{t('hint')}</p>}
      </div>
      {groups.map((group) => (
        <div key={group.kind} className="flex flex-col gap-2">
          <h3 className="text-[13px] font-bold tracking-[0.03em] uppercase">{t(group.kind)}</h3>
          <div className="flex flex-wrap gap-3">
            {group.items.map((photo, index) => (
              <Thumb key={photo.id} photo={photo} n={index + 1} kindLabel={t(group.kind)} />
            ))}
            {kinds.includes(group.kind) && (
              <Uploader
                bookingId={booking.id}
                kind={group.kind}
                label={t('add')}
                onUploaded={() => void queryClient.invalidateQueries({ queryKey: dealKeys.photos(booking.id) })}
              />
            )}
          </div>
        </div>
      ))}
    </section>
  );
}
