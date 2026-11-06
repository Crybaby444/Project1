import { driftStyle } from '@/components/motion/drift';
import { ParallaxScope } from '@/components/motion/Parallax';
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
  /** Extra classes, e.g. `max-sm:hidden` for a sticker that would cover the type on a phone. */
  className?: string;
};

type StickerClusterProps = {
  items: PlacedSticker[];
  /** Hero stickers also float gently while on screen; every cluster drifts with the scroll. */
  float?: boolean;
  className?: string;
};

/** Parallax speeds by position in the cluster: neighbours drift at different rates and directions. */
const DRIFT = [0.35, -0.25, 0.5, -0.4, 0.2];

/**
 * Stickers pinned around a display title like cut-outs on a board (DESIGN.md Sticker Decoration):
 * placed by hand, rotated, never on a grid. Each one drifts at its own speed as the page scrolls
 * (Parallax), floats in the hero (Bob), wobbles under the cursor and spins on a click; all of it is
 * still with reduced motion. The parent sets `position: relative` and clips overflow sideways.
 */
export function StickerCluster({ items, float = false, className = '' }: StickerClusterProps) {
  return (
    <ParallaxScope aria-hidden="true" className={`pointer-events-none absolute inset-0 z-20 ${className}`}>
      {items.map(({ kind, size, rotate, top, left, right, bottom, className: slotClass = '' }, index) => (
        <span
          key={`${kind}-${index}`}
          data-sticker-slot
          data-parallax-layer=""
          data-bob={float ? '' : undefined}
          className={`pointer-events-auto absolute ${slotClass}`}
          style={{
            ...driftStyle(DRIFT[index % DRIFT.length]!),
            ...(float ? { '--bob-delay': `${-index * 700}ms` } : {}),
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
    </ParallaxScope>
  );
}
