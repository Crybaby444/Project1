import { STATUS_TONES } from '@yoyo/shared';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  it('shows the label as text with the tone attached, never colour alone', () => {
    render(
      <StatusBadge tone="dispute" icon={<svg aria-hidden="true" />}>
        Dispute
      </StatusBadge>,
    );
    expect(screen.getByText('Dispute').closest('[data-tone]')).toHaveAttribute('data-tone', 'dispute');
  });

  it('is black and white (owner, 2026-11-13): no sticker fill, and each tone looks different', () => {
    const looks = new Set<string>();
    for (const tone of STATUS_TONES) {
      const { container, unmount } = render(
        <StatusBadge tone={tone} icon={<svg aria-hidden="true" />}>
          {tone}
        </StatusBadge>,
      );
      const badge = container.firstElementChild as HTMLElement;
      expect(badge.style.backgroundColor).toBe('');
      looks.add(badge.className);
      unmount();
    }
    expect(looks.size).toBe(STATUS_TONES.length);
  });
});
