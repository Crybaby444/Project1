import { STATUS_TONES } from '@yoyo/shared';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  it('exposes its tone and keeps a visible text label', () => {
    render(
      <StatusBadge tone="dispute" icon={<svg aria-hidden="true" />}>
        Dispute
      </StatusBadge>,
    );
    expect(screen.getByText('Dispute').closest('[data-tone]')).toHaveAttribute('data-tone', 'dispute');
  });

  it('uses white text only on completed', () => {
    for (const tone of STATUS_TONES) {
      const { container, unmount } = render(
        <StatusBadge tone={tone} icon={<svg aria-hidden="true" />}>
          {tone}
        </StatusBadge>,
      );
      const badge = container.querySelector('[data-tone]') as HTMLElement;
      expect(badge.style.color).toBe(tone === 'completed' ? 'rgb(255, 255, 255)' : 'rgb(0, 0, 0)');
      unmount();
    }
  });
});
