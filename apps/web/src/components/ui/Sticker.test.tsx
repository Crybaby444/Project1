import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Sticker } from './Sticker';

describe('Sticker', () => {
  it('is hidden from assistive tech without a label', () => {
    const { container } = render(<Sticker kind="coin" />);
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('spins once on click and resets after the animation', async () => {
    render(<Sticker kind="check" label="Verified" />);
    const sticker = screen.getByRole('img', { name: 'Verified' });
    await userEvent.click(sticker);
    expect(sticker).toHaveAttribute('data-spinning', 'true');
    fireEvent.animationEnd(sticker);
    expect(sticker).not.toHaveAttribute('data-spinning');
  });
});
