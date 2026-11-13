'use client';

import type { ListingPhoto } from '@yoyo/shared';
import { useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { ActionMenu } from '@/components/ui/ActionMenu';
import { prefersReducedMotion } from '@/lib/motion';
import { move } from '@/lib/listings/reorder';

type Props = {
  photos: ListingPhoto[];
  disabled: boolean;
  /** Saves a new order (every id once, the cover first). */
  onReorder(ids: string[]): void;
  onRemove(photo: ListingPhoto): void;
};

type Lift = { id: string; from: number; by: 'keyboard' | 'pointer' };

/** A drag starts once the pointer has moved this far, so a tap on a photo stays a tap. */
const DRAG_THRESHOLD_PX = 6;

function GripIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
      {[8, 16].flatMap((x) =>
        [6, 12, 18].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" fill="currentColor" />),
      )}
    </svg>
  );
}

function DotsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
      {[5, 12, 19].map((x) => (
        <circle key={x} cx={x} cy="12" r="1.8" fill="currentColor" />
      ))}
    </svg>
  );
}

/**
 * The listing's photos in their order; the first is the cover. Reorder by dragging a photo (it lifts
 * and tilts like a sticker), with the keyboard on its handle (Space picks it up, arrows move it,
 * Space drops it, Esc cancels; each step is announced), or from its menu (earlier, later, cover).
 */
