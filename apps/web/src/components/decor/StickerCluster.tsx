import { Sticker, type StickerKind } from '@/components/ui/Sticker';

export type PlacedSticker = {
  kind: StickerKind;
  /** Size on a wide screen, in px; on a phone it shrinks to about half. */
  size: number;
  top?: string | number;
  left?: string | number;
  right?: string | number;
  bottom?: string | number;
  /** Degrees; hand-placed stickers are never straight. */
  rotate: number;
};

type StickerClusterProps = {
  items: PlacedSticker[];
  className?: string;
};

/**
 * Stickers pinned around a display title like cut-outs on a board (DESIGN.md Sticker Decoration):
 * placed by hand, rotated, never on a grid. Each one still wobbles under the cursor and spins on a
 * click. The parent sets `position: relative` and clips overflow sideways.
 */
export function StickerCluster({ items, className = '' }: StickerClusterProps) {
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 ${className}`}>
      {items.map(({ kind, size, rotate, top, left, right, bottom }, index) => (
        <span
          key={`${kind}-${index}`}
          data-sticker-slot
          className="pointer-events-auto absolute"
          style={{
            top,
            left,
            right,
            bottom,
            rotate: `${rotate}deg`,
            width: `clamp(${Math.round(size * 0.5)}px, ${(size / 14.4).toFixed(2)}vw, ${size}px)`,
            aspectRatio: '1',
          }}
        >
          <Sticker kind={kind} size="100%" />
        </span>
      ))}
    </div>
  );
}
