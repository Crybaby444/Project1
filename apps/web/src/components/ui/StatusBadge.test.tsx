import { render, screen } from '@testing-library/react';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  it('marks its tone and keeps a visible label', () => {
    render(
      <StatusBadge tone="dispute" icon={<svg aria-hidden="true" />}>
        Dispute
      </StatusBadge>,
    );
    expect(screen.getByText('Dispute').closest('[data-tone]')).toHaveAttribute(
      'data-tone',
      'dispute',
    );
  });

  it('uses white text only on the violet "completed" fill', () => {
    const { rerender } = render(
      <StatusBadge tone="completed" icon={<svg aria-hidden="true" />}>
        Completed
      </StatusBadge>,
    );
    expect(screen.getByText('Completed').closest('[data-tone]')).toHaveStyle({ color: '#ffffff' });
    rerender(
      <StatusBadge tone="requested" icon={<svg aria-hidden="true" />}>
        Requested
      </StatusBadge>,
    );
    expect(screen.getByText('Requested').closest('[data-tone]')).toHaveStyle({ color: '#000000' });
  });
});
