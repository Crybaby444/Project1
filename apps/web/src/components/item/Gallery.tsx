'use client';

import type { ListingPhoto } from '@yoyo/shared';
import { useTranslations } from 'next-intl';
import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { sharedPhotoStyle } from '@/components/catalog/ListingCard';
import { Dialog } from '@/components/ui/Dialog';
import { IconButton } from '@/components/ui/IconButton';

/** A swipe shorter than this (px) is a tap, not a swipe. */
const SWIPE_PX = 40;

type Props = { listingId: string; title: string; photos: ListingPhoto[] };

/**
 * The item's photos: the main one 4:3 (its box is sized before the photo loads, so nothing jumps),
 * the others as thumbnail buttons, and the whole set full screen in a dialog with arrows, a counter,
 * the arrow keys and a swipe on phones. The main photo shares its name with the catalog card's cover
 * (globals.css), so the cover grows into it when the item is opened from the catalog.
 */
export function Gallery({ listingId, title, photos }: Props) {
  const t = useTranslations('item.gallery');
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const current = photos[index];

  if (!current) {
    return (
      <div className="border-ink/15 bg-mist rounded-media grid aspect-[4/3] place-items-center border text-sm italic">
        {t('noPhotos')}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="border-ink/15 bg-mist rounded-media relative aspect-[4/3] overflow-hidden border">
        {/* eslint-disable-next-line @next/next/no-img-element -- sized by the API's storage */}
        <img
          data-shared-photo=""
          style={sharedPhotoStyle(listingId)}
          src={current.urls.card}
          srcSet={`${current.urls.card} 640w, ${current.urls.full} 2048w`}
          sizes="(min-width: 1024px) 60vw, 100vw"
          alt={t('photoAlt', { title, number: index + 1, count: photos.length })}
          width={current.width}
          height={current.height}
          fetchPriority={index === 0 ? 'high' : 'auto'}
          className="size-full object-cover"
        />
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="bg-surface text-ink border-ink rounded-pill ease-yoyo absolute right-3 bottom-3 inline-flex min-h-10 items-center gap-2 border px-3 text-[13px] font-bold transition-transform duration-150 hover:-translate-y-0.5 active:scale-[0.96]"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
            <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          {t('open', { count: photos.length })}
        </button>
      </div>
      {photos.length > 1 && (
        <ul className="flex gap-2 overflow-x-auto pb-1" aria-label={t('thumbnails')}>
          {photos.map((photo, at) => (
            <li key={photo.id} className="shrink-0">
              <button
                type="button"
                aria-current={at === index || undefined}
                aria-label={t('show', { number: at + 1, count: photos.length })}
                onClick={() => setIndex(at)}
                className={`rounded-media ease-yoyo block overflow-hidden border transition-transform duration-150 hover:-translate-y-0.5 ${
                  at === index ? 'border-ink/15 outline-ink outline-2 outline-offset-2' : 'border-ink/40'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- 160×120 thumbnails */}
                <img src={photo.urls.thumb} alt="" width={80} height={60} loading="lazy" className="h-15 w-20 object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <GalleryDialog open={open} onClose={() => setOpen(false)} photos={photos} index={index} onIndex={setIndex} title={title} />
    </div>
  );
}

type DialogProps = {
  open: boolean;
  onClose(): void;
  photos: ListingPhoto[];
  index: number;
  onIndex(index: number): void;
  title: string;
};

export function GalleryDialog({ open, onClose, photos, index, onIndex, title }: DialogProps) {
  const t = useTranslations('item.gallery');
  const start = useRef<number | null>(null);
  const count = photos.length;
  const go = (by: number) => onIndex((index + by + count) % count);
  const photo = photos[index];

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      go(1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      go(-1);
    }
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (start.current === null) return;
    const moved = event.clientX - start.current;
    start.current = null;
    if (Math.abs(moved) >= SWIPE_PX) go(moved < 0 ? 1 : -1);
  }

  return (
    <Dialog open={open} onClose={onClose} title={title} wide>
      {photo && (
        <div className="flex flex-col gap-4" onKeyDown={onKeyDown}>
          <div
            className="border-ink/15 bg-mist rounded-media relative grid aspect-[4/3] touch-pan-y place-items-center overflow-hidden border"
            onPointerDown={(event) => (start.current = event.clientX)}
            onPointerUp={onPointerUp}
            onPointerCancel={() => (start.current = null)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- the whole photo, up to 2048 px */}
            <img
              key={photo.id}
              src={photo.urls.full}
              alt={t('photoAlt', { title, number: index + 1, count })}
              className="animate-pop-in max-h-full max-w-full object-contain"
              draggable={false}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <IconButton label={t('previous')} onClick={() => go(-1)} disabled={count < 2}>
              <span aria-hidden="true">←</span>
            </IconButton>
            <p className="text-sm font-bold tabular-nums" aria-live="polite">
              {t('counter', { number: index + 1, count })}
            </p>
            <IconButton label={t('next')} onClick={() => go(1)} disabled={count < 2}>
              <span aria-hidden="true">→</span>
            </IconButton>
          </div>
          <button type="button" onClick={onClose} className="self-end text-sm font-bold underline underline-offset-4">
            {t('close')}
          </button>
        </div>
      )}
    </Dialog>
  );
}
