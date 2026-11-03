import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { stubMatchMedia } from '@/test/match-media';
import { Sticker } from './Sticker';

describe('Sticker', () => {
  it('is hidden from assistive tech when purely decorative', () => {
    const { container } = render(<Sticker kind="coin" />);
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('is an image with a name when given a label', () => {
    render(<Sticker kind="check" label="Verified" />);
    expect(screen.getByRole('img', { name: 'Verified' })).toBeInTheDocument();
  });

  it('spins once per click and is ready to spin again when the animation ends', async () => {
    render(<Sticker kind="check" label="Verified" />);
    const sticker = screen.getByRole('img', { name: 'Verified' });
    expect(sticker).not.toHaveAttribute('data-spinning');

    await userEvent.click(sticker);
    expect(sticker).toHaveAttribute('data-spinning', 'true');

    fireEvent.animationEnd(sticker, { animationName: 'sticker-spin' });
    expect(sticker).not.toHaveAttribute('data-spinning');
  });

  it('does not start a spin for people who prefer reduced motion', async () => {
    stubMatchMedia(true);
    render(<Sticker kind="star" label="Top rated" />);
    const sticker = screen.getByRole('img', { name: 'Top rated' });
    await userEvent.click(sticker);
    expect(sticker).not.toHaveAttribute('data-spinning');
  });
});
