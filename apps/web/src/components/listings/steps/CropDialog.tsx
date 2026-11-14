'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type WheelEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { IconButton } from '@/components/ui/IconButton';
import {
  CROP_ASPECT,
  MAX_ZOOM,
  drawCrop,
  fitCrop,
  loadImage,
  moveCrop,
  renderCrop,
  wholePhoto,
  zoomCrop,
  zoomOf,
  type Crop,
  type LoadedImage,
  type Rotation,
} from '@/lib/listings/image-edit';

type Props = {
  file: Blob;
  name: string;
  /** The cropped (or whole) photo, ready to upload. */
  onDone(photo: Blob): void;
  onCancel(): void;
  /** The browser could not open the file as an image. */
  onUnreadable(): void;
};

const STEP_PX = 10;

function RotateIcon({ flip }: { flip?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`size-5 ${flip ? '-scale-x-100' : ''}`}>
      <path
        d="M4 12a8 8 0 1 0 2.3-5.7M4 4v4h4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Crop and rotate a photo before it is uploaded: a fixed 4:3 frame (the card) over the photo, which
 * the person drags (or moves with the arrow keys) and zooms (slider, wheel, + and −). What the canvas
 * shows is exactly what is uploaded (the same drawing code).
 */
export function CropDialog({ file, name, onDone, onCancel, onUnreadable }: Props) {
  const t = useTranslations('builder.crop');
  const [image, setImage] = useState<LoadedImage | null>(null);
  const [rotation, setRotation] = useState<Rotation>(0);
  const [crop, setCrop] = useState<Crop | null>(null);
  const [busy, setBusy] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ x: number; y: number; pointerId: number } | null>(null);
  const unreadable = useRef(onUnreadable);
  useEffect(() => {
    unreadable.current = onUnreadable;
  });

  useEffect(() => {
    let alive = true;
    let opened: LoadedImage | null = null;
    loadImage(file).then(
      (loaded) => {
        opened = loaded;
        if (!alive) return loaded.close();
        setImage(loaded);
        setCrop(fitCrop(loaded.size, 0));
      },
      () => alive && unreadable.current(),
    );
    return () => {
      alive = false;
      opened?.close();
    };
  }, [file]);

  useEffect(() => {
    const element = canvas.current;
    if (!element || !image || !crop) return;
    const ratio = window.devicePixelRatio || 1;
    element.width = Math.round(element.clientWidth * ratio) || 640;
    element.height = Math.round(element.width / CROP_ASPECT);
    drawCrop(element, image, crop, rotation);
  }, [image, crop, rotation]);

  if (!image || !crop) {
    return (
      <Dialog open onClose={onCancel} title={t('title')} wide>
        <p role="status" className="mb-6">
          {t('loading')}
        </p>
        <Button variant="ghost" onClick={onCancel}>
          {t('cancel')}
        </Button>
      </Dialog>
    );
  }

  const size = image.size;
  const zoom = zoomOf(crop, size, rotation);
  /** Stage pixels → photo pixels. */
  const toPhoto = (px: number) => (px * crop.width) / (canvas.current?.clientWidth || 1);

  function turn(by: 90 | -90) {
    const next = ((((rotation + by) % 360) + 360) % 360) as Rotation;
    setRotation(next);
    setCrop(fitCrop(size, next));
  }

  function onPointerDown(event: PointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture?.(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
  }

  function onPointerMove(event: PointerEvent<HTMLCanvasElement>) {
    const from = drag.current;
    if (!from || from.pointerId !== event.pointerId || !crop) return;
    // Dragging the photo right shows more of its left side: the frame moves the other way.
    setCrop(
      moveCrop(crop, size, rotation, -toPhoto(event.clientX - from.x), -toPhoto(event.clientY - from.y)),
    );
    drag.current = { ...from, x: event.clientX, y: event.clientY };
  }

  function onWheel(event: WheelEvent<HTMLCanvasElement>) {
    if (!crop) return;
    setCrop(zoomCrop(crop, size, rotation, zoom * (event.deltaY < 0 ? 1.1 : 1 / 1.1)));
  }

  function onKeyDown(event: KeyboardEvent<HTMLCanvasElement>) {
    if (!crop) return;
    const step = toPhoto(event.shiftKey ? STEP_PX * 5 : STEP_PX);
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const by = moves[event.key];
    if (by) {
      event.preventDefault();
      setCrop(moveCrop(crop, size, rotation, by[0], by[1]));
    } else if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      setCrop(zoomCrop(crop, size, rotation, zoom + 0.25));
    } else if (event.key === '-') {
      event.preventDefault();
      setCrop(zoomCrop(crop, size, rotation, zoom - 0.25));
    }
  }

  async function finish(whole: boolean) {
    if (!image || !crop) return;
    setBusy(true);
    try {
      onDone(await renderCrop(image, whole ? wholePhoto(size, rotation) : crop, rotation));
    } catch {
      unreadable.current();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onClose={onCancel} title={t('title')} wide>
      <div className="flex flex-col gap-4">
        <p className="-mt-2 truncate text-sm">{name}</p>
        <canvas
          ref={canvas}
          tabIndex={0}
          role="img"
          aria-label={t('area')}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
          onWheel={onWheel}
          onKeyDown={onKeyDown}
          className="border-ink/15 rounded-media aspect-[4/3] w-full cursor-grab touch-none border active:cursor-grabbing"
        />
        <p className="text-sm">{t('hint')}</p>
        <div className="flex flex-wrap items-center gap-3">
          <IconButton label={t('rotateLeft')} onClick={() => turn(-90)}>
            <RotateIcon />
          </IconButton>
          <IconButton label={t('rotateRight')} onClick={() => turn(90)}>
            <RotateIcon flip />
          </IconButton>
          <label className="flex min-w-48 flex-1 items-center gap-3 text-[13px] font-bold tracking-[0.03em] uppercase">
            {t('zoom')}
            <input
              type="range"
              min={1}
              max={MAX_ZOOM}
              step={0.05}
              value={zoom}
              onChange={(event) => setCrop(zoomCrop(crop, size, rotation, Number(event.target.value)))}
              className="accent-ink min-h-10 flex-1"
            />
          </label>
        </div>
        <div className="flex flex-wrap justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            {t('cancel')}
          </Button>
          <Button variant="ghost" onClick={() => void finish(true)} disabled={busy}>
            {t('whole')}
          </Button>
          <Button onClick={() => void finish(false)} loading={busy}>
            {t('apply')}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