export function PhotoGrid({ photos, disabled, onReorder, onRemove }: Props) {
  const t = useTranslations('builder.photos');
  const instructionsId = useId();
  const [order, setOrder] = useState(() => photos.map((photo) => photo.id));
  const [lift, setLift] = useState<Lift | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const handles = useRef(new Map<string, HTMLButtonElement>());
  const pointer = useRef<{ id: string; x: number; y: number; pointerId: number; moved: boolean } | null>(
    null,
  );
  const byId = new Map(photos.map((photo) => [photo.id, photo]));
  const total = photos.length;
  const savedKey = photos.map((photo) => photo.id).join(',');

  // The saved order wins whenever it changes (an upload, a removal, a failed save putting it back).
  const [syncedKey, setSyncedKey] = useState(savedKey);
  if (syncedKey !== savedKey && lift === null) {
    setSyncedKey(savedKey);
    setOrder(photos.map((photo) => photo.id));
  }

  useEffect(() => {
    if (lift?.by === 'keyboard') handles.current.get(lift.id)?.focus();
  }, [order, lift]);

  function commit(next: string[]) {
    if (next.join(',') !== savedKey) onReorder(next);
  }

  function moveTo(id: string, to: number, { save }: { save: boolean }) {
    const next = move(order, order.indexOf(id), to);
    setOrder(next);
    if (save) commit(next);
    return next;
  }

  function onHandleKeyDown(event: KeyboardEvent<HTMLButtonElement>, id: string) {
    const index = order.indexOf(id);
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      if (!lift) {
        setLift({ id, from: index, by: 'keyboard' });
        setAnnouncement(t('lifted', { number: index + 1, position: index + 1, total }));
      } else {
        setLift(null);
        commit(order);
        setAnnouncement(t('dropped', { position: index + 1, total }));
      }
      return;
    }
    if (!lift || lift.id !== id) return;
    const by = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[event.key];
    if (by !== undefined) {
      event.preventDefault();
      const to = Math.min(Math.max(index + by, 0), order.length - 1);
      moveTo(id, to, { save: false });
      setAnnouncement(t('movedTo', { position: to + 1, total }));
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setOrder(moveTo(id, lift.from, { save: false }));
      setLift(null);
      setAnnouncement(t('cancelled', { position: lift.from + 1 }));
    }
  }

  function onHandleBlur(id: string) {
    // Leaving a picked-up photo puts it back where it was.
    if (lift?.by !== 'keyboard' || lift.id !== id) return;
    setOrder(move(order, order.indexOf(id), lift.from));
    setLift(null);
  }

  function onPointerDown(event: PointerEvent<HTMLLIElement>, id: string) {
    if (disabled || event.button !== 0 || (event.target as HTMLElement).closest('button')) return;
    pointer.current = { id, x: event.clientX, y: event.clientY, pointerId: event.pointerId, moved: false };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function onPointerMove(event: PointerEvent<HTMLLIElement>) {
    const drag = pointer.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (!drag.moved) {
      if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < DRAG_THRESHOLD_PX) return;
      drag.moved = true;
      setLift({ id: drag.id, from: order.indexOf(drag.id), by: 'pointer' });
    }
    const over = document
      .elementsFromPoint?.(event.clientX, event.clientY)
      .map((element) => (element as HTMLElement).closest<HTMLElement>('[data-photo-id]'))
      .find((tile) => tile && tile.dataset['photoId'] !== drag.id);
    const target = over?.dataset['photoId'];
    if (target) moveTo(drag.id, order.indexOf(target), { save: false });
  }

  function onPointerEnd(event: PointerEvent<HTMLLIElement>) {
    const drag = pointer.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    pointer.current = null;
    if (!drag.moved) return;
    setLift(null);
    commit(order);
    const position = order.indexOf(drag.id) + 1;
    setAnnouncement(t('dropped', { position, total }));
  }

  const tilt = prefersReducedMotion() ? '' : 'scale-[1.04] shadow-[0_0_0_2px_var(--glow)]';   // v16: lifted, lit — no tilt

  return (
    <div className="flex flex-col gap-3">
      <p id={instructionsId} className="sr-only">
        {t('instructions')}
      </p>
      <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
        {order.map((id, index) => {
          const photo = byId.get(id);
          if (!photo) return null;
          const lifted = lift?.id === id;
          const number = index + 1;
          return (
            <li
              key={id}
              data-photo-id={id}
              onPointerDown={(event) => onPointerDown(event, id)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerEnd}
              onPointerCancel={onPointerEnd}
              className={`group ease-yoyo relative touch-none transition-transform duration-250 select-none ${
                lifted ? `z-10 ${tilt}` : 'hover:-translate-y-1'
              } ${disabled ? '' : 'cursor-grab active:cursor-grabbing'}`}
            >
              <div
                className={`bg-mist rounded-media relative aspect-[4/3] overflow-hidden border ${
                  lifted ? 'border-ink outline-ink border-2 outline-2 outline-offset-2' : 'border-ink'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- sized by the API's storage */}
                <img
                  src={photo.urls.card}
                  alt={t('photoAlt', { number, total })}
                  draggable={false}
                  className="ease-yoyo size-full object-cover transition-transform duration-450 group-hover:scale-[1.04]"
                />
                {index === 0 && (
                  <span className="bg-ink text-canvas rounded-pill absolute top-2 left-2 border border-ink/15 px-2.5 py-0.5 text-xs font-bold">
                    {t('cover')}
                  </span>
                )}
              </div>
              <div className="absolute right-2 bottom-2 flex gap-1.5">
                <button
                  ref={(element) => {
                    if (element) handles.current.set(id, element);
                    else handles.current.delete(id);
                  }}
                  type="button"
                  disabled={disabled || total < 2}
                  aria-label={t('grab', { number })}
                  aria-describedby={instructionsId}
                  aria-pressed={lifted && lift?.by === 'keyboard'}
                  onKeyDown={(event) => onHandleKeyDown(event, id)}
                  onBlur={() => onHandleBlur(id)}
                  className="border-ink bg-surface text-ink rounded-pill ease-yoyo aria-pressed:bg-cta aria-pressed:text-cta-fg inline-grid size-10 cursor-grab place-items-center border transition-transform duration-150 hover:-translate-y-0.5 active:scale-[0.96] disabled:hidden"
                >
                  <GripIcon />
                </button>
                {!disabled && (
                  <ActionMenu
                    label={t('actions', { number })}
                    actions={[
                      ...(index > 0
                        ? [
                            { label: t('makeCover'), onSelect: () => moveTo(id, 0, { save: true }) },
                            { label: t('earlier'), onSelect: () => moveTo(id, index - 1, { save: true }) },
                          ]
                        : []),
                      ...(index < order.length - 1
                        ? [{ label: t('later'), onSelect: () => moveTo(id, index + 1, { save: true }) }]
                        : []),
                      { label: t('remove'), onSelect: () => onRemove(photo) },
                    ]}
                  >
                    <DotsIcon />
                  </ActionMenu>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      <p role="status" aria-live="assertive" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
