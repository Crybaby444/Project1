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
  const drop = (key: number) => setItems((list) => list.filter((item) => item.key !== key));

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
  const photoError = errorFor('photos');

  return (
    <div className="flex flex-col gap-6">
      {storageOff && (
        <p
          role="alert"
          className="bg-mist rounded-media border border-ink/15 p-4 text-sm font-bold text-ink"
        >
          {t('storageOff')}
        </p>
      )}

      <div
        onDragOver={(event) => {
          if (disabled) return;
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={disabled ? undefined : onDrop}
        className={`rounded-media ease-yoyo flex flex-col items-center gap-3 border-2 border-dashed p-6 text-center transition-[background-color,transform] duration-250 sm:p-8 ${
          dragOver ? 'border-ink bg-mist scale-[1.01] text-ink' : 'border-ink/40 bg-transparent'
        } ${disabled ? 'opacity-60' : ''}`}
      >
        <svg
          viewBox="0 0 48 48"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
          className={`ease-yoyo size-12 transition-transform duration-450 ${dragOver ? 'scale-110' : ''}`}
        >
          <path d="M6 16a4 4 0 0 1 4-4h6l3-4h10l3 4h6a4 4 0 0 1 4 4v20a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4z" />
          <circle cx="24" cy="25" r="7.5" />
        </svg>
        <div className="flex flex-col items-center gap-2">
          <input
            id={inputId}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={disabled || room <= 0}
            onChange={(event) => {
              void addFiles(Array.from(event.target.files ?? []));
              event.target.value = '';
            }}
            className="peer sr-only"
          />
          <label
            htmlFor={inputId}
            className="border-cta bg-cta text-cta-fg rounded-pill ease-yoyo peer-focus-visible:outline-ink inline-flex min-h-12 cursor-pointer items-center gap-2 border px-6 text-[15px] font-bold tracking-[0.03em] uppercase transition-transform duration-150 select-none peer-focus-visible:outline-2 peer-focus-visible:outline-offset-3 peer-disabled:cursor-default peer-disabled:opacity-55 hover:-translate-y-0.5 active:scale-[0.96]"
          >
            {t('choose')}
          </label>
          <p className="text-sm font-bold">{t('drop')}</p>
        </div>
        <p className="text-sm">{t('limits')}</p>
        <p className="text-sm">{t('paste')}</p>
      </div>

      <p className="text-sm font-bold" aria-live="polite">
        {room <= 0 && photos.length >= LISTING_LIMITS.photos
          ? t('full', { max: LISTING_LIMITS.photos })
          : t('count', { count: photos.length, max: LISTING_LIMITS.photos })}
      </p>
      {photoError && (
        <p className="flex items-start gap-1.5 text-sm font-bold">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="text-[var(--danger)] mt-0.5 size-4 shrink-0">
            <circle cx="12" cy="12" r="10" fill="currentColor" />
            <path d="M12 7v6M12 16.5v.5" stroke="#000" strokeWidth="2" strokeLinecap="round" />
          </svg>
          {photoError}
        </p>
      )}

      {items.length > 0 && (
        <ul className="flex flex-col gap-2">
          {items
            .filter((item) => item.status !== 'editing')
            .map((item) => (
              <li
                key={item.key}
                className="border-ink/15 bg-surface rounded-media flex flex-col gap-2 border p-3"
              >
                {item.status === 'failed' ? (
                  <div role="alert" className="flex flex-wrap items-center justify-between gap-3">
                    <p className="flex min-w-0 items-start gap-1.5 text-sm font-bold [overflow-wrap:anywhere]">
                      <svg
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                        className="text-[var(--danger)] mt-0.5 size-4 shrink-0"
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
                  </div>
                ) : (
                  <>
                    <p className="truncate text-sm font-bold">
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
                      className="border-ink bg-mist rounded-pill h-3 overflow-hidden border"
                    >
                      <div
                        className="bg-[var(--glow)] ease-yoyo h-full transition-[width] duration-250"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  </>
                )}
              </li>
            ))}
        </ul>
      )}

      {photos.length > 0 && (
        <PhotoGrid
          key={gridKey}
          photos={photos}
          disabled={readOnly}
          onReorder={(ids) => void reorder(ids)}
          onRemove={setRemoving}
        />
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
