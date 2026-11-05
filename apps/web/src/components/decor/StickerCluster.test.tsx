import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StickerCluster } from './StickerCluster';

describe('StickerCluster', () => {
  it('places each sticker absolutely, rotated, and hides the whole cluster from assistive tech', () => {
    const { container } = render(
      <StickerCluster
        items={[
          { kind: 'coin', size: 96, top: '10%', left: '4%', rotate: -12 },
          { kind: 'yoyo', size: 120, top: '60%', right: '6%', rotate: 8 },
        ]}
      />,
    );
    const cluster = container.firstElementChild as HTMLElement;
    expect(cluster).toHaveAttribute('aria-hidden', 'true');
    const placed = cluster.querySelectorAll<HTMLElement>('[data-sticker-slot]');
    expect(placed).toHaveLength(2);
    expect(placed[0]!.style.top).toBe('10%');
    expect(placed[0]!.style.left).toBe('4%');
    expect(placed[0]!.style.rotate).toBe('-12deg');
    expect(placed[1]!.style.right).toBe('6%');
  });

  it('shrinks big stickers on narrow screens instead of letting them overflow', () => {
    const { container } = render(<StickerCluster items={[{ kind: 'star', size: 160, top: 0, left: 0, rotate: 0 }]} />);
    const slot = container.querySelector<HTMLElement>('[data-sticker-slot]')!;
    expect(slot.style.width).toMatch(/^clamp\(/);
  });
});
