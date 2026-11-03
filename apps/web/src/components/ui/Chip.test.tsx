import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Chip } from './Chip';

describe('Chip', () => {
  it('reports the next pressed state', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Chip pressed={false} onPressedChange={onChange}>
        Tools
      </Chip>,
    );
    const chip = screen.getByRole('button', { name: 'Tools' });
    expect(chip).toHaveAttribute('aria-pressed', 'false');
    await user.click(chip);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('exposes the pressed state', () => {
    render(
      <Chip pressed onPressedChange={() => {}} color="mint">
        Garden
      </Chip>,
    );
    expect(screen.getByRole('button', { name: 'Garden' })).toHaveAttribute('aria-pressed', 'true');
  });
});
