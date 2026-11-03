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
    const badge = screen.getByText('Dispute').closest('[data-tone]');
    expect(badge).toHaveAttribute('data-tone', 'dispute');
    expect(badge).toHaveStyle({ backgroundColor: 'rgb(251, 73, 3)', color: 'rgb(0, 0, 0)' });
  });

  it('uses white text only on the dark violet "completed" fill', () => {
    render(
      <StatusBadge tone="completed" icon={<svg aria-hidden="true" />}>
        Completed
      </StatusBadge>,
    );
    expect(screen.getByText('Completed').closest('[data-tone]')).toHaveStyle({
      backgroundColor: 'rgb(92, 74, 222)',
      color: 'rgb(255, 255, 255)',
    });
  });
});
