import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sticker } from './Sticker';

describe('Sticker', () => {
  it('is hidden from assistive tech without a label', () => {
    const { container } = render(<Sticker kind="coin" />);
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('spins once on click and settles after the animation', async () => {
    const user = userEvent.setup();
    render(<Sticker kind="check" label="Verified" />);
    const sticker = screen.getByRole('img', { name: 'Verified' });
    await user.click(sticker);
    expect(sticker).toHaveAttribute('data-spinning', 'true');
    fireEvent.animationEnd(sticker);
    expect(sticker).not.toHaveAttribute('data-spinning');
  });
});
