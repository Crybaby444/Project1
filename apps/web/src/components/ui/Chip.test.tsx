import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Chip } from './Chip';

describe('Chip', () => {
  it('reports the next pressed state', async () => {
    const onChange = vi.fn();
    render(
      <Chip pressed={false} onPressedChange={onChange}>
        Tools
      </Chip>,
    );
    const chip = screen.getByRole('button', { name: 'Tools' });
    expect(chip).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(chip);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('reflects the pressed state', () => {
    render(
      <Chip pressed onPressedChange={() => {}} color="mint">
        Camping
      </Chip>,
    );
    expect(screen.getByRole('button', { name: 'Camping' })).toHaveAttribute('aria-pressed', 'true');
  });
});
