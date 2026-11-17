'use client';

import { LISTING_LIMITS, type ListingPhoto, type OwnerListing } from '@yoyo/shared';
import { useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState, type DragEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { useToast } from '@/components/ui/Toast';
import { useErrorText } from '@/lib/forms/error-text';
import { MAX_ORIGINAL_BYTES, sniffImage } from '@/lib/listings/image-edit';
import { uploadPhoto } from '@/lib/listings/upload-photo';
import { ApiError, unwrap } from '@/lib/session/api-error';
import { useApiClient } from '@/lib/session/SessionProvider';
import { useBuilder } from '../BuilderContext';
import { CropDialog } from './CropDialog';
import { PhotoGrid } from './PhotoGrid';

type Item = {
  key: number;
  name: string;
  file: File;
  status: 'editing' | 'waiting' | 'uploading' | 'failed';
  blob?: Blob;
  progress: number;
  error?: string;
  /** A local picture of the file, so it shows in its place while it uploads. */
  preview?: string;
};

/** Changes to the photos of a live listing can send it back to review: ask for its new status. */
const mayChangeStatus = (listing: OwnerListing) =>
  listing.status === 'PUBLISHED' || listing.status === 'HIDDEN';

/**
 * Step 1: up to 8 photos. Files come from the picker, a drop or the clipboard; each is checked here
 * first (type by its bytes, size, count), opens in the crop dialog, then uploads with a progress bar.
 * Without photo storage on the server (503 STORAGE_DISABLED) the step says so and stays usable.
 */
export function PhotosStep() {
  const t = useTranslations('builder.photos');
  const tErrors = useTranslations('errors');
  const errorText = useErrorText();
  const toast = useToast();
  const client = useApiClient();
  const { draft, readOnly, errorFor } = useBuilder();
  const photos = draft.listing?.photos ?? [];
  const [items, setItems] = useState<Item[]>([]);
  const [storageOff, setStorageOff] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [removing, setRemoving] = useState<ListingPhoto | null>(null);
  /** Remounts the grid, putting back the saved order after a failed reorder. */
  const [gridKey, setGridKey] = useState(0);
  const nextKey = useRef(0);
  const inputId = useId();
  const active = items.filter((item) => item.status !== 'failed').length;
  const room = LISTING_LIMITS.photos - photos.length - active;
  const disabled = readOnly || storageOff;

  const update = (key: number, patch: Partial<Item>) =>
    setItems((list) => list.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  const drop = (key: number) =>
    setItems((list) => {
      const gone = list.find((item) => item.key === key);
      if (gone?.preview) URL.revokeObjectURL(gone.preview);
      return list.filter((item) => item.key !== key);
    });

  async function refreshIfLive(listing: OwnerListing): Promise<(current: OwnerListing) => OwnerListing> {
    const fresh = (
      await unwrap(client.GET('/api/v1/listings/{id}', { params: { path: { id: listing.id } } }))
    ).listing;
    return () => fresh;
  }

  async function addFiles(files: File[]) {
    if (disabled) return;
    let free = room;
    const added: Item[] = [];
    for (const file of files) {
      const item: Item = {
        key: nextKey.current++,
        name: file.name || 'photo',
        file,
        status: 'editing',
        progress: 0,
      };
      try {
        item.preview = URL.createObjectURL(file);
      } catch {
        // no local preview (tests, old browsers): the tile shows its progress only
      }
      if (free <= 0) Object.assign(item, { status: 'failed', error: tErrors('PHOTO_LIMIT') });
      else if (file.size > MAX_ORIGINAL_BYTES) Object.assign(item, { status: 'failed', error: t('tooBig') });
      else if (!(await sniffImage(file)))
        Object.assign(item, { status: 'failed', error: tErrors('UNSUPPORTED_MEDIA') });
      else free -= 1;
      added.push(item);
    }
    setItems((list) => [...list, ...added]);
  }

  async function upload(item: Item, blob: Blob) {
    update(item.key, { status: 'waiting', blob, progress: 0, error: undefined });
    try {
      await draft.withListing(async (listing) => {
        update(item.key, { status: 'uploading' });
        const result = await uploadPhoto(listing.id, blob, {
          onProgress: (progress) => update(item.key, { progress }),
        });
        if (mayChangeStatus(listing)) return refreshIfLive(listing);
        return (current) => ({
          ...current,
          photos: [...current.photos, result.photo],
          version: result.version,
        });
      });
      drop(item.key);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'STORAGE_DISABLED') setStorageOff(true);
      update(item.key, { status: 'failed', error: errorText(error) });
    }
  }

  async function reorder(ids: string[]) {
    try {
      await draft.withListing(async (listing) => {
        const result = await unwrap(
          client.PUT('/api/v1/listings/{id}/photos/order', {
            params: { path: { id: listing.id } },
            body: { ids, version: listing.version },
          }),
        );
        if (mayChangeStatus(listing)) return refreshIfLive(listing);
        return (current) => ({ ...current, photos: result.photos, version: result.version });
      });
      if (ids[0] !== photos[0]?.id) toast.show(t('coverChanged'));
    } catch (error) {
      // The grid goes back to the saved order; the reason shows as a toast.
      setGridKey((key) => key + 1);
      toast.show(errorText(error));
    }
  }

  async function remove(photo: ListingPhoto) {
    setRemoving(null);
    try {
      await draft.withListing(async (listing) => {
        await unwrap(
          client.DELETE('/api/v1/listings/{id}/photos/{photoId}', {
            params: { path: { id: listing.id, photoId: photo.id } },
          }),
        );
        // A removal answers 204 without the new version: read the listing again.
        return refreshIfLive(listing);
      });
      toast.show(t('removed'));
    } catch (error) {
      toast.show(errorText(error));
    }
  }

  // Paste a photo while this step is open.
  const addRef = useRef(addFiles);
  useEffect(() => {
    addRef.current = addFiles;
  });
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData?.files ?? []).filter((file) =>
        file.type.startsWith('image/'),
      );
      if (files.length > 0) void addRef.current(files);
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, []);

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragOver(false);
    void addFiles(Array.from(event.dataTransfer.files));
  }

  const editing = items.find((item) => item.status === 'editing');
  const pending = items.filter((item) => item.status === 'waiting' || item.status === 'uploading');
  const failed = items.filter((item) => item.status === 'failed');
  const photoError = errorFor('photos');

  return (
    <div className="flex flex-col gap-6">
      {storageOff && (
        <p role="alert" className="bg-mist rounded-media border-ink/15 text-ink border p-4 text-sm font-bold">
          {t('storageOff')}
        </p>
      )}

      {/* One grid of the 8 places (owner, 2026-11-16): the cover is the big one, the add tile sits in the next
          free place, and a new photo appears right there while it uploads. Drop files anywhere on it. */}
      <div
        onDragOver={(event) => {
          if (disabled) return;
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={disabled ? undefined : onDrop}
        className={`rounded-media ease-yoyo -m-2 p-2 transition-[background-color,box-shadow] duration-250 ${dragOver ? 'bg-mist shadow-[0_0_0_2px_var(--ink)]' : ''}`}
      >
        <PhotoGrid
          key={gridKey}
          photos={photos}
          disabled={readOnly}
          onReorder={(ids) => void reorder(ids)}
          onRemove={setRemoving}
        >
          {pending.map((item) => (
            <li
              key={item.key}
              className={photos.length === 0 && item === pending[0] ? 'col-span-2 row-span-2' : ''}
            >
              <div className="bg-mist rounded-media border-ink/15 relative aspect-[4/3] size-full overflow-hidden border">
                {item.preview && (
                  // eslint-disable-next-line @next/next/no-img-element -- a local object URL
                  <img src={item.preview} alt="" className="size-full object-cover opacity-60" />
                )}
                <div className="absolute inset-x-2 bottom-2 flex flex-col gap-1.5">
                  <p className="truncate text-xs font-bold">
                    {item.status === 'uploading'
                      ? t('uploading', { name: item.name })
                      : t('waiting', { name: item.name })}
                  </p>
                  <div
                    role="progressbar"
                    aria-label={t('uploading', { name: item.name })}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={item.progress}
                    className="border-ink bg-canvas rounded-pill h-2.5 overflow-hidden border"
                  >
                    <div
                      className="bg-ink ease-yoyo h-full transition-[width] duration-250"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            </li>
          ))}
          {room > 0 && (
            <li className={photos.length + pending.length === 0 ? 'col-span-2 row-span-2' : ''}>
              <input
                id={inputId}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                aria-label={t('choose')}
                disabled={disabled}
                onChange={(event) => {
                  void addFiles(Array.from(event.target.files ?? []));
                  event.target.value = '';
                }}
                className="peer sr-only"
              />
              <label
                htmlFor={inputId}
                className="rounded-media border-ink/45 hover:border-ink hover:bg-mist peer-focus-visible:outline-ink ease-yoyo flex aspect-[4/3] size-full cursor-pointer flex-col items-center justify-center gap-2 border-2 border-dashed p-3 text-center transition-colors duration-200 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-3 peer-disabled:cursor-default peer-disabled:opacity-55"
              >
                <svg
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinejoin="round"
                  className={photos.length + pending.length === 0 ? 'size-12' : 'size-8'}
                >
                  <path d="M6 16a4 4 0 0 1 4-4h6l3-4h10l3 4h6a4 4 0 0 1 4 4v20a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4z" />
                  <circle cx="24" cy="25" r="7.5" />
                </svg>
                <span className="text-sm font-bold">
                  {photos.length + pending.length === 0 ? t('choose') : t('addMore')}
                </span>
                {photos.length + pending.length === 0 && (
                  <span className="text-ink/70 text-sm">{t('drop')}</span>
                )}
              </label>
            </li>
          )}
          {Array.from({ length: Math.max(0, room - 1) }, (_, i) => (
            <li
              key={`free-${i}`}
              aria-hidden="true"
              className="rounded-media border-ink/15 text-ink/30 font-display grid aspect-[4/3] place-items-center border border-dashed text-2xl font-black max-sm:hidden"
            >
              {photos.length + pending.length + 2 + i}
            </li>
          ))}
        </PhotoGrid>
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-sm font-bold" aria-live="polite">
          {room <= 0 && photos.length >= LISTING_LIMITS.photos
            ? t('full', { max: LISTING_LIMITS.photos })
            : t('count', { count: photos.length, max: LISTING_LIMITS.photos })}
        </p>
        <p className="text-ink/70 text-sm">{`${t('limits')} ${t('paste')}`}</p>
      </div>
      {photoError && (
        <p className="flex items-start gap-1.5 text-sm font-bold">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[var(--danger)]">
            <circle cx="12" cy="12" r="10" fill="currentColor" />
            <path d="M12 7v6M12 16.5v.5" stroke="#000" strokeWidth="2" strokeLinecap="round" />
          </svg>
          {photoError}
        </p>
      )}

      {failed.length > 0 && (
        <ul className="flex flex-col gap-2">
          {failed.map((item) => (
            <li
              key={item.key}
              role="alert"
              className="border-ink/15 bg-surface rounded-media flex flex-wrap items-center justify-between gap-3 border p-3"
            >
              <p className="flex min-w-0 items-start gap-1.5 text-sm font-bold [overflow-wrap:anywhere]">
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0 text-[var(--danger)]"
                >
                  <circle cx="12" cy="12" r="10" fill="currentColor" />
                  <path d="M12 7v6M12 16.5v.5" stroke="#000" strokeWidth="2" strokeLinecap="round" />
                </svg>
                {t('failed', { name: item.name, reason: item.error ?? '' })}
              </p>
              <div className="flex gap-2">
                {item.blob && !storageOff && (
                  <Button variant="ghost" onClick={() => void upload(item, item.blob!)}>
                    {t('retry')}
                  </Button>
                )}
                <Button variant="ghost" onClick={() => drop(item.key)}>
                  {t('dismiss')}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <CropDialog
          key={editing.key}
          file={editing.file}
          name={editing.name}
          onCancel={() => drop(editing.key)}
          onUnreadable={() => update(editing.key, { status: 'failed', error: t('unreadable') })}
          onDone={(blob) => void upload(editing, blob)}
        />
      )}

      <Dialog open={removing !== null} onClose={() => setRemoving(null)} title={t('removeTitle')}>
        <p className="mb-6">{t('removeBody')}</p>
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="ghost" onClick={() => setRemoving(null)}>
            {t('cancel')}
          </Button>
          <Button onClick={() => removing && void remove(removing)}>{t('removeConfirm')}</Button>
        </div>
      </Dialog>
    </div>
  );
}
